"use client";

import { ChevronRight, School, TriangleAlert, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import MathText from "@/components/MathText";
import { Badge } from "@/components/ui/kit/badge";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import ClassStudentDialog from "./ClassStudentDialog";
import { barClass, toneOf, Trend } from "./classViz";

/* ============================================================================
 * «Анги» таб (docs/v2/ANGI-TAB-TOLOVLOGOO.md): анги сонгоод — дундаж, ирц, шалгалт,
 * анхаарах сурагч (том тоо) · сурагчид (дүн, явц, ирц — дарахад дэлгэрэнгүй) ·
 * шалгалтууд · сэдвээр алдсан оноо · олон хүн алдсан бодлого. Тайлбар бага.
 * ========================================================================== */

interface Classroom {
  id: string;
  name: string;
}

export type StudentFlag = "LOW_SCORE" | "ABSENCES" | "MISSED_EXAMS" | "DECLINING";

interface Overview {
  classroom: { id: string; name: string };
  windowDays: number;
  summary: { students: number; exams: number; avg: number | null; attendanceRate: number | null; flagged: number };
  exams: {
    testId: string;
    title: string;
    assignedAt: string;
    students: number;
    taken: number;
    absent: number;
    pending: number;
    avg: number | null;
  }[];
  students: {
    id: string;
    firstName: string;
    lastName: string;
    taken: number;
    missed: number;
    avg: number | null;
    last: number | null;
    trend: number[];
    attendance: { present: number; late: number; absent: number; excused: number; rate: number | null };
    homework: { done: number; partial: number; notDone: number };
    flags: StudentFlag[];
  }[];
  topics: { key: string; name: string; earned: number; max: number; percent: number; lost: number }[];
  problems: {
    testId: string;
    testTitle: string;
    label: string;
    statement: string | null;
    marked: number;
    wrong: number;
    percentWrong: number;
  }[];
}

export const FLAG_LABEL: Record<StudentFlag, string> = {
  LOW_SCORE: "Дүн сул",
  ABSENCES: "Тасалсан",
  MISSED_EXAMS: "Шалгалт өгөөгүй",
  DECLINING: "Дүн буурсан",
};

const STORAGE_KEY = "pi_class_board_class";
type Sort = "name" | "avg" | "attendance";

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "neutral" }) {
  return (
    <div className="chunky p-4">
      <p className="text-sm text-ink-dim">{label}</p>
      <p className={cn("font-display text-3xl font-bold tabular-nums", tone === "danger" ? "text-error" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);

export default function ClassBoard() {
  const [classes, setClasses] = useState<Classroom[] | null>(null);
  const [classId, setClassId] = useState("");
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api<Classroom[]>("/classrooms")
      .then((rows) => {
        if (!alive) return;
        const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, "mn"));
        setClasses(sorted);
        let saved = "";
        try {
          saved = localStorage.getItem(STORAGE_KEY) ?? "";
        } catch {
          // хувийн цонх — сануулахгүй
        }
        setClassId(sorted.some((c) => c.id === saved) ? saved : (sorted[0]?.id ?? ""));
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Ангиудыг ачаалж чадсангүй"));
    return () => {
      alive = false;
    };
  }, []);

  const load = useCallback(() => {
    if (!classId) return;
    setLoading(true);
    setError("");
    api<Overview>(`/exams/classes/${encodeURIComponent(classId)}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Ачаалж чадсангүй"))
      .finally(() => setLoading(false));
  }, [classId]);

  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(() => alive && load());
    return () => {
      alive = false;
    };
  }, [load]);

  function choose(id: string) {
    setClassId(id);
    setData(null);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // алгасна
    }
  }

  const students = useMemo(() => {
    const list = [...(data?.students ?? [])];
    if (sort === "avg") list.sort((a, b) => (a.avg ?? 101) - (b.avg ?? 101));
    else if (sort === "attendance")
      list.sort((a, b) => (a.attendance.rate ?? 101) - (b.attendance.rate ?? 101));
    else list.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "mn"));
    return list;
  }, [data, sort]);

  if (classes === null && !error) return <LoadingState rows={3} label="Ангиудыг ачаалж байна" />;
  if (classes?.length === 0) return <EmptyState icon={School} title="Танд анги алга" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {classes && classes.length <= 8 ? (
          classes.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => choose(c.id)}
              aria-pressed={classId === c.id}
              className={cn(
                "min-h-11 rounded-xl border px-4 text-sm font-bold transition",
                classId === c.id
                  ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                  : "border-line text-ink-dim hover:border-brand",
              )}
            >
              {c.name}
            </button>
          ))
        ) : (
          <select
            value={classId}
            onChange={(e) => choose(e.target.value)}
            aria-label="Анги"
            className="min-h-11 rounded-xl border border-line bg-bg px-3 text-base text-ink"
          >
            {classes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !data && <LoadingState rows={5} label="Ангийн мэдээллийг ачаалж байна" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Дундаж дүн" value={pct(data.summary.avg)} />
            <Stat label={`Ирц, ${data.windowDays} хоног`} value={pct(data.summary.attendanceRate)} />
            <Stat label="Шалгалт" value={String(data.summary.exams)} />
            <Stat
              label="Анхаарах сурагч"
              value={`${data.summary.flagged}/${data.summary.students}`}
              tone={data.summary.flagged > 0 ? "danger" : "neutral"}
            />
          </div>

          <section className="chunky p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-extrabold text-ink">Сурагчид</h2>
              <div className="ml-auto flex gap-1" role="group" aria-label="Эрэмбэлэх">
                {(
                  [
                    ["name", "Нэрээр"],
                    ["avg", "Дүнгээр"],
                    ["attendance", "Ирцээр"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSort(key)}
                    aria-pressed={sort === key}
                    className={cn(
                      "min-h-9 rounded-lg px-3 text-sm font-semibold transition",
                      sort === key ? "bg-brand-bright/15 text-brand-soft" : "text-ink-dim hover:bg-ink/5",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {students.length === 0 ? (
              <p className="text-sm text-ink-dim">Энэ ангид сурагч алга.</p>
            ) : (
              <ul className="divide-y divide-line">
                {students.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setStudentId(s.id)}
                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 py-3 text-left transition hover:bg-ink/5 sm:flex-nowrap"
                    >
                      <span className="flex min-w-0 flex-1 items-center gap-2">
                        <UserRound className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink">
                            {s.lastName} {s.firstName}
                          </span>
                          {s.flags.length > 0 && (
                            <span className="mt-0.5 flex flex-wrap gap-1">
                              {s.flags.map((f) => (
                                <Badge key={f} tone="danger">
                                  {FLAG_LABEL[f]}
                                </Badge>
                              ))}
                            </span>
                          )}
                        </span>
                      </span>
                      <Trend values={s.trend} />
                      <span className="w-20 text-right">
                        <span className="block text-xs text-ink-dim">Дундаж</span>
                        <span className={cn("font-display text-xl font-bold tabular-nums", s.avg !== null && s.avg < 40 ? "text-error" : "text-ink")}>
                          {pct(s.avg)}
                        </span>
                      </span>
                      <span className="w-20 text-right">
                        <span className="block text-xs text-ink-dim">Ирц</span>
                        <span className="font-display text-xl font-bold tabular-nums text-ink">
                          {pct(s.attendance.rate)}
                        </span>
                      </span>
                      <span className="w-24 text-right text-sm text-ink-dim">
                        {s.taken} шалгалт
                        {s.homework.notDone > 0 && (
                          <span className="block text-error">{s.homework.notDone} даалгавар хийгээгүй</span>
                        )}
                      </span>
                      <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-dim sm:block" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="chunky p-4">
              <h2 className="mb-3 text-lg font-extrabold text-ink">Шалгалтууд</h2>
              {data.exams.length === 0 ? (
                <p className="text-sm text-ink-dim">Энэ ангид шалгалт оноогоогүй.</p>
              ) : (
                <ul className="space-y-3">
                  {data.exams.map((e) => (
                    <li key={e.testId}>
                      <div className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                          <MetaTitle>{e.title}</MetaTitle>
                        </span>
                        <span className="font-display text-lg font-bold tabular-nums text-ink">{pct(e.avg)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/40">
                        <div className={cn("h-full rounded-full", barClass[toneOf(e.avg)])} style={{ width: `${e.avg ?? 0}%` }} />
                      </div>
                      <Meta
                        className="mt-1 text-xs text-ink-dim"
                        items={[
                          new Date(e.assignedAt).toLocaleDateString("mn-MN"),
                          `${e.taken}/${e.students} өгсөн`,
                          e.absent > 0 && `${e.absent} ирээгүй`,
                          e.pending > 0 && `${e.pending} хүлээгдэж байна`,
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="chunky p-4">
              <h2 className="mb-1 text-lg font-extrabold text-ink">Сэдвээр алдсан оноо</h2>
              <p className="mb-3 text-xs text-ink-dim">Бүх шалгалт, бүх сурагчийн нийлбэр — сул нь эхэнд</p>
              {data.topics.length === 0 ? (
                <p className="text-sm text-ink-dim">Бодлого бүрийн дүн хараахан алга.</p>
              ) : (
                <ul className="space-y-3">
                  {data.topics.slice(0, 10).map((t) => (
                    <li key={t.key}>
                      <div className="flex items-baseline gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{t.name}</span>
                        <span className="text-ink-dim">{t.lost} оноо алдсан</span>
                        <span className="w-12 text-right font-bold tabular-nums text-ink">{t.percent}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line/40">
                        <div className={cn("h-full rounded-full", barClass[toneOf(t.percent)])} style={{ width: `${t.percent}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="chunky p-4">
            <h2 className="mb-1 text-lg font-extrabold text-ink">Олон хүн алдсан бодлого</h2>
            <p className="mb-3 text-xs text-ink-dim">Хэдэн хүн алдсан (буруу эсвэл хоосон)</p>
            {data.problems.length === 0 ? (
              <p className="text-sm text-ink-dim">Бодлого бүрийн дүн хараахан алга.</p>
            ) : (
              <ul className="space-y-2">
                {data.problems.map((p) => (
                  <li key={`${p.testId}-${p.label}`} className="flex items-start gap-3 rounded-xl border border-line p-3">
                    <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-error/10 px-2 font-bold text-error">
                      {p.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-ink-dim">
                        <MetaTitle>{p.testTitle}</MetaTitle>
                      </span>
                      {p.statement && (
                        <span className="line-clamp-2 text-sm text-ink">
                          <MathText>{p.statement}</MathText>
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-xl font-bold tabular-nums text-error">
                        {p.wrong}/{p.marked}
                      </span>
                      <span className="text-xs text-ink-dim">алдсан</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.summary.flagged > 0 && (
            <p className="flex items-center gap-2 text-xs text-ink-dim">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
              Анхаарах: дундаж 40%-аас доош, 30 хоногт 2+ тасалсан, 2+ шалгалт өгөөгүй эсвэл дүн буурсан.
            </p>
          )}
        </>
      )}

      {studentId && data && (
        <ClassStudentDialog
          classId={data.classroom.id}
          studentId={studentId}
          onClose={() => setStudentId(null)}
        />
      )}
    </div>
  );
}
