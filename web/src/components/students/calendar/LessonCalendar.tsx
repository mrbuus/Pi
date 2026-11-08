"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { ATTENDANCE_MARKS, ATTENDANCE_ORDER, HOMEWORK_MARKS, HOMEWORK_ORDER, TONE_TEXT } from "@/components/attendance/marks";
import DayBox from "@/components/TeacherDashboard/board/DayBox";
import { LATE_RANGE_SHORT, addMonths, dayLabel, emptyCounts, fromKey, monthKeyLabel } from "@/components/TeacherDashboard/board/lib";
import { CountGrid, CountRow, Legend, LegendItem, attendanceCounts, homeworkCounts } from "@/components/TeacherDashboard/board/parts";
import { quizDayText } from "@/components/TeacherDashboard/board/QuizDay";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { useSection } from "../progress/useSection";
import DaySheet, { type SheetItem } from "./DaySheet";
import type { LessonDaysResponse } from "./types";

const EMPTY: LessonDaysResponse | null = null;

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}

interface Cell {
  kind: "lesson" | "makeup";
  key: string;
  date: string;
  classroomName: string;
  item: SheetItem;
  /** Анги сольсон сард тэр ангийн эхний хайрцгийн өмнөх шошго */
  classLabel?: string;
}

/**
 * Сурагчийн бүтэн хуудасны «Хичээлийн түүх» — сараар (эзэн 2026-11-08). Хичээлийн өдөр бүр нэг хайрцаг
 * (самбарын drawer-тай ижил DayBox: ирц, даалгавар, шалгалтын хувь), нөхөлт өөр өнгийн хайрцаг.
 * Хайрцаг дарахад тэр өдрийн дэлгэрэнгүй жижиг цонхонд. Анги сольсон сард ангийн нэр хайрцгийн өмнө.
 */
export default function LessonCalendar({ studentId, today }: { studentId: string; today: string }) {
  const headingId = useId();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [open, setOpen] = useState<SheetItem | null>(null);
  const { from, to } = monthBounds(month);
  const q = useSection<LessonDaysResponse | null>(
    `/students/${encodeURIComponent(studentId)}/lesson-days?from=${from}&to=${to}`,
    EMPTY,
  );
  const data = q.data && q.data.from === from ? q.data : null;
  const loading = q.status === "loading" || (!data && q.status !== "error");

  // Хамгийн эрт бичлэгийн огноо — сар солих үед (шинэ хариу ирэх хүртэл) навигацийг хадгална
  const [first, setFirst] = useState<string | null>(null);
  if (data?.firstDate && data.firstDate !== first) setFirst(data.firstDate);
  const minMonth = (first ?? today).slice(0, 7);
  const maxMonth = today.slice(0, 7);
  const canPrev = month > minMonth;
  const canNext = month < maxMonth;

  const cells = useMemo<Cell[]>(() => {
    if (!data) return [];
    const out: Cell[] = [
      ...data.days.map((d) => ({ kind: "lesson" as const, key: d.key, date: d.date, classroomName: d.classroomName, item: { kind: "lesson" as const, day: d } })),
      ...data.makeups.map((v) => ({
        kind: "makeup" as const,
        key: `m:${v.id}`,
        date: v.date,
        classroomName: v.place.name,
        item: { kind: "makeup" as const, visit: v },
      })),
    ];
    out.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === "makeup" ? 1 : 0) - (b.kind === "makeup" ? 1 : 0));
    // Анги сольсон сар: өөрийн ангийн нэр солигдох бүрт хайрцгийн өмнө шошго
    const own = data.days.filter((d) => d.own);
    if (new Set(own.map((d) => d.classroomId)).size > 1) {
      let last = "";
      for (const c of out) {
        if (c.item.kind !== "lesson" || !c.item.day.own || c.item.day.classroomId === last) continue;
        last = c.item.day.classroomId;
        c.classLabel = c.classroomName.split(" ")[0];
      }
    }
    return out;
  }, [data]);

  // Сарын тоо: өнгөрсөн, өөрийн ангийн хичээл (тэмдэглээгүйг оруулаад); нөхөлт тоонд орохгүй
  const counts = useMemo(() => {
    const c = emptyCounts();
    for (const d of data?.days ?? []) {
      if (d.future) continue;
      if (d.attendance) c.attendance[d.attendance.status]++;
      else if (d.own) c.attendance.unmarked++;
      if (d.homework?.status) c.homework[d.homework.status]++;
      else if (d.own && !d.quiz) c.homework.unmarked++;
    }
    return c;
  }, [data]);
  const hasQuiz = !!data?.days.some((d) => d.quiz);

  const nav = (dir: -1 | 1) => (
    <button
      type="button"
      onClick={() => setMonth((m) => addMonths(m, dir))}
      disabled={dir === -1 ? !canPrev : !canNext}
      aria-label={dir === -1 ? "Өмнөх сар" : "Дараагийн сар"}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-ink/5 disabled:opacity-30"
    >
      {dir === -1 ? <ChevronLeft className="size-5" aria-hidden /> : <ChevronRight className="size-5" aria-hidden />}
    </button>
  );

  return (
    <section aria-labelledby={headingId}>
      <div className="-mx-2 mb-2 flex items-center gap-1">
        {nav(-1)}
        <h3 id={headingId} className="cyrillic-heading flex min-w-0 flex-1 items-center justify-center gap-1.5 font-bold text-ink">
          {monthKeyLabel(month)}
          {loading && !q.error && <LoaderCircle className="size-4 animate-spin text-brand motion-reduce:animate-none" aria-label="Ачаалж байна" />}
        </h3>
        {nav(1)}
      </div>

      {q.status === "error" && !data ? (
        <ErrorState message={q.error} onRetry={q.reload} />
      ) : !data ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-2">
          <div className="skeleton h-20 rounded-lg" />
          <SkeletonLine width="70%" />
        </div>
      ) : cells.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-dim">Энэ сард хичээл, нөхөлт алга</p>
      ) : (
        <>
          <ul className="flex flex-wrap items-end gap-1" aria-label={`${monthKeyLabel(month)}, хичээл бүрийн ирц ба даалгавар`}>
            {cells.flatMap((c) => {
              const nodes = [];
              if (c.classLabel) {
                nodes.push(
                  <li key={`label:${c.key}`} className="flex h-full items-center self-center px-1 text-xs font-bold text-brand-soft">
                    {c.classLabel}
                  </li>,
                );
              }
              nodes.push(<li key={c.key}>{renderBox(c, today, hasQuiz, setOpen)}</li>);
              return nodes;
            })}
          </ul>

          <CountGrid className="mt-3 gap-y-1">
            <CountRow label="Ирц" items={attendanceCounts(counts, { unmarked: true })} />
            <CountRow label="Даалгавар" items={homeworkCounts(counts, { unmarked: true })} />
          </CountGrid>
        </>
      )}

      {/* Тайлбар — хамгийн доор (эзний дүрэм) */}
      <Legend label="Тэмдэгийн тайлбар" className="mt-3 border-t border-line pt-2.5">
        {ATTENDANCE_ORDER.map((a) => {
          const m = ATTENDANCE_MARKS[a];
          const Icon = m.icon;
          return (
            <LegendItem key={a} icon={<Icon className={`size-3.5 ${TONE_TEXT[m.tone]}`} aria-hidden />}>
              {m.label}
            </LegendItem>
          );
        })}
        {HOMEWORK_ORDER.map((h) => {
          const m = HOMEWORK_MARKS[h];
          const Icon = m.icon;
          return (
            <LegendItem key={h} icon={<Icon className={`size-3.5 ${TONE_TEXT[m.tone]}`} aria-hidden />}>
              Даалгавар {m.label.toLowerCase()}
            </LegendItem>
          );
        })}
        <LegendItem icon={<span aria-hidden className="inline-flex size-3.5 rounded border border-brand-bright/60 bg-brand-bright/[0.08]" />}>
          Нөхөлт (406, өөр анги)
        </LegendItem>
        <LegendItem icon={<span aria-hidden className="inline-flex size-3.5 rounded border border-info/50" />}>Өөр ангид тэмдэглэсэн</LegendItem>
        <LegendItem icon={<span aria-hidden className="inline-flex size-3.5 rounded border border-dashed border-line" />}>Болоогүй</LegendItem>
      </Legend>

      {open && data && <DaySheet item={open} studentId={studentId} makeups={data.makeups} onClose={() => setOpen(null)} />}
    </section>
  );
}

function renderBox(c: Cell, today: string, hasQuiz: boolean, onOpen: (item: SheetItem) => void) {
  const dayOfMonth = fromKey(c.date).getDate();
  if (c.item.kind === "makeup") {
    const v = c.item.visit;
    const am = v.attendance.status ? ATTENDANCE_MARKS[v.attendance.status] : null;
    const label = [dayLabel(c.date), v.label, am?.label.toLowerCase(), v.tests.length ? v.tests.map((t) => t.title).join(", ") : null]
      .filter(Boolean)
      .join(", ");
    return (
      <DayBox
        dayOfMonth={dayOfMonth}
        attendance={v.attendance.status}
        homework={v.homework.status}
        showHomework
        quiz={null}
        quizRow={hasQuiz}
        muted={false}
        makeup={v.place.kind}
        label={label}
        onClick={() => onOpen(c.item)}
      />
    );
  }
  const d = c.item.day;
  const am = d.attendance ? ATTENDANCE_MARKS[d.attendance.status] : null;
  const hm = d.homework?.status ? HOMEWORK_MARKS[d.homework.status] : null;
  const quiz = d.quiz ? { date: d.date, ...d.quiz } : null;
  const muted = !am && !hm && !quiz && d.future;
  const label = [
    dayLabel(d.date),
    d.classroomName,
    am ? `${am.label}${d.attendance?.lateRange ? ` ${LATE_RANGE_SHORT[d.attendance.lateRange]}` : ""}` : d.future ? "хараахан болоогүй" : "ирц тэмдэглээгүй",
    hm ? `даалгавар ${hm.label.toLowerCase()}` : null,
    quiz ? quizDayText(quiz) : null,
    d.testsText,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <DayBox
      dayOfMonth={dayOfMonth}
      attendance={d.attendance?.status ?? null}
      homework={d.homework?.status ?? null}
      showHomework
      quiz={quiz}
      quizRow={hasQuiz}
      muted={muted}
      otherClass={!d.own}
      selected={d.date === today}
      label={label}
      onClick={() => onOpen(c.item)}
    />
  );
}

