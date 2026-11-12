"use client";

import { Card } from "@/components/ui/Surface";
import { EmptyState } from "@/components/ui/StateBlock";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";
import AreaBars from "./AreaBars";
import { areaShort, scoreText, TONE_CELL, toneOf, type Board } from "./types";

/**
 * Харагдац 2 — бүх багийн тойм: нийт үзүүлэлт, баг × агуулгын хүснэгт,
 * хамгийн их алдсан бодлогууд, агуулгын гүйцэтгэл. (Эзний жишээ ирэхэд тааруулна.)
 */
export default function OverviewPanel({ board }: { board: Board }) {
  const o = board.overall;
  if (o.count === 0) {
    return <EmptyState icon={BarChart3} title="Дүн алга" hint="Дүн оруулсны дараа тойм энд харагдана." />;
  }
  const areaNames = o.areas.map((a) => a.area);
  const hardest = [...o.items]
    .filter((s) => s.pct !== null)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0) || a.number - b.number)
    .slice(0, 10);
  const itemBy = new Map(board.items.map((i) => [i.number, i]));
  const stats = [
    { label: "Сурагч", value: String(o.count) },
    { label: "Дундаж оноо", value: scoreText(o.avgScore) },
    { label: "Дундаж", value: o.avgPct !== null ? `${o.avgPct}%` : "" },
    { label: "Медиан", value: scoreText(o.medianScore) },
    { label: "Хамгийн их", value: scoreText(o.maxScore) },
    { label: "Хамгийн бага", value: scoreText(o.minScore) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} padding="tight" className="text-center">
            <div className="font-display text-xl font-bold tabular-nums text-ink">{s.value}</div>
            <div className="text-xs text-ink-dim">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card padding="none" className="overflow-hidden">
        <h3 className="px-5 pt-4 font-bold text-brand-soft">Багаар — агуулгын гүйцэтгэл %</h3>
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-dim">
                <th className="px-2 py-2 font-bold">Баг</th>
                <th className="px-2 py-2 text-right font-bold">Сурагч</th>
                <th className="px-2 py-2 text-right font-bold">Дундаж</th>
                <th className="px-2 py-2 text-right font-bold">%</th>
                {areaNames.map((a) => (
                  <th key={a} className="px-1 py-2 text-center font-bold" title={a}>
                    <span className="hidden lg:inline">{a}</span>
                    <span className="lg:hidden">{areaShort(a)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {board.groups.map((g) => {
                const by = new Map(g.areas.map((a) => [a.area, a.pct]));
                return (
                  <tr key={g.label}>
                    <td className="border-t border-line px-2 py-1.5">
                      <span className="font-semibold text-ink">{g.label}</span>
                      {g.teacher && <span className="block text-xs text-ink-dim">{g.teacher}</span>}
                    </td>
                    <td className="border-t border-line px-2 py-1.5 text-right tabular-nums">{g.count}</td>
                    <td className="border-t border-line px-2 py-1.5 text-right tabular-nums">{scoreText(g.avgScore)}</td>
                    <td className="border-t border-line px-2 py-1.5 text-right font-bold tabular-nums">{g.avgPct ?? ""}</td>
                    {areaNames.map((a) => {
                      const p = by.get(a) ?? null;
                      return (
                        <td key={a} className="border-t border-line p-1">
                          <span className={cn("block rounded-md py-1 text-center text-xs font-bold tabular-nums", TONE_CELL[toneOf(p)])}>
                            {p ?? ""}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="font-bold">
                <td className="border-t-2 border-line px-2 py-1.5 text-ink">Нийт</td>
                <td className="border-t-2 border-line px-2 py-1.5 text-right tabular-nums">{o.count}</td>
                <td className="border-t-2 border-line px-2 py-1.5 text-right tabular-nums">{scoreText(o.avgScore)}</td>
                <td className="border-t-2 border-line px-2 py-1.5 text-right tabular-nums">{o.avgPct ?? ""}</td>
                {o.areas.map((a) => (
                  <td key={a.area} className="border-t-2 border-line p-1">
                    <span className={cn("block rounded-md py-1 text-center text-xs tabular-nums", TONE_CELL[toneOf(a.pct)])}>{a.pct ?? ""}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-bold text-brand-soft">Агуулгын төрлөөр — гүйцэтгэл %</h3>
          <AreaBars areas={o.areas} />
        </Card>
        <Card>
          <h3 className="mb-3 font-bold text-brand-soft">Хамгийн их алдсан бодлого</h3>
          <ul className="space-y-1.5">
            {hardest.map((s) => {
              const it = itemBy.get(s.number);
              return (
                <li key={s.number} className="flex items-center gap-3 text-sm">
                  <span className={cn("inline-flex h-8 w-12 shrink-0 items-center justify-center rounded-lg font-bold tabular-nums", TONE_CELL[toneOf(s.pct)])}>
                    {s.pct}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-ink">{s.number}-р бодлого</span>
                    {it?.area && <span className="ml-2 text-xs text-ink-dim">{it.area}</span>}
                  </span>
                  {s.topWrong && (
                    <span className="shrink-0 text-xs text-ink-dim">
                      ихэнх нь <span className="font-bold text-ink">{s.topWrong.letter}</span> ({s.topWrong.count})
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </div>
  );
}
