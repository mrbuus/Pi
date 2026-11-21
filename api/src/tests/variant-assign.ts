// A/B хувилбарыг сурагч бүрд серверт оноох — цаасан шалгалтын горимтой (Test.paperMode) тестэд.
// Цэвэр логик — I/O-гүй, тесттэй (variant-assign.spec.ts).
//
// Дүрэм нь вэбийн `components/test-list/types.ts` `pickForStudent`, аппын
// `features/exam/domain/test_list_logic.dart` `pickForStudent`-тэй ИЖИЛ:
//   1) дүнтэй хувилбар → 2) эхэлсэн (IN_PROGRESS) → 3) hash(`${studentId}:${groupKey}`) % N.
// Мөрийн дараалал нь жагсаалтын endpoint-уудынх (createdAt буурахаар, тэнцвэл id-аар).
// Hash: JS `(h * 31 + charCodeAt(i)) >>> 0` (UTF-16 код нэгжээр, uint32).

export function variantHash(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export interface VariantRow {
  id: string;
  groupKey: string | null;
  title: string;
  createdAt: Date;
  /** Энэ сурагчийн дүн бий эсэх */
  hasResult: boolean;
  /** Энэ сурагчийн сессийн төлөв */
  sessionStatus: string | null;
}

/** Жагсаалтын дараалал: шинэ нь эхэнд, тэнцвэл id-аар (тогтвортой). */
export function orderVariants<T extends Pick<VariantRow, 'id' | 'createdAt'>>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime() ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** Вэб/аппын `variantKey`: (groupKey ?? title).trim() */
export function variantKey(row: Pick<VariantRow, 'groupKey' | 'title'>): string {
  return (row.groupKey ?? row.title).trim();
}

/** Ижил бүлгийн хувилбаруудаас сурагчид оноогдохыг сонгоно (rows нь orderVariants-ийн дараалалтай). */
export function pickAssignedVariant<T extends VariantRow>(
  rows: T[],
  studentId: string,
): T {
  if (rows.length === 0) throw new Error('Хувилбар алга');
  if (rows.length === 1) return rows[0];
  const engaged =
    rows.find((r) => r.hasResult) ??
    rows.find((r) => r.sessionStatus === 'IN_PROGRESS');
  if (engaged) return engaged;
  const key = `${studentId}:${variantKey(rows[0])}`;
  return rows[variantHash(key) % rows.length];
}

/**
 * Жагсаалтаас цаасан горимын бүлэг бүрт зөвхөн оноогдсон хувилбарыг үлдээнэ. Бусад мөр,
 * бусад тест хөндөгдөхгүй; эх дараалал хадгалагдана. `isPaper` — тухайн мөр цаасан горимтой
 * бөгөөд A/B хувилбартай (groupKey + variantLabel) эсэх.
 */
export function keepAssignedVariants<T extends VariantRow>(
  rows: T[],
  studentId: string,
  isPaper: (row: T) => boolean,
): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    if (!isPaper(row) || !row.groupKey) continue;
    const key = row.groupKey;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const drop = new Set<string>();
  for (const siblings of groups.values()) {
    if (siblings.length < 2) continue;
    const chosen = pickAssignedVariant(orderVariants(siblings), studentId);
    for (const s of siblings) {
      // Өөрийн дүн/сесстэй хувилбар үргэлж харагдана (түүх нуугдахгүй)
      if (s.id !== chosen.id && !s.hasResult && !s.sessionStatus) drop.add(s.id);
    }
  }
  return drop.size ? rows.filter((r) => !drop.has(r.id)) : rows;
}
