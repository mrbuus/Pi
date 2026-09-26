"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  Clock,
  Copy,
  Landmark,
  Phone,
  Receipt,
  Banknote,
  Wallet,
} from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { BANK, PHONES, formatMnt, TUITION } from "@/lib/orgInfo";
// НЭГ эх сурвалж. Энд өмнө нь өөрийн хуулбар байсан бөгөөд түүнд хоёр алдаа бий
// байв: (1) төлбөрийн арга "TRANSFER" гэж бичигдсэн атал ӨС-ийн утга нь
// "BANK_TRANSFER" — данснаас төлсөн сурагчид түүхий утга харагдана;
// (2) "REVERSED" төлөв огт байхгүй — буцаагдсан төлбөр мөн түүхий гарна.
// Мөн үгс нь бусад дэлгэцээс өөр байсан ("Төлөгдсөн" vs "Баталгаажсан").
import { METHOD_LABEL, STATUS_LABEL } from "@/components/payments/paymentHelpers";

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

function daysUntil(iso: string): number {
  const end = new Date(iso);
  const endUtc = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((endUtc - todayUtc) / 86_400_000);
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

function PaidUntilHero() {
  const q = useLoad<{ paidUntil: string | null }>("/tuition/paid-until/my");

  if (q.status === "loading") {
    return (
      <section className="rounded-3xl border border-line bg-panel p-5">
        <LoadingState rows={2} label="Төлбөрийн хугацаа" />
      </section>
    );
  }
  if (q.status === "error") return <ErrorState message={q.error} onRetry={q.reload} />;

  const paidUntil = q.data?.paidUntil ?? null;
  const left = paidUntil ? daysUntil(paidUntil) : null;

  // Өнгө + дүрс + үг гурвуулаа утга илэрхийлнэ (өнгө дангаараа биш).
  const view =
    left === null
      ? {
          tone: "bg-ink/5 text-ink-dim",
          icon: CalendarClock,
          title: "Төлбөрийн хугацаа тооцогдоогүй байна",
          hint: "Анги, төлбөрийн мэдээлэл бүртгэгдмэгц энд харагдана.",
        }
      : left < 0
        ? {
            tone: "bg-error/10 text-error",
            icon: CalendarX,
            title: `${Math.abs(left)} хоногийн өмнө дууссан`,
            hint: "Хичээлээ тасалдуулахгүйн тулд төлбөрөө төлөөрэй.",
          }
        : left <= 7
          ? {
              tone: "bg-warning/10 text-warning",
              icon: CalendarClock,
              title: left === 0 ? "Өнөөдөр дуусна" : `${left} хоногийн дараа дуусна`,
              hint: "Удахгүй дуусах гэж байна — дараагийн сарын төлбөрөө бэлдээрэй.",
            }
          : {
              tone: "bg-success/10 text-success",
              icon: CalendarCheck,
              title: `${left} хоног үлдсэн`,
              hint: "Бүх зүйл хэвийн. Хичээлдээ анхаараарай!",
            };
  const Icon = view.icon;

  return (
    <section aria-labelledby="paid-until-title" className="overflow-hidden rounded-3xl border border-line bg-panel">
      <div className={`flex items-center gap-4 p-5 ${view.tone}`}>
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-panel/70">
          <Icon className="h-9 w-9" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="paid-until-title" className="text-sm font-semibold text-ink-dim">
            Хэдий хүртэл төлсөн
          </h2>
          <p className="text-3xl font-extrabold leading-tight text-ink tabular-nums">
            {paidUntil ? dateLabel(paidUntil) : "—"}
          </p>
          <p className="mt-0.5 text-sm font-semibold">{view.title}</p>
        </div>
      </div>
      <p className="px-5 py-3 text-sm text-ink-dim">{view.hint}</p>
    </section>
  );
}

function HowToPay() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(BANK.account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard эрхгүй (хуучин браузер) — дугаар дэлгэц дээр харагдсаар байна.
    }
  }

  return (
    <section aria-labelledby="how-to-pay" className="rounded-3xl border border-line bg-panel p-5">
      <h2 id="how-to-pay" className="mb-3 font-bold text-ink">
        Хэрхэн төлөх вэ
      </h2>
      <div className="flex flex-wrap items-start gap-3 rounded-2xl bg-accent-sky/10 p-4 sm:flex-nowrap">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-sky/15 text-accent-sky">
          <Landmark className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-dim">
            <Meta items={[BANK.name, BANK.holder]} />
          </p>
          <p className="text-lg font-extrabold tabular-nums text-ink">{BANK.account}</p>
          <p className="text-xs text-ink-dim">Гүйлгээний утгад сурагчийн код, нэрээ бичээрэй.</p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-panel px-3 sm:w-auto text-sm font-semibold text-ink transition hover:border-brand-bright/50"
        >
          {copied ? <Check className="h-4 w-4 text-success" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Хуулсан" : "Хуулах"}
        </button>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-dim">
        <Phone className="h-4 w-4" aria-hidden />
        {PHONES.map((p) => (
          <a key={p} href={`tel:${p.replace(/\s/g, "")}`} className="font-semibold text-brand-soft underline-offset-2 hover:underline">
            {p}
          </a>
        ))}
      </p>
    </section>
  );
}

export default function StudentPaymentsClient() {
  const q = useLoad<Payment[]>("/payments/my");
  const payments = q.data ?? [];

  const confirmed = payments.filter((p) => p.status === "CONFIRMED");
  const pending = payments.filter((p) => p.status === "PENDING");
  const totalConfirmed = confirmed.reduce((sum, p) => sum + p.amount, 0);
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);
  const tuitionAmount = TUITION[0]?.plans?.find((p) => p.kind === "MONTHLY")?.amount ?? 350_000;

  // Түүхийг сараар бүлэглэнэ (төлсөн огноо, байхгүй бол бүртгэсэн огноо).
  const groups = new Map<string, Payment[]>();
  for (const p of [...payments].sort((a, b) => (b.paidAt ?? b.createdAt).localeCompare(a.paidAt ?? a.createdAt))) {
    const key = (p.paidAt ?? p.createdAt).slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Миний төлбөр</h1>

      <PaidUntilHero />

      {q.status === "loading" && (
        <section className="rounded-3xl border border-line bg-panel p-5">
          <LoadingState rows={4} label="Төлбөрийн түүх" />
        </section>
      )}
      {q.status === "error" && <ErrorState message={q.error} onRetry={q.reload} />}

      {q.status === "ready" && (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col rounded-2xl bg-accent-teal/10 p-4">
              <dt className="order-last text-xs text-ink-dim">Нийт төлсөн</dt>
              <dd className="text-xl font-extrabold tabular-nums text-ink">
                <Wallet className="mb-1 h-5 w-5 text-accent-teal" aria-hidden />
                {formatMnt(totalConfirmed)}
              </dd>
            </div>
            <div className="flex flex-col rounded-2xl bg-accent-violet/10 p-4">
              <dt className="order-last text-xs text-ink-dim">Сарын төлбөр</dt>
              <dd className="text-xl font-extrabold tabular-nums text-ink">
                <Banknote className="mb-1 h-5 w-5 text-accent-violet" aria-hidden />
                {formatMnt(tuitionAmount)}
              </dd>
            </div>
            <div className="col-span-2 flex flex-col rounded-2xl bg-warning/10 p-4 sm:col-span-1">
              <dt className="order-last text-xs text-ink-dim">Баталгаажихыг хүлээж буй</dt>
              <dd className="text-xl font-extrabold tabular-nums text-ink">
                <Clock className="mb-1 h-5 w-5 text-warning" aria-hidden />
                {formatMnt(totalPending)}
              </dd>
            </div>
          </dl>

          <section aria-labelledby="pay-history" className="rounded-3xl border border-line bg-panel p-5">
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
                          <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
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

      <HowToPay />
    </div>
  );
}
