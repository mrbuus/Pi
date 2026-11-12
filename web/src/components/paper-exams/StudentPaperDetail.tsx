"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Medal, Sigma, Target, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import AreaBars from "./AreaBars";
import FormulaLine from "./FormulaLine";
import {
  CLASSIFY_LABEL,
  dayText,
  orderedAreas,
  scoreText,
  STATUS_CELL,
  STATUS_LABEL,
  type FormulaRef,
  type MyPaperDetail,
} from "./types";

type Filter = "wrong" | "all";
type MyItem = MyPaperDetail["me"]["items"][number];
const missed = (i: MyItem) => i.status === "WRONG" || i.status === "BLANK" || i.status === "MULTI";

/**
 * Сурагчийн өөрийн дүн (зөвхөн өөрөө харна): оноо, байр, сэдэв/агуулга бүрийн хувь,
 * алдсан бодлого бүрт ашиглах томьёо, давтах томьёоны жагсаалт; доор нь төвийн
 * жагсаалт зөвхөн нийт оноогоор.
 */
export default function StudentPaperDetail({ id }: { id: string }) {
  const [data, setData] = useState<MyPaperDetail | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("wrong");

  const load = useCallback(() => {
    api<MyPaperDetail>(`/paper-exams/my/${encodeURIComponent(id)}`)
      .then((d) => {
        setError("");
        setData(d);
      })
      .catch((e) => setError(errorText(e, "Дүнг ачаалж чадсангүй")));
  }, [id]);
  useEffect(load, [load]);

  const view = useMemo(() => {
    if (!data) return null;
    const by = data.classifyBy;
    const wrong = data.me.items.filter(missed);
    const groups = new Map<string, MyItem[]>();
    for (const w of wrong) {
      const k = (by === "topic" ? w.topic : w.area) ?? `${CLASSIFY_LABEL[by].one} оноогоогүй`;
      groups.set(k, [...(groups.get(k) ?? []), w]);
    }
    // Сэдэв — шалгалтын дарааллаар (Map оруулсан дарааллаа хадгална); агуулга — БҮТ-ийн дарааллаар
    const names = by === "topic" ? [...groups.keys()] : orderedAreas([...groups.keys()]);
    const formulaBy = new Map(data.formulas.map((f) => [f.slug, f]));
    // Давтах томьёо: алдсан бодлогуудад хамаарах, олон бодлогод орсон нь эхэнд
    const need = new Map<string, number[]>();
    for (const w of wrong) for (const slug of w.formulaSlugs) need.set(slug, [...(need.get(slug) ?? []), w.number]);
    const review = [...need.entries()]
      .flatMap(([slug, numbers]) => {
        const f = formulaBy.get(slug);
        return f ? [{ formula: f, numbers }] : [];
      })
      .sort((a, b) => b.numbers.length - a.numbers.length);
    return { by, wrong, groups: names.map((name) => ({ name, items: groups.get(name)! })), formulaBy, review };
  }, [data]);

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }
  if (!data || !view) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }
  const me = data.me;
  const label = CLASSIFY_LABEL[view.by];
  const mineBy = view.by === "topic" ? me.topics : me.areas;
  const centerBy = new Map((view.by === "topic" ? data.center.topics : data.center.areas).map((a) => [a.area, a.pct]));

  return (
    <div className="space-y-4">
      <BackLink />
      <div>
        <h1 className="cyrillic-heading font-display text-2xl font-bold text-ink">{data.exam.title}</h1>
        <Meta className="mt-1 text-sm text-ink-dim" items={[dayText(data.exam.heldOn), me.group, `${data.exam.itemCount} бодлого`]} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card padding="tight" className="text-center">
          <Target className="mx-auto mb-1 size-5 text-brand-soft" aria-hidden />
          <div className="font-display text-2xl font-bold tabular-nums text-ink">
            {scoreText(me.totalScore)}
            <span className="text-sm font-normal text-ink-dim">/{scoreText(me.maxScore)}</span>
          </div>
          <div className="text-xs text-ink-dim">оноо</div>
        </Card>
        <Card padding="tight" className="text-center">
          <Medal className="mx-auto mb-1 size-5 text-brand-soft" aria-hidden />
          <div className="font-display text-2xl font-bold tabular-nums text-ink">{me.pct ?? ""}%</div>
          <div className="text-xs text-ink-dim">төвийн дундаж {data.center.avgPct ?? ""}%</div>
        </Card>
        <Card padding="tight" className="text-center">
          <Trophy className="mx-auto mb-1 size-5 text-brand-soft" aria-hidden />
          <div className="font-display text-2xl font-bold tabular-nums text-ink">{me.rank}</div>
          <div className="text-xs text-ink-dim">{me.participants} сурагчаас</div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold text-brand-soft">{label.by}</h2>
          {me.weak.length > 0 && (
            <span className="text-sm text-ink-dim">
              Анхаарах: <span className="font-semibold text-ink">{me.weak.join(", ")}</span>
            </span>
          )}
        </div>
        <AreaBars areas={mineBy} compare={centerBy} compareLabel="төв" />
      </Card>

      {view.review.length > 0 && (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 font-bold text-brand-soft">
            <Sigma className="size-5" aria-hidden /> Давтах томьёо
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {view.review.map(({ formula, numbers }) => (
              <li key={formula.slug}>
                <FormulaLine formula={formula} link />
                <span className="mt-0.5 block text-xs text-ink-dim">
                  {numbers.length} бодлогод: {numbers.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-brand-soft">Бодлогууд</h2>
          <div className="flex gap-1" role="group" aria-label="Шүүлт">
            {(
              [
                ["wrong", `Алдсан ${view.wrong.length}`],
                ["all", "Бүгд"],
              ] as const
            ).map(([v, text]) => (
              <button
                key={v}
                aria-pressed={filter === v}
                onClick={() => setFilter(v)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 text-sm font-semibold",
                  filter === v ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink-dim",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </div>

        {filter === "wrong" ? (
          view.wrong.length === 0 ? (
            <p className="text-sm text-ink-dim">Бүх бодлогыг зөв бодсон байна.</p>
          ) : (
            <div className="space-y-5">
              {view.groups.map((g) => (
                <section key={g.name}>
                  <h3 className="mb-2 text-sm font-bold text-ink">
                    {g.name} <span className="font-normal text-ink-dim">({g.items.length})</span>
                  </h3>
                  <ul className="space-y-2">
                    {g.items.map((i) => (
                      <WrongItem key={i.number} item={i} formulaBy={view.formulaBy} showTopic={view.by !== "topic"} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )
        ) : (
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">
            {me.items.map((i) => (
              <li
                key={i.number}
                className={cn("rounded-lg px-2 py-1.5 text-xs", STATUS_CELL[i.status])}
                title={[i.topic, i.area].filter(Boolean).join(" — ") || undefined}
              >
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-bold tabular-nums">{i.number}</span>
                  {i.answer && <span className="font-bold">{i.answer}</span>}
                </div>
                <div className="truncate text-[10px] opacity-80">{i.status === "WRONG" && i.key ? `зөв: ${i.key}` : STATUS_LABEL[i.status]}</div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-5 pb-2 pt-4 font-bold text-brand-soft">Төвийн жагсаалт</h2>
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-panel text-left text-xs text-ink-dim">
              <tr>
                <th className="w-14 px-4 py-2 text-right">Байр</th>
                <th className="px-2 py-2">Нэр</th>
                <th className="px-2 py-2">Баг</th>
                <th className="px-4 py-2 text-right">Оноо</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking.map((r, i) => (
                <tr key={i} className={cn("border-t border-line", r.isMe && "bg-brand-bright/12 font-bold")} aria-current={r.isMe ? "true" : undefined}>
                  <td className="px-4 py-1.5 text-right tabular-nums">{r.rank}</td>
                  <td className="px-2 py-1.5 text-ink">
                    {r.name}
                    {r.isMe && (
                      <Badge tone="brand" className="ml-2">
                        Та
                      </Badge>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-ink-dim">{r.group}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums">
                    <span className="text-ink">{scoreText(r.totalScore)}</span>
                    <span className="text-xs text-ink-dim">/{scoreText(r.maxScore)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/** Алдсан нэг бодлого: дугаар, өөрийн/зөв хариу, төвийн гүйцэтгэл, ашиглах томьёо. */
function WrongItem({ item, formulaBy, showTopic }: { item: MyItem; formulaBy: Map<string, FormulaRef>; showTopic: boolean }) {
  const formulas = item.formulaSlugs.flatMap((s) => {
    const f = formulaBy.get(s);
    return f ? [f] : [];
  });
  return (
    <li className="rounded-xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={cn("inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-bold tabular-nums", STATUS_CELL[item.status])}>
          {item.number}
        </span>
        <span className="text-sm text-ink">
          {item.answer ? (
            <>
              Таны хариу <b>{item.answer}</b>
            </>
          ) : (
            STATUS_LABEL[item.status]
          )}
          {item.key && (
            <>
              , зөв хариу <b>{item.key}</b>
            </>
          )}
        </span>
        <Meta
          className="ml-auto text-xs text-ink-dim"
          items={[showTopic ? item.topic : null, item.centerPct !== null ? `төвийн ${item.centerPct}% зөв бодсон` : null]}
        />
      </div>
      {formulas.length > 0 && (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          {formulas.map((f) => (
            <FormulaLine key={f.slug} formula={f} compact link />
          ))}
        </div>
      )}
    </li>
  );
}

function BackLink() {
  return (
    <Link href="/app/tests?tab=paper" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-dim hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Шалгалт
    </Link>
  );
}
