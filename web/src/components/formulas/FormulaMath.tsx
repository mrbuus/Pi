"use client";
import { memo } from "react";
import MathText from "@/components/MathText";

export const FormulaMath = memo(function FormulaMath({
  text,
  display = false,
  focusable = display,
}: {
  text: string;
  display?: boolean;
  focusable?: boolean;
}) {
  return (
    <div
      className="min-w-0 max-w-full overflow-x-auto py-1 [overflow-wrap:anywhere] [&_.katex-display]:!my-2 [&_.katex-display]:!text-left [&_.katex]:!whitespace-normal"
      tabIndex={focusable ? 0 : undefined}
      role={display ? "region" : undefined}
      aria-label={display ? "Томьёо" : undefined}
    >
      <MathText>{display ? `$$${text}$$` : text}</MathText>
    </div>
  );
});
