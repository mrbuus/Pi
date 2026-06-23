import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// Идэвхжүүлэх код = тухайн өдрийн огноо УБ-ийн цагаар, ЖЖЖЖССӨӨ (SPEC §6.3)
export function todayCodeUB(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
  })
    .format(new Date())
    .replaceAll('-', '');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Утас эсвэл имэйл аль нэг нь заавал хэрэгтэй
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Утас эсвэл имэйл хаяг шаардлагатай');
    }
    // Имэйлээр бүртгүүлбэл нууц үг заавал (утсаар бол анхдагч = утас)
    if (!dto.phone && !dto.password) {
      throw new BadRequestException(
        'Имэйлээр бүртгүүлэхэд нууц үг шаардлагатай',
      );
    }

    // Давхцлыг шалгана (утас / имэйл / username)
    if (
      dto.phone &&
      (await this.prisma.user.findUnique({ where: { phone: dto.phone } }))
    ) {
      throw new ConflictException('Энэ утасны дугаар бүртгэлтэй байна');
    }
    if (
      dto.email &&
      (await this.prisma.user.findUnique({ where: { email: dto.email } }))
    ) {
      throw new ConflictException('Энэ имэйл хаяг бүртгэлтэй байна');
    }
    if (
      dto.username &&
      (await this.prisma.user.findUnique({ where: { username: dto.username } }))
    ) {
      throw new ConflictException('Энэ нэр аль хэдийн ашиглагдсан байна');
    }

    const isStudent = !!dto.studentType;
    const role = isStudent
      ? Role.STUDENT
      : dto.asParent
        ? Role.PARENT
        : Role.BUYER;

    if (dto.studentType === StudentType.CLASSROOM) {
      if (!dto.activationCode) {
        throw new BadRequestException(
          'Танхимын сурагчаар бүртгүүлэхэд багшаас авсан код шаардлагатай',
        );
      }
      if (dto.activationCode !== todayCodeUB()) {
        throw new BadRequestException('Идэвхжүүлэх код буруу байна');
      }
    }

    // Анхны нууц үг: өгсөн бол түүнийг, эсвэл утасны дугаар (SPEC §6.2)
    const rawPassword = dto.password ?? dto.phone!;
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    // username: өгсөн бол түүнийг, үгүй бол овог нэрээс автоматаар (давхцалгүй)
    const username = await this.resolveUsername(
      dto.username,
      dto.firstName,
      dto.lastName,
    );

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        username,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role,
        studentProfile: isStudent
          ? {
              create: {
                type: dto.studentType!,
                grade: dto.grade,
                school: dto.school,
                activatedAt:
                  dto.studentType === StudentType.CLASSROOM ? new Date() : null,
                activationCode: dto.activationCode,
              },
            }
          : undefined,
      },
      include: { studentProfile: true },
    });

    return this.issueToken(user.id, user.role);
  }

  async login(dto: LoginDto) {
    // Утас / имэйл / username аль нэгээр нэвтэрнэ
    const identifier = (dto.identifier ?? dto.phone ?? '').trim();
    if (!identifier) {
      throw new UnauthorizedException('Нэвтрэх мэдээлэл буруу байна');
    }
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: identifier },
          { username: identifier },
        ],
      },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Нэвтрэх мэдээлэл эсвэл нууц үг буруу байна',
      );
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException(
        'Нэвтрэх мэдээлэл эсвэл нууц үг буруу байна',
      );
    }
    return this.issueToken(user.id, user.role);
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        username: true,
        studentCode: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        studentProfile: true,
        teacherProfile: true,
      },
    });
  }

  // Овог нэрээс эсвэл өгсөн nickname-ээс давхцалгүй username гаргана
  private async resolveUsername(
    desired: string | undefined,
    firstName: string,
    lastName: string,
  ): Promise<string> {
    const base = (desired ?? `${lastName}.${firstName}`)
      .trim()
      .replace(/\s+/g, '');
    let candidate = base;
    let n = 1;
    // Давхцвал ард нь тоо нэмж давтахгүй болгоно
    while (
      await this.prisma.user.findUnique({ where: { username: candidate } })
    ) {
      n += 1;
      candidate = `${base}${n}`;
    }
    return candidate;
  }

  private issueToken(userId: string, role: Role) {
    return {
      accessToken: this.jwt.sign({ sub: userId, role }),
      userId,
      role,
    };
  }
}
