"use client";

import type { Dimension } from "./catalog";
import type { ThemeColors } from "./theme";
import MathText from "../MathText";

/* Канвасын хажууд (доод карт дотор) харагдах легенд: биетийн хэмжигдэхүүн
 * бүрийг ЗӨВХӨН өнгөөр биш, өнгөт цэг + НЭР хамтад нь бичиж ялгана —
 * өнгө ялгах чадваргүй хэрэглэгчид ч ойлгоно (Ё - хараа хандалт). */
export function DimensionLegend({
  dims,
  colors,
}: {
  dims: Dimension[];
  colors: ThemeColors;
}) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
      {dims.map((d) => (
        <li key={d.label} className="flex items-center gap-1.5 text-xs text-ink-dim">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-line"
            style={{ background: colors[d.colorKey] }}
          />
          <MathText>{d.label}</MathText>
        </li>
      ))}
    </ul>
  );
}
