"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Upload, X } from "lucide-react";
import { api, fileUrl, uploadFile } from "@/lib/api";
import MathText from "../MathText";
import ConfirmDialog from "./ConfirmDialog";
import DeletedList from "./DeletedList";
import { errMsg, FORMATS, Msg, Problem } from "./types";
import { DeletedEntry } from "./useDeletedLog";
import { inputCls, pillCls, primaryBtn } from "./ui";

/** Серверийн хязгаартай ТААРУУЛСАН — api/src/storage/uploads.controller.ts
 *  (fileFilter ALLOWED_EXT ба limits.fileSize). Хоёр талд тусад нь бичсэн тул
 *  сервер тал өөрчлөгдвөл ЭНДИЙГ ч хамт шинэчилнэ. */
const ACCEPTED_IMAGE = /\.(jpe?g|png|gif|webp|heic)$/i;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

interface ProblemsPanelProps {
  chapterId: string;
  deletedEntries: DeletedEntry[];
  onDeleted: (entry: Omit<DeletedEntry, "deletedAt">) => void;
}

// Ноорог хадгалалтын түлхүүр
function getDraftKey(chapterId: string): string {
  return `problem_draft_${chapterId}`;
}

// debounce helper
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export default function ProblemsPanel({
  chapterId,
  deletedEntries,
  onDeleted,
}: ProblemsPanelProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [newProblem, setNewProblem] = useState({
    page: "",
    number: "",
    format: "CHOICE",
    statementText: "",
    correctAnswer: "",
    points: 1,
    tags: "",
    imageKey: "",
  });
  // CHOICE форматын бүтэцтэй сонголтууд: текст + аль нь зөв (сурагчид
  // үсэггүй, холимог дараалалтай харагдана)
  const [choiceTexts, setChoiceTexts] = useState<string[]>(["", "", "", "", ""]);
  const [correctIdx, setCorrectIdx] = useState(0);
  // FILL_NUMBER дээрхи нүхний хариулт: { "a": 4, "b": 2 } эдгээрийн утга
  const [fillNumberAnswers, setFillNumberAnswers] = useState<
    Record<string, number>
  >({});

  const [deleteTarget, setDeleteTarget] = useState<Problem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Ноорогыг localStorage-д хадгал
  const saveDraft = useCallback(() => {
    if (!chapterId) return;
    localStorage.setItem(
      getDraftKey(chapterId),
      JSON.stringify({
        newProblem,
        choiceTexts,
        correctIdx,
        fillNumberAnswers,
      })
    );
  }, [chapterId, newProblem, choiceTexts, correctIdx, fillNumberAnswers]);

  // debounce-тай draft сохранить (бодлогын текст өөрчлөгдөхөд)
  const saveDraftDebounced = useCallback(
    debounce(() => {
      saveDraft();
      setHasUnsavedChanges(false);
    }, 250),
    [saveDraft]
  );

  // Ноорогыг сэргээ
  const loadDraft = useCallback(() => {
    if (!chapterId) return;
    const key = getDraftKey(chapterId);
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setNewProblem(draft.newProblem || newProblem);
        setChoiceTexts(draft.choiceTexts || ["", "", "", "", ""]);
        setCorrectIdx(draft.correctIdx || 0);
        setFillNumberAnswers(draft.fillNumberAnswers || {});
        setMsg({
          kind: "success",
          text: "Ноорог сэргээгдлээ",
        });
        setTimeout(() => setMsg(null), 3000);
      } catch {
        // JSON parse алдаа — зүүд ноорог устга
        localStorage.removeItem(key);
      }
    }
  }, [chapterId]);

  const load = useCallback(() => {
    if (!chapterId) return;
    api<Problem[]>(`/chapters/${chapterId}/problems`)
      .then(setProblems)
      .catch((e) => {
        setProblems([]);
        setMsg({ kind: "error", text: errMsg(e) });
      });
  }, [chapterId]);

  useEffect(() => {
    load();
    loadDraft();
  }, [load, loadDraft]);

  // beforeunload анхааруулга
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  async function createProblem() {
    if (!chapterId) return;
    const isChoice = newProblem.format === "CHOICE";

    const choiceOptions = choiceTexts
      .map((t, i) => ({ text: t.trim(), isCorrect: i === correctIdx }))
      .filter((o) => o.text !== "");
    if (isChoice) {
      if (choiceOptions.length < 2) {
        setMsg({ kind: "error", text: "Дор хаяж 2 сонголтын текст оруулна уу" });
        return;
      }
      if (!choiceTexts[correctIdx]?.trim()) {
        setMsg({ kind: "error", text: "Зөв хариултын сонголтоо тэмдэглэнэ үү" });
        return;
      }
    } else if (newProblem.format === "FILL_NUMBER") {
      // FILL_NUMBER форматаар буцаахаас өмнө
      if (Object.keys(fillNumberAnswers).length === 0) {
        setMsg({ kind: "error", text: "Дор хаяж нэг нүхний хариуг оруулна уу" });
        return;
      }
    } else if (!newProblem.correctAnswer.trim()) {
      setMsg({ kind: "error", text: "Зөв хариу оруулна уу" });
      return;
    }

    const tags = newProblem.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((name) => ({ type: "SUBTOPIC", name }));

    let correctAnswer: unknown = newProblem.correctAnswer.trim();
    if (newProblem.format === "FILL_NUMBER") {
      // FILL_NUMBER нь JSON объект: { "a": 4, "b": 2 }
      correctAnswer = fillNumberAnswers;
    } else if (newProblem.format === "OPEN") {
      // OPEN нь энгийн текст, гэхдээ JSON parse оролдож болно
      try {
        correctAnswer = JSON.parse(newProblem.correctAnswer);
      } catch {
        /* стринг хэвээр үлдээнэ */
      }
    }

    try {
      const choiceLabel =
        isChoice && choiceTexts[correctIdx]
          ? `(${choiceTexts[correctIdx].trim()})`
          : "";
      await api("/problems", {
        method: "POST",
        body: {
          chapterId,
          page: newProblem.page ? parseInt(newProblem.page, 10) : undefined,
          number: newProblem.number ? parseInt(newProblem.number, 10) : undefined,
          format: newProblem.format,
          statementText: newProblem.statementText || undefined,
          imageKey: newProblem.imageKey || undefined,
          ...(isChoice ? { choiceOptions } : { correctAnswer }),
          points: newProblem.points,
          tags: tags.length ? tags : undefined,
        },
      });
      setNewProblem({
        page: newProblem.page,
        number: String((parseInt(newProblem.number, 10) || 0) + 1),
        format: newProblem.format,
        statementText: "",
        correctAnswer: "",
        points: 1,
        tags: "",
        imageKey: "",
      });
      setChoiceTexts(["", "", "", "", ""]);
      setCorrectIdx(0);
      setFillNumberAnswers({});
      setPreviewText("");
      setHasUnsavedChanges(false);

      // Ноорогыг устга хадгалсны дараа
      if (chapterId) {
        localStorage.removeItem(getDraftKey(chapterId));
      }

      setMsg({
        kind: "success",
        text: `Бодлого үүслээ — зөв хариулт: ${
          isChoice ? choiceTexts[correctIdx] : JSON.stringify(correctAnswer)
        }`,
      });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  /**
   * Зураг оруулах.
   *
   * ⚠️ Өмнө нь энд `fetch("/api/uploads")` гэсэн ХАРЬЦАНГУЙ зам байсан бөгөөд
   * гурван алдаатай байв:
   *   1. Вэб нь Vercel, API нь Render дээр — өөр домэйн тул прод дээр 404.
   *   2. Authorization толгой байхгүй — endpoint нь JwtAuthGuard-тай тул 401.
   *   3. Timeout байхгүй — сүлжээ муу үед мөнхөд өлгөөтэй үлдэнэ.
   * `uploadFile()` (lib/api.ts) нь гурвуулангийг зөв хийдэг тул түүнийг ашиглана.
   */
  async function handleImageUpload(file: File) {
    if (!file) return;

    // Клиент талд УРЬДЧИЛЖ шалгана — 25MB файлыг сүлжээгээр явуулаад дараа нь
    // татгалзвал багшийн цаг, интернэт дэмий үрэгдэнэ (Монголд урсгал үнэтэй).
    if (!ACCEPTED_IMAGE.test(file.name)) {
      setMsg({ kind: "error", text: "Зөвхөн зураг оруулна (jpg, png, gif, webp, heic)" });
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      setMsg({
        kind: "error",
        text: `Зураг хэт том байна (${mb}MB). Дээд хэмжээ ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`,
      });
      return;
    }

    setUploadingImage(true);
    try {
      const { key } = await uploadFile(file);
      setNewProblem({ ...newProblem, imageKey: key });
      setHasUnsavedChanges(true);
      setMsg({ kind: "success", text: "Зураг орлоо" });
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setUploadingImage(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api(`/problems/${deleteTarget.id}`, { method: "DELETE" });
      onDeleted({
        id: deleteTarget.id,
        kind: "problem",
        label: deleteTarget.token,
      });
      setMsg({ kind: "success", text: "Бодлого устгагдлаа" });
      setDeleteTarget(null);
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-brand-soft">3. Бодлого</h2>
        {msg && (
          <span
            role="status"
            className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
              msg.kind === "error"
                ? "bg-error/10 text-error"
                : "bg-success/10 text-success"
            }`}
          >
            {msg.kind === "error" ? (
              <AlertTriangle size={14} aria-hidden="true" />
            ) : (
              <Check size={14} aria-hidden="true" />
            )}
            {msg.text}
          </span>
        )}
      </div>

      {!chapterId ? (
        <p className="text-sm text-ink-dim">Эхлээд бүлэг сонгоно уу</p>
      ) : (
        <>
          <div className="mb-3 space-y-2">
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="new-problem-page">
                Хуудас
              </label>
              <input
                id="new-problem-page"
                value={newProblem.page}
                onChange={(e) =>
                  setNewProblem({ ...newProblem, page: e.target.value })
                }
                inputMode="numeric"
                placeholder="Хуудас"
                className={`w-1/2 ${inputCls}`}
              />
              <label className="sr-only" htmlFor="new-problem-number">
                Дугаар
              </label>
              <input
                id="new-problem-number"
                value={newProblem.number}
                onChange={(e) =>
                  setNewProblem({ ...newProblem, number: e.target.value })
                }
                inputMode="numeric"
                placeholder="Дугаар"
                className={`w-1/2 ${inputCls}`}
              />
            </div>
            <label className="sr-only" htmlFor="new-problem-statement">
              Бодлогын текст
            </label>
            <textarea
              id="new-problem-statement"
              value={newProblem.statementText}
              onChange={(e) => {
                setNewProblem({ ...newProblem, statementText: e.target.value });
                setPreviewText(e.target.value);
                setHasUnsavedChanges(true);
                saveDraftDebounced();
              }}
              placeholder="Бодлогын текст"
              rows={2}
              className={`w-full ${inputCls}`}
            />
            {previewText && (
              <div className="rounded-lg border border-line bg-bg p-3 text-sm">
                <p className="mb-2 text-xs text-ink-dim">Урьдчилан харах:</p>
                <MathText>{previewText}</MathText>
              </div>
            )}
            <label className="sr-only" htmlFor="new-problem-format">
              Формат
            </label>
            <select
              id="new-problem-format"
              value={newProblem.format}
              onChange={(e) =>
                setNewProblem({ ...newProblem, format: e.target.value })
              }
              className={`w-full bg-bg ${inputCls}`}
            >
              {FORMATS.map((f) => (
                <option key={f.v} value={f.v}>
                  {f.t}
                </option>
              ))}
            </select>

            <div className="rounded-lg border border-line bg-bg p-3">
              <p className="mb-2 text-xs font-semibold text-ink-dim">Зураг</p>
              <div className="flex items-center gap-2">
                <label className="relative flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-sm text-ink-dim transition hover:border-brand">
                  <Upload size={14} aria-hidden="true" />
                  {uploadingImage ? "Дагалж байна…" : "Зураг сонгох"}
                  <input
                    type="file"
                    // Серверийн ALLOWED_EXT-тэй ЯГ таарна. Өмнө нь ".pdf" ч
                    // байсан — PDF нь <img> дотор харагдахгүй тул бодлогын
                    // зурагт тохирохгүй (PDF-ийг ном оруулах урсгал зохицуулна).
                    accept=".jpg,.jpeg,.png,.gif,.webp,.heic"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        void handleImageUpload(e.target.files[0]);
                      }
                      // Ижил файлыг дахин сонгоход onChange дуудагдахгүй тул
                      // утгыг цэвэрлэнэ (алдаа зассаны дараа дахин оролдох боломж).
                      e.target.value = "";
                    }}
                    disabled={uploadingImage}
                    className="sr-only"
                  />
                </label>
                {newProblem.imageKey && (
                  <div className="flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
                    <Check size={14} aria-hidden="true" />
                    {/* УРЬДЧИЛАН ХАРАХ. Өмнө нь зөвхөн UUID файлын нэр
                        харагддаг байсан — багш зөв зургаа сонгосон эсэхээ
                        шалгах ямар ч арга байгаагүй. fileUrl() нь эрхийн
                        токеныг query-д хавсаргадаг (GET /files/:key нь
                        JWT шаарддаг тул <img> дотор header дамжуулах
                        боломжгүй — lib/api.ts-ийн тайлбарыг үз). */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileUrl(newProblem.imageKey)}
                      alt="Оруулсан зураг"
                      className="h-12 w-12 rounded border border-line object-cover"
                    />
                    <span className="max-w-[10rem] truncate" title={newProblem.imageKey}>
                      {newProblem.imageKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewProblem({ ...newProblem, imageKey: "" });
                        setHasUnsavedChanges(true);
                      }}
                      className="ml-2 text-success/60 transition hover:text-success"
                      aria-label="Зургийг хасах"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {newProblem.format === "CHOICE" ? (
              <div className="space-y-1.5 rounded-lg border border-line p-2">
                {choiceTexts.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-choice"
                      checked={correctIdx === i}
                      onChange={() => {
                        setCorrectIdx(i);
                        setHasUnsavedChanges(true);
                        saveDraftDebounced();
                      }}
                      aria-label={`${i + 1}-р сонголт зөв`}
                    />
                    <label className="sr-only" htmlFor={`choice-text-${i}`}>
                      {i + 1}-р сонголтын текст
                    </label>
                    <input
                      id={`choice-text-${i}`}
                      value={t}
                      onChange={(e) => {
                        const next = [...choiceTexts];
                        next[i] = e.target.value;
                        setChoiceTexts(next);
                        setHasUnsavedChanges(true);
                        saveDraftDebounced();
                      }}
                      placeholder={`Сонголт ${i + 1}`}
                      className={`flex-1 ${inputCls}`}
                    />
                  </div>
                ))}
              </div>
            ) : newProblem.format === "FILL_NUMBER" ? (
              <div className="space-y-2 rounded-lg border border-line bg-bg p-3">
                <p className="text-xs font-semibold text-ink-dim">
                  Нүхний хариулт (тусдаа)
                </p>
                <div className="space-y-2">
                  {Object.entries(fillNumberAnswers).map(([key]) => (
                    <div key={key} className="flex items-center gap-2">
                      <label htmlFor={`fill-key-${key}`} className="w-16 text-xs">
                        {key}:
                      </label>
                      <input
                        id={`fill-key-${key}`}
                        type="number"
                        value={fillNumberAnswers[key] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value ? parseFloat(e.target.value) : 0;
                          setFillNumberAnswers({
                            ...fillNumberAnswers,
                            [key]: val,
                          });
                          setHasUnsavedChanges(true);
                          saveDraftDebounced();
                        }}
                        className={`flex-1 ${inputCls}`}
                      />
                      <button
                        onClick={() => {
                          const next = { ...fillNumberAnswers };
                          delete next[key];
                          setFillNumberAnswers(next);
                          setHasUnsavedChanges(true);
                          saveDraftDebounced();
                        }}
                        className="rounded p-1 text-xs text-error transition hover:bg-error/10"
                        aria-label={`${key} устгах`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    id="fill-new-key"
                    placeholder="Нүхний нэр (a, b, c…)"
                    maxLength={10}
                    className={`flex-1 ${inputCls}`}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const key = (e.target as HTMLInputElement).value.trim();
                        if (key && !fillNumberAnswers[key]) {
                          setFillNumberAnswers({ ...fillNumberAnswers, [key]: 0 });
                          (e.target as HTMLInputElement).value = "";
                          setHasUnsavedChanges(true);
                          saveDraftDebounced();
                        }
                      }
                    }}
                  />
                </div>
                <div className="rounded bg-brand-bright/10 p-2 text-xs text-ink-dim">
                  <p className="font-mono">
                    JSON:{" "}
                    {JSON.stringify(fillNumberAnswers).length > 0
                      ? JSON.stringify(fillNumberAnswers)
                      : "{}"}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <label className="sr-only" htmlFor="new-problem-answer">
                  Зөв хариу
                </label>
                <input
                  id="new-problem-answer"
                  value={newProblem.correctAnswer}
                  onChange={(e) => {
                    setNewProblem({
                      ...newProblem,
                      correctAnswer: e.target.value,
                    });
                    setHasUnsavedChanges(true);
                    saveDraftDebounced();
                  }}
                  placeholder="Зөв хариу"
                  className={`w-full ${inputCls}`}
                />
              </>
            )}

            <div className="flex gap-2">
              <label className="sr-only" htmlFor="new-problem-points">
                Оноо
              </label>
              <input
                id="new-problem-points"
                type="number"
                value={newProblem.points}
                onChange={(e) => {
                  setNewProblem({
                    ...newProblem,
                    points: parseInt(e.target.value) || 1,
                  });
                  setHasUnsavedChanges(true);
                  saveDraftDebounced();
                }}
                placeholder="Оноо"
                className={`w-20 ${inputCls}`}
              />
              <label className="sr-only" htmlFor="new-problem-tags">
                Шошго
              </label>
              <input
                id="new-problem-tags"
                value={newProblem.tags}
                onChange={(e) => {
                  setNewProblem({ ...newProblem, tags: e.target.value });
                  setHasUnsavedChanges(true);
                  saveDraftDebounced();
                }}
                placeholder="Шошго (таслалаар)"
                className={`flex-1 ${inputCls}`}
              />
            </div>

            {hasUnsavedChanges && (
              <div className="rounded-lg bg-warning/10 p-3 text-xs text-warning">
                <p className="font-semibold">
                  Хадгалаагүй өөрчлөлт{" "}
                  {newProblem.format === "CHOICE" && choiceTexts[correctIdx]
                    ? `(зөв хариулт: ${choiceTexts[correctIdx].trim()})`
                    : newProblem.format === "FILL_NUMBER"
                      ? `(зөв хариулт: ${JSON.stringify(fillNumberAnswers)})`
                      : newProblem.correctAnswer
                        ? `(зөв хариулт: ${newProblem.correctAnswer})`
                        : "(бодлогын текст биш байна)"}
                </p>
                <p className="mt-1 opacity-70">Автоматаар ноорог хадгалагдаж байна</p>
              </div>
            )}

            <button onClick={createProblem} className={`w-full ${primaryBtn}`}>
              + Бодлого нэмэх
            </button>
          </div>

          <div className="mb-2">
            <button
              onClick={() => setShowDeleted((v) => !v)}
              className={pillCls(showDeleted)}
            >
              Устгагдсан{" "}
              {deletedEntries.length > 0 ? `(${deletedEntries.length})` : ""}
            </button>
          </div>

          {problems.length === 0 ? (
            <p className="text-sm text-ink-dim">Энэ бүлэгт бодлого алга байна</p>
          ) : (
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {problems.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-ink-dim">{i + 1}.</span>{" "}
                    <span className="font-mono text-xs text-ink-dim">
                      {p.token}
                    </span>{" "}
                    {p.statementText?.slice(0, 30)}
                  </span>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="shrink-0 rounded-lg border border-error/40 px-2 py-1 text-xs text-error transition hover:bg-error/10"
                  >
                    Устгах
                  </button>
                </div>
              ))}
            </div>
          )}

          {showDeleted && (
            <DeletedList entries={deletedEntries} emptyText="Устгасан бодлого алга" />
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Бодлого устгах"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        description={
          deleteTarget && (
            <p>
              <span className="font-mono">{deleteTarget.token}</span> токентой
              бодлогыг устгах гэж байна. Идэвхтэй жагсаалт, каталог, тестээс
              нуугдана (өгөгдөл устахгүй, зөвхөн нуугдана).
            </p>
          )
        }
      />
    </section>
  );
}
