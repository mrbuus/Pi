"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import ConfirmDialog from "@/components/theory/ConfirmDialog";
import { TimelineEvent, TimelineResponse } from "./types";
import { errMsg, formatDateTime } from "./format";
import { selfStateLabel } from "./selfState";
import AttemptEditDialog from "./AttemptEditDialog";

const EVENT_META: Record<string, { icon: string; label: string }> = {
  LOGIN: { icon: "🔑", label: "Нэвтэрсэн" },
  LOGOUT: { icon: "🚪", label: "Гарсан" },
  SEARCH: { icon: "🔍", label: "Хайлт хийсэн" },
  CHAPTER_OPENED: { icon: "📖", label: "Бүлэг нээсэн" },
  VIDEO_STARTED: { icon: "▶️", label: "Бичлэг эхэлсэн" },
  VIDEO_COMPLETED: { icon: "🎬", label: "Бичлэг дуусгасан" },
  PROBLEM_OPENED: { icon: "📝", label: "Бодлого нээсэн" },
  ANSWER_SUBMITTED: { icon: "✍️", label: "Хариулт илгээсэн" },
  HINT_USED: { icon: "💡", label: "Тусламж авсан" },
  RETRY: { icon: "🔄", label: "Дахин оролдсон" },
  BOOKMARK: { icon: "🔖", label: "Хадгалсан" },
  TEST_STARTED: { icon: "🚀", label: "Тест эхэлсэн" },
  TEST_FINISHED: { icon: "🏁", label: "Тест дуусгасан" },
  EVENING_MARK: { icon: "🌙", label: "Оройн тэмдэглэгээ" },
  PAGE_VIEW: { icon: "👁️", label: "Хуудас үзсэн" },
};

const SELF_STATE_ICON: Record<string, string> = {
  SOLVED_CLEAN: "✅",
  FIXED_AFTER_ERROR: "🔁",
  FAILED: "❌",
  GUESSED: "🎯",
};

function eventLine(e: TimelineEvent): { icon: string; text: string } {
  if (e.kind === "ATTEMPT") {
    const icon = SELF_STATE_ICON[e.selfState ?? ""] ?? "📎";
    return {
      icon,
      text: `${e.problemToken} — ${selfStateLabel(e.selfState)} · ${e.chapterTitle}`,
    };
  }
  const meta = EVENT_META[e.type] ?? { icon: "•", label: e.type };
  const durationText =
    e.durationMs && e.durationMs > 1000
      ? ` · ${Math.round(e.durationMs / 60000) > 0 ? `${Math.round(e.durationMs / 60000)} мин` : `${Math.round(e.durationMs / 1000)} сек`}`
      : "";
  return { icon: meta.icon, text: `${meta.label}${durationText}` };
}

export default function Timeline({
  studentId,
  canEdit,
}: {
  studentId: string;
  canEdit: boolean;
}) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editing, setEditing] = useState<TimelineEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TimelineEvent | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    api<TimelineResponse>(
      `/progress/student/${studentId}/timeline?from=${from.toISOString().slice(0, 10)}&to=${to
        .toISOString()
        .slice(0, 10)}`,
    )
      .then((res) => setEvents(res.items))
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  function saveAttempt(newSelfState: string) {
    if (!editing || editing.kind !== "ATTEMPT" || !editing.attemptId || !events) return;
    const attemptId = editing.attemptId;
    const previous = events;
    setSaving(true);
    setSaveError(null);
    setEvents(
      events.map((e) =>
        e.kind === "ATTEMPT" && e.attemptId === attemptId
          ? { ...e, selfState: newSelfState }
          : e,
      ),
    );
    api(`/progress/student/${studentId}/attempt/${attemptId}`, {
      method: "PATCH",
      body: { selfState: newSelfState },
    })
      .then(() => {
        setEditing(null);
      })
      .catch((e) => {
        setEvents(previous); // rollback
        setSaveError(errMsg(e));
      })
      .finally(() => setSaving(false));
  }

  function confirmDelete() {
    if (!deleting || deleting.kind !== "ATTEMPT" || !deleting.attemptId || !events) return;
    const attemptId = deleting.attemptId;
    const previous = events;
    setEvents(
      events.filter((e) => !(e.kind === "ATTEMPT" && e.attemptId === attemptId)),
    );
    setDeleting(null);
    setActionError(null);
    api(`/progress/student/${studentId}/attempt/${attemptId}`, {
      method: "DELETE",
    }).catch((e) => {
      setEvents(previous); // rollback
      setActionError(errMsg(e));
    });
  }

  if (loading) {
    return <p className="text-sm text-ink-dim">Ачаалж байна…</p>;
  }
  if (error) {
    return (
      <div>
        <p className="text-sm text-error">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-2 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand"
        >
          Дахин оролдох
        </button>
      </div>
    );
  }
  if (!events || events.length === 0) {
    return <p className="text-sm text-ink-dim">Сүүлийн 30 хоногт идэвх бүртгэгдээгүй.</p>;
  }

  return (
    <div>
      {actionError && (
        <p className="mb-2 rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
          {actionError}
        </p>
      )}
      <ul className="space-y-1.5">
        {events.map((e, i) => {
          const line = eventLine(e);
          const editable = canEdit && e.kind === "ATTEMPT" && !!e.attemptId;
          return (
            <li
              key={`${e.kind}-${e.at}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-panel"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden>{line.icon}</span>
                <span className="truncate text-sm text-ink">{line.text}</span>
                <span className="shrink-0 text-xs text-ink-dim">{formatDateTime(e.at)}</span>
              </div>
              {editable && (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setSaveError(null);
                      setEditing(e);
                    }}
                    className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-ink-dim transition hover:border-brand hover:text-ink"
                    aria-label={`${e.kind === "ATTEMPT" ? e.problemToken : ""}-г засах`}
                  >
                    Засах
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(e)}
                    className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-ink-dim transition hover:border-error hover:text-error"
                    aria-label={`${e.kind === "ATTEMPT" ? e.problemToken : ""}-г устгах`}
                  >
                    Устгах
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <AttemptEditDialog
        open={!!editing}
        problemToken={editing?.kind === "ATTEMPT" ? editing.problemToken : "?"}
        initialSelfState={editing?.kind === "ATTEMPT" ? editing.selfState : null}
        saving={saving}
        error={saveError}
        onSave={saveAttempt}
        onCancel={() => setEditing(null)}
      />
      <ConfirmDialog
        open={!!deleting}
        title={`«${deleting?.kind === "ATTEMPT" ? deleting.problemToken : "?"}» бодлогын оролдлогыг устгах уу?`}
        description="Энэ үйлдлийг буцаах боломжгүй."
        confirmLabel="Устгах"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
