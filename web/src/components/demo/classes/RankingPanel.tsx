"use client";

import { useState } from "react";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { RiskMark } from "../shell/status";
import { Legend, LegendItem, ScoreBar, StudentLink } from "./common";
import { SCORE_WEIGHTS, type RankRow } from "./stats";

const pct = (v: number | null) => (v === null ? "—" : `${v}%`);
const w = (v: number) => Math.round(v * 100);
const COLS = "grid-cols-[2rem_minmax(0,1fr)_4rem] sm:grid-cols-[2.25rem_minmax(0,1fr)_repeat(4,4.5rem)_7rem]";

/** Сурагчдын эрэмбэ: ирц, даалгавар, онлайн тест, шалгалтын нийлбэр оноогоор */
export default function RankingPanel({ rank }: { rank: RankRow[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? rank : rank.slice(0, 10);

  return (
    <div>
      <div aria-hidden className={cn("mb-1 hidden items-center gap-x-3 px-1 text-xs font-semibold text-ink-dim sm:grid", COLS)}>
        <span className="text-right">Байр</span>
        <span>Сурагч</span>
        <span className="text-right">Ирц</span>
        <span className="text-right">Даалгавар</span>
        <span className="text-right">Тест</span>
        <span className="text-right">Шалгалт</span>
        <span className="text-right">Нийлбэр</span>
      </div>
      <ol className="divide-y divide-line">
        {shown.map((r) => (
          <li key={r.stat.student.id} className={cn("grid items-center gap-x-3 px-1 py-2", COLS)}>
            <span
              className={cn(
                "flex size-7 items-center justify-center justify-self-end rounded-full text-xs font-bold tabular-nums",
                r.rank <= 3 ? "bg-brand-bright/15 text-brand-soft" : "text-ink-dim",
              )}
            >
              {r.rank}
            </span>
            <span className="min-w-0">
              <span className="flex min-h-7 items-center gap-2">
                <RiskMark flags={r.stat.flags} />
                <StudentLink id={r.stat.student.id} className="min-w-0 truncate text-sm">
                  {r.stat.student.name}
                </StudentLink>
              </span>
              <span className="mt-0.5 grid grid-cols-2 gap-x-3 pl-[1.125rem] text-xs text-ink-dim sm:hidden">
                <span>
                  Ирц <b className="font-semibold text-ink">{pct(r.stat.att)}</b>
                </span>
                <span>
                  Даалг. <b className="font-semibold text-ink">{pct(r.stat.hw)}</b>
                </span>
                <span>
                  Тест <b className="font-semibold text-ink">{pct(r.online)}</b>
                </span>
                <span>
                  Шалг. <b className="font-semibold text-ink">{pct(r.exam)}</b>
                </span>
              </span>
            </span>
            <span className="hidden text-right text-sm tabular-nums text-ink sm:block">{pct(r.stat.att)}</span>
            <span className="hidden text-right text-sm tabular-nums text-ink sm:block">{pct(r.stat.hw)}</span>
            <span className="hidden text-right text-sm tabular-nums text-ink sm:block">{pct(r.online)}</span>
            <span className="hidden text-right text-sm tabular-nums text-ink sm:block">{pct(r.exam)}</span>
            <span className="text-right">
              <span className="block font-display text-base font-bold tabular-nums text-ink">{pct(r.total)}</span>
              {r.total !== null && <ScoreBar value={r.total} className="mt-1 h-1.5" />}
            </span>
          </li>
        ))}
      </ol>
      {rank.length > 10 && (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" size="md" onClick={() => setAll((v) => !v)} className="min-h-11">
            {all ? "Эхний 10-ыг харуулах" : `Бүгдийг харах (${rank.length})`}
          </Button>
        </div>
      )}
      <Legend>
        <LegendItem>
          Нийлбэр оноо: ирц {w(SCORE_WEIGHTS.att)}%, даалгавар {w(SCORE_WEIGHTS.hw)}%, онлайн тест {w(SCORE_WEIGHTS.online)}%, шалгалт {w(SCORE_WEIGHTS.exam)}%
        </LegendItem>
        <LegendItem>Ирц, даалгавар, тест: сүүлийн 30 хоног</LegendItem>
        <LegendItem>Шалгалт: улирлын бүх явцын шалгалт</LegendItem>
      </Legend>
    </div>
  );
}
