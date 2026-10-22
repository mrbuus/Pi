import { Role } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';
import { withPlus } from '../revisions/revision-snapshot';

/**
 * Багш+ хүний нэрийн ард «+» (эзэн 2026-10-23). ӨС-д snapshot болгон хадгалсан
 * нэрийг (confirmedByName, updatedByName, createdByName …) УНШИХ үед л тэмдэглэнэ —
 * хадгалсан утгыг өөрчлөхгүй, эрх солигдвол дараагийн уншилтад шинэчлэгдэнэ.
 */
export type PlusLookup = Pick<PrismaService, 'user'>;

/** Өгсөн id-уудаас Багш+ эрхтэйг нь буцаана (нэг дуудлага) */
export async function teacherPlusIds(
  db: PlusLookup,
  ids: (string | null | undefined)[],
): Promise<Set<string>> {
  const unique = [...new Set(ids.filter((v): v is string => !!v))];
  if (!unique.length) return new Set();
  const rows = await db.user.findMany({
    where: { id: { in: unique }, role: Role.TEACHER_PLUS },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/** Snapshot нэрийг id-гаар нь тэмдэглэнэ: Багш+ бол «Нэр+» */
export function markPlus<T extends string | null | undefined>(
  name: T,
  id: string | null | undefined,
  plus: Set<string>,
): T {
  if (!name || !id || !plus.has(id)) return name;
  return withPlus(name, Role.TEACHER_PLUS) as T;
}
