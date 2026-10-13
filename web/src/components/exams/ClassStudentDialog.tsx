"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/kit/badge";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { toneOf, Trend } from "./classViz";
import ExamDialog from "./ExamDialog";

interface StudentDetail {
  student: { id: string; firstName: string; lastName: string };
  windowDays: number;
  exams: {
    testId: string;
    title: string;
    assignedAt: string;
    status: "DONE" | "ABSENT" | "PENDING";
    percent: number | null;
    total: number | null;
    max: number | null;
    wrong: number;
    classAvg: number | null;
  }[];
  topics: { key: string; name: string; percent: number; lost: number }[];
  attendance: {
    present: number;
    late: number;
    absent: number;
    excused: number;
    rate: number | null;
    recent: { date: string; status: string; note: string | null }[];
  };
  homework: { done: number; partial: number; notDone: number };
}

const STATUS_LABEL: Record<string, string> = { ABSENT: "Тасалсан", LATE: "Хоцорсон", EXCUSED: "Чөлөөтэй" };

/** «Анги» табаас нэг сурагч: шалгалт бүр (ангийн дундажтай), сул сэдэв, ирц, даалгавар. */
export default function ClassStudentDialog({
  classId,
  studentId,
  onClose,
}: {
  classId: string;
  studentId: string;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("Сурагч");
  return (
    <ExamDialog
      open
      onOpenChange={(o) => !o && onClose()}
      wide
      title={title}
      footer={
        <Link
          href={`/app/students/${encodeURIComponent(studentId)}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-brand hover:underline"
        >
          Бүтэн хуудас <ExternalLink className="h-4 w-4" aria-hidden />
        </Link>
      }
    >
      <ClassStudentDetail
        classId={classId}
        studentId={studentId}
        onLoaded={(d) => setTitle(`${d.student.lastName} ${d.student.firstName}`)}
      />
    </ExamDialog>
  );
}

/** Сурагчийн нэг ангийн шалгалт, сул сэдэв, ирц, даалгавар — «Анги» таб болон сурагчийн хуудсанд. */
export function ClassStudentDetail({
  classId,
  studentId,
  onLoaded,
}: {
  classId: string;
  studentId: string;
  onLoaded?: (d: StudentDetail) => void;
}) {
  const [data, setData] = useState<StudentDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<StudentDetail>(`/exams/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentId)}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
        onLoaded?.(d);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Ачаалж чадсангүй"));
    return () => {
      alive = false;
    };
    // onLoaded — зөвхөн гарчиг; дахин ачаалах шалтгаан биш
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, studentId]);

  const done = data?.exams.filter((e) => e.percent !== null) ?? [];
  const trend = [...done].reverse().map((e) => e.percent as number);

  return (
    <>
      {error && <ErrorState message={error} />}
      {!data && !error && <LoadingState rows={4} label="Ачаалж байна" />}
      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Box label="Шалгалт өгсөн" value={`${done.length}/${data.exams.length}`} />
            <Box label={`Ирц, ${data.windowDays} хоног`} value={data.attendance.rate === null ? "—" : `${data.attendance.rate}%`} />
            <Box label="Тасалсан" value={String(data.attendance.absent)} danger={data.attendance.absent >= 2} />
            <Box label="Даалгавар хийгээгүй" value={String(data.homework.notDone)} danger={data.homework.notDone > 0} />
          </div>

          <section>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="font-bold text-ink">Шалгалтын дүн</h3>
              <Trend values={trend.slice(-8)} />
            </div>
            {data.exams.length === 0 ? (
              <p className="text-sm text-ink-dim">Шалгалт алга.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.exams.map((e) => (
                  <li key={e.testId} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        <MetaTitle>{e.title}</MetaTitle>
                      </span>
                      <Meta
                        className="text-xs text-ink-dim"
                        items={[
                          new Date(e.assignedAt).toLocaleDateString("mn-MN"),
                          e.classAvg !== null && `анги ${e.classAvg}%`,
                          e.status === "DONE" && e.wrong > 0 && `${e.wrong} алдсан`,
                        ]}
                      />
                    </span>
                    {e.status === "DONE" ? (
                      <span
                        className={cn(
                          "font-display text-xl font-bold tabular-nums",
                          toneOf(e.percent) === "danger" ? "text-error" : "text-ink",
                        )}
                      >
                        {e.percent}%
                      </span>
                    ) : (
                      <Badge tone={e.status === "ABSENT" ? "warning" : "neutral"}>
                        {e.status === "ABSENT" ? "Ирээгүй" : "Өгөөгүй"}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {data.topics.length > 0 && (
            <section>
              <h3 className="mb-2 font-bold text-ink">Сул сэдэв</h3>
              <ul className="space-y-2">
                {data.topics.slice(0, 6).map((t) => (
                  <li key={t.key} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink">{t.name}</span>
                    <span className="text-ink-dim">{t.lost} оноо алдсан</span>
                    <span className="w-12 text-right font-bold tabular-nums text-ink">{t.percent}%</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.attendance.recent.length > 0 && (
            <section>
              <h3 className="mb-2 font-bold text-ink">Ирц</h3>
              <ul className="flex flex-wrap gap-2">
                {data.attendance.recent.map((a) => (
                  <li key={a.date}>
                    <Badge tone={a.status === "ABSENT" ? "danger" : "warning"} title={a.note ?? undefined}>
                      {new Date(a.date).toLocaleDateString("mn-MN", { month: "numeric", day: "numeric" })}{" "}
                      {STATUS_LABEL[a.status] ?? a.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

function Box({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-xs text-ink-dim">{label}</p>
      <p className={cn("font-display text-2xl font-bold tabular-nums", danger ? "text-error" : "text-ink")}>{value}</p>
    </div>
  );
}
