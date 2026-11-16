"use client";

import { BackLink } from "@/components/layout/ContextNavigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Users } from "lucide-react";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { Button } from "@/components/ui/kit/button";
import InfoHint from "@/components/ui/InfoHint";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import LedgerList from "./LedgerList";
import { BlockLegend } from "./MonthBlocks";
import { isOwed, millions, mnt, monthName } from "./ledgerFormat";
import { downloadLedgerCsv } from "./ledgerCsv";
import { errMsg } from "./paymentHelpers";
import type { LedgerBoard, LedgerRow, PlanKind } from "./ledgerTypes";

type Filter = "all" | "owed" | "notes";
type KindFilter = "all" | PlanKind;
/** Багцаар ангилах (эзэн 2026-11-16): сар бүр / хагас жил (2 хувааж) / бүтэн жил */
const KIND_LABEL: Record<PlanKind, string> = { MONTHLY: "Сар бүр", INSTALLMENT: "Хагас жил", FULL_YEAR: "Бүтэн жил" };

/**
 * Нэг ангийн сурагчид — сар бүрийн блок, шүүлтүүр, блок дээр дарж бүртгэх.
 * `embedded` — ангийн самбарын «Төлбөр» таб дотор (буцах холбоос, ангийн нэр давхардуулахгүй).
 */
export default function ClassBoard({ id, embedded = false }: { id: string; embedded?: boolean }) {
  const [data, setData] = useState<LedgerBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [kind, setKind] = useState<KindFilter>("all");

  const load = useCallback(() => {
    api<LedgerBoard>(`/payments/ledger/board?classroomId=${encodeURIComponent(id)}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(load, [load]);

  const replace = (row: LedgerRow) =>
    setData((d) => (d ? { ...d, rows: d.rows.map((r) => (r.id === row.id ? row : r)) } : d));

  const stats = useMemo(() => {
    if (!data) return null;
    const idx = data.year.months.indexOf(data.month);
    let expected = 0;
    let covered = 0;
    let active = 0;
    let paid = 0;
    for (const r of data.rows) {
      const b = r.blocks[idx];
      if (b && b.state !== "OFF") {
        expected += b.due ?? 0;
        covered += b.paid ?? 0;
        active++;
        if (b.state === "PAID") paid++;
      }
    }
    const owed = data.rows.filter(isOwed);
    return {
      expected,
      covered,
      active,
      paid,
      owed: owed.length,
      owedNow: owed.reduce((s, r) => s + (r.owedNow ?? 0), 0),
      notes: data.rows.filter((r) => r.notes.count > 0).length,
    };
  }, [data]);

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data || !stats)
    return (
      <div className="space-y-4" role="status" aria-label="Ачаалж байна">
        <SkeletonCard className="h-28" />
        <SkeletonRows rows={8} />
      </div>
    );

  const byKind = kind === "all" ? data.rows : data.rows.filter((r) => r.plan.kind === kind);
  const rows =
    filter === "owed"
      ? byKind.filter(isOwed)
      : filter === "notes"
        ? byKind.filter((r) => r.notes.count > 0)
        : byKind;
  const chips: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "Бүгд", n: byKind.length },
    { key: "owed", label: "Өртэй", n: byKind.filter(isOwed).length },
    { key: "notes", label: "Тэмдэглэлтэй", n: byKind.filter((r) => r.notes.count > 0).length },
  ];
  const kindChips: { key: KindFilter; label: string; n: number }[] = [
    { key: "all", label: "Бүх багц", n: data.rows.length },
  ];
  for (const k of ["MONTHLY", "INSTALLMENT", "FULL_YEAR"] as const) {
    const n = data.rows.filter((r) => r.plan.kind === k).length;
    if (n > 0) kindChips.push({ key: k, label: KIND_LABEL[k], n });
  }
  const chipCls = (on: boolean) =>
    `min-h-11 rounded-xl border px-3 text-sm font-semibold transition ${
      on ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-dim hover:text-ink"
    }`;

  return (
    <div className="space-y-4">
      {!embedded && (
        <BackLink href="/app/payments" label="Төлбөр" />
      )}
      <header className={`flex flex-wrap items-end justify-between gap-4 ${embedded ? "rounded-2xl border border-line bg-surface px-4 py-3" : "chunky p-4 sm:p-5"}`}>
        <div className={embedded ? "hidden" : undefined}>
          <h1 className="cyrillic-heading flex items-center gap-2 text-2xl font-extrabold text-ink">
            <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: getClassroomColor(data.classroom!.id) }} />
            {data.classroom!.name}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-dim">
            <Users className="h-4 w-4" aria-hidden /> {data.rows.length} сурагч
          </p>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-xs text-ink-dim">{monthName(data.month)}</dt>
            <dd className="font-bold tabular-nums text-ink">
              {data.amountsHidden ? stats.paid : millions(stats.covered)}{" "}
              <span className="font-normal text-ink-dim">/ {data.amountsHidden ? `${stats.active} төлсөн` : millions(stats.expected)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-dim">{data.amountsHidden ? "Өртэй" : "Нийт өр"}</dt>
            <dd className={`font-bold tabular-nums ${stats.owed ? "text-error" : "text-ink"}`}>
              {data.amountsHidden ? `${stats.owed} сурагч` : mnt(stats.owedNow)}
            </dd>
          </div>
        </dl>
      </header>

      <div role="radiogroup" aria-label="Төлбөрийн багц" className="flex flex-wrap gap-1.5">
        {kindChips.map((c) => (
          <button key={c.key} type="button" role="radio" aria-checked={kind === c.key} onClick={() => setKind(c.key)} className={chipCls(kind === c.key)}>
            {c.label} <span className="tabular-nums">{c.n}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Шүүлтүүр" className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={chipCls(filter === c.key)}
            >
              {c.label} <span className="tabular-nums">{c.n}</span>
            </button>
          ))}
        </div>
        {/* Багш+ — дүнгүй тул CSV (сарын дүнтэй) татахгүй */}
        {!data.amountsHidden && (
          <Button
            variant="outline"
            className="ml-auto min-h-11"
            disabled={rows.length === 0}
            onClick={() => downloadLedgerCsv(rows, data.year, "tolbor-angi")}
          >
            <Download aria-hidden /> CSV татах
          </Button>
        )}
        <InfoHint label="Блокийн тайлбар">
          <BlockLegend />
        </InfoHint>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={filter === "owed" ? "Өртэй сурагч алга" : filter === "notes" ? "Тэмдэглэлтэй сурагч алга" : "Энэ багцтай сурагч алга"} />
      ) : (
        <LedgerList rows={rows} year={data.year} current={data.month} onPaid={replace} />
      )}
    </div>
  );
}
