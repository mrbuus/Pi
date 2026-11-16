import { Role } from '../generated/prisma/enums';

type TuitionFields = { tuitionAgreed?: number | null; tuitionAmount?: number | null };

/**
 * Төлбөрийн дүн, тохирсон (хөнгөлөлттэй) дүнг Админ ба Багш+ өөрчилнө (эзний шийдвэр 2026-11-16;
 * өмнө нь зөвхөн Админ). Бусад role-ийн илгээсэн `tuitionAgreed`-ийг хадгалахгүй, дүнгүй (`null`)
 * `tuitionAmount` нь «үнэ мэдэхгүй» гэсэн утгатай тул хадгалсан дүнг хоослохгүй.
 */
export function guardTuitionFields<T extends TuitionFields>(dto: T, actorRole: Role): T {
  if (actorRole === Role.ADMIN || actorRole === Role.TEACHER_PLUS) return dto;
  const safe = { ...dto };
  delete safe.tuitionAgreed;
  if (safe.tuitionAmount == null) delete safe.tuitionAmount;
  return safe;
}
