"use client";

import { Card } from "@/components/ui/Surface";
import { EmptyState } from "@/components/ui/StateBlock";
import { useState } from "react";
import { ArrowDown, ArrowUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/cn";
import AreaBars from "./AreaBars";
import FormulaLine from "./FormulaLine";
import { areaShort, CLASSIFY_LABEL, itemName, itemTitle, scoreText, TONE_CELL, toneOf, topicShort, type Board } from "./types";

/**
 * Харагдац 2 — бүх багийн тойм: нийт үзүүлэлт, баг × агуулгын хүснэгт,
 * хамгийн их алдсан бодлогууд, агуулгын гүйцэтгэл. (Эзний жишээ ирэхэд тааруулна.)
 */
export default function OverviewPanel({ board }: { board: Board }) {
  // Excel шиг: толгой дээр дарж эрэмбэлнэ; анхдагч — дунджаар ихээс бага (эзэн 2026-11-15)
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: "avg", desc: true });
  const o = board.overall;
  if (o.count === 0) {
    return <EmptyState icon={BarChart3} title="Дүн алга" hint="Дүн оруулсны дараа тойм энд харагдана." />;
  }
  const by = board.classifyBy;
  const label = CLASSIFY_LABEL[by];
  const overallBy = by === "topic" ? o.topics : o.areas;
  const short = by === "topic" ? topicShort : areaShort;
  const areaNames = overallBy.map((a) => a.area);
  // Ангиуд дундаж оноогоор (эзэн 2026-11-15); ижил дундажтай бол ижил байр
  const byAvg = [...board.groups].sort((x, y) => (y.avgScore ?? -1) - (x.avgScore ?? -1));
  const rankOf = new Map(board.groups.map((g) => [g.label, byAvg.findIndex((h) => h.avgScore === g.avgScore) + 1]));
  const valueOf = (g: (typeof board.groups)[number]): number | string => {
    if (sort.key === "label") return g.label;
    if (sort.key === "count") return g.count;
    if (sort.key === "avg" || sort.key === "rank") return g.avgScore ?? -1;
    if (sort.key === "pct") return g.avgPct ?? -1;
    return ((by === "topic" ? g.topics : g.areas).find((a) => a.area === sort.key)?.pct ?? -1) as number;
  };
  const ranked = [...board.groups]
    .sort((x, y) => {
      const a = valueOf(x);
      const b = valueOf(y);
      const c = typeof a === "string" ? a.localeCompare(String(b), "mn", { numeric: true }) : a - (b as number);
      return (sort.desc ? -c : c) || x.label.localeCompare(y.label, "mn", { numeric: true });
    })
    .map((g) => ({ g, rank: rankOf.get(g.label) ?? 0 }));
  const sortHead = (key: string, text: React.ReactNode, cls: string, title?: string) => (
    <th key={key} className={cn(cls, "py-2 font-bold")} title={title} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : "none"}>
      <button
        onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== "label" }))}
        className={cn("inline-flex items-center gap-0.5 hover:text-ink", sort.key === key && "text-brand-soft")}
      >
        {text}
        {sort.key === key && (sort.desc ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />)}
      </button>
    </th>
  );
  const formulaBy = new Map(board.formulas.map((f) => [f.slug, f]));
  const hardest = [...o.items]
    .filter((s) => s.pct !== null)
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0) || a.number - b.number)
    .slice(0, 10);
  const itemBy = new Map(board.items.map((i) => [i.number, i]));
  const stats = [
    { label: "Сурагч", value: String(o.count) },
    { label: "Дундаж оноо", value: scoreText(o.avgScore) },
    { label: "Медиан", value: scoreText(o.medianScore) },
    { label: "Хамгийн их", value: scoreText(o.maxScore) },
    { label: "Хамгийн бага", value: scoreText(o.minScore) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} padding="tight" className="text-center">
            <div className="font-display text-xl font-bold tabular-nums text-ink">{s.value}</div>
            <div className="text-xs text-ink-dim">{s.label}</div>
          </Card>
        ))}
      </div>

      <Card padding="none" className="overflow-hidden">
        <h3 className="px-5 pt-4 font-bold text-brand-soft">Ангиар — {label.one.toLocaleLowerCase("mn-MN")} бүрийн гүйцэтгэл %</h3>
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-dim">
                {sortHead("rank", "Байр", "w-12 px-2 text-right")}
                {sortHead("label", "Анги", "px-2")}
                {sortHead("count", "Сурагч", "px-2 text-right")}
                {sortHead("avg", "Дундаж", "px-2 text-right")}
                {areaNames.map((a) =>
                  sortHead(
                    a,
                    <>
                      <span className="hidden lg:inline">{a}</span>
                      <span className="lg:hidden">{short(a)}</span>
                    </>,
                    "px-1 text-center",
                    a,
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {ranked.map(({ g, rank }) => {
                const pctBy = new Map((by === "topic" ? g.topics : g.areas).map((a) => [a.area, a.pct]));
                return (
                  <tr key={g.label}>
                    <td className="border-t border-line px-2 py-1.5 text-right font-bold tabular-nums text-ink">{rank}</td>
                    <td className="border-t border-line px-2 py-1.5">
                      <span className="font-semibold text-ink">{g.label}</span>
                      {g.teacher && <span className="block text-xs text-ink-dim">{g.teacher}</span>}
                    </td>
                    <td className="border-t border-line px-2 py-1.5 text-right tabular-nums">{g.count}</td>
                    <td className="border-t border-line px-2 py-1.5 text-right tabular-nums">{scoreText(g.avgScore)}</td>
                    {areaNames.map((a) => {
                      const p = pctBy.get(a) ?? null;
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
                <td className="border-t-2 border-line" />
                <td className="border-t-2 border-line px-2 py-1.5 text-ink">Нийт</td>
                <td className="border-t-2 border-line px-2 py-1.5 text-right tabular-nums">{o.count}</td>
                <td className="border-t-2 border-line px-2 py-1.5 text-right tabular-nums">{scoreText(o.avgScore)}</td>
                {overallBy.map((a) => (
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
          <h3 className="mb-3 font-bold text-brand-soft">{label.by} — гүйцэтгэл %</h3>
          <AreaBars areas={overallBy} />
          {by === "topic" && o.areas.length > 1 && (
            <>
              <h3 className="mb-3 mt-5 font-bold text-brand-soft">{CLASSIFY_LABEL.area.by} — гүйцэтгэл %</h3>
              <AreaBars areas={o.areas} />
            </>
          )}
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
                    <span className="font-semibold text-ink">{it ? itemTitle(it, board.items) : `${s.number}-р бодлого`}</span>
                    {(it?.topic ?? it?.area) && <span className="ml-2 text-xs text-ink-dim">{it?.topic ?? it?.area}</span>}
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

      <Card padding="none" className="overflow-hidden">
        <h3 className="px-5 pt-4 font-bold text-brand-soft">Бодлого бүрээр — сэдэв, томьёо, гүйцэтгэл</h3>
        <div className="overflow-x-auto p-3">
          <table className="w-full min-w-[40rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-dim">
                <th className="px-2 py-2 font-bold">№</th>
                <th className="px-2 py-2 font-bold">Сэдэв</th>
                <th className="px-2 py-2 font-bold">Ашиглах томьёо</th>
                <th className="px-2 py-2 text-right font-bold">Зөв %</th>
                <th className="px-2 py-2 font-bold">Түгээмэл алдаа</th>
              </tr>
            </thead>
            <tbody>
              {board.items.map((it, i) => {
                const s = o.items[i];
                return (
                  <tr key={it.number} className={cn("align-top", it.voided && "opacity-60")}>
                    <td className="whitespace-nowrap border-t border-line px-2 py-2 font-bold tabular-nums text-ink">{itemName(it, board.items)}</td>
                    <td className="border-t border-line px-2 py-2">
                      <span className="block text-ink">{it.topic ?? ""}</span>
                      {it.area && <span className="block text-xs text-ink-dim">{it.area}</span>}
                      {it.voided && <span className="block text-xs text-ink-dim">хүчингүй</span>}
                    </td>
                    <td className="border-t border-line px-2 py-2">
                      <div className="flex flex-col gap-1.5">
                        {it.formulaSlugs.map((slug) => {
                          const f = formulaBy.get(slug);
                          return f ? <FormulaLine key={slug} formula={f} compact link /> : null;
                        })}
                      </div>
                    </td>
                    <td className="border-t border-line px-2 py-2 text-right">
                      <span className={cn("inline-flex h-8 min-w-12 items-center justify-center rounded-lg px-2 font-bold tabular-nums", TONE_CELL[toneOf(s?.pct ?? null)])}>
                        {s?.pct ?? ""}
                      </span>
                    </td>
                    <td className="border-t border-line px-2 py-2 text-xs text-ink-dim">
                      {s?.topWrong ? (
                        <>
                          <span className="font-bold text-ink">{s.topWrong.letter}</span> — {s.topWrong.count} сурагч
                        </>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
