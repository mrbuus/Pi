"use client";

import Link from "next/link";
import { useSyncExternalStore, type CSSProperties } from "react";
import { CalendarClock, CalendarX2, Check, MessageSquareText } from "lucide-react";
import { getClassroomColor } from "@/lib/classroomColor";
import { CompactBlocks } from "./MonthBlocks";
import { dayLabel, mnt, PLAN_LABEL, shortMnt } from "./ledgerFormat";
import type { LedgerRow } from "./ledgerTypes";

const QUERY = "(min-width: 768px)";
function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** Компьютерийн дэлгэц эсэх (утас тэргүүнд — сервер дээр false). */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}

export const studentHref = (id: string) => `/app/payments/student/${encodeURIComponent(id)}`;

/** Баруун талын нэг тоо — өр, илүү, бүтэн эсвэл дараагийн төлөх өдөр. */
export function RowSummary({ r, align = "right" }: { r: LedgerRow; align?: "right" | "left" }) {
  const box = `flex flex-col ${align === "right" ? "items-end text-right" : "items-start"} leading-tight`;
  if (r.owedNow > 0)
    return (
      <span className={box}>
        <span className="font-bold tabular-nums text-error">{mnt(r.owedNow)}</span>
        <span className="text-xs text-ink-dim">{r.owedMonths} сарын өр</span>
      </span>
    );
  if (r.credit > 0)
    return (
      <span className={box}>
        <span className="font-semibold tabular-nums text-info">+{mnt(r.credit)}</span>
        <span className="text-xs text-ink-dim">илүү төлсөн</span>
      </span>
    );
  if (r.remaining === 0)
    return (
      <span className={box}>
        <span className="inline-flex items-center gap-1 font-semibold text-success">
          <Check className="h-4 w-4" aria-hidden /> Бүтэн
        </span>
      </span>
    );
  if (r.nextDue)
    return (
      <span className={box}>
        <span className="tabular-nums text-ink">{shortMnt(r.nextDue.amount)}</span>
        <span className="text-xs text-ink-dim">{dayLabel(r.nextDue.dueOn)}-нд</span>
      </span>
    );
  return null;
}

/** Тэмдэглэл/амлалтын товч мөр. */
export function NoteLine({ r }: { r: LedgerRow }) {
  const p = r.promise;
  if (!p && !r.notes.last) return null;
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-xs">
      {p?.state === "BROKEN" ? (
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-error">
          <CalendarX2 className="h-3.5 w-3.5" aria-hidden />
          {dayLabel(p.on)} амласан, {p.overdueDays} хоног
        </span>
      ) : p?.state === "UPCOMING" ? (
        <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-brand">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          {dayLabel(p.on)} амласан
        </span>
      ) : (
        <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-ink-dim" aria-hidden />
      )}
      {r.notes.last && <span className="truncate text-ink-dim">{r.notes.last.body}</span>}
    </span>
  );
}

function PlanTag({ r }: { r: LedgerRow }) {
  return r.plan.guessed ? (
    <span className="rounded-md border border-dashed border-ink/30 px-1.5 text-xs text-ink-dim">Багц?</span>
  ) : (
    <span className="rounded-md bg-ink/5 px-1.5 text-xs text-ink-dim">{PLAN_LABEL[r.plan.kind]}</span>
  );
}

/**
 * Нэг сурагчийн мөр. Утсан дээр мөр бүхэлдээ холбоос (блок нь харагдац),
 * компьютер дээр төлөгдөөгүй блок дээр дарж шууд төлбөр бүртгэнэ.
 */
export default function LedgerRowItem({
  r,
  current,
  showClass = false,
  onPay,
}: {
  r: LedgerRow;
  current: string;
  showClass?: boolean;
  onPay?: (r: LedgerRow, month: string) => void;
}) {
  const desktop = useIsDesktop();
  const href = studentHref(r.id);
  const stripe = r.classroom ? ({ "--cls": getClassroomColor(r.classroom.id) } as CSSProperties) : undefined;
  const name = (
    <>
      <span className="font-semibold text-ink">{r.firstName}</span>{" "}
      <span className="text-sm text-ink-dim">{r.lastName}</span>
    </>
  );
  const meta = (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <PlanTag r={r} />
      {showClass && r.classroom && <span className="truncate text-xs text-ink-dim">{r.classroom.name}</span>}
      {r.code && <span className="text-xs tabular-nums text-ink-dim">{r.code}</span>}
    </span>
  );

  if (!desktop)
    return (
      <Link
        href={href}
        style={stripe}
        className={`block space-y-2 rounded-xl border border-line bg-surface p-3 row-interactive hover:bg-ink/[0.02] ${showClass ? "class-row" : ""}`}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0 space-y-0.5">
            <span className="block truncate">{name}</span>
            {meta}
          </span>
          <RowSummary r={r} />
        </span>
        <CompactBlocks blocks={r.blocks} current={current} />
        <NoteLine r={r} />
      </Link>
    );

  return (
    <div
      style={stripe}
      className={`grid grid-cols-[minmax(11rem,1fr)_auto_7.5rem] items-center gap-x-5 gap-y-1 rounded-xl px-3 py-2 row-interactive hover:bg-ink/[0.025] ${showClass ? "class-row" : ""}`}
    >
      <Link href={href} className="min-w-0 space-y-0.5 rounded-lg py-1 hover:underline">
        <span className="block truncate">{name}</span>
        {meta}
      </Link>
      <CompactBlocks blocks={r.blocks} current={current} onPick={onPay ? (m) => onPay(r, m) : undefined} />
      <RowSummary r={r} />
      {(r.promise || r.notes.last) && (
        <Link href={`${href}#notes`} className="col-start-1 col-end-4 min-w-0 rounded-md py-0.5 hover:underline">
          <NoteLine r={r} />
        </Link>
      )}
    </div>
  );
}
