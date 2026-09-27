"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Flame,
  Layers,
  LoaderCircle,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import MathText from "@/components/MathText";
import { Progress } from "@/components/ui/kit/progress";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { Badge } from "@/components/ui/kit/badge";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/StateBlock";
import FlashCard from "./FlashCard";
import MatchExercise from "./MatchExercise";
import type {
  DueResponse,
  ReviewAnswer,
  ReviewCard,
  ReviewReceipt,
  ReviewStats,
} from "./types";
import styles from "./review.module.css";

type Data = { due: DueResponse; stats: ReviewStats };
type Submission = {
  card: ReviewCard;
  body: ReviewAnswer;
  state: "saving" | "failed" | "saved";
  error?: string;
  needsRefresh?: boolean;
  receipt?: ReviewReceipt;
};
const modes = {
  flashcard: "Флэш карт",
  blank: "Нөхөх",
  truefalse: "Үнэн эсвэл худал",
  match: "Хос тааруулах",
};
export default function ReviewClient() {
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState<{
    tick: number;
    data?: Data;
    error?: string;
  }>();
  const [deck, setDeck] = useState<ReviewCard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, ReviewReceipt>>({});
  const [submission, setSubmission] = useState<Submission | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([
      api<DueResponse>("/formulas/review/due?limit=10"),
      api<ReviewStats>("/formulas/review/stats"),
    ])
      .then(([due, stats]) => {
        if (alive) setLoaded({ tick, data: { due, stats } });
      })
      .catch((error) => {
        if (alive)
          setLoaded({
            tick,
            error:
              error instanceof Error
                ? error.message
                : "Давталтыг ачаалж чадсангүй.",
          });
      });
    return () => {
      alive = false;
    };
  }, [tick]);
  useEffect(() => {
    if (!submission || submission.state === "saved") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [submission]);
  function home() {
    setDeck(null);
    setSubmission(null);
    setTick((value) => value + 1);
  }
  function start() {
    if (!loaded?.data?.due.cards.length) return;
    setDeck(loaded.data.due.cards);
    setIndex(0);
    setOutcomes({});
    setSubmission(null);
    setStartedAt(Date.now());
  }
  async function send(pending: Submission) {
    setSubmission({ ...pending, state: "saving", error: undefined });
    try {
      const receipt = await api<ReviewReceipt>(
        `/formulas/review/${encodeURIComponent(pending.card.slug)}`,
        { method: "POST", body: pending.body },
      );
      setOutcomes((previous) => ({
        ...previous,
        [pending.card.slug]: receipt,
      }));
      setSubmission((previous) =>
        previous?.body.exerciseToken === pending.body.exerciseToken
          ? { ...pending, state: "saved", receipt }
          : previous,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Хариулт хадгалагдсангүй. Дахин оролдоно уу.";
      setSubmission((previous) =>
        previous?.body.exerciseToken === pending.body.exerciseToken
          ? {
              ...pending,
              state: "failed",
              error: message,
              needsRefresh: error instanceof ApiError && error.status === 409,
            }
          : previous,
      );
      toast.error(message);
    }
  }
  function answer(
    card: ReviewCard,
    value: Omit<ReviewAnswer, "exerciseToken">,
  ) {
    if (submission) return;
    void send({
      card,
      body: { exerciseToken: card.exercise.token, ...value },
      state: "saving",
    });
  }
  function next() {
    if (submission?.state !== "saved") return;
    setSubmission(null);
    setIndex((value) => value + 1);
    setElapsed(Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
  }
  if (!deck) {
    const current = loaded?.tick === tick ? loaded : undefined;
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <Badge tone="brand">Өдөр бүр бага багаар</Badge>
          <h1 className="mt-3 text-2xl font-bold">Томьёо цээжлэх</h1>
          <p className="mt-2 text-ink-dim">
            Санаанаасаа сэргээж, өөр төрлийн дасгалаар мэдлэгээ бататгаарай.
          </p>
        </header>
        {!current ? (
          <LoadingState rows={4} label="Давталт ачаалж байна" />
        ) : current.error ? (
          <div className="[&_button]:min-h-11">
            <ErrorState
              message={current.error}
              onRetry={() => setTick((value) => value + 1)}
            />
          </div>
        ) : (
          current.data && (
            <>
              <Card>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 text-lg font-bold">
                      <Layers className="h-5 w-5 text-brand" aria-hidden />
                      Өнөөдрийн карт
                    </h2>
                    <Badge tone="warning">
                      <Flame aria-hidden />
                      {current.data.stats.streakDays} өдрийн цуваа
                    </Badge>
                  </div>
                  <p className="text-4xl font-extrabold">
                    {current.data.due.dueCount + current.data.due.newCount}
                  </p>
                  <p className="text-sm text-ink-dim">
                    Давтах: {current.data.due.dueCount}. Шинэ:{" "}
                    {current.data.due.newCount}. Өнөөдөр давтсан:{" "}
                    {current.data.stats.reviewedToday}.
                  </p>
                  {current.data.due.cards.length > 0 ? (
                    <Button onClick={start} className="w-full sm:w-auto">
                      Эхлэх ({current.data.due.cards.length} карт)
                    </Button>
                  ) : (
                    <EmptyState
                      icon={CheckCircle2}
                      title="Өнөөдрийн давталт дууслаа"
                      hint="Дараагийн давталтын өдөр шинэ карт гарна. Сайн ажиллалаа."
                    />
                  )}
                </CardContent>
              </Card>
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ["Эзэмшсэн", current.data.stats.mastered],
                  ["Сурч байгаа", current.data.stats.learning],
                  ["Шинэ", current.data.stats.new],
                ].map(([label, count]) => (
                  <Card key={label} className="p-5 px-3 text-center sm:p-6">
                    <dt className="text-xs text-ink-dim">{label}</dt>
                    <dd className="mt-2 text-2xl font-bold">{count}</dd>
                  </Card>
                ))}
              </dl>
              <p className="text-sm text-ink-dim">
                Хариулт бүрийг хадгалсны дараа дараагийн карт руу орно. Флэш
                картыг өөрөө үнэлнэ; бусад дасгалыг систем шалгана.
              </p>
            </>
          )
        )}
      </div>
    );
  }
  if (index >= deck.length) {
    const hard = deck
      .filter((card) => ["AGAIN", "HARD"].includes(outcomes[card.slug]?.result))
      .sort(
        (a, b) =>
          Number(outcomes[a.slug].result !== "AGAIN") -
          Number(outcomes[b.slug].result !== "AGAIN"),
      )
      .slice(0, 3);
    return (
      <div className={`${styles.complete} mx-auto max-w-3xl space-y-6`}>
        <Card>
          <CardContent className="space-y-4 text-center">
            <Trophy className="mx-auto h-12 w-12 text-warning" aria-hidden />
            <h1 className="text-2xl font-bold">
              {deck.length}/{deck.length} давтлаа
            </h1>
            <p className="text-ink-dim">
              Хугацаа: {Math.floor(elapsed / 60)} мин {elapsed % 60} сек.
            </p>
            <p>Өнөөдрийн хариултууд хадгалагдлаа.</p>
            <Button onClick={home}>Давталтын нүүр рүү</Button>
          </CardContent>
        </Card>
        {hard.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-lg font-bold">Дахин анхаарах томьёонууд</h2>
            {hard.map((card) => (
              <Button
                key={card.slug}
                asChild
                variant="outline"
                className="w-full justify-start whitespace-normal text-left"
              >
                <Link href={`/app/formulas/${encodeURIComponent(card.slug)}`}>
                  {card.title}
                </Link>
              </Button>
            ))}
          </section>
        )}
      </div>
    );
  }
  const card = deck[index];
  const group = card.exercise.groupId
    ? deck.filter((row) => row.exercise.groupId === card.exercise.groupId)
    : [];
  const feedback = submission?.receipt?.feedback;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Томьёоны давталт</h1>
        <Badge tone="brand">
          {index + 1}/{deck.length} карт
        </Badge>
      </header>
      <Progress
        value={(index / deck.length) * 100}
        aria-label="Давталтын явц"
      />
      <Badge>{modes[card.exercise.mode]}</Badge>
      {card.exercise.mode === "flashcard" ? (
        <FlashCard
          key={card.slug}
          card={card}
          disabled={Boolean(submission)}
          onRate={(result) => answer(card, { result })}
        />
      ) : card.exercise.mode === "match" ? (
        <MatchExercise
          key={card.exercise.groupId}
          cards={group}
          outcomes={outcomes}
          disabled={Boolean(submission)}
          onAnswer={(target, answerValue) =>
            answer(target, { answer: answerValue })
          }
        />
      ) : (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="font-bold">{card.title}</h2>
            <MathText className="block max-w-full overflow-x-auto">{`$${card.exercise.prompt ?? ""}$`}</MathText>
            <div
              role="group"
              aria-label="Хариултын сонголтууд"
              className="grid gap-3 sm:grid-cols-2"
            >
              {card.exercise.options.map((option) => {
                const correct = Boolean(
                  feedback &&
                  (card.exercise.mode === "truefalse"
                    ? option.id === feedback.answer
                    : option.text === feedback.answer),
                );
                const selected = submission?.body.answer === option.id;
                return (
                  <Button
                    key={option.id}
                    variant={
                      correct ? "success" : selected ? "secondary" : "outline"
                    }
                    disabled={Boolean(submission)}
                    aria-pressed={selected}
                    onClick={() => answer(card, { answer: option.id })}
                    className="min-w-0 whitespace-normal"
                  >
                    {correct && <CheckCircle2 aria-hidden />}
                    <MathText className="min-w-0 max-w-full overflow-x-auto">
                      {card.exercise.mode === "blank"
                        ? `$${option.text}$`
                        : option.text}
                    </MathText>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      {submission?.state === "saving" && (
        <p
          role="status"
          className="flex items-center gap-2 text-sm text-ink-dim"
        >
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          Хариулт хадгалж байна…
        </p>
      )}
      {submission?.state === "failed" && (
        <div className="space-y-3 [&_button]:min-h-11">
          <ErrorState
            message={submission.error ?? "Хариулт хадгалагдсангүй."}
            onRetry={
              submission.needsRefresh ? undefined : () => void send(submission)
            }
          />
          {submission.needsRefresh ? (
            <>
              <p className="text-sm text-ink-dim">
                Дасгалын мэдээлэл шинэчлэгдсэн эсвэл хугацаа дууссан байна. Өмнө
                хадгалсан давталтууд хэвээр үлдэнэ.
              </p>
              <Button onClick={home}>Давталтыг шинээр ачаалах</Button>
            </>
          ) : (
            <p className="text-sm text-ink-dim">
              Сонгосон хариулт хадгалагдаагүй байна. Дахин оролдвол давхар
              бүртгэгдэхгүй.
            </p>
          )}
        </div>
      )}
      {submission?.state === "saved" && (
        <div className="space-y-4">
          <div
            role="status"
            className={`rounded-2xl border p-4 ${feedback?.correct === false ? "border-warning/40 bg-warning/5" : "border-success/40 bg-success/5"}`}
          >
            <p className="font-semibold">
              {feedback
                ? feedback.correct
                  ? "Зөв хариуллаа"
                  : "Дахин санаарай"
                : "Өөрийн үнэлгээ хадгалагдлаа"}
            </p>
            {feedback && (
              <>
                <p className="mt-2 text-sm">Зөв хариулт:</p>
                <div className="overflow-x-auto text-success">
                  <MathText>
                    {submission.card.exercise.mode === "match" ||
                    submission.card.exercise.mode === "blank"
                      ? `$${feedback.answer}$`
                      : feedback.answer === "true"
                        ? "Үнэн"
                        : feedback.answer === "false"
                          ? "Худал"
                          : feedback.answer}
                  </MathText>
                </div>
                {feedback.why && (
                  <MathText className="block max-w-full overflow-x-auto">
                    {feedback.why}
                  </MathText>
                )}
              </>
            )}
            <p className="mt-2 text-sm text-ink-dim">
              Дараагийн давталт:{" "}
              {new Intl.DateTimeFormat("mn-MN", {
                timeZone: "Asia/Ulaanbaatar",
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(submission.receipt!.dueAt))}
            </p>
          </div>
          <Button onClick={next} className="w-full sm:w-auto">
            {index + 1 === deck.length ? "Дүнгээ харах" : "Дараагийн карт"}
          </Button>
        </div>
      )}
    </div>
  );
}
