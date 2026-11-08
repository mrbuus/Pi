"use client";

import { LoaderCircle, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TONE_SELECTED } from "@/components/attendance/marks";
import { cn } from "@/lib/cn";
import { formatPercent, parseScoreInput, quizPercent, quizTone } from "@/lib/quizScore";
import type { QuizCellState } from "./useHomeworkQuiz";

/** Дараагийн/өмнөх сурагчийн онооны талбар (жагсаалтын дарааллаар, шүүлтүүрт харагдаж буйгаар) */
function focusSibling(from: HTMLInputElement, dir: 1 | -1): boolean {
  const all = [...document.querySelectorAll<HTMLInputElement>("input[data-quiz-input]")];
  const next = all[all.indexOf(from) + dir];
  if (!next) return false;
  next.focus();
  next.select();
  return true;
}

/**
 * Шалгалтын оноо (эзэн 2026-11-08): «Онлайн» товчны оронд. Утсан дээр зөвхөн тоон гар
 * (inputMode=numeric), Enter/«Дараах» → дараагийн сурагч. Хувийг бичихгүй — хайрцгийн өнгө нь
 * хувиар: улаан < 50 ≤ улбар шар < 80 ≤ ногоон. Оноогүй бол өнгөгүй.
 */
export default function QuizScoreInput({
  id,
  name,
  max,
  score,
  state,
  onScore,
  onFlush,
  onInvalid,
}: {
  id: string;
  name: string;
  max: number;
  /** Одоогийн оноо (хадгалагдаж буйг оруулаад) */
  score: number | null;
  state: QuizCellState | null;
  onScore: (id: string, value: number | null, now?: boolean) => void;
  onFlush: (id: string) => void;
  onInvalid: (id: string, invalid: boolean) => void;
}) {
  const [text, setText] = useState(score === null ? "" : String(score));
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  // Өөр газраас (бодлогын тоо засах, дахин ачаалах) ирсэн утгыг бичиж байх үед дарахгүй
  // (рендерийн үеийн тохируулга — effect-гүй)
  const shownScore = text.trim() === "" ? null : Number(text);
  if (!focused && state !== "invalid" && state !== "saving" && shownScore !== score) {
    setText(score === null ? "" : String(score));
  }

  // Бодлогын тоо өөрчлөгдөхөд бичсэн утгыг дахин шалгана (ж: 12 → 10 болсон)
  const parsed = parseScoreInput(text, max);
  const invalid = !parsed.ok;
  const parsedValue = parsed.ok ? parsed.value : null;
  useEffect(() => {
    if (invalid && state !== "invalid") onInvalid(id, true);
    // Тоо нэмэгдээд бичсэн нь зөв болсон бол одоо хадгална
    else if (!invalid && state === "invalid") onScore(id, parsedValue);
  }, [invalid, state, id, parsedValue, onInvalid, onScore]);
  // Талбар алга болоход (шалгалтыг нуух) «буруу» төлөв үлдэхгүй
  useEffect(() => () => onInvalid(id, false), [id, onInvalid]);

  const tone = invalid ? null : quizTone(score, max);
  const pct = quizPercent(score, max);

  const commit = () => {
    if (!parsed.ok) return;
    if (state === "error") onScore(id, parsed.value, true);
    else onFlush(id);
  };

  const label = `${name}, шалгалтын оноо, ${max} бодлогоос`;
  const status =
    state === "invalid"
      ? `0-ээс ${max} хүртэл бүхэл тоо бичнэ үү`
      : state === "error"
        ? "Хадгалагдсангүй, дахин оролдоно уу"
        : state === "saving"
          ? "Хадгалж байна"
          : pct !== null
            ? formatPercent(pct)
            : "";

  return (
    <div
      title={status || undefined}
      className={cn(
        "relative min-h-11 min-w-0 rounded-lg border sm:min-h-9",
        invalid ? "border-dashed border-error bg-surface text-ink" : tone ? TONE_SELECTED[tone] : "border-line bg-surface text-ink",
      )}
    >
      <input
        ref={ref}
        data-quiz-input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="next"
        autoComplete="off"
        maxLength={3}
        value={text}
        aria-label={label}
        aria-invalid={invalid || undefined}
        onFocus={(e) => {
          setFocused(true);
          e.currentTarget.select();
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onChange={(e) => {
          // Компьютер дээр үсэг бичсэн ч зөвхөн цифр үлдэнэ
          const t = e.target.value.replace(/\D/g, "").slice(0, 3);
          setText(t);
          const r = parseScoreInput(t, max);
          if (r.ok) onScore(id, r.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!parsed.ok) return; // буруу утгатай байхад цааш явахгүй
            commit();
            const moved = focusSibling(e.currentTarget, e.key === "ArrowUp" ? -1 : 1);
            if (!moved && e.key === "Enter") e.currentTarget.blur();
          }
        }}
        // Талбар хайрцгийг бүтэн эзэлнэ (дарах талбай 44px, фокусын цагираг хайрцгийг тойрно);
        // iPhone дээр томруулахгүй: 16px
        // scroll-m: дараагийн сурагч руу шилжихэд наалттай тоон мөр, доод цэсний ард нуугдахгүй
        className="absolute inset-0 size-full scroll-mb-28 scroll-mt-56 rounded-lg bg-transparent pl-1 pr-7 text-center text-base font-bold tabular-nums text-inherit placeholder:font-normal placeholder:text-ink-dim/60 sm:pr-8"
        placeholder="–"
      />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[11px] font-medium tabular-nums opacity-70 sm:text-xs">
        /{max}
      </span>
      {state === "saving" ? (
        <LoaderCircle aria-hidden className="absolute right-0.5 top-0.5 size-3 animate-spin text-brand motion-reduce:animate-none" />
      ) : state === "error" || state === "invalid" ? (
        <TriangleAlert aria-hidden className="absolute right-0.5 top-0.5 size-3 text-error" />
      ) : null}
      <span className="sr-only" aria-live="polite">
        {state === "invalid" || state === "error" ? status : ""}
      </span>
    </div>
  );
}
