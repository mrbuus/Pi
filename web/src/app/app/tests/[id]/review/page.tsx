"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CircleCheck, CircleX, Clock, Lock, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import MathText from "@/components/MathText";
import ChoiceContent from "@/components/ChoiceContent";
import ProblemFigure from "@/components/ProblemFigure";
import TheoryContent from "@/components/theory/TheoryContent";
import { Card } from "@/components/ui/Surface";
import { MetaTitle } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Badge } from "@/components/ui/kit/badge";
import FillAnswer from "@/components/thousand/FillAnswer";
import YoutubeEmbed from "@/components/thousand/YoutubeEmbed";
import { dateTimeUB, LEVEL_LABEL, type ReviewLevel } from "@/components/thousand/format";

interface ReviewItem {
  n: number;
  problemId: string;
  format: "CHOICE" | "FILL_NUMBER" | "OPEN";
  points: number;
  statementText: string | null;
  imageKey: string | null;
  choices: { letter: string; text: string; image?: string | null }[] | null;
  answered: boolean;
  myAnswer: unknown;
  // FULL үед л ирнэ
  answerKnown?: boolean;
  correct?: boolean | null;
  correctAnswer?: unknown;
  solution?: string | null;
  answerNeedsCheck?: boolean;
  youtube?: { url: string; embedUrl: string } | null;
}
interface ReviewResp {
  test: { id: string; title: string };
  result: { totalScore: number; maxScore: number } | null;
  level: ReviewLevel;
  opensAt: string | null;
  items: ReviewItem[];
}

// «1000 бодлого»-ын эргэн харалт — багшийн нээсэн түвшнээр серверт хаагдана
// (/thousand/tests/:id/review). Өмнө нь /app/thousand/:id/review байсан.
export default function ExamReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReviewResp | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ReviewResp>(`/thousand/tests/${encodeURIComponent(id)}/review`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Эргэн харалтыг ачаалж чадсангүй");
    }
  }, [id]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const back = (
    <Link
      href="/app/tests"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
    >
      <ArrowLeft size={17} aria-hidden /> Шалгалт
    </Link>
  );

  if (error) return <div className="mx-auto max-w-3xl space-y-4">{back}<ErrorState message={error} onRetry={() => void load()} /></div>;
  if (!data) return <div className="mx-auto max-w-3xl"><LoadingState rows={6} label="Эргэн харалт ачаалж байна" /></div>;

  const full = data.level === "FULL";
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      {back}
      <header className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h1 className="cyrillic-heading text-xl font-extrabold text-ink sm:text-2xl">
          <MetaTitle>{data.test.title}</MetaTitle>
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.result && (
            <Badge tone="brand" className="text-sm">
              Оноо: {data.result.totalScore} / {data.result.maxScore}
            </Badge>
          )}
          <Badge tone={data.level === "NONE" ? "neutral" : "success"}>{LEVEL_LABEL[data.level]}</Badge>
        </div>
      </header>

      {data.level === "NONE" && (
        <Card className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-ink-dim" aria-hidden />
          <div>
            <p className="font-semibold text-ink">Эргэн харалт хараахан нээгдээгүй байна</p>
            <p className="mt-1 text-sm text-ink-dim">
              {data.opensAt
                ? `${dateTimeUB(data.opensAt)}-нд автоматаар нээгдэнэ. Багш эрт нээж болно.`
                : "Багш нээсний дараа бодлого, хариугаа харах боломжтой."}
            </p>
          </div>
        </Card>
      )}

      {data.level === "PROBLEMS" && (
        <p className="flex items-start gap-2 rounded-xl border border-info/30 bg-info/10 p-3 text-sm text-info">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Багш одоогоор зөвхөн бодлого болон таны хариуг нээсэн байна. Зөв хариу, бодолт дараа нээгдэнэ.
        </p>
      )}

      <ol className="space-y-4">
        {data.items.map((item) => (
          <li key={item.problemId}>
            <ReviewCard item={item} full={full} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReviewCard({ item, full }: { item: ReviewItem; full: boolean }) {
  const status = !full
    ? null
    : !item.answerKnown
      ? { tone: "neutral" as const, icon: TriangleAlert, label: "Дүнд тооцогдоогүй" }
      : !item.answered
        ? { tone: "warning" as const, icon: CircleX, label: "Хариулаагүй" }
        : item.correct
          ? { tone: "success" as const, icon: CircleCheck, label: "Зөв" }
          : { tone: "danger" as const, icon: CircleX, label: "Буруу" };
  const mine = typeof item.myAnswer === "string" ? item.myAnswer : null;
  const right = typeof item.correctAnswer === "string" ? item.correctAnswer : null;

  return (
    <Card padding="tight" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink">
          {item.n}-р бодлого <span className="text-sm font-medium text-ink-dim">({item.points} оноо)</span>
        </p>
        {status && (
          <Badge tone={status.tone}>
            <status.icon aria-hidden /> {status.label}
          </Badge>
        )}
      </div>

      <ProblemFigure imageKey={item.imageKey} alt={`${item.n}-р бодлогын зураг`}>
        <MathText className="block text-ink">{item.statementText ?? ""}</MathText>
      </ProblemFigure>

      {item.format === "CHOICE" && item.choices && (
        <ul className="grid gap-2" aria-label="Сонголтууд">
          {item.choices.map((c) => {
            const isMine = mine === c.letter;
            const isRight = full && right === c.letter;
            const cls = isRight
              ? "border-success/50 bg-success/10"
              : isMine
                ? full
                  ? "border-error/50 bg-error/10"
                  : "border-brand-bright/50 bg-brand-bright/10"
                : "border-line";
            return (
              <li key={c.letter} className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${cls}`}>
                <span className="font-bold text-ink">{c.letter}</span>
                <span className="min-w-0 flex-1 text-ink">
                  <ChoiceContent text={c.text} image={c.image} />
                </span>
                {isMine && <span className="text-xs font-semibold text-ink-dim">Таны хариу</span>}
                {isRight && <span className="text-xs font-semibold text-success">Зөв хариу</span>}
              </li>
            );
          })}
        </ul>
      )}
      {item.format === "CHOICE" && !mine && <p className="text-sm text-ink-dim">Та энэ бодлогод хариулаагүй.</p>}

      {item.format !== "CHOICE" && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-ink">Таны хариу:</span>
            <FillAnswer statement={item.statementText} value={item.myAnswer} tone={full && item.answerKnown ? (item.correct ? "success" : "error") : "neutral"} />
          </div>
          {full && item.answerKnown && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">Зөв хариу:</span>
              <FillAnswer statement={item.statementText} value={item.correctAnswer} tone="success" />
            </div>
          )}
        </div>
      )}

      {full && item.answerNeedsCheck && (
        <p className="flex items-start gap-2 rounded-lg bg-warning/10 p-2 text-sm text-warning">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Энэ бодлогын хариуг багш нар дахин шалгаж байна.
        </p>
      )}

      {full && item.solution && (
        <section aria-label="Бодолт" className="rounded-xl border border-line bg-panel p-3">
          <p className="mb-1 text-sm font-bold text-brand-soft">Бодолт</p>
          <TheoryContent markdown={item.solution} className="text-sm" />
        </section>
      )}
      {full && item.youtube && <YoutubeEmbed embedUrl={item.youtube.embedUrl} title={`${item.n}-р бодлогын бодолт`} />}
    </Card>
  );
}
