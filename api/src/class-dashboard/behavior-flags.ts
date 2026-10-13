/**
 * Сурагчийн зан төлөвийн шошгоны жагсаалт (эзэн 2026-10-13). Шинэ төрөл нэмэхэд
 * энд + вэбийн `components/classes/flags.ts`-д нэмнэ — ӨС-ийн миграци хэрэггүй.
 * tone: CONCERN = анхаарах (эрсдэлд тооцогдоно), POSITIVE = сайн мэдээ.
 */
export const BEHAVIOR_FLAGS = {
  GUESSES: { label: 'Буудаж боддог', tone: 'CONCERN' },
  COPIES: { label: 'Хуулдаг', tone: 'CONCERN' },
  ATTENTION: { label: 'Анхаарал', tone: 'CONCERN' },
  IMPROVED: { label: 'Сайжирсан', tone: 'POSITIVE' },
} as const;

export type BehaviorFlagKind = keyof typeof BEHAVIOR_FLAGS;

export function isBehaviorFlagKind(v: unknown): v is BehaviorFlagKind {
  return typeof v === 'string' && Object.hasOwn(BEHAVIOR_FLAGS, v);
}

export function isConcernFlag(kind: string): boolean {
  return isBehaviorFlagKind(kind) && BEHAVIOR_FLAGS[kind].tone === 'CONCERN';
}

/** Тэмдэглэлийг цэвэрлэнэ: хоосон → null, 300 тэмдэгтээр таслана. */
export function cleanFlagNote(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s ? s.slice(0, 300) : null;
}
