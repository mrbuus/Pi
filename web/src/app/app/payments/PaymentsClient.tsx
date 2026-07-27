"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatMnt, TUITION } from "@/lib/orgInfo";
import OutstandingPanel from "@/components/payments/OutstandingPanel";
import PaymentEditModal from "@/components/payments/PaymentEditModal";
import ReversePaymentModal from "@/components/payments/ReversePaymentModal";
import StudentHistoryPanel from "@/components/payments/StudentHistoryPanel";
import {
  METHOD_LABEL,
  STATUS_LABEL,
  errMsg,
  matchTuitionPlan,
} from "@/components/payments/paymentHelpers";
import type {
  MonthRow,
  Pass,
  Payment,
} from "@/components/payments/types";

/** Хэсэг бүрийн ачаалж буй / алдаатай / хоосон төлвийг ялгаж харуулна. */
function SectionStatus({
  loading,
  error,
  onRetry,
  empty,
  emptyText,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: boolean;
  emptyText: string;
}) {
  if (loading) {
    return (
      <p className="animate-pulse text-sm text-ink-dim" role="status">
        Ачаалж байна…
      </p>
    );
  }
  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
        <span>⚠ {error}</span>
        <button
          onClick={onRetry}
          className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
        >
          Дахин ачаалах
        </button>
      </div>
    );
  }
  if (empty) {
    return <p className="text-sm text-ink-dim">{emptyText}</p>;
  }
  return null;
}

export default function PaymentsClient() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);

  const [pending, setPending] = useState<Payment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [recent, setRecent] = useState<Payment[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);

  const [passes, setPasses] = useState<Pass[]>([]);
  const [passesError, setPassesError] = useState<string | null>(null);

  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [monthRowsLoading, setMonthRowsLoading] = useState(true);
  const [monthRowsError, setMonthRowsError] = useState<string | null>(null);

  const [passPick, setPassPick] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  // Багш+ бүрэн эрхийн засах/буцаах цонхнууд — хаана ч байгаа мөрөөс нээгдэнэ
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [reversingPayment, setReversingPayment] = useState<Payment | null>(null);
  // Сурагчийн түүхийн хэсгийг засвар/буцаалтын дараа шинэчлэхэд ашиглана
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setPendingLoading(true);
    setPendingError(null);
    api<Payment[]>("/payments?status=PENDING")
      .then(setPending)
      .catch((e) => setPendingError(errMsg(e)))
      .finally(() => setPendingLoading(false));

    setRecentLoading(true);
    setRecentError(null);
    api<Payment[]>("/payments")
      .then(setRecent)
      .catch((e) => setRecentError(errMsg(e)))
      .finally(() => setRecentLoading(false));

    setPassesError(null);
    api<Pass[]>("/catalog/passes", { auth: false })
      .then(setPasses)
      .catch((e) => setPassesError(errMsg(e)));

    setMonthRowsLoading(true);
    setMonthRowsError(null);
    api<MonthRow[]>(`/payments/months/${month}`)
      .then(setMonthRows)
      .catch((e) => setMonthRowsError(errMsg(e)))
      .finally(() => setMonthRowsLoading(false));

    setRefreshKey((k) => k + 1);
  }, [month]);

  useEffect(load, [load]);

  const totals = useMemo(() => {
    const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0);
    const unpaid = monthRows.filter((r) => !r.paid).length;
    return { pendingAmount, unpaid };
  }, [pending, monthRows]);

  async function confirm(id: string) {
    setMsg(null);
    try {
      await api(`/payments/${id}/confirm`, {
        method: "POST",
        body: {
          ...(passPick[id] ? { passId: passPick[id] } : {}),
          ...(notes[id]?.trim() ? { note: notes[id].trim() } : {}),
        },
      });
      setPassPick((m) => ({ ...m, [id]: "" }));
      setNotes((m) => ({ ...m, [id]: "" }));
      setMsg({ kind: "success", text: "✓ Төлбөр баталгаажлаа" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  async function reject(id: string) {
    setMsg(null);
    try {
      await api(`/payments/${id}/reject`, { method: "POST" });
      setMsg({ kind: "success", text: "Төлбөр цуцлагдлаа" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  function handleEdited() {
    setMsg({ kind: "success", text: "✓ Төлбөр засагдлаа" });
    load();
  }

  function handleReversed() {
    setMsg({ kind: "success", text: "✓ Төлбөр буцаагдаж, эрх цуцлагдлаа" });
    load();
  }

  const selectCls =
    "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
  const inputCls =
    "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Төлбөрийн хяналт</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Данс, бэлэн, QPay төлбөрийг баталгаажуулж эрх олгоно — дүн, огноо,
            сар бүрийг ч засах/буцаах бүрэн эрхтэй.
          </p>
        </div>
        {msg && (
          <span
            role="status"
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.kind === "error"
                ? "bg-error/10 text-error"
                : "bg-success/10 text-success"
            }`}
          >
            {msg.kind === "error" ? "⚠ " : ""}
            {msg.text}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-2xl font-extrabold">{pending.length}</p>
          <p className="mt-1 text-sm text-ink-dim">хүлээгдэж буй төлбөр</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-2xl font-extrabold">{formatMnt(totals.pendingAmount)}</p>
          <p className="mt-1 text-sm text-ink-dim">баталгаажаагүй нийт дүн</p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5">
          <p className="text-2xl font-extrabold">{totals.unpaid}</p>
          <p className="mt-1 text-sm text-ink-dim">{month} сард төлөөгүй</p>
        </div>
      </div>

      {/* Лавлагаа: сурагч ЮУ төлөх ЁСТОЙ вэ — бодит төлбөртэй харьцуулж харах */}
      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-1 font-bold text-brand-soft">
          Сургалтын төлбөрийн лавлагаа
        </h2>
        <p className="mb-4 text-xs text-ink-dim">
          2026-2027 оны хичээлийн жил — сурагч аль ангид, ямар багцаар төлөх ёстойг
          доорх бодит төлбөрүүдтэй харьцуулж шалгана.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {TUITION.map((tier) => (
            <div key={tier.id} className="rounded-xl border border-line p-4">
              <p className="mb-2 text-sm font-semibold">{tier.label}</p>
              <div className="space-y-1.5">
                {tier.plans.map((plan) => (
                  <div
                    key={plan.kind}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-ink-dim">
                      {plan.label}
                      {plan.note ? ` (${plan.note})` : ""}
                    </span>
                    <span className="font-semibold">{formatMnt(plan.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-dim">
                Хуваан төлөх: эхний {formatMnt(tier.installment.firstPayment)} ·
                үлдэгдлийг {tier.installment.deadline}-ны дотор барагдуулна
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Баталгаажуулах төлбөрүүд</h2>
        <SectionStatus
          loading={pendingLoading}
          error={pendingError}
          onRetry={load}
          empty={!pendingLoading && !pendingError && pending.length === 0}
          emptyText="Хүлээгдэж буй төлбөр алга"
        />
        {passesError && (
          <p className="mb-2 text-xs text-error">
            ⚠ Эрхийн жагсаалт ачаалагдсангүй: {passesError}
          </p>
        )}
        {!pendingLoading && !pendingError && pending.length > 0 && (
          <div className="space-y-3">
            {pending.map((p) => {
              const match = matchTuitionPlan(p.amount);
              return (
                <div key={p.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-semibold">
                      {p.user?.firstName} {p.user?.lastName}
                    </span>
                    <span className="text-ink-dim">{p.user?.phone}</span>
                    <span className="rounded-full bg-warning/15 px-3 py-0.5 text-xs font-bold text-warning">
                      {formatMnt(p.amount)} · {METHOD_LABEL[p.method] ?? p.method}
                    </span>
                    {p.forMonth && <span className="text-ink-dim">{p.forMonth}</span>}
                    <button
                      type="button"
                      onClick={() => setEditingPayment(p)}
                      className="ml-auto rounded-lg border border-line px-2 py-1 text-xs font-semibold transition hover:border-brand"
                    >
                      Засах
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-ink-dim">
                    {match
                      ? `Тохирч байна: ${match.tier.label} · ${match.plan.label}`
                      : "Мэдэгдэж буй ямар ч сургалтын төлбөрийн багцтай тохирохгүй байна — шалгана уу"}
                  </p>
                  {p.description && (
                    <p className="mt-2 text-sm text-ink-dim">{p.description}</p>
                  )}
                  <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                    <label className="sr-only" htmlFor={`pass-${p.id}`}>
                      Олгох эрх
                    </label>
                    <select
                      id={`pass-${p.id}`}
                      value={passPick[p.id] ?? ""}
                      onChange={(e) =>
                        setPassPick((m) => ({ ...m, [p.id]: e.target.value }))
                      }
                      className={selectCls}
                    >
                      <option value="">Эрх олгохгүй</option>
                      {passes.map((pass) => (
                        <option key={pass.id} value={pass.id}>
                          {pass.name} · {pass.durationDays} хоног
                        </option>
                      ))}
                    </select>
                    <label className="sr-only" htmlFor={`note-${p.id}`}>
                      Баталгаажуулалтын тайлбар
                    </label>
                    <input
                      id={`note-${p.id}`}
                      value={notes[p.id] ?? ""}
                      onChange={(e) =>
                        setNotes((m) => ({ ...m, [p.id]: e.target.value }))
                      }
                      placeholder="Баталгаажуулалтын тайлбар"
                      className={inputCls}
                    />
                    <button
                      onClick={() => confirm(p.id)}
                      className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition"
                    >
                      Батлах
                    </button>
                    <button
                      onClick={() => reject(p.id)}
                      className="rounded-lg border border-error/30 px-4 py-2 text-sm font-bold text-error transition hover:bg-error/10"
                    >
                      Цуцлах
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-brand-soft">Сарын төлөлт</h2>
          <label className="sr-only" htmlFor="month-picker">
            Сар сонгох
          </label>
          <input
            id="month-picker"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth)}
            className={inputCls}
          />
        </div>
        <SectionStatus
          loading={monthRowsLoading}
          error={monthRowsError}
          onRetry={load}
          empty={!monthRowsLoading && !monthRowsError && monthRows.length === 0}
          emptyText="Энэ сард танхимын сурагч алга байна"
        />
        {!monthRowsLoading && !monthRowsError && monthRows.length > 0 && (
          <div className="space-y-2">
            {monthRows.map((r, i) => (
              <div
                key={`${r.student.phone}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-2.5 text-sm"
              >
                <span>
                  {r.student.firstName} {r.student.lastName} ·{" "}
                  <span className="text-ink-dim">
                    {r.classroom.name} · {r.student.phone}
                  </span>
                </span>
                <span className={r.paid ? "text-success" : "font-bold text-error"}>
                  {r.paid ? "✓ Төлсөн" : "✕ Төлөөгүй"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Тухайн сард дутуу төлсөн бүх сурагч — хамгийн их зөрүүтэй нь эхэндээ */}
      <OutstandingPanel month={month} />

      {/* Нэг сурагчийн ёстой/төлсөн/үлдэгдэл, бүх түүх — хайж сонгоод шууд удирдана */}
      <StudentHistoryPanel
        onEdit={setEditingPayment}
        onReverse={setReversingPayment}
        refreshKey={refreshKey}
      />

      <section className="rounded-2xl border border-line bg-surface p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Сүүлийн төлбөрүүд</h2>
        <SectionStatus
          loading={recentLoading}
          error={recentError}
          onRetry={load}
          empty={!recentLoading && !recentError && recent.length === 0}
          emptyText="Төлбөрийн түүх алга"
        />
        {!recentLoading && !recentError && recent.length > 0 && (
          <div className="space-y-2">
            {recent.slice(0, 30).map((p) => {
              const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING;
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-2.5 text-sm"
                >
                  <span>
                    {p.user?.firstName} {p.user?.lastName} ·{" "}
                    <span className="text-ink-dim">
                      {formatMnt(p.amount)} · {METHOD_LABEL[p.method] ?? p.method}
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${st.cls}`}>
                      {st.text}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingPayment(p)}
                      className="rounded-lg border border-line px-2 py-1 text-xs font-semibold transition hover:border-brand"
                    >
                      Засах
                    </button>
                    {p.status === "CONFIRMED" && (
                      <button
                        type="button"
                        onClick={() => setReversingPayment(p)}
                        className="rounded-lg border border-error/30 px-2 py-1 text-xs font-semibold text-error transition hover:bg-error/10"
                      >
                        Буцаах
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <PaymentEditModal
        open={!!editingPayment}
        payment={editingPayment}
        onClose={() => setEditingPayment(null)}
        onSaved={handleEdited}
      />
      <ReversePaymentModal
        open={!!reversingPayment}
        payment={reversingPayment}
        onClose={() => setReversingPayment(null)}
        onReversed={handleReversed}
      />
    </div>
  );
}
