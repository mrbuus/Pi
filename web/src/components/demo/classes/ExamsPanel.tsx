"use client";

import { ChevronDown, FileCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import type { DemoClass, ExamResult } from "../world";
import { Legend, LegendItem, ScoreBar, StudentLink } from "./common";
import { dayMonth } from "./format";

const FIRST = 10;

function ExamItem({ cls, exam, open, onToggle }: { cls: DemoClass; exam: ExamResult; open: boolean; onToggle: () => void }) {
  const [all, setAll] = useState(false);
  const sorted = useMemo(() => {
    const list = cls.students
      .filter((s) => exam.scores[s.id] !== undefined)
      .map((s) => ({ s, v: exam.scores[s.id] }))
      .sort((a, b) => b.v - a.v || a.s.index - b.s.index);
    return list.map((r) => ({ ...r, rank: 1 + list.filter((o) => o.v > r.v).length }));
  }, [cls, exam]);
  const missing = useMemo(() => cls.students.filter((s) => s.joinedOn <= exam.dateKey && exam.scores[s.id] === undefined), [cls, exam]);

  return (
    <li className="overflow-hidden rounded-xl border border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`exam-${exam.id}`}
        onClick={onToggle}
        className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors hover:bg-ink/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-bright/60"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-ink-dim">
            <Meta items={[dayMonth(exam.dateKey), `${sorted.length} сурагч`]} />
          </span>
          <span className="cyrillic-tight block text-sm font-semibold text-ink">{exam.title}</span>
        </span>
        <span className="w-20 shrink-0 text-right">
          <span className="block font-display text-lg font-bold tabular-nums text-ink">{exam.average}%</span>
          <ScoreBar value={exam.average} />
        </span>
        <ChevronDown className={cn("size-5 shrink-0 text-ink-dim transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div id={`exam-${exam.id}`} className="border-t border-line px-3 py-1.5">
          <ol>
            {(all ? sorted : sorted.slice(0, FIRST)).map((r) => (
              <li key={r.s.id} className="grid min-h-11 grid-cols-[1.5rem_minmax(0,1fr)_4.5rem_2.5rem] items-center gap-x-3 sm:grid-cols-[1.5rem_minmax(0,14rem)_minmax(0,1fr)_2.5rem]">
                <span className="text-right text-xs tabular-nums text-ink-dim">{r.rank}</span>
                <StudentLink id={r.s.id} className="min-w-0 truncate text-sm">
                  {r.s.name}
                </StudentLink>
                <ScoreBar value={r.v} avg={exam.average} />
                <span className="text-right text-sm font-semibold tabular-nums text-ink">{r.v}%</span>
              </li>
            ))}
          </ol>
          {sorted.length > FIRST && (
            <div className="flex justify-center py-2">
              <Button variant="outline" onClick={() => setAll((v) => !v)} className="min-h-11">
                {all ? `Эхний ${FIRST}-г харуулах` : `Бүгдийг харах (${sorted.length})`}
              </Button>
            </div>
          )}
          {missing.length > 0 && (
            <p className="border-t border-line py-2.5 text-xs leading-relaxed text-ink-dim">
              Өгөөгүй ({missing.length}):{" "}
              {missing.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <StudentLink id={s.id} className="text-xs font-medium">
                    {s.name}
                  </StudentLink>
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** «Явцын шалгалт»-ын дүн: шинэ нь эхэнд; дарахад сурагч бүрийн оноо (өндрөөс нь) */
export default function ExamsPanel({ cls, exams }: { cls: DemoClass; exams: ExamResult[] }) {
  const [openId, setOpenId] = useState<string | null>(exams[0]?.id ?? null);

  if (!exams.length) {
    return <EmptyState icon={FileCheck} title="Явцын шалгалт одоогоор байхгүй" hint="Хичээлд «Явцын шалгалт» тэмдэглэгээ тавихад дүн нь энд гарна" />;
  }
  return (
    <div>
      <ul className="space-y-2">
        {exams.map((e) => (
          <ExamItem key={e.id} cls={cls} exam={e} open={openId === e.id} onToggle={() => setOpenId(openId === e.id ? null : e.id)} />
        ))}
      </ul>
      <Legend>
        <LegendItem>
          <span aria-hidden className="block h-3 w-0.5 bg-ink" />
          Босоо зураас: ангийн дундаж
        </LegendItem>
        <LegendItem>Дарахад сурагч бүрийн оноо гарна</LegendItem>
      </Legend>
    </div>
  );
}
