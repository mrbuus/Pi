"use client";

import { Check, CloudCheck, FileText, LoaderCircle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { RaisedHandIcon } from "../shell/status";

function Count({ icon: Icon, label, value, total }: { icon: LucideIcon | typeof RaisedHandIcon; label: string; value: number; total: number }) {
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

/** «Хадгалж байна…» → «Хадгалагдсан 17:42» */
export function SaveStatus({
  pending,
  savedAt,
  idle = true,
  className = "",
}: {
  pending: number;
  savedAt: string | null;
  /** Юу ч хадгалаагүй үед «Автоматаар хадгалагдана» гэж харуулах эсэх */
  idle?: boolean;
  className?: string;
}) {
  if (!pending && !savedAt && !idle) return null;
  return (
    <span role="status" className={cn("items-center gap-1 whitespace-nowrap text-[11px] leading-4 text-ink-dim sm:text-xs", className)}>
      {pending > 0 ? (
        <>
          <LoaderCircle className="size-3.5 shrink-0 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
          Хадгалж байна…
        </>
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
 * Толгойн доор наалддаг нягт мөр: Ирсэн / Хийсэн / Илгээсэн тоо, хадгалалтын
 * төлөв, даалгаврын хугацаа, шалгуур. Утсан дээр тоо нь дүрстэй, төлөв нь доор нь жижгээр.
 */
export default function SummaryBar({
  present,
  done,
  submitted,
  total,
  pending,
  savedAt,
  deadline,
  criteria,
  idleHint,
}: {
  present: number;
  done: number | null;
  submitted: number | null;
  total: number;
  pending: number;
  savedAt: string | null;
  deadline: ReactNode;
  criteria: ReactNode;
  /** Тэмдэглэх табд л «Автоматаар хадгалагдана» (Хяналтад хадгалах юм алга) */
  idleHint: boolean;
}) {
  return (
    <div className="elev-1 sticky top-14 z-20 rounded-xl border border-line bg-surface px-2 py-1 sm:px-3">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-x-2 whitespace-nowrap text-[13px] text-ink-dim min-[380px]:gap-x-2.5 sm:flex-wrap sm:gap-x-4 sm:text-sm">
            <Count icon={RaisedHandIcon} label="Ирсэн" value={present} total={total} />
            {done !== null && <Count icon={Check} label="Хийсэн" value={done} total={total} />}
            {submitted !== null && <Count icon={FileText} label="Илгээсэн" value={submitted} total={total} />}
          </p>
          <SaveStatus pending={pending} savedAt={savedAt} idle={idleHint} className="flex sm:hidden" />
        </div>
        <SaveStatus pending={pending} savedAt={savedAt} idle={idleHint} className="hidden sm:flex" />
        {deadline}
        {criteria}
      </div>
    </div>
  );
}
