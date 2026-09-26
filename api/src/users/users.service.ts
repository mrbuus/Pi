import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuditService } from '../audit/audit.service';
import {
  generateStudentCode,
  generateTeacherCode,
  resolveUniqueUsername,
} from '../common/codes';
import { Role, StudentType, PaymentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import {
  nextSevenDigitStudentCode,
  parseGrade,
  parseStudentWorkbook,
  RawStudentImportRow,
} from './student-import';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Админ: шинэ хэрэглэгчийг ЭРХИЙГ НЬ ШУУД сонгож нэг дороос үүсгэнэ
  // (public /auth/register-ээр багш/админ үүсгэх боломжгүй тул зөвхөн энд).
  async createUser(dto: CreateUserDto) {
    if (!dto.phone && !dto.email) {
      throw new BadRequestException('Утас эсвэл имэйл заавал хэрэгтэй');
    }
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

    // Анхны нууц үг ЯМАГТ = утасны дугаар (эзний шийдвэр — "чанартай" санамсаргүй
    // нууц үг УТ ХЭРЭГГҮЙ). Утасгүй (зөвхөн имэйлээр админ үүсгэсэн) ховор тохиолдолд
    // санамсаргүй генератор ашиглахгүй, харин имэйлийг л нууц үг болгоно —
    // энгийн бөгөөд урьдчилан таамаглах боломжтой байлгах үүднээс.
    const tempPassword = dto.phone ?? dto.email!;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const username = await resolveUniqueUsername(
      this.prisma,
      dto.firstName,
      dto.lastName,
    );

    // Шинэ кодын формат [Branch][YY][Grade][Seq]
    const studentCode =
      dto.role === Role.STUDENT
        ? await generateStudentCode(this.prisma, {
            branch: null, // Админ үүсгэхэд салаа мэдэгдэхгүй → онлайн
            grade: dto.grade ?? 12,
            registeredAt: new Date(),
          })
        : undefined;
    const teacherCode =
      dto.role === Role.TEACHER || dto.role === Role.TEACHER_PLUS
        ? await generateTeacherCode(this.prisma, {
            registeredAt: new Date(),
          })
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
        // Одоогоор ХЭЗЭЭ Ч true болгохгүй — "нэвтрэхэд заавал нууц үг солиулах"
        // урсгал идэвхжээгүй (schema-ийн @default(false)-той адил). Идэвхжүүлэхэд
        // зөвхөн үүнийг true болгоход л хангалттай.
        mustChangePassword: false,
        role: dto.role,
        studentProfile:
          dto.role === Role.STUDENT
            ? {
                create: {
                  type: StudentType.ONLINE,
                  grade: dto.grade,
                  // Админ гараар бүртгэсэн: зөвшөөрөл/төлбөрийн урсгалыг алгасна
                  approvalPending: false,
                },
              }
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
        studentCode: true,
        teacherCode: true,
      },
    });

    return { user, tempPassword: dto.phone ? undefined : tempPassword };
  }

  // Сурагч хайх — гар аргаар cuid бичихийн оронд код/нэрээр хайж сонгоно
  // (сорилын дүн бүртгэх маягтад ашиглана)
  async searchStudents(q: string) {
    const query = q.trim();
    if (query.length < 2) {
      throw new BadRequestException('Хайх үг 2-оос дээш тэмдэгттэй байх ёстой');
    }
    return this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        archivedAt: null,
        OR: [
          { studentCode: { contains: query, mode: 'insensitive' } },
          { firstName: { contains: query, mode: 'insensitive' } },
          { lastName: { contains: query, mode: 'insensitive' } },
          { username: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        studentCode: true,
        firstName: true,
        lastName: true,
        username: true,
      },
      orderBy: { firstName: 'asc' },
      take: 20,
    });
  }

  // Админ: бүх хэрэглэгчийн үүргийг нэг дор удирдах жагсаалт
  private importPreviews = new Map<
    string,
    {
      ownerId: string;
      expiresAt: number;
      rows: Array<
        RawStudentImportRow & {
          status: 'NEW' | 'UPDATE' | 'ERROR';
          reason: string | null;
          grade: number | null;
          section: string | null;
        }
      >;
    }
  >();

  async archiveStudent(
    id: string,
    actorId: string,
    reason: string,
    restore = false,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, archivedAt: true },
    });
    if (!user || user.role !== Role.STUDENT)
      throw new NotFoundException('Сурагч олдсонгүй');
    if (restore ? !user.archivedAt : !!user.archivedAt)
      throw new BadRequestException(
        'Сурагчийн архивын төлөв өөрчлөгдсөн байна.',
      );
    if (!restore && !reason.trim())
      throw new BadRequestException('Архивлах шалтгаан оруулна уу.');
    const updated = await this.prisma.user.update({
      where: { id },
      data: restore
        ? { archivedAt: null, archivedById: null, archiveReason: null }
        : {
            archivedAt: new Date(),
            archivedById: actorId,
            archiveReason: reason.trim(),
          },
      select: { id: true, archivedAt: true },
    });
    await this.audit.record({
      actorId,
      actorRole: Role.ADMIN,
      action: restore ? 'RESTORE' : 'ARCHIVE',
      entity: 'User',
      entityId: id,
      before: { archivedAt: user.archivedAt?.toISOString() ?? null },
      after: { archivedAt: updated.archivedAt?.toISOString() ?? null },
      reason: reason.trim(),
    });
    return updated;
  }

  async previewStudentImport(buffer: Buffer, ownerId: string) {
    const input = await parseStudentWorkbook(buffer);
    const seen = new Set<string>();
    const rows = [] as Array<
      RawStudentImportRow & {
        status: 'NEW' | 'UPDATE' | 'ERROR';
        reason: string | null;
        grade: number | null;
        section: string | null;
      }
    >;
    for (const row of input) {
      const phone = row.phone.replace(/[\s()-]/g, '');
      let reason: string | null =
        !row.lastName || !row.firstName || !/^\+?[0-9]{8,15}$/.test(phone)
          ? 'Овог, нэр болон зөв утасны дугаар шаардлагатай.'
          : null;
      if (!reason && seen.has(phone))
        reason = 'Файл дотор ижил утас давхар байна.';
      seen.add(phone);
      let grade: number | null = null;
      let section: string | null = null;
      try {
        ({ grade, section } = parseGrade(row.classroomLabel));
      } catch (e) {
        reason = e instanceof Error ? e.message : 'Анги/түвшинг шалгана уу.';
      }
      const match = phone
        ? await this.prisma.user.findUnique({
            where: { phone },
            select: { role: true, archivedAt: true },
          })
        : null;
      if (!reason && match && match.role !== Role.STUDENT)
        reason = 'Энэ утас сурагчийн бус бүртгэлтэй байна.';
      if (!reason && match?.archivedAt)
        reason = 'Архивлагдсан сурагч байна. Эхлээд сэргээнэ үү.';
      rows.push({
        ...row,
        phone,
        status: reason ? 'ERROR' : match ? 'UPDATE' : 'NEW',
        reason,
        grade,
        section,
      });
    }
    const previewId = crypto.randomUUID();
    const now = Date.now();
    for (const [key, value] of this.importPreviews)
      if (value.expiresAt < now) this.importPreviews.delete(key);
    while (this.importPreviews.size >= 10) {
      let oldest: string | undefined;
      for (const key of this.importPreviews.keys()) {
        oldest = key;
        break;
      }
      if (!oldest) break;
      this.importPreviews.delete(oldest);
    }
    this.importPreviews.set(previewId, {
      ownerId,
      expiresAt: now + 900000,
      rows,
    });
    return { previewId, expiresInSeconds: 900, rows };
  }

  async commitStudentImport(
    previewId: string,
    rowNumbers: number[],
    actorId: string,
  ) {
    const preview = this.importPreviews.get(previewId);
    if (
      !preview ||
      preview.ownerId !== actorId ||
      preview.expiresAt < Date.now()
    )
      throw new BadRequestException(
        'Урьдчилан харах хугацаа дууссан байна. Файлаа дахин оруулна уу.',
      );
    if (!rowNumbers.length || new Set(rowNumbers).size !== rowNumbers.length)
      throw new BadRequestException('Импортлох мөрөө сонгоно уу.');
    const chosen = rowNumbers.map((n) =>
      preview.rows.find((r) => r.rowNumber === n),
    );
    if (chosen.some((r) => !r || r.status === 'ERROR'))
      throw new BadRequestException('Алдаатай мөрийг импортлох боломжгүй.');
    const saved = await this.prisma.$transaction(async (tx) => {
      const existingCodes = (
        await tx.user.findMany({
          where: { role: Role.STUDENT },
          select: { studentCode: true },
        })
      ).map((r) => r.studentCode);
      const result: Array<{
        rowNumber: number;
        action: 'NEW' | 'UPDATE';
        id: string;
      }> = [];
      for (const row of chosen as Array<NonNullable<(typeof chosen)[number]>>) {
        const prior = await tx.user.findUnique({
          where: { phone: row.phone },
          select: { id: true, role: true, archivedAt: true },
        });
        if (prior && (prior.role !== Role.STUDENT || prior.archivedAt))
          throw new ConflictException(
            'Бүртгэл өөрчлөгдсөн байна. Урьдчилан харахыг дахин хийнэ үү.',
          );
        if (prior) {
          await tx.user.update({
            where: { id: prior.id },
            data: { firstName: row.firstName, lastName: row.lastName },
          });
          await tx.studentProfile.upsert({
            where: { userId: prior.id },
            create: {
              userId: prior.id,
              type: StudentType.CLASSROOM,
              grade: row.grade,
              section: row.section,
              fatherPhone: row.guardianPhone || null,
            },
            update: {
              grade: row.grade,
              section: row.section,
              fatherPhone: row.guardianPhone || null,
            },
          });
          result.push({
            rowNumber: row.rowNumber,
            action: 'UPDATE',
            id: prior.id,
          });
        } else {
          const code = nextSevenDigitStudentCode(existingCodes);
          const base = `${row.lastName}.${row.firstName}`
            .trim()
            .replace(/\s+/g, '');
          let username = base;
          let suffix = 1;
          while (await tx.user.findUnique({ where: { username } })) {
            suffix += 1;
            username = `${base}${suffix}`;
          }
          const user = await tx.user.create({
            data: {
              role: Role.STUDENT,
              phone: row.phone,
              username,
              firstName: row.firstName,
              lastName: row.lastName,
              passwordHash: await bcrypt.hash(row.phone, 10),
              studentCode: code,
              studentProfile: {
                create: {
                  type: StudentType.CLASSROOM,
                  grade: row.grade,
                  section: row.section,
                  fatherPhone: row.guardianPhone || null,
                  approvalPending: false,
                },
              },
            },
            select: { id: true },
          });
          existingCodes.push(code);
          result.push({ rowNumber: row.rowNumber, action: 'NEW', id: user.id });
        }
      }
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: Role.ADMIN,
          action: 'IMPORT',
          entity: 'User',
          entityId: `student-import:${previewId}`,
          after: {
            rowCount: result.length,
            created: result.filter((r) => r.action === 'NEW').length,
            updated: result.filter((r) => r.action === 'UPDATE').length,
          },
        },
      });
      return result;
    });
    this.importPreviews.delete(previewId);
    return { imported: saved.length, rows: saved };
  }

  async exportStudentsCsv() {
    const rows = await this.prisma.user.findMany({
      where: { role: Role.STUDENT, archivedAt: null },
      select: {
        studentCode: true,
        lastName: true,
        firstName: true,
        phone: true,
        studentProfile: {
          select: {
            fatherPhone: true,
            motherPhone: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
    const csv = [
      ['Код', 'Овог', 'Нэр', 'Утас', 'Эцэг эхийн утас', 'Анги', 'Түвшин'],
      ...rows.map((r) => [
        r.studentCode,
        r.lastName,
        r.firstName,
        r.phone,
        r.studentProfile?.fatherPhone ?? r.studentProfile?.motherPhone,
        r.studentProfile?.section,
        r.studentProfile?.grade,
      ]),
    ];
    const field = (value: unknown) => {
      const raw =
        typeof value === 'string' || typeof value === 'number'
          ? String(value)
          : '';
      const safe = /^[=+@\-\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replace(/"/g, '""')}"`;
    };
    return '\uFEFF' + csv.map((row) => row.map(field).join(',')).join('\r\n');
  }

  listUsers(includeArchived = false) {
    return this.prisma.user.findMany({
      where: includeArchived
        ? { role: Role.STUDENT, archivedAt: { not: null } }
        : { archivedAt: null },
      select: {
        id: true,
        studentCode: true,
        archivedAt: true,
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
      throw new BadRequestException('Өөрийн админ эрхийг өөрчлөх боломжгүй');
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

  // Багш+/Админ: сурагчийн бүтэн бүртгэлийг (хувийн мэдээлэл + StudentProfile)
  // нэг дороос засна (эрхийн матриц: "бүх төлбөр мөнгөтэй холбоотой асуудлыг
  // Багш+ шийддэг" — tuitionAmount/tuitionPlan энд орсон тул money-related мутаци).
  async updateProfile(
    targetId: string,
    dto: UpdateUserProfileDto,
    actorId: string,
    actorRole: Role,
  ) {
    const target = await this.prisma.user.findUnique({
      where: { id: targetId },
      include: { studentProfile: true },
    });
    if (!target) throw new NotFoundException('Хэрэглэгч олдсонгүй');

    const studentFields: (keyof UpdateUserProfileDto)[] = [
      'grade',
      'school',
      'fatherPhone',
      'motherPhone',
      'guardianNote',
      'branch',
      'section',
      'tuitionAmount',
      'tuitionPlan',
      'tuitionNote',
      'joinedOn',
      'leftOn',
    ];
    const studentFieldsProvided = studentFields.some(
      (key) => dto[key] !== undefined,
    );
    if (studentFieldsProvided && target.role !== Role.STUDENT) {
      throw new BadRequestException(
        'Сурагчийн мэдээллийг зөвхөн сурагч эрхтэй хэрэглэгч дээр засна',
      );
    }

    if (dto.phone !== undefined && dto.phone !== target.phone) {
      const clash = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
      if (clash && clash.id !== targetId) {
        throw new ConflictException(
          'Энэ утасны дугаар өөр хэрэглэгчид бүртгэлтэй байна',
        );
      }
    }
    if (dto.email !== undefined && dto.email !== target.email) {
      const clash = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (clash && clash.id !== targetId) {
        throw new ConflictException(
          'Энэ имэйл хаяг өөр хэрэглэгчид бүртгэлтэй байна',
        );
      }
    }

    const before = {
      user: {
        firstName: target.firstName,
        lastName: target.lastName,
        phone: target.phone,
        email: target.email,
      },
      studentProfile: target.studentProfile,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: targetId },
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          email: dto.email,
        },
      });

      let studentProfile = target.studentProfile;
      if (studentFieldsProvided) {
        studentProfile = await tx.studentProfile.upsert({
          where: { userId: targetId },
          create: {
            userId: targetId,
            type: target.studentProfile?.type ?? StudentType.ONLINE,
            grade: dto.grade,
            school: dto.school,
            fatherPhone: dto.fatherPhone,
            motherPhone: dto.motherPhone,
            guardianNote: dto.guardianNote,
            branch: dto.branch,
            section: dto.section,
            tuitionAmount: dto.tuitionAmount,
            tuitionPlan: dto.tuitionPlan,
            tuitionNote: dto.tuitionNote,
            joinedOn: dto.joinedOn ? new Date(dto.joinedOn) : undefined,
            leftOn: dto.leftOn ? new Date(dto.leftOn) : undefined,
          },
          update: {
            ...(dto.grade !== undefined ? { grade: dto.grade } : {}),
            ...(dto.school !== undefined ? { school: dto.school } : {}),
            ...(dto.fatherPhone !== undefined
              ? { fatherPhone: dto.fatherPhone }
              : {}),
            ...(dto.motherPhone !== undefined
              ? { motherPhone: dto.motherPhone }
              : {}),
            ...(dto.guardianNote !== undefined
              ? { guardianNote: dto.guardianNote }
              : {}),
            ...(dto.branch !== undefined ? { branch: dto.branch } : {}),
            ...(dto.section !== undefined ? { section: dto.section } : {}),
            ...(dto.tuitionAmount !== undefined
              ? { tuitionAmount: dto.tuitionAmount }
              : {}),
            ...(dto.tuitionPlan !== undefined
              ? { tuitionPlan: dto.tuitionPlan }
              : {}),
            ...(dto.tuitionNote !== undefined
              ? { tuitionNote: dto.tuitionNote }
              : {}),
            ...(dto.joinedOn !== undefined
              ? { joinedOn: new Date(dto.joinedOn) }
              : {}),
            ...(dto.leftOn !== undefined
              ? { leftOn: new Date(dto.leftOn) }
              : {}),
          },
        });
      }
      return { user, studentProfile };
    });

    await this.audit.record({
      actorId,
      actorRole,
      action: 'UPDATE',
      entity: 'User',
      entityId: targetId,
      before,
      after: {
        user: {
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phone: result.user.phone,
          email: result.user.email,
        },
        studentProfile: result.studentProfile,
      },
    });

    return result;
  }

  // Ажилтанд зориулсан дэлгэрэнгүй харагдац: профайл + идэвхтэй анги + код +
  // тоолуур. 🚨 Утасны дугаар зөвхөн Админ/Багш+-д харагдана; энгийн Багш
  // зөвхөн ӨӨРИЙН ангийн сурагчийг л харна, эцэг эхийн утасгүйгээр (SPEC).
  async getUserDetail(
    targetId: string,
    requesterId: string,
    requesterRole: Role,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        username: true,
        role: true,
        avatarUrl: true,
        studentCode: true,
        teacherCode: true,
        createdAt: true,
        studentProfile: true,
        teacherProfile: { select: { canManageStudents: true } },
      },
    });
    if (!user) throw new NotFoundException('Хэрэглэгч олдсонгүй');

    const activeEnrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: targetId, leftAt: null },
      include: {
        classroom: {
          select: { id: true, name: true, grade: true, teacherId: true },
        },
      },
    });

    if (requesterRole === Role.TEACHER) {
      const ownsClassroom =
        activeEnrollment?.classroom.teacherId === requesterId;
      if (!ownsClassroom) {
        throw new ForbiddenException(
          'Зөвхөн өөрийн ангийн сурагчийг харах эрхтэй',
        );
      }
    }

    const [assignmentsCompleted, testResults, attendanceRecords, attempts] =
      await Promise.all([
        this.prisma.submission.count({
          where: {
            studentId: targetId,
            state: { not: 'NOT_DONE' },
          },
        }),
        this.prisma.testResult.count({ where: { studentId: targetId } }),
        this.prisma.attendance.count({ where: { studentId: targetId } }),
        this.prisma.attempt.count({ where: { studentId: targetId } }),
      ]);

    const canSeePhones =
      requesterRole === Role.ADMIN || requesterRole === Role.TEACHER_PLUS;

    const strippedUser = { ...user };
    const strippedStudentProfile = user.studentProfile
      ? { ...user.studentProfile }
      : null;
    if (!canSeePhones) {
      strippedUser.phone = null;
      if (strippedStudentProfile) {
        strippedStudentProfile.fatherPhone = null;
        strippedStudentProfile.motherPhone = null;
      }
    }

    return {
      ...strippedUser,
      studentProfile: strippedStudentProfile,
      currentClassroom: activeEnrollment
        ? {
            id: activeEnrollment.classroom.id,
            name: activeEnrollment.classroom.name,
            grade: activeEnrollment.classroom.grade,
          }
        : null,
      counts: {
        assignmentsCompleted,
        testResults,
        attendanceRecords,
        attempts,
      },
    };
  }

  /**
   * Онлайнаар CLASSROOM-р бүртгүүлсэн сурагчдын зөвшөөрөл хүлээгч жагсаалт.
   * Багш зөвшөөр + эхний сарын төлбөр CONFIRMED үед л код үүснэ.
   *
   * Эзэн шаардлагагаа үг: "нэр, утас, анги, бүртгүүлсэн огноо, эхний сарын төлбөр CONFIRMED эсэх"
   */
  async getPendingApprovalStudents() {
    const now = new Date();
    // forMonth: "2026-09" (YYYY-MM) формат
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const students = await this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        studentProfile: {
          approvalPending: true,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        studentProfile: {
          select: {
            grade: true,
          },
        },
        payments: {
          where: {
            forMonth: currentMonthStr,
          },
          select: {
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone,
      grade: s.studentProfile?.grade ?? 12,
      registeredAt: s.createdAt,
      hasConfirmedPayment: s.payments.some(
        (p) =>
          p.status === PaymentStatus.CONFIRMED ||
          p.status === PaymentStatus.REVERSED,
      ),
    }));
  }

  /**
   * Багш+/Админ: сурагчийг зөвшөөрнө.
   * - approvalPending=false болгоно
   * - approvedAt/approvedById бөглөнө
   * - studentCode==null бөгөөд approvalPending=false бол код олгоно
   * - Аудит лог бүртгэнэ
   */
  async approveStudent(studentId: string, approverId: string) {
    const student = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: {
        userId: true,
        approvalPending: true,
        grade: true,
      },
    });

    if (!student) {
      throw new NotFoundException('Сурагчийн профайл байхгүй');
    }

    if (!student.approvalPending) {
      throw new BadRequestException('Энэ сурагч аль хэдийн баталгаажсан');
    }

    // Сурагчийн код авна
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { studentCode: true },
    });

    // Кодгүй байвал үүсгэнэ
    let newCode: string | null = null;
    if (user?.studentCode === null) {
      newCode = await generateStudentCode(this.prisma, {
        branch: null,
        grade: student.grade ?? 12,
        registeredAt: new Date(),
      });
    }

    const updated = await this.prisma.user.update({
      where: { id: studentId },
      data: {
        studentCode: newCode ?? undefined,
        studentProfile: {
          update: {
            approvalPending: false,
            approvedAt: new Date(),
            approvedById: approverId,
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentCode: true,
        createdAt: true,
      },
    });

    // Аудит лог
    await this.audit.record({
      actorId: approverId,
      actorRole: 'ADMIN/TEACHER_PLUS',
      action: 'APPROVE_STUDENT',
      entity: 'StudentProfile',
      entityId: studentId,
      after: {
        approvalPending: false,
        approvedAt: new Date(),
        approvedById: approverId,
        studentCode: newCode,
      },
    });

    return updated;
  }
}
