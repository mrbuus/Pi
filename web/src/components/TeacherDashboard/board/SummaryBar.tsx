"use client";

import { CloudCheck, Laptop, LoaderCircle, TriangleAlert, UsersRound, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AttPresentIcon, HwDoneIcon, HwSentIcon } from "@/components/attendance/marks";
import { cn } from "@/lib/cn";

function Count({ icon: Icon, label, value, total }: { icon: LucideIcon | typeof AttPresentIcon; label: string; value: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={`${label} ${value}/${total}`}>
      <Icon className="size-3.5 shrink-0 text-ink-dim" aria-hidden />
      <span className="sr-only sm:not-sr-only">{label}</span>
      <b className="font-bold tabular-nums text-ink">
        {value}/{total}
      </b>
    </span>
  );
}

/** «Д. … мөн тэмдэглэж байна» — энэ анги, энэ өдрийг зэрэг нээсэн бусад багш (D8) */
function Others({ names, className = "" }: { names: string[]; className?: string }) {
  const text = `${names.join(", ")} мөн тэмдэглэж байна`;
  return (
    <span
      role="status"
      title={text}
      className={cn("inline-flex items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-medium leading-4 text-info sm:text-xs", className)}
    >
      <UsersRound className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{text}</span>
    </span>
  );
}

/** «Хадгалж байна…» → «Хадгалагдсан 17:42» (алдаа бол улаанаар) */
export function SaveStatus({
  pending,
  savedAt,
  error,
  idle = true,
  className = "",
}: {
  pending: number;
  savedAt: string | null;
  error: string | null;
  idle?: boolean;
  className?: string;
}) {
  if (!pending && !savedAt && !error && !idle) return null;
  return (
    <span role="status" className={cn("items-center gap-1 whitespace-nowrap text-[11px] leading-4 text-ink-dim sm:text-xs", className)}>
      {pending > 0 ? (
        <>
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
          Хадгалж байна…
        </>
      ) : error ? (
        <span className="inline-flex min-w-0 items-center gap-1 text-error" title={error}>
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">Хадгалагдсангүй</span>
        </span>
      ) : savedAt ? (
        <>
          <CloudCheck className="size-3.5 shrink-0 text-success" aria-hidden />
          Хадгалагдсан {savedAt}
        </>
      ) : (
        <>
          <CloudCheck className="size-3.5 shrink-0" aria-hidden />
          Автоматаар хадгалагдана
        </>
      )}
    </span>
  );
}

/**
 * Толгойн доор наалддаг нягт мөр: Ирсэн / Хийсэн / Илгээсэн / Онлайн тоо, хадгалалтын төлөв,
 * зэрэг тэмдэглэж буй багш, шалгуур. Утсан дээр тоо нь дүрстэй, төлөв нь доор нь жижгээр.
 */
export default function SummaryBar({
  present,
  done,
  sent,
  online,
  total,
  save,
  idleHint,
  others,
  criteria,
}: {
  present: number;
  done: number | null;
  /** Тухайн хичээлийн даалгаврыг илгээсэн сурагч — үргэлж харагдана (эзэн 2026-10-18) */
  sent: number;
  online: number | null;
  total: number;
  save: { pending: number; savedAt: string | null; error: string | null };
  /** Тэмдэглэх табд л «Автоматаар хадгалагдана» */
  idleHint: boolean;
  /** Энэ анги, энэ өдрийг зэрэг нээсэн бусад багш */
  others: string[];
  criteria: ReactNode;
}) {
  return (
    <div className="elev-1 sticky top-14 z-20 rounded-xl border border-line bg-surface px-2 py-1 sm:px-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-x-2 whitespace-nowrap text-[13px] text-ink-dim min-[380px]:gap-x-2.5 sm:flex-wrap sm:gap-x-4 sm:text-sm">
            <Count icon={AttPresentIcon} label="Ирсэн" value={present} total={total} />
            {done !== null && <Count icon={HwDoneIcon} label="Хийсэн" value={done} total={total} />}
            <Count icon={HwSentIcon} label="Илгээсэн" value={sent} total={total} />
            {online !== null && <Count icon={Laptop} label="Онлайн" value={online} total={total} />}
          </p>
          {/* Утсан дээр: хадгалалтын төлөв ба зэрэг тэмдэглэж буй багш тоонуудын ДООР (давхцахгүй) */}
          <div className="flex min-w-0 items-center gap-2 sm:hidden">
            <SaveStatus {...save} idle={idleHint} className="flex shrink-0" />
            {others.length > 0 && <Others names={others} className="min-w-0" />}
          </div>
        </div>
        {others.length > 0 && <Others names={others} className="hidden max-w-[16rem] sm:inline-flex" />}
        <SaveStatus {...save} idle={idleHint} className="hidden sm:flex" />
        {criteria}
      </div>
    </div>
  );
}
