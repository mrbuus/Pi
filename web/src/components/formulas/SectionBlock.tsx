"use client";
import { useId, useState } from "react";
import {
  ChevronDown,
  Sigma,
  TriangleRight,
  ChartNoAxesCombined,
  Dices,
  Infinity,
  Box,
  Compass,
  Radical,
  Variable,
  type LucideIcon,
} from "lucide-react";
import { FormulaCard } from "./FormulaCard";
import type { FormulaSection, FormulaSummary } from "./types";
const ICONS: Record<string, LucideIcon> = {
  sigma: Sigma,
  "triangle-right": TriangleRight,
  "chart-no-axes-combined": ChartNoAxesCombined,
  dices: Dices,
  infinity: Infinity,
  box: Box,
  compass: Compass,
  radical: Radical,
  variable: Variable,
};
const TONES = [
  "border-accent-teal/40 bg-accent-teal/10",
  "border-accent-gold/40 bg-accent-gold/10",
  "border-accent-violet/40 bg-accent-violet/10",
  "border-accent-fuchsia/40 bg-accent-fuchsia/10",
  "border-accent-sky/40 bg-accent-sky/10",
  "border-accent-rose/40 bg-accent-rose/10",
  "border-brand-bright/40 bg-brand-bright/10",
  "border-info/40 bg-info/10",
];
export function SectionBlock({
  section,
  formulas,
  index,
  offset,
}: {
  section: FormulaSection;
  formulas: FormulaSummary[];
  index: number;
  offset: number;
}) {
  const [open, setOpen] = useState(true);
  const id = useId();
  const iconName = section.icon ?? "";
  const Icon = Object.hasOwn(ICONS, iconName) ? ICONS[iconName] : Sigma;
  return (
    <section
      className={`chunky min-w-0 p-4 sm:p-5 ${TONES[index % TONES.length]}`}
    >
      <h2>
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-3 rounded-lg text-left font-bold focus-visible:outline-2 focus-visible:outline-brand-bright"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon className="size-6 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            {section.title}
            <span className="ml-2 text-sm font-normal text-ink-dim">
              {formulas.length}
            </span>
          </span>
          <ChevronDown
            className={`size-5 shrink-0 transition-transform ${open ? "" : "-rotate-90"}`}
            aria-hidden
          />
        </button>
      </h2>
      <div id={id} hidden={!open}>
        {section.description && (
          <p className="mb-4 mt-1 text-sm text-ink-dim">
            {section.description}
          </p>
        )}
        <div className="mt-3 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {formulas.map((f, i) => (
            <FormulaCard key={f.slug} formula={f} deferred={offset + i >= 30} />
          ))}
        </div>
      </div>
    </section>
  );
}
