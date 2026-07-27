import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditInput {
  actorId: string;
  actorRole: string;
  action: string; // ж: "CREATE", "UPDATE", "CONFIRM", "REVERSE", "DELETE"
  entity: string; // ж: "Payment", "StudentProfile", "TestResult"
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string;
}

export interface AuditListFilters {
  entity?: string;
  entityId?: string;
  actorId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: string | number;
  pageSize?: string | number;
}

// before/after JSON дотор ХЭЗЭЭ Ч хадгалагдаж болохгүй түлхүүрүүд — нууц үгийн
// хэш болон утасны бүтэн дугаар (StudentProfile.fatherPhone/motherPhone,
// User.phone, гэх мэт). Түлхүүрийн нэрэнд "password" эсвэл "phone" орсон бол
// утгыг нь бүрмөсөн устгана (Prisma before/after snapshot Nest JSON-руу шууд
// орохоос өмнө дуудагдана).
const REDACT_KEY_PATTERN = /password|phone/i;

function redactDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACT_KEY_PATTERN.test(key) ? '[REDACTED]' : redactDeep(v);
    }
    return out;
  }
  return value;
}

function redact(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null | undefined {
  if (value == null) return value;
  return redactDeep(value) as Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  // АЛЬ Ч тохиолдолд дуудагчид throw хийхгүй: аудит бичлэг үүсгэхэд гарсан
  // алдаа бодит бизнесийн үйлдлийг (төлбөр баталгаажуулах, дүн засах гэх мэт)
  // rollback хийж болохгүй — гэхдээ алдааг чанга log-лоно, дуугүй өнгөрөхгүй.
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          actorRole: input.actorRole,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId,
          before:
            input.before !== undefined
              ? ((redact(input.before) ??
                  Prisma.JsonNull) as Prisma.InputJsonValue)
              : undefined,
          after:
            input.after !== undefined
              ? ((redact(input.after) ??
                  Prisma.JsonNull) as Prisma.InputJsonValue)
              : undefined,
          reason: input.reason,
        },
      });
    } catch (err) {
      this.logger.error(
        `Аудит бичлэг үүсгэхэд алдаа гарлаа: ${input.entity}/${input.entityId} (${input.action}, actor=${input.actorId})`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  // GET /audit — зөвхөн ADMIN. Шинэ нь эхэндээ, хуудаслалттай (default 50, max 200).
  async list(filters: AuditListFilters) {
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(filters.pageSize) || 50));

    const where: Prisma.AuditLogWhereInput = {
      ...(filters.entity ? { entity: filters.entity } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.from || filters.to
        ? {
            at: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }

  // GET /audit/entity/:entity/:entityId — ADMIN + TEACHER_PLUS: нэг бичлэгийн
  // бүрэн өөрчлөлтийн түүх, шинэ нь эхэндээ.
  historyFor(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      orderBy: { at: 'desc' },
    });
  }
}
