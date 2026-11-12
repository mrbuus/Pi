"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, EyeOff } from "lucide-react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { staffName } from "@/lib/personName";
import { mnt, type BookClassRow, type BookDashboardResponse } from "./books";

/**
 * «Дотоод → Номын мөнгө» (эзэн 2026-11-12): ном бүрээр аль анги авсан, хэдэн
 * хүүхэд өгсөн, багш тус бүр хэдийг хураасан. Багш тоо, хувийг бүгдийг харна,
 * мөнгөн дүнгээс зөвхөн өөрийн хураасныг (сервер шүүнэ).
 */
export default function BookMoneyDashboard() {
  const [data, setData] = useState<BookDashboardResponse | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setData(await api<BookDashboardResponse>("/book-payments/dashboard"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Номын мөнгөний мэдээллийг ачаалж чадсангүй");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header>
        <h1 className="cyrillic-heading text-2xl font-extrabold tracking-tight text-ink">Номын мөнгө</h1>
        <p className="mt-1 text-sm text-ink-dim">Аль анги ямар ном авсан, хэдэн хүүхэд мөнгөө өгсөн, хэн хураасан</p>
      </header>

      {error && !data && <ErrorState message={error} onRetry={() => void load()} />}
      {!data && !error && <LoadingState rows={6} label="Номын мөнгө" />}
      {data && data.books.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="Номын чек нээгдээгүй байна"
          hint="Ангийн самбарын «Чек» хэсгээс номоо сонгож нээхэд энд нэгдэн гарна"
        />
      )}

      {data && data.collectors.length > 0 && (
        <section className="chunky p-4 md:p-6">
          <h2 className="mb-3 font-bold text-brand-soft">{data.seeAllMoney ? "Багш тус бүрийн хураасан" : "Миний хураасан"}</h2>
          <ul className="divide-y divide-line">
            {data.collectors.map((c, i) => (
              <li key={c.person?.id ?? i} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-ink">{staffName(c.person) ?? "Тодорхойгүй"}</span>
                  <Meta className="text-xs text-ink-dim" items={c.byBook.map((b) => `${b.title} ${b.count} хүүхэд, ${mnt(b.sum)}`)} />
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-display text-lg font-bold tabular-nums text-ink">{mnt(c.sum)}</span>
                  <span className="block text-xs text-ink-dim">{c.count} хүүхэд</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data?.books.map((b) => (
        <section key={b.key} className="chunky p-4 md:p-6">
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-bold text-ink">{b.title}</h2>
            <Meta
              className="text-sm text-ink-dim"
              items={[
                `${b.paid} хүүхэд өгсөн`,
                b.collected !== null ? mnt(b.collected) : null,
                b.noClassPaid > 0 ? `ангигүй ${b.noClassPaid}` : null,
              ]}
            />
          </div>
          <ul className="space-y-2">
            {b.classes.map((c) => (
              <li key={c.classroomId}>
                <ClassRow row={c} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function ClassRow({ row }: { row: BookClassRow }) {
  // Авахгүй хүүхдийг хуваарьт оруулахгүй: «өгөх ёстой» = нийт − авахгүй
  const due = row.total - row.skipped;
  const done = row.paidHere + row.paidElsewhere;
  const pct = due > 0 ? Math.round((done / due) * 100) : 0;
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="truncate font-semibold text-ink">{row.name || "Анги"}</span>
          {row.price !== null && <span className="shrink-0 text-sm tabular-nums text-ink-dim">{mnt(row.price)}</span>}
          {row.hidden && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-dim">
              <EyeOff className="h-3.5 w-3.5" aria-hidden /> нуусан
            </span>
          )}
        </span>
        {row.checkId ? (
          <>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-ink/10" aria-hidden>
              <span className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
            </span>
            <Meta
              className="mt-1 text-xs text-ink-dim"
              items={[
                <span key="n" className="font-semibold tabular-nums text-ink">
                  {done}/{due} өгсөн, {pct}%
                </span>,
                row.left > 0 ? <span key="l" className="font-semibold text-warning">{row.left} үлдсэн</span> : null,
                row.paidElsewhere > 0 ? `${row.paidElsewhere} нь өөр ангид төлсөн` : null,
                row.skipped > 0 ? `${row.skipped} авахгүй` : null,
                row.formerPaid > 0 ? `гарсан ${row.formerPaid} хүүхэд өгсөн` : null,
                row.collected !== null ? mnt(row.collected) : null,
              ]}
            />
          </>
        ) : (
          <Meta
            className="mt-1 text-xs text-ink-dim"
            items={[
              "Чек нээгээгүй",
              `${row.paidHere + row.formerPaid} хүүхэд өгсөн`,
              row.collected !== null ? mnt(row.collected) : null,
            ]}
          />
        )}
      </span>
      {!row.classArchived && <ChevronRight className="h-5 w-5 shrink-0 text-ink-dim" aria-hidden />}
    </>
  );
  const cls = "flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-left";
  return row.classArchived ? (
    <div className={cls}>{body}</div>
  ) : (
    <Link
      href={`/app/classes/${encodeURIComponent(row.classroomId)}#checks`}
      className={`${cls} row-interactive focus-visible:outline-2 focus-visible:outline-brand`}
    >
      {body}
    </Link>
  );
}
