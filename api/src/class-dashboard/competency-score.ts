/**
 * Чадамжийн оноо — v0 (туршилтын). ЦЭВЭР ЛОГИК: I/O-гүй, competency-score.spec.ts.
 *
 * Эзний хүсэлт (2026-10-13): сурагчийн бодлого бодох ЖИНХЭНЭ чадварыг
 * илэрхийлэх, ирц, явц, шалгалтын нарийвчлал, бие даасан бодлогоор өсөж/буурдаг
 * 0–100 оноо. Эзэн алгоритмаа дараа нарийвчилна — тиймээс жин, босго бүгд
 * `COMPETENCY_V0`-д ил тод, оноо бүр «юунаас бүрдсэнээ» (drivers) буцаана.
 *
 * Зарчим:
 * 1. Чадварын дохио (шалгалт эсвэл бие даасан бодлого) ЗААВАЛ байх ёстой.
 *    Зөвхөн ирц/даалгавраар «чадвар» гэж тоо зохиохгүй → `score: null`.
 * 2. Байхгүй оролтын жинг бусад оролтод пропорциональ хуваарилна.
 * 3. «Буудсан» (GUESSED) хариулт зөвд тооцогдохгүй, мөн буудсан хувиар торгоно —
 *    азын оноог жинхэнэ чадамжаас ялгах (STATUS §7.7).
 * 4. Сүүлийн шалгалт хамгийн их жинтэй (хуучин тутам × examRecency).
 */

export type CompetencySelfState =
  | 'SOLVED_CLEAN'
  | 'FIXED_AFTER_ERROR'
  | 'FAILED'
  | 'GUESSED';
export type CompetencyAttendance = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type CompetencyHomework = 'DONE' | 'PARTIAL' | 'NOT_DONE';

export interface CompetencyInput {
  /** Шалгалтын хувь (0–100) — огноотой */
  exams: { at: Date; percent: number }[];
  /** Бие даасан бодлого (шалгалтаас гадуурх оролдлого) */
  practice: {
    at: Date;
    correct: boolean | null;
    selfState: CompetencySelfState | null;
  }[];
  attendance: { at: Date; status: CompetencyAttendance }[];
  homework: { at: Date; status: CompetencyHomework }[];
}

export type DriverKey = 'exam' | 'practice' | 'homework' | 'attendance';

export const COMPETENCY_V0 = {
  version: 'v0',
  /** Үндсэн жин — нийлбэр 1 */
  weights: { exam: 0.5, practice: 0.2, homework: 0.15, attendance: 0.15 },
  /** Ирц, даалгавар, бие даасан бодлогын гулсах цонх */
  windowDays: 56,
  /** Шалгалтыг хамгийн сүүлийн хэдийг авах */
  maxExams: 6,
  /** Өмнөх шалгалт бүрийн жин × энэ */
  examRecency: 0.7,
  /** Бие даасан бодлого тооцогдох доод тоо */
  minPracticeAttempts: 10,
  /** Ирц/даалгавар тооцогдох доод тэмдэглэгээ */
  minMarked: 3,
  /** 100% буудсан үеийн торгууль (оноо) */
  guessPenaltyMax: 15,
  /** Буудсан хувийг тооцох доод өөрийн тэмдэглэгээ */
  minSelfMarked: 5,
  /** Өөрийн тэмдэглэгээний зөвийн жин */
  selfCredit: {
    SOLVED_CLEAN: 1,
    FIXED_AFTER_ERROR: 0.6,
    FAILED: 0,
    GUESSED: 0,
  } as Record<CompetencySelfState, number>,
} as const;

export const DRIVER_LABEL: Record<DriverKey, string> = {
  exam: 'Шалгалтын нарийвчлал',
  practice: 'Бие даасан бодлого',
  homework: 'Гэрийн даалгавар',
  attendance: 'Ирц',
};

export interface CompetencyDriver {
  key: DriverKey;
  label: string;
  /** Тухайн оролтын утга 0–100 */
  value: number;
  /** Хэвийн болгосон жин (0–1) */
  weight: number;
  /** Оноонд оруулсан хувь нэмэр (value × weight) */
  points: number;
  /** Хэдэн бичлэгээс тооцсон */
  samples: number;
}

export type CompetencyLevel = 'Суурь' | 'Дунд' | 'Сайн' | 'Ахисан';

export interface CompetencyResult {
  version: string;
  /** null = «Мэдээлэл хангалтгүй» */
  score: number | null;
  level: CompetencyLevel | null;
  confidence: 'low' | 'medium' | 'high' | null;
  drivers: CompetencyDriver[];
  /** Тооцоонд ороогүй оролтууд (мэдээлэлгүй) */
  missing: DriverKey[];
  guessPenalty: number;
  guessedShare: number | null;
}

const DAY = 86_400_000;
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const round1 = (v: number) => Math.round(v * 10) / 10;

export function levelOf(score: number): CompetencyLevel {
  if (score >= 80) return 'Ахисан';
  if (score >= 60) return 'Сайн';
  if (score >= 40) return 'Дунд';
  return 'Суурь';
}

function inWindow(at: Date, asOf: Date, days: number) {
  const t = at.getTime();
  return t <= asOf.getTime() && t > asOf.getTime() - days * DAY;
}

/** Сүүлийн шалгалтууд, шинэ нь хамгийн их жинтэй. */
export function examAccuracy(
  exams: CompetencyInput['exams'],
  asOf: Date,
): { value: number; samples: number } | null {
  const recent = exams
    .filter((e) => e.at.getTime() <= asOf.getTime() && Number.isFinite(e.percent))
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, COMPETENCY_V0.maxExams);
  if (recent.length === 0) return null;
  let sum = 0;
  let wsum = 0;
  recent.forEach((e, i) => {
    const w = COMPETENCY_V0.examRecency ** i;
    sum += clamp(e.percent) * w;
    wsum += w;
  });
  return { value: sum / wsum, samples: recent.length };
}

/** Бие даасан бодлогын нарийвчлал + буудсан хувь. */
export function practiceAccuracy(
  practice: CompetencyInput['practice'],
  asOf: Date,
): {
  value: number | null;
  samples: number;
  guessedShare: number | null;
} {
  const rows = practice.filter((p) =>
    inWindow(p.at, asOf, COMPETENCY_V0.windowDays),
  );
  let credit = 0;
  let counted = 0;
  let selfMarked = 0;
  let guessed = 0;
  for (const p of rows) {
    if (p.selfState) {
      selfMarked += 1;
      if (p.selfState === 'GUESSED') guessed += 1;
      credit += COMPETENCY_V0.selfCredit[p.selfState];
      counted += 1;
    } else if (p.correct !== null) {
      credit += p.correct ? 1 : 0;
      counted += 1;
    }
  }
  return {
    value:
      counted >= COMPETENCY_V0.minPracticeAttempts
        ? (credit / counted) * 100
        : null,
    samples: counted,
    guessedShare:
      selfMarked >= COMPETENCY_V0.minSelfMarked ? guessed / selfMarked : null,
  };
}

/** Ирц: (ирсэн + хоцорсон) / (тэмдэглэсэн − чөлөөтэй). */
export function attendanceRate(
  rows: CompetencyInput['attendance'],
  asOf: Date,
): { value: number; samples: number } | null {
  let came = 0;
  let total = 0;
  for (const r of rows) {
    if (!inWindow(r.at, asOf, COMPETENCY_V0.windowDays)) continue;
    if (r.status === 'EXCUSED') continue;
    total += 1;
    if (r.status !== 'ABSENT') came += 1;
  }
  if (total < COMPETENCY_V0.minMarked) return null;
  return { value: (came / total) * 100, samples: total };
}

/** Даалгавар: (хийсэн + дутуу × 0.5) / тэмдэглэсэн. */
export function homeworkRate(
  rows: CompetencyInput['homework'],
  asOf: Date,
): { value: number; samples: number } | null {
  let credit = 0;
  let total = 0;
  for (const r of rows) {
    if (!inWindow(r.at, asOf, COMPETENCY_V0.windowDays)) continue;
    total += 1;
    if (r.status === 'DONE') credit += 1;
    else if (r.status === 'PARTIAL') credit += 0.5;
  }
  if (total < COMPETENCY_V0.minMarked) return null;
  return { value: (credit / total) * 100, samples: total };
}

const EMPTY = (
  missing: DriverKey[],
  guessedShare: number | null = null,
): CompetencyResult => ({
  version: COMPETENCY_V0.version,
  score: null,
  level: null,
  confidence: null,
  drivers: [],
  missing,
  guessPenalty: 0,
  guessedShare,
});

export function computeCompetency(
  input: CompetencyInput,
  asOf: Date = new Date(),
): CompetencyResult {
  const exam = examAccuracy(input.exams, asOf);
  const practice = practiceAccuracy(input.practice, asOf);
  const homework = homeworkRate(input.homework, asOf);
  const attendance = attendanceRate(input.attendance, asOf);

  const parts: { key: DriverKey; value: number; samples: number }[] = [];
  if (exam) parts.push({ key: 'exam', ...exam });
  if (practice.value !== null)
    parts.push({ key: 'practice', value: practice.value, samples: practice.samples });
  if (homework) parts.push({ key: 'homework', ...homework });
  if (attendance) parts.push({ key: 'attendance', ...attendance });

  const all: DriverKey[] = ['exam', 'practice', 'homework', 'attendance'];
  const missing = all.filter((k) => !parts.some((p) => p.key === k));
  // Чадварын дохиогүй бол тоо зохиохгүй
  if (!exam && practice.value === null)
    return EMPTY(missing, practice.guessedShare);

  const wsum = parts.reduce((s, p) => s + COMPETENCY_V0.weights[p.key], 0);
  const drivers: CompetencyDriver[] = parts.map((p) => {
    const weight = COMPETENCY_V0.weights[p.key] / wsum;
    return {
      key: p.key,
      label: DRIVER_LABEL[p.key],
      value: Math.round(p.value),
      weight: Math.round(weight * 100) / 100,
      points: round1(p.value * weight),
      samples: p.samples,
    };
  });
  const raw = parts.reduce(
    (s, p) => s + p.value * (COMPETENCY_V0.weights[p.key] / wsum),
    0,
  );
  const guessPenalty =
    practice.guessedShare === null
      ? 0
      : round1(practice.guessedShare * COMPETENCY_V0.guessPenaltyMax);
  const score = Math.round(clamp(raw - guessPenalty));

  const examSamples = exam?.samples ?? 0;
  const confidence: CompetencyResult['confidence'] =
    parts.length >= 3 && examSamples >= 3
      ? 'high'
      : parts.length === 1 || (examSamples < 2 && practice.samples < 20)
        ? 'low'
        : 'medium';

  return {
    version: COMPETENCY_V0.version,
    score,
    level: levelOf(score),
    confidence,
    drivers: drivers.sort((a, b) => b.weight - a.weight),
    missing,
    guessPenalty,
    guessedShare:
      practice.guessedShare === null
        ? null
        : Math.round(practice.guessedShare * 100) / 100,
  };
}

/**
 * Сүүлийн `weeks` долоо хоногийн төгсгөл бүрт тэр үеийн өгөгдлөөр л тооцсон
 * оноо (хуучнаас шинэ рүү). Мэдээлэл хангалтгүй долоо хоногийг алгасна.
 */
export function competencyTrend(
  input: CompetencyInput,
  asOf: Date = new Date(),
  weeks = 8,
): { at: string; value: number }[] {
  const out: { at: string; value: number }[] = [];
  for (let k = weeks - 1; k >= 0; k -= 1) {
    const at = new Date(asOf.getTime() - k * 7 * DAY);
    const r = computeCompetency(input, at);
    if (r.score !== null)
      out.push({ at: at.toISOString().slice(0, 10), value: r.score });
  }
  return out;
}

/** Хамгийн сүүлийн оноо ба ~4 долоо хоногийн өмнөхийн зөрүү (null = харьцуулах юм алга). */
export function trendChange(trend: { value: number }[]): number | null {
  if (trend.length < 2) return null;
  const last = trend[trend.length - 1].value;
  const base = trend[Math.max(0, trend.length - 5)].value;
  return last - base;
}
