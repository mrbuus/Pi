"use client";

import CodeReveal from "@/components/ui/CodeReveal";
import { MetaTitle } from "@/components/ui/Meta";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Check, Pencil } from "lucide-react";
import { ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import ProblemVideoDisclosure from "@/components/lesson/ProblemVideoDisclosure";
import MathText from "@/components/MathText";
import ChoiceContent from "@/components/ChoiceContent";
import ProblemClassifyEditor from "@/components/ProblemClassifyEditor";
import { api, getRole, ApiError } from "@/lib/api";

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
  imageKey?: string | null;
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
  // Аль тестийн хувилбарт (A/B) харьяалагдах — сервер TestProblem-оос өгнө
  variantLabel?: string | null;
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
  sourceLabel?: string | null;
  problemCount?: number;
  testCount?: number;
  _count: { chapters: number };
}

type ToneKey = "brand" | "teal" | "rose" | "violet" | "sky";

interface TopicTone {
  symbol: string;
  border: string;
  bg: string;
  soft: string;
  text: string;
  solid: string;
  line: string;
}

// globals.css-ийн токенууд (brand-bright + 4 accent-*)-аар барьсан 5 өнгө — ХЭЗЭЭ Ч шууд hex/rgba бичихгүй тул LIGHT/DARK хоёуланд зөв харагдана.
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

// Сэдвийн тэмдэг — СЭДВИЙН УТГААР (сурах бичгийн стандарт бичлэг), дарааллаар биш.
// Тэгшитгэл «=», тэнцэтгэл биш «>/<» — хос сэдэв зөвхөн тэмдгээрээ ялгарна
// (|x|=a / |x|<a). Нэг гэр бүлийн сэдэв ижил өнгөтэй. LaTeX-ээр (KaTeX) — бэлэн
// unicode тэмдэгт биш. Шар/алтан өнгө хэрэглэхгүй (эзний дизайны дүрэм).
// Дүрэм дарааллаар шалгагдана — тодорхой нь эхэнд.
const TOPIC_SYMBOLS: { test: RegExp; symbol: string; tone: ToneKey }[] = [
  // Тэгшитгэл / тэнцэтгэл биш — хос
  { test: /модул.*тэнцэтгэл/i, symbol: "$|x|<a$", tone: "rose" },
  { test: /модул/i, symbol: "$|x|=a$", tone: "rose" },
  { test: /иррациональ.*тэнцэтгэл/i, symbol: "$\\sqrt{x}>a$", tone: "teal" },
  { test: /иррациональ/i, symbol: "$\\sqrt{x}=a$", tone: "teal" },
  { test: /рациональ.*тэнцэтгэл/i, symbol: "$\\frac{P}{Q}>0$", tone: "brand" },
  { test: /рациональ/i, symbol: "$\\frac{P}{Q}=0$", tone: "brand" },
  { test: /илтгэгч.*тэнцэтгэл/i, symbol: "$a^x>b$", tone: "sky" },
  { test: /илтгэгч/i, symbol: "$a^x=b$", tone: "sky" },
  { test: /логарифм.*тэнцэтгэл/i, symbol: "$\\log_a x>b$", tone: "violet" },
  { test: /логарифм.*тэгшитгэл/i, symbol: "$\\log_a x=b$", tone: "violet" },
  { test: /логарифм/i, symbol: "$\\log_a b$", tone: "violet" },
  { test: /тригонометр.*тэгшитгэл/i, symbol: "$\\sin x=a$", tone: "teal" },
  { test: /тригонометр.*урвуу/i, symbol: "$\\arcsin x$", tone: "teal" },
  { test: /тригонометр.*график/i, symbol: "$y=\\sin x$", tone: "teal" },
  { test: /тригонометр/i, symbol: "$\\sin\\alpha$", tone: "teal" },
  { test: /квадрат тэгшитгэлийн шийд/i, symbol: "$x_1x_2$", tone: "brand" },
  { test: /квадрат функц/i, symbol: "$y=x^2$", tone: "brand" },
  { test: /квадрат тэгшитгэл/i, symbol: "$x^2=a$", tone: "brand" },
  { test: /өндөр зэргийн/i, symbol: "$x^n=a$", tone: "brand" },
  { test: /тойргийн тэгшитгэл/i, symbol: "$x^2+y^2=R^2$", tone: "sky" },
  { test: /шүргэгч/i, symbol: "$y=kx+b$", tone: "violet" },
  // Анализ
  { test: /нугаралт/i, symbol: "$f''=0$", tone: "violet" },
  { test: /экстремум/i, symbol: "$f'=0$", tone: "violet" },
  { test: /өсөх|буурах/i, symbol: "$f'>0$", tone: "violet" },
  { test: /их ба бага утга/i, symbol: "$\\max f$", tone: "violet" },
  { test: /уламжлалын хэрэглээ/i, symbol: "$f'(x_0)$", tone: "violet" },
  { test: /уламжлал/i, symbol: "$f'(x)$", tone: "violet" },
  { test: /эзлэхүүн/i, symbol: "$V=\\pi\\!\\int y^2$", tone: "sky" },
  { test: /интегралын хэрэглээ/i, symbol: "$\\int_a^b$", tone: "sky" },
  { test: /интеграл/i, symbol: "$\\int x\\,dx$", tone: "sky" },
  // Функц
  { test: /урвуу функц/i, symbol: "$f^{-1}$", tone: "rose" },
  { test: /тэгш сондгой/i, symbol: "$f(-x)$", tone: "rose" },
  { test: /функцийн үе/i, symbol: "$f(x+T)$", tone: "rose" },
  { test: /тодорхойлогдох муж/i, symbol: "$D(f)$", tone: "rose" },
  { test: /утгын муж/i, symbol: "$E(f)$", tone: "rose" },
  { test: /функц/i, symbol: "$f(x)$", tone: "rose" },
  // Алгебр, тоо
  { test: /бином/i, symbol: "$\\binom{n}{k}$", tone: "brand" },
  { test: /полином задаргаа/i, symbol: "$(a+b)^n$", tone: "brand" },
  { test: /олон гишүүнт/i, symbol: "$P(x)$", tone: "brand" },
  { test: /комплекс/i, symbol: "$a+bi$", tone: "sky" },
  { test: /матриц/i, symbol: "$\\det A$", tone: "sky" },
  { test: /факториал/i, symbol: "$n!$", tone: "teal" },
  { test: /комбинаторик/i, symbol: "$C_n^k$", tone: "teal" },
  { test: /магадлал/i, symbol: "$P(A)$", tone: "teal" },
  { test: /өгөгдл/i, symbol: "$\\bar{x}$", tone: "teal" },
  { test: /арифметик прогресс/i, symbol: "$a_n+d$", tone: "brand" },
  { test: /геометр прогресс/i, symbol: "$b_n\\cdot q$", tone: "brand" },
  { test: /дараалал/i, symbol: "$\\{a_n\\}$", tone: "brand" },
  { test: /тоо тоолол/i, symbol: "$\\mathbb{N}$", tone: "brand" },
  // Геометр
  { test: /вектор/i, symbol: "$\\vec{a}$", tone: "sky" },
  { test: /аналитик геометр/i, symbol: "$(x;y)$", tone: "sky" },
  { test: /хувиргалт/i, symbol: "$A\\to A'$", tone: "violet" },
  { test: /талбай/i, symbol: "$S$", tone: "violet" },
  { test: /огторгуй/i, symbol: "$V$", tone: "violet" },
  { test: /геометр/i, symbol: "$\\triangle ABC$", tone: "violet" },
  // Ерөнхий
  { test: /тэнцэтгэл/i, symbol: "$x>a$", tone: "brand" },
  { test: /тэгшитгэл/i, symbol: "$x=a$", tone: "brand" },
];

function toneFor(topic: string): TopicTone {
  // Зарим нэрэнд «й» задарсан (и + ̆) — харагдах нь ижил ч регекс тохирохгүй
  const name = topic.normalize("NFC");
  const rule = TOPIC_SYMBOLS.find((r) => r.test.test(name));
  return { symbol: rule?.symbol ?? "$\\sum$", ...TONE_STYLE[rule?.tone ?? "brand"] };
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
  return value
    .toLowerCase()
    .replaceAll("×", "x")
    .replace(/[^a-zа-яөөгү0-9]/gi, "");
}

// Ижил нэртэй хоёр ном (100x100 V2 ба V3) ялгагдахаар номын товчны шошго.
function bookLabel(book: Book, all: Book[]) {
  const twin = all.some((b) => b.id !== book.id && b.title === book.title);
  if (!twin) return book.title;
  const version = /V\d+/i.exec(book.sourceLabel ?? book.code)?.[0]?.toUpperCase();
  return version ? `${book.title} ${version}` : `${book.title} (${book.code})`;
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

  return [...groups.values()].map((group) => ({
    ...group,
    chapters: [...group.chapters].sort((a, b) => a.order - b.order),
    tone: toneFor(group.topic),
  }));
}

// Only an explicit 403 shows the access-purchase state; other failures remain retryable.
class ChapterAccessDeniedError extends Error {}

async function fetchChapterProblems(chapterId: string): Promise<Problem[]> {
  try {
    return (
      (await api<Problem[]>(
        "/chapters/" + encodeURIComponent(chapterId) + "/problems",
      )) ?? []
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new ChapterAccessDeniedError(
        "Энэ бүлгийг үзэх эрхгүй байна — эрх худалдаж авах эсвэл ангид элсэх шаардлагатай",
      );
    }
    throw error;
  }
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
  const totalProblems = topicGroups.reduce(
    (sum, group) => sum + group.problems,
    0,
  );
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
          // Анхдагч: хамгийн сүүлийн хувилбар (100x100 V3) — эзний хүсэлт 2026-10-08
          const latest = withProblems.find((b) => /V3$/i.test(b.sourceLabel ?? ""));
          setBookId((id) => id || (requestedBook ?? latest ?? withProblems[0]).id);
        }
      })
      .catch((error) => {
        setCatalogError(
          error instanceof Error
            ? error.message
            : "Номын сан ачаалахад алдаа гарлаа",
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
          error instanceof Error
            ? error.message
            : "Бүлэг сэдэв ачаалахад алдаа гарлаа",
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
            {bookLabel(b, books)}
            <span className="ml-1.5 font-normal text-ink-dim">{b.testCount ?? 0} тест</span>
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
        <section className="chunky p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-brand-soft">
                Сонгосон ном
              </p>
              <h2 className="mt-1 text-3xl font-extrabold">
                <MetaTitle>{bookLabel(currentBook, books)}</MetaTitle>
              </h2>
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
                  className={`w-full rounded-3xl border-2 border-b-4 p-4 text-left transition hover:-translate-y-0.5 active:translate-y-0.5 active:border-b-2 ${
                    selected
                      ? `shadow-lg ${group.tone.border} ${group.tone.bg}`
                      : "border-line bg-ink/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 min-w-11 max-w-[7.5rem] shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-xl px-2 text-[15px] font-extrabold ${group.tone.soft} ${group.tone.text}`}
                    >
                      <MathText>{group.tone.symbol}</MathText>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">
                        {group.topic}
                      </span>
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
            <div
              className={`rounded-3xl border-2 border-b-4 p-5 ${activeGroup.tone.border} ${activeGroup.tone.bg}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p
                    className={`text-xs font-bold uppercase ${activeGroup.tone.text}`}
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
                  <span className="rounded-full bg-ink/8 px-3 py-1 font-semibold">
                    {activeGroup.tests} тест
                  </span>
                  <span className="rounded-full bg-ink/8 px-3 py-1 font-semibold">
                    {activeGroup.problems} бодлого
                  </span>
                  {activeGroup.free > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 font-semibold text-success">
                      <Check className="h-3.5 w-3.5" aria-hidden />{" "}
                      {activeGroup.free} үнэгүй
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
                      className={`flex w-full items-center gap-4 rounded-3xl border-2 border-b-4 bg-panel p-5 text-left transition active:translate-y-0.5 active:border-b-2 hover:border-brand-bright/40 ${
                        isOpen
                          ? `${activeGroup.tone.border} ${activeGroup.tone.bg}`
                          : "border-line"
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
                          {ch._count.tests === 2 ? "A, B хувилбар" : `${ch._count.tests} тест`} —{" "}
                          {ch._count.problems} бодлого
                          {ch._count.theories > 0 &&
                            ` — ${ch._count.theories} онол`}
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
                      <div className="mt-2 chunky p-5">
                        {loadingProblems && <SkeletonRows rows={4} />}
                        {locked && (
                          <div className="text-center">
                            <p className="text-sm text-ink-dim">
                              Энэ бүлгийг үзэх эрх хэрэгтэй байна.
                            </p>
                            <Link
                              href="/app/buyer"
                              className="mt-3 inline-block btn-3d rounded-2xl bg-brand-bright px-5 py-2 text-sm font-bold"
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
                          <VariantProblems
                            key={ch.id}
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

// A ба B хувилбарыг НЭГТГЭХГҮЙ (эзэн 2026-10-08): нэг дор зөвхөн нэг хувилбар.
function VariantProblems(props: {
  problems: Problem[];
  tone: TopicTone;
  canEdit?: boolean;
  onEdit?: (id: string) => void;
}) {
  const variants = [
    ...new Set(props.problems.map((p) => p.variantLabel).filter((v): v is string => !!v)),
  ].sort();
  const [active, setActive] = useState<string | null>(variants[0] ?? null);
  if (variants.length < 2) return <ProblemList {...props} />;
  const current = active && variants.includes(active) ? active : variants[0];
  const shown = props.problems.filter((p) => p.variantLabel === current);
  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Тестийн хувилбар"
        className="inline-flex rounded-2xl border border-line bg-bg p-1"
      >
        {variants.map((v) => {
          const on = v === current;
          const count = props.problems.filter((p) => p.variantLabel === v).length;
          return (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={on}
              onClick={() => setActive(v)}
              className={`min-h-11 rounded-xl px-4 text-sm font-bold transition ${
                on ? "bg-brand-bright text-on-brand shadow-sm" : "text-ink-dim hover:text-ink"
              }`}
            >
              Хувилбар {v}
              <span className={`ml-2 text-xs font-semibold ${on ? "text-on-brand/80" : "text-ink-dim"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <ProblemList {...props} problems={shown} />
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
            {p.format === "CHOICE" &&
              p.choiceOptions &&
              p.choiceOptions.length > 0 && (
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {p.choiceOptions.map((o) => (
                    <li
                      key={o.label}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="shrink-0 font-mono font-bold text-ink-dim">
                        {o.label}.
                      </span>
                      <span className="min-w-0 flex-1">
                        <ChoiceContent text={o.text} image={o.imageKey} imageClassName="max-h-40" />
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
              {/* Бодлогын код: сурагчид API огт өгөхгүй, ажилтан «#» дарж харна */}
              <CodeReveal code={p.token} className="h-6 w-6" />
              <span className={`rounded px-2 py-0.5 ${tone.soft} ${tone.text}`}>
                {FORMAT_LABEL[p.format] ?? p.format}
              </span>
              <span className="rounded bg-ink/5 px-2 py-0.5 text-ink-dim">
                {p.points} оноо
              </span>
              <details className="mt-2 text-xs text-ink-dim">
                <summary>Бодлогын ID</summary>
                <code className="block break-all py-2">{p.id}</code>
              </details>
              <ProblemVideoDisclosure problemId={p.id} />
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

function ProblemAnalysisDetails({
  analysis,
}: {
  analysis: NonNullable<Problem["analysis"]>;
}) {
  return (
    <details className="mt-3 rounded-xl border border-line bg-ink/[0.03] p-3 text-xs text-ink-dim">
      <summary className="cursor-pointer font-bold text-ink">
        Шинжилгээ — {analysis.subtopic || analysis.topic} —{" "}
        {analysis.answerKeyStatus}
      </summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {analysis.formulas.length > 0 && (
          <AnalysisBlock
            title="Томьёо"
            items={analysis.formulas.map((f) => f.name)}
          />
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
          <AnalysisBlock
            title="Түгээмэл алдаа"
            items={analysis.commonMistakes}
          />
        )}
        {analysis.auditNotes.length > 0 && (
          <AnalysisBlock
            title="Шалгах шаардлагатай"
            items={analysis.auditNotes}
          />
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
