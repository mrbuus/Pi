"use client";
import Link from "next/link";
import { memo, type ReactNode } from "react";
import { Badge } from "@/components/ui/kit/badge";
import { FormulaMath } from "./FormulaMath";

export const FormulaCard = memo(function FormulaCard({
  formula,
  deferred = false,
  children,
}: {
  formula: {
    slug: string;
    title: string;
    general: string | null;
    latex: string | null;
    level?: string;
    grade?: number | null;
  };
  deferred?: boolean;
  children?: ReactNode;
}) {
  return (
    <article
      className="chunky chunky-press min-w-0 bg-panel p-4"
      style={
        deferred
          ? { contentVisibility: "auto", containIntrinsicSize: "auto 180px" }
          : undefined
      }
    >
      <Link
        href={`/app/formulas/${encodeURIComponent(formula.slug)}`}
        prefetch={false}
        className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-bright"
        aria-label={`${formula.title} дэлгэрэнгүй`}
      >
        <h3 className="min-h-11 text-base font-bold leading-snug text-ink">
          {formula.title}
        </h3>
        <FormulaMath
          text={formula.general || formula.latex || ""}
          display
          focusable={false}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {formula.level && (
            <Badge tone={formula.level === "CORE" ? "brand" : "neutral"}>
              {formula.level === "CORE" ? "ЭЕШ-ийн гол" : "Нэмэлт"}
            </Badge>
          )}
          {formula.grade && <Badge>{formula.grade}-р анги</Badge>}
        </div>
      </Link>
      {children && (
        <div className="mt-3 border-t border-line pt-3">{children}</div>
      )}
    </article>
  );
});
