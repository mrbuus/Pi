"use client";

import { Calendar, Check } from "lucide-react";
import { useState } from "react";
import { daysUntil, formatDate, STATUS_META, STATUS_OPTIONS, SUBJECT_LABEL } from "./statusMeta";
import type { Goal, GoalStatus } from "./types";

/** Нэг зорилгын карт — төлөв солих, "Биелсэн" гэж хурдан тэмдэглэх, засах
 * (энгийн prompt-той биш, GoalForm шиг бүрэн inline edit), устгах. */
export default function GoalCard({
  goal,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  goal: Goal;
  onStatusChange: (status: GoalStatus) => void;
  onEdit: (values: { title: string; description: string; targetDate: string }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(goal.title);
  const [description, setDescription] = useState(goal.description ?? "");
  const [targetDate, setTargetDate] = useState(goal.targetDate?.slice(0, 10) ?? "");

  const meta = STATUS_META[goal.status];
  const overdue =
    goal.status !== "DONE" && goal.targetDate && daysUntil(goal.targetDate) < 0;
  const soon =
    goal.status !== "DONE" &&
    goal.targetDate &&
    !overdue &&
    daysUntil(goal.targetDate) <= 3;

  function saveEdit() {
    if (!title.trim()) return;
    onEdit({ title: title.trim(), description, targetDate });
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="rounded-xl border border-brand-bright/40 bg-surface p-4">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Гарчиг засах"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand-bright"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          aria-label="Тайлбар засах"
          rows={2}
          className="mt-2 w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand-bright"
        />
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          aria-label="Зорилтот огноо засах"
          className="mt-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand-bright"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={saveEdit}
            className="rounded-lg bg-brand-bright px-3 py-1.5 text-xs font-bold text-on-brand"
          >
            Хадгалах
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink-dim transition hover:text-ink"
          >
            Болих
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <p
          className={`font-semibold text-ink ${
            goal.status === "DONE" ? "line-through text-ink-dim" : ""
          }`}
        >
          {goal.title}
        </p>
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.badgeClass}`}
        >
          <meta.icon className="h-3 w-3" aria-hidden /> {meta.label}
        </span>
      </div>

      {goal.description && (
        <p className="mt-1 text-sm text-ink-dim">{goal.description}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-dim">
        {goal.subject && (
          <span className="rounded-full border border-line px-2 py-0.5">
            {SUBJECT_LABEL[goal.subject]}
          </span>
        )}
        {goal.targetDate && (
          <span
            className={`rounded-full border px-2 py-0.5 ${
              overdue
                ? "border-error/40 text-error"
                : soon
                  ? "border-warning/40 text-warning"
                  : "border-line"
            }`}
          >
            <Calendar className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden />
            {formatDate(goal.targetDate)}
            {overdue && " — хугацаа хэтэрсэн"}
            {soon && " — тун удахгүй"}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2.5">
        <label className="flex items-center gap-1.5 text-xs text-ink-dim">
          <span className="sr-only">Төлөв шилжүүлэх — {goal.title}</span>
          <select
            aria-label={`Төлөв шилжүүлэх — ${goal.title}`}
            value={goal.status}
            onChange={(e) => onStatusChange(e.target.value as GoalStatus)}
            className="rounded-lg border border-line bg-bg px-1.5 py-1 text-xs text-ink"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          {goal.status !== "DONE" && (
            <button
              type="button"
              onClick={() => onStatusChange("DONE")}
              className="inline-flex items-center gap-1 rounded-lg border border-success/40 px-2 py-1 text-xs font-semibold text-success transition hover:bg-success/10"
            >
              <Check className="h-3 w-3" aria-hidden /> Биелсэн гэж тэмдэглэх
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-line px-2 py-1 text-xs text-ink-dim transition hover:text-ink"
          >
            Засах
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-error/30 px-2 py-1 text-xs text-error transition hover:bg-error/10"
          >
            Устгах
          </button>
        </div>
      </div>
    </div>
  );
}
