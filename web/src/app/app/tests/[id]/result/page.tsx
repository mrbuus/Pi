"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpenCheck, CircleX, Lock, TriangleAlert, UserX } from "lucide-react";
import { api } from "@/lib/api";
import MathText from "@/components/MathText";
import ChoiceContent from "@/components/ChoiceContent";
import ProblemFigure from "@/components/ProblemFigure";
import TheoryContent from "@/components/theory/TheoryContent";
import FillAnswer from "@/components/thousand/FillAnswer";
import YoutubeEmbed from "@/components/thousand/YoutubeEmbed";
import { dateTimeUB } from "@/components/thousand/format";
import { Card } from "@/components/ui/Surface";
import { MetaTitle } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Progress } from "@/components/ui/kit/progress";
import { BAR_FILL, correctTone } from "@/components/exams/analytics";
import { errorText, shortTitle } from "@/components/exams/types";
import { cn } from "@/lib/cn";

interface WrongProblem {
  n: number;
  part: 1 | 2;
  items: { label: string; status: "WRONG" | "BLANK"; points: number }[];
  lost: number;
  problem: {
    format: "CHOICE" | "FILL_NUMBER" | "OPEN";
    statementText: string | null;
    imageKey: string | null;
    choices: { letter: string; text: string; image?: string | null }[] | null;
    myAnswer: unknown;
    correctAnswer: unknown;
    solution: string | null;
    answerNeedsCheck: boolean;
    youtube: { url: string; embedUrl: string } | null;
  } | null;
}

interface ResultResp {
  test: { id: string; title: string; type: string };
  absent: boolean;
  result: { totalScore: number; maxScore: number; percent: number } | null;
  parts: { part1: number; part1Max: number; part2: number; part2Max: number } | null;
  review: { level: "NONE" | "PROBLEMS" | "FULL"; opensAt: string | null; open: boolean; fullReview: boolean } | null;
  topics: { name: string; percent: number; earned: number; max: number }[];
  wrong: WrongProblem[] | null;
  practice: { topic: string; chapterIds: string[] } | null;
}

/**
 * Сурагчийн дүнгийн дэлгэц — 1 хуудас (SHALGALT-TOLOVLOGOO §4): оноо, хувь,
 * хэсэг тус бүр, сэдвийн эзэмшил, буруу бодлогууд; эргэн харалт нээгдсэний
 * дараа бодолт + бичлэг; «Ижил сэдвийн бодлого бодох» (одоо байгаа давтлагын
 * хөдөлгүүр /study-review). Ангийн байр — дүн нийтлэх тохиргоо гарах хүртэл
 * харуулахгүй (§8.6).
 */
export default function ExamResultPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ResultResp | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [practiceError, setPracticeError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ResultResp>(`/exam-results/my/${encodeURIComponent(id)}`));
    } catch (e) {
      setError(errorText(e, "Дүнг ачаалж чадсангүй"));
    }
  }, [id]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  async function startPractice(chapterIds: string[]) {
    setBusy(true);
    setPracticeError("");
    try {
      const run = await api<{ id: string }>("/study-review", {
        method: "POST",
        body: { clientRequestId: crypto.randomUUID(), budgetMinutes: 10, chapterIds },
      });
      router.push(`/app/study/review?run=${encodeURIComponent(run.id)}`);
    } catch (e) {
      setPracticeError(errorText(e, "Давтлага эхлүүлж чадсангүй"));
      setBusy(false);
    }
  }

  const back = (
    <Link
      href="/app/tests"
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
    >
      <ArrowLeft size={17} aria-hidden /> Шалгалт
    </Link>
  );

  if (error) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <LoadingState rows={6} label="Дүн ачаалж байна" />
      </div>
    );
  }

  const title = data.test.type === "THOUSAND" ? shortTitle(data.test.title) : data.test.title;

  if (data.absent || !data.result) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-5">
        {back}
        <Card className="flex items-start gap-3">
          <UserX className="mt-0.5 h-5 w-5 shrink-0 text-ink-dim" aria-hidden />
          <div>
            <h1 className="font-bold text-ink">
              <MetaTitle>{title}</MetaTitle>
            </h1>
            <p className="mt-1 text-sm text-ink-dim">Та энэ шалгалтад ирээгүй гэж тэмдэглэгдсэн.</p>
          </div>
        </Card>
      </div>
    );
  }

  const r = data.result;
  const weakest = data.topics.find((t) => t.earned < t.max) ?? null;
  const target = data.practice && data.practice.chapterIds.length > 0 ? data.practice : null;
  // Ганц сэдэв = бүх шалгалт (ж: 1000 бодлого) — сэдвийн нэр нэмэлт мэдээлэлгүй
  const namedTopic = target || data.topics.length > 1 ? weakest : null;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 pb-10">
      {back}

      <header className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <h1 className="cyrillic-heading text-lg font-extrabold text-ink sm:text-2xl">
          <MetaTitle>{title}</MetaTitle>
        </h1>
        <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-display text-4xl font-extrabold tabular-nums text-brand-soft">
            {r.totalScore}
            <span className="text-xl text-ink-dim">/{r.maxScore}</span>
          </p>
          <p className="pb-1 text-lg font-bold tabular-nums text-ink">{r.percent}%</p>
        </div>
        <Progress value={r.percent} className="mt-3" aria-label={`${r.percent} хувь`} />
        {data.parts && data.parts.part2Max > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <PartBox label="I хэсэг" got={data.parts.part1} max={data.parts.part1Max} />
            <PartBox label="II хэсэг" got={data.parts.part2} max={data.parts.part2Max} />
          </div>
        )}
      </header>

      {data.topics.length > 1 && (
        <Card padding="tight" className="space-y-2">
          <h2 className="font-bold text-ink">Сэдвийн эзэмшил</h2>
          <ul className="space-y-1.5">
            {data.topics.map((t) => (
              <li key={t.name} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate text-ink sm:w-48">
                  <MetaTitle>{t.name}</MetaTitle>
                </span>
                <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-line/40">
                  <span
                    className={cn("block h-full rounded-full", BAR_FILL[correctTone(t.percent)])}
                    style={{ width: `${t.percent}%` }}
                  />
                </span>
                <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-ink">{t.percent}%</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {weakest && (
        <Card padding="tight" className="space-y-3">
          <div className="flex items-start gap-3">
            <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-soft" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                {namedTopic ? (
                  <>
                    Давтах сэдэв: <MetaTitle>{namedTopic.name}</MetaTitle>
                  </>
                ) : (
                  "Сул сэдвээ давтах"
                )}
              </p>
              <p className="text-sm text-ink-dim">
                {target
                  ? "10 минутын давтлага — шинэ бодлогоор."
                  : namedTopic
                    ? "Энэ сэдвээр шинэ бодлого алга — өөр сэдэв сонгоно уу."
                    : "Давтах сэдвээ сонгоод шинэ бодлогоор давтана уу."}
              </p>
            </div>
          </div>
          {target ? (
            <Button className="w-full sm:w-auto" disabled={busy} onClick={() => void startPractice(target.chapterIds)}>
              Ижил сэдвийн бодлого бодох <ArrowRight aria-hidden />
            </Button>
          ) : (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/study/review">
                Давтлага сонгох <ArrowRight aria-hidden />
              </Link>
            </Button>
          )}
          {practiceError && (
            <p role="alert" className="text-sm text-error">
              {practiceError}{" "}
              <Link href="/app/study/review" className="font-semibold underline">
                Өөр сэдэв сонгох
              </Link>
            </p>
          )}
        </Card>
      )}

      <Wrong data={data} />
    </div>
  );
}

function PartBox({ label, got, max }: { label: string; got: number; max: number }) {
  return (
    <div className="rounded-xl border border-line bg-panel px-3 py-2">
      <p className="text-xs text-ink-dim">{label}</p>
      <p className="font-bold tabular-nums text-ink">
        {got}
        <span className="font-normal text-ink-dim">/{max}</span>
      </p>
    </div>
  );
}

function Wrong({ data }: { data: ResultResp }) {
  const review = data.review;
  if (!data.wrong) {
    return (
      <Card className="space-y-3">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-ink-dim" aria-hidden />
          <div>
            <p className="font-semibold text-ink">Буруу бодлого, бодолт хараахан нээгдээгүй</p>
            <p className="mt-1 text-sm text-ink-dim">
              {review?.opensAt
                ? `${dateTimeUB(review.opensAt)}-нд автоматаар нээгдэнэ. Багш эрт нээж болно.`
                : "Багш нээсний дараа харагдана."}
            </p>
          </div>
        </div>
        {review?.fullReview && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/app/tests/${data.test.id}/review`}>
              Бодлого, хариугаа харах <ArrowRight aria-hidden />
            </Link>
          </Button>
        )}
      </Card>
    );
  }
  if (data.wrong.length === 0) {
    return (
      <Card className="text-center">
        <p className="font-semibold text-success">Бүх бодлогыг зөв бодсон байна.</p>
      </Card>
    );
  }
  return (
    <section className="space-y-3" aria-labelledby="wrong-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="wrong-title" className="font-bold text-ink">
          Алдсан бодлогууд <span className="font-normal text-ink-dim">({data.wrong.length})</span>
        </h2>
        {review?.fullReview && (
          <Link href={`/app/tests/${data.test.id}/review`} className="text-sm font-semibold text-brand hover:underline">
            Бүх бодлогыг харах
          </Link>
        )}
      </div>
      <nav className="flex flex-wrap gap-1.5" aria-label="Алдсан бодлого руу шилжих">
        {data.wrong.map((w) => (
          <a
            key={w.n}
            href={`#wrong-${w.n}`}
            className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-error/40 px-2 text-sm font-semibold tabular-nums text-error hover:bg-error/5"
          >
            {w.n}
          </a>
        ))}
      </nav>
      <ol className="space-y-3">
        {data.wrong.map((w) => (
          <li key={w.n} id={`wrong-${w.n}`} className="scroll-mt-20">
            <WrongCard item={w} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function WrongCard({ item }: { item: WrongProblem }) {
  const p = item.problem;
  const mine = typeof p?.myAnswer === "string" ? p.myAnswer : null;
  const right = typeof p?.correctAnswer === "string" ? p.correctAnswer : null;
  const steps = item.items.filter((i) => i.label !== String(item.n));
  return (
    <Card padding="tight" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-ink">
          {item.n}-р бодлого <span className="text-sm font-medium text-ink-dim">({item.lost} оноо алдсан)</span>
        </p>
        <Badge tone={item.items.every((i) => i.status === "BLANK") ? "warning" : "danger"}>
          <CircleX aria-hidden /> {item.items.every((i) => i.status === "BLANK") ? "Хариулаагүй" : "Буруу"}
        </Badge>
      </div>
      {steps.length > 0 && (
        <p className="text-sm text-ink-dim">Алдсан алхам: {steps.map((s) => s.label).join(", ")}</p>
      )}

      {p && (
        <>
          <ProblemFigure imageKey={p.imageKey} alt={`${item.n}-р бодлогын зураг`}>
            <MathText className="block text-ink">{p.statementText ?? ""}</MathText>
          </ProblemFigure>

          {p.choices && (
            <ul className="grid gap-2" aria-label="Сонголтууд">
              {p.choices.map((c) => {
                const isMine = mine === c.letter;
                const isRight = right === c.letter;
                return (
                  <li
                    key={c.letter}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border px-3 py-2",
                      isRight ? "border-success/50 bg-success/10" : isMine ? "border-error/50 bg-error/10" : "border-line",
                    )}
                  >
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
          {!p.choices && p.format === "CHOICE" && (mine || right) && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
              {mine && (
                <p>
                  Таны хариу: <span className="font-bold">{mine}</span>
                </p>
              )}
              {right && (
                <p>
                  Зөв хариу: <span className="font-bold text-success">{right}</span>
                </p>
              )}
            </div>
          )}
          {p.format !== "CHOICE" && (
            <div className="space-y-2 text-sm">
              {p.myAnswer !== null && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">Таны хариу:</span>
                  <FillAnswer statement={p.statementText} value={p.myAnswer} tone="error" />
                </div>
              )}
              {p.correctAnswer !== null && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">Зөв хариу:</span>
                  <FillAnswer statement={p.statementText} value={p.correctAnswer} tone="success" />
                </div>
              )}
            </div>
          )}
          {p.answerNeedsCheck && (
            <p className="flex items-start gap-2 rounded-lg bg-warning/10 p-2 text-sm text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              Энэ бодлогын хариуг багш нар дахин шалгаж байна.
            </p>
          )}
          {p.solution && (
            <section aria-label="Бодолт" className="rounded-xl border border-line bg-panel p-3">
              <p className="mb-1 text-sm font-bold text-brand-soft">Бодолт</p>
              <TheoryContent markdown={p.solution} className="text-sm" />
            </section>
          )}
          {p.youtube && <YoutubeEmbed embedUrl={p.youtube.embedUrl} title={`${item.n}-р бодлогын бодолт`} />}
        </>
      )}
    </Card>
  );
}
