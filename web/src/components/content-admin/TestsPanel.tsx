"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ConfirmDialog from "./ConfirmDialog";
import DeletedList from "./DeletedList";
import { errMsg, Msg, SUBJECT_LABEL, SUBJECTS, Subject, TestItem } from "./types";
import { DeletedEntry } from "./useDeletedLog";
import { badgeCls, pillCls } from "./ui";

interface TestsPanelProps {
  deletedEntries: DeletedEntry[];
  onDeleted: (entry: Omit<DeletedEntry, "deletedAt">) => void;
}

const GRADING_LABEL: Record<string, string> = {
  AUTO: "автомат",
  MANUAL: "гараар",
};

export default function TestsPanel({ deletedEntries, onDeleted }: TestsPanelProps) {
  const [subjectFilter, setSubjectFilter] = useState<Subject | "ALL">("ALL");
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TestItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const qs = subjectFilter === "ALL" ? "" : `?subject=${subjectFilter}`;
    api<TestItem[]>(`/tests${qs}`)
      .then(setTests)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [subjectFilter]);
  useEffect(load, [load]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api(`/tests/${deleteTarget.id}`, { method: "DELETE" });
      onDeleted({
        id: deleteTarget.id,
        kind: "test",
        label: deleteTarget.title,
        detail:
          deleteTarget._count.results > 0
            ? `${deleteTarget._count.results} сурагчийн дүн хадгалагдсаар байна`
            : undefined,
      });
      setMsg({ kind: "success", text: "✓ Тест устгагдлаа" });
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
        <h2 className="font-bold text-brand-soft">Тест</h2>
        {msg && (
          <span
            role="status"
            className={`rounded-lg px-2 py-1 text-xs ${
              msg.kind === "error"
                ? "bg-error/10 text-error"
                : "bg-success/10 text-success"
            }`}
          >
            {msg.kind === "error" ? "⚠ " : ""}
            {msg.text}
          </span>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setSubjectFilter("ALL")}
          className={pillCls(subjectFilter === "ALL")}
        >
          Бүгд
        </button>
        {SUBJECTS.map((s) => (
          <button
            key={s.v}
            onClick={() => setSubjectFilter(s.v)}
            className={pillCls(subjectFilter === s.v)}
          >
            {s.t}
          </button>
        ))}
        <button
          onClick={() => setShowDeleted((v) => !v)}
          className={`ml-auto ${pillCls(showDeleted)}`}
        >
          Устгагдсан{" "}
          {deletedEntries.length > 0 ? `(${deletedEntries.length})` : ""}
        </button>
      </div>

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}
      {error && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {error}</span>
          <button
            onClick={load}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}
      {!loading && !error && tests.length === 0 && (
        <p className="text-sm text-ink-dim">
          {subjectFilter === "ALL"
            ? "Тест алга байна"
            : `${SUBJECT_LABEL[subjectFilter]} хичээлээр тест алга байна`}
        </p>
      )}
      {!loading && !error && tests.length > 0 && (
        <div className="space-y-1.5">
          {tests.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1">
                {t.chapter?.book?.code && (
                  <span className="font-mono text-ink-dim">
                    {t.chapter.book.code}{" "}
                  </span>
                )}
                {t.title}
                {t.variantLabel && (
                  <span className={`ml-2 ${badgeCls}`}>{t.variantLabel}</span>
                )}
                <span className="block text-xs text-ink-dim">
                  {t._count.problems} бодлого · дүн{" "}
                  {GRADING_LABEL[t.gradingMode] ?? t.gradingMode} ·{" "}
                  {t._count.results} сурагч өгсөн
                </span>
              </span>
              <button
                onClick={() => setDeleteTarget(t)}
                className="shrink-0 rounded-lg border border-error/40 px-2 py-1 text-xs text-error transition hover:bg-error/10"
              >
                Устгах
              </button>
            </div>
          ))}
        </div>
      )}

      {showDeleted && (
        <DeletedList entries={deletedEntries} emptyText="Устгасан тест алга" />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Тест устгах"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        description={
          deleteTarget && (
            <div className="space-y-1">
              <p>
                <strong>{deleteTarget.title}</strong> тестийг устгах гэж
                байна ({deleteTarget._count.problems} бодлоготой).
              </p>
              {deleteTarget._count.results > 0 && (
                <p className="text-xs text-warning">
                  ⚠ {deleteTarget._count.results} сурагч энэ тестээр дүн
                  авсан байна — дүнгүүд устахгүй хадгалагдана, харин тест
                  цаашид жагсаалтад харагдахгүй болно.
                </p>
              )}
            </div>
          )
        }
      />
    </section>
  );
}
