"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import LessonChapterCard, {
  chapterPercent,
} from "@/components/lesson/LessonChapterCard";
import { readLastLesson } from "@/components/lesson/continueStore";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import type { LessonChapterSummary } from "@/components/lesson/types";
import { api } from "@/lib/api";

/* ============================================================================
 * /app/learn — "Хичээл үзэх" индекс хуудас.
 *
 * Агуулгатай бүлгүүдийг (онол/видео/дасгал/тест дор хаяж нэг нь байгаа) ном
 * тус бүрээр бүлэглэж жагсаана. Хуудасны ХАМГИЙН ЧУХАЛ элемент дээд талын
 * "Үргэлжлүүлэх" hero карт — судалгаагаар суралцах апп-д хамгийн өндөр
 * үнэ цэнэтэй cta нь яг энэ (хаанаас зогссоноо олоход алдсан цаг = гаралт).
 * ========================================================================== */

type SubjectKey = "MATH" | "SOCIAL_STUDIES";
const SUBJECTS: { value: SubjectKey; label: string }[] = [
  { value: "MATH", label: "Математик" },
  { value: "SOCIAL_STUDIES", label: "Нийгмийн ухаан" },
];

function readSubjectFromUrl(): SubjectKey {
  if (typeof window === "undefined") return "MATH";
  const q = new URLSearchParams(window.location.search).get("subject");
  return q === "SOCIAL_STUDIES" ? "SOCIAL_STUDIES" : "MATH";
}

type LoadState = "loading" | "ready" | "error";

export default function LearnIndexPage() {
  const [subject, setSubject] = useState<SubjectKey>(readSubjectFromUrl);
  const [chapters, setChapters] = useState<LessonChapterSummary[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  // Товч дарж subject/дахин ачаалах үед л (effect-ийн БИЕ дотор биш, event
  // handler дотор) шууд "ачаалж байна" болгоно — эффектийн дотор шууд
  // setState дуудахаас зайлсхийнэ (cascading render, react-hooks/set-state-in-effect).
  function selectSubject(next: SubjectKey) {
    if (next === subject) return;
    setSubject(next);
    setState("loading");
    setError("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("subject", next);
      window.history.replaceState(null, "", url.toString());
    }
  }

  function retry() {
    setState("loading");
    setError("");
    setTick((t) => t + 1);
  }

  useEffect(() => {
    let alive = true;
    api<LessonChapterSummary[]>(`/lessons/chapters?subject=${subject}`)
      .then((rows) => {
        if (!alive) return;
        setChapters(rows);
        setState("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
        setState("error");
      });
    return () => {
      alive = false;
    };
  }, [subject, tick]);

  // Өөр хичээлээр сүүлд юу үзэж байгааг мэдэгдэх (жижиг hint, hero биш) —
  // localStorage унших нь дахин render бүрт detereministik тул энгийн
  // useMemo-оор тооцоолно, effect+state хэрэггүй.
  const crossSubjectHint = useMemo(() => {
    const last = readLastLesson();
    if (!last || last.subject === subject) return null;
    const otherSubject = SUBJECTS.find((s) => s.value !== subject);
    return otherSubject ? { subject: otherSubject.value, title: last.title } : null;
    // chapters өөрчлөгдөх бүрт дахин тооцоолохгүй — зөвхөн subject солигдоход хамаатай
  }, [subject]);

  const grouped = useMemo(() => {
    const map = new Map<string, LessonChapterSummary[]>();
    for (const c of chapters) {
      const key = c.book?.code ?? "Бусад";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()].map(([code, rows]) => ({
      code,
      title: rows[0]?.book?.title,
      chapters: [...rows].sort((a, b) => a.order - b.order),
    }));
  }, [chapters]);

  // "Үргэлжлүүлэх" hero-д зориулсан нэр дэвшигч:
  // 1) localStorage-д тухайн хичээлээр сүүлд нээсэн бүлэг байгаа бөгөөд одоо
  //    ЭНЭ жагсаалтад байвал — түүнийг ашиглана (live % жагсаалтаас).
  // 2) Байхгүй бол ахиц 0-ээс их, 100-аас бага хамгийн өндөр хувьтай бүлэг.
  // 3) Тэр ч байхгүй бол эхний номын эхний бүлэг ("Эхлэх" гэж харагдана).
  const continueCandidate = useMemo(() => {
    if (chapters.length === 0) return null;
    const last = readLastLesson();
    if (last && last.subject === subject) {
      const found = chapters.find((c) => c.id === last.chapterId);
      if (found) return { chapter: found, mode: "continue" as const };
    }
    const inProgress = [...chapters]
      .filter((c) => {
        const p = chapterPercent(c);
        return p > 0 && p < 100;
      })
      .sort((a, b) => chapterPercent(b) - chapterPercent(a))[0];
    if (inProgress) return { chapter: inProgress, mode: "continue" as const };

    const notStarted = [...chapters]
      .sort((a, b) => a.order - b.order)
      .find((c) => chapterPercent(c) === 0);
    if (notStarted) return { chapter: notStarted, mode: "start" as const };
    return null;
  }, [chapters, subject]);

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold">Хичээл үзэх</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Онол <ArrowRight className="inline h-4 w-4" aria-hidden /> видео <ArrowRight className="inline h-4 w-4" aria-hidden /> дасгал <ArrowRight className="inline h-4 w-4" aria-hidden /> шалгалт дарааллаар үзээд ахицаа хянана.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s.value}
            onClick={() => selectSubject(s.value)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              subject === s.value
                ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                : "border-line text-ink-dim hover:border-brand-bright/40"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {state === "loading" && <LoadingState rows={5} label="Бүлгүүдийг ачааллаж байна" />}

      {state === "error" && <ErrorState message={error} onRetry={retry} />}

      {state === "ready" && chapters.length === 0 && (
        <EmptyState title="Агуулгатай бүлэг алга" hint="Энэ хичээлээр сургагдахаар зориулсан материал одоо боловсруулагдаж байна." />
      )}

      {state === "ready" && continueCandidate && (
        <ContinueHero
          chapter={continueCandidate.chapter}
          mode={continueCandidate.mode}
          subject={subject}
        />
      )}

      {state === "ready" && crossSubjectHint && (
        <button
          onClick={() => selectSubject(crossSubjectHint.subject)}
          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-ink/[0.03] px-4 py-3 text-left text-sm transition hover:border-brand-bright/40"
        >
          <span className="text-ink-dim">
            <span className="font-semibold text-ink">
              {SUBJECTS.find((s) => s.value === crossSubjectHint.subject)?.label}
            </span>{" "}
            хичээлд &ldquo;{crossSubjectHint.title}&rdquo;-ийг үргэлжлүүлж
            болно
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-brand-soft">
            Сэлгэх <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </button>
      )}

      {state === "ready" && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.code} className="space-y-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-lg font-extrabold">
                  {group.title ?? group.code}
                </h2>
                <span className="font-mono text-xs text-ink-dim">
                  {group.code}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.chapters.map((c) => (
                  <LessonChapterCard key={c.id} chapter={c} subject={subject} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ContinueHero({
  chapter,
  mode,
  subject,
}: {
  chapter: LessonChapterSummary;
  mode: "continue" | "start";
  subject: SubjectKey;
}) {
  const percent = chapterPercent(chapter);
  const label =
    mode === "start"
      ? "Эхлэх"
      : percent >= 100
        ? "Дахин үзэх"
        : "Үргэлжлүүлэх";
  const eyebrow =
    mode === "start" ? "Шинээр эхлэх" : "Сүүлд үзэж байсан";

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-bright/30 bg-brand-bright/8 p-6">
      <p className="text-xs font-bold uppercase tracking-wide text-brand-soft">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-2xl font-extrabold">{chapter.title}</h2>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        {mode === "continue" && (
          <div className="flex min-w-[160px] flex-1 items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
              <div
                className={`h-full rounded-full ${
                  percent >= 100 ? "bg-success" : "bg-brand-bright"
                }`}
                style={{ width: `${Math.max(4, percent)}%` }}
              />
            </div>
            <span className="shrink-0 text-sm font-semibold text-ink-dim">
              {percent}%
            </span>
          </div>
        )}
        <Link
          href={`/app/learn/${chapter.id}?subject=${subject}`}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-bright px-5 py-2.5 text-sm font-bold text-on-brand transition hover:opacity-90"
        >
          {label} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
