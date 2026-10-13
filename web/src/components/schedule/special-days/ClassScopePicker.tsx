"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { groupByBranch, type ClassroomOption } from "./helpers";

/**
 * «Аль ангид хамаарах вэ»: Бүх анги эсвэл сонгосон ангиуд (салбараар бүлэглэсэн).
 * `value` хоосон = БҮХ анги. `all` нь сонголтын горим — хоосон жагсаалттай
 * «сонгосон ангиуд» горимыг (хараахан юу ч сонгоогүй) бүх анги гэж андуурахгүй.
 */
export default function ClassScopePicker({
  classrooms,
  all,
  onAllChange,
  value,
  onChange,
}: {
  classrooms: ClassroomOption[];
  all: boolean;
  onAllChange: (all: boolean) => void;
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const groups = useMemo(() => groupByBranch(classrooms), [classrooms]);
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(id: string) {
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  function toggleGroup(ids: string[]) {
    const everySelected = ids.every((id) => selected.has(id));
    onChange(
      everySelected
        ? value.filter((v) => !ids.includes(v))
        : [...new Set([...value, ...ids])],
    );
  }

  const modeCls = (active: boolean) =>
    `min-h-11 flex-1 rounded-lg border px-3 text-sm font-semibold transition ${
      active
        ? "border-brand-bright bg-brand-bright text-on-brand"
        : "border-line bg-panel text-ink hover:border-brand"
    }`;

  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-xs text-ink-dim">
        Аль ангид хамаарах вэ
      </legend>
      <div className="flex gap-2" role="radiogroup" aria-label="Хамрах хүрээ">
        <button
          type="button"
          role="radio"
          aria-checked={all}
          onClick={() => onAllChange(true)}
          className={modeCls(all)}
        >
          Бүх анги
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!all}
          onClick={() => onAllChange(false)}
          className={modeCls(!all)}
        >
          Сонгосон ангиуд
        </button>
      </div>

      {!all && (
        <div className="mt-3 space-y-3">
          {groups.map(({ branch, items }) => {
            const ids = items.map((i) => i.id);
            const count = ids.filter((id) => selected.has(id)).length;
            return (
              <div key={branch}>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-ink">{branch}</span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(ids)}
                    className="min-h-11 rounded-lg px-2 text-xs font-semibold text-brand-soft hover:underline"
                  >
                    {count === ids.length
                      ? "Сонголтыг арилгах"
                      : `Бүгдийг сонгох (${ids.length})`}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {items.map((c) => {
                    const on = selected.has(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(c.id)}
                        className={`inline-flex min-h-11 min-w-14 items-center justify-center gap-1 rounded-lg border px-3 text-sm font-semibold transition ${
                          on
                            ? "border-brand-bright bg-brand-bright text-on-brand"
                            : "border-line bg-panel text-ink hover:border-brand"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" aria-hidden />}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-xs text-ink-dim" aria-live="polite">
            {value.length === 0
              ? "Анги сонгоогүй байна"
              : `${value.length} анги сонгосон`}
          </p>
        </div>
      )}
    </fieldset>
  );
}
