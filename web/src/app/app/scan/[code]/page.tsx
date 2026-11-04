"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CircleCheck, Image as ImageIcon, Lock, TriangleAlert } from "lucide-react";
import { api } from "@/lib/api";
import ChoiceContent from "@/components/ChoiceContent";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import TheoryContent from "@/components/theory/TheoryContent";
import FillAnswer from "@/components/thousand/FillAnswer";
import YoutubeEmbed from "@/components/thousand/YoutubeEmbed";
import { lockMessage, type ScanLockReason } from "@/components/scan/lockMessage";
import { Card } from "@/components/ui/Surface";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";

interface ScanResp {
  problemId: string;
  format: "CHOICE" | "FILL_NUMBER" | "OPEN";
  statementText: string | null;
  imageKey: string | null;
  /** Бодлого зурагтай ч хаалттай үед imageKey ирэхгүй */
  hasImage: boolean;
  choices: { letter: string; text: string; image: string | null }[];
  source: { book: string | null; chapter: string; page: number | null; number: number | null };
  access: "FULL" | "SOLUTION" | "LOCKED";
  lockReason: ScanLockReason | null;
  opensAt: string | null;
  // SOLUTION/FULL үед
  solution?: string | null;
  // FULL үед л
  correctAnswer?: unknown;
  answerNeedsCheck?: boolean;
  youtube?: { url: string; embedUrl: string } | null;
}

// Номын QR (pimath.mn/q/<код>) → бодлого. Бодолт нээх эсэхийг сервер шийднэ:
// шалгалтын эргэн харалтаар харж чадахгүй бодолтыг QR ч бас нээхгүй.
export default function ScanPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [data, setData] = useState<ScanResp | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ScanResp>(`/scan/${encodeURIComponent(code)}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Бодлогыг ачаалж чадсангүй");
    }
  }, [code]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Камераас шууд нээсэн бол өмнөх хуудас байхгүй — нүүр рүү.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push("/app"));
  const back = (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
    >
      <ArrowLeft size={17} aria-hidden /> Буцах
    </button>
  );

  if (error)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  if (!data)
    return (
      <div className="mx-auto max-w-3xl">
        <LoadingState rows={5} label="Бодлого ачаалж байна" />
      </div>
    );

  const right = typeof data.correctAnswer === "string" && data.format === "CHOICE" ? data.correctAnswer : null;
  const lock = data.access === "LOCKED" && data.lockReason ? lockMessage(data.lockReason, data.opensAt) : null;
  const title = data.source.number ? `${data.source.number}-р бодлого` : "Бодлого";
  // «1000 бодлого · Сорил 16-A» бүлэгт номын нэр давтагддаг — давхар бүү харуул.
  const book = data.source.book;
  const bookShown =
    book && !data.source.chapter.toLowerCase().startsWith(book.toLowerCase()) ? book : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {back}
      <header className="space-y-1">
        <h1 className="cyrillic-heading text-xl font-bold text-ink">{title}</h1>
        <p className="text-sm text-ink-dim">
          <Meta
            items={[
              bookShown,
              <MetaTitle key="chapter">{data.source.chapter}</MetaTitle>,
              data.source.page ? `${data.source.page}-р хуудас` : null,
            ]}
          />
        </p>
      </header>

      <Card className="space-y-3">
        <ProblemFigure imageKey={data.imageKey} alt={`${title}ын зураг`}>
          <MathText className="block text-ink">{data.statementText ?? ""}</MathText>
        </ProblemFigure>
        {data.hasImage && !data.imageKey && (
          <p className="flex items-center gap-2 text-sm text-ink-dim">
            <ImageIcon className="h-4 w-4 shrink-0" aria-hidden /> Зургийг номын хуудаснаас харна уу.
          </p>
        )}
        {data.choices.length > 0 && (
          <ul className="grid gap-1.5" aria-label="Сонголтууд">
            {data.choices.map((c) => {
              const ok = right === c.letter;
              return (
                <li
                  key={c.letter}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2",
                    ok ? "border-success/50 bg-success/10" : "border-line",
                  )}
                >
                  <span className="font-bold text-ink">{c.letter}</span>
                  <span className="min-w-0 flex-1 text-ink">
                    <ChoiceContent text={c.text} image={c.image} />
                  </span>
                  {ok && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                      <CircleCheck className="h-3.5 w-3.5" aria-hidden /> Зөв
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {data.access === "FULL" && data.format !== "CHOICE" && data.correctAnswer != null && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-ink">Зөв хариу:</span>
            <FillAnswer statement={data.statementText} value={data.correctAnswer} tone="success" />
          </div>
        )}
        {data.answerNeedsCheck && (
          <p className="flex items-center gap-2 text-sm text-warning">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden /> Хариуны түлхүүрийг багш нар дахин шалгаж байна.
          </p>
        )}
      </Card>

      {lock && (
        <Card className="flex items-start gap-3">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
          <div className="space-y-1">
            <p className="font-semibold text-ink">{lock.title}</p>
            <p className="text-sm text-ink-dim">{lock.body}</p>
          </div>
        </Card>
      )}

      {data.solution && (
        <section aria-label="Бодолт" className="rounded-xl border border-line bg-panel p-3 sm:p-4">
          <p className="mb-1 text-sm font-bold text-brand-soft">Бодолт</p>
          <TheoryContent markdown={data.solution} className="text-sm" />
        </section>
      )}
      {data.youtube && <YoutubeEmbed embedUrl={data.youtube.embedUrl} title={`${title}ын бодолт`} />}
    </div>
  );
}
