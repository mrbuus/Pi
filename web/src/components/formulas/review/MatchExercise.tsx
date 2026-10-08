"use client";
import { useState } from "react";
import MathText from "@/components/MathText";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import type { ReviewCard, ReviewReceipt } from "./types";

export default function MatchExercise({
  cards,
  outcomes,
  disabled,
  onAnswer,
}: {
  cards: ReviewCard[];
  outcomes: Record<string, ReviewReceipt>;
  disabled: boolean;
  onAnswer: (card: ReviewCard, answer: string) => void;
}) {
  const [selected, setSelected] = useState(cards[0].slug);
  const remaining = cards.filter((card) => !outcomes[card.slug]);
  const active =
    remaining.find((card) => card.slug === selected) ?? remaining[0];
  const finishedAnswers = cards.flatMap((card) =>
    outcomes[card.slug]?.feedback?.answer
      ? [outcomes[card.slug].feedback!.answer]
      : [],
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-dim">
        Гарчиг сонгоод тохирох томьёог дарна уу. Хос бүрийн эхний хариултыг
        бүртгэнэ.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div role="group" aria-label="Хосын гарчгууд" className="space-y-2">
          {cards.map((card) => (
            <Button
              key={card.slug}
              variant={active?.slug === card.slug ? "secondary" : "outline"}
              disabled={disabled || Boolean(outcomes[card.slug])}
              aria-pressed={active?.slug === card.slug}
              onClick={() => setSelected(card.slug)}
              className="w-full justify-start whitespace-normal text-left"
            >
              {outcomes[card.slug] && <Check aria-hidden />}
              {card.title}
            </Button>
          ))}
        </div>
        <div role="group" aria-label="Хосын томьёонууд" className="space-y-2">
          {cards[0].exercise.options.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              disabled={
                disabled || !active || finishedAnswers.includes(option.text)
              }
              onClick={() => active && onAnswer(active, option.id)}
              className="w-full min-w-0 whitespace-normal"
            >
              <span className="max-w-full overflow-x-auto">
                <MathText>{`$${option.text}$`}</MathText>
              </span>
            </Button>
          ))}
        </div>
      </div>
      {active && (
        <p className="text-sm text-ink-dim" aria-live="polite">
          Сонгосон гарчиг: {active.title}
        </p>
      )}
    </div>
  );
}
