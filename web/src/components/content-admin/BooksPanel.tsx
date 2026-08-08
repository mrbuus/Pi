"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import ConfirmDialog from "./ConfirmDialog";
import DeletedList from "./DeletedList";
import { Book, errMsg, Msg, SUBJECT_LABEL, SUBJECTS, Subject } from "./types";
import { DeletedEntry } from "./useDeletedLog";
import {
  badgeCls,
  inputCls,
  pillCls,
  primaryBtn,
  rowCls,
  secondaryBtn,
} from "./ui";

interface BooksPanelProps {
  selectedId: string;
  onSelect: (id: string, book: Book | null) => void;
  deletedEntries: DeletedEntry[];
  onDeleted: (entry: Omit<DeletedEntry, "deletedAt">) => void;
}

export default function BooksPanel({
  selectedId,
  onSelect,
  deletedEntries,
  onDeleted,
}: BooksPanelProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState<Subject | "ALL">("ALL");
  const [msg, setMsg] = useState<Msg>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [newBook, setNewBook] = useState<{
    code: string;
    title: string;
    subject: Subject;
  }>({ code: "", title: "", subject: "MATH" });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    subject: Subject;
    archived: boolean;
  }>({ title: "", subject: "MATH", archived: false });
  const [editBusy, setEditBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [cascade, setCascade] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const qs = subjectFilter === "ALL" ? "" : `?subject=${subjectFilter}`;
    api<Book[]>(`/books${qs}`)
      .then(setBooks)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [subjectFilter]);
  useEffect(load, [load]);

  async function createBook() {
    if (!newBook.code.trim() || !newBook.title.trim()) return;
    try {
      await api("/books", { method: "POST", body: newBook });
      setNewBook({ code: "", title: "", subject: newBook.subject });
      setMsg({ kind: "success", text: "Ном үүслээ" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  function startEdit(b: Book) {
    setEditId(b.id);
    setEditForm({ title: b.title, subject: b.subject, archived: b.archived });
  }

  async function saveEdit(b: Book) {
    setEditBusy(true);
    try {
      await api(`/books/${b.id}`, { method: "PATCH", body: editForm });
      setMsg({ kind: "success", text: "Ном шинэчлэгдлээ" });
      setEditId(null);
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setEditBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const qs = cascade ? "?cascade=true" : "";
      const res = await api<{ deleted: boolean; cascadedChapters: number }>(
        `/books/${deleteTarget.id}${qs}`,
        { method: "DELETE" },
      );
      onDeleted({
        id: deleteTarget.id,
        kind: "book",
        label: `${deleteTarget.code} — ${deleteTarget.title}`,
        detail:
          res.cascadedChapters > 0
            ? `${res.cascadedChapters} бүлэг сэдэв хамт устгагдсан`
            : undefined,
      });
      setMsg({ kind: "success", text: "Ном устгагдлаа" });
      if (selectedId === deleteTarget.id) onSelect("", null);
      setDeleteTarget(null);
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setDeleteBusy(false);
    }
  }

  const chapterCount = deleteTarget?._count.chapters ?? 0;
  const problemCount = deleteTarget?.problemCount ?? 0;

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-brand-soft">1. Ном</h2>
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

      <div className="mb-3 space-y-2">
        <label className="sr-only" htmlFor="new-book-code">
          Код
        </label>
        <input
          id="new-book-code"
          value={newBook.code}
          onChange={(e) => setNewBook({ ...newBook, code: e.target.value })}
          placeholder="Код (ж: 100)"
          className={`w-full ${inputCls}`}
        />
        <label className="sr-only" htmlFor="new-book-title">
          Нэр
        </label>
        <input
          id="new-book-title"
          value={newBook.title}
          onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
          placeholder="Нэр (ж: 100x100 суурь)"
          className={`w-full ${inputCls}`}
        />
        <label className="sr-only" htmlFor="new-book-subject">
          Хичээл
        </label>
        <select
          id="new-book-subject"
          value={newBook.subject}
          onChange={(e) =>
            setNewBook({ ...newBook, subject: e.target.value as Subject })
          }
          className={`w-full bg-bg ${inputCls}`}
        >
          {SUBJECTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.t}
            </option>
          ))}
        </select>
        <button onClick={createBook} className={`w-full ${primaryBtn}`}>
          + Ном нэмэх
        </button>
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
          <AlertTriangle size={16} className="shrink-0" aria-hidden="true" />
          <span>{error}</span>
          <button
            onClick={load}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}
      {!loading && !error && books.length === 0 && (
        <p className="text-sm text-ink-dim">
          {subjectFilter === "ALL"
            ? "Ном алга байна"
            : `${SUBJECT_LABEL[subjectFilter]} хичээлээр ном алга байна`}
        </p>
      )}
      {!loading && !error && books.length > 0 && (
        <div className="space-y-1">
          {books.map((b) =>
            editId === b.id ? (
              <div
                key={b.id}
                className="space-y-2 rounded-lg border border-brand-bright bg-brand-bright/5 p-3"
              >
                <p className="text-xs text-ink-dim">
                  Код: <span className="font-mono">{b.code}</span> (код засах
                  боломжгүй — бодлогын token үүнээс хамаардаг тул шинэ ном
                  үүсгэнэ үү)
                </p>
                <label className="sr-only" htmlFor={`edit-book-title-${b.id}`}>
                  Нэр
                </label>
                <input
                  id={`edit-book-title-${b.id}`}
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className={`w-full ${inputCls}`}
                />
                <label
                  className="sr-only"
                  htmlFor={`edit-book-subject-${b.id}`}
                >
                  Хичээл
                </label>
                <select
                  id={`edit-book-subject-${b.id}`}
                  value={editForm.subject}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      subject: e.target.value as Subject,
                    })
                  }
                  className={`w-full bg-bg ${inputCls}`}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.t}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-ink-dim">
                  <input
                    type="checkbox"
                    checked={editForm.archived}
                    onChange={(e) =>
                      setEditForm({ ...editForm, archived: e.target.checked })
                    }
                  />
                  Архивлах (жагсаалт болон каталогоос нуугдана)
                </label>
                {editForm.archived && (
                  <p className="flex gap-2 text-xs text-warning">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Архивласны дараа энэ ном энэ жагсаалтаас ч нуугдана —
                    буцаан идэвхжүүлэхийн тулд энд дахин олж «Устгагдсан»
                    хэсгээс биш, шууд датагаас хайх шаардлагатай болно.</span>
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(b)}
                    disabled={editBusy}
                    className={`flex-1 ${primaryBtn}`}
                  >
                    {editBusy ? "Хадгалж байна…" : "Хадгалах"}
                  </button>
                  <button
                    onClick={() => setEditId(null)}
                    className={secondaryBtn}
                  >
                    Цуцлах
                  </button>
                </div>
              </div>
            ) : (
              <div key={b.id} className={rowCls(selectedId === b.id)}>
                <button
                  onClick={() => onSelect(b.id, b)}
                  className="flex-1 text-left"
                >
                  <span>
                    <span className="font-mono text-ink-dim">{b.code}</span>{" "}
                    {b.title}
                    <span className={`ml-2 ${badgeCls}`}>
                      {SUBJECT_LABEL[b.subject] ?? b.subject}
                    </span>
                  </span>
                  <span className="block text-xs text-ink-dim">
                    <Meta items={[
                      `${b._count.chapters} бүлэг`,
                      typeof b.problemCount === "number" && `${b.problemCount} бодлого`
                    ]} />
                  </span>
                </button>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(b)}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-ink-dim transition hover:border-brand hover:text-ink"
                  >
                    Засах
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(b);
                      setCascade(false);
                    }}
                    className="rounded-lg border border-error/40 px-2 py-1 text-xs text-error transition hover:bg-error/10"
                  >
                    Устгах
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {showDeleted && (
        <DeletedList entries={deletedEntries} emptyText="Устгасан ном алга" />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Ном устгах"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        disableConfirm={chapterCount > 0 && !cascade}
        description={
          deleteTarget && (
            <div className="space-y-2">
              <p>
                <span className="font-mono">{deleteTarget.code}</span> —{" "}
                <strong>{deleteTarget.title}</strong> номыг устгах гэж байна.
                Энэ номд{" "}
                <strong>
                  {chapterCount} бүлэг сэдэв, {problemCount} бодлого
                </strong>{" "}
                байна.
              </p>
              {chapterCount > 0 ? (
                <label className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={cascade}
                    onChange={(e) => setCascade(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Бүлэг сэдвүүдийг нь хамт устгах (cascade). Үүнийг сонговол{" "}
                    <strong>{chapterCount}</strong> бүлэг сэдэв идэвхтэй
                    жагсаалт болон каталогоос нуугдана (өгөгдөл устахгүй,
                    зөвхөн нуугдана).
                  </span>
                </label>
              ) : (
                <p className="text-xs text-ink-dim">
                  Бүлэг сэдэвгүй тул шууд устгаж болно (зөөлөн устгал — сервер
                  дээр хадгалагдаж үлдэнэ).
                </p>
              )}
              {chapterCount > 0 && !cascade && (
                <p className="flex gap-2 text-xs text-error">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
                  <span>Дээрх сонголтыг идэвхжүүлэлгүйгээр устгах товч дарвал
                  сервер алдаа буцаана.</span>
                </p>
              )}
            </div>
          )
        }
      />
    </section>
  );
}
