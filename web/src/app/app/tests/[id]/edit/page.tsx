"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { api, getRole, uploadFile } from "@/lib/api";
import RequireRole from "@/components/nav/RequireRole";
import ProblemPicker from "@/components/test-builder/ProblemPicker";
import ProblemPreviewModal from "@/components/test-builder/ProblemPreviewModal";
import SelectedProblemsList, {
  type SelectedItem,
} from "@/components/test-builder/SelectedProblemsList";
import StepHeader from "@/components/test-builder/StepHeader";
import SummaryRail from "@/components/test-builder/SummaryRail";
import DuplicateTestButton from "@/components/test-builder/DuplicateTestButton";
import { hasKnownAnswer, type Problem } from "@/components/test-builder/types";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";

interface Classroom {
  id: string;
  name: string;
  grade?: number | null;
  _count: { enrollments: number };
}

interface Chapter {
  id: string;
  title: string;
  order: number;
  grade?: number | null;
  book?: { code: string; title: string; subject?: string } | null;
  _count: { problems: number; theories: number };
}

interface TestDetails {
  id: string;
  title: string;
  type: string;
  gradingMode: string;
  chapterId: string | null;
  timeLimitMin: number | null;
  groupKey: string | null;
  variantLabel: string | null;
  pdfKey: string | null;
  price: number | null;
  createdById: string;
  chapter?: { book?: { subject?: string | null } | null } | null;
  problems: Array<{
    problemId: string;
    order: number;
    points: number;
    problem: Problem;
  }>;
  access: Array<{ classroomId: string }>;
}

type EditInfo = { mode: "FULL" | "LIMITED"; reason: string };

const TYPES = [
  { value: "DAILY", label: "Өдрийн тест" },
  { value: "CHAPTER_EXAM", label: "Сэдвийн шалгалт" },
  { value: "EESH_MOCK", label: "ЭЕШ сорил" },
  { value: "CUSTOM", label: "Бусад" },
  { value: "THEORY", label: "Онолын тест" },
];

const SUBJECTS = [
  { value: "", label: "Бүх хичээл" },
  { value: "MATH", label: "Математик" },
  { value: "SOCIAL_STUDIES", label: "Нийгмийн ухаан" },
  { value: "SAT", label: "SAT" },
];

function positiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mergeProblems(first: Problem[], second: Problem[]) {
  const byId = new Map<string, Problem>();
  for (const problem of [...first, ...second]) byId.set(problem.id, problem);
  return [...byId.values()];
}

export default function EditTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const role = getRole();
  const isAdmin = role === "ADMIN";
  const [test, setTest] = useState<TestDetails | null>(null);
  const [editInfo, setEditInfo] = useState<EditInfo | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(false);
  const [problemsError, setProblemsError] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("CHAPTER_EXAM");
  const [gradingMode, setGradingMode] = useState("AUTO");
  const [chapterId, setChapterId] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [groupKey, setGroupKey] = useState("");
  const [variantLabel, setVariantLabel] = useState("");
  const [pdfKey, setPdfKey] = useState("");
  const [price, setPrice] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [pointOverrides, setPointOverrides] = useState<Record<string, number>>(
    {},
  );
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [previewProblem, setPreviewProblem] = useState<Problem | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadPage = useCallback(() => {
    setPageLoading(true);
    setPageError("");
    Promise.all([
      api<TestDetails>(`/tests/${id}`),
      api<EditInfo>(`/tests/${id}/edit-info`),
    ])
      .then(([details, info]) => {
        setTest(details);
        setEditInfo(info);
        setTitle(details.title);
        setType(details.type);
        setGradingMode(details.gradingMode);
        setChapterId(details.chapterId ?? "");
        setSubject(details.chapter?.book?.subject ?? "");
        setTimeLimit(details.timeLimitMin?.toString() ?? "");
        setGroupKey(details.groupKey ?? "");
        setVariantLabel(details.variantLabel ?? "");
        setPdfKey(details.pdfKey ?? "");
        setPrice(details.price?.toString() ?? "");
        setSelectedClasses(details.access.map((access) => access.classroomId));
        setSelectedProblems(details.problems.map((item) => item.problemId));
        setPointOverrides(
          Object.fromEntries(
            details.problems.map((item) => [item.problemId, item.points]),
          ),
        );
        setProblems(
          details.problems.map((item) => ({
            ...item.problem,
            points: item.points,
          })),
        );
      })
      .catch((error: unknown) => {
        setPageError(
          error instanceof Error
            ? error.message
            : "Тестийн мэдээлэл ачаалж чадсангүй",
        );
      })
      .finally(() => setPageLoading(false));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) loadPage();
    });
    return () => { cancelled = true; };
  }, [loadPage]);

  const loadCatalog = useCallback(() => {
    if (!test || editInfo?.mode !== "FULL") return;
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError("");
    Promise.all([
      api<Classroom[]>("/classrooms"),
      api<Chapter[]>(`/chapters${subject ? `?subject=${subject}` : ""}`),
    ])
      .then(([classRows, chapterRows]) => {
        if (cancelled) return;
        setClassrooms(classRows);
        setChapters(chapterRows);
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setCatalogError(
            error instanceof Error
              ? error.message
              : "Сонголтын мэдээлэл ачаалж чадсангүй",
          );
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [test, editInfo, subject]);

  useEffect(() => {
    let cancelled = false;
    let cancelRequest: (() => void) | undefined;
    void Promise.resolve().then(() => {
      if (!cancelled) cancelRequest = loadCatalog();
    });
    return () => {
      cancelled = true;
      cancelRequest?.();
    };
  }, [loadCatalog]);

  const loadChapterProblems = useCallback(() => {
    if (!chapterId || editInfo?.mode !== "FULL") {
      setLoadingProblems(false);
      return;
    }
    let cancelled = false;
    setLoadingProblems(true);
    setProblemsError("");
    api<Problem[]>(`/chapters/${chapterId}/problems?take=100`)
      .then((rows) => {
        if (!cancelled) setProblems((current) => mergeProblems(current, rows));
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setProblemsError(
            error instanceof Error ? error.message : "Бодлого ачаалж чадсангүй",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingProblems(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId, editInfo?.mode]);

  useEffect(() => {
    let cancelled = false;
    let cancelRequest: (() => void) | undefined;
    void Promise.resolve().then(() => {
      if (!cancelled) cancelRequest = loadChapterProblems();
    });
    return () => {
      cancelled = true;
      cancelRequest?.();
    };
  }, [loadChapterProblems]);

  const selectedProblemObjects = useMemo(() => {
    const byId = new Map(problems.map((problem) => [problem.id, problem]));
    return selectedProblems
      .map((problemId) => byId.get(problemId))
      .filter(Boolean) as Problem[];
  }, [problems, selectedProblems]);
  const selectedItems: SelectedItem[] = useMemo(
    () =>
      selectedProblemObjects.map((problem) => ({
        problem,
        points: pointOverrides[problem.id] ?? problem.points,
      })),
    [selectedProblemObjects, pointOverrides],
  );
  const choiceCount = selectedProblemObjects.filter(
    (problem) => problem.format === "CHOICE",
  ).length;
  const fillCount = selectedProblemObjects.filter(
    (problem) => problem.format === "FILL_NUMBER",
  ).length;
  const openCount = selectedProblemObjects.filter(
    (problem) => problem.format === "OPEN",
  ).length;
  const totalPoints = selectedItems.reduce((sum, item) => sum + item.points, 0);
  const missingAnswerCount = selectedProblemObjects.filter(
    (problem) => !hasKnownAnswer(problem),
  ).length;
  const reviewNeededCount = selectedProblemObjects.filter(
    (problem) =>
      hasKnownAnswer(problem) &&
      problem.analysis?.answerKeyStatus === "REVIEW_REQUIRED",
  ).length;

  function toggleProblem(problemId: string) {
    setSelectedProblems((current) => {
      if (current.includes(problemId)) {
        setPointOverrides((previous) => {
          const next = { ...previous };
          delete next[problemId];
          return next;
        });
        return current.filter((idValue) => idValue !== problemId);
      }
      return [...current, problemId];
    });
  }

  function moveProblem(problemId: string, direction: -1 | 1) {
    setSelectedProblems((current) => {
      const index = current.indexOf(problemId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length)
        return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function changePoints(problemId: string, pointsValue: number) {
    setPointOverrides((current) => ({ ...current, [problemId]: pointsValue }));
  }

  function toggleClass(classroomId: string) {
    setSelectedClasses((current) =>
      current.includes(classroomId)
        ? current.filter((idValue) => idValue !== classroomId)
        : [...current, classroomId],
    );
  }

  async function handlePdfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    setFormError("");
    try {
      const uploaded = await uploadFile(file);
      setPdfKey(uploaded.key);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Файл байршуулахад алдаа гарлаа",
      );
    } finally {
      setUploadingPdf(false);
      event.target.value = "";
    }
  }

  async function saveChanges() {
    if (!title.trim()) {
      setFormError("Тестийн нэр оруулна уу");
      return;
    }
    if (timeLimit.trim() && positiveInt(timeLimit) === null) {
      setFormError("Хугацааг бүхэл минутаар оруулна уу");
      return;
    }
    if (isAdmin && price.trim() && !/^\d+$/.test(price)) {
      setFormError("Төлбөрийг бүхэл тоогоор оруулна уу");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await api(`/tests/${id}`, {
        method: "PATCH",
        body:
          editInfo?.mode === "LIMITED"
            ? { title: title.trim(), timeLimitMin: positiveInt(timeLimit) }
            : {
                title: title.trim(),
                type,
                gradingMode,
                chapterId: chapterId || null,
                timeLimitMin: positiveInt(timeLimit),
                groupKey: groupKey.trim() || null,
                variantLabel: variantLabel.trim() || null,
                pdfKey: pdfKey.trim() || null,
                ...(isAdmin
                  ? { price: price.trim() ? Number(price) : null }
                  : {}),
                classroomIds: selectedClasses,
                problems: selectedItems.map(({ problem, points }, index) => ({
                  problemId: problem.id,
                  order: index + 1,
                  points,
                })),
              },
      });
      setSaved(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Тест хадгалж чадсангүй",
      );
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "min-h-11 w-full rounded-xl border border-line bg-bg px-4 py-3 text-base text-ink transition focus:border-brand";

  if (pageLoading)
    return (
      <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
        <LoadingState rows={6} label="Тестийн мэдээлэл ачаалж байна" />
      </RequireRole>
    );
  if (pageError || !test || !editInfo)
    return (
      <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
        <ErrorState
          message={pageError || "Тестийн мэдээлэл олдсонгүй"}
          onRetry={loadPage}
        />
      </RequireRole>
    );

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Тест засах</h1>
            <DuplicateTestButton testId={id} />
            <p className="mt-1 text-base text-ink-dim">{test.title}</p>
          </div>
          <Link
            href="/app/tests"
            className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 py-2 text-base transition hover:border-brand"
          >
            Жагсаалт руу буцах
          </Link>
        </header>

        {saved ? (
          <section
            role="status"
            className="rounded-2xl border border-success/30 bg-success/10 p-6"
          >
            <p className="flex items-center gap-2 text-lg font-bold text-success">
              <Check aria-hidden /> Өөрчлөлт амжилттай хадгалагдлаа
            </p>
            <p className="mt-2 text-base text-ink">{title.trim()}</p>
            <Link
              href="/app/tests"
              className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand px-4 py-2 text-base font-bold text-on-brand"
            >
              Тестийн жагсаалт руу очих
            </Link>
          </section>
        ) : (
          <>
            <p className="rounded-xl border border-info/30 bg-info/10 px-4 py-3 text-base text-info">
              {editInfo.reason}
            </p>

            {editInfo.mode === "LIMITED" ? (
              <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                <div>
                  <label
                    htmlFor="test-title"
                    className="mb-1.5 block text-sm text-ink-dim"
                  >
                    Тестийн нэр
                  </label>
                  <input
                    id="test-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="test-time"
                    className="mb-1.5 block text-sm text-ink-dim"
                  >
                    Хугацаа, минут
                  </label>
                  <input
                    id="test-time"
                    inputMode="numeric"
                    value={timeLimit}
                    onChange={(event) => setTimeLimit(event.target.value)}
                    placeholder="Хугацаагүй"
                    className={inputClass}
                  />
                </div>
              </section>
            ) : (
              <>
                {catalogError && (
                  <ErrorState
                    message={catalogError}
                    onRetry={() => {
                      void loadCatalog();
                    }}
                  />
                )}
                <SummaryRail
                  steps={[
                    { label: "Үндсэн мэдээлэл", done: !!title.trim() },
                    {
                      label: "Бодлого сонгох",
                      done: selectedProblems.length > 0,
                    },
                    {
                      label: "Оноо, дараалал",
                      done: selectedProblems.length > 0,
                    },
                    { label: "Хэн үзэх вэ", done: true },
                  ]}
                  choiceCount={choiceCount}
                  fillCount={fillCount}
                  openCount={openCount}
                  totalPoints={totalPoints}
                  timeLimitMin={positiveInt(timeLimit) ?? undefined}
                  testType={type}
                  missingAnswerCount={missingAnswerCount}
                  reviewNeededCount={reviewNeededCount}
                />

                <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                  <StepHeader n={1} title="Үндсэн мэдээлэл" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="test-title"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Тестийн нэр
                      </label>
                      <input
                        id="test-title"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="test-type"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Төрөл
                      </label>
                      <select
                        id="test-type"
                        value={type}
                        onChange={(event) => setType(event.target.value)}
                        className={inputClass}
                      >
                        {TYPES.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="test-grading"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Дүгнэх горим
                      </label>
                      <select
                        id="test-grading"
                        value={gradingMode}
                        onChange={(event) => setGradingMode(event.target.value)}
                        className={inputClass}
                      >
                        <option value="AUTO">Авто дүн</option>
                        <option value="MANUAL">Багшийн дүн</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="test-subject"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Хичээл
                      </label>
                      <select
                        id="test-subject"
                        value={subject}
                        onChange={(event) => {
                          setSubject(event.target.value);
                          setChapterId("");
                        }}
                        className={inputClass}
                      >
                        {SUBJECTS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="test-chapter"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Бүлэг сэдэв
                      </label>
                      <select
                        id="test-chapter"
                        value={chapterId}
                        onChange={(event) => setChapterId(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">Бүлэг сонгохгүй</option>
                        {chapters.map((chapter) => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapter.book?.code
                              ? `${chapter.book.code} — `
                              : ""}
                            {chapter.title}
                            {chapter.grade ? ` — ${chapter.grade}-р анги` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="test-time"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Хугацаа, минут
                      </label>
                      <input
                        id="test-time"
                        inputMode="numeric"
                        value={timeLimit}
                        onChange={(event) => setTimeLimit(event.target.value)}
                        placeholder="Хугацаагүй"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="test-group"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Хувилбарын бүлэг
                      </label>
                      <input
                        id="test-group"
                        value={groupKey}
                        onChange={(event) => setGroupKey(event.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="test-variant"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        Хувилбар
                      </label>
                      <input
                        id="test-variant"
                        value={variantLabel}
                        onChange={(event) =>
                          setVariantLabel(event.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    {isAdmin && (
                      <div>
                        <label
                          htmlFor="test-price"
                          className="mb-1.5 block text-sm text-ink-dim"
                        >
                          Төлбөр
                        </label>
                        <input
                          id="test-price"
                          inputMode="numeric"
                          value={price}
                          onChange={(event) => setPrice(event.target.value)}
                          className={inputClass}
                        />
                      </div>
                    )}
                    <div className="md:col-span-2">
                      <label
                        htmlFor="test-pdf"
                        className="mb-1.5 block text-sm text-ink-dim"
                      >
                        PDF/эх сурвалжийн key
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <input
                          id="test-pdf"
                          value={pdfKey}
                          onChange={(event) => setPdfKey(event.target.value)}
                          className={`${inputClass} min-w-0 flex-1`}
                        />
                        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-line px-4 py-2 text-base hover:border-brand">
                          {uploadingPdf ? "Байршуулж байна" : "Файл сонгох"}
                          <input
                            type="file"
                            accept="application/pdf"
                            disabled={uploadingPdf}
                            onChange={handlePdfUpload}
                            className="sr-only"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                  <StepHeader
                    n={2}
                    title="Бодлого сонгох"
                    hint={`Одоогоор ${selectedProblems.length} бодлого сонгосон.`}
                  />
                  {problemsError ? (
                    <ErrorState
                      message={problemsError}
                      onRetry={loadChapterProblems}
                    />
                  ) : (
                    <ProblemPicker
                      problems={problems}
                      loading={loadingProblems}
                      error=""
                      chapterChosen={!!chapterId}
                      selectedIds={selectedProblems}
                      onToggle={toggleProblem}
                      onPreview={setPreviewProblem}
                      onSelectFirst={(count) =>
                        setSelectedProblems(
                          problems.slice(0, count).map((problem) => problem.id),
                        )
                      }
                      onClearSelection={() => setSelectedProblems([])}
                    />
                  )}
                </section>

                <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                  <StepHeader
                    n={3}
                    title="Оноо, дараалал"
                    hint="Сонгосон дарааллаар тестэд орно."
                  />
                  <SelectedProblemsList
                    items={selectedItems}
                    onMoveUp={(problemId) => moveProblem(problemId, -1)}
                    onMoveDown={(problemId) => moveProblem(problemId, 1)}
                    onRemove={toggleProblem}
                    onPointsChange={changePoints}
                    onBulkSetPoints={(pointsValue) =>
                      setPointOverrides((current) =>
                        Object.fromEntries(
                          selectedProblems
                            .map((problemId) => [problemId, pointsValue])
                            .concat(
                              Object.entries(current).filter(
                                ([problemId]) =>
                                  !selectedProblems.includes(problemId),
                              ),
                            ),
                        ),
                      )
                    }
                    onPreview={setPreviewProblem}
                  />
                </section>

                <section className="space-y-3 rounded-2xl border border-line bg-surface p-5 sm:p-6">
                  <StepHeader
                    n={4}
                    title="Хэн үзэх вэ"
                    hint="Сонгосон ангиудад л харагдана."
                  />
                  {catalogLoading ? (
                    <LoadingState rows={2} label="Ангиудыг ачаалж байна" />
                  ) : classrooms.length === 0 ? (
                    <p className="text-base text-ink-dim">
                      Ангийн жагсаалт хоосон байна.
                    </p>
                  ) : (
                    classrooms.map((classroom) => (
                      <label
                        key={classroom.id}
                        className="flex min-h-11 items-center gap-3 rounded-lg border border-line px-3 py-2 text-base text-ink"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(classroom.id)}
                          onChange={() => toggleClass(classroom.id)}
                          className="h-5 w-5 accent-brand"
                        />
                        <span className="min-w-0 flex-1">{classroom.name}</span>
                        <span className="text-sm text-ink-dim">
                          {classroom._count.enrollments} сурагч
                        </span>
                      </label>
                    ))
                  )}
                  {missingAnswerCount > 0 && (
                    <p
                      role="status"
                      className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
                    >
                      <TriangleAlert
                        className="mr-1 inline h-4 w-4"
                        aria-hidden
                      />
                      {missingAnswerCount} бодлогод хариуны түлхүүр алга.
                    </p>
                  )}
                </section>
              </>
            )}

            {formError && (
              <p
                role="alert"
                className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-base text-error"
              >
                {formError}
              </p>
            )}
            <button
              type="button"
              onClick={saveChanges}
              disabled={saving || uploadingPdf}
              aria-busy={saving}
              className="min-h-12 w-full rounded-xl bg-brand px-5 py-3 text-lg font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Хадгалж байна" : "Өөрчлөлтийг хадгалах"}
            </button>
          </>
        )}
        {previewProblem && (
          <ProblemPreviewModal
            problem={previewProblem}
            points={pointOverrides[previewProblem.id] ?? previewProblem.points}
            onClose={() => setPreviewProblem(null)}
          />
        )}
      </div>
    </RequireRole>
  );
}
