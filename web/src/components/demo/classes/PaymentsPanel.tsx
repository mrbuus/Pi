"use client";

import { CircleCheck, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { TUITION_PLAN_LABEL, fmtMoney } from "../world";
import { Legend, LegendItem, PAY_META, PayBadge, ScoreBar, Segmented, StudentLink } from "./common";
import type { StudentStat } from "./stats";

const FIRST = 12;

function Total({ label, value, hint, danger }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-3 py-2.5 sm:block sm:px-4 sm:py-3">
      <p className="col-start-1 row-start-1 text-xs font-semibold text-ink-dim">{label}</p>
      <p className={cn("col-start-2 row-span-2 row-start-1 font-display text-base font-bold tabular-nums sm:mt-0.5 sm:text-lg", danger ? "text-error" : "text-ink")}>{value}</p>
      <p className="col-start-1 row-start-2 text-xs text-ink-dim">{hint}</p>
    </div>
  );
}

/** Ангийн төлбөрийн нэгтгэл ба сурагч тус бүрийн байдал — зөвхөн Багш+ эрхтэй хэрэглэгчид */
export default function PaymentsPanel({ rows }: { rows: StudentStat[] }) {
  const [onlyDue, setOnlyDue] = useState(true);
  const [all, setAll] = useState(false);

  const sum = useMemo(() => {
    const t = { expected: 0, paid: 0, outstanding: 0, paidN: 0, partialN: 0, unpaidN: 0 };
    for (const r of rows) {
      t.expected += r.pay.expected;
      t.paid += r.pay.paid;
      t.outstanding += r.pay.outstanding;
      if (r.pay.status === "paid") t.paidN++;
      else if (r.pay.status === "partial") t.partialN++;
      else t.unpaidN++;
    }
    return t;
  }, [rows]);

  const list = useMemo(
    () =>
      rows
        .filter((r) => !onlyDue || r.pay.outstanding > 0)
        .sort((a, b) => b.pay.outstanding - a.pay.outstanding || a.student.index - b.student.index),
    [rows, onlyDue],
  );
  const shown = all ? list : list.slice(0, FIRST);
  const dueN = sum.partialN + sum.unpaidN;

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-dim">
        <Lock className="size-3.5" aria-hidden />
        Зөвхөн Багш+ эрхтэй хэрэглэгч харна
      </p>

      <div className="grid divide-y divide-line overflow-hidden rounded-xl border border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Total label="Төлөх нийт" value={fmtMoney(sum.expected)} hint={`${rows.length} сурагч`} />
        <Total label="Төлсөн" value={fmtMoney(sum.paid)} hint={`${sum.paidN} сурагч бүрэн төлсөн`} />
        <Total label="Дутуу" value={fmtMoney(sum.outstanding)} hint={`${dueN} сурагч`} danger={sum.outstanding > 0} />
      </div>

      <Segmented
        label="Жагсаалтын шүүлт"
        value={onlyDue ? "due" : "all"}
        onChange={(v) => {
          setOnlyDue(v === "due");
          setAll(false);
        }}
        options={[
          { value: "due", label: `Дутуу (${dueN})` },
          { value: "all", label: `Бүгд (${rows.length})` },
        ]}
        className="mb-1 mt-4"
      />

      {list.length === 0 ? (
        <EmptyState icon={CircleCheck} title="Бүх сурагч төлбөрөө төлсөн" hint="Дутуу төлбөртэй сурагч алга" />
      ) : (
        <ul className="divide-y divide-line">
          {shown.map((r) => (
            <li
              key={r.student.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3 sm:grid-cols-[minmax(0,1.2fr)_6.5rem_minmax(0,1.2fr)_10.5rem_6.5rem] sm:gap-y-0 sm:py-2.5"
            >
              <span className="min-w-0 truncate sm:order-1">
                <StudentLink id={r.student.id} className="text-sm">
                  {r.student.name}
                </StudentLink>
              </span>
              <span className="justify-self-end sm:order-5">
                <PayBadge status={r.pay.status} />
              </span>
              <span className="text-xs text-ink-dim sm:order-2 sm:text-sm">{TUITION_PLAN_LABEL[r.pay.plan]}</span>
              <span className={cn("justify-self-end whitespace-nowrap text-sm font-semibold tabular-nums sm:order-4", r.pay.outstanding > 0 ? "text-error" : "text-ink-dim")}>
                {r.pay.outstanding > 0 ? `Дутуу ${fmtMoney(r.pay.outstanding)}` : "Дутуу байхгүй"}
              </span>
              <span className="col-span-2 sm:order-3 sm:col-span-1">
                <ScoreBar value={Math.round((r.pay.paid / r.pay.expected) * 100)} className="h-1.5" />
                <span className="mt-1 block text-xs tabular-nums text-ink-dim">
                  {fmtMoney(r.pay.paid)} / {fmtMoney(r.pay.expected)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {list.length > FIRST && (
        <div className="mt-3 flex justify-center">
          <Button variant="outline" onClick={() => setAll((v) => !v)} className="min-h-11">
            {all ? "Эхний 12-ыг харуулах" : `Бүгдийг харах (${list.length})`}
          </Button>
        </div>
      )}

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
