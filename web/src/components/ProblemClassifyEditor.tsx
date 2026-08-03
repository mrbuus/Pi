"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Pencil, AlertTriangle, Circle } from "lucide-react";
import MathText from "@/components/MathText";
import { api, fileUrl, uploadFile } from "@/lib/api";

/**
 * Багш/Багш+/Админ бодлогын АНГИЛАЛ + СОНГОЛТ + алдааны шалтгааныг ГАРААР засна.
 *
 * Зарчим (SPEC §7.2, §9): AI/импорт автоматаар ангилдаггүй — багш өөрөө сонгож
 * баталгаажуулна. Backend: /classification/* (роль ADMIN/TEACHER_PLUS/TEACHER).
 *
 *   - Сонголт (A–E): текст + аль нь ЗӨВ + буруу бол ЯАГААД алдсан (mistakeType)
 *   - Ангилал (SOLUTION_TYPE tag): "Дискриминантаар бодох" гэх мэт бодогдох төрөл
 *     · нэр солих нь REFERENCED tul бүх холбоотой бодлогод автоматаар тусна
 *
 * Дүгнэлт/аналитик давхарга — тестийн грейдинг Problem.correctAnswer-ээр явдаг
 * тул энд засвар хийхэд одоо байгаа дүн/attempt эвдрэхгүй.
 */

// Буруу хариултын шалтгаан — schema MistakeType-тэй ЯГ тааруулав.
// NONE нь зөв хариултынх тул энд оруулахгүй.
const MISTAKE_TYPES: { value: string; label: string; hint: string }[] = [
  { value: "INCOMPLETE_STEP", label: "Үйлдэл дутуу", hint: "хагас хийж зогссон" },
  { value: "CALC_ERROR_NEAR", label: "Ойролцоо хариу", hint: "энгийн тооцооллын алдаа, ойролцоо дугуйлсан" },
  { value: "SIGN_ERROR", label: "Тэмдэг (+/−)", hint: "тэмдэг сольж алдсан" },
  { value: "CONCEPT_GAP", label: "Ухагдахуун", hint: "арга/ойлголт дутуугаас" },
  { value: "UNRELATED_GUESS", label: "Буудсан", hint: "огт хамааралгүй хариу" },
  { value: "OTHER", label: "Бусад", hint: "тайлбар бичнэ" },
];

// Ангилал (classify) ба агуулга (content) tab-ийн сонголтын жагсаалт хоёулаа
// хуваалцах ерөнхий хэлбэр — <ChoiceListEditor>, validateChoiceList хоёулаа
// үүгээр дамжуулна.
interface EditableChoiceBase {
  label?: string;
  text: string;
  isCorrect: boolean;
}

interface Choice extends EditableChoiceBase {
  id?: string;
  label: string;
  mistakeType?: string;
  mistakeNote?: string;
}
interface Category {
  id: string;
  type: string;
  name: string;
  _count?: { problems: number };
}
interface ProblemEdit {
  id: string;
  token: string;
  format: string;
  statementText?: string;
  imageKey?: string;
  points: number;
  choiceOptions: Choice[];
  tags: { tag: Category }[];
}

// Агуулга засах (PATCH /problems/:id) талын хялбаршуулсан сонголт —
// зөвхөн текст + аль нь зөв (label/mistakeType шаардлагагүй, backend автоматаар үүсгэнэ).
interface ContentChoice extends EditableChoiceBase {
  text: string;
  isCorrect: boolean;
}

// Хадгалахын өмнө өөрчлөгдсөн эсэхийг харьцуулах эх утгууд
interface ContentSnapshot {
  statementText: string;
  imageKey?: string;
  points: number;
  format: string;
  choices: string; // JSON.stringify(ContentChoice[])
}

// Формат бүрийн сонголтын анхны шошго: тоо нөхөх → a,b,c…; сонгох → A,B,C…
function defaultLabel(index: number, format: string): string {
  const lower = "abcdefgh";
  const upper = "ABCDEFGH";
  const set = format === "FILL_NUMBER" ? lower : upper;
  return set[index] ?? String(index + 1);
}

// Сонголтын жагсаалтын хамгийн доод шаардлага — classify (label-тай) болон
// content (label-гүй) tab хоёулаа хуваалцана: OPEN формат бол алгасна;
// доод тал нь 2 сонголт, яг 1 нь зөв, хоосон текст байхгүй; label
// давхцахгүй байхыг зөвхөн label ирсэн үед (getLabel) шалгана.
function validateChoiceList<T extends EditableChoiceBase>(
  choices: T[],
  format: string,
  opts: { treatEmptyAsValid?: boolean; getLabel?: (c: T) => string } = {},
): string {
  if (format === "OPEN") return "";
  if (opts.treatEmptyAsValid && choices.length === 0) return "";
  if (choices.length < 2) return "Дор хаяж 2 сонголт хэрэгтэй";
  const correct = choices.filter((c) => c.isCorrect).length;
  if (correct !== 1) return "Яг 1 сонголтыг зөв гэж тэмдэглэнэ";
  if (choices.some((c) => !c.text.trim())) return "Хоосон сонголт байна";
  if (opts.getLabel) {
    const labels = choices.map((c) => opts.getLabel!(c).trim().toLowerCase());
    if (new Set(labels).size !== labels.length) return "Сонголтын шошго давхцаж байна";
  }
  return "";
}

// ---- Сонголт засах хэсгийн НЭГ л хуваалцсан дэд компонент ----
// Өмнө нь classify tab (patchChoice/markCorrect/addChoice/removeChoice) ба
// content tab (patchCChoice/markCCorrect/addCChoice/removeCChoice) бүрэн
// давхардсан UI+логиктой байсныг энд нэгтгэв. Ялгаа зөвхөн:
//   - showLabelInput: classify-д сонголтын шошго (A/B/C…) засах жижиг талбар бий,
//     content-д алга (backend автоматаар үүсгэнэ)
//   - renderBelow: classify-д буруу сонголт бүрд "яагаад алдсан" (mistakeType)
//     сонголтууд гарна, content-д алга
function ChoiceListEditor<T extends EditableChoiceBase>({
  choices,
  showLabelInput = false,
  onPatch,
  onMarkCorrect,
  onAdd,
  onRemove,
  error,
  renderBelow,
}: {
  choices: T[];
  showLabelInput?: boolean;
  onPatch: (index: number, patch: Partial<T>) => void;
  onMarkCorrect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  error?: string;
  renderBelow?: (choice: T, index: number) => React.ReactNode;
}) {
  return (
    <>
      <div className="space-y-2">
        {choices.map((c, i) => (
          <div
            key={i}
            className={`rounded-xl border p-3 transition ${
              c.isCorrect ? "border-success/40 bg-success/[0.06]" : "border-line bg-ink/[0.02]"
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onMarkCorrect(i)}
                title="Зөв хариу болгох"
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                  c.isCorrect
                    ? "border-success bg-success text-bg"
                    : "border-line text-transparent hover:border-success/60"
                }`}
              >
                {c.isCorrect && <Check className="h-4 w-4" aria-hidden />}
              </button>
              {showLabelInput && (
                <input
                  value={c.label ?? ""}
                  onChange={(e) => onPatch(i, { label: e.target.value } as Partial<T>)}
                  className="w-12 rounded-lg border border-line bg-ink/5 px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-brand-bright"
                />
              )}
              <input
                value={c.text}
                onChange={(e) => onPatch(i, { text: e.target.value } as Partial<T>)}
                placeholder="Сонголтын утга (LaTeX: $x^2$)"
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink/5 px-3 py-1.5 text-sm outline-none focus:border-brand-bright"
              />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-error transition hover:bg-error/10"
              >
                Устгах
              </button>
            </div>

            {/* Урьдчилан харах — LaTeX/зэрэг зөв харагдаж буй эсэх */}
            {c.text.trim() && (
              <p className="mt-1.5 pl-8 text-xs text-ink-dim">
                Харагдац: <MathText>{c.text}</MathText>
              </p>
            )}

            {renderBelow?.(c, i)}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-ink-dim transition hover:border-brand-bright hover:text-brand-soft"
      >
        + Сонголт нэмэх
      </button>
      {error && <p className="mt-2 flex gap-2 text-xs text-warning"><AlertTriangle size={12} className="shrink-0 mt-0.5" aria-hidden="true" /><span>{error}</span></p>}
    </>
  );
}

export default function ProblemClassifyEditor({
  problemId,
  onClose,
  onSaved,
  canEditContent = false,
}: {
  problemId: string;
  onClose: () => void;
  onSaved?: () => void;
  // Агуулга (статемент/сонголт/зөв хариу/зураг/формат/оноо) засах эрх —
  // зөвхөн ADMIN/TEACHER_PLUS. TEACHER-д харагдахгүй (тэд зөвхөн ангилал/tag засна).
  canEditContent?: boolean;
}) {
  const [problem, setProblem] = useState<ProblemEdit | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newCat, setNewCat] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  // ---- Агуулга засах (шинэ tab) ----
  const [tab, setTab] = useState<"classify" | "content">("classify");
  const [cStatement, setCStatement] = useState("");
  const [cImageKey, setCImageKey] = useState<string | undefined>(undefined);
  const [cPoints, setCPoints] = useState(1);
  const [cFormat, setCFormat] = useState("CHOICE");
  const [cChoices, setCChoices] = useState<ContentChoice[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMsg, setContentMsg] = useState("");
  const contentOrigRef = useRef<ContentSnapshot | null>(null);

  const format = problem?.format ?? "CHOICE";

  const loadCategories = useCallback(() => {
    return api<Category[]>("/classification/categories?type=SOLUTION_TYPE")
      .then(setCategories)
      .catch(() => {});
  }, []);

  // Бодлого + ангиллын жагсаалтыг зэрэг ачаална.
  // Анхны state (loading=true, loadError="") тул энд синхрон reset хийхгүй —
  // parent key={problemId}-аар дахин mount хийдэг тул төлөв цэвэр эхэлнэ.
  useEffect(() => {
    let alive = true;
    Promise.all([
      api<ProblemEdit>(`/classification/problems/${problemId}`),
      loadCategories(),
    ])
      .then(([p]) => {
        if (!alive) return;
        setProblem(p);
        // Сонголт байхгүй бол (скан бодлого) хоосон мөрөөр эхлүүлж багш бөглөнө
        if (p.choiceOptions.length > 0) {
          setChoices(
            p.choiceOptions.map((c) => ({
              label: c.label,
              text: c.text,
              isCorrect: c.isCorrect,
              mistakeType: c.isCorrect ? undefined : (c.mistakeType ?? "OTHER"),
              mistakeNote: c.mistakeNote ?? "",
            })),
          );
        } else if (p.format === "OPEN") {
          setChoices([]);
        } else {
          const n = p.format === "FILL_NUMBER" ? 3 : 4;
          setChoices(
            Array.from({ length: n }, (_, i) => ({
              label: defaultLabel(i, p.format),
              text: "",
              isCorrect: i === 0,
              mistakeType: i === 0 ? undefined : "OTHER",
              mistakeNote: "",
            })),
          );
        }
        setSelectedTags(new Set(p.tags.map((t) => t.tag.id)));

        // ---- Агуулга засах tab-ийн анхны утга (мөн адил дата эхийг ашиглана) ----
        setCStatement(p.statementText ?? "");
        setCImageKey(p.imageKey);
        setCPoints(p.points);
        setCFormat(p.format);
        const initialCChoices: ContentChoice[] =
          p.choiceOptions.length > 0
            ? p.choiceOptions.map((c) => ({ text: c.text, isCorrect: c.isCorrect }))
            : p.format === "OPEN"
              ? []
              : Array.from({ length: p.format === "FILL_NUMBER" ? 3 : 4 }, (_, i) => ({
                  text: "",
                  isCorrect: i === 0,
                }));
        setCChoices(initialCChoices);
        contentOrigRef.current = {
          statementText: p.statementText ?? "",
          imageKey: p.imageKey,
          points: p.points,
          format: p.format,
          choices: JSON.stringify(initialCChoices),
        };
      })
      .catch((e) => {
        if (alive)
          setLoadError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [problemId, loadCategories]);

  // ---- Сонголт засах (functional updater — олон дараалсан дарлт алдагдахгүй) ----
  function patchChoice(i: number, patch: Partial<Choice>) {
    setChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  // Яг нэг зөв — radio маягаар бусдыг нь салгана
  function markCorrect(i: number) {
    setChoices((prev) =>
      prev.map((c, idx) => ({
        ...c,
        isCorrect: idx === i,
        mistakeType: idx === i ? undefined : (c.mistakeType ?? "OTHER"),
      })),
    );
  }
  function addChoice() {
    setChoices((prev) => [
      ...prev,
      {
        label: defaultLabel(prev.length, format),
        text: "",
        isCorrect: prev.length === 0,
        mistakeType: prev.length === 0 ? undefined : "OTHER",
        mistakeNote: "",
      },
    ]);
  }
  function removeChoice(i: number) {
    setChoices((prev) => prev.filter((_, idx) => idx !== i));
  }

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Хадгалахын өмнөх шалгалт (backend хоосон/олон зөвийг зогсоохгүй тул энд барина)
  const choiceError = useMemo(
    () =>
      validateChoiceList(choices, format, {
        treatEmptyAsValid: true,
        getLabel: (c) => c.label ?? "",
      }),
    [choices, format],
  );

  async function saveAll() {
    if (choiceError) {
      setMsg(choiceError);
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      // 1) Сонголтууд (задгай бодлогод сонголт байхгүй бол алгасна)
      if (format !== "OPEN" && choices.length > 0) {
        await api(`/classification/problems/${problemId}/choices`, {
          method: "PUT",
          body: {
            choices: choices.map((c) => ({
              label: c.label.trim(),
              text: c.text.trim(),
              isCorrect: c.isCorrect,
              ...(c.isCorrect
                ? {}
                : { mistakeType: c.mistakeType ?? "OTHER" }),
              ...(c.mistakeNote?.trim()
                ? { mistakeNote: c.mistakeNote.trim() }
                : {}),
            })),
          },
        });
      }
      // 2) Ангиллын tag-ууд
      await api(`/classification/problems/${problemId}/tags`, {
        method: "PUT",
        body: { tagIds: [...selectedTags] },
      });
      setMsg("success: Хадгалагдлаа");
      onSaved?.();
      setTimeout(onClose, 700);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  // Шинэ ангилал үүсгэх → үүсмэгц энэ бодлогод сонгоно
  async function createCategory() {
    const name = newCat.trim();
    if (!name) return;
    try {
      const cat = await api<Category>("/classification/categories", {
        method: "POST",
        body: { type: "SOLUTION_TYPE", name },
      });
      setNewCat("");
      await loadCategories();
      setSelectedTags((prev) => new Set(prev).add(cat.id));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Ангилал үүсгэхэд алдаа гарлаа");
    }
  }

  // Ангиллын нэр солих → холбоотой БҮХ бодлогод автоматаар тусна (referenced)
  async function saveRename() {
    if (!renameId || !renameVal.trim()) {
      setRenameId(null);
      return;
    }
    try {
      await api(`/classification/categories/${renameId}`, {
        method: "PATCH",
        body: { name: renameVal.trim() },
      });
      setRenameId(null);
      setRenameVal("");
      await loadCategories();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Нэр солиход алдаа гарлаа");
    }
  }

  // ---- Агуулга засах (statement/choices/imageKey/format/points) ----
  function patchCChoice(i: number, patch: Partial<ContentChoice>) {
    setCChoices((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function markCCorrect(i: number) {
    setCChoices((prev) => prev.map((c, idx) => ({ ...c, isCorrect: idx === i })));
  }
  function addCChoice() {
    setCChoices((prev) => [...prev, { text: "", isCorrect: prev.length === 0 }]);
  }
  function removeCChoice(i: number) {
    setCChoices((prev) => prev.filter((_, idx) => idx !== i));
  }

  const contentChoiceError = useMemo(
    () => validateChoiceList(cChoices, cFormat),
    [cChoices, cFormat],
  );

  // Зураг сонгоход шууд байршуулаад imageKey-г шинэчилнэ (хадгалахдаа явна)
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setContentMsg("");
    try {
      const { key } = await uploadFile(file);
      setCImageKey(key);
    } catch (err) {
      setContentMsg(err instanceof Error ? err.message : "Зураг байршуулахад алдаа гарлаа");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  // Зөвхөн ӨӨРЧЛӨГДСӨН талбаруудыг цуглуулж нэг PATCH /problems/:id дуудна
  async function saveContent() {
    if (contentChoiceError) {
      setContentMsg(contentChoiceError);
      return;
    }
    const orig = contentOrigRef.current;
    const body: Record<string, unknown> = {};
    if (!orig || cStatement !== orig.statementText) body.statementText = cStatement;
    if (!orig || cImageKey !== orig.imageKey) body.imageKey = cImageKey;
    if (!orig || cPoints !== orig.points) body.points = cPoints;
    if (!orig || cFormat !== orig.format) body.format = cFormat;
    if (cFormat !== "OPEN") {
      const normalized = cChoices.map((c) => ({ text: c.text.trim(), isCorrect: c.isCorrect }));
      if (!orig || JSON.stringify(normalized) !== orig.choices) {
        body.choiceOptions = normalized;
      }
    }
    if (Object.keys(body).length === 0) {
      setContentMsg("Өөрчлөлт алга");
      return;
    }
    setContentSaving(true);
    setContentMsg("");
    try {
      const updated = await api<{
        statementText?: string;
        imageKey?: string;
        points: number;
        format: string;
        choiceOptions: { text: string; isCorrect: boolean }[];
      }>(`/problems/${problemId}`, { method: "PATCH", body });
      setProblem((prev) =>
        prev
          ? {
              ...prev,
              statementText: updated.statementText,
              imageKey: updated.imageKey,
              points: updated.points,
              format: updated.format,
            }
          : prev,
      );
      contentOrigRef.current = {
        statementText: updated.statementText ?? "",
        imageKey: updated.imageKey,
        points: updated.points,
        format: updated.format,
        choices: JSON.stringify(
          updated.choiceOptions.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
        ),
      };
      setContentMsg("success: Хадгалагдлаа");
      onSaved?.();
      setTimeout(onClose, 700);
    } catch (e) {
      setContentMsg(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа");
    } finally {
      setContentSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-2xl rounded-2xl border border-line bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold">Ангилал засах</h2>
            <p className="mt-0.5 text-xs text-ink-dim">
              Багш гараар баталгаажуулна — AI автоматаар ангилахгүй
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-ink-dim transition hover:bg-ink/10 hover:text-ink"
            aria-label="Хаах"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {loading && <p className="text-sm text-ink-dim">Ачаалж байна…</p>}
        {loadError && (
          <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {loadError}
          </div>
        )}

        {/* Ангилал / Агуулга tab сэлгэгч — зөвхөн ADMIN/TEACHER_PLUS-д Агуулга харагдана */}
        {problem && !loading && canEditContent && (
          <div className="mb-4 flex gap-2 border-b border-line pb-3">
            <button
              type="button"
              onClick={() => setTab("classify")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tab === "classify"
                  ? "bg-brand-bright/20 text-brand-soft"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              Ангилал
            </button>
            <button
              type="button"
              onClick={() => setTab("content")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                tab === "content"
                  ? "bg-brand-bright/20 text-brand-soft"
                  : "text-ink-dim hover:text-ink"
              }`}
            >
              Агуулга засах
            </button>
          </div>
        )}

        {problem && !loading && (!canEditContent || tab === "classify") && (
          <div className="space-y-6">
            {/* Бодлогын текст (эх дата — энд зөвхөн харна) */}
            <div className="rounded-xl border border-line bg-ink/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded bg-ink/5 px-2 py-0.5 font-mono text-ink-dim">
                  {problem.token}
                </span>
                <span className="rounded bg-brand-bright/15 px-2 py-0.5 text-brand-soft">
                  {problem.format}
                </span>
              </div>
              <p className="text-sm">
                <MathText>{problem.statementText ?? ""}</MathText>
              </p>
            </div>

            {/* ---- Сонголт + алдааны шалтгаан ---- */}
            {format !== "OPEN" && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-brand-soft">Сонголт ба хариулт</h3>
                  <span className="text-xs text-ink-dim">
                    <Circle className="inline h-3 w-3" aria-hidden /> зөвийг сонго, буруу бүрд шалтгаан
                  </span>
                </div>
                <ChoiceListEditor
                  choices={choices}
                  showLabelInput
                  onPatch={patchChoice}
                  onMarkCorrect={markCorrect}
                  onAdd={addChoice}
                  onRemove={removeChoice}
                  error={choiceError}
                  renderBelow={(c, i) =>
                    !c.isCorrect && (
                      <div className="mt-2 pl-8">
                        <div className="flex flex-wrap gap-1.5">
                          {MISTAKE_TYPES.map((m) => {
                            const on = (c.mistakeType ?? "OTHER") === m.value;
                            return (
                              <button
                                key={m.value}
                                type="button"
                                title={m.hint}
                                onClick={() => patchChoice(i, { mistakeType: m.value })}
                                className={`rounded-lg border px-2 py-1 text-[11px] transition ${
                                  on
                                    ? "border-warning/50 bg-warning/15 text-warning"
                                    : "border-line text-ink-dim hover:border-brand-bright/40"
                                }`}
                              >
                                {m.label}
                              </button>
                            );
                          })}
                        </div>
                        <input
                          value={c.mistakeNote ?? ""}
                          onChange={(e) => patchChoice(i, { mistakeNote: e.target.value })}
                          placeholder="Тайлбар (заавал биш): яагаад энэ хариу руу хүрдэг вэ"
                          className="mt-1.5 w-full rounded-lg border border-line bg-ink/5 px-3 py-1.5 text-xs outline-none focus:border-brand-bright"
                        />
                      </div>
                    )
                  }
                />
              </section>
            )}

            {/* ---- Ангилал (бодогдох төрөл) ---- */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-bold text-brand-soft">Бодогдох төрөл</h3>
                <span className="text-xs text-ink-dim">
                  ж: Дискриминантаар бодох
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const on = selectedTags.has(cat.id);
                  if (renameId === cat.id) {
                    return (
                      <span
                        key={cat.id}
                        className="flex items-center gap-1 rounded-lg border border-brand-bright/50 bg-brand-bright/10 px-2 py-1"
                      >
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename();
                            if (e.key === "Escape") setRenameId(null);
                          }}
                          className="w-32 rounded bg-ink/10 px-2 py-0.5 text-xs outline-none"
                        />
                        <button
                          onClick={saveRename}
                          className="text-xs text-success hover:underline"
                        >
                          OK
                        </button>
                      </span>
                    );
                  }
                  return (
                    <span
                      key={cat.id}
                      className={`group flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition ${
                        on
                          ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                          : "border-line text-ink-dim hover:border-brand-bright/40"
                      }`}
                    >
                      <button type="button" onClick={() => toggleTag(cat.id)} className="flex items-center gap-1">
                        {on && <Check size={14} aria-hidden="true" />}
                        {cat.name}
                        {typeof cat._count?.problems === "number" && (
                          <span className="ml-1 opacity-60">
                            ({cat._count.problems})
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        title="Нэр солих (бүх бодлогод тусна)"
                        onClick={() => {
                          setRenameId(cat.id);
                          setRenameVal(cat.name);
                        }}
                        className="opacity-0 transition group-hover:opacity-100"
                        aria-label="Засах"
                      >
                        <Pencil size={14} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
                {categories.length === 0 && (
                  <span className="text-xs text-ink-dim">
                    Ангилал алга — доор шинээр нэмнэ үү
                  </span>
                )}
              </div>

              {/* Шинэ ангилал нэмэх (admin code шаардлагагүй) */}
              <div className="mt-2 flex gap-2">
                <input
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createCategory()}
                  placeholder="Шинэ бодогдох төрөл нэмэх…"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-ink/5 px-3 py-1.5 text-sm outline-none focus:border-brand-bright"
                />
                <button
                  type="button"
                  onClick={createCategory}
                  className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm transition hover:border-brand-bright hover:text-brand-soft"
                >
                  Нэмэх
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-dim">
                Нэрийг харандааны тэмдгээр сольвол тухайн ангилалтай холбоотой бүх бодлогод
                автоматаар шинэчлэгдэнэ.
              </p>
            </section>

            {/* Хадгалах */}
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <span
                className={`flex items-center gap-1.5 text-sm ${
                  msg.startsWith("success:") ? "text-success" : "text-warning"
                }`}
              >
                {msg.startsWith("success:") ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={14} aria-hidden="true" />
                )}
                {msg}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-ink-dim transition hover:text-ink"
                >
                  Болих
                </button>
                <button
                  onClick={saveAll}
                  disabled={saving || !!choiceError}
                  className="rounded-lg bg-brand-bright px-5 py-2 text-sm font-bold text-on-brand transition hover:bg-brand-bright/90 disabled:opacity-50"
                >
                  {saving ? "Хадгалж байна…" : "Хадгалах"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- Агуулга засах tab (зөвхөн ADMIN/TEACHER_PLUS) ---- */}
        {problem && !loading && canEditContent && tab === "content" && (
          <div className="space-y-6">
            {/* Статемент + Live LaTeX preview */}
            <section>
              <h3 className="mb-2 font-bold text-brand-soft">Бодлогын статемент</h3>
              <textarea
                value={cStatement}
                onChange={(e) => setCStatement(e.target.value)}
                rows={4}
                placeholder="Бодлогын текст (LaTeX: $x^2$)"
                className="w-full rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
              />
              {cStatement.trim() && (
                <div className="mt-2 rounded-xl border border-line bg-ink/[0.03] p-3 text-sm">
                  <MathText>{cStatement}</MathText>
                </div>
              )}
            </section>

            {/* Формат + Оноо */}
            <section className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-dim">
                  Формат
                </label>
                <select
                  value={cFormat}
                  onChange={(e) => setCFormat(e.target.value)}
                  className="w-full rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
                >
                  <option value="CHOICE">Сонгох</option>
                  <option value="FILL_NUMBER">Тоо нөхөх</option>
                  <option value="OPEN">Задгай</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-dim">
                  Оноо
                </label>
                <input
                  type="number"
                  min={1}
                  value={cPoints}
                  onChange={(e) =>
                    setCPoints(Math.max(1, parseInt(e.target.value, 10) || 1))
                  }
                  className="w-full rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
                />
              </div>
            </section>

            {/* Зураг */}
            <section>
              <h3 className="mb-2 font-bold text-brand-soft">Зураг</h3>
              {cImageKey && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(cImageKey)}
                  alt="Бодлогын зураг"
                  className="mb-2 max-h-56 rounded-lg border border-line object-contain"
                />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-ink-dim transition hover:border-brand-bright hover:text-brand-soft">
                {uploadingImage
                  ? "Байршуулж байна…"
                  : cImageKey
                    ? "Зураг солих"
                    : "Зураг нэмэх"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={uploadingImage}
                />
              </label>
            </section>

            {/* Сонголт (isCorrect зөвхөн 1) */}
            {cFormat !== "OPEN" && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-brand-soft">Сонголт</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-dim"><Circle className="h-3 w-3" aria-hidden /> зөв хариуг сонго</span>
                </div>
                <ChoiceListEditor
                  choices={cChoices}
                  onPatch={patchCChoice}
                  onMarkCorrect={markCCorrect}
                  onAdd={addCChoice}
                  onRemove={removeCChoice}
                  error={contentChoiceError}
                />
              </section>
            )}

            {/* Хадгалах */}
            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <span
                className={`flex items-center gap-1.5 text-sm ${
                  contentMsg.startsWith("success:") ? "text-success" : "text-warning"
                }`}
              >
                {contentMsg.startsWith("success:") ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={14} aria-hidden="true" />
                )}
                {contentMsg}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-line px-4 py-2 text-sm text-ink-dim transition hover:text-ink"
                >
                  Болих
                </button>
                <button
                  onClick={saveContent}
                  disabled={contentSaving || !!contentChoiceError}
                  className="rounded-lg bg-brand-bright px-5 py-2 text-sm font-bold text-on-brand transition hover:bg-brand-bright/90 disabled:opacity-50"
                >
                  {contentSaving ? "Хадгалж байна…" : "Хадгалах"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
