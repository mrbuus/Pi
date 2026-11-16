"use client";

import { CircleAlert } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";

/* ============================================================================
 * «Түгээмэл алдаа» — буруу сонголт бүрийн багшийн тайлбар (ProblemChoice.mistakeNote).
 * Сервер бодолт харагдах үед л илгээдэг. Сурагчийн өөрийн сонгосон буруу хариу
 * эхэнд, онцолсон; бусад нь доор. Тайлбаргүй бол юу ч зурахгүй.
 * ========================================================================== */

export interface MistakeNoteItem {
  /** Канон үсэг (A, B, …) */
  label: string;
  /** Сонголтын текст — үсэггүй UI-д аль сонголт болохыг, үсэгтэйд үсгийн ард утгыг харуулна */
  text?: string;
  note: string;
  mine: boolean;
}

/** Үсэгтэй сонголтуудаас (`choices[].mistakeNote`) жагсаалт үүсгэнэ — сурагчийнх эхэнд. */
export function notesFromChoices(
  choices: { letter: string; mistakeNote?: string | null }[] | null | undefined,
  mine: string | null,
): MistakeNoteItem[] {
  const out: MistakeNoteItem[] = [];
  for (const c of choices ?? []) {
    const note = c.mistakeNote?.trim();
    if (note) out.push({ label: c.letter, note, mine: c.letter === mine });
  }
  return out.sort((a, b) => Number(b.mine) - Number(a.mine));
}

export default function MistakeNotes({
  notes,
  showLabels = true,
  className,
}: {
  notes: MistakeNoteItem[] | null | undefined;
  /** Сонголт үсэгтэй харагдсан эсэх. Үгүй бол сонголтын текстийг харуулна */
  showLabels?: boolean;
  className?: string;
}) {
  if (!notes || notes.length === 0) return null;
  return (
    <section aria-label="Түгээмэл алдаа" className={cn("rounded-xl border border-line bg-surface p-3", className)}>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-ink">
        <CircleAlert className="h-4 w-4 shrink-0 text-error" aria-hidden />
        Түгээмэл алдаа
      </p>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li
            key={n.label}
            className={cn(
              "rounded-lg border p-2 text-sm",
              n.mine ? "border-error/40 bg-error/10" : "border-line",
            )}
          >
            <p className={cn("mb-1 text-xs font-semibold", n.mine ? "text-error" : "text-ink-dim")}>
              {n.mine
                ? showLabels
                  ? `Таны сонгосон ${n.label}`
                  : "Таны сонгосон хариу"
                : showLabels
                  ? `${n.label} хариу`
                  : "Өөр буруу хариу"}
              {n.text && (
                <>
                  {" "}
                  <MathText>{n.text}</MathText>
                </>
              )}
            </p>
            <MathText className="block text-ink">{n.note}</MathText>
          </li>
        ))}
      </ul>
    </section>
  );
}
