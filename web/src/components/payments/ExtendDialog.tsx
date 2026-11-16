"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { Field, inputCls, Segmented } from "./LedgerDialog";
import { addDays, dayLabel, monthName, periodLabel, stampLabel } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";
import type { StudentLedger } from "./ledgerTypes";

const REASONS = ["Өвчтэй байсан", "Чөлөө авсан", "Төв ажиллаагүй (засвар, амралт)", "Бусад"];

/**
 * Сар бүрийн төлбөрийн хугацаа сунгах (эзэн 2026-11-12): сонгосон сарын төлөх өдөр N хоногоор
 * хойшилж, дараагийн бүх сар дагаж шилжинэ. Хэмжээ хязгааргүй, шалтгаан заавал. Цуцалж болно.
 * «Ирээгүй хугацаа» (эзэн 2026-11-16): X–Y өдөр огт ирээгүй → хоног = Y − X + 1, тэр хугацааг
 * агуулсан сарын дараагийн төлөх өдрөөс эхлэн хойшилно (сервер ledger.ts gapTarget-аар тооцно).
 */
const span = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
export default function ExtendDialog({ data, onClose, onSaved }: { data: StudentLedger; onClose: () => void; onSaved: () => void }) {
  const r = data.row;
  const months = r.blocks.filter((b) => b.state !== "OFF");
  const firstOpen = months.find((b) => b.state !== "PAID") ?? months[0];
  const [mode, setMode] = useState<"gap" | "days">("gap");
  const [month, setMonth] = useState(firstOpen?.month ?? "");
  const [days, setDays] = useState("");
  const [gapFrom, setGapFrom] = useState("");
  const [gapTo, setGapTo] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gapOk = !!gapFrom && !!gapTo && gapTo >= gapFrom;
  // Ирээгүй хугацааг агуулсан сарын дараагийн сар (серверийн gapTarget-тай ижил)
  const gapMonth = (() => {
    if (!gapOk) return null;
    const live = months.filter((b) => b.period);
    if (!live.length) return null;
    if (gapFrom < live[0].period!.from) return live[0].month;
    const i = live.findIndex((b) => gapFrom >= b.period!.from && gapFrom < b.period!.to);
    return i >= 0 ? (live[i + 1]?.month ?? null) : null;
  })();
  const n = mode === "gap" ? (gapOk ? span(gapFrom, gapTo) : 0) : Number(days) || 0;
  const target = mode === "gap" ? gapMonth : month;
  const text = reason === "Бусад" ? other.trim() : reason;
  const block = months.find((b) => b.month === target);
  // Урьдчилан харах: тэр сарын шинэ хугацаа
  const preview =
    block?.period && n > 0
      ? (() => {
          const add = (d: string) => addDays(d, n);
          return `${monthName(block.month)}: ${dayLabel(block.period.from)} – ${dayLabel(block.period.to)} → ${dayLabel(add(block.period.from))} – ${dayLabel(add(block.period.to))}`;
        })()
      : null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/payments/ledger/student/${encodeURIComponent(r.id)}/extensions`, {
        method: "POST",
        body: mode === "gap" ? { gapFrom, gapTo, reason: text } : { month, days: n, reason: text },
      });
      toast.success(`${target ? monthName(target) : "Дараагийн сар"}аас хойших төлөх өдрийг ${n} хоногоор хойшлууллаа`);
      onSaved();
      onClose();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await api(`/payments/ledger/student/${encodeURIComponent(r.id)}/extensions/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success("Сунгалтыг цуцаллаа");
      onSaved();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <LedgerDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Төлбөрийн хугацаа сунгах"
      description="Хүүхэд ирээгүй хоногоор дараагийн төлөх өдөр хойшилж, түүнээс хойших бүх сар дагаж шилжинэ"
      footer={
        <Button onClick={save} disabled={busy || !target || n < 1 || !text} className="w-full sm:w-auto">
          {busy ? "Хадгалж байна" : "Сунгах"}
        </Button>
      }
    >
      <div className="space-y-4">
        <Segmented<"gap" | "days">
          label="Хэрхэн оруулах"
          value={mode}
          onChange={setMode}
          options={[
            { value: "gap", label: "Ирээгүй өдрүүд" },
            { value: "days", label: "Хоногоор" },
          ]}
        />
        {mode === "gap" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ирээгүй эхэлсэн" htmlFor="ext-gap-from">
                <input id="ext-gap-from" type="date" value={gapFrom} onChange={(e) => setGapFrom(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Хүртэл" htmlFor="ext-gap-to">
                <input id="ext-gap-to" type="date" min={gapFrom || undefined} value={gapTo} onChange={(e) => setGapTo(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <p className="text-sm text-ink-dim" aria-live="polite">
              {!gapFrom || !gapTo
                ? "Хүүхэд огт ирээгүй эхний ба сүүлийн өдрийг сонгоно уу"
                : !gapOk
                  ? "Дуусах өдөр эхлэхээс өмнө байна"
                  : !gapMonth
                    ? `${n} хоног. Энэ хугацааны дараа шилжих сар алга`
                    : `${n} хоног, ${preview ?? monthName(gapMonth)}`}
            </p>
          </>
        ) : (
          <>
        <Field label="Аль сараас" htmlFor="ext-month">
          <select id="ext-month" value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
            {months.map((b) => (
              <option key={b.month} value={b.month}>
                {monthName(b.month)}
                {b.period ? ` (${periodLabel(b)})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Хэдэн хоног" htmlFor="ext-days" hint={preview ?? undefined}>
          <input
            id="ext-days"
            inputMode="numeric"
            value={days}
            onChange={(e) => setDays(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className={`${inputCls} tabular-nums`}
          />
        </Field>
          </>
        )}
        <Field label="Шалтгаан" htmlFor="ext-reason">
          <select id="ext-reason" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls}>
            {REASONS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        {reason === "Бусад" && (
          <input aria-label="Шалтгаан бичих" value={other} onChange={(e) => setOther(e.target.value.slice(0, 300))} placeholder="Шалтгаанаа бичнэ үү" className={inputCls} />
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        {!!data.extensions?.length && (
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">Өмнөх сунгалтууд</p>
            <ul className="divide-y divide-line rounded-xl border border-line text-sm">
              {data.extensions.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink">
                      {monthName(e.month)} +{e.days} хоног
                    </span>
                    {e.gapFrom && e.gapTo && (
                      <span className="block text-xs text-ink-dim">
                        Ирээгүй {dayLabel(e.gapFrom)} – {dayLabel(e.gapTo)}
                      </span>
                    )}
                    <span className="block truncate text-xs text-ink-dim">
                      {e.reason}, {e.authorName ?? "?"}, {stampLabel(e.at).slice(0, 5)}
                    </span>
                  </span>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => remove(e.id)} aria-label={`${monthName(e.month)}-ын сунгалтыг цуцлах`}>
                    <Trash2 aria-hidden /> Цуцлах
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </LedgerDialog>
  );
}
