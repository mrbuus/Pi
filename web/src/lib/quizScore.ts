/**
 * Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08) — цэвэр тооцоо, I/O-гүй.
 * = api/src/homework-quiz/quiz-score.ts (api/src/homework-quiz/quiz-score.spec.ts хоёуланг нь
 * ижил эсэхийг шалгана). Энэ файлд `@/` импорт БҮҮ нэм — api-ийн jest шууд уншдаг.
 *
 * Өнгөний муж (эзэн): 0 <= улаан < 50 <= улбар шар < 80 <= ногоон <= 100.
 * 49,99% улаан, 50% улбар шар, 79,99% улбар шар, 80% ногоон. Оноо бутархай байж болно (7,5 —
 * зууны нэг хүртэл, эзэн 2026-11-08 19:08). Хувийг хөвөгч тоогоор бус, ЗУУНЫ НЭГЭЭР бүхэл
 * болгоод харьцуулна: s = оноо*100 (бүхэл), хувь = s/тоо, хувь < 50 <=> 2*s < 100*тоо.
 */

/** marks.tsx-ийн Tone-той ижил нэр: улаан = error, улбар шар = warning («Хоцорсон», «Дутуу»), ногоон = success */
export type QuizTone = "error" | "warning" | "success";

/** Нэг шалгалтын бодлогын дээд тоо */
export const QUIZ_MAX_PROBLEMS = 200;

/** «Асуудалтай» болгох анхдагч хувь (шалгуурын minQuiz, эзэн 2026-11-08 19:08) */
export const DEFAULT_MIN_QUIZ = 50;

/** Оноог зууны нэгээр бүхэл тоо болгоно (7.5 → 750). Оноо 2-оос олон оронгүй тул яг таарна */
export function toHundredths(x: number): number {
  return Math.round(x * 100);
}

const valid = (score: number | null | undefined, problemCount: number): score is number =>
  score !== null && score !== undefined && Number.isFinite(score) && Number.isFinite(problemCount) && problemCount > 0;

/** Оноо → өнгө. Оноогүй (null) эсвэл буруу бодлогын тоо → null (өнгөгүй) */
export function quizTone(score: number | null | undefined, problemCount: number): QuizTone | null {
  if (!valid(score, problemCount)) return null;
  const s = toHundredths(score);
  const c = toHundredths(problemCount);
  if (2 * s < c) return "error"; // < 50%
  if (5 * s < 4 * c) return "warning"; // < 80%
  return "success";
}

/** Хувь → өнгө (сарын дундаж гэх мэт аль хэдийн бодсон хувьд) */
export function percentTone(pct: number | null | undefined): QuizTone | null {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return null;
  if (pct < 50) return "error";
  if (pct < 80) return "warning";
  return "success";
}

/** Оноо → хувь (0..100); оноогүй бол null */
export function quizPercent(score: number | null | undefined, problemCount: number): number | null {
  if (!valid(score, problemCount)) return null;
  return (toHundredths(score) * 100) / toHundredths(problemCount);
}

/**
 * «Асуудалтай» (шалгуурын minQuiz): хувь < minPct эсэх — бүхэл тоогоор (s/тоо < m <=> s < m*тоо).
 * minPct = 0 бол хэзээ ч үгүй (шалгуур унтарсан).
 */
export function quizBelow(score: number, problemCount: number, minPct: number): boolean {
  if (!valid(score, problemCount) || !(minPct > 0)) return false;
  return toHundredths(score) * 100 < minPct * toHundredths(problemCount);
}

/**
 * Ангийн дундаж: ЗӨВХӨН оноо оруулсан сурагчдаар (хоосон нь тоонд орохгүй). Бүгд ижил бодлогын
 * тоотой тул дундаж хувь = Σоноо·100 / (n·тоо); өнгийг бүхэл тоогоор (Σ зууны нэгээр).
 */
export function quizAverage(
  scores: ReadonlyArray<number | null | undefined>,
  problemCount: number,
): { pct: number; tone: QuizTone; count: number } | null {
  const list = scores.filter((s): s is number => s !== null && s !== undefined && Number.isFinite(s));
  if (!list.length || !Number.isFinite(problemCount) || problemCount <= 0) return null;
  const sum = list.reduce((a, s) => a + toHundredths(s), 0);
  const total = list.length * toHundredths(problemCount);
  const tone: QuizTone = 2 * sum < total ? "error" : 5 * sum < 4 * total ? "warning" : "success";
  return { pct: (sum * 100) / total, tone, count: list.length };
}

/**
 * Өөр өөр бодлогын тоотой хэд хэдэн шалгалтын дундаж хувь (сурагчийн сарын тойм): өдөр бүр ижил
 * жинтэй. Хоосон бол null.
 */
export function meanPercent(rows: ReadonlyArray<{ score: number; problemCount: number }>): number | null {
  const pcts = rows.map((r) => quizPercent(r.score, r.problemCount)).filter((p): p is number => p !== null);
  if (!pcts.length) return null;
  return pcts.reduce((a, p) => a + p, 0) / pcts.length;
}

/**
 * Дэлгэцэнд хувийг БҮХЭЛ хүртэл ДООШ тайрна (79,99 → «79%»): өнгөний хил бүхэл тоо тул бичиг,
 * өнгө хоёр хэзээ ч зөрөхгүй («80%» гэж бичээд улбар шар будах алдаа гарахгүй).
 */
export function formatPercent(pct: number): string {
  return `${Math.floor(pct + 1e-9)}%`;
}

/** Оноог монгол бичлэгээр: 7.5 → «7,5», 8 → «8», 7.25 → «7,25» */
export function formatScore(score: number): string {
  return String(toHundredths(score) / 100).replace(".", ",");
}

export type ParseResult = { ok: true; value: number | null } | { ok: false; error: string };

/**
 * Багшийн бичсэн оноо: хоосон = цэвэрлэх; 0..max, бутархай нь таслал эсвэл цэгээр, 2 хүртэл орон
 * («7,5», «7.5», «7,25»).
 */
export function parseScoreInput(text: string, max: number): ParseResult {
  const t = text.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(t)) return { ok: false, error: "Тоо, бутархай нь 2 хүртэл оронтой (7,5)" };
  const n = Number(t.replace(",", "."));
  if (toHundredths(n) > toHundredths(max)) return { ok: false, error: `0-ээс ${max} хүртэл` };
  return { ok: true, value: toHundredths(n) / 100 };
}

/** Бодлогын тоо: бүхэл 1..QUIZ_MAX_PROBLEMS */
export function parseProblemCount(text: string): ParseResult {
  const t = text.trim();
  if (!/^\d{1,4}$/.test(t)) return { ok: false, error: "Бодлогын тоог бүхэл тоогоор" };
  const n = Number(t);
  if (n < 1 || n > QUIZ_MAX_PROBLEMS) return { ok: false, error: `1-ээс ${QUIZ_MAX_PROBLEMS} хүртэл` };
  return { ok: true, value: n };
}

/**
 * Сурагчийн сарын «Тэмдэглээгүй» даалгаврын тоог шалгалтын оноотой өдрөөр засна: тэмдэглэх ёстой
 * (expected) өдөр Хийсэн/Дутуу/Хийгээгүй тэмдэглэгээгүй ч шалгалтын оноотой бол даалгаврыг шалгасан
 * гэж үзнэ (эзэн 2026-11-08). Хасах өдрийн тоог буцаана.
 */
export function quizCoveredDays(
  expectedDays: ReadonlyArray<string>,
  hwMarkedDays: ReadonlyArray<string>,
  quizDays: ReadonlyArray<string>,
): number {
  const marked = new Set(hwMarkedDays);
  const quiz = new Set(quizDays);
  let n = 0;
  for (const k of new Set(expectedDays)) if (!marked.has(k) && quiz.has(k)) n++;
  return n;
}
