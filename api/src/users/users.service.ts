import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

function randomTempPassword(): string {
  return String(Math.floor(10_000_000 + Math.random() * 90_000_000)); // 8 оронтой
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Админ: шинэ хэрэглэгчийг ЭРХИЙГ НЬ ШУУД сонгож нэг дороос үүсгэнэ
  // (public /auth/register-ээр багш/админ үүсгэх боломжгүй тул зөвхөн энд).
  async createUser(dto: CreateUserDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Утас эсвэл имэйл заавал хэрэгтэй');
    }
    if (dto.phone && (await this.prisma.user.findUnique({ where: { phone: dto.phone } }))) {
      throw new ConflictException('Энэ утасны дугаар бүртгэлтэй байна');
    }
    if (dto.email && (await this.prisma.user.findUnique({ where: { email: dto.email } }))) {
      throw new ConflictException('Энэ имэйл хаяг бүртгэлтэй байна');
    }

    // Анхны нууц үг = утас (SPEC §6.2); утасгүй бол түр нууц үг үүсгээд буцаана
    const tempPassword = dto.phone ?? randomTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    let username = `${dto.lastName}.${dto.firstName}`.trim().replace(/\s+/g, '');
    let n = 1;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      n += 1;
      username = `${dto.lastName}.${dto.firstName}`.replace(/\s+/g, '') + n;
    }

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: dto.role,
        studentProfile:
          dto.role === Role.STUDENT
            ? { create: { type: StudentType.ONLINE, grade: dto.grade } }
            : undefined,
        teacherProfile:
          dto.role === Role.TEACHER || dto.role === Role.TEACHER_PLUS
            ? { create: { canManageStudents: dto.role === Role.TEACHER_PLUS } }
            : undefined,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        username: true,
        role: true,
      },
    });

    return { user, tempPassword: dto.phone ? undefined : tempPassword };
  }

  // Админ: бүх хэрэглэгчийн үүргийг нэг дор удирдах жагсаалт
  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        studentProfile: {
          select: { type: true, grade: true, school: true },
        },
        teacherProfile: { select: { canManageStudents: true } },
        ownedClassrooms: {
          where: { archived: false },
          select: { id: true, name: true },
        },
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
      take: 500,
    });
  }

  async setUserRole(userId: string, role: Role, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');

    if (userId === actorId && role !== Role.ADMIN) {
      throw new BadRequestException(
        'Өөрийн админ эрхийг өөрчлөх боломжгүй',
      );
    }

    if (user.role === Role.ADMIN && role !== Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN },
      });
      if (adminCount <= 1) {
        throw new BadRequestException(
          'Сүүлийн админы эрхийг бууруулах боломжгүй',
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role } });

      if (role === Role.TEACHER || role === Role.TEACHER_PLUS) {
        await tx.teacherProfile.upsert({
          where: { userId },
          create: {
            userId,
            canManageStudents: role === Role.TEACHER_PLUS,
          },
          update: { canManageStudents: role === Role.TEACHER_PLUS },
        });
      } else {
        await tx.teacherProfile.updateMany({
          where: { userId },
          data: { canManageStudents: false },
        });
      }

      if (role === Role.STUDENT) {
        await tx.studentProfile.upsert({
          where: { userId },
          create: { userId, type: StudentType.ONLINE },
          update: {},
        });
      }
    });

    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        username: true,
        role: true,
        studentProfile: {
          select: { type: true, grade: true, school: true },
        },
        teacherProfile: { select: { canManageStudents: true } },
        ownedClassrooms: {
          where: { archived: false },
          select: { id: true, name: true },
        },
      },
    });
  }

  // Бүх багш нарын жагсаалт — админ удирдлагад
  listTeachers() {
    return this.prisma.user.findMany({
      where: { role: { in: [Role.TEACHER, Role.TEACHER_PLUS] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        teacherProfile: { select: { canManageStudents: true } },
        ownedClassrooms: {
          where: { archived: false },
          select: { id: true, name: true },
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  // Энгийн хэрэглэгчийг багш болгох / багшийн түвшинг өөрчлөх (зөвхөн админ)
  async setTeacherStatus(
    userId: string,
    plus: boolean,
    canManageStudents: boolean,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');
    if (
      user.role === Role.ADMIN ||
      user.role === Role.STUDENT ||
      user.role === Role.PARENT
    ) {
      throw new BadRequestException(
        'Зөвхөн багш эсвэл худалдан авагчийг багшийн түвшинд өөрчилнө',
      );
    }

    const role = plus ? Role.TEACHER_PLUS : Role.TEACHER;
    await this.prisma.user.update({ where: { id: userId }, data: { role } });
    await this.prisma.teacherProfile.upsert({
      where: { userId },
      create: { userId, canManageStudents: plus && canManageStudents },
      update: { canManageStudents: plus && canManageStudents },
    });
    return { id: userId, role, canManageStudents: plus && canManageStudents };
  }

  // Худалдан авагчийг багш болгох (анх багш болгох үед)
  async promoteToTeacher(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('Энэ утсаар хэрэглэгч олдсонгүй');
    if (user.role === Role.ADMIN || user.role === Role.STUDENT) {
      throw new BadRequestException('Энэ хэрэглэгчийг багш болгох боломжгүй');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { role: Role.TEACHER },
    });
    await this.prisma.teacherProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, canManageStudents: false },
      update: {},
    });
    return { id: user.id, role: Role.TEACHER };
  }
}
