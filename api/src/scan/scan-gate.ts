import { levelAllows } from '../thousand/review-gate';
import type { StudentReviewState } from '../thousand/thousand.service';

// QR-аар бодлого нээхэд юуг харуулах вэ — ЦЭВЭР логик (I/O байхгүй, бүрэн тесттэй).
//
// Үндсэн зарчим: QR нь ШИНЭ эрх олгохгүй. Сурагч тухайн бодлогын бодолтыг
// одоо байгаа замаар (шалгалтын эргэн харалт) харж чадах үед л QR-аар харна.
// Эс бөгөөс QR шалгалт, гэрийн даалгаврын үед хуулах хэрэгсэл болно.
//
//   1000 бодлого (THOUSAND): /thousand/tests/:id/review-тэй ижил — илгээсэн +
//     багшийн нээсэн/7 хоногийн автомат түвшин FULL → хариу, бодолт, YouTube.
//   Бусад тест: /tests/:id/review-тэй ижил — илгээсэн + бодолт VERIFIED →
//     зөвхөн бодолт (тест дахин ашиглагддаг тул зөв хариуг тусад нь задлахгүй).

export type ScanTestRow =
  | { kind: 'THOUSAND'; submitted: boolean; review: StudentReviewState | null }
  | { kind: 'OTHER'; submitted: boolean };

export type ScanLockReason =
  /** Бодлого санд бодолтгүй (100x100 зэрэг) */
  | 'NO_SOLUTION'
  /** Бодлого ямар ч шалгалтад ороогүй тул нээх зам байхгүй */
  | 'NOT_IN_TEST'
  /** Бодлого орсон шалгалтыг сурагч хараахан өгөөгүй */
  | 'NOT_TAKEN'
  /** Өгсөн, гэхдээ багш нээгээгүй / 7 хоног болоогүй */
  | 'WAITING';

export type ScanAccess =
  | { kind: 'FULL' }
  | { kind: 'SOLUTION' }
  | { kind: 'LOCKED'; reason: ScanLockReason; opensAt: Date | null };

export interface ScanGateInput {
  staff: boolean;
  /** solutionOutline байгаа эсэх (агуулгаас үл хамааран) */
  hasSolution: boolean;
  /** analysis.status === VERIFIED — 1000-аас бусад тестэд бодолт нээх нөхцөл */
  solutionVerified: boolean;
  tests: ScanTestRow[];
}

export function decideScanAccess(input: ScanGateInput): ScanAccess {
  if (input.staff) return { kind: 'FULL' };

  const thousand = input.tests.filter(
    (t): t is Extract<ScanTestRow, { kind: 'THOUSAND' }> => t.kind === 'THOUSAND',
  );
  if (thousand.some((t) => t.submitted && t.review && levelAllows(t.review.level, 'FULL'))) {
    return { kind: 'FULL' };
  }
  if (!input.hasSolution) return { kind: 'LOCKED', reason: 'NO_SOLUTION', opensAt: null };

  if (input.solutionVerified && input.tests.some((t) => t.kind === 'OTHER' && t.submitted)) {
    return { kind: 'SOLUTION' };
  }
  if (input.tests.length === 0) return { kind: 'LOCKED', reason: 'NOT_IN_TEST', opensAt: null };

  const waiting = thousand
    .filter((t) => t.submitted && t.review?.covered)
    .map((t) => t.review!.opensAt)
    .filter((at): at is Date => at !== null)
    .sort((a, b) => a.getTime() - b.getTime());
  if (thousand.some((t) => t.submitted && t.review?.covered)) {
    return { kind: 'LOCKED', reason: 'WAITING', opensAt: waiting[0] ?? null };
  }
  return { kind: 'LOCKED', reason: 'NOT_TAKEN', opensAt: null };
}
