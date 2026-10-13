"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { formatMnt, TUITION } from "@/lib/orgInfo";
import LedgerDialog from "./LedgerDialog";

/** Сургалтын төлбөрийн үнийн жагсаалт (өмнөх «Лавлагаа» таб) — товч дээр нээгдэнэ. */
export default function PriceReference() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:border-brand"
      >
        <Tags className="h-4 w-4 text-ink-dim" aria-hidden /> Үнэ
      </button>
      <LedgerDialog open={open} onOpenChange={setOpen} title="Сургалтын төлбөр 2026–2027">
        <div className="space-y-4">
          {TUITION.map((tier) => (
            <div key={tier.id} className="rounded-2xl border border-line p-4">
              <p className="mb-2 text-sm font-semibold text-ink">{tier.label}</p>
              <dl className="space-y-1.5">
                {tier.plans.map((plan) => (
                  <div key={plan.kind} className="flex items-center justify-between gap-3 text-sm">
                    <dt className="text-ink-dim">{plan.label}</dt>
                    <dd className="font-semibold tabular-nums text-ink">{formatMnt(plan.amount)}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-ink-dim">Хуваан: эхний төлбөр</dt>
                  <dd className="font-semibold tabular-nums text-ink">
                    {formatMnt(tier.installment.firstPayment)}, үлдэгдэл {tier.installment.deadline}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
          <div className="rounded-2xl border border-line p-4">
            <p className="mb-2 text-sm font-semibold text-ink">Нийгэм</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-dim">Бүтэн жил</dt>
                <dd className="font-semibold tabular-nums text-ink">{formatMnt(1_500_000)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-ink-dim">Сар бүр</dt>
                <dd className="font-semibold tabular-nums text-ink">{formatMnt(300_000)}</dd>
              </div>
            </dl>
          </div>
        </div>
      </LedgerDialog>
    </>
  );
}
