"use client";

import { CookingPot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { withPlus } from "@/lib/personName";
import type { TeacherOption } from "./LessonRow";
import type { StaffRef } from "./types";

type Meal = { cook: StaffRef | null; food: string | null };

const FIELD = "h-10 min-w-0 rounded-lg border border-line bg-bg px-2.5 text-sm";

/**
 * Бямба, Ням гарагийн хоол (эзэн 2026-10-31): байгууллага хоол хийдэг тул хэн
 * хийх (ажилтнаас сонгоно), юу хийх (чөлөөт бичвэр, хоолны сан үгүй). Хоосон
 * орхиж болно. Хүрээгүй нэг мөр, «Хадгалах» товчгүй — сонгоход, бичээд түр
 * зогсоход өөрөө хадгална (эзэн 2026-10-31). Бичих — Багш+, Админ; бусад харна.
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
  const [error, setError] = useState<string | null>(null);
  // Сүүлд хадгалсан утга — өөрчлөгдөөгүй бол дахин илгээхгүй
  const saved = useRef({ cookId: meal.cook?.id ?? "", food: meal.food ?? "" });
  const timer = useRef<number | null>(null);

  async function save(next: { cookId: string; food: string }) {
    const food = next.food.trim();
    if (next.cookId === saved.current.cookId && food === saved.current.food) return;
    const previous = saved.current;
    saved.current = { cookId: next.cookId, food };
    setError(null);
    try {
      const out = await api<{ meal: Meal }>("/schedule/day-meal", {
        method: "PUT",
        body: { date, cookId: next.cookId || null, food: food || null },
      });
      onSaved(out.meal);
    } catch (err) {
      saved.current = previous; // дахин оролдоход илгээгдэнэ
      setError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    }
  }

  const flush = (next = { cookId, food }) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    void save(next);
  };

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const title = (
    <span className="flex shrink-0 items-center gap-1.5 text-sm font-bold text-ink">
      <CookingPot className="size-4 text-ink-dim" aria-hidden />
      Хоол
    </span>
  );

  if (!canEdit)
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line/60 pt-3 text-sm">
        {title}
        {meal.cook || meal.food ? (
          <>
            <span className="text-ink">{meal.cook ? withPlus(meal.cook.name, meal.cook.role) : "—"}</span>
            <span className="font-semibold text-ink">{meal.food ?? ""}</span>
          </>
        ) : (
          <span className="text-ink-dim">Товлоогүй</span>
        )}
      </div>
    );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line/60 pt-3">
      {title}
      <select
        aria-label="Хоол хийх хүн"
        value={cookId}
        onChange={(e) => {
          setCookId(e.target.value);
          flush({ cookId: e.target.value, food });
        }}
        className={cn(FIELD, "w-44", cookId ? "text-ink" : "text-ink-dim")}
      >
        <option value="">Хэн хийх</option>
        {meal.cook && !teachers.some((t) => t.id === meal.cook?.id) && (
          <option value={meal.cook.id}>{withPlus(meal.cook.name, meal.cook.role)}</option>
        )}
        {teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <input
        aria-label="Юу хийх"
        value={food}
        maxLength={200}
        placeholder="Юу хийх"
        onChange={(e) => {
          const v = e.target.value;
          setFood(v);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => flush({ cookId, food: v }), 900);
        }}
        onBlur={() => flush()}
        onKeyDown={(e) => e.key === "Enter" && flush()}
        className={cn(FIELD, "w-56 text-ink")}
      />
      {error && (
        <p role="alert" className="w-full text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
