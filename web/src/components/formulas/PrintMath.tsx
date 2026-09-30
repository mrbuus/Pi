"use client";
import { memo } from "react";
import MathText from "@/components/MathText";

// Let KaTeX wrap between operators at the actual paper width. A height measured
// from the screen (even in beforeprint) can crop lines during PDF pagination.
export const PrintMath = memo(function PrintMath({ latex }: { latex: string }) {
  return (
    <div
      data-formula-print
      className="flow-root min-w-0 max-w-full overflow-x-auto print:overflow-visible [&_.katex-display]:!my-2 [&_.katex]:!text-left [&_.katex]:!whitespace-normal"
    >
      <MathText>{`$$${latex}$$`}</MathText>
    </div>
  );
});
