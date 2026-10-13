"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { Field, inputCls, Segmented } from "./LedgerDialog";
import { mnt } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";
import type { PlanKind, StudentLedger } from "./ledgerTypes";

/** Багц, дүн, суж эхэлсэн өдрийг засна (PATCH /users/:id/profile — Багш+/Админ). */
export default function PlanDialog({
  data,
  onClose,
  onSaved,
}: {
  data: StudentLedger;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { row, tier } = data;
  const priceOf = (k: PlanKind) =>
    k === "MONTHLY" ? tier.monthly : k === "FULL_YEAR" ? tier.fullYear : (tier.installment ?? tier.fullYear);
  const [kind, setKind] = useState<PlanKind>(row.plan.kind);
  const [amount, setAmount] = useState(String(kind === "MONTHLY" ? row.plan.fee : row.plan.total || priceOf(kind)));
  const [start, setStart] = useState(row.startDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount.replace(/\D/g, "")) || 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api(`/users/${encodeURIComponent(row.id)}/profile`, {
        method: "PATCH",
        body: { tuitionPlan: kind, tuitionAmount: value || priceOf(kind), ...(start ? { joinedOn: start } : {}) },
      });
      toast.success("Багц хадгалагдлаа");
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerDialog open onOpenChange={(o) => !o && onClose()} title="Төлбөрийн багц" description={`${row.firstName} ${row.lastName} — ${tier.label}`}>
      <form onSubmit={submit} className="space-y-4">
        <Segmented<PlanKind>
          label="Багц"
          value={kind}
          onChange={(k) => {
            setKind(k);
            setAmount(String(priceOf(k)));
          }}
          options={[
            { value: "MONTHLY", label: "Сар бүр" },
            { value: "FULL_YEAR", label: "Бүтэн жил" },
            ...(tier.installment ? [{ value: "INSTALLMENT" as PlanKind, label: "Хагас жил" }] : []),
          ]}
        />
        <Field
          label={kind === "MONTHLY" ? "Сарын төлбөр" : "Жилийн нийт дүн"}
          htmlFor="plan-amount"
          hint={
            kind === "INSTALLMENT" && tier.installmentFirst
              ? `Эхний төлбөр ${mnt(tier.installmentFirst)} 12-р сар хүртэл, үлдэгдэл 12/20-нд`
              : `Үнийн жагсаалт: ${mnt(priceOf(kind))}`
          }
        >
          <input
            id="plan-amount"
            inputMode="numeric"
            value={value ? value.toLocaleString("en-US") : amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
            className={`${inputCls} font-semibold tabular-nums`}
          />
        </Field>
        <Field label="Сууж эхэлсэн өдөр" htmlFor="plan-start">
          <input id="plan-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} className={inputCls} />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Хадгалж байна" : "Хадгалах"}
        </Button>
      </form>
    </LedgerDialog>
  );
}
