"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Download } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { csvFilename, downloadCsv } from "@/components/registry/csv";
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
  // Шүүлтүүр: дэлгэц ба CSV хоёр ижил (GET /payments, GET /payments/export/csv)
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  const rangeInvalid = !!from && !!to && from > to;
  const qs = useMemo(() => {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (month) q.set("month", month);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const text = q.toString();
    return text ? `?${text}` : "";
  }, [status, month, from, to]);
  const filtered = qs !== "";

  const load = useCallback(() => {
    if (rangeInvalid) return;
    api<Payment[]>(`/payments${qs}`)
      .then((d) => {
        setRows(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)));
  }, [qs, rangeInvalid]);
  useEffect(load, [load]);

  async function exportCsv() {
    if (exporting || rangeInvalid) return;
    setExporting(true);
    try {
      const csv = await api<string>(`/payments/export/csv${qs}`, { responseType: "text" });
      downloadCsv(csvFilename("tolbor"), csv);
      toast.success("CSV татагдлаа");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setExporting(false);
    }
  }

  const control =
    "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand";

  return (
    <section className="space-y-3">
      <div className="chunky grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4" role="group" aria-label="Төлбөрийн шүүлтүүр">
        <label className="block text-xs font-semibold text-ink-dim">
          Төлөв
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${control} mt-1`}>
            <option value="">Бүх төлөв</option>
            {Object.entries(STATUS_LABEL).map(([key, st]) => (
              <option key={key} value={key}>
                {st.text}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs font-semibold text-ink-dim">
          Аль сарын төлбөр
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={`${control} mt-1`} />
        </label>
        <label className="block text-xs font-semibold text-ink-dim">
          Төлсөн огноо, эхлэх
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={`${control} mt-1`} />
        </label>
        <label className="block text-xs font-semibold text-ink-dim">
          Төлсөн огноо, дуусах
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={`${control} mt-1`} />
        </label>
        {rangeInvalid && (
          <p role="alert" className="text-sm text-error sm:col-span-2 lg:col-span-4">
            Эхлэх огноо дуусах огнооноос өмнө байна
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11"
            onClick={() => {
              setStatus("");
              setMonth("");
              setFrom("");
              setTo("");
            }}
          >
            Шүүлтүүр цэвэрлэх
          </Button>
        )}
        <Button variant="outline" className="min-h-11" onClick={() => void exportCsv()} disabled={exporting || rangeInvalid}>
          <Download aria-hidden /> {exporting ? "Татаж байна" : "CSV татах"}
        </Button>
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
        <EmptyState
          title="Төлбөрийн түүх алга"
          hint={filtered ? "Шүүлтүүрээ өөрчилж үзнэ үү" : undefined}
        />
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
