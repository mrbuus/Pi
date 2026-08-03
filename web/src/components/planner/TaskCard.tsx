"use client";

import { Calendar, Puzzle, Timer } from "lucide-react";
import { PRIORITY_META, STATUS_META, SUBJECT_LABEL, formatDate, initials } from "./statusMeta";
import type { SubTask, Task, TaskStatus } from "./types";

const STATUS_OPTIONS: TaskStatus[] = [
  "PLANNED",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
  "CANCELLED",
];

/** Багана болон дэд даалгаврын жагсаалтад ашиглах ганц карт компонент. */
export default function TaskCard({
  task,
  isSubtask = false,
  canChangeStatus,
  canEditAll,
  onStatusChange,
  onEdit,
  onDelete,
  onAddSubtask,
}: {
  task: Task | SubTask;
  isSubtask?: boolean;
  canChangeStatus: boolean;
  canEditAll: boolean;
  onStatusChange: (status: TaskStatus) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAddSubtask?: () => void;
}) {
  const statusMeta = STATUS_META[task.status];
  const priorityMeta = PRIORITY_META[task.priority];
  const subtaskCount = "subtasks" in task ? task.subtasks.length : 0;

  return (
    <div
      className={`rounded-xl border border-line bg-surface p-3 ${
        isSubtask ? "ml-4 border-dashed" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{task.title}</p>
        <span
          className={`shrink-0 whitespace-nowrap text-xs font-semibold ${priorityMeta.colorClass}`}
          title={`Чухал зэрэг: ${priorityMeta.label}`}
        >
          {priorityMeta.icon} {priorityMeta.label}
        </span>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-ink-dim">{task.description}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-dim">
        {task.subject && (
          <span className="rounded-full border border-line px-2 py-0.5">
            {SUBJECT_LABEL[task.subject]}
          </span>
        )}
        {task.classroom && (
          <span className="rounded-full border border-line px-2 py-0.5">
            {task.classroom.name}
          </span>
        )}
        {(task.startDate || task.dueDate) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
            <Calendar className="h-3 w-3" aria-hidden />
            {formatDate(task.startDate)} - {formatDate(task.dueDate)}
          </span>
        )}
        {typeof task.estimateHours === "number" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
            <Timer className="h-3 w-3" aria-hidden /> {task.estimateHours}ц
          </span>
        )}
        {!isSubtask && subtaskCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5">
            <Puzzle className="h-3 w-3" aria-hidden /> {subtaskCount} дэд даалгавар
          </span>
        )}
      </div>

      {task.assignees.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {task.assignees.map((a) => (
            <span
              key={a.userId}
              title={`${a.user.lastName} ${a.user.firstName}`}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-bright/20 text-[10px] font-bold text-brand-soft"
            >
              {initials(a.user.firstName, a.user.lastName)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
        <label className="flex items-center gap-1.5 text-xs text-ink-dim">
          <statusMeta.icon className={`h-3.5 w-3.5 ${statusMeta.colorClass}`} aria-hidden />
          <span className="sr-only">Төлөв шилжүүлэх — {task.title}</span>
          <select
            aria-label={`Төлөв шилжүүлэх — ${task.title}`}
            value={task.status}
            disabled={!canChangeStatus}
            onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
            className="rounded-lg border border-line bg-bg px-1.5 py-1 text-xs text-ink disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>

        {canEditAll && (
          <div className="flex items-center gap-1">
            {!isSubtask && onAddSubtask && (
              <button
                type="button"
                onClick={onAddSubtask}
                className="rounded-lg border border-line px-2 py-1 text-xs text-ink-dim transition hover:text-ink"
              >
                + Дэд даалгавар
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg border border-line px-2 py-1 text-xs text-ink-dim transition hover:text-ink"
              >
                Засах
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg border border-error/30 px-2 py-1 text-xs text-error transition hover:bg-error/10"
              >
                Устгах
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
