"use client";

import { useState } from "react";
import { ChevronDown, CircleCheck, CircleX, Info } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import { splitStepText, tidyTex } from "./display";
import type { Step } from "./steps";

/* Дэлгэрэнгүй бодолт: алхам бүр богино гарчиг + томьёо, урт тайлбар «Яагаад?» дотор.
   shown — эхний хэдэн алхмыг харуулах (алхамаар нээх); бусад нь хэвлэхэд л гарна */

function StepItem({ s, i, hidden }: { s: Step; i: number; hidden?: boolean }) {
  const [open, setOpen] = useState(false);
  // «1. Тодорхойлогдох муж» — дугаарыг дугуйд харуулдаг тул давтахгүй
  const { title, why } = splitStepText(s.text?.replace(/^\s*\d+[.)]\s+/, ""), !!s.tex?.length);
  const Icon = s.tone === "ok" ? CircleCheck : s.tone === "bad" ? CircleX : s.tone === "note" ? Info : null;
  const toneText = s.tone === "bad" ? "text-error" : s.tone === "ok" ? "text-success" : "text-ink";
  return (
    <li className={cn("flex gap-3 break-inside-avoid", hidden ? "hidden print:flex" : "enter-fade")}>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums",
          s.tone === "ok" ? "border-success/40 text-success" : s.tone === "bad" ? "border-error/40 text-error" : "border-line text-ink-dim",
        )}
      >
        {Icon ? <Icon className="h-4 w-4" /> : i + 1}
      </span>
      <div className="min-w-0 flex-1 space-y-1 pt-0.5">
        {title && <MathText className={cn("block text-sm font-medium leading-relaxed", toneText)}>{title}</MathText>}
        {s.tex?.map((t, k) => (
          <div key={k} className="overflow-x-auto overflow-y-hidden py-0.5 text-ink [scrollbar-width:thin]">
            <MathText>{`$$${tidyTex(t)}$$`}</MathText>
          </div>
        ))}
        {why && (
          <div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-xs font-semibold text-brand hover:bg-brand-bright/5"
            >
              Яагаад?
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-[var(--dur-micro)]", open && "rotate-180")} aria-hidden />
            </button>
            {open && <MathText className={cn("mt-1 block text-sm leading-relaxed", s.tone === "bad" ? "text-error" : "text-ink-dim")}>{why}</MathText>}
          </div>
        )}
      </div>
    </li>
  );
}

export default function StepsView({ steps, extra, shown = Infinity }: { steps: Step[]; extra?: string[]; shown?: number }) {
  return (
    <ol className="space-y-4" aria-label="Бодолтын алхам">
      {steps.map((s, i) => (
        <StepItem key={i} s={s} i={i} hidden={i >= shown} />
      ))}
      {extra?.map((t, i) => (
        <StepItem key={`x${i}`} s={{ text: "Холимог тоогоор", tex: [t.replace(/^=\s*/, "")] }} i={steps.length + i} hidden={steps.length + i >= shown} />
      ))}
    </ol>
  );
}
