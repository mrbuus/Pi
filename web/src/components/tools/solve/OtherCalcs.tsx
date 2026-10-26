"use client";

import { Play } from "lucide-react";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { Segmented } from "../core/ToolFrame";
import { SEQ_EXAMPLES } from "./examples";
import type { SeqSub } from "./solve";

/* «Бусад тооцоо»: прогресс, хослол, магадлал, Бернулли — тусдаа талбартай */

export const SEQ_SUBS: { value: SeqSub; label: string }[] = [
  { value: "arith", label: "Арифметик прогресс" },
  { value: "geom", label: "Геометр прогресс" },
  { value: "comb", label: "Хослол, сэлгэмэл" },
  { value: "prob", label: "Магадлал" },
  { value: "bern", label: "Бернулли" },
];

export const SEQ_FIELDS: Record<SeqSub, { key: string; tex: string }[]> = {
  arith: [{ key: "a1", tex: "a_1" }, { key: "d", tex: "d" }, { key: "n", tex: "n" }],
  geom: [{ key: "b1", tex: "b_1" }, { key: "q", tex: "q" }, { key: "n", tex: "n" }],
  comb: [{ key: "n", tex: "n" }, { key: "k", tex: "k" }],
  prob: [{ key: "m", tex: "m" }, { key: "n", tex: "n" }],
  bern: [{ key: "n", tex: "n" }, { key: "k", tex: "k" }, { key: "p", tex: "p" }],
};

export function seqLabel(sub: SeqSub, extra: Record<string, string>): string {
  return `$${SEQ_FIELDS[sub].map((f) => `${f.tex} = ${extra[f.key] ?? ""}`).join(",\\ ")}$`;
}

export default function OtherCalcs({
  sub,
  values,
  onSub,
  onValue,
  onSolve,
}: {
  sub: SeqSub;
  values: Record<string, string>;
  onSub: (s: SeqSub) => void;
  onValue: (k: string, v: string) => void;
  onSolve: (sub: SeqSub, extra: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-3">
      <Segmented label="Тооцооны төрөл" value={sub} onChange={onSub} options={SEQ_SUBS} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SEQ_FIELDS[sub].map((f) => (
          <label key={f.key} className="flex min-w-0 items-center gap-2">
            <span className="w-7 shrink-0 text-right text-sm text-ink-dim">
              <MathText>{`$${f.tex}$`}</MathText>
            </span>
            <input
              value={values[f.key] ?? ""}
              onChange={(e) => onValue(f.key, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSolve(sub, values)}
              inputMode="text"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-11 w-full min-w-0 rounded-xl border border-line bg-bg px-3 text-base text-ink"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => onSolve(sub, values)} className="min-h-11">
          <Play aria-hidden />
          Бодох
        </Button>
        {SEQ_EXAMPLES.filter((e) => e.sub === sub).map((e, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSolve(e.sub, e.extra)}
            className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink hover:bg-bg"
          >
            <MathText>{seqLabel(e.sub, e.extra)}</MathText>
          </button>
        ))}
      </div>
    </div>
  );
}
