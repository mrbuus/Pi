"use client";

import CodeReveal from "@/components/ui/CodeReveal";
import { splitChapterTitle, toneFor, type TopicTone } from "@/lib/topicSymbols";
import { Dot, Meta, MetaTitle } from "@/components/ui/Meta";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, Eye, Pencil, Plus, Video } from "lucide-react";
import SocialStudiesEmpty, { NEW_SOCIAL_TEST_HREF } from "@/components/library/SocialStudiesEmpty";
import { ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import ProblemVideoDisclosure from "@/components/lesson/ProblemVideoDisclosure";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import ChoiceGrid, { type DisplayChoice } from "@/components/library/ChoiceGrid";
import StudentViewModal from "@/components/library/StudentViewModal";
import ProblemClassifyEditor from "@/components/ProblemClassifyEditor";
import TestMenu from "@/components/library/TestMenu";
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
  imageKey?: string | null;
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



// globals.css-ийн токенууд (brand-bright + 4 accent-*)-аар барьсан 5 өнгө — ХЭЗЭЭ Ч шууд hex/rgba бичихгүй тул LIGHT/DARK хоёуланд зөв харагдана.

// Сэдвийн тэмдэг, өнгө: lib/topicSymbols.ts (нийтийн /books хуудастай нэг эх)

interface TopicGroup {
  topic: string;
  /** Номын хэмжээний тестийн дугаар (Хавтгай 1: сэдэв бүр = «Тест N»), эс бөгөөс null */
  testNo: number | null;
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


function cleanBookCode(value: string) {
  return value
    .toLowerCase()
    .replaceAll("×", "x")
    .replace(/[^a-zа-яөөгү0-9]/gi, "");
}

// Бодлогын доод мөрийн дүрс товч (код, засах, бичлэг) — бүгд ижил хэмжээ
const ICON_BTN =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand";

// Үндсэн жагсаалтад харагдах ном (эзний хүсэлт 2026-10-18) — энэ дарааллаар.
// Бусад ном «Бусад ном» товчоор нээгдэнэ.
const FEATURED_BOOK_CODES = ["100V3", "200V3", "HG1", "1000"];

// Ижил нэртэй хоёр ном (100x100 V2 ба V3) ялгагдахаар номын товчны шошго.
function bookLabel(book: Book, all: Book[]) {
  const twin = all.some((b) => b.id !== book.id && b.title === book.title);
  if (!twin) return book.title;
  const version = /V\d+/i.exec(book.sourceLabel ?? book.code)?.[0]?.toUpperCase();
  return version ? `${book.title} ${version}` : `${book.title} (${book.code})`;
}

function groupChapters(chapters: Chapter[]): TopicGroup[] {
  const groups = new Map<string, Omit<TopicGroup, "tone" | "testNo">>();
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
      } satisfies Omit<TopicGroup, "tone" | "testNo">);
    current.chapters.push(chapter);
    current.problems += chapter._count.problems;
    current.theories += chapter._count.theories;
    current.tests += chapter._count.tests;
    if (chapter.freePreview) current.free += 1;
    groups.set(topic, current);
  }

  // Сэдэв бүр ганц «Тест N» бүлэгтэй бөгөөд N ном даяар давхардахгүй бол (Хавтгай 1)
  // тэр нь номын тестийн дугаар — нэрийн өмнө харуулна. 100x100-д «Тест 1» сэдэв бүрт
  // давтагддаг (сэдэв доторх дугаар) тул харуулахгүй.
  const testNoOf = (group: Omit<TopicGroup, "tone" | "testNo">) => {
    if (group.chapters.length !== 1) return null;
    const m = /^Тест\s+(\d+)$/.exec(splitChapterTitle(group.chapters[0].title).label);
    return m ? Number(m[1]) : null;
  };
  const list = [...groups.values()];
  const nos = list.map(testNoOf);
  const bookWide =
    nos.length > 1 && nos.every((n) => n !== null) && new Set(nos).size === nos.length;

  return list.map((group, i) => ({
    ...group,
    testNo: bookWide ? nos[i] : null,
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
  // Номын жагсаалт ачаалагдсан эсэх — хоосон төлвийг ачаалал дуусахаас өмнө харуулахгүй
  const [booksLoaded, setBooksLoaded] = useState(false);
  const [bookId, setBookId] = useState<string>("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTopic, setActiveTopic] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showOtherBooks, setShowOtherBooks] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [locked, setLocked] = useState(false);
  const [problemsError, setProblemsError] = useState("");
  const [loadingProblems, setLoadingProblems] = useState(false);
  // Аль бүлгийн бодлого state-д байгаа вэ — сэдэв хурдан солиход хуучин хариу дарахгүй
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const latestChapterRef = useRef<string | null>(null);
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
    setBooksLoaded(false);
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
      })
      .finally(() => setBooksLoaded(true));
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
    latestChapterRef.current = ch.id;
    setProblems([]);
    setLocked(false);
    setProblemsError("");
    setLoadingProblems(true);
    try {
      const probs = await fetchChapterProblems(ch.id);
      if (latestChapterRef.current !== ch.id) return;
      setProblems(probs);
    } catch (e) {
      if (latestChapterRef.current !== ch.id) return;
      if (e instanceof ChapterAccessDeniedError) {
        setLocked(true);
      } else {
        setProblemsError(
          e instanceof Error ? e.message : "Бодлого ачаалахад алдаа гарлаа",
        );
      }
    } finally {
      if (latestChapterRef.current === ch.id) {
        setLoadingProblems(false);
        setLoadedFor(ch.id);
      }
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

  // «⋯» цэс: нэр солигдвол жагсаалтыг шууд шинэчилж, тэр тестийн сэдэв рүү шилжинэ
  function handleRenamed(chapterId: string, title: string) {
    setChapters((list) => list.map((c) => (c.id === chapterId ? { ...c, title } : c)));
    setActiveTopic(splitChapterTitle(title).topic);
    setOpenId(null);
  }

  // Онол/анги/хугацаа өөрчлөгдсөний дараа тоог чимээгүй шинэчилнэ (алдаа гарвал хуучин жагсаалт хэвээр)
  function refreshChapters() {
    if (!bookId) return;
    api<Chapter[]>(`/chapters?bookId=${bookId}`)
      .then(setChapters)
      .catch(() => {});
  }

  // Сэдэв ганц тесттэй бол (Хавтгай 1: «Тест N» = нэг сэдэв) завсрын карт дарах шаардлагагүй —
  // сэдэв сонгогдмогц тест нь шууд нээгдэж A хувилбар харагдана (эзний хүсэлт 2026-10-18)
  const singleChapter = activeGroup?.chapters.length === 1 ? activeGroup.chapters[0] : null;
  useEffect(() => {
    // Ачааллыг effect-ийн дараа эхлүүлнэ (render дотор state шууд өөрчлөхгүй)
    if (singleChapter) void Promise.resolve().then(() => loadProblemsFor(singleChapter));
    // loadProblemsFor нь state setter-ээс өөр зүйлд хамаарахгүй
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleChapter?.id]);

  // Зүүн жагсаалтын доод хэсгээс сэдэв сонгоход контент дээш гүйлгэхгүйгээр харагдана
  const contentRef = useRef<HTMLElement>(null);
  function selectTopic(topic: string) {
    setActiveTopic(topic);
    setOpenId(null);
    setProblems([]);
    setLocked(false);
    setProblemsError("");
    // Сэдвийн толгой дэлгэцнээс гарсан бол л (доош уншиж байхад) толгой руу буцаана
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el && el.getBoundingClientRect().top < 0) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function renderProblems(ch: Chapter) {
    return (
      <div className="mt-2 chunky p-5">
              {(loadingProblems || loadedFor !== ch.id) && !locked && !problemsError && (
                <SkeletonRows rows={4} />
              )}
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
              {!loadingProblems && loadedFor === ch.id && !locked && !problemsError && (
                <VariantProblems
                  key={ch.id}
                  problems={problems}
                  tone={activeGroup?.tone ?? toneFor("")}
                  canEdit={canEdit}
                  onEdit={setEditId}
                />
              )}
            </div>
    );
  }

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-extrabold">Бодлогын сан</h1>
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
        {subject === "SOCIAL_STUDIES" && canEdit && books.length > 0 && (
          <Link
            href={NEW_SOCIAL_TEST_HREF}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-brand-bright/40 px-4 py-2 text-sm font-semibold text-brand-soft hover:bg-brand-bright/10"
          >
            <Plus className="h-4 w-4" aria-hidden /> Шинэ тест үүсгэх
          </Link>
        )}
      </div>

      {/* Номын таб: онцлох 4 ном, бусад нь «Бусад ном» товчоор */}
      {(() => {
        const featured = FEATURED_BOOK_CODES.map((code) => books.find((b) => b.code === code)).filter(
          (b): b is Book => !!b,
        );
        const others = books.filter((b) => !FEATURED_BOOK_CODES.includes(b.code));
        // Онцлох ном байхгүй хичээлд (ж: Нийгмийн ухаан) бүгдийг шууд харуулна;
        // сонгосон ном «бусад»-д байвал жагсаалт нээлттэй үлдэнэ
        const othersOpen = featured.length === 0 || showOtherBooks || others.some((b) => b.id === bookId);
        const visible = featured.length === 0 ? books : [...featured, ...(othersOpen ? others : [])];
        return (
          <div className="flex flex-wrap gap-2">
            {visible.map((b) => (
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
            {featured.length > 0 && others.length > 0 && !others.some((b) => b.id === bookId) && (
              <button
                type="button"
                onClick={() => setShowOtherBooks((v) => !v)}
                aria-expanded={showOtherBooks}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line px-4 py-2 text-sm font-semibold text-ink-dim transition hover:border-brand-bright/40 hover:text-ink"
              >
                {showOtherBooks ? "Хураах" : `Бусад ном (${others.length})`}
                {showOtherBooks ? (
                  <ChevronUp className="h-4 w-4" aria-hidden />
                ) : (
                  <ChevronDown className="h-4 w-4" aria-hidden />
                )}
              </button>
            )}
          </div>
        );
      })()}

      {catalogError && (
        <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {catalogError}
        </div>
      )}

      {booksLoaded && books.length === 0 && !catalogError &&
        (subject === "SOCIAL_STUDIES" ? (
          <SocialStudiesEmpty canCreate={canEdit} />
        ) : (
          <p className="text-sm text-ink-dim">Энэ хичээлээр ном хараахан нэмэгдээгүй байна.</p>
        ))}

      {/* Сонгосон ном: нэг мөр (утсанд том хайрцаг зай эзэлж байсан) */}
      {currentBook && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-extrabold">
            <MetaTitle>{bookLabel(currentBook, books)}</MetaTitle>
          </h2>
          <Meta
            className="text-sm text-ink-dim"
            items={[
              `${topicGroups.length} сэдэв`,
              `${totalProblems.toLocaleString("en-US")} бодлого`,
            ]}
          />
        </div>
      )}

      {chapters.length === 0 && !catalogError && bookId && (
        <p className="text-sm text-ink-dim">
          Энэ номд бүлэг сэдэв хараахан нэмэгдээгүй байна.
        </p>
      )}

      {activeGroup && (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Компьютер: нягт жагсаалт — өөрөө гүйлгэгдэж, контент үргэлж харагдана.
              Утсанд нуугдана (оронд нь толгой дахь сонгох цэс + сум). */}
          <nav
            aria-label="Сэдвүүд"
            className="hidden lg:sticky lg:top-20 lg:block lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1"
          >
            <ul className="space-y-1">
              {topicGroups.map((group) => {
                const selected = group.topic === activeGroup.topic;
                return (
                  <li key={group.topic}>
                    <button
                      type="button"
                      onClick={() => selectTopic(group.topic)}
                      aria-current={selected ? "true" : undefined}
                      title={group.topic}
                      className={`flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left text-sm transition ${
                        selected
                          ? `${group.tone.border} ${group.tone.bg} font-semibold text-ink`
                          : "border-transparent text-ink-dim hover:bg-ink/5 hover:text-ink"
                      }`}
                    >
                      <span
                        className={`flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg px-1 text-xs font-bold ${group.tone.soft} ${group.tone.text}`}
                      >
                        {group.testNo ?? <MathText>{group.tone.symbol}</MathText>}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{group.topic}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <section ref={contentRef} className="min-w-0 scroll-mt-20 space-y-3">
            {(() => {
              const i = topicGroups.findIndex((g) => g.topic === activeGroup.topic);
              const prev = i > 0 ? topicGroups[i - 1] : null;
              const next = i >= 0 && i < topicGroups.length - 1 ? topicGroups[i + 1] : null;
              const name = (g: TopicGroup) => (g.testNo !== null ? `Тест ${g.testNo} — ${g.topic}` : g.topic);
              const arrow =
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-dim transition hover:bg-ink/5 hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";
              return (
                <div
                  className={`flex items-center gap-1 rounded-2xl border-2 p-1.5 ${activeGroup.tone.border} ${activeGroup.tone.bg}`}
                >
                  <button
                    type="button"
                    disabled={!prev}
                    onClick={() => prev && selectTopic(prev.topic)}
                    aria-label={prev ? `Өмнөх: ${name(prev)}` : "Өмнөх"}
                    title={prev ? name(prev) : undefined}
                    className={arrow}
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                  </button>
                  <div className="min-w-0 flex-1 px-1">
                    {/* Утас: нэг товшилтоор 35 тестээс сонгоно (системийн сонгогч) */}
                    <select
                      aria-label="Сэдэв сонгох"
                      value={activeGroup.topic}
                      onChange={(e) => selectTopic(e.target.value)}
                      className="w-full truncate rounded-lg bg-transparent py-1 text-base font-bold text-ink lg:hidden"
                    >
                      {topicGroups.map((g) => (
                        <option key={g.topic} value={g.topic}>
                          {name(g)}
                        </option>
                      ))}
                    </select>
                    <h2 className="hidden truncate text-lg font-extrabold lg:block">
                      {activeGroup.testNo !== null && (
                        <span className={activeGroup.tone.text}>
                          Тест {activeGroup.testNo}
                          <Dot />
                        </span>
                      )}
                      {activeGroup.topic}
                    </h2>
                    <Meta
                      className="text-xs text-ink-dim"
                      items={[
                        `${activeGroup.problems} бодлого`,
                        activeGroup.free > 0 ? `${activeGroup.free} үнэгүй` : null,
                      ]}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!next}
                    onClick={() => next && selectTopic(next.topic)}
                    aria-label={next ? `Дараах: ${name(next)}` : "Дараах"}
                    title={next ? name(next) : undefined}
                    className={arrow}
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden />
                  </button>
                  {/* Ганц тесттэй сэдэв: «⋯» толгойн баруун дээд талд, сумтай ижил 40px */}
                  {canEdit && singleChapter && (
                    <TestMenu
                      key={singleChapter.id}
                      compact
                      chapterId={singleChapter.id}
                      chapterTitle={singleChapter.title}
                      canEdit={canEdit}
                      canEditContent={canEditContent}
                      onRenamed={(title) => handleRenamed(singleChapter.id, title)}
                      onChanged={refreshChapters}
                    />
                  )}
                </div>
              );
            })()}

            <div className="relative space-y-3">
              <div
                aria-hidden
                className={`absolute bottom-8 left-6 top-8 hidden w-px sm:block ${activeGroup.tone.line}`}
              />
              {singleChapter
                ? renderProblems(singleChapter)
                : activeGroup.chapters.map((ch, index) => {
                const isOpen = openId === ch.id;
                const { label } = splitChapterTitle(ch.title);
                return (
                  <div key={ch.id}>
                    <div className="relative">
                      <button
                        onClick={() => openChapter(ch)}
                        className={`flex w-full items-center gap-4 rounded-3xl border-2 border-b-4 bg-panel p-5 text-left transition active:translate-y-0.5 active:border-b-2 hover:border-brand-bright/40 ${
                          isOpen
                            ? `${activeGroup.tone.border} ${activeGroup.tone.bg}`
                            : "border-line"
                        } ${canEdit ? "pr-16" : ""}`}
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

                      {/* «⋯» картын баруун талд, сумтай нэг мөрөнд (товчны pr-16 зайд) —
                          гарчигтай давхцахгүй, утсанд ч картаас гарахгүй */}
                      {canEdit && (
                        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
                          <TestMenu
                            chapterId={ch.id}
                            chapterTitle={ch.title}
                            canEdit={canEdit}
                            canEditContent={canEditContent}
                            topicSize={activeGroup.chapters.length}
                            onRenamed={(title) => handleRenamed(ch.id, title)}
                            onChanged={refreshChapters}
                          />
                        </div>
                      )}
                    </div>

                    {isOpen && renderProblems(ch)}
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

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Сонголтуудыг НЭГ хэлбэрт: шинэ загвар (ProblemChoice мөр) эсвэл хуучин JSON
 * (100x100/200x200/300x300 импорт: `choices` + `correctAnswer` = үсэг). Хуучныг
 * харуулдаггүй байсан тул 100x100 V3-ийн хариу огт харагдахгүй байв (2026-10-18).
 */
function displayChoicesOf(p: Problem): DisplayChoice[] {
  if (p.choiceOptions && p.choiceOptions.length > 0) {
    return p.choiceOptions.map((o) => ({ label: o.label, text: o.text, imageKey: o.imageKey, isCorrect: o.isCorrect }));
  }
  if (!Array.isArray(p.choices) || p.choices.length === 0) return [];
  const texts = p.choices.map((t) => (typeof t === "string" ? t : String(t ?? "")));
  // «A»,«B»… гэх мэт хоосон placeholder (цаасны лавлагаа) бол харуулах утгагүй
  if (texts.every((t, i) => t.trim().toUpperCase() === LETTERS[i])) return [];
  const raw = typeof p.correctAnswer === "string" ? p.correctAnswer.trim() : "";
  const byLetter = /^[A-Ha-h]$/.test(raw) ? LETTERS.indexOf(raw.toUpperCase()) : -1;
  const correct = byLetter >= 0 ? byLetter : texts.findIndex((t) => raw !== "" && t.trim() === raw);
  return texts.map((text, i) => ({ label: LETTERS[i] ?? String(i + 1), text, isCorrect: i === correct }));
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
  const [videoFor, setVideoFor] = useState<string | null>(null);
  const [previewFor, setPreviewFor] = useState<Problem | null>(null);
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
          className="relative flex items-start gap-3 rounded-xl border border-line p-3"
        >
          {/* «Нүд»: сурагч, худалдан авагчид яг хэрхэн харагдахыг шалгах (баруун дээд булан) */}
          <button
            type="button"
            onClick={() => setPreviewFor(p)}
            aria-label="Сурагчид харагдах байдал"
            title="Сурагчид харагдах байдал"
            className={`absolute right-2 top-2 ${ICON_BTN}`}
          >
            <Eye className="h-4 w-4" aria-hidden />
          </button>
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${tone.soft} ${tone.text}`}
          >
            {idx + 1}
          </span>
          <div className="min-w-0 flex-1">
            {/* Бодлогын чертеж (геометр) — өмнө нь жагсаалтад огт гардаггүй байв */}
            <ProblemFigure
              imageKey={p.imageKey}
              alt={`${idx + 1}-р бодлогын зураг`}
              isStaffView={canEdit}
              variant="stacked"
            >
              <p className="pr-8 text-sm">
                <MathText>{p.statementText ?? ""}</MathText>
              </p>
            </ProblemFigure>

            {/* Сонголтууд — өмнө нь ФАЙЛД ОГТ ХАРУУЛДАГГҮЙ байсан (choiceOptions
                API-д ирж байсан ч render хийгээгүй) — одоо бүх сурагчид харна.
                Зөв хариуны тэмдэг зөвхөн багш ролид (canEdit) ба backend-ээс
                isCorrect ирсэн үед л гарна. */}
            {p.format === "CHOICE" && displayChoicesOf(p).length > 0 && (
              // Зөв хариу: зөвхөн ногоон хайрцгаар (багш) — нэмэлт «Зөв»/«Хариу» тэмдэггүй
              <ChoiceGrid choices={displayChoicesOf(p)} showCorrect={!!canEdit} />
            )}

            {/* Доод мөр: зүүн талд төрөл · оноо (бүдэг бичвэр), баруун талд дүрс товчнууд.
                Код нэг л (HG1-2A-02 г.м.) — «#» дарж харна; урт ӨС-ийн ID харуулахгүй. */}
            <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs text-ink-dim">
              <Meta items={[FORMAT_LABEL[p.format] ?? p.format, `${p.points} оноо`]} />
              {/* Сонгох бодлогод зөв хариу ногоон хайрцгаар тодорно; бусад төрөлд энд */}
              {p.format !== "CHOICE" && p.correctAnswer !== undefined && (
                <span className="ml-2 rounded-lg bg-success/15 px-2 py-0.5 text-success ring-1 ring-success/40">
                  <MathText>{formatAnswer(p.correctAnswer)}</MathText>
                </span>
              )}
              {/* Гурван дүрс НЭГ бүлэг: баруун доод талд хамт, багтахгүй бол гурвуулаа дараагийн мөрөнд */}
              <span className="ml-auto flex shrink-0 items-center gap-1">
                {/* Эзний дүрэм: сурагч бодлогын код огт харахгүй — зөвхөн ажилтан */}
                {canEdit && <CodeReveal code={p.token} />}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit?.(p.id)}
                    aria-label="Ангилал засах"
                    title="Ангилал засах"
                    className={ICON_BTN}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setVideoFor((id) => (id === p.id ? null : p.id))}
                  aria-label="Бичлэгээр тайлбар"
                  aria-expanded={videoFor === p.id}
                  title="Бичлэгээр тайлбар"
                  className={ICON_BTN}
                >
                  <Video className="h-4 w-4" aria-hidden />
                </button>
              </span>
            </div>
            {videoFor === p.id && (
              <div className="mt-2">
                <ProblemVideoDisclosure problemId={p.id} autoOpen onClose={() => setVideoFor(null)} />
              </div>
            )}
            {p.analysis && <ProblemAnalysisDetails analysis={p.analysis} />}
          </div>
        </div>
      ))}
      {previewFor && (
        <StudentViewModal
          statementText={previewFor.statementText}
          imageKey={previewFor.imageKey}
          format={previewFor.format}
          points={previewFor.points}
          choices={displayChoicesOf(previewFor)}
          onClose={() => setPreviewFor(null)}
        />
      )}
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
