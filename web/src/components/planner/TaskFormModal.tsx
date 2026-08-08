"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { fullName } from "./statusMeta";
import type {
  ClassroomRef,
  StaffUser,
  Task,
  TaskFormValues,
  SubTask,
} from "./types";

function toFormValues(task?: Task | SubTask | null): TaskFormValues {
  return {
    title: task?.title ?? "",
    description: task?.description ?? "",
    status: task?.status ?? "PLANNED",
    priority: task?.priority ?? "NORMAL",
    startDate: task?.startDate ? task.startDate.slice(0, 10) : "",
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : "",
    classroomId: task?.classroomId ?? "",
    subject: task?.subject ?? "",
    estimateHours:
      task?.estimateHours !== undefined && task?.estimateHours !== null
        ? String(task.estimateHours)
        : "",
    assigneeIds: task?.assignees?.map((a) => a.userId) ?? [],
    parentTaskId: task?.parentTaskId ?? null,
  };
}

/** Даалгавар үүсгэх/засах модаль цонх — эцэг даалгавар болон дэд даалгаварт хоёуланд ашиглана. */
export default function TaskFormModal({
  open,
  onClose,
  onSaved,
  staff,
  classrooms,
  initial,
  parentTaskId,
  parentTitle,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  staff: StaffUser[];
  classrooms: ClassroomRef[];
  initial?: Task | SubTask | null;
  parentTaskId?: string | null;
  parentTitle?: string;
}) {
  const titleId = useId();
  const isEdit = !!initial;
  const [values, setValues] = useState<TaskFormValues>(() =>
    toFormValues(initial ?? undefined),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(toFormValues(initial ?? undefined));
    setError(null);
  }, [open, initial]);

  if (!open) return null;

  function set<K extends keyof TaskFormValues>(key: K, v: TaskFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  function toggleAssignee(userId: string) {
    setValues((prev) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(userId)
        ? prev.assigneeIds.filter((id) => id !== userId)
        : [...prev.assigneeIds, userId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Даалгаврын нэрийг оруулна уу");
      return;
    }
    if (
      values.startDate &&
      values.dueDate &&
      values.dueDate < values.startDate
    ) {
      setError("Дуусах огноо эхлэх огнооноос өмнө байж болохгүй");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      status: values.status,
      priority: values.priority,
      startDate: values.startDate || undefined,
      dueDate: values.dueDate || undefined,
      classroomId: values.classroomId || undefined,
      subject: values.subject || undefined,
      estimateHours:
        values.estimateHours !== "" ? Number(values.estimateHours) : undefined,
      assigneeIds: values.assigneeIds,
      parentTaskId: parentTaskId ?? initial?.parentTaskId ?? undefined,
    };
    try {
      if (isEdit && initial) {
        await api(`/tasks/${initial.id}`, { method: "PATCH", body });
      } else {
        await api(`/tasks`, { method: "POST", body });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-ink">
              {isEdit
                ? "Даалгавар засах"
                : parentTaskId
                  ? "Дэд даалгавар нэмэх"
                  : "Шинэ даалгавар"}
            </h2>
            {parentTitle && (
              <p className="mt-0.5 text-sm text-ink-dim">
                Эцэг даалгавар: <span className="font-medium text-ink">{parentTitle}</span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg border border-line px-2 py-1 text-sm text-ink-dim transition hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor={`${titleId}-title`} className="mb-1 block text-sm font-semibold text-ink">
              Гарчиг
            </label>
            <input
              id={`${titleId}-title`}
              type="text"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              required
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
              placeholder="Жишээ: 11-1 ангийн улирлын шалгалт бэлтгэх"
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-desc`} className="mb-1 block text-sm font-semibold text-ink">
              Тайлбар
            </label>
            <textarea
              id={`${titleId}-desc`}
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${titleId}-status`} className="mb-1 block text-sm font-semibold text-ink">
                Төлөв
              </label>
              <select
                id={`${titleId}-status`}
                value={values.status}
                onChange={(e) => set("status", e.target.value as TaskFormValues["status"])}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
              >
                <option value="PLANNED">Төлөвлөсөн</option>
                <option value="IN_PROGRESS">Хийгдэж байгаа</option>
                <option value="BLOCKED">Хоригдсон</option>
                <option value="DONE">Дууссан</option>
                <option value="CANCELLED">Цуцалсан</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${titleId}-priority`} className="mb-1 block text-sm font-semibold text-ink">
                Чухал зэрэг
              </label>
              <select
                id={`${titleId}-priority`}
                value={values.priority}
                onChange={(e) => set("priority", e.target.value as TaskFormValues["priority"])}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
              >
                <option value="LOW">Бага</option>
                <option value="NORMAL">– Энгийн</option>
                <option value="HIGH">Өндөр</option>
                <option value="URGENT">‼ Яаралтай</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${titleId}-start`} className="mb-1 block text-sm font-semibold text-ink">
                Эхлэх огноо
              </label>
              <input
                id={`${titleId}-start`}
                type="date"
                value={values.startDate}
                onChange={(e) => set("startDate", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
              />
            </div>
            <div>
              <label htmlFor={`${titleId}-due`} className="mb-1 block text-sm font-semibold text-ink">
                Дуусах огноо
              </label>
              <input
                id={`${titleId}-due`}
                type="date"
                value={values.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${titleId}-subject`} className="mb-1 block text-sm font-semibold text-ink">
                Хичээл (заавал биш)
              </label>
              <select
                id={`${titleId}-subject`}
                value={values.subject}
                onChange={(e) => set("subject", e.target.value as TaskFormValues["subject"])}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
              >
                <option value="">—</option>
                <option value="MATH">Математик</option>
                <option value="SOCIAL_STUDIES">Нийгмийн ухаан</option>
              </select>
            </div>
            <div>
              <label htmlFor={`${titleId}-classroom`} className="mb-1 block text-sm font-semibold text-ink">
                Анги (заавал биш)
              </label>
              <select
                id={`${titleId}-classroom`}
                value={values.classroomId}
                onChange={(e) => set("classroomId", e.target.value)}
                className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
              >
                <option value="">—</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor={`${titleId}-hours`} className="mb-1 block text-sm font-semibold text-ink">
              Тооцоолсон цаг (заавал биш)
            </label>
            <input
              id={`${titleId}-hours`}
              type="number"
              min={0}
              value={values.estimateHours}
              onChange={(e) => set("estimateHours", e.target.value)}
              className="w-32 rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink"
            />
          </div>

          <fieldset>
            <legend className="mb-1 text-sm font-semibold text-ink">
              Хариуцах ажилтан
            </legend>
            <div className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-line p-2">
              {staff.length === 0 && (
                <p className="px-1 py-1 text-sm text-ink-dim">Ажилтан олдсонгүй</p>
              )}
              {staff.map((s) => {
                const checked = values.assigneeIds.includes(s.id);
                return (
                  <label
                    key={s.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-ink transition hover:bg-panel"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAssignee(s.id)}
                      className="h-4 w-4 rounded border-line"
                    />
                    {fullName(s)}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
            >
              error
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition hover:text-ink"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-60"
            >
              {saving ? "Хадгалж байна…" : "Хадгалах"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
