"use client";

import CodeReveal from "@/components/ui/CodeReveal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Pencil, AlertTriangle, Circle } from "lucide-react";
import { LoadingState } from "@/components/ui/StateBlock";
import MathText from "@/components/MathText";
import { api, fileUrl, uploadFile } from "@/lib/api";
import { useUndoable, useUnsavedGuard } from "@/hooks/useUndoable";
import { versionConflictOf, type VersionConflict } from "@/lib/revisions";
import UndoRedoButtons from "@/components/history/UndoRedoButtons";
import PresenceBadge from "@/components/presence/PresenceBadge";
import { usePresence } from "@/hooks/usePresence";
import HistoryPanel from "@/components/history/HistoryPanel";
import ConfirmDialog from "@/components/history/ConfirmDialog";
import ConflictDialog from "@/components/history/ConflictDialog";
import { showSavedToast } from "@/components/history/saveToast";
import { legacyChoiceList } from "@/components/test-editor/model";
import ChoiceContent from "@/components/ChoiceContent";
import ChoiceImageField from "@/components/ChoiceImageField";

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
 * Буцаах ба өөрчлөлтийн түүх (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md):
 *   - засах боломжтой бүх төлөв useUndoable-аар: ↶ Буцаах / ↷ Урагшлах, Cmd+Z / Ctrl+Z
 *   - хадгалаагүй өөрчлөлттэй хаахад асууна
 *   - хадгалсны дараа 10 сек «Хадгаллаа» + «Буцаах» (өмнөх хувилбарыг сэргээнэ)
 *   - «Түүх» таб: хэн, хэзээ, юу; ялгаа; «Энэ хувилбар руу буцаах»
 *   - expectedVersion — өөр хүн зэрэг засвал 409 → [Шинэчлэх] [Миний хувилбарыг хадгалах]
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
  /** Сонголтын зураг (StoredFile key) — график хариу */
  imageKey?: string | null;
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
  version: number;
  choiceOptions: Choice[];
  /** Хуучин загвар — ProblemChoice мөргүй бодлогод (legacyChoiceList) */
  choices?: unknown;
  correctAnswer?: unknown;
  tags: { tag: Category }[];
}

// Агуулга засах (PATCH /problems/:id) талын хялбаршуулсан сонголт —
// зөвхөн текст + аль нь зөв (label/mistakeType шаардлагагүй, backend автоматаар үүсгэнэ).
interface ContentChoice extends EditableChoiceBase {
  text: string;
  isCorrect: boolean;
}

/** «Ангилал» табын засах боломжтой бүх төлөв (буцаах стекд) */
interface ClassifyState {
  choices: Choice[];
  /** Сонгосон ангиллын id (эрэмбэлсэн — харьцуулалт тогтвортой) */
  tags: string[];
}

/** «Агуулга засах» табын засах боломжтой бүх төлөв (буцаах стекд) */
interface ContentState {
  statement: string;
  imageKey: string | null;
  points: number;
  format: string;
  choices: ContentChoice[];
}

type Tab = "classify" | "content" | "history";

// Формат бүрийн сонголтын анхны шошго: тоо нөхөх → a,b,c…; сонгох → A,B,C…
function defaultLabel(index: number, format: string): string {
  const lower = "abcdefgh";
  const upper = "ABCDEFGH";
  const set = format === "FILL_NUMBER" ? lower : upper;
  return set[index] ?? String(index + 1);
}

/** Сонгох бодлогын хуучин `choices`/`correctAnswer` (нөхөх бодлогын хариу энд хамаарахгүй) */
function legacyOf(p: ProblemEdit) {
  return p.format === "CHOICE" ? legacyChoiceList(p.choices, p.correctAnswer) : [];
}

function classifyFrom(p: ProblemEdit): ClassifyState {
  // Сонголт байхгүй бол (скан бодлого) хоосон мөрөөр эхлүүлж багш бөглөнө
  const choices: Choice[] =
    p.choiceOptions.length > 0
      ? p.choiceOptions.map((c) => ({
          label: c.label,
          text: c.text,
          isCorrect: c.isCorrect,
          imageKey: c.imageKey ?? null,
          mistakeType: c.isCorrect ? undefined : (c.mistakeType ?? "OTHER"),
          mistakeNote: c.mistakeNote ?? "",
        }))
      : legacyOf(p).length > 0
        ? legacyOf(p).map((c, i) => ({
            label: defaultLabel(i, p.format),
            text: c.text,
            isCorrect: c.isCorrect,
            mistakeType: c.isCorrect ? undefined : "OTHER",
            mistakeNote: "",
          }))
        : p.format === "OPEN"
        ? []
        : Array.from({ length: p.format === "FILL_NUMBER" ? 3 : 4 }, (_, i) => ({
            label: defaultLabel(i, p.format),
            text: "",
            isCorrect: i === 0,
            mistakeType: i === 0 ? undefined : "OTHER",
            mistakeNote: "",
          }));
  return { choices, tags: p.tags.map((t) => t.tag.id).sort() };
}

function contentFrom(p: ProblemEdit): ContentState {
  return {
    statement: p.statementText ?? "",
    imageKey: p.imageKey ?? null,
    points: p.points,
    format: p.format,
    choices:
      p.choiceOptions.length > 0
        ? p.choiceOptions.map((c) => ({ text: c.text, isCorrect: c.isCorrect, imageKey: c.imageKey ?? null }))
        : legacyOf(p).length > 0
          ? legacyOf(p)
          : p.format === "OPEN"
          ? []
          : Array.from({ length: p.format === "FILL_NUMBER" ? 3 : 4 }, (_, i) => ({
              text: "",
              isCorrect: i === 0,
            })),
  };
}

/** Сонголтын засварын бичвэр талбаруудыг 0.6 сек зогсолтоор нэг алхам болгоно. */
function choiceCoalesceKey(index: number, patch: object): string | undefined {
  if ("text" in patch) return `text-${index}`;
  if ("label" in patch) return `label-${index}`;
  if ("mistakeNote" in patch) return `note-${index}`;
  return undefined;
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
  if (choices.some((c) => !c.text.trim() && !c.imageKey)) return "Хоосон сонголт байна";
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
  allowImage = false,
  onPatch,
  onMarkCorrect,
  onAdd,
  onRemove,
  onFieldBlur,
  error,
  renderBelow,
}: {
  choices: T[];
  showLabelInput?: boolean;
  /** content tab: сонголт бүрт зураг байршуулах/хасах */
  allowImage?: boolean;
  onPatch: (index: number, patch: Partial<T>) => void;
  onMarkCorrect: (index: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  /** Бичвэр талбараас гарахад — дараагийн бичвэр шинэ буцаах алхам болно */
  onFieldBlur?: () => void;
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
                aria-label={c.isCorrect ? "Зөв хариу" : "Зөв хариу болгох"}
                aria-pressed={c.isCorrect}
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
                  onBlur={onFieldBlur}
                  aria-label="Сонголтын шошго"
                  className="w-12 rounded-lg border border-line bg-ink/5 px-2 py-1.5 text-center text-sm font-bold outline-none focus:border-brand-bright"
                />
              )}
              <input
                value={c.text}
                onChange={(e) => onPatch(i, { text: e.target.value } as Partial<T>)}
                onBlur={onFieldBlur}
                aria-label="Сонголтын утга"
                placeholder={c.imageKey ? "Текст (заавал биш)" : "Сонголтын утга (LaTeX: $x^2$)"}
                className="min-w-0 flex-1 rounded-lg border border-line bg-ink/5 px-3 py-1.5 text-sm outline-none focus:border-brand-bright"
              />
              {allowImage && (
                <ChoiceImageField
                  imageKey={c.imageKey}
                  label={`${i + 1}-р сонголт`}
                  onChange={(key) => {
                    onPatch(i, { imageKey: key } as Partial<T>);
                    onFieldBlur?.();
                  }}
                />
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-error transition hover:bg-error/10"
              >
                Устгах
              </button>
            </div>

            {/* Урьдчилан харах — LaTeX/зэрэг зөв харагдаж буй эсэх */}
            {(c.text.trim() || c.imageKey) && (
              <div className="mt-1.5 flex items-start gap-1 pl-8 text-xs text-ink-dim">
                <span>Харагдац:</span>
                <ChoiceContent text={c.text} image={c.imageKey} imageClassName="max-h-32" />
              </div>
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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [newCat, setNewCat] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const [tab, setTab] = useState<Tab>("classify");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [contentSaving, setContentSaving] = useState(false);
  const [contentMsg, setContentMsg] = useState("");

  // Таб бүрийн засвар аль хувилбар дээр үндэслэсэн бэ (expectedVersion). Нэг таб
  // хадгалахад нөгөө таб хадгалаагүй өөрчлөлттэй бол хуучин хувилбар дээрээ үлдэнэ;
  // хадгалахад сервер өөр талбарын өөрчлөлтийг нэгтгэж, ижил талбарыг хоёулаа
  // өөрөөр засвал 409 — бие биенийхээ засварыг чимээгүй дарахгүй (ZEREG-ZASVAR §2).
  const [classifyBase, setClassifyBase] = useState(0);
  const [contentBase, setContentBase] = useState(0);
  const [historyKey, setHistoryKey] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const [conflict, setConflict] = useState<{ tab: "classify" | "content"; info: VersionConflict } | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const presenceKey = `problem:${problemId}`;
  const presence = usePresence([presenceKey]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const nestedOpen = confirmClose || !!conflict;
  const classify = useUndoable<ClassifyState>({ choices: [], tags: [] }, {
    shortcuts: tab === "classify" && !nestedOpen,
  });
  const content = useUndoable<ContentState>(
    { statement: "", imageKey: null, points: 1, format: "CHOICE", choices: [] },
    { shortcuts: tab === "content" && !nestedOpen },
  );
  const dirty = classify.dirty || content.dirty;
  useUnsavedGuard(dirty, "problem-editor");

  const format = problem?.format ?? "CHOICE";
  const choices = classify.value.choices;
  const selectedTags = useMemo(() => new Set(classify.value.tags), [classify.value.tags]);
  const c = content.value;

  const loadCategories = useCallback(() => {
    return api<Category[]>("/classification/categories?type=SOLUTION_TYPE")
      .then(setCategories)
      .catch(() => {});
  }, []);

  /** Серверийн төлөвийг табуудад тавина. keep — хадгалаагүй өөрчлөлттэй табыг хөндөхгүй. */
  const applyServer = useCallback(
    (p: ProblemEdit, keep: { classify?: boolean; content?: boolean } = {}) => {
      setProblem(p);
      if (!keep.classify) {
        classify.reset(classifyFrom(p));
        setClassifyBase(p.version ?? 0);
      }
      if (!keep.content) {
        content.reset(contentFrom(p));
        setContentBase(p.version ?? 0);
      }
    },
    [classify, content],
  );
  const applyServerRef = useRef(applyServer);
  useEffect(() => {
    applyServerRef.current = applyServer;
  }, [applyServer]);

  const reload = useCallback(async () => {
    const p = await api<ProblemEdit>(`/classification/problems/${problemId}`);
    if (mounted.current) applyServerRef.current(p);
    return p;
  }, [problemId]);

  // Бодлого + ангиллын жагсаалтыг зэрэг ачаална.
  // Анхны state (loading=true, loadError="") тул энд синхрон reset хийхгүй —
  // parent key={problemId}-аар дахин mount хийдэг тул төлөв цэвэр эхэлнэ.
  useEffect(() => {
    let alive = true;
    Promise.all([api<ProblemEdit>(`/classification/problems/${problemId}`), loadCategories()])
      .then(([p]) => {
        if (alive) applyServerRef.current(p);
      })
      .catch((e) => {
        if (alive) setLoadError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [problemId, loadCategories]);

  // Нээгдэхэд фокусыг цонх руу (гарнаас шууд ажиллахад)
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  function requestClose() {
    if (dirty) setConfirmClose(true);
    else onClose();
  }

  // Escape — хаах (дээр нь Radix цонх нээлттэй бол тэр өөрөө Escape-ийг авна)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || nestedOpen) return;
      if (renameId) return; // ангиллын нэр солих талбар өөрөө Escape-ийг ашиглана
      e.preventDefault();
      if (dirty) setConfirmClose(true);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty, nestedOpen, renameId, onClose]);

  // Фокус занга: Tab цонхноос гарахгүй (§6.9)
  function trapFocus(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab" || nestedOpen) return;
    const nodes = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(
      (n) => n.offsetParent !== null,
    );
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  // ---- Сонголт засах (functional updater — олон дараалсан дарлт алдагдахгүй) ----
  function patchChoice(i: number, patch: Partial<Choice>) {
    classify.set(
      (s) => ({ ...s, choices: s.choices.map((ch, idx) => (idx === i ? { ...ch, ...patch } : ch)) }),
      { coalesceKey: choiceCoalesceKey(i, patch) },
    );
  }
  // Яг нэг зөв — radio маягаар бусдыг нь салгана
  function markCorrect(i: number) {
    classify.set((s) => ({
      ...s,
      choices: s.choices.map((ch, idx) => ({
        ...ch,
        isCorrect: idx === i,
        mistakeType: idx === i ? undefined : (ch.mistakeType ?? "OTHER"),
      })),
    }));
  }
  function addChoice() {
    classify.set((s) => ({
      ...s,
      choices: [
        ...s.choices,
        {
          label: defaultLabel(s.choices.length, format),
          text: "",
          isCorrect: s.choices.length === 0,
          mistakeType: s.choices.length === 0 ? undefined : "OTHER",
          mistakeNote: "",
        },
      ],
    }));
  }
  function removeChoice(i: number) {
    classify.set((s) => ({ ...s, choices: s.choices.filter((_, idx) => idx !== i) }));
  }

  function toggleTag(id: string) {
    classify.set((s) => ({
      ...s,
      tags: s.tags.includes(id) ? s.tags.filter((t) => t !== id) : [...s.tags, id].sort(),
    }));
  }

  // Хадгалахын өмнөх шалгалт (backend хоосон/олон зөвийг зогсоохгүй тул энд барина)
  const choiceError = useMemo(
    () =>
      validateChoiceList(choices, format, {
        treatEmptyAsValid: true,
        getLabel: (ch) => ch.label ?? "",
      }),
    [choices, format],
  );

  /** Хадгалсны дараах нийтлэг алхам: тоо, мэдэгдэл («Буцаах»), хаах эсэх. */
  function afterSave(
    saved: "classify" | "content",
    p: ProblemEdit,
    previousVersion: number,
    meta: { changed?: boolean; mergedWith?: string[] | null; savedVersion?: number } = {},
  ) {
    const otherDirty = saved === "classify" ? content.dirty : classify.dirty;
    applyServer(p, saved === "classify" ? { content: otherDirty } : { classify: otherDirty });
    setHistoryKey((k) => k + 1);
    showSavedToast({
      entity: "PROBLEM",
      id: problemId,
      previousVersion,
      // Хадгалалтын commit-ийн хувилбар (дахин уншсаных биш — тэр хооронд өөр хүн
      // хадгалсан бол «Буцаах» түүнийхийг буцаахгүй)
      savedVersion: meta.savedVersion ?? p.version,
      changed: meta.changed,
      mergedWith: meta.mergedWith,
      onUndone: () => {
        onSaved?.();
        if (mounted.current) {
          void reload().catch(() => {});
          setHistoryKey((k) => k + 1);
        }
      },
    });
    onSaved?.();
    // Нөгөө табд хадгалаагүй өөрчлөлт байвал хаахгүй (алдагдахаас сэргийлнэ)
    if (!otherDirty) setTimeout(() => mounted.current && onClose(), 700);
  }

  /** overwrite — 409-ийн дараа «Миний хувилбарыг хадгалах»: зөрчилтэй талбарт миний утга */
  async function saveAll(overwrite = false) {
    if (choiceError) {
      setMsg(choiceError);
      return;
    }
    const base = classifyBase;
    setSaving(true);
    setMsg("");
    try {
      // Сонголт + ангиллыг НЭГ transaction-д (нэг хувилбар) — задгай бодлого,
      // сонголтгүй үед сонголтыг илгээхгүй.
      const res = await api<{
        version: number;
        changed: boolean;
        mergedWith?: string[] | null;
        problem: ProblemEdit;
      }>(
        `/classification/problems/${problemId}`,
        {
          method: "PUT",
          body: {
            ...(format !== "OPEN" && choices.length > 0
              ? {
                  choices: choices.map((ch) => ({
                    label: ch.label.trim(),
                    text: ch.text.trim(),
                    isCorrect: ch.isCorrect,
                    ...(ch.isCorrect ? {} : { mistakeType: ch.mistakeType ?? "OTHER" }),
                    ...(ch.mistakeNote?.trim() ? { mistakeNote: ch.mistakeNote.trim() } : {}),
                  })),
                }
              : {}),
            tagIds: classify.value.tags,
            expectedVersion: base,
            ...(overwrite ? { overwrite: true } : {}),
          },
        },
      );
      setConflict(null);
      setMsg(res.changed ? "success: Хадгалагдлаа" : "success: Өөрчлөлт алга");
      afterSave("classify", res.problem, base, {
        changed: res.changed,
        mergedWith: res.mergedWith,
        savedVersion: res.version,
      });
    } catch (e) {
      const info = versionConflictOf(e);
      if (info) setConflict({ tab: "classify", info });
      else setMsg(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа");
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
      classify.set((s) => ({ ...s, tags: s.tags.includes(cat.id) ? s.tags : [...s.tags, cat.id].sort() }));
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
  function setContent(patch: Partial<ContentState>, coalesceKey?: string) {
    content.set((s) => ({ ...s, ...patch }), { coalesceKey });
  }
  function patchCChoice(i: number, patch: Partial<ContentChoice>) {
    content.set(
      (s) => ({ ...s, choices: s.choices.map((ch, idx) => (idx === i ? { ...ch, ...patch } : ch)) }),
      { coalesceKey: choiceCoalesceKey(i, patch) },
    );
  }
  function markCCorrect(i: number) {
    content.set((s) => ({ ...s, choices: s.choices.map((ch, idx) => ({ ...ch, isCorrect: idx === i })) }));
  }
  function addCChoice() {
    content.set((s) => ({ ...s, choices: [...s.choices, { text: "", isCorrect: s.choices.length === 0 }] }));
  }
  function removeCChoice(i: number) {
    content.set((s) => ({ ...s, choices: s.choices.filter((_, idx) => idx !== i) }));
  }

  const contentChoiceError = useMemo(() => validateChoiceList(c.choices, c.format), [c.choices, c.format]);

  // Зураг сонгоход шууд байршуулаад imageKey-г шинэчилнэ (хадгалахдаа явна; буцааж болно)
  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setContentMsg("");
    try {
      const { key } = await uploadFile(file);
      setContent({ imageKey: key });
    } catch (err) {
      setContentMsg(err instanceof Error ? err.message : "Зураг байршуулахад алдаа гарлаа");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  // Зөвхөн ӨӨРЧЛӨГДСӨН талбаруудыг цуглуулж нэг PATCH /problems/:id дуудна
  async function saveContent(overwrite = false) {
    if (contentChoiceError) {
      setContentMsg(contentChoiceError);
      return;
    }
    const orig = content.baseline;
    const body: Record<string, unknown> = {};
    if (c.statement !== orig.statement) body.statementText = c.statement;
    if (c.imageKey !== orig.imageKey) body.imageKey = c.imageKey;
    if (c.points !== orig.points) body.points = c.points;
    if (c.format !== orig.format) body.format = c.format;
    if (c.format !== "OPEN") {
      const norm = (list: ContentChoice[]) =>
        list.map((ch) => ({ text: ch.text.trim(), isCorrect: ch.isCorrect, imageKey: ch.imageKey ?? null }));
      const normalized = norm(c.choices);
      if (JSON.stringify(normalized) !== JSON.stringify(norm(orig.choices))) body.choiceOptions = normalized;
    }
    if (Object.keys(body).length === 0) {
      setContentMsg("Өөрчлөлт алга");
      return;
    }
    const base = contentBase;
    setContentSaving(true);
    setContentMsg("");
    try {
      const saved = await api<{ version?: number; changed?: boolean; mergedWith?: string[] | null }>(`/problems/${problemId}`, {
        method: "PATCH",
        body: { ...body, expectedVersion: base, ...(overwrite ? { overwrite: true } : {}) },
      });
      // Хоёр табыг ижил эх сурвалжаас шинэчилнэ (сонголтын шошго, ангилал г.м.)
      const fresh = await api<ProblemEdit>(`/classification/problems/${problemId}`);
      setConflict(null);
      setContentMsg("success: Хадгалагдлаа");
      afterSave("content", fresh, base, {
        changed: saved.changed,
        mergedWith: saved.mergedWith,
        savedVersion: saved.version,
      });
    } catch (e) {
      const info = versionConflictOf(e);
      if (info) setConflict({ tab: "content", info });
      else setContentMsg(e instanceof Error ? e.message : "Хадгалахад алдаа гарлаа");
    } finally {
      setContentSaving(false);
    }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "classify", label: "Ангилал" },
    ...(canEditContent ? [{ key: "content" as Tab, label: "Засах" }] : []),
    { key: "history", label: "Түүх" },
  ];
  const active = tab === "content" ? content : tab === "classify" ? classify : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => {
        // Гадуур дарахад хадгалаагүй өөрчлөлт анхааруулгагүй алга болдог байв
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="problem-editor-title"
        tabIndex={-1}
        onKeyDown={trapFocus}
        className="my-8 w-full max-w-2xl chunky p-4 outline-none sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id="problem-editor-title" className="cyrillic-heading text-lg font-extrabold">
              Бодлого засах
            </h2>
            <p className="mt-0.5 text-xs text-ink-dim">
              Багш гараар баталгаажуулна — AI автоматаар ангилахгүй
            </p>
            <PresenceBadge editors={presence[presenceKey]} className="mt-1.5" />
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {problem && !loading && active && (
              <UndoRedoButtons
                canUndo={active.canUndo}
                canRedo={active.canRedo}
                onUndo={active.undo}
                onRedo={active.redo}
              />
            )}
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-ink-dim transition hover:bg-ink/10 hover:text-ink"
              aria-label="Хаах"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {loading && <LoadingState rows={3} label="Ачаалж байна" />}
        {loadError && (
          <div className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
            {loadError}
          </div>
        )}

        {/* Ангилал / Агуулга / Түүх — Агуулга зөвхөн ADMIN/TEACHER_PLUS-д */}
        {problem && !loading && (
          <div role="tablist" aria-label="Засварын хэсэг" className="mb-4 flex gap-2 overflow-x-auto border-b border-line pb-3">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                onClick={() => setTab(t.key)}
                className={`min-h-9 shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                  tab === t.key ? "bg-brand-bright/20 text-brand-soft" : "text-ink-dim hover:text-ink"
                }`}
              >
                {t.label}
                {t.key === "classify" && classify.dirty && <span className="sr-only"> (хадгалаагүй)</span>}
                {t.key === "content" && content.dirty && <span className="sr-only"> (хадгалаагүй)</span>}
                {((t.key === "classify" && classify.dirty) || (t.key === "content" && content.dirty)) && (
                  <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-warning align-middle" aria-hidden />
                )}
              </button>
            ))}
          </div>
        )}

        {problem && !loading && tab === "classify" && (
          <div className="space-y-6">
            {/* Бодлогын текст (эх дата — энд зөвхөн харна) */}
            <div className="rounded-xl border border-line bg-ink/[0.03] p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                <CodeReveal code={problem.token} className="h-6 w-6" />
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
                  onFieldBlur={classify.commitGroup}
                  error={choiceError}
                  renderBelow={(ch, i) =>
                    !ch.isCorrect && (
                      <div className="mt-2 pl-8">
                        <div className="flex flex-wrap gap-1.5">
                          {MISTAKE_TYPES.map((m) => {
                            const on = (ch.mistakeType ?? "OTHER") === m.value;
                            return (
                              <button
                                key={m.value}
                                type="button"
                                title={m.hint}
                                aria-pressed={on}
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
                          value={ch.mistakeNote ?? ""}
                          onChange={(e) => patchChoice(i, { mistakeNote: e.target.value })}
                          onBlur={classify.commitGroup}
                          aria-label="Алдааны тайлбар"
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
                          aria-label="Ангиллын шинэ нэр"
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
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleTag(cat.id)}
                        className="flex items-center gap-1"
                      >
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
                        className="opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
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
                  aria-label="Шинэ бодогдох төрөл"
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
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span
                role="status"
                className={`flex items-center gap-1.5 text-sm ${
                  msg.startsWith("success:") ? "text-success" : "text-warning"
                }`}
              >
                {msg &&
                  (msg.startsWith("success:") ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={14} aria-hidden="true" />
                  ))}
                {msg.replace(/^success: /, "")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm text-ink-dim transition hover:text-ink"
                >
                  Болих
                </button>
                <button
                  type="button"
                  onClick={() => void saveAll()}
                  disabled={saving || !!choiceError || !classify.dirty}
                  className="min-h-11 rounded-lg bg-brand-bright px-5 py-2 text-sm font-bold text-on-brand transition hover:bg-brand-bright/90 disabled:opacity-50"
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
                value={c.statement}
                onChange={(e) => setContent({ statement: e.target.value }, "statement")}
                onBlur={content.commitGroup}
                rows={4}
                aria-label="Бодлогын статемент"
                placeholder="Бодлогын текст (LaTeX: $x^2$)"
                className="w-full rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
              />
              {c.statement.trim() && (
                <div className="mt-2 rounded-xl border border-line bg-ink/[0.03] p-3 text-sm">
                  <MathText>{c.statement}</MathText>
                </div>
              )}
            </section>

            {/* Формат + Оноо */}
            <section className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pce-format" className="mb-1 block text-xs font-bold text-ink-dim">
                  Формат
                </label>
                <select
                  id="pce-format"
                  value={c.format}
                  onChange={(e) => setContent({ format: e.target.value })}
                  className="w-full rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
                >
                  <option value="CHOICE">Сонгох</option>
                  <option value="FILL_NUMBER">Тоо нөхөх</option>
                  <option value="OPEN">Задгай</option>
                </select>
              </div>
              <div>
                <label htmlFor="pce-points" className="mb-1 block text-xs font-bold text-ink-dim">
                  Оноо
                </label>
                <input
                  id="pce-points"
                  type="number"
                  min={1}
                  value={c.points}
                  onChange={(e) => setContent({ points: Math.max(1, parseInt(e.target.value, 10) || 1) }, "points")}
                  onBlur={content.commitGroup}
                  className="w-full rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
                />
              </div>
            </section>

            {/* Зураг */}
            <section>
              <h3 className="mb-2 font-bold text-brand-soft">Зураг</h3>
              {c.imageKey && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fileUrl(c.imageKey)}
                  alt="Бодлогын зураг"
                  className="mb-2 max-h-56 rounded-lg border border-line object-contain"
                />
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs text-ink-dim transition hover:border-brand-bright hover:text-brand-soft">
                {uploadingImage
                  ? "Байршуулж байна…"
                  : c.imageKey
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
            {c.format !== "OPEN" && (
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-bold text-brand-soft">Сонголт</h3>
                  <span className="inline-flex items-center gap-1 text-xs text-ink-dim"><Circle className="h-3 w-3" aria-hidden /> зөв хариуг сонго</span>
                </div>
                <ChoiceListEditor
                  choices={c.choices}
                  allowImage
                  onPatch={patchCChoice}
                  onMarkCorrect={markCCorrect}
                  onAdd={addCChoice}
                  onRemove={removeCChoice}
                  onFieldBlur={content.commitGroup}
                  error={contentChoiceError}
                />
              </section>
            )}

            {/* Хадгалах */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span
                role="status"
                className={`flex items-center gap-1.5 text-sm ${
                  contentMsg.startsWith("success:") ? "text-success" : "text-warning"
                }`}
              >
                {contentMsg &&
                  (contentMsg.startsWith("success:") ? (
                    <Check size={14} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={14} aria-hidden="true" />
                  ))}
                {contentMsg.replace(/^success: /, "")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={requestClose}
                  className="min-h-11 rounded-lg border border-line px-4 py-2 text-sm text-ink-dim transition hover:text-ink"
                >
                  Болих
                </button>
                <button
                  type="button"
                  onClick={() => void saveContent()}
                  disabled={contentSaving || !!contentChoiceError || !content.dirty}
                  className="min-h-11 rounded-lg bg-brand-bright px-5 py-2 text-sm font-bold text-on-brand transition hover:bg-brand-bright/90 disabled:opacity-50"
                >
                  {contentSaving ? "Хадгалж байна…" : "Хадгалах"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---- Түүх: хэн, хэзээ, юу; ялгаа; «Энэ хувилбар руу буцаах» ---- */}
        {problem && !loading && tab === "history" && (
          <HistoryPanel
            entity="PROBLEM"
            id={problemId}
            dirty={dirty}
            refreshKey={historyKey}
            onRestored={() => {
              onSaved?.();
              void reload().catch(() => {});
            }}
          />
        )}
      </div>

      <ConfirmDialog
        open={confirmClose}
        title="Хадгалаагүй өөрчлөлт байна"
        description="Хаавал таны хадгалаагүй өөрчлөлт устна."
        confirmLabel="Хадгалахгүй хаах"
        cancelLabel="Үргэлжлүүлэн засах"
        danger
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          onClose();
        }}
      />

      <ConflictDialog
        conflict={conflict?.info ?? null}
        busy={saving || contentSaving}
        onClose={() => setConflict(null)}
        onReload={() => {
          setConflict(null);
          setMsg("");
          setContentMsg("");
          void reload().catch((e) => setLoadError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа"));
          setHistoryKey((k) => k + 1);
        }}
        onOverwrite={() => {
          if (!conflict) return;
          // Анх ачаалсан хувилбараа + overwrite: сервер зөрчилтэй талбарт миний утгыг
          // авч, бусдын бусад өөрчлөлтийг хэвээр үлдээнэ.
          if (conflict.tab === "classify") void saveAll(true);
          else void saveContent(true);
        }}
      />
    </div>
  );
}
