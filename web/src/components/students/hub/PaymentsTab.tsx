"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { METHOD_LABEL, STATUS_LABEL } from "@/components/payments/paymentHelpers";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { formatMnDate } from "@/lib/dateMn";
import { TUITION_PLAN_LABEL, money, type StudentPaymentHistory, type StudentProfileLite } from "../types";

const PAGE = 10;

/**
 * «Төлбөр» таб (Багш+/Админ) — багц, нийт төлөх/төлсөн/үлдэгдэл, бүх төлбөрийн түүх.
 * Өмнө нь /app/admin/students/:id дээр байсныг энд нүүлгэв; өгөгдлийг хуудас
 * нэг удаа татаж хураангуйтай хуваалцана.
 */
export default function PaymentsTab({
  profile,
  status,
  data,
  error,
  onRetry,
}: {
  profile: StudentProfileLite | null;
  status: "loading" | "ready" | "error";
  data: StudentPaymentHistory | null | undefined;
  error: string;
  onRetry: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  if (status === "loading") return <LoadingState rows={4} label="Төлбөр" />;
  if (status === "error") return <ErrorState message={error} onRetry={onRetry} />;
  if (!data) return null;

  const rows = showAll ? data.payments : data.payments.slice(0, PAGE);
  const s = data.summary;

  return (
    <div className="space-y-4">
      <section className="chunky p-4 md:p-6">
        <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="font-bold text-brand-soft">Сургалтын төлбөр</h2>
          <Meta
            className="text-sm text-ink-dim"
            items={[
              data.tuitionPlan ? TUITION_PLAN_LABEL[data.tuitionPlan] : "Багц тодорхойгүй",
              profile?.tuitionNote,
            ]}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          <Stat label="Төлөх ёстой" value={money(s.expected)} />
          <Stat label="Төлсөн" value={money(s.totalPaid)} tone="text-success" />
          <Stat
            label="Үлдэгдэл"
            value={money(s.outstanding)}
            tone={s.outstanding > 0 ? "text-error" : "text-success"}
          />
        </div>
      </section>

      {data.payments.length === 0 ? (
        <EmptyState icon={Receipt} title="Төлбөр бүртгэгдээгүй" hint="Төлбөр орж ирэхэд энд түүхээрээ харагдана." />
      ) : (
        <section className="chunky p-4 md:p-6">
          <h2 className="mb-3 font-bold text-brand-soft">Төлбөрийн түүх</h2>
          <ul className="divide-y divide-line">
            {rows.map((pay) => {
              const st = STATUS_LABEL[pay.status] ?? STATUS_LABEL.PENDING;
              return (
                <li key={pay.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold tabular-nums text-ink">{money(pay.amount)}</span>
                    <Meta
                      className="text-xs text-ink-dim"
                      items={[
                        formatMnDate(pay.paidAt ?? pay.createdAt),
                        METHOD_LABEL[pay.method] ?? pay.method,
                        pay.forMonth,
                      ]}
                    />
                  </span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] ${st.cls}`}>
                    <st.icon className="h-3 w-3 shrink-0" aria-hidden />
                    {st.text}
                  </span>
                </li>
              );
            })}
          </ul>
          {data.payments.length > PAGE && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-2 min-h-11 text-sm font-semibold text-brand-soft hover:underline"
            >
              {showAll ? "Хураах" : `Бүгдийг харах (${data.payments.length})`}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "text-ink" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl border border-line px-3 py-2 sm:block sm:p-3">
      <p className="text-xs text-ink-dim">{label}</p>
      <p className={`text-base font-bold tabular-nums sm:text-lg ${tone}`}>{value}</p>
    </div>
  );
}
