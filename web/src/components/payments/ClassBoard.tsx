"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Users } from "lucide-react";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { Button } from "@/components/ui/kit/button";
import InfoHint from "@/components/ui/InfoHint";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import LedgerList from "./LedgerList";
import { BlockLegend } from "./MonthBlocks";
import { millions, mnt, monthName } from "./ledgerFormat";
import { downloadLedgerCsv } from "./ledgerCsv";
import { errMsg } from "./paymentHelpers";
import type { LedgerBoard, LedgerRow } from "./ledgerTypes";

type Filter = "all" | "owed" | "notes";

/** Нэг ангийн сурагчид — сар бүрийн блок, шүүлтүүр, блок дээр дарж бүртгэх. */
export default function ClassBoard({ id }: { id: string }) {
  const [data, setData] = useState<LedgerBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

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
    for (const r of data.rows) {
      const b = r.blocks[idx];
      if (b && b.state !== "OFF") {
        expected += b.due;
        covered += b.paid;
      }
    }
    const owed = data.rows.filter((r) => r.owedNow > 0);
    return {
      expected,
      covered,
      owed: owed.length,
      owedNow: owed.reduce((s, r) => s + r.owedNow, 0),
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

  const rows =
    filter === "owed"
      ? data.rows.filter((r) => r.owedNow > 0)
      : filter === "notes"
        ? data.rows.filter((r) => r.notes.count > 0)
        : data.rows;
  const chips: { key: Filter; label: string; n: number }[] = [
    { key: "all", label: "Бүгд", n: data.rows.length },
    { key: "owed", label: "Өртэй", n: stats.owed },
    { key: "notes", label: "Тэмдэглэлтэй", n: stats.notes },
  ];

  return (
    <div className="space-y-4">
      <Link href="/app/payments" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Төлбөр
      </Link>
      <header className="chunky flex flex-wrap items-end justify-between gap-4 p-4 sm:p-5">
        <div>
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
              {millions(stats.covered)} <span className="font-normal text-ink-dim">/ {millions(stats.expected)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-ink-dim">Нийт өр</dt>
            <dd className={`font-bold tabular-nums ${stats.owedNow ? "text-error" : "text-ink"}`}>{mnt(stats.owedNow)}</dd>
          </div>
        </dl>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Шүүлтүүр" className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              role="radio"
              aria-checked={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={`min-h-11 rounded-xl border px-3 text-sm font-semibold transition ${
                filter === c.key ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-dim hover:text-ink"
              }`}
            >
              {c.label} <span className="tabular-nums">{c.n}</span>
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="ml-auto min-h-11"
          disabled={rows.length === 0}
          onClick={() => downloadLedgerCsv(rows, data.year, "tolbor-angi")}
        >
          <Download aria-hidden /> CSV татах
        </Button>
        <InfoHint label="Блокийн тайлбар">
          <BlockLegend />
        </InfoHint>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={filter === "owed" ? "Өртэй сурагч алга" : "Тэмдэглэлтэй сурагч алга"} />
      ) : (
        <LedgerList rows={rows} year={data.year} current={data.month} onPaid={replace} />
      )}
    </div>
  );
}
