"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Medal, Target, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import AreaBars from "./AreaBars";
import { dayText, orderedAreas, scoreText, STATUS_CELL, STATUS_LABEL, type MyPaperDetail } from "./types";

type Filter = "wrong" | "all";

/**
 * Сурагчийн өөрийн дүн (зөвхөн өөрөө харна): оноо, байр, агуулга бүрийн хувь,
 * алдсан бодлогууд агуулгаар; доор нь төвийн жагсаалт зөвхөн нийт оноогоор.
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

  const wrongByArea = useMemo(() => {
    if (!data) return [];
    const wrong = data.me.items.filter((i) => i.status === "WRONG" || i.status === "BLANK" || i.status === "MULTI");
    const by = new Map<string, typeof wrong>();
    for (const w of wrong) {
      const k = w.area ?? "Агуулга оноогоогүй";
      by.set(k, [...(by.get(k) ?? []), w]);
    }
    return orderedAreas([...by.keys()]).map((area) => ({ area, items: by.get(area)! }));
  }, [data]);

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonRows rows={6} />
      </div>
    );
  }
  const me = data.me;
  const center = new Map(data.center.areas.map((a) => [a.area, a.pct]));
  const wrongCount = wrongByArea.reduce((t, g) => t + g.items.length, 0);

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
          <h2 className="font-bold text-brand-soft">Агуулгаар</h2>
          {me.weak.length > 0 && (
            <span className="text-sm text-ink-dim">
              Анхаарах: <span className="font-semibold text-ink">{me.weak.join(", ")}</span>
            </span>
          )}
        </div>
        <AreaBars areas={me.areas} compare={center} compareLabel="төв" />
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold text-brand-soft">Бодлогууд</h2>
          <div className="flex gap-1" role="group" aria-label="Шүүлт">
            {(
              [
                ["wrong", `Алдсан ${wrongCount}`],
                ["all", "Бүгд"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                aria-pressed={filter === v}
                onClick={() => setFilter(v)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 text-sm font-semibold",
                  filter === v ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink-dim",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filter === "wrong" ? (
          wrongCount === 0 ? (
            <p className="text-sm text-ink-dim">Бүх бодлогыг зөв бодсон байна.</p>
          ) : (
            <div className="space-y-4">
              {wrongByArea.map((g) => (
                <div key={g.area}>
                  <h3 className="mb-2 text-sm font-bold text-ink">
                    {g.area} <span className="font-normal text-ink-dim">({g.items.length})</span>
                  </h3>
                  <ul className="flex flex-wrap gap-1.5">
                    {g.items.map((i) => (
                      <li key={i.number} className={cn("rounded-lg px-2.5 py-1.5 text-sm", STATUS_CELL[i.status])}>
                        <span className="font-bold tabular-nums">{i.number}</span>
                        <span className="ml-1.5 text-xs">
                          {i.answer ? `та ${i.answer}` : STATUS_LABEL[i.status].toLocaleLowerCase("mn-MN")}
                          {i.key ? `, зөв ${i.key}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        ) : (
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">
            {me.items.map((i) => (
              <li key={i.number} className={cn("rounded-lg px-2 py-1.5 text-xs", STATUS_CELL[i.status])} title={i.area ?? undefined}>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="font-bold tabular-nums">{i.number}</span>
                  {i.answer && <span className="font-bold">{i.answer}</span>}
                </div>
                <div className="truncate text-[10px] opacity-80">
                  {i.status === "WRONG" && i.key ? `зөв: ${i.key}` : STATUS_LABEL[i.status]}
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card padding="none" className="overflow-hidden">
        <h2 className="px-5 pt-4 font-bold text-brand-soft">Төвийн жагсаалт</h2>
        <p className="px-5 pb-2 text-xs text-ink-dim">Зөвхөн нийт оноо харагдана. Бусдын бодлого бүрийн дүн нууц.</p>
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
                    {r.isMe && <Badge tone="brand" className="ml-2">Та</Badge>}
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

function BackLink() {
  return (
    <Link href="/app/tests?tab=paper" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-dim hover:text-ink">
      <ArrowLeft className="size-4" aria-hidden /> Шалгалт
    </Link>
  );
}
