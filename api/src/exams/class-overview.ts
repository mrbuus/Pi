import type { ExamItem, ItemStatus } from '../tests/exam-items';
import { mean, percentOf, type TopicRef } from './exam-analytics';

/**
 * «Анги» таб (docs/v2/ANGI-TAB-TOLOVLOGOO.md) — ангийн ОЛОН шалгалтыг нэгтгэсэн
 * цэвэр тооцоо (ӨС-гүй, class-overview.spec.ts): шалгалт бүрийн дундаж, сурагч
 * бүрийн дүн/явц/ирц/даалгавар, сэдвээр алдсан оноо, олон хүн алдсан бодлого.
 */

export interface ClassExamInput {
  testId: string;
  title: string;
  type: string;
  assignedAt: Date;
  items: Pick<ExamItem, 'key' | 'label' | 'points' | 'problemId' | 'order'>[];
  topicsOf: (problemId: string) => TopicRef[];
  /** Бодлогын текст (олон хүн алдсан жагсаалтад) */
  statementOf?: (problemId: string) => string | null;
  /** Ангийн сурагч бүр (дүнгүй бол result=null) */
  students: Map<
    string,
    {
      result: { total: number; max: number } | null;
      absent: boolean;
      statuses: ReadonlyMap<string, ItemStatus> | null;
    }
  >;
}

export interface RosterRow {
  id: string;
  firstName: string;
  lastName: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type HomeworkStatus = 'DONE' | 'PARTIAL' | 'NOT_DONE';

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
  /** Ирсэн (хоцорсон ч ирсэн) / тэмдэглэсэн өдөр, % — тэмдэглэгээгүй бол null */
  rate: number | null;
}

export type StudentFlag =
  | 'LOW_SCORE'
  | 'ABSENCES'
  | 'MISSED_EXAMS'
  | 'DECLINING';

export const FLAG_RULES = {
  lowScore: 40,
  absences: 2,
  missedExams: 2,
  /** Сүүлийн дүн өмнөхөөсөө ийм хувиар буурвал */
  decline: 10,
} as const;

const round = (v: number | null) => (v === null ? null : Math.round(v));

export function attendanceCounts(
  statuses: AttendanceStatus[],
): AttendanceCounts {
  const c = { present: 0, late: 0, absent: 0, excused: 0 };
  for (const s of statuses) {
    if (s === 'PRESENT') c.present += 1;
    else if (s === 'LATE') c.late += 1;
    else if (s === 'ABSENT') c.absent += 1;
    else c.excused += 1;
  }
  const marked = c.present + c.late + c.absent + c.excused;
  return {
    ...c,
    rate: marked ? Math.round(((c.present + c.late) / marked) * 100) : null,
  };
}

export function homeworkCounts(statuses: (HomeworkStatus | null)[]) {
  const c = { done: 0, partial: 0, notDone: 0 };
  for (const s of statuses) {
    if (s === 'DONE') c.done += 1;
    else if (s === 'PARTIAL') c.partial += 1;
    else if (s === 'NOT_DONE') c.notDone += 1;
  }
  return c;
}

/** Нэг сурагчийн нэг шалгалтын хувь (дүнгүй бол null) */
function percentFor(exam: ClassExamInput, studentId: string): number | null {
  const s = exam.students.get(studentId);
  return s?.result ? percentOf(s.result.total, s.result.max) : null;
}

/** Сэдвээр: Σавсан / Σболомжит (зүйлийн оноогоор), алдсан = болом − авсан. */
function addTopics(
  acc: Map<string, { key: string; name: string; earned: number; max: number }>,
  exam: ClassExamInput,
  statuses: ReadonlyMap<string, ItemStatus>,
) {
  for (const item of exam.items) {
    const status = statuses.get(item.key);
    if (!status) continue;
    for (const t of exam.topicsOf(item.problemId)) {
      const row = acc.get(t.key) ?? {
        key: t.key,
        name: t.name,
        earned: 0,
        max: 0,
      };
      row.max += item.points;
      if (status === 'CORRECT') row.earned += item.points;
      acc.set(t.key, row);
    }
  }
}

function topicList(
  acc: Map<string, { key: string; name: string; earned: number; max: number }>,
) {
  return [...acc.values()]
    .filter((t) => t.max > 0)
    .map((t) => ({
      ...t,
      percent: Math.round((t.earned / t.max) * 100),
      lost: t.max - t.earned,
    }))
    .sort(
      (a, b) =>
        a.percent - b.percent ||
        b.lost - a.lost ||
        a.name.localeCompare(b.name),
    );
}

export function studentFlags(input: {
  avg: number | null;
  absences: number;
  missed: number;
  /** Хуучнаас шинэ рүү */
  trend: number[];
}): StudentFlag[] {
  const flags: StudentFlag[] = [];
  if (input.avg !== null && input.avg < FLAG_RULES.lowScore)
    flags.push('LOW_SCORE');
  if (input.absences >= FLAG_RULES.absences) flags.push('ABSENCES');
  if (input.missed >= FLAG_RULES.missedExams) flags.push('MISSED_EXAMS');
  const [prev, last] = input.trend.slice(-2);
  if (input.trend.length >= 2 && last < prev - FLAG_RULES.decline)
    flags.push('DECLINING');
  return flags;
}

export function classOverview(input: {
  roster: RosterRow[];
  exams: ClassExamInput[];
  attendance: { studentId: string; status: AttendanceStatus }[];
  homework: { studentId: string; status: HomeworkStatus | null }[];
}) {
  // Хуучнаас шинэ рүү (явцын график), харуулахдаа шинэ нь эхэнд
  const chronological = [...input.exams].sort(
    (a, b) => a.assignedAt.getTime() - b.assignedAt.getTime(),
  );
  const rosterIds = new Set(input.roster.map((r) => r.id));

  const exams = chronological
    .map((exam) => {
      const percents: number[] = [];
      let absent = 0;
      for (const id of rosterIds) {
        const s = exam.students.get(id);
        if (s?.absent) absent += 1;
        const p = percentFor(exam, id);
        if (p !== null) percents.push(p);
      }
      return {
        testId: exam.testId,
        title: exam.title,
        type: exam.type,
        assignedAt: exam.assignedAt.toISOString(),
        students: rosterIds.size,
        taken: percents.length,
        absent,
        pending: Math.max(0, rosterIds.size - percents.length - absent),
        avg: round(mean(percents)),
      };
    })
    .reverse();

  const topicAcc = new Map<
    string,
    { key: string; name: string; earned: number; max: number }
  >();
  const problemRows: {
    testId: string;
    testTitle: string;
    label: string;
    order: number;
    problemId: string;
    statement: string | null;
    marked: number;
    wrong: number;
  }[] = [];
  for (const exam of chronological) {
    const counts = new Map(
      exam.items.map((i) => [i.key, { marked: 0, wrong: 0 }]),
    );
    for (const id of rosterIds) {
      const statuses = exam.students.get(id)?.statuses;
      if (!statuses) continue;
      addTopics(topicAcc, exam, statuses);
      for (const item of exam.items) {
        const st = statuses.get(item.key);
        if (!st) continue;
        const c = counts.get(item.key)!;
        c.marked += 1;
        if (st !== 'CORRECT') c.wrong += 1;
      }
    }
    for (const item of exam.items) {
      const c = counts.get(item.key)!;
      if (c.marked === 0) continue;
      problemRows.push({
        testId: exam.testId,
        testTitle: exam.title,
        label: item.label,
        order: item.order,
        problemId: item.problemId,
        statement: exam.statementOf?.(item.problemId)?.slice(0, 240) ?? null,
        marked: c.marked,
        wrong: c.wrong,
      });
    }
  }
  const problems = problemRows
    .filter((p) => p.wrong > 0)
    .sort(
      (a, b) => b.wrong / b.marked - a.wrong / a.marked || b.wrong - a.wrong,
    )
    .slice(0, 10)
    .map((p) => ({
      ...p,
      percentWrong: Math.round((p.wrong / p.marked) * 100),
    }));

  const attendanceBy = new Map<string, AttendanceStatus[]>();
  for (const a of input.attendance) {
    const list = attendanceBy.get(a.studentId) ?? [];
    list.push(a.status);
    attendanceBy.set(a.studentId, list);
  }
  const homeworkBy = new Map<string, (HomeworkStatus | null)[]>();
  for (const h of input.homework) {
    const list = homeworkBy.get(h.studentId) ?? [];
    list.push(h.status);
    homeworkBy.set(h.studentId, list);
  }

  const students = input.roster.map((r) => {
    const trend: number[] = [];
    let missed = 0;
    for (const exam of chronological) {
      const p = percentFor(exam, r.id);
      if (p !== null) trend.push(Math.round(p));
      else if (!exam.students.get(r.id)?.absent) missed += 1;
    }
    const attendance = attendanceCounts(attendanceBy.get(r.id) ?? []);
    const homework = homeworkCounts(homeworkBy.get(r.id) ?? []);
    const avg = round(mean(trend));
    return {
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      taken: trend.length,
      missed,
      avg,
      last: trend.length ? trend[trend.length - 1] : null,
      trend: trend.slice(-6),
      attendance,
      homework,
      flags: studentFlags({ avg, absences: attendance.absent, missed, trend }),
    };
  });

  const allPercents = students
    .map((s) => s.avg)
    .filter((v): v is number => v !== null);
  const rates = students
    .map((s) => s.attendance.rate)
    .filter((v): v is number => v !== null);
  return {
    summary: {
      students: input.roster.length,
      exams: exams.length,
      avg: round(mean(allPercents)),
      attendanceRate: round(mean(rates)),
      flagged: students.filter((s) => s.flags.length > 0).length,
    },
    exams,
    students,
    topics: topicList(topicAcc),
    problems,
  };
}

/** Нэг сурагч: шалгалт бүр (ангийн дундажтай), сул сэдэв. */
export function studentInClass(
  studentId: string,
  exams: ClassExamInput[],
  classAvgs: Map<string, number | null>,
) {
  const chronological = [...exams].sort(
    (a, b) => a.assignedAt.getTime() - b.assignedAt.getTime(),
  );
  const topicAcc = new Map<
    string,
    { key: string; name: string; earned: number; max: number }
  >();
  const rows = chronological.map((exam) => {
    const s = exam.students.get(studentId);
    const percent = percentFor(exam, studentId);
    let wrong = 0;
    if (s?.statuses) {
      addTopics(topicAcc, exam, s.statuses);
      for (const item of exam.items) {
        const st = s.statuses.get(item.key);
        if (st && st !== 'CORRECT') wrong += 1;
      }
    }
    return {
      testId: exam.testId,
      title: exam.title,
      assignedAt: exam.assignedAt.toISOString(),
      status: percent !== null ? 'DONE' : s?.absent ? 'ABSENT' : 'PENDING',
      percent: round(percent),
      total: s?.result?.total ?? null,
      max: s?.result?.max ?? null,
      wrong,
      classAvg: classAvgs.get(exam.testId) ?? null,
    };
  });
  return { exams: rows.reverse(), topics: topicList(topicAcc) };
}
