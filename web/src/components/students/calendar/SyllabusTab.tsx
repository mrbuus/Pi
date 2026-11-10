"use client";

import { ArrowRightLeft, ChevronDown, CircleCheck, CircleDashed, CircleAlert, DoorOpen, ListChecks } from "lucide-react";
import { useState } from "react";
import { ATTENDANCE_MARKS } from "@/components/attendance/marks";
import { shortDay } from "@/components/TeacherDashboard/board/lib";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import { useSection } from "../progress/useSection";
import type { SyllabusEvent, SyllabusResponse, SyllabusStatus, SyllabusTest } from "./types";

const STATUS: Record<SyllabusStatus, { label: string; icon: typeof CircleCheck; cls: string }> = {
  DONE: { label: "Хийсэн", icon: CircleCheck, cls: "text-success" },
  MISSING: { label: "Дутуу", icon: CircleAlert, cls: "text-warning" },
  TODO: { label: "Үзээгүй", icon: CircleDashed, cls: "text-ink-dim/60" },
};

function eventText(e: SyllabusEvent): string {
  switch (e.kind) {
    case "CLASS": {
      const att = e.attendance ? ATTENDANCE_MARKS[e.attendance].label.toLowerCase() : "ирц тэмдэглээгүй";
      return `${shortDay(e.date)}, ${e.classroomName ?? "анги"} — ${att}`;
    }
    case "PAST":
      return `${e.classroomName ?? "Анги"} — өмнө үзсэн (огноогүй)`;
    case "MAKEUP":
      return `${shortDay(e.date)}, ${e.place.kind === "ROOM_406" ? "406-д нөхсөн" : `${e.place.name} ангид нөхсөн`}`;
    case "BEFORE_JOIN":
      return `${e.date ? `${shortDay(e.date)}, ` : ""}${e.classroomName ?? "Анги"} элсэхээс өмнө үзсэн`;
  }
}

/**
 * «Сэдэв хөтөлбөр» (эзэн 2026-11-08) — сурагчийн ангийн хөтөлбөр (100V3 → 200V3), тест бүр энэ сурагч
 * хийсэн эсэх, хэзээ, хаана. Дүрэм: api/src/student-calendar/syllabus.logic.ts. Зөвхөн ажилтанд.
 */
export default function SyllabusTab({ studentId }: { studentId: string }) {
  const q = useSection<SyllabusResponse | null>(`/students/${encodeURIComponent(studentId)}/syllabus`, null);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [showTodo, setShowTodo] = useState(false);
  const d = q.data;
  if (q.status === "loading" && !d) return <LoadingState rows={5} label="Сэдэв хөтөлбөр" />;
  if (q.status === "error" && !d) return <ErrorState message={q.error} onRetry={q.reload} />;
  if (!d) return null;
  const keep = (t: SyllabusTest) => (onlyMissing ? t.status === "MISSING" : showTodo || t.status !== "TODO");
  const books = d.books
    .map((b) => ({ ...b, chapters: b.chapters.map((c) => ({ ...c, tests: c.tests.filter(keep) })).filter((c) => c.tests.length) }))
    .filter((b) => b.chapters.length);
  const other = d.other.filter(keep);

  return (
    <section className="chunky space-y-3 p-4 md:p-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="flex items-center gap-1 font-bold text-brand-soft">
          Сэдэв хөтөлбөр
          <InfoHint>
            Ангид орсон сэдэв тасалснаас (чөлөөтэйг оруулаад) бусад тохиолдолд хийсэнд тооцогдоно. Анги солиход шинэ анги
            түрүүлж үзсэн сэдэв нөхөх хүртэл дутуу. 406 эсвэл өөр ангид нөхвөл хийсэнд орно
          </InfoHint>
        </h2>
        <Meta className="text-sm text-ink-dim" items={[d.classroom?.name ?? "Ангигүй", `${d.summary.done} хийсэн`]} />
      </div>
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold",
          d.summary.missing ? "border-warning/50 bg-warning/[0.08] text-warning" : "border-success/40 bg-success/[0.06] text-success",
        )}
      >
        {d.summary.missing ? <CircleAlert className="size-4" aria-hidden /> : <CircleCheck className="size-4" aria-hidden />}
        {d.summary.missing ? `Дутуу ${d.summary.missing} сэдэв` : "Дутуу сэдэв алга"}
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" className="size-5 accent-brand" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Зөвхөн дутуу
        </label>
        {!onlyMissing && (
          <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
            <input type="checkbox" className="size-5 accent-brand" checked={showTodo} onChange={(e) => setShowTodo(e.target.checked)} />
            Үзээгүй сэдвийг харуулах
          </label>
        )}
      </div>

      {books.length === 0 && other.length === 0 ? (
        <EmptyState icon={ListChecks} title={onlyMissing ? "Дутуу сэдэв алга" : "Хийсэн сэдэв хараахан алга"} hint="Анги тест хийж, хичээл батлахад энд гарна." />
      ) : (
        <div className="space-y-4">
          {books.map((b) => (
            <div key={b.id}>
              <h3 className="mb-1 text-sm font-bold text-ink">{b.title}</h3>
              <ul className="space-y-1">
                {b.chapters.map((c) => (
                  <li key={c.id}>
                    <p className="text-xs font-semibold text-ink-dim">{c.title}</p>
                    <ul className="divide-y divide-line">
                      {c.tests.map((t) => (
                        <TestRow key={t.id} t={t} />
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {other.length > 0 && (
            <div>
              <h3 className="mb-1 text-sm font-bold text-ink">Бусад сэдэв</h3>
              <ul className="divide-y divide-line">
                {other.map((t) => (
                  <TestRow key={t.id} t={t} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function TestRow({ t }: { t: SyllabusTest }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[t.status];
  const Icon = st.icon;
  const last = t.events.at(-1);
  const summary = t.status === "DONE" ? (t.doneOn ? shortDay(t.doneOn) : "өмнө үзсэн") : last ? eventText(last) : null;
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        disabled={!t.events.length}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full items-center gap-2 py-1.5 text-left disabled:cursor-default"
      >
        <Icon className={cn("size-4 shrink-0", st.cls)} aria-label={st.label} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">
            {t.title}
            {t.variant && <span className="ml-1 text-xs font-normal text-ink-dim">{t.variant}</span>}
          </span>
          {summary && <span className="block truncate text-xs text-ink-dim">{summary}</span>}
        </span>
        {t.events.some((e) => e.kind === "MAKEUP") &&
          (t.events.some((e) => e.kind === "MAKEUP" && e.place.kind === "ROOM_406") ? (
            <DoorOpen className="size-4 shrink-0 text-brand" aria-label="Нөхсөн" />
          ) : (
            <ArrowRightLeft className="size-4 shrink-0 text-brand" aria-label="Нөхсөн" />
          ))}
        {t.events.length > 0 && <ChevronDown className={cn("size-4 shrink-0 text-ink-dim transition", open && "rotate-180")} aria-hidden />}
      </button>
      {open && (
        <ul className="mb-2 ml-6 space-y-1.5 text-sm">
          {t.events.map((e, i) => (
            <li key={i} className={cn(e.done ? "text-ink" : "text-warning")}>
              {eventText(e)}
              {e.kind === "CLASS" && (e.lead || e.description || e.teacherNote) && (
                <span className="block text-xs text-ink-dim">
                  <Meta items={[e.lead ?? null, e.description ?? null, e.teacherNote ?? null]} />
                </span>
              )}
              {e.kind === "MAKEUP" && (e.teacher || e.comment) && (
                <span className="block text-xs text-ink-dim">
                  <Meta items={[e.teacher, e.comment]} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
