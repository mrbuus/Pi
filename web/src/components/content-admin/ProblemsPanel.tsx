"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmDialog from "./ConfirmDialog";
import DeletedList from "./DeletedList";
import { errMsg, FORMATS, Msg, Problem } from "./types";
import { DeletedEntry } from "./useDeletedLog";
import { inputCls, pillCls, primaryBtn } from "./ui";

interface ProblemsPanelProps {
  chapterId: string;
  deletedEntries: DeletedEntry[];
  onDeleted: (entry: Omit<DeletedEntry, "deletedAt">) => void;
}

export default function ProblemsPanel({
  chapterId,
  deletedEntries,
  onDeleted,
}: ProblemsPanelProps) {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [showDeleted, setShowDeleted] = useState(false);

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

  const [deleteTarget, setDeleteTarget] = useState<Problem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    if (!chapterId) return;
    api<Problem[]>(`/chapters/${chapterId}/problems`)
      .then(setProblems)
      .catch((e) => {
        setProblems([]);
        setMsg({ kind: "error", text: errMsg(e) });
      });
  }, [chapterId]);
  useEffect(load, [load]);

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
    if (newProblem.format === "FILL_NUMBER" && correctAnswer) {
      try {
        correctAnswer = JSON.parse(newProblem.correctAnswer);
      } catch {
        /* стринг хэвээр үлдээнэ */
      }
    }
    try {
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
      setMsg({ kind: "success", text: "Бодлого үүслээ" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
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
              onChange={(e) =>
                setNewProblem({ ...newProblem, statementText: e.target.value })
              }
              placeholder="Бодлогын текст"
              rows={2}
              className={`w-full ${inputCls}`}
            />
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

            {newProblem.format === "CHOICE" ? (
              <div className="space-y-1.5 rounded-lg border border-line p-2">
                {choiceTexts.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct-choice"
                      checked={correctIdx === i}
                      onChange={() => setCorrectIdx(i)}
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
                      }}
                      placeholder={`Сонголт ${i + 1}`}
                      className={`flex-1 ${inputCls}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <label className="sr-only" htmlFor="new-problem-answer">
                  Зөв хариу
                </label>
                <input
                  id="new-problem-answer"
                  value={newProblem.correctAnswer}
                  onChange={(e) =>
                    setNewProblem({
                      ...newProblem,
                      correctAnswer: e.target.value,
                    })
                  }
                  placeholder={
                    newProblem.format === "FILL_NUMBER"
                      ? 'Зөв хариу (ж: {"a":4,"b":2})'
                      : "Зөв хариу"
                  }
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
                onChange={(e) =>
                  setNewProblem({
                    ...newProblem,
                    points: parseInt(e.target.value) || 1,
                  })
                }
                placeholder="Оноо"
                className={`w-20 ${inputCls}`}
              />
              <label className="sr-only" htmlFor="new-problem-tags">
                Шошго
              </label>
              <input
                id="new-problem-tags"
                value={newProblem.tags}
                onChange={(e) =>
                  setNewProblem({ ...newProblem, tags: e.target.value })
                }
                placeholder="Шошго (таслалаар)"
                className={`flex-1 ${inputCls}`}
              />
            </div>
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
