"use client";

import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { formatMnt } from "@/lib/orgInfo";
// НЭГ эх сурвалж. Энд өмнө нь өөрийн хуулбар байсан бөгөөд түүнд хоёр алдаа бий
// байв: (1) төлбөрийн арга "TRANSFER" гэж бичигдсэн атал ӨС-ийн утга нь
// "BANK_TRANSFER" — данснаас төлсөн сурагчид түүхий утга харагдана;
// (2) "REVERSED" төлөв огт байхгүй — буцаагдсан төлбөр мөн түүхий гарна.
// Мөн үгс нь бусад дэлгэцээс өөр байсан ("Төлөгдсөн" vs "Баталгаажсан").
import { METHOD_LABEL, STATUS_LABEL } from "@/components/payments/paymentHelpers";
import PaidUntilCard from "@/components/payments/PaidUntilCard";
import PayInfo from "@/components/payments/PayInfo";

/* ============================================================================
 * Сурагчийн «Миний төлбөр» (шинэ дизайн, 2026-09-26).
 *
 * Өмнө нь «Үлдэгдэл = сарын төлбөр − НИЙТ төлсөн» гэж тооцдог байсан нь
 * буруу: хоёр сар төлсөн сурагчид үлдэгдэл 0 гэж харагдаж, хэзээ дуусахыг
 * огт хэлдэггүй байв. Оронд нь серверийн тооцоолсон «Хэдий хүртэл төлсөн»
 * огноо (GET /tuition/paid-until/my — ирц, амралтыг тооцсон) гол карт болов.
 * ========================================================================== */

interface Payment {
  id: string;
  status: string;
  amount: number;
  method?: string | null;
  // ⚠️ ЭДГЭЭР НЭР ӨС-ийн Payment загвартай ЯГ таарах ёстой (schema.prisma).
  /** "2026-09" — аль сарын төлбөр */
  forMonth?: string | null;
  description?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

type Status = "loading" | "ready" | "error";

const MONTHS = [
  "1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар",
  "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар",
];

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y} оны ${MONTHS[Number(m) - 1] ?? m}`;
}

// @db.Date / ISO огноог UTC-ээр уншина (бүсээс хамааран өдөр гулсахгүй).
function dateLabel(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

function useLoad<T>(path: string) {
  const [data, setData] = useState<T>();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api<T>(path)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Өгөгдөл ачааллахад алдаа гарлаа");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);
  return {
    data,
    status,
    error,
    reload: () => {
      setStatus("loading");
      setTick((t) => t + 1);
    },
  };
}

export default function StudentPaymentsClient() {
  const q = useLoad<Payment[]>("/payments/my");
  const payments = q.data ?? [];

  const confirmed = payments.filter((p) => p.status === "CONFIRMED");
  const pending = payments.filter((p) => p.status === "PENDING");
  const totalConfirmed = confirmed.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

  // Түүхийг сараар бүлэглэнэ (төлсөн огноо, байхгүй бол бүртгэсэн огноо).
  const groups = new Map<string, Payment[]>();
  for (const p of [...payments].sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt))) {
    const key = (p.paidAt ?? p.createdAt).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Миний төлбөр</h1>

      <PaidUntilCard paymentHref="" />
      <PayInfo id="pay" />

      {q.status === "loading" && (
        <section className="chunky p-5">
          <LoadingState rows={4} label="Төлбөрийн түүх" />
        </section>
      )}
      {q.status === "error" && <ErrorState message={q.error} onRetry={q.reload} />}

      {q.status === "ready" && (
        <>
          <dl className="chunky grid grid-cols-2 divide-x divide-line">
            <div className="p-4">
              <dt className="text-xs text-ink-dim">Нийт төлсөн</dt>
              <dd className="text-xl font-extrabold tabular-nums text-ink">{formatMnt(totalConfirmed)}</dd>
            </div>
            <div className="p-4">
              <dt className="text-xs text-ink-dim">Баталгаажихыг хүлээж буй</dt>
              <dd className="text-xl font-extrabold tabular-nums text-ink">{formatMnt(totalPending)}</dd>
            </div>
          </dl>

          <section aria-labelledby="pay-history" className="chunky p-5">
            <h2 id="pay-history" className="mb-4 font-bold text-ink">
              Төлбөрийн түүх
            </h2>
            {payments.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="Төлбөр бүртгэгдээгүй байна"
                hint="Төлбөр төлж, ажилтан баталгаажуулмагц энд харагдана."
              />
            ) : (
              <div className="space-y-5">
                {[...groups.entries()].map(([ym, rows]) => (
                  <div key={ym}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-dim">
                      {monthLabel(ym)}
                    </h3>
                    <ul className="space-y-2">
                      {rows.map((p) => {
                        const st = STATUS_LABEL[p.status] || STATUS_LABEL.PENDING;
                        return (
                          <li key={p.id} className="flex items-center gap-3 rounded-2xl border-2 border-line p-3">
                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${st.cls}`}>
                              <st.icon className="h-5 w-5" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold tabular-nums text-ink">{formatMnt(p.amount)}</p>
                              <p className="text-xs text-ink-dim">
                                <Meta
                                  items={[
                                    st.text,
                                    p.forMonth ? `${monthLabel(p.forMonth)}ын төлбөр` : null,
                                    p.method ? (METHOD_LABEL[p.method] ?? p.method) : null,
                                  ]}
                                />
                              </p>
                              {p.description && <p className="mt-0.5 text-xs text-ink-dim">{p.description}</p>}
                            </div>
                            {/* Сурагчид «хэзээ төлсөн» нь «хэзээ бүртгэсэн»-ээс чухал. */}
                            <span className="shrink-0 text-xs tabular-nums text-ink-dim">
                              {dateLabel(p.paidAt ?? p.createdAt)}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
