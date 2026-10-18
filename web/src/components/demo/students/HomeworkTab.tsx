"use client";

import Link from "next/link";
import { Check, ClipboardCheck, Clock, FileText, ListChecks, Minus, NotebookPen, RotateCw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { Legend, LegendItem } from "../classes/common";
import { boardHref, shortDay, stampLabel } from "../classes/format";
import { homeworkHistory, onlinePct, type LessonRow } from "../classes/stats";
import { HW_META, TONE_SELECTED, TONE_TEXT } from "../shell/status";
import type { DemoClass, DemoStudent, ProblemState, TestResult } from "../world";

const FIRST = 8;

const PROBLEM: Record<ProblemState, { label: string; cls: string; icon: typeof Check }> = {
  correct: { label: "Зөв", cls: "bg-success/15 text-success", icon: Check },
  wrong: { label: "Буруу", cls: "bg-error/15 text-error", icon: X },
  skipped: { label: "Алгассан", cls: "border border-dashed border-line text-ink-dim", icon: Minus },
};

/** Бодлого бүрийн жижиг тор: зөв / буруу / алгассан (дүрс + өнгө) */
function ProblemGrid({ result }: { result: TestResult }) {
  return (
    <div className="mt-2">
      <ul className="flex flex-wrap gap-1" aria-label={`Бодлого бүрийн дүн: зөв ${result.correct}, буруу ${result.wrong}, алгассан ${result.skipped}`}>
        {result.problems.map((p) => {
          const m = PROBLEM[p.state];
          const Icon = m.icon;
          return (
            <li
              key={p.n}
              title={`${p.n}-р бодлого: ${m.label}${p.attempts ? `, ${p.attempts} оролдлого` : ""}`}
              className={cn("flex size-[22px] items-center justify-center rounded-md", m.cls)}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only">
                {p.n}: {m.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ row, classId }: { row: LessonRow; classId: string }) {
  const { rec, result, lesson } = row;
  const hw = rec.hw ? HW_META[rec.hw] : null;
  const HwIcon = hw?.icon;
  const sub = rec.submission;
  const lateSub = !!sub && sub.submittedAt > `${row.dateKey}T${lesson.slot.start}`;
  const away = rec.att === "absent" || rec.att === "excused";

  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
        <div className="min-w-0">
          <Link
            href={boardHref(classId, row.dateKey)}
            title="Энэ өдрийн ирц ба даалгаврын самбар"
            className="-my-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink underline decoration-ink-dim/40 decoration-dotted underline-offset-4 hover:text-brand-soft"
          >
            {shortDay(row.dateKey)}
            <ClipboardCheck className="size-3.5 text-ink-dim" aria-hidden />
          </Link>
          <p className="cyrillic-tight -mt-1 text-sm text-ink-dim">
            <MetaTitle>{row.test.title}</MetaTitle>
          </p>
        </div>
        {hw && HwIcon ? (
          <span className={cn("inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold", TONE_SELECTED[hw.tone])}>
            <HwIcon className="size-3.5" aria-hidden />
            {hw.label}
            {rec.hwNote && <span className="font-normal opacity-80">({rec.hwNote})</span>}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-line px-2 py-1 text-xs font-semibold text-ink-dim">
            {away ? "Хичээлд ороогүй" : "Тэмдэглээгүй"}
          </span>
        )}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
        {sub ? (
          <span className="inline-flex flex-wrap items-center gap-x-1.5 text-ink">
            <FileText className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="font-medium tabular-nums">{sub.pages} хуудас</span>
            <span className="text-xs text-ink-dim">
              <Meta items={[stampLabel(sub.submittedAt), sub.resubmitted ? "дахин илгээсэн" : ""]} />
            </span>
            {lateSub && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                <Clock className="size-3.5" aria-hidden />
                хоцорсон
              </span>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-ink-dim">
            <FileText className="size-4 shrink-0 opacity-50" aria-hidden />
            Хуудас илгээгээгүй
          </span>
        )}

        {result ? (
          <span className="inline-flex items-center gap-1.5 text-ink">
            <ListChecks className="size-4 shrink-0 text-brand" aria-hidden />
            <span className="font-medium tabular-nums">
              Онлайн {result.correct}/{result.problems.length}
            </span>
            <span className="font-semibold tabular-nums">{onlinePct(result)}%</span>
            <span className="inline-flex items-center gap-1 text-xs text-ink-dim">
              <RotateCw className="size-3" aria-hidden />
              {result.attempts} оролдлого
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-ink-dim">
            <ListChecks className="size-4 shrink-0 opacity-50" aria-hidden />
            Онлайнаар бодоогүй
          </span>
        )}
      </div>

      {result && <ProblemGrid result={result} />}
    </li>
  );
}

/** Гэрийн даалгаврын түүх: хичээл бүрээр — төлөв, илгээсэн хуудас, онлайн тестийн оноо ба бодлого бүрийн дүн */
export default function HomeworkTab({ cls, student }: { cls: DemoClass; student: DemoStudent }) {
  const rows = useMemo(() => homeworkHistory(cls, student), [cls, student]);
  const [all, setAll] = useState(false);
  const shown = all ? rows : rows.slice(0, FIRST);

  if (!rows.length) {
    return <EmptyState icon={NotebookPen} title="Даалгаврын түүх одоогоор алга" hint="Шалгах даалгавартай хичээл болсны дараа энд гарна" />;
  }
  return (
    <div>
      <ul className="space-y-2">
        {shown.map((r) => (
          <Row key={r.dateKey} row={r} classId={cls.id} />
        ))}
      </ul>
      {rows.length > FIRST && (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={() => setAll((v) => !v)} className="min-h-11">
            {all ? `Эхний ${FIRST}-г харуулах` : `Бүгдийг харах (${rows.length})`}
          </Button>
        </div>
      )}
      <Legend>
        {Object.values(HW_META).map((m) => {
          const Icon = m.icon;
          return (
            <LegendItem key={m.label}>
              <Icon className={cn("size-3.5", TONE_TEXT[m.tone])} />
              {m.label}
            </LegendItem>
          );
        })}
        {(Object.keys(PROBLEM) as ProblemState[]).map((k) => {
          const m = PROBLEM[k];
          const Icon = m.icon;
          return (
            <LegendItem key={k}>
              <span className={cn("flex size-[18px] items-center justify-center rounded", m.cls)}>
                <Icon className="size-3" aria-hidden />
              </span>
              Бодлого: {m.label.toLocaleLowerCase("mn")}
            </LegendItem>
          );
        })}
      </Legend>
    </div>
  );
}
