"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { Field, inputCls } from "./LedgerDialog";
import { dayLabel, monthName, periodLabel, stampLabel } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";
import type { StudentLedger } from "./ledgerTypes";

const REASONS = ["Өвчтэй байсан", "Чөлөө авсан", "Төв ажиллаагүй (засвар, амралт)", "Бусад"];

/**
 * Сар бүрийн төлбөрийн хугацаа сунгах (эзэн 2026-11-12): сонгосон сарын төлөх өдөр N хоногоор
 * хойшилж, дараагийн бүх сар дагаж шилжинэ. Хэмжээ хязгааргүй, шалтгаан заавал. Цуцалж болно.
 */
export default function ExtendDialog({ data, onClose, onSaved }: { data: StudentLedger; onClose: () => void; onSaved: () => void }) {
  const r = data.row;
  const months = r.blocks.filter((b) => b.state !== "OFF");
  const firstOpen = months.find((b) => b.state !== "PAID") ?? months[0];
  const [month, setMonth] = useState(firstOpen?.month ?? "");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [other, setOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = Number(days) || 0;
  const text = reason === "Бусад" ? other.trim() : reason;
  const block = months.find((b) => b.month === month);
  // Урьдчилан харах: тэр сарын шинэ хугацаа
  const preview =
    block?.period && n > 0
      ? (() => {
          const add = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
          return `${dayLabel(block.period.from)} – ${dayLabel(block.period.to)} → ${dayLabel(add(block.period.from))} – ${dayLabel(add(block.period.to))}`;
        })()
      : null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/payments/ledger/student/${encodeURIComponent(r.id)}/extensions`, { method: "POST", body: { month, days: n, reason: text } });
      toast.success(`${monthName(month)}-ын хугацааг ${n} хоногоор сунгалаа`);
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
      description="Сонгосон сарын төлөх өдөр хойшилж, дараагийн бүх сар дагаж шилжинэ"
      footer={
        <Button onClick={save} disabled={busy || !month || n < 1 || !text} className="w-full sm:w-auto">
          {busy ? "Хадгалж байна" : "Сунгах"}
        </Button>
      }
    >
      <div className="space-y-4">
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
