/**
 * Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08) — цэвэр тооцоо, I/O-гүй.
 * = api/src/homework-quiz/quiz-score.ts (api/src/homework-quiz/quiz-score.spec.ts хоёуланг нь
 * ижил эсэхийг шалгана). Энэ файлд `@/` импорт БҮҮ нэм — api-ийн jest шууд уншдаг.
 *
 * Өнгөний муж (эзэн): 0 <= улаан < 50 <= улбар шар < 80 <= ногоон <= 100.
 * 49,99% улаан, 50% улбар шар, 79,99% улбар шар, 80% ногоон. Хувийг хөвөгч тоогоор бус,
 * бүхэл тоон тэнцэтгэл бишээр харьцуулна (score/count*100 < 50 <=> 2*score < count).
 */

/** marks.tsx-ийн Tone-той ижил нэр: улаан = error, улбар шар = warning («Хоцорсон», «Дутуу»), ногоон = success */
export type QuizTone = "error" | "warning" | "success";

/** Нэг шалгалтын бодлогын дээд тоо */
export const QUIZ_MAX_PROBLEMS = 200;

/** Оноо → өнгө. Оноогүй (null) эсвэл буруу бодлогын тоо → null (өнгөгүй) */
export function quizTone(score: number | null | undefined, problemCount: number): QuizTone | null {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  if (!Number.isFinite(problemCount) || problemCount <= 0) return null;
  if (2 * score < problemCount) return "error"; // < 50%
  if (5 * score < 4 * problemCount) return "warning"; // < 80%
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
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  if (!Number.isFinite(problemCount) || problemCount <= 0) return null;
  return (score * 100) / problemCount;
}

/**
 * Ангийн дундаж: ЗӨВХӨН оноо оруулсан сурагчдаар (хоосон нь тоонд орохгүй). Бүгд ижил бодлогын
 * тоотой тул дундаж хувь = Σоноо·100 / (n·тоо); өнгийг бүхэл тоогоор (quizTone(Σ, n·тоо)).
 */
export function quizAverage(
  scores: ReadonlyArray<number | null | undefined>,
  problemCount: number,
): { pct: number; tone: QuizTone; count: number } | null {
  const list = scores.filter((s): s is number => s !== null && s !== undefined && Number.isFinite(s));
  if (!list.length || !Number.isFinite(problemCount) || problemCount <= 0) return null;
  const sum = list.reduce((a, s) => a + s, 0);
  const total = list.length * problemCount;
  return { pct: (sum * 100) / total, tone: quizTone(sum, total)!, count: list.length };
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

export type ParseResult = { ok: true; value: number | null } | { ok: false; error: string };

/** Багшийн бичсэн оноо: хоосон = цэвэрлэх; зөвхөн бүхэл тоо 0..max (хагас оноо үгүй — эзэн «зөвхөн тоо») */
export function parseScoreInput(text: string, max: number): ParseResult {
  const t = text.trim();
  if (t === "") return { ok: true, value: null };
  if (!/^\d{1,4}$/.test(t)) return { ok: false, error: "Зөвхөн бүхэл тоо" };
  const n = Number(t);
  if (n > max) return { ok: false, error: `0-ээс ${max} хүртэл` };
  return { ok: true, value: n };
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
