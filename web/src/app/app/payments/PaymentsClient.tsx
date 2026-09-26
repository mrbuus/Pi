"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  Check,
  Clock,
  History,
  Search,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatMnt, TUITION } from "@/lib/orgInfo";
import { Meta } from "@/components/ui/Meta";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { Progress } from "@/components/ui/kit/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import OutstandingPanel from "@/components/payments/OutstandingPanel";
import PaymentEditModal from "@/components/payments/PaymentEditModal";
import ReversePaymentModal from "@/components/payments/ReversePaymentModal";
import StudentHistoryPanel from "@/components/payments/StudentHistoryPanel";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
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
    return <LoadingState rows={3} label={emptyText} />;
  }
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }
  if (empty) {
    return <EmptyState title={emptyText} />;
  }
  return null;
}

/* ============================================================================
 * Ажилтны «Төлбөр» (шинэ дизайн, 2026-09-26).
 *
 * Өмнө нь 7 хэсэг нэг урт хуудсанд давхарласан — утсан дээр «Батлах» товч
 * хүртэл 3 дэлгэц гүйлгэх шаардлагатай байв. Одоо дээд талд өнгөт тоон
 * картууд (дарахад тухайн таб нээгдэнэ) + 5 таб. Нэг ч функц хасагдаагүй:
 * батлах/цуцлах/засах/буцаах, сарын төлөлт, дутуу төлөлт, сурагчийн түүх,
 * сүүлийн төлбөрүүд, төлбөрийн лавлагаа бүгд хэвээр.
 * ========================================================================== */

type TabKey = "pending" | "month" | "student" | "recent" | "reference";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "pending", label: "Батлах", icon: Clock },
  { key: "month", label: "Сарын төлөлт", icon: CalendarRange },
  { key: "student", label: "Сурагч", icon: Search },
  { key: "recent", label: "Түүх", icon: History },
  { key: "reference", label: "Лавлагаа", icon: BookOpen },
];

export default function PaymentsClient() {
  // Орон нутгийн сар (toISOString нь UTC тул сарын 1-нд 08:00-оос өмнө өмнөх сар гарна).
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [tab, setTab] = useState<TabKey>("pending");
  const [onlyUnpaid, setOnlyUnpaid] = useState(false);
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
    const paid = monthRows.length - unpaid;
    return { pendingAmount, unpaid, paid };
  }, [pending, monthRows]);

  async function confirm(id: string) {
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
      toast.success("Төлбөр баталгаажлаа");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  async function reject(id: string) {
        try {
      await api(`/payments/${id}/reject`, { method: "POST" });
      toast.success("Төлбөр цуцлагдлаа");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  function handleEdited() {
    toast.success("Төлбөр засагдлаа");
    load();
  }

  function handleReversed() {
    toast.success("Төлбөр буцаагдаж, эрх цуцлагдлаа");
    load();
  }

  const selectCls =
    "min-h-11 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
  const inputCls =
    "min-h-11 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

  const visibleMonthRows = onlyUnpaid ? monthRows.filter((r) => !r.paid) : monthRows;
  const paidPct = monthRows.length ? Math.round((totals.paid / monthRows.length) * 100) : 0;

  const statCards: { tab: TabKey; value: string; label: string; icon: LucideIcon; tone: string }[] = [
    { tab: "pending", value: String(pending.length), label: "батлах төлбөр", icon: Clock, tone: "bg-warning/10 text-warning" },
    { tab: "pending", value: formatMnt(totals.pendingAmount), label: "баталгаажаагүй дүн", icon: Wallet, tone: "bg-accent-violet/10 text-accent-violet" },
    { tab: "month", value: String(totals.unpaid), label: `${month} сард төлөөгүй`, icon: Users, tone: "bg-error/10 text-error" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="sr-only">Төлбөрийн хяналт</h1>
          <p className="text-sm text-ink-dim">
            Данс, бэлэн, QPay төлбөрийг баталгаажуулж эрх олгоно — дүн, огноо,
            сар бүрийг ч засах/буцаах бүрэн эрхтэй.
          </p>
        </div>
      </div>

      {/* Өнгөт тоон картууд — дарахад холбогдох таб нээгдэнэ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {statCards.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setTab(c.tab)}
            className={`chunky chunky-press flex min-w-0 items-center gap-3 p-3 text-left sm:p-4 hover:border-brand-bright/40 ${
              i === 2 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-extrabold leading-tight tabular-nums text-ink sm:text-xl">{c.value}</span>
              <span className="block text-xs text-ink-dim [overflow-wrap:anywhere]">{c.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Табууд (shadcn/ui Tabs = Radix): сумаар шилжинэ, утсан дээр хажуу тийш гүйлгэнэ */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="space-y-6">
      <TabsList aria-label="Төлбөрийн хэсгүүд">
        {TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key} className="group">
            <t.icon aria-hidden />
            {t.label}
            {t.key === "pending" && pending.length > 0 && (
              <span className="rounded-full bg-warning/15 px-1.5 text-xs tabular-nums text-warning group-data-[state=active]:bg-on-brand/20 group-data-[state=active]:text-on-brand">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="pending">
      <section className="chunky p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-ink">Баталгаажуулах төлбөрүүд</h2>
        <SectionStatus
          loading={pendingLoading}
          error={pendingError}
          onRetry={load}
          empty={!pendingLoading && !pendingError && pending.length === 0}
          emptyText="Хүлээгдэж буй төлбөр алга"
        />
        {passesError && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-error">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Эрхийн жагсаалт ачаалагдсангүй: {passesError}
          </p>
        )}
        {!pendingLoading && !pendingError && pending.length > 0 && (
          <div className="space-y-3">
            {pending.map((p) => {
              const match = matchTuitionPlan(p.amount);
              return (
                <div key={p.id} className="rounded-2xl border-2 border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
                      <Clock className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-ink">
                        {p.user?.firstName} {p.user?.lastName}
                      </p>
                      <p className="text-sm text-ink-dim">
                        <Meta items={[p.user?.phone, p.forMonth]} />
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-lg font-extrabold tabular-nums text-ink">{formatMnt(p.amount)}</p>
                      <p className="text-xs text-ink-dim">{METHOD_LABEL[p.method] ?? p.method}</p>
                    </div>
                  </div>
                  <p
                    className={`mt-3 flex items-start gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold ${
                      match ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                    }`}
                  >
                    {match ? <Check className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden /> : <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />}
                    <span>
                      {match
                        ? `Багцтай тохирч байна: ${match.tier.label}, ${match.plan.label}`
                        : "Мэдэгдэж буй ямар ч сургалтын төлбөрийн багцтай тохирохгүй байна — шалгана уу"}
                    </span>
                  </p>
                  {p.description && (
                    <p className="mt-2 text-sm text-ink-dim">{p.description}</p>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]">
                    <label className="sr-only" htmlFor={`pass-${p.id}`}>
                      Олгох эрх
                    </label>
                    <select
                      id={`pass-${p.id}`}
                      value={passPick[p.id] ?? ""}
                      onChange={(e) =>
                        setPassPick((m) => ({ ...m, [p.id]: e.target.value }))
                      }
                      className={`${selectCls} col-span-2 lg:col-span-1`}
                    >
                      <option value="">Эрх олгохгүй</option>
                      {passes.map((pass) => (
                        <option key={pass.id} value={pass.id}>
                          {pass.name} — {pass.durationDays} хоног
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
                      className={`${inputCls} col-span-2 lg:col-span-1`}
                    />
                    <Button onClick={() => confirm(p.id)}>
                      <Check aria-hidden />
                      Батлах
                    </Button>
                    <Button variant="danger" onClick={() => reject(p.id)}>
                      <X aria-hidden />
                      Цуцлах
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingPayment(p)}
                      className="col-span-2 lg:col-span-1"
                    >
                      Засах
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      </TabsContent>

      <TabsContent value="month" className="space-y-6">
      <section className="chunky p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-ink">Сарын төлөлт</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-sm">
              <input
                type="checkbox"
                checked={onlyUnpaid}
                onChange={(e) => setOnlyUnpaid(e.target.checked)}
                className="h-4 w-4 accent-[var(--brand)]"
              />
              Зөвхөн төлөөгүй
            </label>
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
        </div>
        {!monthRowsLoading && !monthRowsError && monthRows.length > 0 && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-semibold text-ink">
                {totals.paid}/{monthRows.length} сурагч төлсөн
              </span>
              <span className="font-bold tabular-nums text-success">{paidPct}%</span>
            </div>
            <Progress
              value={paidPct}
              aria-label="Төлсөн сурагчийн хувь"
              className="bg-error/15"
              indicatorClassName="bg-success"
            />
          </div>
        )}
        <SectionStatus
          loading={monthRowsLoading}
          error={monthRowsError}
          onRetry={load}
          empty={!monthRowsLoading && !monthRowsError && monthRows.length === 0}
          emptyText="Энэ сард танхимын сурагч алга байна"
        />
        {!monthRowsLoading && !monthRowsError && monthRows.length > 0 && visibleMonthRows.length === 0 && (
          <EmptyState icon={Check} title="Бүгд төлсөн байна" hint="Энэ сард төлөөгүй сурагч алга." />
        )}
        {!monthRowsLoading && !monthRowsError && visibleMonthRows.length > 0 && (
          <ul className="space-y-2">
            {visibleMonthRows.map((r, i) => (
              <li
                key={`${r.student.phone}-${i}`}
                className="flex items-center gap-3 rounded-2xl border-2 border-line px-3 py-2.5 text-sm"
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    r.paid ? "bg-success/15 text-success" : "bg-error/15 text-error"
                  }`}
                >
                  {r.paid ? <Check className="h-4 w-4" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">
                    {r.student.firstName} {r.student.lastName}
                  </span>
                  <span className="block text-xs text-ink-dim">
                    <Meta items={[r.classroom.name, r.student.phone]} />
                  </span>
                </span>
                <span className={`shrink-0 text-xs font-bold ${r.paid ? "text-success" : "text-error"}`}>
                  {r.paid ? "Төлсөн" : "Төлөөгүй"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Тухайн сард дутуу төлсөн бүх сурагч — хамгийн их зөрүүтэй нь эхэндээ */}
      <OutstandingPanel month={month} />
      </TabsContent>

      {/* Нэг сурагчийн ёстой/төлсөн/үлдэгдэл, бүх түүх — хайж сонгоод шууд удирдана.
          Табаас гарсан ч сонголт хадгалагдахын тулд нуух (hidden), unmount хийхгүй. */}
      <TabsContent value="student" forceMount hidden={tab !== "student"}>
        <StudentHistoryPanel
          onEdit={setEditingPayment}
          onReverse={setReversingPayment}
          refreshKey={refreshKey}
        />
      </TabsContent>

      <TabsContent value="recent">
      <section className="chunky p-4 sm:p-6">
        <h2 className="mb-4 font-bold text-ink">Сүүлийн төлбөрүүд</h2>
        <SectionStatus
          loading={recentLoading}
          error={recentError}
          onRetry={load}
          empty={!recentLoading && !recentError && recent.length === 0}
          emptyText="Төлбөрийн түүх алга"
        />
        {!recentLoading && !recentError && recent.length > 0 && (
          <ul className="space-y-2">
            {recent.slice(0, 30).map((p) => {
              const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING;
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line px-3 py-2.5 text-sm"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.cls}`}>
                    <st.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      {p.user?.firstName} {p.user?.lastName}
                    </span>
                    <span className="block text-xs text-ink-dim">
                      <Meta items={[formatMnt(p.amount), METHOD_LABEL[p.method] ?? p.method, st.text]} />
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingPayment(p)}
                      className="min-h-11 rounded-lg border border-line px-3 text-xs font-semibold transition hover:border-brand"
                    >
                      Засах
                    </button>
                    {p.status === "CONFIRMED" && (
                      <button
                        type="button"
                        onClick={() => setReversingPayment(p)}
                        className="min-h-11 rounded-lg border border-error/30 px-3 text-xs font-semibold text-error transition hover:bg-error/10"
                      >
                        Буцаах
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      </TabsContent>

      {/* Лавлагаа: сурагч ЮУ төлөх ЁСТОЙ вэ — бодит төлбөртэй харьцуулж харах */}
      <TabsContent value="reference">
      <section className="chunky p-4 sm:p-6">
        <h2 className="mb-1 font-bold text-ink">
          Сургалтын төлбөрийн лавлагаа
        </h2>
        <p className="mb-4 text-xs text-ink-dim">
          2026-2027 оны хичээлийн жил — сурагч аль ангид, ямар багцаар төлөх ёстойг
          бодит төлбөрүүдтэй харьцуулж шалгана.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {TUITION.map((tier) => (
            <div key={tier.id} className="rounded-2xl border-2 border-line p-4">
              <p className="mb-2 text-sm font-semibold">{tier.label}</p>
              <div className="space-y-1.5">
                {tier.plans.map((plan) => (
                  <div
                    key={plan.kind}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-ink-dim">
                      {plan.label}
                      {plan.note ? ` (${plan.note})` : ""}
                    </span>
                    <span className="font-semibold tabular-nums">{formatMnt(plan.amount)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-dim">
                Хуваан төлөх: <Meta items={[`эхний ${formatMnt(tier.installment.firstPayment)}`, `үлдэгдлийг ${tier.installment.deadline}-ны дотор барагдуулна`]} />
              </p>
            </div>
          ))}
        </div>
      </section>
      </TabsContent>
      </Tabs>

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
