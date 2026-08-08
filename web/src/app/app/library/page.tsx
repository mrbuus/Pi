"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Check, Pencil } from "lucide-react";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import MathText from "@/components/MathText";
import ProblemClassifyEditor from "@/components/ProblemClassifyEditor";
import { api, getRole, getToken } from "@/lib/api";

interface Chapter {
  id: string;
  title: string;
  order: number;
  grade?: number;
  freePreview: boolean;
  book?: { code: string; title: string };
  _count: { problems: number; theories: number; tests: number };
}
interface ChoiceOption {
  label: string;
  text: string;
  // Зөвхөн багш ролийн (ADMIN/TEACHER_PLUS/TEACHER) API хариунд ирнэ —
  // сурагчид зөвхөн {label, text} авна (backend-ээс шүүгдсэн).
  isCorrect?: boolean;
}
interface Problem {
  id: string;
  token: string;
  format: string;
  statementText?: string;
  choices?: string[];
  choiceOptions?: ChoiceOption[];
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
  testCount?: number;
  _count: { chapters: number };
}

type ToneKey = "brand" | "teal" | "gold" | "rose" | "violet" | "sky";

interface TopicTone {
  symbol: string;
  border: string;
  bg: string;
  soft: string;
  text: string;
  solid: string;
  line: string;
}

// globals.css-ийн токенууд (brand-bright + 5 accent-*)-аар барьсан 6 өнгөний
// давталт — ХЭЗЭЭ Ч шууд hex/rgba бичихгүй тул LIGHT/DARK хоёуланд зөв харагдана.
const TONE_STYLE: Record<ToneKey, Omit<TopicTone, "symbol">> = {
  brand: {
    border: "border-brand-bright/45",
    bg: "bg-brand-bright/10",
    soft: "bg-brand-bright/18",
    text: "text-brand-bright",
    solid: "bg-brand-bright",
    line: "bg-brand-bright/40",
  },
  teal: {
    border: "border-accent-teal/45",
    bg: "bg-accent-teal/10",
    soft: "bg-accent-teal/18",
    text: "text-accent-teal",
    solid: "bg-accent-teal",
    line: "bg-accent-teal/40",
  },
  gold: {
    border: "border-accent-gold/45",
    bg: "bg-accent-gold/10",
    soft: "bg-accent-gold/18",
    text: "text-accent-gold",
    solid: "bg-accent-gold",
    line: "bg-accent-gold/40",
  },
  rose: {
    border: "border-accent-rose/45",
    bg: "bg-accent-rose/10",
    soft: "bg-accent-rose/18",
    text: "text-accent-rose",
    solid: "bg-accent-rose",
    line: "bg-accent-rose/40",
  },
  violet: {
    border: "border-accent-violet/45",
    bg: "bg-accent-violet/10",
    soft: "bg-accent-violet/18",
    text: "text-accent-violet",
    solid: "bg-accent-violet",
    line: "bg-accent-violet/40",
  },
  sky: {
    border: "border-accent-sky/45",
    bg: "bg-accent-sky/10",
    soft: "bg-accent-sky/18",
    text: "text-accent-sky",
    solid: "bg-accent-sky",
    line: "bg-accent-sky/40",
  },
};

// Тэмдэг бүрийг LaTeX-ээр бичээд MathText-ээр рендерлэнэ (KaTeX) — бэлэн
// unicode тэмдэгтийг (π, √ гэх мэт) шууд харуулахгүй.
const TONE_ORDER: { key: ToneKey; symbol: string }[] = [
  { key: "brand", symbol: "$\\sum$" },
  { key: "teal", symbol: "$\\surd$" },
  { key: "gold", symbol: "$\\pi$" },
  { key: "rose", symbol: "$|x|$" },
  { key: "violet", symbol: "$\\log$" },
  { key: "sky", symbol: "$f$" },
];

function toneFor(index: number): TopicTone {
  const { key, symbol } = TONE_ORDER[index % TONE_ORDER.length];
  return { symbol, ...TONE_STYLE[key] };
}

interface TopicGroup {
  topic: string;
  tone: TopicTone;
  chapters: Chapter[];
  problems: number;
  theories: number;
  tests: number;
  free: number;
}

const FORMAT_LABEL: Record<string, string> = {
  CHOICE: "Сонгох",
  FILL_NUMBER: "Тоо нөхөх",
  OPEN: "Задгай",
};

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

function splitChapterTitle(title: string) {
  const [topic, ...rest] = title.split(" · ");
  return {
    topic: topic?.trim() || title,
    label: rest.join(" · ").trim() || title,
  };
}

function cleanBookCode(value: string) {
  return value.toLowerCase().replaceAll("×", "x").replace(/[^a-zа-яөөгү0-9]/gi, "");
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
        tests: 0,
        free: 0,
      } satisfies Omit<TopicGroup, "tone">);
    current.chapters.push(chapter);
    current.problems += chapter._count.problems;
    current.theories += chapter._count.theories;
    current.tests += chapter._count.tests;
    if (chapter.freePreview) current.free += 1;
    groups.set(topic, current);
  }

  return [...groups.values()].map((group, index) => ({
    ...group,
    chapters: [...group.chapters].sort((a, b) => a.order - b.order),
    tone: toneFor(index),
  }));
}

// ---- Бүлэг сэдвийн бодлого татах — 403 (жинхэнэ түгжээтэй) ба бусад алдааг
// (сүлжээ/сервер) ялгаж таниулна. api()-ийн энгийн throw new Error(msg) нь
// HTTP статус кодыг дамжуулдаггүй тул энд шууд fetch хийж res.status шалгана.
class ChapterAccessDeniedError extends Error {}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api";

async function fetchChapterProblems(chapterId: string): Promise<Problem[]> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}/chapters/${chapterId}/problems`, { headers });
  } catch {
    throw new Error("Сүлжээний алдаа — интернэт холболтоо шалгаад дахин оролдоно уу.");
  }

  if (res.status === 403) {
    throw new ChapterAccessDeniedError(
      "Энэ бүлгийг үзэх эрхгүй байна — эрх худалдаж авах эсвэл ангид элсэх шаардлагатай",
    );
  }

  const data = (await res.json().catch(() => null)) as
    | Problem[]
    | { message?: string | string[] }
    | null;

  if (!res.ok) {
    const message =
      data && !Array.isArray(data)
        ? (Array.isArray(data.message) ? data.message.join(", ") : data.message)
        : undefined;
    throw new Error(message ?? `Алдаа ${res.status}`);
  }

  return (data as Problem[]) ?? [];
}

export default function LibraryPage() {
  const [subject, setSubject] = useState<SubjectKey>(readSubjectFromUrl);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTopic, setActiveTopic] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [locked, setLocked] = useState(false);
  const [problemsError, setProblemsError] = useState("");
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // Ангилал засах эрх зөвхөн багш/багш+/админд (tests/teacher хуудасны хэв маяг)
  const role = typeof window !== "undefined" ? getRole() : null;
  const canEdit =
    role === "ADMIN" || role === "TEACHER" || role === "TEACHER_PLUS";
  // Агуулга (статемент/сонголт/зөв хариу/зураг) засах эрх — зөвхөн ADMIN/TEACHER_PLUS.
  // Энгийн TEACHER-д зөвхөн дээрх canEdit-ийн хуучин ангилал/tag засах горим үлдэнэ.
  const canEditContent = role === "ADMIN" || role === "TEACHER_PLUS";

  const topicGroups = useMemo(() => groupChapters(chapters), [chapters]);
  const activeGroup =
    topicGroups.find((group) => group.topic === activeTopic) ?? topicGroups[0];
  const currentBook = books.find((b) => b.id === bookId);
  const totalProblems = topicGroups.reduce((sum, group) => sum + group.problems, 0);
  const totalTests = topicGroups.reduce((sum, group) => sum + group.tests, 0);

  function selectSubject(next: SubjectKey) {
    if (next === subject) return;
    setSubject(next);
    setBookId("");
    setChapters([]);
    setActiveTopic("");
    setOpenId(null);
    setProblems([]);
    setLocked(false);
    setProblemsError("");
    setCatalogError("");
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("subject", next);
      window.history.replaceState(null, "", url.toString());
    }
  }

  useEffect(() => {
    api<Book[]>(`/books?subject=${subject}`)
      .then((bs) => {
        // Бүтэц (сэдэв/тест) байвал л харуулна — бодлого хараахан ороогүй ч
        // metadata-only номууд (Хавтгай, Огторгуй г.м.) шатлалаа харуулна
        const withProblems = bs.filter(
          (b) => b._count.chapters > 0 || (b.problemCount ?? 0) > 0,
        );
        setBooks(withProblems);
        if (withProblems.length > 0) {
          const requested =
            typeof window !== "undefined"
              ? new URLSearchParams(window.location.search).get("book")
              : null;
          const requestedKey = requested ? cleanBookCode(requested) : "";
          const requestedBook = requestedKey
            ? withProblems.find(
                (book) =>
                  cleanBookCode(book.code) === requestedKey ||
                  cleanBookCode(book.title) === requestedKey,
              )
            : null;
          setBookId((id) => id || (requestedBook ?? withProblems[0]).id);
        }
      })
      .catch((error) => {
        setCatalogError(
          error instanceof Error ? error.message : "Номын сан ачаалахад алдаа гарлаа",
        );
      });
  }, [subject]);

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

  async function loadProblemsFor(ch: Chapter) {
    setProblems([]);
    setLocked(false);
    setProblemsError("");
    setLoadingProblems(true);
    try {
      const probs = await fetchChapterProblems(ch.id);
      setProblems(probs);
    } catch (e) {
      if (e instanceof ChapterAccessDeniedError) {
        setLocked(true);
      } else {
        setProblemsError(
          e instanceof Error ? e.message : "Бодлого ачаалахад алдаа гарлаа",
        );
      }
    } finally {
      setLoadingProblems(false);
    }
  }

  async function openChapter(ch: Chapter) {
    if (openId === ch.id) {
      setOpenId(null);
      return;
    }
    setOpenId(ch.id);
    await loadProblemsFor(ch);
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold">Бодлогын сан</h1>
        <p className="mt-1 text-sm text-ink-dim">
          Ном сонгоод сэдэв бүрийн тестүүдийг дарааллаар нь эзэмшинэ.
        </p>
      </div>

      {/* Хичээлийн сэлгэгч */}
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
              setProblemsError("");
            }}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              bookId === b.id
                ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                : "border-line text-ink-dim hover:border-brand-bright/40"
            }`}
          >
            <span className="font-mono">{b.code}</span> — {b.testCount ?? 0} тест
          </button>
        ))}
      </div>

      {catalogError && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {catalogError}
        </div>
      )}

      {books.length === 0 && !catalogError && (
        <p className="text-sm text-ink-dim">
          Энэ хичээлээр ном хараахан нэмэгдээгүй байна.
        </p>
      )}

      {currentBook && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-brand-soft">
                Сонгосон ном
              </p>
              <h2 className="mt-1 text-3xl font-extrabold">{currentBook.title}</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Metric label="Сэдэв" value={topicGroups.length} />
              <Metric label="Тест" value={totalTests} />
              <Metric label="Бодлого" value={totalProblems} />
            </div>
          </div>
        </section>
      )}

      {chapters.length === 0 && !catalogError && bookId && (
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
                    setProblemsError("");
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                    selected
                      ? `shadow-lg ${group.tone.border} ${group.tone.bg}`
                      : "border-line bg-ink/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${group.tone.soft} ${group.tone.text}`}
                    >
                      <MathText>{group.tone.symbol}</MathText>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{group.topic}</span>
                      <span className="mt-0.5 block text-xs text-ink-dim">
                        {group.tests} тест — {group.problems} бодлого
                      </span>
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className={`h-full rounded-full ${group.tone.solid}`}
                      style={{
                        width: `${Math.min(100, Math.max(12, group.chapters.length * 8))}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </aside>

          <section className="min-w-0 space-y-3">
            <div className={`rounded-2xl border p-5 ${activeGroup.tone.border} ${activeGroup.tone.bg}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className={`text-xs font-bold uppercase ${activeGroup.tone.text}`}>
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
                  <span className="rounded-full bg-ink/8 px-3 py-1 font-semibold">
                    {activeGroup.tests} тест
                  </span>
                  <span className="rounded-full bg-ink/8 px-3 py-1 font-semibold">
                    {activeGroup.problems} бодлого
                  </span>
                  {activeGroup.free > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 font-semibold text-success">
                      <Check className="h-3.5 w-3.5" aria-hidden /> {activeGroup.free} үнэгүй
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="relative space-y-3">
              <div
                aria-hidden
                className={`absolute bottom-8 left-6 top-8 hidden w-px sm:block ${activeGroup.tone.line}`}
              />
              {activeGroup.chapters.map((ch, index) => {
                const isOpen = openId === ch.id;
                const { label } = splitChapterTitle(ch.title);
                return (
                  <div key={ch.id} className="relative">
                    <button
                      onClick={() => openChapter(ch)}
                      className={`flex w-full items-center gap-4 rounded-2xl border bg-panel p-5 text-left transition hover:border-brand-bright/40 ${
                        isOpen ? `${activeGroup.tone.border} ${activeGroup.tone.bg}` : "border-line"
                      }`}
                    >
                      <div
                        className={`z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${
                          ch.freePreview
                            ? "bg-success/18 text-success"
                            : `${activeGroup.tone.soft} ${activeGroup.tone.text}`
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-bold">{label}</p>
                          {ch.freePreview && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-bold text-success">
                              <Check className="h-3 w-3" aria-hidden /> Үнэгүй
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm text-ink-dim">
                          {ch.book?.code} ном — {ch._count.tests} тест — {" "}
                          {ch._count.problems} бодлого
                          {ch._count.theories > 0 && ` — ${ch._count.theories} онол`}
                        </p>
                      </div>
                      <span className="text-ink-dim">
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5" aria-hidden />
                        ) : (
                          <ChevronDown className="h-5 w-5" aria-hidden />
                        )}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-2 rounded-2xl border border-line bg-panel p-5">
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
                        {!loadingProblems && !locked && problemsError && (
                          <ErrorState
                            message={problemsError}
                            onRetry={() => loadProblemsFor(ch)}
                          />
                        )}
                        {!loadingProblems && !locked && !problemsError && (
                          <ProblemList
                            problems={problems}
                            tone={activeGroup.tone}
                            canEdit={canEdit}
                            onEdit={setEditId}
                          />
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

      {editId && (
        <ProblemClassifyEditor
          key={editId}
          problemId={editId}
          onClose={() => setEditId(null)}
          canEditContent={canEditContent}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-20 rounded-xl border border-line bg-ink/[0.03] px-3 py-2">
      <p className="text-lg font-extrabold">{value.toLocaleString()}</p>
      <p className="text-xs text-ink-dim">{label}</p>
    </div>
  );
}

function ProblemList({
  problems,
  tone,
  canEdit,
  onEdit,
}: {
  problems: Problem[];
  tone: TopicTone;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
}) {
  if (problems.length === 0) {
    return (
      <EmptyState
        title="Бодлого алга"
        hint="Энэ сэдэвт дадлагын бодлого байхгүй байна."
      />
    );
  }

  return (
    <div className="space-y-2">
      {problems.map((p, idx) => (
        <div
          key={p.id}
          className="flex items-start gap-3 rounded-xl border border-line p-3"
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tone.soft} ${tone.text}`}
          >
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <MathText>{p.statementText ?? ""}</MathText>
            </p>

            {/* Сонголтууд — өмнө нь ФАЙЛД ОГТ ХАРУУЛДАГГҮЙ байсан (choiceOptions
                API-д ирж байсан ч render хийгээгүй) — одоо бүх сурагчид харна.
                Зөв хариуны тэмдэг зөвхөн багш ролид (canEdit) ба backend-ээс
                isCorrect ирсэн үед л гарна. */}
            {p.format === "CHOICE" && p.choiceOptions && p.choiceOptions.length > 0 && (
              <ul className="list-disc pl-5 mt-2 space-y-1">
                {p.choiceOptions.map((o) => (
                  <li key={o.label} className="flex items-start gap-2 text-sm">
                    <span className="shrink-0 font-mono font-bold text-ink-dim">
                      {o.label}.
                    </span>
                    <span className="min-w-0 flex-1">
                      <MathText>{o.text}</MathText>
                    </span>
                    {canEdit && o.isCorrect && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-bold text-success">
                        <Check className="h-3 w-3" aria-hidden /> Зөв
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-1.5 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded bg-ink/5 px-2 py-0.5 font-mono text-ink-dim">
                {p.token}
              </span>
              <span className={`rounded px-2 py-0.5 ${tone.soft} ${tone.text}`}>
                {FORMAT_LABEL[p.format] ?? p.format}
              </span>
              <span className="rounded bg-ink/5 px-2 py-0.5 text-ink-dim">
                {p.points} оноо
              </span>
              {p.correctAnswer !== undefined && (
                <span className="rounded bg-success/15 px-2 py-0.5 text-success">
                  Хариу: {formatAnswer(p.correctAnswer)}
                </span>
              )}
              {canEdit && (
                <button
                  onClick={() => onEdit?.(p.id)}
                  className="inline-flex items-center gap-1.5 rounded bg-brand-bright/15 px-2 py-0.5 text-brand-soft transition hover:bg-brand-bright/25"
                >
                  <Pencil className="h-3 w-3" aria-hidden /> Ангилал засах
                </button>
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
    <details className="mt-3 rounded-xl border border-line bg-ink/[0.03] p-3 text-xs text-ink-dim">
      <summary className="cursor-pointer font-bold text-ink">
        Шинжилгээ — {analysis.subtopic || analysis.topic} — {analysis.answerKeyStatus}
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
      <ul className="list-disc pl-5 mt-1 space-y-1">
        {items.slice(0, 4).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
