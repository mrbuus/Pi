"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { Field, inputCls, Segmented } from "./LedgerDialog";
import { amountThrough, coverPreview, mnt, monthName, monthsRange, todayUB } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";
import type { LedgerRow } from "./ledgerTypes";

type Method = "BANK_TRANSFER" | "CASH";

/** UUID v4 — randomUUID нь LAN хаягаар (http) нээхэд байдаггүй тул getRandomValues-оор. */
function newRequestId(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Гараар төлбөр бүртгэх — дүн багцаас бөглөгдөнө, арга, өдөр, тэмдэглэл.
 * Хадгалахад шууд баталгаажна (POST /payments/ledger/student/:id/pay).
 * Дахин дарахад давхардахгүй: нэг цонхонд нэг clientRequestId.
 */
export default function PayDialog({
  row,
  month,
  onClose,
  onPaid,
}: {
  row: LedgerRow;
  month: string | null;
  onClose: () => void;
  onPaid: (row: LedgerRow) => void;
}) {
  const options = useMemo(() => {
    const out: { label: string; amount: number }[] = [];
    const add = (label: string, amount: number) => {
      if (amount > 0 && !out.some((o) => o.amount === amount)) out.push({ label, amount });
    };
    if (month) {
      const p = coverPreview(row.blocks, amountThrough(row.blocks, month));
      add(monthsRange([...p.full, ...(p.partial ? [p.partial] : [])]) || monthName(month), amountThrough(row.blocks, month));
    }
    if (row.nextDue) add(monthName(row.nextDue.month), row.nextDue.amount);
    if (row.owedNow > 0) add("Бүх өр", row.owedNow);
    add("Жилийн үлдэгдэл", row.remaining);
    return out.slice(0, 3);
  }, [row, month]);

  const [amount, setAmount] = useState(String(options[0]?.amount ?? row.plan.fee ?? ""));
  const [method, setMethod] = useState<Method>("BANK_TRANSFER");
  const [paidOn, setPaidOn] = useState(todayUB());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId] = useState(newRequestId);

  const value = Number(amount.replace(/\D/g, "")) || 0;
  const preview = coverPreview(row.blocks, value);
  const forMonth = preview.full[0] ?? preview.partial ?? row.nextDue?.month ?? month ?? undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value < 1000) {
      setError("Дүн 1,000₮-өөс багагүй байна");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ paymentId: string; row: LedgerRow }>(
        `/payments/ledger/student/${encodeURIComponent(row.id)}/pay`,
        {
          method: "POST",
          body: { amount: value, method, paidOn, forMonth, note: note.trim() || undefined, clientRequestId: requestId },
        },
      );
      toast.success(`${row.firstName}: ${mnt(value)} бүртгэгдлээ`);
      onPaid(res.row);
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerDialog
      open
      onOpenChange={(o) => !o && onClose()}
      title="Төлбөр бүртгэх"
      description={`${row.firstName} ${row.lastName}${row.classroom ? ` — ${row.classroom.name}` : ""}`}
    >
      <form id="pay-form" onSubmit={submit} className="space-y-4">
        <Field
          label="Дүн"
          htmlFor="pay-amount"
          hint={
            value > 0 &&
            (preview.full.length || preview.partial) && (
              <span>
                {preview.full.length > 0 && <>Хаагдах: {monthsRange(preview.full)}</>}
                {preview.partial && (
                  <>
                    {preview.full.length > 0 && ", "}
                    {monthName(preview.partial)} хэсэгчлэн
                  </>
                )}
              </span>
            )
          }
        >
          <input
            id="pay-amount"
            inputMode="numeric"
            autoComplete="off"
            value={value ? value.toLocaleString("en-US") : amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className={`${inputCls} text-lg font-bold tabular-nums`}
          />
          {options.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => setAmount(String(o.amount))}
                  aria-pressed={value === o.amount}
                  className={`min-h-11 rounded-lg border px-3 text-sm transition ${
                    value === o.amount ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-dim hover:text-ink"
                  }`}
                >
                  {o.label} <span className="font-semibold tabular-nums">{mnt(o.amount)}</span>
                </button>
              ))}
            </div>
          )}
        </Field>
        <Segmented<Method>
          label="Төлсөн арга"
          value={method}
          onChange={setMethod}
          options={[
            { value: "BANK_TRANSFER", label: "Данс" },
            { value: "CASH", label: "Бэлэн" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Төлсөн өдөр" htmlFor="pay-date">
            <input
              id="pay-date"
              type="date"
              value={paidOn}
              max={todayUB()}
              onChange={(e) => setPaidOn(e.target.value || todayUB())}
              className={inputCls}
            />
          </Field>
          <Field label="Тэмдэглэл" htmlFor="pay-note">
            <input id="pay-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className={inputCls} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving || value < 1000} className="w-full">
          {saving ? "Бүртгэж байна" : `${mnt(value)} бүртгэх`}
        </Button>
      </form>
    </LedgerDialog>
  );
}
