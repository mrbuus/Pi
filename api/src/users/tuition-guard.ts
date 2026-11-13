import { Role } from '../generated/prisma/enums';

type TuitionFields = { tuitionAgreed?: number | null; tuitionAmount?: number | null };

/**
 * Мөнгөн дүнг зөвхөн Админ хардаг (payments/ledger-redact). Тиймээс Админ биш хүний (Багш+) илгээсэн
 * тохирсон (хөнгөлөлттэй) дүн `tuitionAgreed`-ийг хадгалахгүй: вэбийн багцын цонх Багш+-д үнэ
 * харагдахгүй үед `null` илгээж, Админы тавьсан хөнгөлөлтийг арилгадаг байсан (2026-11-14).
 * Мөн дүнгүй (`null`) `tuitionAmount` нь «үнэ мэдэхгүй» гэсэн утгатай тул хадгалсан дүнг хоослохгүй.
 * Багш+ тодорхой дүн (`tuitionAmount` тоо) оруулах эрх хэвээр.
 */
export function guardTuitionFields<T extends TuitionFields>(dto: T, actorRole: Role): T {
  if (actorRole === Role.ADMIN) return dto;
  const safe = { ...dto };
  delete safe.tuitionAgreed;
  if (safe.tuitionAmount == null) delete safe.tuitionAmount;
  return safe;
}
