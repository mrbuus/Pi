"use client";

import { Check, CircleAlert, Clock3, Minus } from "lucide-react";
import { blockLabel, dayLabel, monthName, monthNo, shortMnt } from "./ledgerFormat";
import type { BlockState, MonthBlock } from "./ledgerTypes";

/*
 * Сарын блок — төлбөрийн хэсгийн гол харагдац (эзний шаардлага 2026-10-13).
 *
 * Өнгө ДАНГААРАА утга илэрхийлэхгүй (STATUS §6.9): төлөв бүр өөр ХЭЛБЭРтэй.
 *   Төлсөн      — бүтэн дүүрэн ногоон
 *   Дутуу       — цайвар цэнхэр, төлсөн хувиар доороос дүүрнэ
 *   Өртэй       — улаан хүрээ + налуу зураас
 *   Болоогүй    — тасархай хүрээ, хоосон
 *   Сураагүй    — бараг харагдахгүй саарал
 * Шар/алтан өнгө ХЭРЭГЛЭХГҮЙ (эзний амт).
 */

const HATCH =
  "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--error)_32%,transparent)_0_2px,transparent_2px_6px)]";

// Утсан дээр өргөнөөрөө, компьютер дээр 44px багана (хүрэх талбай §6.9)
export const GRID = "grid grid-cols-9 gap-1 md:grid-cols-[repeat(9,2.75rem)] md:gap-1.5";

// Том блок дээр бичвэр байгаа тул зураас зөөлөн
const HATCH_SOFT =
  "bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--error)_16%,transparent)_0_2px,transparent_2px_7px)]";

const COMPACT: Record<BlockState, string> = {
  PAID: "bg-success",
  PARTIAL: "border border-info/60 bg-info/10",
  OWED: `border-2 border-error/75 bg-error/5 ${HATCH}`,
  FUTURE: "border border-dashed border-ink/25",
  OFF: "bg-ink/[0.04]",
};

function Fill({ b }: { b: MonthBlock }) {
  if (b.state !== "PARTIAL" || b.due <= 0) return null;
  const pct = Math.max(8, Math.min(100, Math.round((b.paid / b.due) * 100)));
  return <span aria-hidden className="absolute inset-x-0 bottom-0 bg-info/70" style={{ height: `${pct}%` }} />;
}

/** Жагсаалтын жижиг блокийн мөр. `onPick` өгвөл төлөгдөөгүй блок товч болно (компьютер). */
export function CompactBlocks({
  blocks,
  current,
  onPick,
}: {
  blocks: MonthBlock[];
  current?: string;
  onPick?: (month: string) => void;
}) {
  return (
    <div className={GRID}>
      {blocks.map((b) => {
        const label = blockLabel(b);
        const cls = `relative block h-7 overflow-hidden rounded-md md:h-11 md:rounded-lg ${COMPACT[b.state]} ${
          b.month === current ? "outline outline-2 outline-offset-1 outline-brand/35" : ""
        }`;
        const pickable = onPick && (b.state === "OWED" || b.state === "PARTIAL" || b.state === "FUTURE");
        if (pickable)
          return (
            <button
              key={b.month}
              type="button"
              title={`${label} — төлбөр бүртгэх`}
              aria-label={`${label}. Төлбөр бүртгэх`}
              onClick={() => onPick(b.month)}
              className={`${cls} cursor-pointer transition hover:brightness-95`}
            >
              <Fill b={b} />
            </button>
          );
        return (
          <span key={b.month} role="img" title={label} aria-label={label} className={cls}>
            <Fill b={b} />
          </span>
        );
      })}
    </div>
  );
}

/** Сарын дугаарын толгой — жагсаалтын баганатай яг таарна. */
export function MonthHeader({ months, current }: { months: string[]; current?: string }) {
  return (
    <div className={GRID} aria-hidden>
      {months.map((m) => (
        <span
          key={m}
          className={`text-center text-xs tabular-nums ${m === current ? "font-bold text-brand" : "text-ink-dim"}`}
        >
          {monthNo(m)}
        </span>
      ))}
    </div>
  );
}

const LARGE: Record<BlockState, string> = {
  PAID: "bg-success text-on-success",
  PARTIAL: "border border-info/60 bg-info/10 text-ink",
  OWED: `border-2 border-error/75 bg-error/5 text-ink ${HATCH_SOFT}`,
  FUTURE: "border border-dashed border-ink/25 text-ink-dim",
  OFF: "bg-ink/[0.04] text-ink-dim",
};

function LargeBody({ b }: { b: MonthBlock }) {
  switch (b.state) {
    case "PAID":
      return (
        <>
          <Check className="h-4 w-4" aria-hidden />
          <span className="tabular-nums">{shortMnt(b.paid)}</span>
        </>
      );
    case "PARTIAL":
      return (
        <span className="relative tabular-nums">
          {shortMnt(b.paid)}
          <span className="text-ink-dim"> / {shortMnt(b.due)}</span>
        </span>
      );
    case "OWED":
      return (
        <>
          <CircleAlert className="h-4 w-4 text-error" aria-hidden />
          <span className="tabular-nums">{shortMnt(b.due)}</span>
        </>
      );
    case "FUTURE":
      return (
        <>
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          <span className="tabular-nums">{dayLabel(b.dueOn)}</span>
        </>
      );
    default:
      return <Minus className="h-4 w-4" aria-hidden />;
  }
}

/** Дэлгэрэнгүй хуудасны том блокууд — утсан дээр 3×3, том дэлгэцэнд нэг мөр. */
export function LargeBlocks({
  blocks,
  current,
  onPick,
}: {
  blocks: MonthBlock[];
  current?: string;
  onPick?: (month: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-9">
      {blocks.map((b) => {
        const label = blockLabel(b);
        const pickable = onPick && (b.state === "OWED" || b.state === "PARTIAL" || b.state === "FUTURE");
        const cls = `relative flex min-h-16 flex-col justify-between overflow-hidden rounded-xl p-2 text-left text-sm font-semibold ${LARGE[b.state]} ${
          b.month === current ? "ring-2 ring-brand/40 ring-offset-2 ring-offset-surface" : ""
        }`;
        const body = (
          <>
            {b.state === "PARTIAL" && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 bg-info/25"
                style={{ height: `${Math.max(8, Math.round((b.paid / Math.max(1, b.due)) * 100))}%` }}
              />
            )}
            <span className={`relative text-xs ${b.state === "PAID" ? "" : "text-ink-dim"}`}>{monthName(b.month)}</span>
            <span className="relative flex items-center gap-1">
              <LargeBody b={b} />
            </span>
          </>
        );
        return pickable ? (
          <button
            key={b.month}
            type="button"
            aria-label={`${label}. Төлбөр бүртгэх`}
            title={label}
            onClick={() => onPick(b.month)}
            className={`${cls} transition hover:brightness-95`}
          >
            {body}
          </button>
        ) : (
          <div key={b.month} role="img" aria-label={label} title={label} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Тайлбар — «i» дотор (жижиг тайлбар бичвэр олшруулахгүй, STATUS §3.5) */
export function BlockLegend() {
  const items: { s: BlockState; t: string }[] = [
    { s: "PAID", t: "Төлсөн" },
    { s: "PARTIAL", t: "Дутуу (дүүргэлт = төлсөн хувь)" },
    { s: "OWED", t: "Өртэй — хугацаа нь болсон" },
    { s: "FUTURE", t: "Хугацаа болоогүй" },
    { s: "OFF", t: "Ангид сураагүй сар" },
  ];
  return (
    <ul className="space-y-1.5">
      {items.map((i) => (
        <li key={i.s} className="flex items-center gap-2 text-sm">
          <span className={`relative inline-block h-4 w-6 overflow-hidden rounded ${COMPACT[i.s]}`}>
            {i.s === "PARTIAL" && <span className="absolute inset-x-0 bottom-0 h-1/2 bg-info/70" />}
          </span>
          {i.t}
        </li>
      ))}
    </ul>
  );
}
