"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CalendarX2,
  Check,
  DoorOpen,
  MessageSquarePlus,
  Pencil,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import InfoHint from "@/components/ui/InfoHint";
import { ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import PaymentEditModal from "./PaymentEditModal";
import ReversePaymentModal from "./ReversePaymentModal";
import PayDialog from "./PayDialog";
import NoteDialog from "./NoteDialog";
import PlanDialog from "./PlanDialog";
import RefundDialog from "./RefundDialog";
import SettleSwitch from "./SettleSwitch";
import { BlockLegend, LargeBlocks } from "./MonthBlocks";
import { dayLabel, mnt, monthName, PLAN_LABEL, stampLabel } from "./ledgerFormat";
import { METHOD_LABEL, STATUS_LABEL, errMsg } from "./paymentHelpers";
import type { LedgerPayment, LedgerRow, StudentLedger as Data } from "./ledgerTypes";
import type { Payment } from "./types";

const REFUND_STATUS: Record<string, string> = {
  DRAFT: "Ноорог",
  PENDING_APPROVAL: "Батлахыг хүлээж буй",
  APPROVED: "Батлагдсан",
  PAID: "Олгосон",
  CANCELLED: "Цуцалсан",
};

function Stat({ label, value, tone = "text-ink", sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-dim">{label}</p>
      <p className={`text-[15px] font-bold tabular-nums sm:text-lg ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-ink-dim">{sub}</p>}
    </div>
  );
}

function CallLink({ phone, label }: { phone: string | null | undefined; label: string }) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone.replace(/\s/g, "")}`}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-semibold text-ink hover:border-brand"
    >
      <Phone className="h-4 w-4 text-ink-dim" aria-hidden />
      {label}
      <span className="tabular-nums text-ink-dim">{phone}</span>
    </a>
  );
}

/** Сурагчийн төлбөрийн дэлгэрэнгүй: блок, бүртгэх, тэмдэглэл, түүх, буцаалт. */
export default function StudentLedger({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pay, setPay] = useState<{ month: string | null } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [reversing, setReversing] = useState<Payment | null>(null);

  const load = useCallback(() => {
    api<Data>(`/payments/ledger/student/${encodeURIComponent(id)}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(errMsg(e)));
  }, [id]);
  useEffect(load, [load]);

  async function confirmPending(p: LedgerPayment) {
    try {
      await api(`/payments/${encodeURIComponent(p.id)}/confirm`, { method: "POST", body: {} });
      toast.success("Баталгаажлаа");
      load();
    } catch (e) {
      toast.error(errMsg(e));
    }
  }

  if (error && !data) return <ErrorState message={error} onRetry={load} />;
  if (!data)
    return (
      <div className="space-y-4" role="status" aria-label="Ачаалж байна">
        <SkeletonCard className="h-32" />
        <SkeletonCard className="h-40" />
        <SkeletonRows rows={4} />
      </div>
    );

  const r: LedgerRow = data.row;
  const back = r.classroom
    ? { href: `/app/payments/class/${encodeURIComponent(r.classroom.id)}`, label: r.classroom.name }
    : { href: "/app/payments", label: "Төлбөр" };
  // Гараар бүтэн жилд гэрээ = төлсөн дүн — «Төлсөн»-тэй давхардуулж дүн бичихгүй
  const planText = r.plan.settled
    ? "Бүтэнд тооцсон"
    : r.plan.guessed
      ? "Багц тодорхойгүй"
      : `${PLAN_LABEL[r.plan.kind]} ${mnt(r.plan.kind === "MONTHLY" ? r.plan.fee : r.plan.total)}`;
  const name = `${r.firstName} ${r.lastName}`;

  return (
    <div className="space-y-5">
      <Link href={back.href} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {back.label}
      </Link>

      <section className="chunky space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="cyrillic-heading text-2xl font-extrabold text-ink">
              {r.firstName} <span className="font-semibold text-ink-dim">{r.lastName}</span>
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-dim">
              {r.classroom && (
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: getClassroomColor(r.classroom.id) }}
                />
              )}
              <Meta
                items={[
                  r.classroom?.name,
                  data.daysPerWeek ? `7 хоногт ${data.daysPerWeek} өдөр` : null,
                  r.code,
                  r.startDate ? `${dayLabel(r.startDate)}-нээс` : null,
                ]}
              />
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPlanOpen(true)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold ${
              r.plan.guessed ? "border-dashed border-error/50 text-error" : "border-line text-ink hover:border-brand"
            }`}
          >
            {planText}
            <Pencil className="h-4 w-4 text-ink-dim" aria-label="Багц засах" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-ink/[0.03] p-3 sm:gap-3">
          <Stat label="Төлсөн" value={mnt(r.paidTotal)} />
          <Stat
            label="Өр"
            value={mnt(r.owedNow)}
            tone={r.owedNow > 0 ? "text-error" : "text-ink"}
            sub={r.overdueDays > 0 ? `${r.overdueDays} хоног хэтэрсэн` : undefined}
          />
          {r.credit > 0 ? (
            <Stat label="Илүү төлсөн" value={mnt(r.credit)} tone="text-info" />
          ) : (
            <Stat label="Жилийн үлдэгдэл" value={mnt(r.remaining)} />
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <h2 className="text-sm font-semibold text-ink">2026–2027 оны сарууд</h2>
            <InfoHint label="Блокийн тайлбар">
              <BlockLegend />
            </InfoHint>
          </div>
          <LargeBlocks
            blocks={r.blocks}
            current={data.month}
            settled={r.plan.settled}
            onPick={(m) => setPay({ month: m })}
          />
        </div>

        <SettleSwitch row={r} settlement={data.settlement} onChanged={load} />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPay({ month: null })}>
            <Plus aria-hidden /> Төлбөр бүртгэх
          </Button>
          <Button variant="outline" onClick={() => setNoteOpen(true)}>
            <MessageSquarePlus aria-hidden /> Тэмдэглэл
          </Button>
          <Button variant="outline" onClick={() => setRefundOpen(true)}>
            <DoorOpen aria-hidden /> Төвөөс гарах
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <CallLink phone={r.phone} label="Сурагч" />
          <CallLink phone={data.profile?.fatherPhone} label="Аав" />
          <CallLink phone={data.profile?.motherPhone} label="Ээж" />
        </div>
      </section>

      <section id="notes" className="chunky scroll-mt-20 p-4 sm:p-5">
        <h2 className="mb-3 font-bold text-ink">Тэмдэглэл</h2>
        {data.notes.length === 0 ? (
          <EmptyState title="Тэмдэглэл алга" hint="Эцэг эхтэй ярьсан, амласан өдрөө «Тэмдэглэл»-ээр бичнэ" />
        ) : (
          <ul className="divide-y divide-line">
            {data.notes.map((n) => (
              <li key={n.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-ink-dim">
                  <Meta items={[n.authorName, stampLabel(n.createdAt)]} />
                  {n.promisedOn && n.promise?.state === "BROKEN" && (
                    <span className="inline-flex items-center gap-1 font-semibold text-error">
                      <CalendarX2 className="h-3.5 w-3.5" aria-hidden />
                      {dayLabel(n.promisedOn)} амласан, {n.promise.overdueDays} хоног хэтэрсэн
                    </span>
                  )}
                  {n.promisedOn && n.promise?.state === "UPCOMING" && (
                    <span className="inline-flex items-center gap-1 font-semibold text-brand">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      {dayLabel(n.promisedOn)} амласан
                    </span>
                  )}
                  {n.promisedOn && n.promise?.state === "KEPT" && (
                    <span className="inline-flex items-center gap-1 font-semibold text-success">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {dayLabel(n.promisedOn)} амласан, төлсөн
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-wrap text-sm text-ink">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="chunky p-4 sm:p-5">
        <h2 className="mb-3 font-bold text-ink">Төлбөрүүд</h2>
        {data.payments.length === 0 ? (
          <EmptyState title="Төлбөр бүртгэгдээгүй" hint="Банкны хуулга, QPay эсвэл гараар бүртгэсэн төлбөр энд гарна" />
        ) : (
          <ul className="divide-y divide-line">
            {data.payments.map((p) => {
              const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING;
              const muted = p.status === "REVERSED" || p.status === "REJECTED";
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${st.cls}`}>
                    <st.icon className="h-4 w-4" aria-label={st.text} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-bold tabular-nums ${muted ? "text-ink-dim line-through" : "text-ink"}`}>
                      {mnt(p.amount)}
                    </span>
                    <span className="block text-xs text-ink-dim">
                      <Meta
                        items={[
                          dayLabel((p.paidAt ?? p.createdAt).slice(0, 10)),
                          METHOD_LABEL[p.method] ?? p.method,
                          p.forMonth ? monthName(p.forMonth) : null,
                          p.status !== "CONFIRMED" ? st.text : null,
                          p.confirmedBy,
                        ]}
                      />
                    </span>
                    {p.description && <span className="block truncate text-xs text-ink-dim">{p.description}</span>}
                  </span>
                  {p.status === "PENDING" && (
                    <span className="flex gap-2">
                      <Button size="sm" onClick={() => confirmPending(p)}>
                        Батлах
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(p as Payment)}>
                        Засах
                      </Button>
                    </span>
                  )}
                  {p.status === "CONFIRMED" && (
                    <Button size="sm" variant="danger" onClick={() => setReversing(p as Payment)} className="min-h-11">
                      Буцаах
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {data.refunds.length > 0 && (
        <section className="chunky p-4 sm:p-5">
          <h2 className="mb-3 font-bold text-ink">Буцаалт</h2>
          <ul className="space-y-2">
            {data.refunds.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/app/tuition/refund/${encodeURIComponent(f.id)}`}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line px-3 py-2 hover:border-brand"
                >
                  <span className="text-sm">
                    <span className="font-semibold text-ink">{REFUND_STATUS[f.status] ?? f.status}</span>
                    <span className="text-ink-dim"> {dayLabel(f.leftOn)}-нд гарсан</span>
                  </span>
                  <span className="font-bold tabular-nums text-ink">
                    {f.refundAmount > 0 ? mnt(f.refundAmount) : `Дутуу ${mnt(f.shortfall)}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link
        href={`/app/students/${encodeURIComponent(r.id)}?tab=payments`}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand"
      >
        <UserRound className="h-4 w-4" aria-hidden /> Сурагчийн хуудас
      </Link>

      {pay && (
        <PayDialog
          row={r}
          month={pay.month}
          onClose={() => setPay(null)}
          onPaid={() => load()}
        />
      )}
      {noteOpen && <NoteDialog studentId={r.id} studentName={name} onClose={() => setNoteOpen(false)} onSaved={load} />}
      {planOpen && <PlanDialog data={data} onClose={() => setPlanOpen(false)} onSaved={load} />}
      {refundOpen && <RefundDialog row={r} onClose={() => setRefundOpen(false)} onCreated={load} />}
      <PaymentEditModal
        open={!!editing}
        payment={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          toast.success("Төлбөр засагдлаа");
          load();
        }}
      />
      <ReversePaymentModal
        open={!!reversing}
        payment={reversing}
        onClose={() => setReversing(null)}
        onReversed={() => {
          toast.success("Төлбөр буцаагдлаа");
          load();
        }}
      />
    </div>
  );
}
