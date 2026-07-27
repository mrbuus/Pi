"use client";

import { STATUS_META, STATUS_ORDER } from "./statusMeta";
import TaskCard from "./TaskCard";
import type { SubTask, Task, TaskStatus } from "./types";

/**
 * БАГАНА (board) харагдац — төлөв тус бүр багана, дотор нь эцэг даалгавар,
 * доор нь дэд даалгаврууд ЗУРАГ ЗУРААГҮЙгээр (drag-free), "Төлөв шилжүүлэх"
 * гэсэн жинхэнэ <select>-ээр шилждэг WCAG 2.2-той нийцсэн хувилбар.
 */
export default function BoardView({
  tasks,
  myUserId,
  canEditAll,
  onStatusChange,
  onEdit,
  onDelete,
  onAddSubtask,
}: {
  tasks: Task[];
  myUserId: string | null;
  canEditAll: boolean;
  onStatusChange: (task: Task | SubTask, status: TaskStatus) => void;
  onEdit: (task: Task | SubTask) => void;
  onDelete: (task: Task | SubTask) => void;
  onAddSubtask: (parent: Task) => void;
}) {
  function canChangeStatus(task: Task | SubTask): boolean {
    if (canEditAll) return true;
    return !!myUserId && task.assignees.some((a) => a.userId === myUserId);
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              className="flex w-72 shrink-0 flex-col gap-3 rounded-2xl border border-line bg-panel p-3"
            >
              <div className="flex items-center justify-between gap-2 px-1">
                <h3 className={`flex items-center gap-1.5 text-sm font-bold ${meta.colorClass}`}>
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </h3>
                <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-xs font-semibold text-ink-dim">
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {columnTasks.length === 0 && (
                  <p className="px-1 py-2 text-xs text-ink-dim">Даалгавар алга</p>
                )}
                {columnTasks.map((task) => (
                  <div key={task.id} className="flex flex-col gap-2">
                    <TaskCard
                      task={task}
                      canChangeStatus={canChangeStatus(task)}
                      canEditAll={canEditAll}
                      onStatusChange={(s) => onStatusChange(task, s)}
                      onEdit={canEditAll ? () => onEdit(task) : undefined}
                      onDelete={canEditAll ? () => onDelete(task) : undefined}
                      onAddSubtask={canEditAll ? () => onAddSubtask(task) : undefined}
                    />
                    {task.subtasks.map((sub) => (
                      <TaskCard
                        key={sub.id}
                        task={sub}
                        isSubtask
                        canChangeStatus={canChangeStatus(sub)}
                        canEditAll={canEditAll}
                        onStatusChange={(s) => onStatusChange(sub, s)}
                        onEdit={canEditAll ? () => onEdit(sub) : undefined}
                        onDelete={canEditAll ? () => onDelete(sub) : undefined}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
