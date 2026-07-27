"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { StudentNote, StudentNoteType, errMsg } from "./types";

const TABS: { type: StudentNoteType; label: string }[] = [
  { type: "GENERAL", label: "Сурагчийн тэмдэглэл" },
  { type: "PAYMENT", label: "Төлбөрийн тэмдэглэл" },
];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StudentNotesPanel({
  studentId,
  paymentNotesBlocked,
  paymentNotesBlockedReason,
}: {
  studentId: string;
  /** Жилийн төлбөрөө бүтэн төлсөн сурагчид backend PAYMENT тэмдэглэл үүсгэхийг
   * (400) татгалзана — түүнийг оролдоод алдаа хүлээхийн оронд compose box-г
   * ЭНД урьдчилан идэвхгүй болгоно (notes.service.ts assertPaymentNoteAllowed). */
  paymentNotesBlocked: boolean;
  paymentNotesBlockedReason: string;
}) {
  const [tab, setTab] = useState<StudentNoteType>("GENERAL");
  const [notes, setNotes] = useState<StudentNote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<StudentNote[]>(`/students/${studentId}/notes`)
      .then(setNotes)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(load, [load]);

  const visible = useMemo(
    () => (notes ?? []).filter((n) => n.type === tab),
    [notes, tab],
  );

  const composeBlocked = tab === "PAYMENT" && paymentNotesBlocked;

  async function create() {
    const body = draft.trim();
    if (!body || composeBlocked) return;
    setSaving(true);
    setMsg(null);
    try {
      const note = await api<StudentNote>(`/students/${studentId}/notes`, {
        method: "POST",
        body: { type: tab, body },
      });
      setNotes((prev) => [note, ...(prev ?? [])]);
      setDraft("");
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  }

  async function toggleResolve(note: StudentNote) {
    const resolving = !note.resolvedAt;
    const prev = notes;
    // Оптимист — шууд UI шинэчилж, амжилтгүй бол буцаана.
    setNotes(
      (cur) =>
        cur?.map((n) =>
          n.id === note.id
            ? { ...n, resolvedAt: resolving ? new Date().toISOString() : null }
            : n,
        ) ?? cur,
    );
    try {
      const updated = await api<StudentNote>(`/notes/${note.id}`, {
        method: "PATCH",
        body: { resolvedAt: resolving ? new Date().toISOString() : null },
      });
      setNotes((cur) => cur?.map((n) => (n.id === note.id ? updated : n)) ?? cur);
    } catch (e) {
      setNotes(prev ?? null);
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  function startEdit(note: StudentNote) {
    setEditingId(note.id);
    setEditVal(note.body);
  }

  async function saveEdit(note: StudentNote) {
    const body = editVal.trim();
    if (!body) return;
    const prev = notes;
    setNotes((cur) => cur?.map((n) => (n.id === note.id ? { ...n, body } : n)) ?? cur);
    setEditingId(null);
    try {
      const updated = await api<StudentNote>(`/notes/${note.id}`, {
        method: "PATCH",
        body: { body },
      });
      setNotes((cur) => cur?.map((n) => (n.id === note.id ? updated : n)) ?? cur);
    } catch (e) {
      setNotes(prev ?? null);
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  async function remove(id: string) {
    const prev = notes;
    setNotes((cur) => cur?.filter((n) => n.id !== id) ?? cur);
    setDeleteTarget(null);
    try {
      await api(`/notes/${id}`, { method: "DELETE" });
    } catch (e) {
      setNotes(prev ?? null);
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <h2 className="mb-3 font-bold text-brand-soft">Тэмдэглэл</h2>

      <div className="mb-4 flex gap-2 border-b border-line pb-2">
        {TABS.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => setTab(t.type)}
            aria-pressed={tab === t.type}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === t.type
                ? "bg-brand-bright/20 text-brand-soft"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}
      {error && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {error}</span>
          <button
            onClick={load}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Бичих хэсэг */}
          {composeBlocked ? (
            <div className="mb-4 rounded-xl border border-line bg-ink/[0.03] px-4 py-3 text-sm text-ink-dim">
              ℹ️ {paymentNotesBlockedReason}
            </div>
          ) : (
            <div className="mb-4">
              <label className="sr-only" htmlFor="note-draft">
                Шинэ тэмдэглэл
              </label>
              <textarea
                id="note-draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder={
                  tab === "GENERAL"
                    ? "Сурагчийн талаарх тэмдэглэл бичих…"
                    : "Төлбөртэй холбоотой тэмдэглэл бичих…"
                }
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus-visible:border-brand"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                {msg && (
                  <span
                    className={`text-xs ${msg.kind === "error" ? "text-error" : "text-success"}`}
                  >
                    {msg.kind === "error" ? "⚠ " : "✓ "}
                    {msg.text}
                  </span>
                )}
                <button
                  type="button"
                  onClick={create}
                  disabled={saving || !draft.trim()}
                  className="ml-auto rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50"
                >
                  {saving ? "Хадгалж байна…" : "Нэмэх"}
                </button>
              </div>
            </div>
          )}

          {/* Жагсаалт */}
          {visible.length === 0 ? (
            <p className="text-sm text-ink-dim">Тэмдэглэл алга байна</p>
          ) : (
            <div className="space-y-2">
              {visible.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-xl border p-3 text-sm ${
                    n.resolvedAt ? "border-line opacity-70" : "border-line"
                  }`}
                >
                  {editingId === n.id ? (
                    <div>
                      <textarea
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus-visible:border-brand"
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-dim transition hover:text-ink"
                        >
                          Болих
                        </button>
                        <button
                          onClick={() => saveEdit(n)}
                          className="rounded-lg bg-brand-bright px-3 py-1.5 text-xs font-bold text-on-brand"
                        >
                          Хадгалах
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-ink">{n.body}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-dim">
                        <span>{formatDateTime(n.createdAt)}</span>
                        {n.resolvedAt && (
                          <span className="rounded-full bg-success/10 px-2 py-0.5 font-semibold text-success">
                            ✓ Шийдэгдсэн
                          </span>
                        )}
                        <button
                          onClick={() => toggleResolve(n)}
                          className="font-semibold text-brand-soft hover:underline"
                        >
                          {n.resolvedAt ? "Дахин нээх" : "Шийдэгдсэн гэж тэмдэглэх"}
                        </button>
                        <button
                          onClick={() => startEdit(n)}
                          className="text-ink-dim hover:text-ink"
                        >
                          Засах
                        </button>
                        <button
                          onClick={() => setDeleteTarget(n.id)}
                          className="text-error hover:underline"
                        >
                          Устгах
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {deleteTarget && (
        <div
          role="alertdialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-ink">Тэмдэглэл устгах уу?</p>
            <p className="mt-1 text-sm text-ink-dim">Энэ үйлдлийг буцаах боломжгүй.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-ink-dim transition hover:text-ink"
              >
                Болих
              </button>
              <button
                onClick={() => remove(deleteTarget)}
                className="rounded-lg border border-error/30 bg-error/10 px-4 py-2 text-sm font-bold text-error transition hover:bg-error/20"
              >
                Устгах
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
