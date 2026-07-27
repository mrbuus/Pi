"use client";

import MathText from "@/components/MathText";

/* ============================================================================
 * ChoiceList — CHOICE бодлогын сонголтуудыг ХОЁР горимоор харуулна:
 *   TEXT   — бүтэцтэй сонголт: үсэггүй, зөвхөн утга (сурагч бүрд дараалал
 *            холилдоно). Том тап-товч, сонгосон төлөв ӨНГӨӨС ГАДНА зузаан
 *            хүрээ + ✓ тэмдгээр ялгарна (өнгөөр ялгаагаа мэдэрдэггүй
 *            сурагчид ч тодорхой харна).
 *   LETTER — хуучин импортын дата: хувилбарууд бодлогын текст дотор, зөвхөн
 *            үсгээр сонгоно — байрлал ХӨДЛӨХГҮЙ.
 * ========================================================================== */

export default function ChoiceList({
  mode,
  choices,
  selected,
  onSelect,
  problemNumber,
}: {
  mode: "TEXT" | "LETTER";
  choices: string[];
  selected: number | string | undefined;
  onSelect: (value: number | string) => void;
  problemNumber: number;
}) {
  const groupLabel = `${problemNumber}-р бодлогын хариултын сонголтууд`;

  if (mode === "LETTER") {
    return (
      <div className="flex flex-wrap gap-2.5" role="group" aria-label={groupLabel}>
        {choices.map((letter) => {
          const sel = selected === letter;
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={sel}
              onClick={() => onSelect(letter)}
              className={`relative flex h-14 w-14 items-center justify-center rounded-xl border-2 text-lg font-bold transition ${
                sel
                  ? "border-brand-bright bg-brand-bright text-on-brand"
                  : "border-line hover:border-brand-bright/50"
              }`}
            >
              {letter}
              {sel && (
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-bright text-[11px] text-on-brand"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5" role="group" aria-label={groupLabel}>
      {choices.map((c, ci) => {
        const sel = selected === ci;
        return (
          <button
            key={ci}
            type="button"
            aria-pressed={sel}
            onClick={() => onSelect(ci)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-4 text-left text-base leading-relaxed transition ${
              sel ? "border-brand-bright bg-brand-bright/15" : "border-line hover:border-brand-bright/50"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                sel ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line text-ink-dim"
              }`}
              aria-hidden
            >
              {sel ? "✓" : ci + 1}
            </span>
            <span className="flex-1">
              <MathText>{c}</MathText>
            </span>
          </button>
        );
      })}
    </div>
  );
}
