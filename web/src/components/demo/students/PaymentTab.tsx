"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { Legend, LegendItem, PAY_META, PayBadge, ScoreBar } from "../classes/common";
import { dotDate } from "../classes/format";
import { TUITION_PLAN_LABEL, fmtMoney, monthlyFee, type DemoStudent, type PaymentSummary } from "../world";

function Figure({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-xs font-semibold text-ink-dim">{label}</p>
      <p className={cn("mt-0.5 font-display text-base font-bold tabular-nums sm:text-lg", danger ? "text-error" : "text-ink")}>{value}</p>
    </div>
  );
}

/** Сурагчийн төлбөр: хэлбэр, төлөх, төлсөн, дутуу — зөвхөн Багш+ эрхтэй хэрэглэгчид */
export default function PaymentTab({ student, pay }: { student: DemoStudent; pay: PaymentSummary }) {
  const share = Math.round((pay.paid / pay.expected) * 100);
  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-dim">
        <Lock className="size-3.5" aria-hidden />
        Зөвхөн Багш+ эрхтэй хэрэглэгч харна
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {TUITION_PLAN_LABEL[pay.plan]}
          <span className="font-normal text-ink-dim"> (сарын төлбөр {fmtMoney(monthlyFee(student))})</span>
        </p>
        <PayBadge status={pay.status} />
      </div>

      <div className="mt-3">
        <ScoreBar value={share} className="h-2.5" />
        <p className="mt-1 text-xs tabular-nums text-ink-dim">{share}% төлөгдсөн</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Figure label="Төлөх нийт" value={fmtMoney(pay.expected)} />
        <Figure label="Төлсөн" value={fmtMoney(pay.paid)} />
        <Figure label="Дутуу" value={fmtMoney(pay.outstanding)} danger={pay.outstanding > 0} />
      </div>

      <p className="mt-4 text-sm text-ink-dim">
        Сүүлд төлсөн: <span className="font-medium text-ink">{pay.lastPaidOn ? dotDate(pay.lastPaidOn) : "төлбөр бүртгэгдээгүй"}</span>
      </p>

      <Legend>
        {(Object.keys(PAY_META) as Array<keyof typeof PAY_META>).map((k) => (
          <LegendItem key={k}>
            <PayBadge status={k} />
          </LegendItem>
        ))}
      </Legend>
    </div>
  );
}
