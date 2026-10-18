/**
 * Нөхөх хичээлийн цэвэр логик (I/O-гүй, тесттэй) — эзэн 2026-10-18 (D7):
 * - Үүрэг: тухайн өдөр ABSENT / EXCUSED / LATE.
 * - Шаардлага: тэмдэглэлийн зураг + тэр өдрийн ClassTestSession тест бүрийн A, B
 *   хувилбар (шалгалтын горим → TestResult). Ангид суусан (LATE) бол ангид хийсэн
 *   хувилбар (ихэвчлэн A) тооцогдоно → үлдсэн нь (B) л.
 * - Ажилтны шийдвэр: CONFIRMED → DONE, WAIVED → WAIVED, REOPENED → дахин тооцно
 *   (REOPEN-оос өмнө илгээсэн зураг тооцогдохгүй — дахин илгээнэ).
 */

export type MakeupReason = 'ABSENT' | 'EXCUSED' | 'LATE';
export type MakeupStatus = 'PENDING' | 'PARTIAL' | 'DONE' | 'WAIVED';
export type MakeupDecision = 'CONFIRMED' | 'WAIVED' | 'REOPENED';
export type MakeupAction = 'CONFIRM' | 'WAIVE' | 'REOPEN';

export const MAKEUP_REASONS: MakeupReason[] = ['ABSENT', 'EXCUSED', 'LATE'];
export const MAKEUP_VARIANTS = ['A', 'B'] as const;

export function isMakeupReason(status: string | null | undefined): status is MakeupReason {
  return !!status && (MAKEUP_REASONS as string[]).includes(status);
}

/** «A», «a», кирилл «А» → «A»; «B», кирилл «В» → «B». Бусад нь том үсгээр. */
export function normalizeVariant(label: string | null | undefined): string | null {
  const v = (label ?? '').trim().toUpperCase();
  if (!v) return null;
  if (v === 'А') return 'A';
  if (v === 'В') return 'B';
  return v;
}

export interface VariantTest {
  id: string;
  groupKey: string | null;
  variantLabel: string | null;
}

export interface RequiredTest {
  testId: string;
  variant: string | null;
  /** Ангид хийсэн тул тооцогдсон (LATE) — сурагч дахин хийхгүй */
  inClass: boolean;
}

/**
 * Тухайн өдрийн ангид хийсэн тестүүдээс (classTests) сурагчийн нөхөх тестүүдийг
 * гаргана. siblings — ижил groupKey-тэй, нийтлэгдсэн (устгаагүй) тестүүд.
 * Хувилбаргүй (groupKey-гүй эсвэл A/B-гүй) тест бол тэр тест өөрөө.
 */
export function requiredTests(
  reason: MakeupReason,
  classTests: VariantTest[],
  siblings: VariantTest[],
): RequiredTest[] {
  const doneInClass = new Set(classTests.map((t) => t.id));
  const out: RequiredTest[] = [];
  const seen = new Set<string>();
  const push = (test: VariantTest) => {
    if (seen.has(test.id)) return;
    seen.add(test.id);
    out.push({
      testId: test.id,
      variant: normalizeVariant(test.variantLabel),
      inClass: reason === 'LATE' && doneInClass.has(test.id),
    });
  };
  for (const test of classTests) {
    const own = normalizeVariant(test.variantLabel);
    const isAB = own === 'A' || own === 'B';
    if (!test.groupKey || !isAB) {
      push(test);
      continue;
    }
    const group = siblings.filter((s) => s.groupKey === test.groupKey);
    for (const variant of MAKEUP_VARIANTS) {
      // Ангид хийсэн хувилбарыг тэргүүлнэ; давхардсан хувилбараас эхнийх нь.
      const pick =
        own === variant
          ? test
          : group
              .filter((s) => normalizeVariant(s.variantLabel) === variant)
              .sort((a, b) => a.id.localeCompare(b.id))[0];
      if (pick) push(pick);
    }
  }
  return out;
}

/** Ажилтны шийдвэрийг `LessonMakeup.note`-ийн эхний мөрөнд хадгална (тусдаа багана үгүй). */
const DECISIONS: MakeupDecision[] = ['CONFIRMED', 'WAIVED', 'REOPENED'];

export function encodeDecisionNote(decision: MakeupDecision, text?: string | null): string {
  const body = (text ?? '').trim();
  return body ? `${decision}\n${body}` : decision;
}

export function decodeDecisionNote(note: string | null | undefined): {
  decision: MakeupDecision | null;
  text: string | null;
} {
  if (!note) return { decision: null, text: null };
  const [first, ...rest] = note.split('\n');
  if ((DECISIONS as string[]).includes(first)) {
    const text = rest.join('\n').trim();
    return { decision: first as MakeupDecision, text: text || null };
  }
  return { decision: null, text: note };
}

export function decisionOf(action: MakeupAction): MakeupDecision {
  return action === 'CONFIRM' ? 'CONFIRMED' : action === 'WAIVE' ? 'WAIVED' : 'REOPENED';
}

export interface StatusInput {
  required: RequiredTest[];
  doneTestIds: Set<string>;
  imageKeys: string[];
  submittedAt: Date | null;
  decision: MakeupDecision | null;
  decidedAt: Date | null;
}

export function photosAccepted(input: Pick<StatusInput, 'imageKeys' | 'submittedAt' | 'decision' | 'decidedAt'>): boolean {
  if (!input.imageKeys.length || !input.submittedAt) return false;
  if (input.decision === 'REOPENED' && input.decidedAt)
    return input.submittedAt.getTime() > input.decidedAt.getTime();
  return true;
}

export function testDone(test: RequiredTest, doneTestIds: Set<string>): boolean {
  return test.inClass || doneTestIds.has(test.testId);
}

export function makeupStatus(input: StatusInput): MakeupStatus {
  if (input.decision === 'WAIVED') return 'WAIVED';
  if (input.decision === 'CONFIRMED') return 'DONE';
  const photos = photosAccepted(input);
  const todo = input.required.filter((t) => !t.inClass);
  const done = todo.filter((t) => input.doneTestIds.has(t.testId)).length;
  if (photos && done === todo.length) return 'DONE';
  if (photos || done > 0) return 'PARTIAL';
  return 'PENDING';
}

export function isOpenStatus(status: MakeupStatus): boolean {
  return status === 'PENDING' || status === 'PARTIAL';
}
