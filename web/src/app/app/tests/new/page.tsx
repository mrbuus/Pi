"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { api, uploadFile } from "@/lib/api";
import RequireRole from "@/components/nav/RequireRole";
import ProblemPicker from "@/components/test-builder/ProblemPicker";
import ProblemPreviewModal from "@/components/test-builder/ProblemPreviewModal";
import SelectedProblemsList, {
  type SelectedItem,
} from "@/components/test-builder/SelectedProblemsList";
import StepHeader from "@/components/test-builder/StepHeader";
import SummaryRail from "@/components/test-builder/SummaryRail";
import { eeshPointFor, hasKnownAnswer, type Problem } from "@/components/test-builder/types";

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
  book?: { code: string; title: string } | null;
  _count: { problems: number; theories: number };
}

const TYPES = [
  { value: "DAILY", label: "Өдрийн тест" },
  { value: "CHAPTER_EXAM", label: "Сэдвийн шалгалт" },
  { value: "EESH_MOCK", label: "ЭЕШ сорил" },
  { value: "CUSTOM", label: "Бусад" },
];

// Ном одоо хичээлтэй (Subject) холбогддог тул шинэ тест үүсгэхэд эхлээд
// хичээлээ сонгоод, дараа нь тухайн хичээлийн бүлэг сэдвүүдээс сонгоно.
const SUBJECTS = [
  { value: "", label: "Бүх хичээл" },
  { value: "MATH", label: "Математик" },
  { value: "SOCIAL_STUDIES", label: "Нийгмийн ухаан" },
];

function parsePositiveInt(value: string): number | undefined {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

const UNSAVED_WARNING = "Хадгалаагүй өөрчлөлт байна — энэ хуудаснаас гарах уу?";

export default function NewTestPage() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [catalogError, setCatalogError] = useState("");

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("CHAPTER_EXAM");
  const [gradingMode, setGradingMode] = useState("AUTO");
  const [chapterId, setChapterId] = useState("");
  const [timeLimit, setTimeLimit] = useState("100");
  const [groupKey, setGroupKey] = useState("");
  const [variantLabel, setVariantLabel] = useState("A");
  const [pdfKey, setPdfKey] = useState("");
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  // Тестэд орох бодлого бүрийн явцуу оноо-ий override — бодлогын өөрийн
  // points талбарыг өөрчлөхгүйгээр зөвхөн энэ тестэд хэрэглэнэ (36+4 загвар
  // болон Алхам 3-ийн гар засвар хоёулаа энд бичигдэнэ).
  const [pointOverrides, setPointOverrides] = useState<Record<string, number>>({});
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [loadingProblems, setLoadingProblems] = useState(false);
  const [problemsError, setProblemsError] = useState("");
  const [templateNotice, setTemplateNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdTest, setCreatedTest] = useState<{ id: string; title: string } | null>(null);
  const [previewProblem, setPreviewProblem] = useState<Problem | null>(null);
  // Тест амжилттай үүссэний дараа сервер буцаасан хариу-түлхүүрийн
  // анхааруулга (API-ийн guard-аас, Fix 1a) — үүсгэх алхмын анхааруулгаас
  // тусдаа, учир нь энэ нь ЖИНХЭНЭ ангид оноогдсоны дараах баталгаа.
  const [createdAnswerWarning, setCreatedAnswerWarning] = useState("");

  useEffect(() => {
    api<Classroom[]>("/classrooms")
      .then(setClassrooms)
      .catch((e) => {
        setCatalogError(e instanceof Error ? e.message : "Анги ачаалахад алдаа гарлаа");
      });
  }, []);

  useEffect(() => {
    api<Chapter[]>(`/chapters${subject ? `?subject=${subject}` : ""}`)
      .then(setChapters)
      .catch((e) => {
        setChapters([]);
        setCatalogError(e instanceof Error ? e.message : "Бүлэг сэдэв ачаалахад алдаа гарлаа");
      });
  }, [subject]);

  // Бүлэг сэдэв солигдох бүрт бодлогуудыг дахин ачаална — spinner ЖИНХЭНЭ
  // ачаалалтай синхрон. chapterId хоосон болоход (сонголтоо цуцлахад)
  // холбогдох state-үүдийг цэвэрлэнэ — энэ бол гадаад эх сурвалж (сервер)-тай
  // синхрончлол биш, зөвхөн нэг талбарын утгаас хамааран бусад state-ийг
  // деривейт хийж байгаа тул синхрон setState зайлшгүй.
  useEffect(() => {
    if (!chapterId) {
      // chapterId хоосон болоход хамааралтай state-үүдийг нэг дор цэвэрлэх
      // зорилготой деривейшн — гадаад системтэй холбоотой side-effect биш.
      /* eslint-disable react-hooks/set-state-in-effect */
      setProblems([]);
      setSelectedProblems([]);
      setPointOverrides({});
      setLoadingProblems(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    setLoadingProblems(true);
    setProblemsError("");
    api<Problem[]>(`/chapters/${chapterId}/problems?take=100`)
      .then((rows) => {
        if (cancelled) return;
        setProblems(rows);
        setSelectedProblems([]);
        setPointOverrides({});
      })
      .catch((e) => {
        if (cancelled) return;
        setProblems([]);
        setProblemsError(e instanceof Error ? e.message : "Бодлого ачаалахад алдаа гарлаа");
      })
      .finally(() => {
        if (!cancelled) setLoadingProblems(false);
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  const selectedProblemObjects = useMemo(() => {
    const byId = new Map(problems.map((p) => [p.id, p]));
    return selectedProblems.map((id) => byId.get(id)).filter(Boolean) as Problem[];
  }, [problems, selectedProblems]);

  const selectedItems: SelectedItem[] = useMemo(
    () =>
      selectedProblemObjects.map((problem) => ({
        problem,
        points: pointOverrides[problem.id] ?? problem.points,
      })),
    [selectedProblemObjects, pointOverrides],
  );

  const choiceCount = selectedProblemObjects.filter((p) => p.format === "CHOICE").length;
  const fillCount = selectedProblemObjects.filter((p) => p.format === "FILL_NUMBER").length;
  const openCount = selectedProblemObjects.filter((p) => p.format === "OPEN").length;
  const totalPoints = selectedItems.reduce((sum, it) => sum + it.points, 0);
  const missingAnswerCount = selectedProblemObjects.filter((p) => !hasKnownAnswer(p)).length;
  const reviewNeededCount = selectedProblemObjects.filter(
    (p) => hasKnownAnswer(p) && p.analysis?.answerKeyStatus === "REVIEW_REQUIRED",
  ).length;

  const step1Done = title.trim() !== "";
  const step2Done = selectedProblems.length > 0;
  const step4Done = selectedClasses.length > 0;

  // Хадгалаагүй ажил байгаа эсэх — амжилттай үүссэний дараа (createdTest) энэ
  // байхгүй, тестийг АЛЬ ХЭДИЙ ЭЭ хадгалсан тул анхааруулах шаардлагагүй.
  const hasUnsavedWork =
    !createdTest && (title.trim() !== "" || selectedProblems.length > 0 || selectedClasses.length > 0);

  // Табыг хаах/refresh хийхэд хадгалаагүй ажлыг алдахаас сэргийлнэ.
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!hasUnsavedWork) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedWork]);

  function guardNavigation(e: React.MouseEvent) {
    if (hasUnsavedWork && !window.confirm(UNSAVED_WARNING)) {
      e.preventDefault();
    }
  }

  function toggleClass(id: string) {
    setSelectedClasses((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
    );
  }

  function toggleProblem(id: string) {
    setSelectedProblems((items) => {
      if (items.includes(id)) {
        // Хасахад тухайн бодлогын оноо override-ыг цэвэрлэнэ — дахин
        // сонгоход бодлогын өөрийн стандарт оноогоор эхэлнэ
        setPointOverrides((prev) => {
          if (!(id in prev)) return prev;
          const next = { ...prev };
          delete next[id];
          return next;
        });
        return items.filter((x) => x !== id);
      }
      return [...items, id];
    });
  }

  function selectFirst(n: number) {
    setSelectedProblems(problems.slice(0, n).map((p) => p.id));
    setPointOverrides({});
  }

  function clearSelection() {
    setSelectedProblems([]);
    setPointOverrides({});
  }

  function moveUp(id: string) {
    setSelectedProblems((items) => {
      const i = items.indexOf(id);
      if (i <= 0) return items;
      const next = [...items];
      [next[i - 1], next[i]] = [next[i], next[i - 1]];
      return next;
    });
  }

  function moveDown(id: string) {
    setSelectedProblems((items) => {
      const i = items.indexOf(id);
      if (i === -1 || i >= items.length - 1) return items;
      const next = [...items];
      [next[i + 1], next[i]] = [next[i], next[i + 1]];
      return next;
    });
  }

  function setPointsFor(id: string, points: number) {
    setPointOverrides((prev) => ({ ...prev, [id]: points }));
  }

  function bulkSetPoints(points: number) {
    setPointOverrides((prev) => {
      const next = { ...prev };
      for (const id of selectedProblems) next[id] = points;
      return next;
    });
  }

  // "36+4 загвар" — ЭЕШ-ийн бодит бүтэц: I хэсэг 36 СОНГОХ бодлого (SPEC §II:
  // №1–12 ≈ 1 оноо, №13–28 ≈ 2 оноо, №29–36 ≈ 3 оноо), II хэсэг 4 НӨХӨХ
  // бодлого. Одоо сонгосон бүлгийн бодлогуудаас форматаар нь шүүж бодитоор
  // сонгоод дараалал+оноог автоматаар тавина.
  function applyEeshTemplate() {
    setTemplateNotice("");
    if (!chapterId) {
      setTemplateNotice("Эхлээд бүлэг сэдэв сонгож бодлогуудыг ачаална уу");
      return;
    }
    if (loadingProblems) {
      setTemplateNotice("Бодлогууд ачаалж дуустал түр хүлээнэ үү");
      return;
    }
    const choiceIds = problems.filter((p) => p.format === "CHOICE").map((p) => p.id);
    const fillIds = problems.filter((p) => p.format === "FILL_NUMBER").map((p) => p.id);
    const pickedChoice = choiceIds.slice(0, 36);
    const pickedFill = fillIds.slice(0, 4);

    if (pickedChoice.length === 0 && pickedFill.length === 0) {
      setTemplateNotice(
        "Энэ бүлэгт Сонгох/Нөхөх төрлийн бодлого олдсонгүй — 36+4 бүтэц үүсгэх боломжгүй",
      );
      return;
    }

    setType("CHAPTER_EXAM");
    setGradingMode("AUTO");
    setTimeLimit("100");
    if (!title.trim()) setTitle("36+4 сэдвийн шалгалт");
    if (!variantLabel.trim()) setVariantLabel("A");

    const overrides: Record<string, number> = {};
    pickedChoice.forEach((id, i) => {
      overrides[id] = eeshPointFor(i);
    });
    setPointOverrides(overrides);
    setSelectedProblems([...pickedChoice, ...pickedFill]);

    if (pickedChoice.length < 36 || pickedFill.length < 4) {
      setTemplateNotice(
        `Энэ бүлэгт ${pickedChoice.length}/36 сонгох, ${pickedFill.length}/4 нөхөх бодлого байгаа тул боломжит бүгдийг сонгов`,
      );
    }
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPdf(true);
    setFormError("");
    try {
      const res = await uploadFile(file);
      setPdfKey(res.key);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Файл байршуулахад алдаа гарлаа");
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  }

  const titleMissing = attemptedSubmit && !title.trim();
  const classesMissing = attemptedSubmit && selectedClasses.length === 0;

  async function createTest() {
    setFormError("");
    setAttemptedSubmit(true);
    const missing: string[] = [];
    if (!title.trim()) missing.push("Тестийн нэр");
    if (selectedClasses.length === 0) missing.push("Харагдах анги");
    if (missing.length > 0) {
      setFormError(`Дараах талбарууд дутуу байна: ${missing.join(", ")}`);
      return;
    }
    // Ангид шууд оноож байгаа бөгөөд СОНГОСОН БҮХ бодлого хариугүй бол
    // сервер рүү явуулахын ч хэрэггүй — тест 0/0 болж сурагчид будлиантай
    // тул энд шууд зогсооно (API-ийн guard-тай ижил дүрэм, Fix 1).
    if (
      selectedClasses.length > 0 &&
      selectedProblemObjects.length > 0 &&
      missingAnswerCount === selectedProblemObjects.length
    ) {
      setFormError(
        `Сонгосон бүх ${missingAnswerCount} бодлого хариуны түлхүүргүй тул автоматаар дүгнэх боломжгүй — ангид оноох боломжгүй. Эхлээд наад зах нь нэг бодлогод хариу нэмнэ үү.`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const created = await api<{
        id: string;
        answerWarning?: { withoutAnswerCount: number; totalProblems: number; message: string };
      }>("/tests", {
        method: "POST",
        body: {
          title: title.trim(),
          type,
          gradingMode,
          ...(chapterId ? { chapterId } : {}),
          ...(parsePositiveInt(timeLimit)
            ? { timeLimitMin: parsePositiveInt(timeLimit) }
            : {}),
          ...(groupKey.trim() ? { groupKey: groupKey.trim() } : {}),
          ...(variantLabel.trim() ? { variantLabel: variantLabel.trim() } : {}),
          ...(pdfKey.trim() ? { pdfKey: pdfKey.trim() } : {}),
          classroomIds: selectedClasses,
          problems: selectedItems.map(({ problem, points }, index) => ({
            problemId: problem.id,
            order: index + 1,
            points,
          })),
        },
      });
      setCreatedAnswerWarning(created.answerWarning?.message ?? "");
      setCreatedTest({ id: created.id, title: title.trim() });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSubject("");
    setTitle("");
    setType("CHAPTER_EXAM");
    setGradingMode("AUTO");
    setChapterId("");
    setTimeLimit("100");
    setGroupKey("");
    setVariantLabel("A");
    setPdfKey("");
    setSelectedProblems([]);
    setPointOverrides({});
    setSelectedClasses([]);
    setTemplateNotice("");
    setFormError("");
    setAttemptedSubmit(false);
    setCreatedTest(null);
    setCreatedAnswerWarning("");
  }

  const inputCls =
    "w-full min-h-11 rounded-xl border bg-bg px-4 py-3 text-base text-ink outline-none transition focus:border-brand";

  if (createdTest) {
    return (
      <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-success/30 bg-success/10 p-6">
          <p className="inline-flex items-center gap-1.5 text-lg font-bold text-success">
            <Check className="h-5 w-5" aria-hidden /> «{createdTest.title}» тест амжилттай үүслээ
          </p>
          <p className="mt-1 text-base text-ink-dim">
            Доор тестээ шууд харах эсвэл жагсаалт руу очиж болно.
          </p>
          {createdAnswerWarning && (
            <p
              role="alert"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-base text-warning"
            >
              <TriangleAlert className="h-5 w-5" aria-hidden /> {createdAnswerWarning}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/app/tests/${createdTest.id}`}
              className="min-h-11 rounded-lg bg-brand px-4 py-2.5 text-base font-bold text-on-brand transition hover:opacity-90"
            >
              Тестийг харах
            </Link>
            <Link
              href="/app/tests"
              className="min-h-11 rounded-lg border border-line px-4 py-2.5 text-base transition hover:border-brand"
            >
              Тестийн жагсаалт руу очих
            </Link>
            <button
              type="button"
              onClick={resetForm}
              className="min-h-11 rounded-lg border border-line px-4 py-2.5 text-base transition hover:border-brand"
            >
              Шинэ тест үүсгэх
            </button>
          </div>
        </div>
      </div>
      </RequireRole>
    );
  }

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Тест үүсгэх</h1>
          <p className="mt-1 text-base text-ink-dim">
            Тест аль ангид харагдахыг заавал сонгоно.
          </p>
        </div>
        <Link
          href="/app/tests"
          onClick={guardNavigation}
          className="min-h-11 rounded-lg border border-line px-4 py-2 text-base transition hover:border-brand"
        >
          Буцах
        </Link>
      </div>

      {catalogError && (
        <div
          role="alert"
          className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-base text-error"
        >
          {catalogError}
        </div>
      )}

      <SummaryRail
        steps={[
          { label: "Үндсэн мэдээлэл", done: step1Done },
          { label: "Бодлого сонгох", done: step2Done },
          { label: "Оноо, дараалал", done: step2Done },
          { label: "Хэн үзэх вэ", done: step4Done },
        ]}
        choiceCount={choiceCount}
        fillCount={fillCount}
        openCount={openCount}
        totalPoints={totalPoints}
        timeLimitMin={parsePositiveInt(timeLimit)}
        testType={type}
        missingAnswerCount={missingAnswerCount}
        reviewNeededCount={reviewNeededCount}
      />

      <section className="rounded-2xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepHeader n={1} title="Үндсэн мэдээлэл" />
          <button
            onClick={applyEeshTemplate}
            type="button"
            className="min-h-11 rounded-lg border border-brand-bright/40 px-3 py-1.5 text-base font-bold text-brand-soft transition hover:bg-brand-bright/10"
          >
            36+4 загвар ашиглах
          </button>
        </div>
        {templateNotice && (
          <p
            role="status"
            className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-base text-warning"
          >
            {templateNotice}
          </p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="test-title" className="mb-1.5 block text-sm text-ink-dim">
              Тестийн нэр
            </label>
            <input
              id="test-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ж: Илтгэгч тэгшитгэл 1"
              aria-invalid={titleMissing}
              aria-describedby={titleMissing ? "test-title-error" : undefined}
              className={`${inputCls} ${titleMissing ? "border-error" : "border-line"}`}
            />
            {titleMissing && (
              <p id="test-title-error" role="alert" className="mt-1.5 text-sm text-error">
                Тестийн нэр оруулна уу
              </p>
            )}
          </div>

          <div>
            <label htmlFor="test-type" className="mb-1.5 block text-sm text-ink-dim">
              Төрөл
            </label>
            <select
              id="test-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={`${inputCls} border-line`}
            >
              {TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="test-grading" className="mb-1.5 block text-sm text-ink-dim">
              Дүгнэх горим
            </label>
            <select
              id="test-grading"
              value={gradingMode}
              onChange={(e) => setGradingMode(e.target.value)}
              className={`${inputCls} border-line`}
            >
              <option value="AUTO">Авто дүн (зөв хариу баталгаатай)</option>
              <option value="MANUAL">Багшийн дүн (PDF/эх сурвалж, хариу баталгаажуулна)</option>
            </select>
          </div>

          <div>
            <label htmlFor="test-subject" className="mb-1.5 block text-sm text-ink-dim">
              Хичээл
            </label>
            <select
              id="test-subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setChapterId("");
              }}
              className={`${inputCls} border-line`}
            >
              {SUBJECTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="test-chapter" className="mb-1.5 block text-sm text-ink-dim">
              Бүлэг сэдэв
            </label>
            <select
              id="test-chapter"
              value={chapterId}
              onChange={(e) => setChapterId(e.target.value)}
              className={`${inputCls} border-line`}
            >
              <option value="">Бүлэг сэдэв сонгохгүй</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.book?.code ? `${chapter.book.code} · ` : ""}
                  {chapter.title}
                  {chapter.grade ? ` · ${chapter.grade}-р анги` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="test-timelimit" className="mb-1.5 block text-sm text-ink-dim">
              Хугацаа (минут)
            </label>
            <input
              id="test-timelimit"
              value={timeLimit}
              onChange={(e) => setTimeLimit(e.target.value)}
              inputMode="numeric"
              placeholder="ж: 100"
              className={`${inputCls} border-line`}
            />
          </div>

          <div>
            <label htmlFor="test-groupkey" className="mb-1.5 block text-sm text-ink-dim">
              Хувилбарын бүлэг (groupKey)
            </label>
            <input
              id="test-groupkey"
              value={groupKey}
              onChange={(e) => setGroupKey(e.target.value)}
              placeholder="ж: Тест 18"
              className={`${inputCls} border-line`}
            />
          </div>

          <div>
            <label htmlFor="test-variant" className="mb-1.5 block text-sm text-ink-dim">
              Хувилбар (A/B)
            </label>
            <input
              id="test-variant"
              value={variantLabel}
              onChange={(e) => setVariantLabel(e.target.value)}
              placeholder="A"
              className={`${inputCls} border-line`}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="test-pdfkey" className="mb-1.5 block text-sm text-ink-dim">
              PDF/эх сурвалжийн key
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="test-pdfkey"
                value={pdfKey}
                onChange={(e) => setPdfKey(e.target.value)}
                placeholder="Файл байршуулбал автоматаар бөглөгдөнө"
                className={`${inputCls} flex-1 border-line`}
              />
              <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-xl border border-line px-4 py-3 text-base transition hover:border-brand">
                {uploadingPdf ? "Байршуулж байна…" : "Файл сонгох"}
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

      <section className="rounded-2xl border border-line bg-surface p-6">
        <StepHeader
          n={2}
          title="Бодлого сонгох"
          hint={`Одоогоор ${selectedProblems.length} бодлого сонгосон.`}
        />
        <ProblemPicker
          problems={problems}
          loading={loadingProblems}
          error={problemsError}
          chapterChosen={!!chapterId}
          selectedIds={selectedProblems}
          onToggle={toggleProblem}
          onPreview={setPreviewProblem}
          onSelectFirst={selectFirst}
          onClearSelection={clearSelection}
        />
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6">
        <StepHeader
          n={3}
          title="Оноо, дараалал"
          hint="Сонгосон дарааллаар тестэд орно — дээш/доош товчоор өөрчилнө."
        />
        <SelectedProblemsList
          items={selectedItems}
          onMoveUp={moveUp}
          onMoveDown={moveDown}
          onRemove={toggleProblem}
          onPointsChange={setPointsFor}
          onBulkSetPoints={bulkSetPoints}
          onPreview={setPreviewProblem}
        />
      </section>

      <section
        className={`rounded-2xl border bg-surface p-6 ${classesMissing ? "border-error/50" : "border-line"}`}
      >
        <StepHeader n={4} title="Хэн үзэх вэ" hint="Тест аль ангид харагдахыг сонгоно." />
        {missingAnswerCount > 0 && selectedProblemObjects.length > 0 && (
          <p
            role="alert"
            className={`mb-3 rounded-lg border px-3 py-2 text-sm font-semibold ${
              missingAnswerCount === selectedProblemObjects.length
                ? "border-error/40 bg-error/10 text-error"
                : "border-warning/30 bg-warning/10 text-warning"
            }`}
          >
            {missingAnswerCount === selectedProblemObjects.length
              ? <><TriangleAlert className="h-4 w-4 inline" aria-hidden /> Сонгосон бүх {missingAnswerCount} бодлого хариуны түлхүүргүй тул энэ тестийг ангид оноох боломжгүй.</>
              : <><TriangleAlert className="h-4 w-4 inline" aria-hidden /> {missingAnswerCount} бодлого хариуны түлхүүргүй тул дүнд тооцогдохгүй.</>}
          </p>
        )}
        {classrooms.length === 0 && !catalogError && (
          <p className="text-base text-ink-dim">Анги үүсгээгүй байна</p>
        )}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((c) => {
            const selected = selectedClasses.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleClass(c.id)}
                aria-pressed={selected}
                className={`min-h-11 rounded-xl border px-4 py-3 text-left transition ${
                  selected
                    ? "border-brand-bright bg-brand-bright/15"
                    : "border-line hover:border-brand"
                }`}
              >
                <p className="font-semibold text-ink">{c.name}</p>
                <p className="mt-1 text-sm text-ink-dim">
                  {c._count.enrollments} сурагч
                  {c.grade ? ` · ${c.grade}-р анги` : ""}
                </p>
              </button>
            );
          })}
        </div>
        {classesMissing && (
          <p role="alert" className="mt-3 text-base text-error">
            Дор хаяж нэг анги сонгоно уу
          </p>
        )}
      </section>

      {formError && (
        <p
          role="alert"
          className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-base text-error"
        >
          {formError}
        </p>
      )}
      <button
        onClick={createTest}
        disabled={submitting}
        aria-busy={submitting}
        className="w-full min-h-11 rounded-xl bg-brand py-4 text-lg font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Үүсгэж байна…" : "Тест үүсгэх"}
      </button>

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
