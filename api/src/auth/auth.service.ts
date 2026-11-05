import { verifySignupTicket } from './google/signup-ticket';
import { consentData } from './consent.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {
  generateStudentCode,
  generateTeacherCode,
  resolveUniqueUsername,
} from '../common/codes';
import {
  Role,
  StudentType,
  Subject,
  SubjectAvailability,
} from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { accountAttempts, loginAttempts } from './login-attempts';
import { PasswordResetService } from './password-reset.service';
import { type TokenTtl, tokenTtl } from './session-ttl';
import {
  PASSWORD_SAME_AS_PHONE_MESSAGE,
  isSameAsPhone,
  validatePasswordStrength,
} from './password-policy';
import { RegisterDto } from './dto/register.dto';
import {
  centreOnlineClassEnabled,
  CENTRE_ONLINE_CLOSED_MESSAGE,
} from './centre-online-policy';

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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    // Сонголттой: хуучин unit тестүүд 2 аргументаар үүсгэдэг. Nest үргэлж оруулна.
    private passwordReset?: PasswordResetService,
  ) {}

  async register(dto: RegisterDto) {
    const consent = consentData(dto);
    if (dto.studentType === StudentType.ONLINE && !centreOnlineClassEnabled()) {
      throw new BadRequestException(CENTRE_ONLINE_CLOSED_MESSAGE);
    }
    // Gmail-ээр бүртгүүлэх: тасалбарын Gmail-ийг бүртгэлийн имэйл болгоно, утас заавал
    // (эзний дүрэм: хэрэглэгч бүр утастай, нууц үг = утас). Google ID давхардахгүй.
    const google = dto.googleTicket ? verifySignupTicket(dto.googleTicket) : null;
    if (google) {
      if (!dto.phone) {
        throw new BadRequestException('Утасны дугаар шаардлагатай');
      }
      dto.email = google.email;
      if (
        await this.prisma.googleIdentity.findUnique({
          where: { googleSubject: google.googleSubject },
        })
      ) {
        throw new ConflictException(
          'Энэ Google бүртгэл аль хэдийн холбогдсон байна — «Google-ээр нэвтрэх»-ийг ашиглана уу',
        );
      }
    }
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
      throw new ConflictException(
        google
          ? 'Энэ утасны дугаар бүртгэлтэй байна. Утас, нууц үгээрээ нэвтэрч «Миний мэдээлэл» хэсгээс Gmail-ээ холбоно уу.'
          : 'Энэ утасны дугаар бүртгэлтэй байна',
      );
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
          classroomOnly.subject === Subject.MATH
            ? 'Математик'
            : 'Нийгэм судлал';
        throw new BadRequestException(`${label} зөвхөн танхимын ангид байдаг`);
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

    // Шинэ кодын формат [Branch][YY][Grade][Seq]
    // Онлайн TANХИМЫН сурагч: код дараа (зөвшөөрөл + төлбөр урсгалаар үүснэ)
    // Үлдэх сурагч (ONLINE эсвэл CLASSROOM гараар бүртгүүлэн): код шууд
    const shouldDeferCode =
      isStudent && dto.studentType === StudentType.CLASSROOM;
    const studentCode =
      isStudent && !shouldDeferCode
        ? await generateStudentCode(this.prisma, {
            branch: null, // Салаа мэдэгдэхгүй (дараагийн агент өөрчилнө)
            grade: dto.grade ?? 12,
            registeredAt: new Date(), // UB цагаар одоо
          })
        : undefined;

    const teacherRoles: Role[] = [Role.TEACHER, Role.TEACHER_PLUS];
    const teacherCode = teacherRoles.includes(role)
      ? await generateTeacherCode(this.prisma, {
          registeredAt: new Date(), // UB цагаар одоо
        })
      : undefined;

    const user = await this.prisma.user.create({
      data: {
        ...consent,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        username,
        studentCode,
        teacherCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        // Одоогоор ХЭЗЭЭ Ч true болгохгүй (schema-ийн @default(false) хангалттай) —
        // "нэвтрэхэд заавал нууц үг солиулах" урсгал идэвхжээгүй. Идэвхжүүлэхэд зөвхөн
        // үүнийг true болгоход л хангалттай.
        mustChangePassword: false,
        role,
        // Gmail-ээр бүртгүүлсэн бол хэрэглэгчтэй НЭГ бичилтээр холбоно
        googleIdentity: google
          ? {
              create: {
                googleSubject: google.googleSubject,
                email: google.email,
                pictureUrl: google.picture,
              },
            }
          : undefined,
        studentProfile: isStudent
          ? {
              create: {
                type: dto.studentType!,
                grade: dto.grade,
                school: dto.school,
                activatedAt:
                  dto.studentType === StudentType.CLASSROOM ? new Date() : null,
                activationCode: dto.activationCode,
                // Онлайнаар CLASSROOM-р бүртгүүлбэл зөвшөөрөл хүлээнэ
                // Эзэн баталгаа + эхний сарын төлбөр CONFIRMED үед л код үүснэ
                approvalPending: shouldDeferCode,
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
    if (loginAttempts.isLocked(identifier)) {
      throw new HttpException(
        'Олон удаа буруу оролдсон тул 15 минутын дараа дахин оролдоно уу. Нууц үгээ мартсан бол «Нууц үг сэргээх»-ийг ашиглана уу.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
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
      include: { googleIdentity: { select: { email: true } } },
    });
    if (!user) {
      loginAttempts.failure(identifier);
      throw new UnauthorizedException(
        'Нэвтрэх мэдээлэл эсвэл нууц үг буруу байна',
      );
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      loginAttempts.failure(identifier);
      this.alertOwnerOnRepeatedFailures(user);
      throw new UnauthorizedException(
        'Нэвтрэх мэдээлэл эсвэл нууц үг буруу байна',
      );
    }
    if (user.archivedAt)
      throw new UnauthorizedException(
        'Энэ сурагчийн бүртгэл архивлагдсан байна. Сургалтын төвтэй холбогдоно уу.',
      );
    loginAttempts.success(identifier);
    accountAttempts.success(user.id);
    return this.issueToken(user.id, user.role, tokenTtl(dto.remember));
  }

  /**
   * 3 удаа буруу нууц үг → бүртгэлийн эзний имэйл/Gmail руу НЭГ мэдэгдэл
   * (эзэн 2026-10-22). Тоолуур нь бүртгэлээр (userId), түгжээний цонхонд нэг л
   * удаа. Хариуг ХҮЛЭЭХГҮЙ — нэвтрэлтийн хариуны хугацаа өөрчлөгдвөл бүртгэл
   * байгааг илчилнэ, мөн SMTP саатал нэвтрэлтийг удаашруулах ёсгүй.
   */
  private alertOwnerOnRepeatedFailures(user: {
    id: string;
    firstName: string;
    email: string | null;
    googleIdentity?: { email: string } | null;
  }) {
    accountAttempts.failure(user.id);
    if (!this.passwordReset || !accountAttempts.claimAlert(user.id)) return;
    this.passwordReset.sendLoginAlert(user).catch(() =>
      this.logger.error(`Буруу оролдлогын мэдэгдэл үүсгэж чадсангүй: userId=${user.id}`),
    );
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
    // DTO аль хэдийн шалгасан ч сервисийг өөр газраас дуудвал бодлого алгасагдахгүй
    const weak = validatePasswordStrength(newPassword);
    if (weak) throw new BadRequestException(weak);
    if (isSameAsPhone(newPassword, user.phone)) {
      throw new BadRequestException(PASSWORD_SAME_AS_PHONE_MESSAGE);
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      // passwordChangedAt — энэ мөчөөс өмнөх БҮХ токеныг хүчингүй болгоно.
      // Нууц үгээ сольсны гол шалтгаан нь ихэвчлэн "хэн нэгэн мэдчихсэн байх"
      // тул тэр хүний нээлттэй сесс мөн таслагдах ёстой.
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    // ...гэхдээ ӨӨРИЙНХӨӨ сессийг таслахгүй: шинэ токен буцаана. Эс бөгөөс
    // хэрэглэгч нууц үгээ сольмогцоо гэнэт гарч, юу болсныг ойлгохгүй.
    return { changed: true, ...this.issueToken(user.id, user.role) };
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
        // Одоогоор ХААЛТТАЙ (schema.prisma-ийн @default(false)) — фронтэнд
        // хараад "нууц үг солих" урсгал руу ХҮЧЛЭХГҮЙ. Зөвхөн ирээдүйд
        // идэвхжүүлэхэд бэлэн байлгах зорилгоор энд гаргаж өгсөн.
        mustChangePassword: true,
        studentProfile: true,
        teacherProfile: true,
        // Own profile only. This selects the group-management navigation mode;
        // it never grants internal staff permissions or changes the JWT role.
        externalTeacherProfile: { select: { verifiedAt: true } },
      },
    });
  }

  /** ttl заагаагүй бол JwtModule-ийн өгөгдмөл (7 хоног) — session-ttl.ts */
  private issueToken(userId: string, role: Role, ttl?: TokenTtl) {
    const payload = { sub: userId, role };
    return {
      accessToken: ttl
        ? this.jwt.sign(payload, { expiresIn: ttl })
        : this.jwt.sign(payload),
      userId,
      role,
    };
  }
}
