import {
  CLASSES,
  DEFAULT_CRITERIA,
  addDays,
  attendanceRate,
  classById,
  classExams,
  dayRecord,
  emptyTally,
  homeworkRate,
  lessonDateKeys,
  lessonOn,
  paymentOf,
  riskOf,
  studentTally,
  testResult,
  todayKey,
  type DayRecord,
  type DemoClass,
  type DemoLesson,
  type DemoStudent,
  type DemoTest,
  type ExamResult,
  type PaymentSummary,
  type RiskFlag,
  type Tally,
  type TestResult,
} from "../world";

/**
 * Ангиуд ба Сурагчид хэсгийн НЭГТГЭЛ — world.ts-ийн функцүүдээс (ирц, даалгавар,
 * шалгуур, төлбөр) нэг л удаа тооцоод кэшлэнэ. Одоогийн цагаас хамаардаг тул
 * ЗӨВХӨН хөтөч дээр (ClientOnly дотор) дуудна.
 */

/** Ирц, даалгаврын нэгтгэл харах хугацаа = «асуудалтай» шалгуурын хугацаа */
export const WINDOW_DAYS = DEFAULT_CRITERIA.windowDays;

export function windowRange(): { from: string; to: string } {
  const to = todayKey();
  return { from: addDays(to, -WINDOW_DAYS), to };
}

export function clsOf(student: DemoStudent): DemoClass {
  return classById(student.classId) ?? CLASSES[0];
}

const avg = (nums: number[]): number | null => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null);

/* ───────────── Кэш (өдөр солигдвол цэвэрлэнэ) ───────────── */

let cacheDay = "";
const studentCache = new Map<string, StudentStat>();
const statCache = new Map<string, ClassStat>();
const detailCache = new Map<string, ClassDetail>();

function fresh(): void {
  const day = todayKey();
  if (day !== cacheDay) {
    cacheDay = day;
    studentCache.clear();
    statCache.clear();
    detailCache.clear();
  }
}

/* ───────────── Сурагч ───────────── */

export interface StudentStat {
  student: DemoStudent;
  cls: DemoClass;
  /** Сүүлийн 30 хоногийн нэгтгэл */
  tally: Tally;
  att: number | null;
  hw: number | null;
  flags: RiskFlag[];
  pay: PaymentSummary;
}

export function studentStat(student: DemoStudent): StudentStat {
  fresh();
  const hit = studentCache.get(student.id);
  if (hit) return hit;
  const cls = clsOf(student);
  const { from, to } = windowRange();
  const tally = studentTally(cls, student, from, to);
  const stat: StudentStat = {
    student,
    cls,
    tally,
    att: attendanceRate(tally),
    hw: homeworkRate(tally),
    flags: riskOf(cls, student),
    pay: paymentOf(student),
  };
  studentCache.set(student.id, stat);
  return stat;
}

/* ───────────── Онлайн тест ───────────── */

export function onlinePct(r: TestResult): number {
  const n = r.problems.length;
  return n ? Math.round((r.correct / n) * 100) : 0;
}

export interface OnlineRow {
  dateKey: string;
  test: DemoTest;
  result: TestResult;
  pct: number;
}

/** Сурагчийн онлайнаар бодсон гэрийн даалгаврын тестүүд [from, to] */
export function onlineRows(cls: DemoClass, student: DemoStudent, from: string, to: string): OnlineRow[] {
  const out: OnlineRow[] = [];
  for (const k of lessonDateKeys(cls, from < student.joinedOn ? student.joinedOn : from, to)) {
    const lesson = lessonOn(cls, k);
    if (!lesson || lesson.status === "upcoming" || !lesson.homework) continue;
    const result = testResult(student, lesson.homework);
    if (result) out.push({ dateKey: k, test: lesson.homework, result, pct: onlinePct(result) });
  }
  return out;
}

/* ───────────── Даалгаврын түүх (сурагчийн хуудас) ───────────── */

export interface LessonRow {
  dateKey: string;
  lesson: DemoLesson;
  test: DemoTest;
  rec: DayRecord;
  result: TestResult | null;
}

/** Шалгах гэрийн даалгавартай өнгөрсөн хичээлүүд — шинэ нь эхэнд */
export function homeworkHistory(cls: DemoClass, student: DemoStudent): LessonRow[] {
  const out: LessonRow[] = [];
  const first = student.joinedOn;
  for (const k of lessonDateKeys(cls, first, todayKey())) {
    const lesson = lessonOn(cls, k);
    if (!lesson || lesson.status === "upcoming" || !lesson.homework) continue;
    out.push({ dateKey: k, lesson, test: lesson.homework, rec: dayRecord(cls, k, student), result: testResult(student, lesson.homework) });
  }
  return out.reverse();
}

/* ───────────── Анги ───────────── */

export interface ClassStat {
  cls: DemoClass;
  rows: StudentStat[];
  tally: Tally;
  att: number | null;
  hw: number | null;
  /** Шалгуур хангаагүй сурагчийн тоо */
  risk: number;
  /** Төлбөр дутуу сурагчийн тоо */
  unpaid: number;
  /** Дутуу төлбөрийн нийлбэр */
  outstanding: number;
}

export interface RankRow {
  stat: StudentStat;
  online: number | null;
  exam: number | null;
  total: number | null;
  rank: number;
}

export interface ClassDetail extends ClassStat {
  online: number | null;
  exams: ExamResult[];
  rank: RankRow[];
}

/** Нийлбэр оноо = ирц 30% + даалгавар 30% + онлайн тест 20% + шалгалт 20% (байхгүйг нь хасаж жинг дахин хуваана) */
export const SCORE_WEIGHTS = { att: 0.3, hw: 0.3, online: 0.2, exam: 0.2 } as const;

export function combine(att: number | null, hw: number | null, online: number | null, exam: number | null): number | null {
  const parts: Array<[number | null, number]> = [
    [att, SCORE_WEIGHTS.att],
    [hw, SCORE_WEIGHTS.hw],
    [online, SCORE_WEIGHTS.online],
    [exam, SCORE_WEIGHTS.exam],
  ];
  let sum = 0;
  let weight = 0;
  for (const [v, w] of parts) {
    if (v === null) continue;
    sum += v * w;
    weight += w;
  }
  return weight ? Math.round(sum / weight) : null;
}

/** Ангийн нэгтгэл (ирц, даалгавар, асуудалтай, төлбөр) — жагсаалт ба хяналтын самбарт нийтлэг */
export function classStat(cls: DemoClass): ClassStat {
  fresh();
  const hit = statCache.get(cls.id);
  if (hit) return hit;
  const rows = cls.students.map(studentStat);
  const tally = emptyTally();
  for (const r of rows) {
    for (const key of Object.keys(tally) as Array<keyof Tally>) tally[key] += r.tally[key];
  }
  const stat: ClassStat = {
    cls,
    rows,
    tally,
    att: attendanceRate(tally),
    hw: homeworkRate(tally),
    risk: rows.filter((r) => r.flags.length > 0).length,
    unpaid: rows.filter((r) => r.pay.outstanding > 0).length,
    outstanding: rows.reduce((sum, r) => sum + r.pay.outstanding, 0),
  };
  statCache.set(cls.id, stat);
  return stat;
}

/** Ангийн хяналтын самбар: нэгтгэл + онлайн тестийн дундаж + шалгалт + эрэмбэ */
export function classDetail(cls: DemoClass): ClassDetail {
  fresh();
  const hit = detailCache.get(cls.id);
  if (hit) return hit;

  const base = classStat(cls);
  const { from, to } = windowRange();
  const exams = classExams(cls);
  const pooled: number[] = [];
  const ranked = base.rows.map((stat) => {
    const online = onlineRows(cls, stat.student, from, to).map((o) => o.pct);
    pooled.push(...online);
    const onlineAvg = avg(online);
    const own = exams.map((e) => e.scores[stat.student.id]).filter((v): v is number => typeof v === "number");
    const exam = avg(own);
    return { stat, online: onlineAvg, exam, total: combine(stat.att, stat.hw, onlineAvg, exam) };
  });
  const rank: RankRow[] = ranked
    .map((r) => ({ ...r, rank: 1 + ranked.filter((o) => (o.total ?? -1) > (r.total ?? -1)).length }))
    .sort((a, b) => a.rank - b.rank || a.stat.student.index - b.stat.student.index);

  const detail: ClassDetail = { ...base, online: avg(pooled), exams, rank };
  detailCache.set(cls.id, detail);
  return detail;
}
