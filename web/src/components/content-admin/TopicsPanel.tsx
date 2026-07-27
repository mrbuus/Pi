"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ConfirmDialog from "./ConfirmDialog";
import DeletedList from "./DeletedList";
import { errMsg, Msg, Topic } from "./types";
import { DeletedEntry } from "./useDeletedLog";
import { inputCls, pillCls, primaryBtn, rowCls, secondaryBtn } from "./ui";

interface TopicsPanelProps {
  deletedEntries: DeletedEntry[];
  onDeleted: (entry: Omit<DeletedEntry, "deletedAt">) => void;
}

// БҮТ-ийн үндсэн агуулгын муж (Тоо тоолол, Алгебр, Функц, Геометр,
// Магадлал...) удирдах дэлгэц — энэ хувилбараас өмнө ЕРӨНХИЙДӨӨ байгаагүй.
export default function TopicsPanel({
  deletedEntries,
  onDeleted,
}: TopicsPanelProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [newTopic, setNewTopic] = useState({ name: "", order: 0 });

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", order: 0 });
  const [editBusy, setEditBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [force, setForce] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [conflictHint, setConflictHint] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<Topic[]>("/topics")
      .then(setTopics)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function createTopic() {
    if (!newTopic.name.trim()) return;
    try {
      await api("/topics", { method: "POST", body: newTopic });
      setNewTopic({ name: "", order: topics.length });
      setMsg({ kind: "success", text: "✓ БҮТ-ийн муж үүслээ" });
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  function startEdit(t: Topic) {
    setEditId(t.id);
    setEditForm({ name: t.name, order: t.order });
  }

  async function saveEdit(t: Topic) {
    setEditBusy(true);
    try {
      await api(`/topics/${t.id}`, { method: "PATCH", body: editForm });
      setMsg({ kind: "success", text: "✓ Муж шинэчлэгдлээ" });
      setEditId(null);
      load();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setEditBusy(false);
    }
  }

  function openDelete(t: Topic) {
    setDeleteTarget(t);
    setForce(false);
    setConflictHint(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      const qs = force ? "?force=true" : "";
      const res = await api<{ deleted: boolean; unlinkedChapters: number }>(
        `/topics/${deleteTarget.id}${qs}`,
        { method: "DELETE" },
      );
      onDeleted({
        id: deleteTarget.id,
        kind: "topic",
        label: deleteTarget.name,
        detail:
          res.unlinkedChapters > 0
            ? `${res.unlinkedChapters} бүлэг сэдвээс салгасан`
            : undefined,
      });
      setMsg({ kind: "success", text: "✓ Муж устгагдлаа" });
      setDeleteTarget(null);
      load();
    } catch (e) {
      const text = errMsg(e);
      // Идэвхтэй бүлэг сэдэв холбоотой бол force сануулна (тоог урьдчилж
      // мэдэхгүй тул алдааны мессежийг ашиглана).
      if (/force=true/.test(text)) {
        setConflictHint(true);
        setMsg({ kind: "error", text });
      } else {
        setMsg({ kind: "error", text });
      }
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-brand-soft">БҮТ-ийн үндсэн мужууд</h2>
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
      <p className="mb-4 text-xs text-ink-dim">
        БҮТ-ийн агуулгын мужууд (жиш: Тоо тоолол, Алгебр, Функц, Геометр,
        Магадлал) — бүлэг сэдвүүд эдгээрийн аль нэгэнд ангилагдана
        («Бүлэг сэдэв» дэлгэцийн засах хэсгээс холбоно).
      </p>

      <div className="mb-4 flex gap-2">
        <label className="sr-only" htmlFor="new-topic-name">
          Нэр
        </label>
        <input
          id="new-topic-name"
          value={newTopic.name}
          onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
          placeholder="Мужийн нэр (ж: Алгебр)"
          className={`flex-1 ${inputCls}`}
        />
        <label className="sr-only" htmlFor="new-topic-order">
          Дараалал
        </label>
        <input
          id="new-topic-order"
          type="number"
          value={newTopic.order}
          onChange={(e) =>
            setNewTopic({ ...newTopic, order: parseInt(e.target.value) || 0 })
          }
          placeholder="Дараалал"
          className={`w-24 ${inputCls}`}
        />
        <button onClick={createTopic} className={`${primaryBtn} px-4`}>
          + Нэмэх
        </button>
      </div>

      <div className="mb-3">
        <button
          onClick={() => setShowDeleted((v) => !v)}
          className={pillCls(showDeleted)}
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
      {!loading && !error && topics.length === 0 && (
        <p className="text-sm text-ink-dim">БҮТ-ийн муж алга байна</p>
      )}
      {!loading && !error && topics.length > 0 && (
        <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) =>
            editId === t.id ? (
              <div
                key={t.id}
                className="space-y-2 rounded-lg border border-brand-bright bg-brand-bright/5 p-3"
              >
                <label className="sr-only" htmlFor={`edit-topic-name-${t.id}`}>
                  Нэр
                </label>
                <input
                  id={`edit-topic-name-${t.id}`}
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  className={`w-full ${inputCls}`}
                />
                <input
                  type="number"
                  aria-label="Дараалал"
                  value={editForm.order}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                  className={`w-full ${inputCls}`}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(t)}
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
              <div key={t.id} className={rowCls(false)}>
                <span className="flex-1">
                  <span className="text-ink-dim">{t.order}.</span> {t.name}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => startEdit(t)}
                    className="rounded-lg border border-line px-2 py-1 text-xs text-ink-dim transition hover:border-brand hover:text-ink"
                  >
                    Засах
                  </button>
                  <button
                    onClick={() => openDelete(t)}
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
        <DeletedList entries={deletedEntries} emptyText="Устгасан муж алга" />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="БҮТ-ийн муж устгах"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        description={
          deleteTarget && (
            <div className="space-y-2">
              <p>
                <strong>{deleteTarget.name}</strong> мужийг устгах гэж байна.
              </p>
              <label className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Хэрэв идэвхтэй бүлэг сэдэв энэ мужид холбоотой бол тэднийг
                  ЗӨВХӨН энэ мужаас салгаад (topicId-г хоослоод) устгах —
                  бүлэг сэдвүүд ӨӨРСДӨӨ устгагдахгүй, зөвхөн ангилалгүй болно.
                </span>
              </label>
              {conflictHint && !force && (
                <p className="text-xs text-error">
                  ⚠ Сервер: идэвхтэй бүлэг сэдэв холбоотой тул дээрх сонголтыг
                  идэвхжүүлж дахин оролдоно уу.
                </p>
              )}
            </div>
          )
        }
      />
    </section>
  );
}
