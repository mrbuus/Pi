"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import type { Metric, Row } from "./figure";
import { needsApprox, type Val } from "./fmt";

/* ============================================================================
 * Үр дүн (Photomath маягаар): эхэнд гол утгын жижиг картууд том тоогоор,
 * «Дэлгэрэнгүй» дарвал томьёо ба орлуулалт алхам алхмаар (тэнцүүгээр
 * тэгшилсэн мөрүүд). Ойролцоо утга дор нь саарал. Дотоод босоо гүйлгэгчгүй —
 * урт томьёо зөвхөн өөрийн мөрөндөө хэвтээ гүйнэ.
 * ========================================================================== */

/** «= \frac{12}{5}», «\approx 4.27» — утгын баруун тал */
function valRhs(v: Val, unit = ""): string {
  if (v.exact !== null) return `=${v.exact}${unit}`;
  return `${v.eq ? "=" : "\\approx "}${v.dec}${unit}`;
}

/** Дор нь саарал ойролцоо утга (яг хэлбэр бутархай/язгуур/π үед) */
function approxTex(v: Val, unit = ""): string | null {
  if (!needsApprox(v)) return null;
  return `${v.eq ? "=" : "\\approx "}${v.dec}${unit}`;
}

const M = ({ tex, className }: { tex: string; className?: string }) => <MathText className={className}>{`$${tex}$`}</MathText>;

/** Гол картын нэг мөр */
function KeyRow({ r, big }: { r: Row; big: boolean }) {
  const ap = approxTex(r.v, r.unit);
  return (
    <div className="min-w-0">
      <div className={cn("overflow-x-auto overflow-y-hidden whitespace-nowrap text-ink [scrollbar-width:none]", big ? "text-xl leading-snug" : "text-base")}>
        <M tex={`${r.sym}${valRhs(r.v, r.unit)}`} />
      </div>
      {ap && <M tex={ap} className="block text-xs text-ink-dim" />}
    </div>
  );
}

function KeyCard({ m }: { m: Metric }) {
  const all = m.rows ?? [];
  const rows = m.brief !== undefined && all[m.brief] ? [all[m.brief]] : all;
  const multi = rows.length > 1;
  return (
    <div className={cn("min-w-0 rounded-xl border border-line bg-bg px-3 py-2", multi && "col-span-2")}>
      <p className="text-xs text-ink-dim">{m.name}</p>
      <div className={cn("mt-0.5", multi ? "flex flex-wrap gap-x-5 gap-y-1" : "")}>
        {rows.map((r, i) => (
          <KeyRow key={i} r={r} big={!multi} />
        ))}
      </div>
    </div>
  );
}

/** aligned дотор бутархайг жижиг (мөрийн) хэлбэрээр — алхам бүр нам, нягт */
const T = "\\textstyle ";

/** Нэг мөрийн алхмууд: S &= ... \\ &= ... \\ &= утга */
function StepRow({ r }: { r: Row }) {
  const steps = r.steps ?? [];
  const ap = approxTex(r.v, r.unit);
  const rhs = valRhs(r.v, r.unit);
  const tex = steps.length
    ? `\\begin{aligned}${T}${r.sym}&=${T}${steps.join(`\\\\&=${T}`)}\\\\&${rhs.startsWith("=") ? `=${T}${rhs.slice(1)}` : `${T}${rhs}`}\\end{aligned}`
    : `${r.sym}${rhs}`;
  return (
    <div className="min-w-0">
      <div className="overflow-x-auto overflow-y-hidden py-1 text-base text-ink [scrollbar-width:thin]">
        <M tex={tex} />
      </div>
      {ap && <M tex={ap} className="block pl-5 text-xs text-ink-dim" />}
    </div>
  );
}

function DetailCard({ m }: { m: Metric }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-bg px-3 py-2.5">
      <p className="mb-1 text-xs font-medium text-ink-dim">{m.name}</p>
      {m.text ? (
        <p className="text-sm text-ink">{m.text}</p>
      ) : (
        <div className="space-y-2">
          {(m.rows ?? []).map((r, i) => (
            <StepRow key={i} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Results({ metrics, note }: { metrics: Metric[]; note?: string }) {
  const [open, setOpen] = useState(false);
  const keys = metrics.filter((m) => m.key && m.rows?.length);
  const chips = metrics.filter((m) => m.key && m.text);
  return (
    <div className="space-y-2 px-3 py-3 sm:px-4">
      {note && <p className="text-sm font-medium text-brand">{note}</p>}
      {chips.map((m) => (
        <p key={m.name} className="text-sm text-ink-dim">
          {m.name}: <span className="font-medium text-ink">{m.text}</span>
        </p>
      ))}
      {keys.length > 0 && (
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {keys.map((m) => (
            <KeyCard key={m.name} m={m} />
          ))}
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-brand-soft transition-colors duration-[var(--dur-micro)] hover:bg-brand-bright/10"
      >
        {open ? "Хураах" : "Дэлгэрэнгүй"}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-[var(--dur-base)]", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="grid gap-2 md:grid-cols-2">
          {metrics.map((m, i) => (
            <DetailCard key={`${m.name}${i}`} m={m} />
          ))}
        </div>
      )}
    </div>
  );
}
