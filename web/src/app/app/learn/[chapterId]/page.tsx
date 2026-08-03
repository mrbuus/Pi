"use client";

import { Lock, Check, ArrowLeft, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LessonAccessDeniedError,
  fetchLessonDetail,
  logChapterOpened,
  postLessonProgress,
} from "@/components/lesson/api";
import { writeLastLesson } from "@/components/lesson/continueStore";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import SafeMarkdown, { TheoryImages } from "@/components/lesson/SafeMarkdown";
import StepRail from "@/components/lesson/StepRail";
import {
  computeSteps,
  normalizeProgress,
  type LessonDetail,
  type StepStatus,
} from "@/components/lesson/types";
import { fileUrl } from "@/lib/api";

/* ============================================================================
 * /app/learn/[chapterId] — нэг бүлгийн хичээл: Алхам 1–4 (Онол → Видео →
 * Дасгал → Шалгалт). Алхам бүр ДАРААЛАЛТАЙ боловч ХАТУУ ТҮГЖЭЭГҮЙ — сурагч
 * шалгалтын өмнө шууд Алхам 4 рүү үсэрч болно, зөвхөн ахиц (тик) харуулна.
 * ========================================================================== */

type LoadState = "loading" | "ready" | "locked" | "error";

function readSubjectFromUrl(): string {
  if (typeof window === "undefined") return "MATH";
  const q = new URLSearchParams(window.location.search).get("subject");
  return q === "SOCIAL_STUDIES" ? "SOCIAL_STUDIES" : "MATH";
}

export default function LessonChapterPage() {
  const params = useParams<{ chapterId: string }>();
  const chapterId = params.chapterId;
  const [subject] = useState<string>(readSubjectFromUrl);

  const [detail, setDetail] = useState<LessonDetail | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [activeKey, setActiveKey] = useState<StepStatus["key"]>("theory");
  // Алхам бүрийн даруй мэдэгдсэн ахиц — сервер лавших хүртэл optimistic-ээр
  // харуулах (дараагийн "Дахин ачаалах" хүртэл хуучирсан тоогоор гацахгүй)
  const [localTheoryIds, setLocalTheoryIds] = useState<string[]>([]);
  const [localVideoIds, setLocalVideoIds] = useState<string[]>([]);
  const [localProblemsOpened, setLocalProblemsOpened] = useState(false);

  // Дахин оролдох товч (event handler дотор шууд setState хийнэ — эффектийн
  // БИЕ дотор биш тул react-hooks/set-state-in-effect зөрчихгүй; шинэ
  // chapterId рүү шилжихэд (анхны ачаалалт) `state`-ийн ӨГӨГДМӨЛ утга аль
  // хэдийн "loading" тул тусад нь эффект дотор дахин тавих шаардлагагүй).
  function retry() {
    setState("loading");
    setError("");
    setTick((t) => t + 1);
  }

  useEffect(() => {
    let alive = true;
    fetchLessonDetail(chapterId)
      .then((d) => {
        if (!alive) return;
        setDetail(d);
        const p = normalizeProgress(d.progress);
        setLocalTheoryIds(p.theoryIds);
        setLocalVideoIds(p.videoIds);
        setLocalProblemsOpened(p.problemsOpened);
        setState("ready");

        // Анхны идэвхтэй алхмыг ухаалгаар сонгоно: эхний "дутуу" алхам руу
        // шууд очно (жш: онол дуусгасан бол шууд видео руу).
        const initialSteps = computeSteps(d);
        const withContent = initialSteps.filter((s) => s.hasContent);
        if (withContent.length > 0) {
          const firstUnfinished = withContent.find((s) => !s.done);
          setActiveKey((firstUnfinished ?? withContent[0]).key);
        }

        writeLastLesson({
          chapterId,
          subject,
          title: d.chapter.title,
          bookCode: d.chapter.book?.code,
          at: Date.now(),
        });
        logChapterOpened(chapterId);
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof LessonAccessDeniedError) {
          setState("locked");
        } else {
          setError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
          setState("error");
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId, tick]);

  const mergedDetail: LessonDetail | null = useMemo(() => {
    if (!detail) return null;
    return {
      ...detail,
      progress: {
        theoryIds: localTheoryIds,
        videoIds: localVideoIds,
        problemsOpened: localProblemsOpened,
        testIds: normalizeProgress(detail.progress).testIds,
      },
    };
  }, [detail, localTheoryIds, localVideoIds, localProblemsOpened]);

  const steps = useMemo(
    () => (mergedDetail ? computeSteps(mergedDetail) : []),
    [mergedDetail],
  );

  if (state === "loading") {
    return (
      <div className="space-y-4">
        <BackLink subject={subject} />
        <div className="rounded-2xl border border-line bg-panel p-10 text-center text-sm text-ink-dim">
          Ачаалж байна…
        </div>
      </div>
    );
  }

  if (state === "locked") {
    return (
      <div className="space-y-4">
        <BackLink subject={subject} />
        <div className="rounded-2xl border border-warning/30 bg-warning/10 p-8 text-center">
          <Lock className="mx-auto h-6 w-6 text-warning" aria-hidden />

          <p className="mt-2 font-bold text-warning">
            энэ бүлгийг үзэх эрхгүй байна
          </p>
          <p className="mt-1 text-sm text-ink-dim">
            Энэ хичээлийг үзэхийн тулд эрх худалдаж авах эсвэл ангид элсэх
            шаардлагатай.
          </p>
          <Link
            href="/app/buyer"
            className="mt-4 inline-block rounded-lg bg-brand-bright px-5 py-2 text-sm font-bold text-on-brand"
          >
            Эрх худалдаж авах
          </Link>
        </div>
      </div>
    );
  }

  if (state === "error" || !mergedDetail) {
    return (
      <div className="space-y-4">
        <BackLink subject={subject} />
        <div className="rounded-xl border border-error/30 bg-error/10 p-6 text-center text-sm text-error">
          <p>{error}</p>
          <button
            onClick={retry}
            className="mt-3 rounded-lg border border-error/40 px-4 py-1.5 text-sm font-semibold text-error transition hover:bg-error/10"
          >
            Дахин оролдох
          </button>
        </div>
      </div>
    );
  }

  const { chapter, theories, videos, problemCount, tests } = mergedDetail;

  function selectStep(key: StepStatus["key"]) {
    setActiveKey(key);
  }

  async function markTheoryViewed(theoryId: string) {
    if (localTheoryIds.includes(theoryId)) return;
    setLocalTheoryIds((ids) => [...ids, theoryId]);
    try {
      await postLessonProgress(chapterId, {
        theoryId,
        action: "THEORY_VIEWED",
      });
    } catch {
      /* сервер лавших үед л дараа нь зассан утга ирнэ — UI-г блоклохгүй */
    }
  }

  function handleVideoStart(videoId: string) {
    if (localVideoIds.includes(videoId)) return;
    postLessonProgress(chapterId, { videoId, action: "VIDEO_STARTED" }).catch(
      () => {},
    );
  }

  function handleVideoComplete(videoId: string) {
    setLocalVideoIds((ids) =>
      ids.includes(videoId) ? ids : [...ids, videoId],
    );
    postLessonProgress(chapterId, { videoId, action: "VIDEO_COMPLETED" }).catch(
      () => {},
    );
  }

  function handleProblemsOpen() {
    setLocalProblemsOpened(true);
    postLessonProgress(chapterId, { action: "PROBLEMS_OPENED" }).catch(
      () => {},
    );
  }

  return (
    <div className="space-y-5">
      <BackLink subject={subject} />

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-soft">
            {chapter.book?.code ?? "Хичээл"}
          </p>
          {chapter.freePreview && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
              <Check className="h-3 w-3" aria-hidden /> Үнэгүй
            </span>
          )}
        </div>
        <h1 className="mt-1 text-2xl font-extrabold">{chapter.title}</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <StepRail steps={steps} activeKey={activeKey} onSelect={selectStep} />
        </aside>

        <section className="min-w-0 space-y-4">
          {activeKey === "theory" && (
            <TheoryStep
              theories={theories}
              viewedIds={localTheoryIds}
              onMarkViewed={markTheoryViewed}
            />
          )}
          {activeKey === "video" && (
            <VideoStep
              videos={videos}
              completedIds={localVideoIds}
              onStart={handleVideoStart}
              onComplete={handleVideoComplete}
            />
          )}
          {activeKey === "problems" && (
            <ProblemsStep
              chapter={chapter}
              subject={subject}
              problemCount={problemCount}
              opened={localProblemsOpened}
              onOpen={handleProblemsOpen}
            />
          )}
          {activeKey === "test" && <TestStep tests={tests} />}
        </section>
      </div>
    </div>
  );
}

function BackLink({ subject }: { subject: string }) {
  return (
    <Link
      href={`/app/learn?subject=${subject}`}
      className="inline-flex items-center gap-1.5 text-sm text-ink-dim transition hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Хичээлийн жагсаалт руу
    </Link>
  );
}

function StepEmpty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-8 text-center text-sm text-ink-dim">
      {text}
    </div>
  );
}

function TheoryStep({
  theories,
  viewedIds,
  onMarkViewed,
}: {
  theories: LessonDetail["theories"];
  viewedIds: string[];
  onMarkViewed: (id: string) => void;
}) {
  if (theories.length === 0) {
    return <StepEmpty text="Энэ бүлэгт онолын материал хараахан алга." />;
  }
  const sorted = [...theories].sort((a, b) => a.order - b.order);
  return (
    <div className="space-y-4">
      {sorted.map((theory) => {
        const viewed = viewedIds.includes(theory.id);
        const imageUrls = (theory.imageKeys ?? [])
          .map((key) => fileUrl(key))
          .filter((u): u is string => !!u);
        return (
          <article
            key={theory.id}
            className="rounded-2xl border border-line bg-panel p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold">{theory.title}</h2>
              {viewed && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                  <Check className="h-3 w-3" aria-hidden /> Уншсан
                </span>
              )}
            </div>
            <div className="prose-measure">
              <SafeMarkdown content={theory.content} />
            </div>
            <TheoryImages urls={imageUrls} alt={theory.title} />
            {!viewed && (
              <button
                onClick={() => onMarkViewed(theory.id)}
                className="mt-3 rounded-lg border border-brand-bright/40 px-4 py-1.5 text-sm font-semibold text-brand-soft transition hover:bg-brand-bright/10"
              >
                Уншсан гэж тэмдэглэх
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function VideoStep({
  videos,
  completedIds,
  onStart,
  onComplete,
}: {
  videos: LessonDetail["videos"];
  completedIds: string[];
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  if (videos.length === 0) {
    return <StepEmpty text="Энэ бүлэгт бичлэг хараахан алга." />;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {videos.map((v) => (
        <div key={v.id} className="space-y-1.5">
          <LessonVideoPlayer
            video={v}
            onStart={() => onStart(v.id)}
            onComplete={() => onComplete(v.id)}
          />
          {completedIds.includes(v.id) && (
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-success"><Check className="h-4 w-4" aria-hidden /> Үзсэн</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ProblemsStep({
  chapter,
  subject,
  problemCount,
  opened,
  onOpen,
}: {
  chapter: LessonDetail["chapter"];
  subject: string;
  problemCount: number;
  opened: boolean;
  onOpen: () => void;
}) {
  if (problemCount === 0) {
    return <StepEmpty text="Энэ бүлэгт дасгалын бодлого хараахан алга." />;
  }
  const libraryHref = chapter.book?.code
    ? `/app/library?subject=${subject}&book=${encodeURIComponent(chapter.book.code)}`
    : `/app/library?subject=${subject}`;
  return (
    <div className="rounded-2xl border border-line bg-panel p-6 text-center">
      <p className="text-3xl font-extrabold text-brand-soft">{problemCount}</p>
      <p className="mt-1 text-sm text-ink-dim">
        дасгалын бодлого &ldquo;{chapter.title}&rdquo; бүлэгт хамаарна
      </p>
      <Link
        href={libraryHref}
        onClick={onOpen}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-bright px-5 py-2.5 text-sm font-bold text-on-brand transition hover:opacity-90"
      >
        Бодлогын сан руу очих <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      {opened && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
          <Check className="h-4 w-4" aria-hidden /> Дор хаяж нэг удаа орсон
        </p>
      )}
      <p className="mt-3 text-xs text-ink-dim">
        Тухайн номоос энэ бүлгийг олоод дасгалаа хийнэ.
      </p>
    </div>
  );
}

const TEST_TYPE_LABEL: Record<string, string> = {
  DAILY: "Өдөр тутмын",
  CHAPTER_EXAM: "Бүлгийн шалгалт",
  EESH_MOCK: "ЭЕШ сорил",
  CUSTOM: "Бусад",
  THEORY: "Онолын шалгалт",
};

function TestStep({ tests }: { tests: LessonDetail["tests"] }) {
  if (tests.length === 0) {
    return <StepEmpty text="Энэ бүлэгт шалгалт хараахан алга." />;
  }
  return (
    <div className="space-y-2">
      {tests.map((t) => (
        <Link
          key={t.id}
          href={`/app/tests/${t.id}`}
          className="flex items-center gap-3 rounded-xl border border-line bg-panel p-4 transition hover:border-brand-bright/40"
        >
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {t.title}
              {t.variantLabel ? ` · ${t.variantLabel}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-ink-dim">
              {TEST_TYPE_LABEL[t.type] ?? t.type}
              {t.timeLimitMin ? ` · ${t.timeLimitMin} мин` : ""}
            </p>
          </div>
          <span className="shrink-0 text-ink-dim" aria-hidden>
            <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      ))}
    </div>
  );
}
