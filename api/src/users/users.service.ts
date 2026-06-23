import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
