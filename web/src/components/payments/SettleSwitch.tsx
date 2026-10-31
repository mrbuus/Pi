"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import LedgerDialog, { Field, inputCls } from "./LedgerDialog";
import { stampLabel } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";
import type { LedgerRow, StudentLedger } from "./ledgerTypes";

/**
 * Жилийн төлбөрийн төлөв «Дутуу / Бүрэн» (эзэн 2026-10-31). Стандарт үнээс бага
 * төлсөн ч бүтэн жилд тооцогдох хүүхдийг (багшийн гэр бүл, тусгай тохиролцоо)
 * Багш+ гараар «Бүрэн» болгоно. ЗӨВХӨН төлөв — төлсөн дүн, гүйлгээнд хүрэхгүй.
 * Систем аль хэдийн бүрэн гэж тооцсон бол харагдахгүй (давхар мэдээлэл үгүй).
 */
export default function SettleSwitch({
  row,
  settlement,
  onChanged,
}: {
  row: LedgerRow;
  settlement: StudentLedger["settlement"];
  onChanged: () => void;
}) {
  const settled = row.plan.settled;
  const [open, setOpen] = useState<"full" | "auto" | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!settled && row.remaining === 0) return null;

  async function save(full: boolean) {
    setSaving(true);
    setError(null);
    try {
      await api(`/payments/ledger/student/${encodeURIComponent(row.id)}/settle`, {
        method: "POST",
        body: { full, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      toast.success(full ? "Бүтэн жилд тооцлоо" : "Системийн тооцоонд буцаалаа");
      setOpen(null);
      setNote("");
      onChanged();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  const option = (value: "auto" | "full", label: string) => {
    const on = value === "full" ? settled : !settled;
    return (
      <button
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => !on && setOpen(value)}
        className={`min-h-11 rounded-lg px-4 text-sm font-semibold transition ${
          on ? (value === "full" ? "bg-success text-on-success" : "bg-error/10 text-error") : "text-ink-dim hover:text-ink"
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-ink">Жилийн төлбөр</span>
        <div role="radiogroup" aria-label="Жилийн төлбөрийн төлөв" className="inline-flex rounded-xl border border-line p-0.5">
          {option("auto", "Дутуу")}
          {option("full", "Бүрэн")}
        </div>
        {settled && settlement && (
          <span className="text-xs text-ink-dim">
            <Meta items={["Гараар", settlement.authorName, stampLabel(settlement.at)]} />
          </span>
        )}
      </div>
      {settled && settlement?.note && <p className="whitespace-pre-wrap text-sm text-ink-dim">{settlement.note}</p>}

      <LedgerDialog
        open={open === "full"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Бүтэн жилд тооцох"
        description="Төлсөн дүн хэвээр, бүх сар «төлсөн» болно"
        footer={
          <Button onClick={() => save(true)} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Хадгалж байна" : "Бүрэн гэж тооцох"}
          </Button>
        }
      >
        <Field label="Тайлбар (заавал биш)" htmlFor="settle-note">
          <textarea
            id="settle-note"
            rows={2}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Багшийн хүүхэд"
            className={`${inputCls} min-h-16 resize-y`}
          />
        </Field>
        {error && (
          <p role="alert" className="mt-3 rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
      </LedgerDialog>

      <LedgerDialog
        open={open === "auto"}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Системийн тооцоонд буцаах"
        description="Анги 7 хоногт хэдэн өдөр ордгоор стандарт үнээр тооцогдож, дутуу бол «Дутуу» харагдана"
        footer={
          <Button variant="danger" onClick={() => save(false)} disabled={saving} className="w-full sm:w-auto">
            {saving ? "Хадгалж байна" : "Дутуу болгох"}
          </Button>
        }
      >
        {error ? (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : (
          <p className="text-sm text-ink-dim">Төлсөн дүн өөрчлөгдөхгүй</p>
        )}
      </LedgerDialog>
    </div>
  );
}
