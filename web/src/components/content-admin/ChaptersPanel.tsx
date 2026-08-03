"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmDialog from "./ConfirmDialog";
import DeletedList from "./DeletedList";
import { Book, Chapter, errMsg, Msg, Topic } from "./types";
import { DeletedEntry } from "./useDeletedLog";
import { inputCls, pillCls, primaryBtn, rowCls, secondaryBtn } from "./ui";

interface ChaptersPanelProps {
  bookId: string;
  books: Book[];
  selectedId: string;
  onSelect: (id: string, chapter: Chapter | null) => void;
  deletedEntries: DeletedEntry[];
  onDeleted: (entry: Omit<DeletedEntry, "deletedAt">) => void;
}

export default function ChaptersPanel({
  bookId,
  books,
  selectedId,
  onSelect,
  deletedEntries,
  onDeleted,
}: ChaptersPanelProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [reorderBusyId, setReorderBusyId] = useState<string | null>(null);

  const [newChapter, setNewChapter] = useState({
    title: "",
    order: 1,
    grade: 12,
    freePreview: false,
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    order: number;
    grade: number;
    freePreview: boolean;
    bookId: string;
    topicId: string;
  }>({
    title: "",
    order: 1,
    grade: 12,
    freePreview: false,
    bookId: "",
    topicId: "",
  });
  const [editBusy, setEditBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(() => {
    if (!bookId) return;
    api<Chapter[]>(`/chapters?bookId=${bookId}`)
      .then(setChapters)
      .catch((e) => setMsg({ kind: "error", text: errMsg(e) }));
  }, [bookId]);
  useEffect(load, [load]);

  useEffect(() => {
    api<Topic[]>("/topics")
      .then(setTopics)
      .catch(() => setTopics([]));
  }, []);

  async function createChapter() {
    if (!bookId || !newChapter.title.trim()) return;
    try {
      await api("/chapters", { method: "POST", body: { bookId, ...newChapter } });
      setNewChapter({
        title: "",
        order: chapters.length + 1,
        grade: 12,
        freePreview: false,
      });
      setMsg({ kind: "success", text: "Бүлэг сэдэв үүслээ" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  function startEdit(c: Chapter) {
    setEditId(c.id);
    setEditForm({
      title: c.title,
      order: c.order,
      grade: c.grade ?? 12,
      freePreview: c.freePreview,
      bookId: c.bookId ?? "",
      topicId: c.topicId ?? "",
    });
  }

  async function saveEdit(c: Chapter) {
    setEditBusy(true);
    try {
      await api(`/chapters/${c.id}`, {
        method: "PATCH",
        body: {
          title: editForm.title,
          order: editForm.order,
          grade: editForm.grade,
          freePreview: editForm.freePreview,
          bookId: editForm.bookId || null,
          topicId: editForm.topicId || null,
        },
      });
      setMsg({ kind: "success", text: "Бүлэг сэдэв шинэчлэгдлээ" });
      setEditId(null);
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setEditBusy(false);
    }
  }

  // дээш/доош: харагдаж буй жагсаалтын байрлалыг сольж, ЗӨВХӨН энэ номын
  // бүлгүүдийн шинэ дарааллыг PATCH /chapters/reorder-д илгээнэ.
  async function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= chapters.length) return;
    const next = [...chapters];
    [next[index], next[j]] = [next[j], next[index]];
    setChapters(next);
    setReorderBusyId(next[index].id);
    try {
      await api("/chapters/reorder", {
        method: "PATCH",
        body: { ids: next.map((c) => c.id) },
      });
      setMsg({ kind: "success", text: "Дараалал шинэчлэгдлээ" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
      load();
    } finally {
      setReorderBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api(`/chapters/${deleteTarget.id}`, { method: "DELETE" });
      onDeleted({
        id: deleteTarget.id,
        kind: "chapter",
        label: deleteTarget.title,
        detail: `${deleteTarget._count.problems} бодлого`,
      });
      setMsg({ kind: "success", text: "Бүлэг сэдэв устгагдлаа" });
      if (selectedId === deleteTarget.id) onSelect("", null);
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
        <h2 className="font-bold text-brand-soft">2. Бүлэг сэдэв</h2>
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

      {!bookId ? (
        <p className="text-sm text-ink-dim">Эхлээд ном сонгоно уу</p>
      ) : (
        <>
          <div className="mb-3 space-y-2">
            <label className="sr-only" htmlFor="new-chapter-title">
              Сэдвийн нэр
            </label>
            <input
              id="new-chapter-title"
              value={newChapter.title}
              onChange={(e) =>
                setNewChapter({ ...newChapter, title: e.target.value })
              }
              placeholder="Сэдвийн нэр (ж: Тэгшитгэл)"
              className={`w-full ${inputCls}`}
            />
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="new-chapter-order">
                Дараалал
              </label>
              <input
                id="new-chapter-order"
                type="number"
                value={newChapter.order}
                onChange={(e) =>
                  setNewChapter({
                    ...newChapter,
                    order: parseInt(e.target.value) || 1,
                  })
                }
                placeholder="Дараалал"
                className={`w-20 ${inputCls}`}
              />
              <label className="sr-only" htmlFor="new-chapter-grade">
                Анги
              </label>
              <select
                id="new-chapter-grade"
                value={newChapter.grade}
                onChange={(e) =>
                  setNewChapter({
                    ...newChapter,
                    grade: parseInt(e.target.value),
                  })
                }
                className={`flex-1 bg-bg ${inputCls}`}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    {g}-р анги
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs text-ink-dim">
              <input
                type="checkbox"
                checked={newChapter.freePreview}
                onChange={(e) =>
                  setNewChapter({
                    ...newChapter,
                    freePreview: e.target.checked,
                  })
                }
              />
              Нийтэд үнэгүй (preview)
            </label>
            <button onClick={createChapter} className={`w-full ${primaryBtn}`}>
              + Бүлэг нэмэх
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

          {chapters.length === 0 ? (
            <p className="text-sm text-ink-dim">Энэ номд бүлэг алга байна</p>
          ) : (
            <div className="space-y-1">
              {chapters.map((c, i) =>
                editId === c.id ? (
                  <div
                    key={c.id}
                    className="space-y-2 rounded-lg border border-brand-bright bg-brand-bright/5 p-3"
                  >
                    <label className="sr-only" htmlFor={`edit-ch-title-${c.id}`}>
                      Нэр
                    </label>
                    <input
                      id={`edit-ch-title-${c.id}`}
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      className={`w-full ${inputCls}`}
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        aria-label="Дараалал"
                        value={editForm.order}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            order: parseInt(e.target.value) || 1,
                          })
                        }
                        className={`w-20 ${inputCls}`}
                      />
                      <select
                        aria-label="Анги"
                        value={editForm.grade}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            grade: parseInt(e.target.value),
                          })
                        }
                        className={`flex-1 bg-bg ${inputCls}`}
                      >
                        {Array.from({ length: 12 }, (_, g) => g + 1).map(
                          (g) => (
                            <option key={g} value={g}>
                              {g}-р анги
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <label
                      className="text-xs text-ink-dim"
                      htmlFor={`edit-ch-book-${c.id}`}
                    >
                      Ном
                    </label>
                    <select
                      id={`edit-ch-book-${c.id}`}
                      value={editForm.bookId}
                      onChange={(e) =>
                        setEditForm({ ...editForm, bookId: e.target.value })
                      }
                      className={`w-full bg-bg ${inputCls}`}
                    >
                      <option value="">— номгүй —</option>
                      {books.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} — {b.title}
                        </option>
                      ))}
                    </select>
                    <label
                      className="text-xs text-ink-dim"
                      htmlFor={`edit-ch-topic-${c.id}`}
                    >
                      БҮТ-ийн муж
                    </label>
                    <select
                      id={`edit-ch-topic-${c.id}`}
                      value={editForm.topicId}
                      onChange={(e) =>
                        setEditForm({ ...editForm, topicId: e.target.value })
                      }
                      className={`w-full bg-bg ${inputCls}`}
                    >
                      <option value="">— мужгүй —</option>
                      {topics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 text-xs text-ink-dim">
                      <input
                        type="checkbox"
                        checked={editForm.freePreview}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            freePreview: e.target.checked,
                          })
                        }
                      />
                      Нийтэд үнэгүй (preview)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c)}
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
                  <div key={c.id} className={rowCls(selectedId === c.id)}>
                    <div className="flex shrink-0 flex-col gap-0.5">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || reorderBusyId !== null}
                        aria-label="Дээш зөөх"
                        className="flex h-5 w-5 items-center justify-center rounded border border-line text-[10px] text-ink-dim transition hover:border-brand disabled:opacity-30"
                      >
                        <ChevronUp className="h-3 w-3" aria-hidden />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === chapters.length - 1 || reorderBusyId !== null}
                        aria-label="Доош зөөх"
                        className="flex h-5 w-5 items-center justify-center rounded border border-line text-[10px] text-ink-dim transition hover:border-brand disabled:opacity-30"
                      >
                        <ChevronDown className="h-3 w-3" aria-hidden />
                      </button>
                    </div>
                    <button
                      onClick={() => onSelect(c.id, c)}
                      className="flex-1 text-left"
                    >
                      <span>
                        {c.order}. {c.title}
                        {c.freePreview && (
                          <span className="ml-1 text-xs text-success">
                            үнэгүй
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-ink-dim">
                        {c._count.problems} бодлого
                      </span>
                    </button>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(c)}
                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink-dim transition hover:border-brand hover:text-ink"
                      >
                        Засах
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
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
            <DeletedList
              entries={deletedEntries}
              emptyText="Устгасан бүлэг сэдэв алга"
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Бүлэг сэдэв устгах"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        description={
          deleteTarget && (
            <p>
              <strong>{deleteTarget.title}</strong> бүлэг сэдвийг устгах гэж
              байна. Дотор нь{" "}
              <strong>{deleteTarget._count.problems} бодлого</strong> байгаа —
              эдгээр нь идэвхтэй жагсаалт болон каталогоос нуугдана (өгөгдөл
              устахгүй, зөвхөн нуугдана).
            </p>
          )
        }
      />
    </section>
  );
}
