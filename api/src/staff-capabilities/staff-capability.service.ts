import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';

export const STAFF_CAPABILITIES = [
  'schedule.manage',
  'time.review',
  'payroll.view',
  'finance.manage',
  // Багшийн ажилласан цагийн хүснэгт бөглөх + бүх багшийн данс засах (эзэн 2026-11-08).
  // Цагийн ХӨЛС энэ эрхэд ОРОХГҮЙ — зөвхөн teacher-hours/pay-rate-owner.ts.
  'teacher-hours.edit',
  // Сурагчийн нууц үгийг шууд тохируулах/утас руу буцаах (эзэн 2026-11-16). Зөвхөн СУРАГЧ.
  'student-password.set',
  // Эзэн 2026-11-16: «бүх ийм эрхийг эрхийн матрицад оруул». Доорх эрхүүд өмнө нь
  // кодонд Багш+ үүргээр шууд нээлттэй байсан — одоо ч Багш+ бүрд АНХДАГЧААР нээлттэй,
  // Админ хүн тус бүрд хааж (DENY) болно. Багш (TEACHER)-ийн эрхэд хамаарахгүй.
  /** Анги нээх/татан буулгах, ангийн багш оноох, элсэлтийн цонх, ирцийн шалгуур, гадны багш батлах */
  'classes.manage',
  /** Сурагч бүртгэх, анги руу оруулах/хасах, мэдээлэл засах, архивлах, батлах, эцэг эхийн холболт, сонирхогч */
  'students.manage',
  /** Сурагчдын бүртгэлийг Excel/CSV-ээр татах */
  'students.export',
  /** Сорил, жишиг/цаасан шалгалт, оноо засах, тест оноох, түвшин тогтоох тохиргоо */
  'exams.manage',
  /** Ном, бүлэг, бодлого, сэдэв, томьёо, онол, бичлэг, импорт, дотоод ноорог */
  'content.manage',
  /** Ажил үүсгэх, хариуцагч оноох */
  'tasks.manage',
  /** Аналитик, аудитын түүх, SMS-ийн бүртгэл */
  'reports.view',
] as const;
export type StaffCapability = (typeof STAFF_CAPABILITIES)[number];
/**
 * Багш+-д үүргээр АНХДАГЧААР нээлттэй эрхүүд (олголт хэрэггүй). Админ хүн тус бүрд
 * DENY мөрөөр хаана; DENY-г цуцлахад (revokedAt) дахин нээгдэнэ. Бусад эрх
 * (цаг, цалин, цаг бөглөх, нууц үг) олголтоор (ALLOW) л нээгдэнэ.
 */
export const TEACHER_PLUS_DEFAULT: readonly StaffCapability[] = [
  'finance.manage',
  'schedule.manage',
  'classes.manage',
  'students.manage',
  'students.export',
  'exams.manage',
  'content.manage',
  'tasks.manage',
  'reports.view',
];
/** @deprecated хуучин нэр — TEACHER_PLUS_DEFAULT */
export const TEACHER_PLUS_IMPLICIT = TEACHER_PLUS_DEFAULT;
export type CapabilityEffect = 'ALLOW' | 'DENY';
export const isDefaultOn = (c: string) =>
  (TEACHER_PLUS_DEFAULT as readonly string[]).includes(c);

const activeNow = () => ({
  revokedAt: null,
  OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
});

@Injectable()
export class StaffCapabilityService {
  constructor(private readonly prisma: PrismaService) {}

  private async actor(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, archivedAt: true },
    });
    if (!user || user.archivedAt)
      throw new ForbiddenException('Идэвхтэй ажилтны эрх шаардлагатай.');
    return user;
  }

  async has(
    userId: string,
    capability: StaffCapability,
    scopeClassroomId?: string,
  ): Promise<boolean> {
    if (!STAFF_CAPABILITIES.includes(capability)) return false;
    const actor = await this.actor(userId);
    if (actor.role === Role.ADMIN) return true;
    if (actor.role !== Role.TEACHER_PLUS) return false;
    // Анхдагчаар нээлттэй (эзэн 2026-10-08 төлбөр, 2026-10-18 хуваарь, 2026-11-16 бусад):
    // Админ хаагаагүй (идэвхтэй DENY мөргүй) бол нээлттэй. Хаалт бүх ангид (scopeKey '').
    if (isDefaultOn(capability))
      return !(await this.prisma.staffCapabilityGrant.findFirst({
        where: {
          userId,
          capability,
          effect: 'DENY',
          scopeKey: '',
          ...activeNow(),
        },
        select: { id: true },
      }));
    return !!(await this.prisma.staffCapabilityGrant.findFirst({
      where: {
        userId,
        capability,
        effect: 'ALLOW',
        revokedAt: null,
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          {
            scopeKey: { in: scopeClassroomId ? ['', scopeClassroomId] : [''] },
          },
        ],
      },
      select: { id: true },
    }));
  }

  /**
   * Маршрутын хамгаалалт (CapabilityGuard): зөвхөн Багш+-ийг шүүнэ. Админ үргэлж;
   * бусад үүрэг (Багш г.м.) энэ механизмд хамаарахгүй — тэднийг RolesGuard шийднэ.
   */
  async assertForTeacherPlus(userId: string, capability: StaffCapability) {
    const actor = await this.actor(userId);
    if (actor.role !== Role.TEACHER_PLUS) return;
    await this.assert(userId, capability);
  }

  /**
   * Мөнгөн дүн харах/засах дүрэмд дамжуулах «үр дүнтэй үүрэг»: Багш+ төлбөрийн эрхээ
   * хаалгасан бол Багш шиг (дүнгүй) тооцно. Бусад үүрэг хэвээр.
   */
  async financeRole<R extends string>(
    userId: string,
    role: R,
  ): Promise<R | 'TEACHER'> {
    if (role !== Role.TEACHER_PLUS) return role;
    return (await this.has(userId, 'finance.manage')) ? role : Role.TEACHER;
  }

  /** Багш+ мөн эсэх + эрх: үйлчилгээн дэх `role === TEACHER_PLUS` шалгалтыг орлоно */
  async teacherPlusHas(userId: string, capability: StaffCapability) {
    const actor = await this.actor(userId);
    return actor.role === Role.TEACHER_PLUS && this.has(userId, capability);
  }

  async assert(
    userId: string,
    capability: StaffCapability,
    scopeClassroomId?: string,
  ): Promise<void> {
    if (!(await this.has(userId, capability, scopeClassroomId)))
      throw new ForbiddenException(
        'Энэ үйлдлийн тусгай эрх олгогдоогүй эсвэл хугацаа нь дууссан.',
      );
  }

  async mine(userId: string) {
    const actor = await this.actor(userId);
    if (actor.role === Role.ADMIN)
      return {
        administrator: true,
        grants: [],
        capabilities: [...STAFF_CAPABILITIES],
        denied: [],
      };
    if (actor.role !== Role.TEACHER_PLUS)
      return { administrator: false, grants: [], capabilities: [], denied: [] };
    const rows = await this.prisma.staffCapabilityGrant.findMany({
      where: { userId, ...activeNow() },
      select: {
        id: true,
        capability: true,
        scopeKey: true,
        expiresAt: true,
        effect: true,
      },
      orderBy: { capability: 'asc' },
    });
    const denied = new Set(
      rows
        .filter((r) => r.effect === 'DENY' && !r.scopeKey)
        .map((r) => r.capability),
    );
    const grants = rows
      .filter(
        (r) =>
          r.effect !== 'DENY' &&
          !isDefaultOn(r.capability) &&
          (STAFF_CAPABILITIES as readonly string[]).includes(r.capability),
      )
      .map((r) => ({
        id: r.id,
        capability: r.capability,
        scopeKey: r.scopeKey,
        expiresAt: r.expiresAt,
      }));
    // Анхдагч эрхүүдийг вэб ч мэдэх ёстой (засах товч харуулах эсэх) — бүх ангид
    for (const capability of TEACHER_PLUS_DEFAULT)
      if (!denied.has(capability))
        grants.push({
          id: `implicit:${capability}`,
          capability,
          scopeKey: '',
          expiresAt: null,
        });
    const capabilities = STAFF_CAPABILITIES.filter((c) =>
      grants.some((g) => g.capability === c && !g.scopeKey),
    );
    return {
      administrator: false,
      grants,
      /** Бүх ангид хүчинтэй эрхүүд — UI товч нуух/харуулахад */
      capabilities,
      /** Админ хаасан анхдагч эрхүүд */
      denied: [...denied],
    };
  }

  private async assertAdmin(actorId: string) {
    if ((await this.actor(actorId)).role !== Role.ADMIN)
      throw new ForbiddenException('Зөвхөн админ нарийн эрхийг удирдана.');
  }

  async list(actorId: string) {
    await this.assertAdmin(actorId);
    const [grants, staff, classrooms] = await Promise.all([
      this.prisma.staffCapabilityGrant.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 500,
        select: {
          id: true,
          userId: true,
          capability: true,
          scopeKey: true,
          reason: true,
          expiresAt: true,
          revokedAt: true,
          effect: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      // Эрхийн матриц: ажилтан бүр (Админ, Багш+, Багш) нэг мөр. Утасны дугаар
      // зөвхөн энэ ADMIN-only endpoint-оор гарна (assertAdmin дээр).
      this.prisma.user.findMany({
        where: {
          role: { in: [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER] },
          archivedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
        },
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        take: 500,
      }),
      this.prisma.classroom.findMany({
        where: { archived: false },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
        take: 500,
      }),
    ]);
    return {
      asOf: new Date().toISOString(),
      /** Матрицад «та» мөрийг түгжихэд (өөрийн түвшинг өөрчилдөггүй) */
      actorId,
      grants,
      staff,
      classrooms,
      capabilities: STAFF_CAPABILITIES,
      /** Багш+-д анхдагчаар нээлттэй эрхүүд (матрицад ✓, Админ хааж болно) */
      teacherPlusDefault: TEACHER_PLUS_DEFAULT,
      /** Хуучин нэр (хуучин вэб) */
      teacherPlusImplicit: TEACHER_PLUS_DEFAULT,
    };
  }

  async grant(
    actorId: string,
    input: {
      userId: string;
      capability: StaffCapability;
      scopeKey?: string;
      reason: string;
      expiresAt?: string;
      effect?: CapabilityEffect;
    },
  ) {
    await this.assertAdmin(actorId);
    if (!STAFF_CAPABILITIES.includes(input.capability))
      throw new BadRequestException('Эрхийн төрөл тохирохгүй.');
    const effect: CapabilityEffect = input.effect ?? 'ALLOW';
    if (effect !== 'ALLOW' && effect !== 'DENY')
      throw new BadRequestException('Эрхийн үйлдэл тохирохгүй.');
    const defaultOn = isDefaultOn(input.capability);
    // Анхдагч эрхийг «олгох» утгагүй (аль хэдийн нээлттэй) — зөвхөн хаана; олголтоор
    // нээгддэг эрхийг «хаах» нь олголтыг цуцлах (DELETE) юм.
    if (defaultOn && effect !== 'DENY')
      throw new BadRequestException(
        'Энэ эрх Багш+-д анхдагчаар нээлттэй. Хаахын тулд «хаах» сонгоно уу.',
      );
    if (!defaultOn && effect === 'DENY')
      throw new BadRequestException(
        'Энэ эрх олголтоор нээгддэг. Хаахын тулд олголтыг цуцална уу.',
      );
    const scopeKey = input.scopeKey?.trim() || '';
    if (scopeKey && (defaultOn || input.capability !== 'schedule.manage'))
      throw new BadRequestException('Энэ эрх ангид хязгаарлагдахгүй.');
    const reason = input.reason.trim();
    if (reason.length < 3 || reason.length > 500)
      throw new BadRequestException('Шалтгааныг тодорхой бичнэ үү.');
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    if (
      expiresAt &&
      (!Number.isFinite(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now())
    )
      throw new BadRequestException('Эрхийн дуусах хугацаа ирээдүйд байна.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff-capability:${input.userId}:${input.capability}:${scopeKey}`}))`;
      const user = await tx.user.findUnique({
        where: { id: input.userId },
        select: { role: true, archivedAt: true },
      });
      if (!user || user.archivedAt || user.role !== Role.TEACHER_PLUS)
        throw new BadRequestException('Идэвхтэй Багш+ ажилтныг сонгоно уу.');
      if (
        scopeKey &&
        !(await tx.classroom.findFirst({
          where: { id: scopeKey, archived: false },
          select: { id: true },
        }))
      )
        throw new BadRequestException('Идэвхтэй анги олдсонгүй.');
      const where = {
        userId_capability_scopeKey: {
          userId: input.userId,
          capability: input.capability,
          scopeKey,
        },
      };
      const previous = await tx.staffCapabilityGrant.findUnique({ where });
      const row = await tx.staffCapabilityGrant.upsert({
        where,
        create: {
          userId: input.userId,
          capability: input.capability,
          scopeKey,
          reason,
          expiresAt,
          effect,
          grantedById: actorId,
        },
        update: {
          reason,
          expiresAt,
          effect,
          revokedAt: null,
          grantedById: actorId,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: Role.ADMIN,
          action: effect === 'DENY' ? 'DENY' : 'GRANT',
          entity: 'StaffCapabilityGrant',
          entityId: row.id,
          before: previous
            ? {
                capability: previous.capability,
                scopeKey: previous.scopeKey,
                effect: previous.effect,
                revoked: !!previous.revokedAt,
                expiresAt: previous.expiresAt?.toISOString() ?? null,
              }
            : undefined,
          after: {
            userId: row.userId,
            capability: row.capability,
            scopeKey: row.scopeKey,
            effect: row.effect,
            expiresAt: row.expiresAt?.toISOString() ?? null,
          },
          reason,
        },
      });
      return row;
    });
  }

  async revoke(actorId: string, id: string, reason: string) {
    await this.assertAdmin(actorId);
    const cleanReason = reason.trim();
    if (cleanReason.length < 3 || cleanReason.length > 500)
      throw new BadRequestException('Цуцлах шалтгааныг бичнэ үү.');
    return this.prisma.$transaction(async (tx) => {
      const initial = await tx.staffCapabilityGrant.findUnique({
        where: { id },
      });
      if (!initial) throw new NotFoundException('Эрх олдсонгүй.');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`staff-capability:${initial.userId}:${initial.capability}:${initial.scopeKey}`}))`;
      const previous = await tx.staffCapabilityGrant.findUniqueOrThrow({
        where: { id },
      });
      if (previous.revokedAt) return previous;
      const row = await tx.staffCapabilityGrant.update({
        where: { id },
        data: { revokedAt: new Date(), reason: cleanReason },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole: Role.ADMIN,
          // DENY-г цуцлах = анхдагч эрхийг дахин нээх
          action: row.effect === 'DENY' ? 'ALLOW' : 'REVOKE',
          entity: 'StaffCapabilityGrant',
          entityId: id,
          before: {
            userId: row.userId,
            capability: row.capability,
            scopeKey: row.scopeKey,
            effect: row.effect,
          },
          after: { revokedAt: row.revokedAt!.toISOString() },
          reason: cleanReason,
        },
      });
      return row;
    });
  }
}
