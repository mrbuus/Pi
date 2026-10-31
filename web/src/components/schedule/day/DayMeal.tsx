"use client";

import { CookingPot } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { withPlus } from "@/lib/personName";
import type { TeacherOption } from "./LessonRow";
import type { StaffRef } from "./types";

type Meal = { cook: StaffRef | null; food: string | null };

/**
 * Бямба, Ням гарагийн хоол (эзэн 2026-10-31): байгууллага хоол хийдэг тул хэн
 * хийх (ажилтнаас сонгоно), юу хийх (чөлөөт бичвэр, хоолны сан үгүй). Хоосон
 * орхиж болно. Бичих — Багш+, Админ; бусад ажилтан харна.
 */
export default function DayMeal({
  date,
  meal,
  canEdit,
  teachers,
  onSaved,
}: {
  date: string;
  meal: Meal;
  canEdit: boolean;
  teachers: TeacherOption[];
  onSaved: (meal: Meal) => void;
}) {
  const [cookId, setCookId] = useState(meal.cook?.id ?? "");
  const [food, setFood] = useState(meal.food ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = cookId !== (meal.cook?.id ?? "") || food.trim() !== (meal.food ?? "");

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const out = await api<{ meal: Meal }>("/schedule/day-meal", {
        method: "PUT",
        body: { date, cookId: cookId || null, food: food.trim() || null },
      });
      onSaved(out.meal);
      setFood(out.meal.food ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`meal-${date}`} className="rounded-xl border border-line bg-surface p-3">
      <h3 id={`meal-${date}`} className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
        <CookingPot className="size-4 text-brand-soft" aria-hidden />
        Хоол
      </h3>
      {canEdit ? (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-end">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-dim">Хоол хийх хүн</span>
            <select
              aria-label="Хоол хийх хүн"
              value={cookId}
              onChange={(e) => setCookId(e.target.value)}
              className={cn("min-h-11 w-full rounded-lg border border-line bg-bg px-2 text-sm", cookId ? "text-ink" : "text-ink-dim")}
            >
              <option value="">— сонгоогүй —</option>
              {meal.cook && !teachers.some((t) => t.id === meal.cook?.id) && (
                <option value={meal.cook.id}>{withPlus(meal.cook.name, meal.cook.role)}</option>
              )}
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-semibold text-ink-dim">Юу хийх</span>
            <input
              value={food}
              maxLength={200}
              onChange={(e) => setFood(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && changed && !busy) void save();
              }}
              placeholder="Хоолны нэр"
              className="min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={save}
            disabled={busy || !changed}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-bright bg-brand-bright px-4 text-sm font-semibold text-on-brand transition disabled:opacity-50"
          >
            {busy ? "Хадгалж байна" : "Хадгалах"}
          </button>
          {error && (
            <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error sm:col-span-3">
              {error}
            </p>
          )}
        </div>
      ) : meal.cook || meal.food ? (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-ink-dim">Хоол хийх хүн</dt>
            <dd className="font-semibold text-ink">{meal.cook ? withPlus(meal.cook.name, meal.cook.role) : "—"}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-dim">Юу хийх</dt>
            <dd className="font-semibold text-ink">{meal.food ?? "—"}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-ink-dim">Хоол товлоогүй</p>
      )}
    </section>
  );
}
