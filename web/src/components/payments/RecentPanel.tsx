"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import { Button } from "@/components/ui/kit/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import PaymentEditModal from "./PaymentEditModal";
import ReversePaymentModal from "./ReversePaymentModal";
import { studentHref } from "./LedgerRowItem";
import { dayLabel, mnt, monthName } from "./ledgerFormat";
import { METHOD_LABEL, STATUS_LABEL, errMsg } from "./paymentHelpers";
import type { Payment } from "./types";

/** Сүүлийн төлбөрүүд (бүх эх сурвалж) — засах (хүлээгдэж буй), буцаах (баталгаажсан). */
export default function RecentPanel() {
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [reversing, setReversing] = useState<Payment | null>(null);

  const load = useCallback(() => {
    api<Payment[]>("/payments")
      .then((d) => {
        setRows(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)));
  }, []);
  useEffect(load, [load]);

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <Link
          href="/app/tuition/refunds"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:border-brand"
        >
          <ClipboardList className="h-4 w-4 text-ink-dim" aria-hidden /> Буцаалтууд
        </Link>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows ? (
        <LoadingState rows={5} label="Төлбөрийн түүх" />
      ) : !rows.length ? (
        <EmptyState title="Төлбөрийн түүх алга" />
      ) : (
        <ul className="chunky divide-y divide-line p-1.5">
          {rows.slice(0, 50).map((p) => {
            const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-2.5 py-2.5">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.cls}`}>
                  <st.icon className="h-4 w-4" aria-label={st.text} />
                </span>
                <span className="min-w-0 flex-1">
                  {p.user ? (
                    <Link href={studentHref(p.user.id)} className="block truncate font-semibold text-ink hover:underline">
                      {p.user.firstName} {p.user.lastName}
                    </Link>
                  ) : (
                    <span className="block font-semibold text-ink">Тодорхойгүй</span>
                  )}
                  <span className="block text-xs text-ink-dim">
                    <Meta
                      items={[
                        dayLabel((p.paidAt ?? p.createdAt).slice(0, 10)),
                        METHOD_LABEL[p.method] ?? p.method,
                        p.forMonth ? monthName(p.forMonth) : null,
                        p.status !== "CONFIRMED" ? st.text : null,
                      ]}
                    />
                  </span>
                </span>
                <span className="font-bold tabular-nums text-ink">{mnt(p.amount)}</span>
                {p.status === "PENDING" && (
                  <Button size="sm" variant="outline" className="min-h-11" onClick={() => setEditing(p)}>
                    Засах
                  </Button>
                )}
                {p.status === "CONFIRMED" && (
                  <Button size="sm" variant="danger" className="min-h-11" onClick={() => setReversing(p)}>
                    Буцаах
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <PaymentEditModal
        open={!!editing}
        payment={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          toast.success("Төлбөр засагдлаа");
          load();
        }}
      />
      <ReversePaymentModal
        open={!!reversing}
        payment={reversing}
        onClose={() => setReversing(null)}
        onReversed={() => {
          toast.success("Төлбөр буцаагдлаа");
          load();
        }}
      />
    </section>
  );
}
