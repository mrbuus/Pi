"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import MathText from "@/components/MathText";
import { api } from "@/lib/api";

interface Chapter {
  id: string;
  title: string;
  order: number;
  grade?: number;
  freePreview: boolean;
  book?: { code: string; title: string };
  _count: { problems: number; theories: number };
}
interface Problem {
  id: string;
  token: string;
  format: string;
  statementText?: string;
  choices?: string[];
  correctAnswer?: string | Record<string, number>;
  points: number;
  analysis?: {
    status: string;
    answerKeyStatus: string;
    confidence: number;
    topic: string;
    subtopic?: string;
    skills: string[];
    methods: string[];
    formulas: { name: string; latex?: string; rationale?: string }[];
    domainNotes: string[];
    signRules: string[];
    commonMistakes: string[];
    auditNotes: string[];
  };
}
interface Book {
  id: string;
  code: string;
  title: string;
  problemCount?: number;
  _count: { chapters: number };
}

interface TopicTone {
  accent: string;
  bg: string;
  border: string;
  soft: string;
  text: string;
  symbol: string;
}

interface TopicGroup {
  topic: string;
  tone: TopicTone;
  chapters: Chapter[];
  problems: number;
  theories: number;
  free: number;
}

const FORMAT_LABEL: Record<string, string> = {
  CHOICE: "Сонгох",
  FILL_NUMBER: "Тоо нөхөх",
  OPEN: "Задгай",
};

const TOPIC_TONES: TopicTone[] = [
  {
    accent: "#4f7fe6",
    bg: "rgba(79, 127, 230, 0.11)",
    border: "rgba(79, 127, 230, 0.45)",
    soft: "rgba(79, 127, 230, 0.18)",
    text: "#b8cbff",
    symbol: "∑",
  },
  {
    accent: "#34d6a8",
    bg: "rgba(52, 214, 168, 0.1)",
    border: "rgba(52, 214, 168, 0.4)",
    soft: "rgba(52, 214, 168, 0.16)",
    text: "#98f2d6",
    symbol: "√",
  },
  {
    accent: "#e8c468",
    bg: "rgba(232, 196, 104, 0.1)",
    border: "rgba(232, 196, 104, 0.42)",
    soft: "rgba(232, 196, 104, 0.16)",
    text: "#f3dc95",
    symbol: "π",
  },
  {
    accent: "#f07aa6",
    bg: "rgba(240, 122, 166, 0.1)",
    border: "rgba(240, 122, 166, 0.4)",
    soft: "rgba(240, 122, 166, 0.16)",
    text: "#ffc1d8",
    symbol: "|x|",
  },
  {
    accent: "#9c7df0",
    bg: "rgba(156, 125, 240, 0.1)",
    border: "rgba(156, 125, 240, 0.42)",
    soft: "rgba(156, 125, 240, 0.16)",
    text: "#cbbcfe",
    symbol: "log",
  },
  {
    accent: "#64c7f5",
    bg: "rgba(100, 199, 245, 0.1)",
    border: "rgba(100, 199, 245, 0.4)",
    soft: "rgba(100, 199, 245, 0.16)",
    text: "#b8e9ff",
    symbol: "f",
  },
];

function splitChapterTitle(title: string) {
  const [topic, ...rest] = title.split(" · ");
  return {
    topic: topic?.trim() || title,
    label: rest.join(" · ").trim() || title,
  };
}

function groupChapters(chapters: Chapter[]): TopicGroup[] {
  const groups = new Map<string, Omit<TopicGroup, "tone">>();
  for (const chapter of chapters) {
    const { topic } = splitChapterTitle(chapter.title);
    const current =
      groups.get(topic) ??
      ({
        topic,
        chapters: [],
        problems: 0,
        theories: 0,
        free: 0,
      } satisfies Omit<TopicGroup, "tone">);
    current.chapters.push(chapter);
    current.problems += chapter._count.problems;
    current.theories += chapter._count.theories;
    if (chapter.freePreview) current.free += 1;
    groups.set(topic, current);
  }

  return [...groups.values()].map((group, index) => ({
    ...group,
    chapters: [...group.chapters].sort((a, b) => a.order - b.order),
    tone: TOPIC_TONES[index % TOPIC_TONES.length],
  }));
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTopic, setActiveTopic] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [locked, setLocked] = useState(false);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [catalogError, setCatalogError] = useState("");

  const topicGroups = useMemo(() => groupChapters(chapters), [chapters]);
  const activeGroup =
    topicGroups.find((group) => group.topic === activeTopic) ?? topicGroups[0];
  const currentBook = books.find((b) => b.id === bookId);
  const totalProblems = topicGroups.reduce((sum, group) => sum + group.problems, 0);

  useEffect(() => {
    api<Book[]>("/books")
      .then((bs) => {
        const withProblems = bs.filter((b) =>
          typeof b.problemCount === "number"
            ? b.problemCount > 0
            : b._count.chapters > 0,
        );
        setBooks(withProblems);
        if (withProblems.length > 0) setBookId((id) => id || withProblems[0].id);
      })
      .catch((error) => {
        setCatalogError(
          error instanceof Error ? error.message : "Номын сан ачаалахад алдаа гарлаа",
        );
      });
  }, []);

  useEffect(() => {
    if (!bookId) return;
    api<Chapter[]>(`/chapters?bookId=${bookId}`)
      .then(setChapters)
      .catch((error) => {
        setChapters([]);
        setCatalogError(
          error instanceof Error ? error.message : "Бүлэг сэдэв ачаалахад алдаа гарлаа",
        );
      });
  }, [bookId]);

  async function openChapter(ch: Chapter) {
    if (openId === ch.id) {
      setOpenId(null);
      return;
    }
    setOpenId(ch.id);
    setProblems([]);
    setLocked(false);
    setLoadingProblems(true);
    try {
      const probs = await api<Problem[]>(`/chapters/${ch.id}/problems`);
      setProblems(probs);
    } catch {
      setLocked(true);
    } finally {
      setLoadingProblems(false);
    }
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold">Бодлогын сан</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Ном сонгоод сэдэв бүрийн тестүүдийг дарааллаар нь эзэмшинэ.
        </p>
      </div>

      {/* Номын таб */}
      <div className="flex flex-wrap gap-2">
        {books.map((b) => (
          <button
            key={b.id}
            onClick={() => {
              setBookId(b.id);
              setOpenId(null);
              setProblems([]);
              setLocked(false);
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              bookId === b.id
                ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                : "border-white/10 text-ink-dim hover:border-white/30"
            }`}
          >
            <span className="font-mono">{b.code}</span> · {b._count.chapters} тест
          </button>
        ))}
      </div>

      {catalogError && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {catalogError}
        </div>
      )}

      {currentBook && (
        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-brand-soft">
                Сонгосон ном
              </p>
              <h2 className="mt-1 text-3xl font-extrabold">{currentBook.title}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Сэдэв" value={topicGroups.length} />
              <Metric label="Тест" value={currentBook._count.chapters} />
              <Metric label="Бодлого" value={totalProblems} />
            </div>
          </div>
        </section>
      )}

      {chapters.length === 0 && !catalogError && (
        <p className="text-sm text-ink-dim">
          Энэ номд бүлэг сэдэв хараахан нэмэгдээгүй байна.
        </p>
      )}

      {activeGroup && (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start">
            {topicGroups.map((group) => {
              const selected = group.topic === activeGroup.topic;
              return (
                <button
                  key={group.topic}
                  onClick={() => {
                    setActiveTopic(group.topic);
                    setOpenId(null);
                    setProblems([]);
                    setLocked(false);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    selected ? "shadow-lg shadow-black/20" : "bg-white/[0.03]"
                  }`}
                  style={{
                    borderColor: selected ? group.tone.border : "rgba(255,255,255,0.1)",
                    background: selected ? group.tone.bg : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold"
                      style={{ background: group.tone.soft, color: group.tone.text }}
                    >
                      {group.tone.symbol}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{group.topic}</span>
                      <span className="mt-0.5 block text-xs text-ink-dim">
                        {group.chapters.length} тест · {group.problems} бодлого
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.max(12, group.chapters.length * 8))}%`,
                        background: group.tone.accent,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </aside>

          <section className="min-w-0 space-y-3">
            <div
              className="rounded-2xl border p-5"
              style={{
                borderColor: activeGroup.tone.border,
                background: activeGroup.tone.bg,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    className="text-xs font-bold uppercase"
                    style={{ color: activeGroup.tone.text }}
                  >
                    Алгебр | Анализ
                  </p>
                  <h2 className="mt-1 text-2xl font-extrabold">
                    {activeGroup.topic}
                  </h2>
                  <p className="mt-1 text-sm text-ink-dim">
                    Тестүүд дарааллаар нээгдэнэ. Багш эрхтэй хэрэглэгч бодлогын
                    шинжилгээ, хариуны төлөв, томьёог давхар харна.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white/8 px-3 py-1 font-semibold">
                    {activeGroup.chapters.length} тест
                  </span>
                  <span className="rounded-full bg-white/8 px-3 py-1 font-semibold">
                    {activeGroup.problems} бодлого
                  </span>
                  {activeGroup.free > 0 && (
                    <span className="rounded-full bg-teal-400/15 px-3 py-1 font-semibold text-teal-300">
                      {activeGroup.free} үнэгүй
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative space-y-3">
              <div
                aria-hidden
                className="absolute bottom-8 left-6 top-8 hidden w-px sm:block"
                style={{ background: activeGroup.tone.border }}
              />
              {activeGroup.chapters.map((ch, index) => {
                const isOpen = openId === ch.id;
                const { label } = splitChapterTitle(ch.title);
                return (
                  <div key={ch.id} className="relative">
                    <button
                      onClick={() => openChapter(ch)}
                      className="flex w-full items-center gap-4 rounded-2xl border bg-[#0b142e] p-5 text-left transition hover:border-white/25"
                      style={{
                        borderColor: isOpen
                          ? activeGroup.tone.border
                          : "rgba(255,255,255,0.08)",
                        background: isOpen ? activeGroup.tone.bg : undefined,
                      }}
                    >
                      <div
                        className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold"
                        style={{
                          background: ch.freePreview
                            ? "rgba(52, 214, 168, 0.18)"
                            : activeGroup.tone.soft,
                          color: ch.freePreview ? "#98f2d6" : activeGroup.tone.text,
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">{label}</p>
                          {ch.freePreview && (
                            <span className="rounded-full bg-teal-400/15 px-2 py-0.5 text-[11px] font-bold text-teal-300">
                              Үнэгүй
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-ink-dim">
                          {ch.book?.code} ном · {ch._count.problems} бодлого
                          {ch._count.theories > 0 && ` · ${ch._count.theories} онол`}
                        </p>
                      </div>
                      <span className="text-ink-dim">{isOpen ? "▲" : "▼"}</span>
                    </button>

                    {isOpen && (
                      <div className="mt-2 rounded-2xl border border-white/8 bg-[#0b142e] p-5">
                        {loadingProblems && (
                          <p className="text-sm text-ink-dim">Ачаалж байна…</p>
                        )}
                        {locked && (
                          <div className="text-center">
                            <p className="text-sm text-ink-dim">
                              Энэ бүлгийг үзэх эрх хэрэгтэй байна.
                            </p>
                            <Link
                              href="/app/buyer"
                              className="mt-3 inline-block rounded-lg bg-brand-bright px-5 py-2 text-sm font-bold"
                            >
                              Эрх худалдаж авах
                            </Link>
                          </div>
                        )}
                        {!loadingProblems && !locked && (
                          <ProblemList problems={problems} tone={activeGroup.tone} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
      <p className="text-lg font-extrabold">{value.toLocaleString()}</p>
      <p className="text-xs text-ink-dim">{label}</p>
    </div>
  );
}

function ProblemList({ problems, tone }: { problems: Problem[]; tone: TopicTone }) {
  if (problems.length === 0) {
    return <p className="text-sm text-ink-dim">Бодлого алга</p>;
  }

  return (
    <div className="space-y-2">
      {problems.map((p, idx) => (
        <div
          key={p.id}
          className="flex items-start gap-3 rounded-xl border border-white/8 p-3"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
            style={{ background: tone.soft, color: tone.text }}
          >
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <MathText>{p.statementText ?? ""}</MathText>
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-ink-dim">
                {p.token}
              </span>
              <span
                className="rounded px-2 py-0.5"
                style={{ background: tone.soft, color: tone.text }}
              >
                {FORMAT_LABEL[p.format] ?? p.format}
              </span>
              <span className="rounded bg-white/5 px-2 py-0.5 text-ink-dim">
                {p.points} оноо
              </span>
              {p.correctAnswer !== undefined && (
                <span className="rounded bg-teal-400/15 px-2 py-0.5 text-teal-300">
                  Хариу: {formatAnswer(p.correctAnswer)}
                </span>
              )}
            </div>
            {p.analysis && <ProblemAnalysisDetails analysis={p.analysis} />}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatAnswer(answer: Problem["correctAnswer"]) {
  if (typeof answer !== "object" || answer === null) return String(answer);
  return Object.entries(answer)
    .map(([key, value]) => `${key}=${value}`)
    .join(", ");
}

function ProblemAnalysisDetails({ analysis }: { analysis: NonNullable<Problem["analysis"]> }) {
  return (
    <details className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs text-ink-dim">
      <summary className="cursor-pointer font-bold text-ink">
        Шинжилгээ · {analysis.subtopic || analysis.topic} · {analysis.answerKeyStatus}
      </summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {analysis.formulas.length > 0 && (
          <AnalysisBlock title="Томьёо" items={analysis.formulas.map((f) => f.name)} />
        )}
        {analysis.methods.length > 0 && (
          <AnalysisBlock title="Арга" items={analysis.methods} />
        )}
        {analysis.domainNotes.length > 0 && (
          <AnalysisBlock title="Тодорхойлох муж" items={analysis.domainNotes} />
        )}
        {analysis.signRules.length > 0 && (
          <AnalysisBlock title="Тэмдгийн дүрэм" items={analysis.signRules} />
        )}
        {analysis.commonMistakes.length > 0 && (
          <AnalysisBlock title="Түгээмэл алдаа" items={analysis.commonMistakes} />
        )}
        {analysis.auditNotes.length > 0 && (
          <AnalysisBlock title="Шалгах шаардлагатай" items={analysis.auditNotes} />
        )}
      </div>
    </details>
  );
}

function AnalysisBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-bold text-ink">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.slice(0, 4).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
