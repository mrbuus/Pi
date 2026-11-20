"use client";

import { Clock, Target } from "lucide-react";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { dayText, itemName, scoreText, STATUS_CELL, STATUS_LABEL, type MyPaperBasic } from "./types";

type Tab = "result" | "guide" | "material" | "ranking";
const TABS: [Tab, string][] = [
  ["result", "Задаргаа"],
  ["guide", "Бодлого"],
  ["material", "Материал"],
  ["ranking", "Жагсаалт"],
];

/**
 * Дэлгэрэнгүй нээгээгүй нэгдсэн шалгалт (эзэн 2026-11-20, Нэгдсэн шалгалт 2): сурагч
 * зөвхөн оноо, бодлого бүрийн зөв/буруугаа харна. Бусад таб «Тун удахгүй».
 */
export default function StudentPaperBasic({
  data,
  tab,
  onTab,
  back,
}: {
  data: MyPaperBasic;
  tab: Tab;
  onTab: (t: Tab) => void;
  back: React.ReactNode;
}) {
  const me = data.me;
  const correct = me.items.filter((i) => i.status === "CORRECT").length;
  const graded = me.items.filter((i) => i.status !== "UNGRADED").length;
  return (
    <div className="space-y-4">
      {back}
      <div>
        <h1 className="cyrillic-heading font-display text-2xl font-bold text-ink">{data.exam.title}</h1>
        <Meta className="mt-1 text-sm text-ink-dim" items={[dayText(data.exam.heldOn), me.group, me.variant ? `${me.variant} хувилбар` : null]} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card padding="tight" className="text-center">
          <Target className="mx-auto mb-1 size-5 text-brand-soft" aria-hidden />
          <div className="font-display text-2xl font-bold tabular-nums text-ink">
            {scoreText(me.totalScore)}
            <span className="text-sm font-normal text-ink-dim">/{scoreText(me.maxScore)}</span>
          </div>
          <div className="text-xs text-ink-dim">оноо</div>
        </Card>
        <Card padding="tight" className="text-center">
          <div className="mx-auto mb-1 h-5" aria-hidden />
          <div className="font-display text-2xl font-bold tabular-nums text-ink">
            {correct}
            <span className="text-sm font-normal text-ink-dim">/{graded}</span>
          </div>
          <div className="text-xs text-ink-dim">зөв бодсон</div>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-line bg-panel p-1" role="tablist" aria-label="Хэсэг">
        {TABS.map(([t, text]) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => tab !== t && onTab(t)}
            className={cn("min-h-11 rounded-xl px-1 text-sm font-semibold", tab === t ? "bg-brand text-on-brand" : "text-ink-dim hover:text-ink")}
          >
            {text}
          </button>
        ))}
      </div>

      {tab === "result" ? (
        <Card>
          <h2 className="mb-3 font-bold text-brand-soft">Бодлогууд</h2>
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-1.5">
            {me.items.map((i) => (
              <li key={i.number} className={cn("rounded-lg px-2 py-1.5 text-xs", STATUS_CELL[i.status])}>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="truncate font-bold tabular-nums">{itemName(i, me.items)}</span>
                  <span className="tabular-nums opacity-80">
                    {i.earned}/{i.points}
                  </span>
                </div>
                <div className="truncate text-[10px] opacity-80">{STATUS_LABEL[i.status]}</div>
              </li>
            ))}
          </ol>
        </Card>
      ) : (
        <Card className="py-10 text-center">
          <Clock className="mx-auto mb-2 size-8 text-brand-soft" aria-hidden />
          <p className="font-semibold text-ink">Тун удахгүй</p>
          <p className="mt-1 text-sm text-ink-dim">Энэ хэсэг удахгүй нээгдэнэ</p>
        </Card>
      )}
    </div>
  );
}
