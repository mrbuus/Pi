"use client";
import { useEffect, useState } from "react";
import MathText from "@/components/MathText";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { RATINGS, type ReviewCard, type ReviewResult } from "./types";
import styles from "./review.module.css";

export default function FlashCard({
  card,
  disabled,
  onRate,
}: {
  card: ReviewCard;
  disabled: boolean;
  onRate: (result: ReviewResult) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        disabled ||
        event.repeat ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        target?.closest('input, textarea, select, [contenteditable="true"]')
      )
        return;
      if (event.code === "Space" && !target?.closest("button, a")) {
        event.preventDefault();
        setFlipped((value) => !value);
      }
      const rating = RATINGS[Number(event.key) - 1];
      if (flipped && rating && /^[1-4]$/.test(event.key)) {
        event.preventDefault();
        onRate(rating.value);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [disabled, flipped, onRate]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-dim">
        Өөрийн үнэлгээ. Томьёогоо санаад картыг эргүүлээрэй.
      </p>
      <button
        type="button"
        aria-label={`${card.title}: ${flipped ? "Томьёоны асуулт руу эргүүлэх" : "Томьёоны хариуг харах"}`}
        aria-pressed={flipped}
        disabled={disabled}
        onClick={() => setFlipped((value) => !value)}
        className={`${styles.flip} rounded-3xl text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand`}
      >
        <div className={`${styles.inner} ${flipped ? styles.flipped : ""}`}>
          <div
            className={`${styles.face} ${styles.front}`}
            aria-hidden={flipped}
          >
            <p className="text-xl font-bold">{card.title}</p>
            <MathText>{"$$\\square$$"}</MathText>
            <span className="flex items-center gap-2 text-sm text-ink-dim">
              <RotateCw className="h-4 w-4" aria-hidden />
              Эргүүлж шалгах
            </span>
          </div>
          <div
            className={`${styles.face} ${styles.back}`}
            aria-hidden={!flipped}
          >
            <p className="font-bold">{card.title}</p>
            <div className={styles.math}>
              <MathText>{`$$${card.latex ?? ""}$$`}</MathText>
            </div>
          </div>
        </div>
      </button>
      {flipped && (
        <div
          role="group"
          aria-label="Өөрийн үнэлгээ"
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {RATINGS.map((rating, i) => (
            <Button
              key={rating.value}
              variant={rating.value === "GOOD" ? "default" : "outline"}
              disabled={disabled}
              onClick={() => onRate(rating.value)}
              aria-keyshortcuts={String(i + 1)}
            >
              {rating.label}
            </Button>
          ))}
        </div>
      )}
      <p className="hidden text-xs text-ink-dim sm:block">
        Space: эргүүлэх. 1–4: хариуг харсны дараа үнэлэх.
      </p>
    </div>
  );
}
