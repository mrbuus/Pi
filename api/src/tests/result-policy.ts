// Шалгалтын дүнгийн эх сурвалж ба онлайн дүнгийн түгжээ — ЦЭВЭР логик (тесттэй).
// SHALGALT-TOLOVLOGOO §2.6, §8.2: онлайнаар өгсөн дүнг зөвхөн Багш+/Админ,
// шалтгаантайгаар засна (AuditLog-д бичигдэнэ).

import { AttemptSource, Role, TestType } from '../generated/prisma/enums';

/** Гараар/Excel-ээр оруулсан дүнгийн TestResult.source — тестийн төрлөөр. */
export function manualResultSource(testType: string): AttemptSource {
  return testType === TestType.CHAPTER_EXAM
    ? AttemptSource.CHAPTER_EXAM
    : AttemptSource.MANUAL_ENTRY;
}

export type ResultLock = 'ONLINE' | 'IN_PROGRESS' | null;

/**
 * ONLINE — сурагч онлайнаар өгсөн (дүн нь систем дүгнэсэн).
 * IN_PROGRESS — сурагч яг одоо онлайнаар өгч байна (гар дүн бичихгүй).
 */
export function resultLock(
  result: { source: string } | null | undefined,
  session: { status: string } | null | undefined,
): ResultLock {
  if (result?.source === AttemptSource.ONLINE_TEST) return 'ONLINE';
  if (!result && session?.status === 'SUBMITTED') return 'ONLINE';
  if (!result && session?.status === 'IN_PROGRESS') return 'IN_PROGRESS';
  return null;
}

export const OVERRIDE_ROLES: readonly string[] = [
  Role.ADMIN,
  Role.TEACHER_PLUS,
];
export const MIN_REASON_LENGTH = 3;

/** Түгжээтэй мөрийг засах боломжгүй бол шалтгааныг (монголоор) буцаана. */
export function overrideError(
  lock: ResultLock,
  role: string,
  reason: string | null | undefined,
): string | null {
  if (!lock) return null;
  if (lock === 'IN_PROGRESS') {
    return 'Сурагч одоо онлайнаар өгч байна — дуусгасны дараа дүнг засна уу';
  }
  if (!OVERRIDE_ROLES.includes(role)) {
    return 'Онлайнаар өгсөн дүнг зөвхөн Багш+ эсвэл админ засна';
  }
  if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
    return 'Онлайнаар өгсөн дүнг засах шалтгаанаа бичнэ үү';
  }
  return null;
}
