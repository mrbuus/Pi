"use client";

import { useState } from "react";
import { EMPTY_GOAL_FORM, GoalFormValues } from "./types";

/** Шинэ зорилго нэмэх маягт — сурагч гарчиг, тайлбар (заавал биш), зорилтот
 * огноо (заавал биш), сэдэв (заавал биш) тохируулна. studentId энд байхгүй —
 * backend JWT-с авна. */
export default function GoalForm({
  onCreate,
}: {
  onCreate: (values: GoalFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<GoalFormValues>(EMPTY_GOAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.title.trim()) {
      setError("Гарчиг заавал бөглөнө үү");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onCreate(values);
      setValues(EMPTY_GOAL_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-line bg-panel p-4 md:p-6"
    >
      <h2 className="mb-4 font-bold text-brand-soft">Шинэ зорилго нэмэх</h2>

      {error && (
        <div className="mb-3 rounded-lg border border-error/20 bg-error/5 px-3 py-2 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <label htmlFor="goal-title" className="mb-1 block text-sm font-medium">
            Гарчиг
          </label>
          <input
            id="goal-title"
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="Жишээ: Алгебрийн тестээс 90+ авах"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="goal-desc" className="mb-1 block text-sm font-medium">
            Тайлбар (заавал биш)
          </label>
          <textarea
            id="goal-desc"
            value={values.description}
            onChange={(e) =>
              setValues((v) => ({ ...v, description: e.target.value }))
            }
            rows={2}
            placeholder="Хэрхэн хүрэх төлөвлөгөө…"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
        </div>

        <div>
          <label htmlFor="goal-date" className="mb-1 block text-sm font-medium">
            Зорилтот огноо (заавал биш)
          </label>
          <input
            id="goal-date"
            type="date"
            value={values.targetDate}
            onChange={(e) =>
              setValues((v) => ({ ...v, targetDate: e.target.value }))
            }
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
        </div>

        <div>
          <label htmlFor="goal-subject" className="mb-1 block text-sm font-medium">
            Хичээл (заавал биш)
          </label>
          <select
            id="goal-subject"
            value={values.subject}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                subject: e.target.value as GoalFormValues["subject"],
              }))
            }
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-bright"
          >
            <option value="">Сонгоогүй</option>
            <option value="MATH">Математик</option>
            <option value="SOCIAL_STUDIES">Нийгмийн ухаан</option>
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand disabled:opacity-50"
      >
        {saving ? "Хадгалж байна…" : "+ Зорилго нэмэх"}
      </button>
    </form>
  );
}
