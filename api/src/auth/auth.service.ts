import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  generateStudentCode,
  generateTeacherCode,
  resolveUniqueUsername,
  StudentCodeSubject,
} from '../common/codes';
import {
  Role,
  StudentType,
  Subject,
  SubjectAvailability,
} from '../generated/prisma/enums';
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
    // Role: public register-ээр өнөөдөр зөвхөн эдгээр 3 боломжтой ч TEACHER(_PLUS)-ыг
    // доор код үүсгэх логикт бүрэн байлгах үүднээс төрлийг Role гэж өргөтгөв.
    const role: Role = isStudent
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

    // 🎯 Онлайн сурагч зөвхөн танхимд заадаг хичээл сонгож болохгүй (эзний
    // дүрэм, CLAUDE.md). Дүрмийг код руу chit хийхгүй, EnrollmentWindow-ийн
    // availability-аас л уншина — ирээдүйд Нийгэм судлалыг онлайнаар нээвэл
    // энэ шалгалт кодоо огт хөндөхгүйгээр өөрөө зөвшөөрнө.
    if (dto.studentType === StudentType.ONLINE && dto.subject) {
      const subjectsToCheck: Subject[] =
        dto.subject === 'MATH'
          ? [Subject.MATH]
          : dto.subject === 'SOCIAL_STUDIES'
            ? [Subject.SOCIAL_STUDIES]
            : [Subject.MATH, Subject.SOCIAL_STUDIES]; // 'BOTH'

      const windows = await this.prisma.enrollmentWindow.findMany({
        where: { subject: { in: subjectsToCheck } },
      });
      const classroomOnly = windows.find(
        (w) => w.availability === SubjectAvailability.CLASSROOM_ONLY,
      );
      if (classroomOnly) {
        const label =
          classroomOnly.subject === Subject.MATH ? 'Математик' : 'Нийгэм судлал';
        throw new BadRequestException(
          `${label} зөвхөн танхимын ангид байдаг`,
        );
      }
    }

    // Анхны нууц үг: өгсөн бол түүнийг, эсвэл утасны дугаар (SPEC §6.2)
    const rawPassword = dto.password ?? dto.phone!;
    const passwordHash = await bcrypt.hash(rawPassword, 10);
    // username: өгсөн бол түүнийг, үгүй бол овог нэрээс автоматаар (давхцалгүй)
    const username = await resolveUniqueUsername(
      this.prisma,
      dto.firstName,
      dto.lastName,
      dto.username,
    );

    // Танигдах код: сурагч бол SIE-<жил>-<хичээл>-<дараалал>, багш бол SIE-T-<дараалал>
    // (public register-ээр өнөөдөр багш үүсгэдэггүй ч бүрэн байлгах үүднээс энд ч тооцов)
    // Wave 1-ийн дутагдал: dto.subject байхгүй байснаас код бүр 'B' үсэгтэй гардаг
    // асуудлыг эндээс засав — RegisterDto.subject-ийг codes.ts-ийн үсэг рүү буулгана.
    const subjectLetterMap: Record<string, StudentCodeSubject> = {
      MATH: 'M',
      SOCIAL_STUDIES: 'N',
      BOTH: 'B',
    };
    const studentCode = isStudent
      ? await generateStudentCode(this.prisma, {
          subject: dto.subject ? subjectLetterMap[dto.subject] : undefined,
        })
      : undefined;
    // (role нь энэ функцэд боломжит 3 утгаар л шахагдсан тул array.includes-ээр
    // шалгаж, TS-ийн "давхцалгүй literal" алдааг зөв зохистойгоор тойрч гарав)
    const teacherRoles: Role[] = [Role.TEACHER, Role.TEACHER_PLUS];
    const teacherCode = teacherRoles.includes(role)
      ? await generateTeacherCode(this.prisma)
      : undefined;

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        username,
        studentCode,
        teacherCode,
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

    // UI-д шинэ хэрэглэгчид өөрийн кодыг нэн даруй харуулах боломжтой болгоно
    return {
      ...this.issueToken(user.id, user.role),
      studentCode: user.studentCode,
      teacherCode: user.teacherCode,
    };
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

  // Нууц үг солих — анхны нууц үг = утасны дугаар тул энэ урсгал заавал хэрэгтэй
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new BadRequestException('Одоогийн нууц үг буруу байна');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { changed: true };
  }

  // Профайл зураг — /uploads-аар өмнө нь хадгалсан файлын key-г холбоно
  async setAvatar(userId: string, key: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: key },
    });
    return { avatarUrl: key };
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
        teacherCode: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
        studentProfile: true,
        teacherProfile: true,
      },
    });
  }

  private issueToken(userId: string, role: Role) {
    return {
      accessToken: this.jwt.sign({ sub: userId, role }),
      userId,
      role,
    };
  }
}
