"use client";

import Link from "next/link";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import type { FormulaRef } from "./types";

/**
 * Нэг томьёо: нэр + LaTeX (MathText). `link` бол Томьёоны сангийн дэлгэрэнгүй рүү
 * (тайлбар, жишээ бодлого тэнд бий).
 */
export default function FormulaLine({
  formula,
  link = false,
  compact = false,
  className,
}: {
  formula: FormulaRef;
  link?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <span className={cn("block font-semibold text-ink", compact ? "text-xs" : "text-sm")}>{formula.title}</span>
      {formula.latex && (
        <span className={cn("block max-w-full overflow-x-auto text-ink", compact ? "text-xs" : "text-sm")}>
          <MathText>{`$${formula.latex}$`}</MathText>
        </span>
      )}
    </>
  );
  const box = cn("block rounded-xl border border-line bg-panel/60 px-3 py-2", className);
  return link ? (
    <Link href={`/app/formulas/${formula.slug}`} prefetch={false} className={cn(box, "surface-interactive hover:border-brand")}>
      {body}
    </Link>
  ) : (
    <span className={box}>{body}</span>
  );
}
