"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";
import { api } from "@/lib/api";
import ConfirmDialog from "./ConfirmDialog";
import DeletedList from "./DeletedList";
import {
  ChapterWithVideos,
  Chapter as ChapterType,
  errMsg,
  Msg,
  SUBJECT_LABEL,
  SUBJECTS,
  Subject,
  VideoItem,
} from "./types";
import { DeletedEntry } from "./useDeletedLog";
import { badgeCls, inputCls, pillCls, primaryBtn, secondaryBtn } from "./ui";

interface VideosPanelProps {
  deletedEntries: DeletedEntry[];
  onDeleted: (entry: Omit<DeletedEntry, "deletedAt">) => void;
}

export default function VideosPanel({
  deletedEntries,
  onDeleted,
}: VideosPanelProps) {
  const [subjectFilter, setSubjectFilter] = useState<Subject | "ALL">("ALL");
  const [chapters, setChapters] = useState<ChapterWithVideos[]>([]);
  const [allChapters, setAllChapters] = useState<ChapterType[]>([]);
  const [chapterId, setChapterId] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: "", url: "", chapterId: "" });
  const [editBusy, setEditBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<VideoItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadChapters = useCallback(() => {
    const qs = subjectFilter === "ALL" ? "" : `?subject=${subjectFilter}`;
    api<ChapterWithVideos[]>(`/videos/chapters${qs}`)
      .then((cs) => {
        setChapters(cs);
        if (chapterId && !cs.some((c) => c.id === chapterId)) setChapterId("");
      })
      .catch((e) => setMsg({ kind: "error", text: errMsg(e) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectFilter]);
  useEffect(loadChapters, [loadChapters]);

  useEffect(() => {
    const qs = subjectFilter === "ALL" ? "" : `?subject=${subjectFilter}`;
    api<ChapterType[]>(`/chapters${qs}`)
      .then(setAllChapters)
      .catch(() => setAllChapters([]));
  }, [subjectFilter]);

  const loadVideos = useCallback(() => {
    if (!chapterId) {
      setVideos([]);
      return;
    }
    api<VideoItem[]>(`/videos?chapterId=${chapterId}`)
      .then(setVideos)
      .catch((e) => setMsg({ kind: "error", text: errMsg(e) }));
  }, [chapterId]);
  useEffect(loadVideos, [loadVideos]);

  function startEdit(v: VideoItem) {
    setEditId(v.id);
    setEditForm({ title: v.title, url: v.s3Key, chapterId: v.chapterId ?? "" });
  }

  async function saveEdit(v: VideoItem) {
    setEditBusy(true);
    try {
      await api(`/videos/${v.id}`, {
        method: "PATCH",
        body: {
          title: editForm.title,
          url: editForm.url,
          chapterId: editForm.chapterId,
        },
      });
      setMsg({ kind: "success", text: "Бичлэг шинэчлэгдлээ" });
      setEditId(null);
      loadChapters();
      loadVideos();
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
      await api(`/videos/${deleteTarget.id}`, { method: "DELETE" });
      onDeleted({
        id: deleteTarget.id,
        kind: "video",
        label: deleteTarget.title,
      });
      setMsg({ kind: "success", text: "Бичлэг устгагдлаа" });
      setDeleteTarget(null);
      loadChapters();
      loadVideos();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-bold text-brand-soft">Бичлэг</h2>
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

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-dim">
            Бичлэгтэй бүлэг сэдвүүд
          </label>
          {chapters.length === 0 ? (
            <p className="text-sm text-ink-dim">
              {subjectFilter === "ALL"
                ? "Бичлэгтэй бүлэг сэдэв алга байна"
                : `${SUBJECT_LABEL[subjectFilter]} хичээлээр бичлэгтэй бүлэг алга байна`}
            </p>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {chapters.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setChapterId(c.id)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                    chapterId === c.id
                      ? "border-brand-bright bg-brand-bright/10"
                      : "border-line hover:border-brand"
                  }`}
                >
                  <span>
                    {c.book && (
                      <span className="font-mono text-ink-dim">
                        {c.book.code}{" "}
                      </span>
                    )}
                    {c.title}
                  </span>
                  <span className={badgeCls}>{c._count.videos} бичлэг</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-ink-dim">
            Бичлэгүүд
          </label>
          {!chapterId ? (
            <p className="text-sm text-ink-dim">Эхлээд бүлэг сэдэв сонгоно уу</p>
          ) : videos.length === 0 ? (
            <p className="text-sm text-ink-dim">Энэ бүлэгт бичлэг алга байна</p>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto">
              {videos.map((v) =>
                editId === v.id ? (
                  <div
                    key={v.id}
                    className="space-y-2 rounded-lg border border-brand-bright bg-brand-bright/5 p-3"
                  >
                    <label className="sr-only" htmlFor={`edit-video-title-${v.id}`}>
                      Гарчиг
                    </label>
                    <input
                      id={`edit-video-title-${v.id}`}
                      value={editForm.title}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                      placeholder="Гарчиг"
                      className={`w-full ${inputCls}`}
                    />
                    <label className="sr-only" htmlFor={`edit-video-url-${v.id}`}>
                      Холбоос
                    </label>
                    <input
                      id={`edit-video-url-${v.id}`}
                      value={editForm.url}
                      onChange={(e) =>
                        setEditForm({ ...editForm, url: e.target.value })
                      }
                      placeholder="https://…"
                      className={`w-full ${inputCls}`}
                    />
                    <label
                      className="text-xs text-ink-dim"
                      htmlFor={`edit-video-chapter-${v.id}`}
                    >
                      Бүлэг сэдэв
                    </label>
                    <select
                      id={`edit-video-chapter-${v.id}`}
                      value={editForm.chapterId}
                      onChange={(e) =>
                        setEditForm({ ...editForm, chapterId: e.target.value })
                      }
                      className={`w-full bg-bg ${inputCls}`}
                    >
                      {allChapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.book ? `${c.book.code} — ` : ""}
                          {c.title}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(v)}
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
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate">{v.title}</span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => startEdit(v)}
                        className="rounded-lg border border-line px-2 py-1 text-xs text-ink-dim transition hover:border-brand hover:text-ink"
                      >
                        Засах
                      </button>
                      <button
                        onClick={() => setDeleteTarget(v)}
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
        </div>
      </div>

      {showDeleted && (
        <DeletedList entries={deletedEntries} emptyText="Устгасан бичлэг алга" />
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Бичлэг устгах"
        danger
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        description={
          deleteTarget && (
            <p>
              <strong>{deleteTarget.title}</strong> бичлэгийг устгах гэж
              байна. Идэвхтэй жагсаалтаас нуугдана (өгөгдөл устахгүй, зөвхөн
              нуугдана).
            </p>
          )
        }
      />
    </section>
  );
}
