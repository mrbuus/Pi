"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/kit/badge";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import AreaBars from "./AreaBars";
import SheetDialog from "./SheetDialog";
import {
  areaShort,
  CLASSIFY_LABEL,
  topicShort,
  cellText,
  scoreText,
  STATUS_CELL,
  STATUS_LABEL,
  STATUS_OF_CHAR,
  TONE_CELL,
  toneOf,
  type Board,
  type BoardGroup,
  type BoardRow,
} from "./types";

/**
 * Харагдац 1 — багийн хүснэгт (эзний «Баг 27 Болор-Эрдэнэ» Excel-ийн хэлбэр):
 * № | Шифр | Овог | Нэр | Оноо | Сул агуулга | 1..N, доор нь «Гүйцэтгэл %»,
 * хүснэгтийн доор «Агуулгын төрлөөр — гүйцэтгэл %».
 */
export default function GroupTable({ board }: { board: Board }) {
  const [active, setActive] = useState(board.groups[0]?.label ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<BoardRow | null>(null);

  const q = query.trim().toLocaleLowerCase("mn-MN");
  const found = useMemo(() => {
    if (!q) return null;
    const rows = board.groups.flatMap((g) =>
      g.rows
        .filter((r) => `${r.lastName} ${r.firstName} ${r.code}`.toLocaleLowerCase("mn-MN").includes(q))
        .map((r) => ({ ...r, group: g.label })),
    );
    return rows;
  }, [board.groups, q]);

  if (board.groups.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={board.scope === "OWN_CLASSES" ? "Таны ангийн сурагчийн дүн алга" : "Дүн оруулаагүй байна"}
        hint={
          board.scope === "OWN_CLASSES"
            ? "Энэ шалгалтад таны ангийн сурагч ороогүй, эсвэл дүн нь хараахан оруулагдаагүй."
            : "«Дүн оруулах» табаас машины эсвэл Excel-ийн файлаа оруулна уу."
        }
      />
    );
  }
  const group = board.groups.find((g) => g.label === active) ?? board.groups[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Баг">
          {board.groups.map((g) => (
            <button
              key={g.label}
              role="tab"
              aria-selected={g.label === group.label && !q}
              onClick={() => {
                setActive(g.label);
                setQuery("");
              }}
              className={cn(
                "min-h-11 shrink-0 rounded-xl border px-3 text-sm font-semibold transition-colors",
                g.label === group.label && !q
                  ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                  : "border-line text-ink-dim hover:border-brand",
              )}
            >
              {g.label}
              <span className="ml-1.5 text-xs opacity-70">{g.count}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-56">
          <span className="sr-only">Сурагч хайх</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Нэр, шифр"
            className="min-h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink focus-visible:border-brand-bright"
          />
        </label>
      </div>

      {found ? (
        <Card padding="none" className="overflow-hidden">
          {found.length === 0 ? (
            <p className="p-4 text-sm text-ink-dim">Олдсонгүй</p>
          ) : (
            <ul className="divide-y divide-line">
              {found.map((r) => (
                <li key={r.sheetId}>
                  <button className="row-interactive flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left" onClick={() => setOpen(r)}>
                    <span className="min-w-0 flex-1 text-sm">
                      <span className="font-semibold text-ink">
                        {r.lastName} {r.firstName}
                      </span>
                      <Meta className="ml-2 text-xs text-ink-dim" items={[r.group, r.code]} />
                    </span>
                    <span className="text-sm font-bold tabular-nums text-ink">{scoreText(r.totalScore)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <GroupSheet board={board} group={group} onOpen={setOpen} />
      )}

      <SheetDialog row={open} items={board.items} formulas={board.formulas} classifyBy={board.classifyBy} onOpenChange={(v) => !v && setOpen(null)} />
    </div>
  );
}

function GroupSheet({ board, group, onOpen }: { board: Board; group: BoardGroup; onOpen: (r: BoardRow) => void }) {
  const items = board.items;
  const by = board.classifyBy;
  const label = CLASSIFY_LABEL[by];
  const overallBy = by === "topic" ? board.overall.topics : board.overall.areas;
  const groupBy = by === "topic" ? group.topics : group.areas;
  const head = "sticky top-0 z-10 bg-panel px-2 py-2 text-left text-xs font-bold text-ink-dim";
  return (
    <div className="space-y-4">
      <Card padding="tight">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-bold text-ink">
            {group.label}
            {group.teacher && <span className="font-normal text-ink-dim"> — Багш: {group.teacher}</span>}
          </h3>
          <Meta
            className="text-sm text-ink-dim"
            items={[`${group.count} сурагч`, group.avgScore !== null ? `дундаж ${scoreText(group.avgScore)} оноо` : null, group.avgPct !== null ? `${group.avgPct}%` : null]}
          />
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={cn(head, "sticky left-0 z-20 w-8 text-right")}>№</th>
                <th className={cn(head, "hidden md:table-cell")}>Шифр</th>
                <th className={cn(head, "sticky left-8 z-20 min-w-36 border-r border-line")}>Овог, нэр</th>
                <th className={cn(head, "text-right")}>Оноо</th>
                <th className={cn(head, "min-w-32")}>{label.weak}</th>
                {items.map((it) => (
                  <th
                    key={it.number}
                    scope="col"
                    title={[`${it.number}-р бодлого`, it.topic, it.area, it.voided ? "хүчингүй" : null].filter(Boolean).join(" — ")}
                    className={cn(head, "w-8 px-0 text-center tabular-nums", it.voided && "line-through opacity-60")}
                  >
                    <span className="block">{it.number}</span>
                    <span className="block text-[10px] font-semibold opacity-70">{by === "topic" ? topicShort(it.topic) : areaShort(it.area)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {group.rows.map((r, i) => (
                <tr key={r.sheetId} className="group">
                  <td className="sticky left-0 z-10 w-8 border-t border-line bg-surface px-2 py-1 text-right text-xs tabular-nums text-ink-dim group-hover:bg-panel">
                    {i + 1}
                  </td>
                  <td className="hidden border-t border-line px-2 py-1 text-xs tabular-nums text-ink-dim md:table-cell">{r.code}</td>
                  <td className="sticky left-8 z-10 border-r border-t border-line bg-surface px-2 py-1 group-hover:bg-panel">
                    <button
                      className="min-h-11 text-left font-semibold text-ink underline-offset-2 hover:underline"
                      onClick={() => onOpen(r)}
                    >
                      <span className="text-ink-dim">{r.lastName}</span> {r.firstName}
                    </button>
                  </td>
                  <td className="border-t border-line px-2 py-1 text-right font-bold tabular-nums text-ink">
                    {scoreText(r.totalScore)}
                  </td>
                  <td className="border-t border-line px-2 py-1 text-xs text-ink">{r.weak.join(", ")}</td>
                  {items.map((it, j) => {
                    const st = STATUS_OF_CHAR[r.statuses[j]] ?? "UNGRADED";
                    return (
                      <td
                        key={it.number}
                        title={`${it.number}: ${STATUS_LABEL[st]}${r.answers[j] && /^[A-E]$/.test(r.answers[j]) ? ` (${r.answers[j]})` : ""}`}
                        className={cn("h-8 w-8 border-l border-t border-line/60 text-center text-xs font-bold tabular-nums", STATUS_CELL[st])}
                      >
                        {cellText(st, r.answers[j])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="sticky left-0 z-10 border-t-2 border-line bg-panel" />
                <td className="hidden border-t-2 border-line bg-panel md:table-cell" />
                <td className="sticky left-8 z-10 border-r border-t-2 border-line bg-panel px-2 py-2 text-xs font-bold text-ink">Гүйцэтгэл %</td>
                <td className="border-t-2 border-line bg-panel" />
                <td className="border-t-2 border-line bg-panel" />
                {group.items.map((s) => (
                  <td
                    key={s.number}
                    className={cn("h-8 border-l border-t-2 border-line text-center text-[11px] font-bold tabular-nums", TONE_CELL[toneOf(s.pct)])}
                  >
                    {s.pct ?? ""}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      <Legend topics={by === "topic" ? [...new Set(items.flatMap((i) => (i.topic ? [i.topic] : [])))] : null} />

      <Card>
        <h3 className="mb-3 font-bold text-brand-soft">{label.by} — гүйцэтгэл %</h3>
        <AreaBars areas={groupBy} compare={new Map(overallBy.map((a) => [a.area, a.pct]))} compareLabel="төв" />
      </Card>
      {by === "topic" && group.areas.length > 1 && (
        <Card>
          <h3 className="mb-3 font-bold text-brand-soft">{CLASSIFY_LABEL.area.by} — гүйцэтгэл %</h3>
          <AreaBars areas={group.areas} compare={new Map(board.overall.areas.map((a) => [a.area, a.pct]))} compareLabel="төв" />
        </Card>
      )}
    </div>
  );
}

function Legend({ topics }: { topics: string[] | null }) {
  const items = [
    { st: "CORRECT", text: "1", label: "зөв" },
    { st: "WRONG", text: "B", label: "буруу (сонгосон хариу, 1/0 файлд 0)" },
    { st: "BLANK", text: "", label: "хариулаагүй" },
    { st: "MULTI", text: "*", label: "давхар будсан" },
  ] as const;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-dim">
      {items.map((x) => (
        <span key={x.st} className="inline-flex items-center gap-1.5">
          <span className={cn("inline-flex size-5 items-center justify-center rounded text-[11px] font-bold", STATUS_CELL[x.st])}>{x.text}</span>
          {x.label}
        </span>
      ))}
      <Badge tone="neutral" className="font-normal">
        {topics
          ? `Толгойн товчлол: ${topics.map((t) => `${topicShort(t)} — ${t}`).join(", ")}`
          : "Толгойн товчлол: ТТ, Ал, Ан, ГТ, МС — агуулга"}
      </Badge>
    </div>
  );
}
