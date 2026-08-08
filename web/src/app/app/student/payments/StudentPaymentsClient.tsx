"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatMnt, TUITION } from "@/lib/orgInfo";
// НЭГ эх сурвалж. Энд өмнө нь өөрийн хуулбар байсан бөгөөд түүнд хоёр алдаа бий
// байв: (1) төлбөрийн арга "TRANSFER" гэж бичигдсэн атал ӨС-ийн утга нь
// "BANK_TRANSFER" — данснаас төлсөн сурагчид түүхий утга харагдана;
// (2) "REVERSED" төлөв огт байхгүй — буцаагдсан төлбөр мөн түүхий гарна.
// Мөн үгс нь бусад дэлгэцээс өөр байсан ("Төлөгдсөн" vs "Баталгаажсан").
import { METHOD_LABEL, STATUS_LABEL } from "@/components/payments/paymentHelpers";

interface Payment {
  id: string;
  status: string;
  amount: number;
  method?: string | null;
  // ⚠️ ЭДГЭЭР НЭР ӨС-ийн Payment загвартай ЯГ таарах ёстой (schema.prisma).
  // Өмнө нь энд monthOf / confirmedAt гэж бичигдсэн байсан — тийм талбар
  // байхгүй тул сар болон төлсөн огноо ЧИМЭЭГҮЙ хоосон гарч байв.
  /** "2026-09" — аль сарын төлбөр */
  forMonth?: string | null;
  description?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

type Status = "loading" | "ready" | "error";

export default function StudentPaymentsClient() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    api<Payment[]>("/payments/my")
      .then((data) => {
        setPayments(data);
        setStatus("ready");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Өгөгдөл ачааллахад алдаа гарлаа");
        setStatus("error");
      });
  }, []);

  const confirmed = payments.filter((p) => p.status === "CONFIRMED");
  const pending = payments.filter((p) => p.status === "PENDING");
  const totalConfirmed = confirmed.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

  // Хичээлийн цэнэ үндсэн таб гүйцэтгэнэ (зохиогч: зөвхөн математик сонгон авсан)
  // MONTHLY план-аас сарын төлбөрийн дүнг авна
  const tuitionAmount = TUITION[0]?.plans?.find((p) => p.kind === "MONTHLY")?.amount ?? 350_000;
  const balance = tuitionAmount - totalConfirmed;

  function retry() {
    setStatus("loading");
    setError("");
    api<Payment[]>("/payments/my")
      .then((data) => {
        setPayments(data);
        setStatus("ready");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Өгөгдөл ачааллахад алдаа гарлаа");
        setStatus("error");
      });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold">Миний төлбөр</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Сургалтын төлбөрийн түүх, төлөлтийн төлөв, үлдэгдэл дүнг эндээс хянаж болно.
        </p>
      </div>

      {status === "error" && (
        <section className="rounded-2xl border border-error/30 bg-error/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />
              <span className="text-sm text-error">{error}</span>
            </div>
            <button
              onClick={retry}
              className="shrink-0 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
            >
              Дахин оролдох
            </button>
          </div>
        </section>
      )}

      {status === "loading" && (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Төлбөрийн мэдээлэл ачаалж байна…
          </p>
        </section>
      )}

      {status === "ready" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line bg-panel p-4">
              <p className="text-xs text-ink-dim">Сарын төлбөр</p>
              <p className="mt-1 text-2xl font-extrabold">
                ₮{formatMnt(tuitionAmount)}
              </p>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <p className="text-xs text-ink-dim">Төлөгдсөн</p>
              <p className="mt-1 text-2xl font-extrabold text-success">
                ₮{formatMnt(totalConfirmed)}
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${
              balance <= 0
                ? "border-success/30 bg-success/5"
                : "border-warning/30 bg-warning/5"
            }`}>
              <p className="text-xs text-ink-dim">Үлдэгдэл</p>
              <p className={`mt-1 text-2xl font-extrabold ${
                balance <= 0 ? "text-success" : "text-warning"
              }`}>
                ₮{formatMnt(Math.max(balance, 0))}
              </p>
            </div>
          </div>

          {totalPending > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <p className="text-sm text-ink-dim">
                Хүлээгдэж байгаа төлбөр: <span className="font-bold text-warning">₮{formatMnt(totalPending)}</span>
              </p>
            </div>
          )}

          <section className="rounded-2xl border border-line bg-panel p-6">
            <h2 className="mb-4 font-bold text-brand-soft">Төлбөрийн түүх</h2>
            {payments.length === 0 && (
              <p className="text-sm text-ink-dim">Төлбөрийн мэдээлэл байхгүй байна.</p>
            )}
            <div className="space-y-2">
              {payments.map((p) => {
                const st = STATUS_LABEL[p.status] || STATUS_LABEL.PENDING;
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line px-4 py-3 text-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">₮{formatMnt(p.amount)}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.cls}`}
                        >
                          <st.icon className="h-3 w-3 shrink-0" aria-hidden />
                          {st.text}
                        </span>
                        {p.forMonth && (
                          <span className="text-xs text-ink-dim">{p.forMonth}-ны төлбөр</span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-1 text-xs text-ink-dim">{p.description}</p>
                      )}
                    </div>
                    <div className="text-right text-xs text-ink-dim">
                      {p.method && <p>{METHOD_LABEL[p.method] ?? p.method}</p>}
                      {/* Төлсөн огноо байвал түүнийг, эс бөгөөс үүсгэсэн огноог.
                          Сурагчид «хэзээ төлсөн» нь «хэзээ бүртгэсэн»-ээс чухал. */}
                      <p>{(p.paidAt ?? p.createdAt).slice(0, 10)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
