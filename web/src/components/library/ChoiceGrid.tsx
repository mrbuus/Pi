"use client";

import { useLayoutEffect, useRef, useState } from "react";
import ChoiceContent from "@/components/ChoiceContent";

export interface DisplayChoice {
  label: string;
  text: string;
  imageKey?: string | null;
  /** Зөвхөн багшид ирнэ — ногоон хайрцгаар тодорно */
  isCorrect?: boolean;
}

/**
 * A–E хариуны байрлал (эзний ТОМ дүрэм, 2026-10-18):
 *   • нэг мөрөнд 5 багтвал 5 тэнцүү багана — мөрөө дүүргэж, зай нь тэнцүү;
 *   • багтахгүй бол 3 + 2; түүнд ч багтахгүй бол мөр бүрт нэг;
 *   • ганц хариу өнчин мөрөнд ХЭЗЭЭ Ч үлдэхгүй (2+2+1 хэлбэрийг алгасна).
 * Хариу бүрийн БОДИТ өргөнийг (KaTeX-ээр зурсны дараа) нуугдмал давхаргад хэмжиж,
 * контейнерийн өргөнтэй (ResizeObserver) харьцуулна — утас, iPad, laptop бүгдэд,
 * зөвхөн өргөн өөрчлөгдөхөд л дахин тооцно.
 */
const GAP = 12; // gap-3
const CELL_PAD = 16 + 22 + 6; // px-2 ×2 + «A.» шошго + gap-1.5

/** n хариуг өнчингүй хуваах баганын тоонууд (томоос нь) */
function columnOptions(n: number): number[] {
  const opts = [n];
  for (let c = n - 1; c >= 2; c--) {
    const rem = n % c;
    if (rem === 0 || rem >= 2) opts.push(c);
  }
  opts.push(1);
  return [...new Set(opts)];
}

export default function ChoiceGrid({ choices, showCorrect = false }: { choices: DisplayChoice[]; showCorrect?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(choices.length);
  // Агуулга өөрчлөгдөхөд л дахин хэмжинэ (эцэг render бүрт шинэ массив ирдэг)
  const signature = choices.map((c) => `${c.text}\u0001${c.imageKey ?? ""}`).join("\u0002");

  useLayoutEffect(() => {
    const box = boxRef.current;
    const meas = measureRef.current;
    if (!box || !meas) return;
    const decide = () => {
      const width = box.clientWidth;
      const widest = Math.max(0, ...Array.from(meas.children, (c) => (c as HTMLElement).offsetWidth)) + CELL_PAD;
      const pick = columnOptions(choices.length).find((n) => n * widest + (n - 1) * GAP <= width) ?? 1;
      setCols((prev) => (prev === pick ? prev : pick));
    };
    decide();
    const ro = new ResizeObserver(decide);
    ro.observe(box);
    // KaTeX фонт/зураг ачаалагдсаны дараа өргөн өөрчлөгдөж болно
    ro.observe(meas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return (
    <div ref={boxRef} className="relative mt-2">
      {/* Хэмжилтийн давхарга: харагдахгүй, дэлгэц уншигч уншихгүй */}
      <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 flex w-max gap-3 text-sm">
        {choices.map((c) => (
          <span key={c.label} className="inline-block whitespace-nowrap">
            <ChoiceContent text={c.text} image={c.imageKey} imageClassName="max-h-40" />
          </span>
        ))}
      </div>
      <ul className="grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {choices.map((c) => {
          const correct = showCorrect && c.isCorrect;
          return (
            <li key={c.label} className="min-w-0">
              <span
                className={`inline-flex max-w-full items-start gap-1.5 rounded-lg px-2 py-0.5 text-sm ${
                  correct ? "bg-success/15 ring-1 ring-success/40" : ""
                }`}
              >
                <span className={`shrink-0 font-mono font-bold ${correct ? "text-success" : "text-ink-dim"}`}>{c.label}.</span>
                <span className="min-w-0">
                  <ChoiceContent text={c.text} image={c.imageKey} imageClassName="max-h-40" />
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
