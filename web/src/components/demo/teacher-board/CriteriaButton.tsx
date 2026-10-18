"use client";

import { Minus, Plus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { DEFAULT_CRITERIA, type Criteria } from "../world";
import Popover from "./Popover";

type NumKey = Exclude<keyof Criteria, "windowDays">;

const WINDOWS = [7, 14, 30, 60, 90];

const FIELDS: Array<{ key: NumKey; title: string; hint: (v: number) => string; min: number; max: number; step: number; unit?: string }> = [
  { key: "minAttendance", title: "Ирц", hint: (v) => `${v}%-иас бага бол`, min: 50, max: 100, step: 5, unit: "%" },
  { key: "maxAbsences", title: "Тасалсан", hint: (v) => `${v} ба түүнээс олон удаа`, min: 1, max: 10, step: 1 },
  { key: "maxLates", title: "Хоцорсон", hint: (v) => `${v} ба түүнээс олон удаа`, min: 1, max: 10, step: 1 },
  { key: "minHomework", title: "Даалгавар", hint: (v) => `${v}%-иас бага бол (дутуу нь хагас)`, min: 0, max: 100, step: 5, unit: "%" },
  { key: "missingStreak", title: "Дараалан хийгээгүй", hint: (v) => `${v} ба түүнээс олон удаа`, min: 1, max: 6, step: 1 },
];

const same = (a: Criteria, b: Criteria) => (Object.keys(a) as Array<keyof Criteria>).every((k) => a[k] === b[k]);

/**
 * «Шалгуур»: Багш+ ангийн шалгуурыг тавина. Хангаагүй сурагчийн нэрийн өмнө
 * улаан тэмдэг гарна — өөрчлөлт шууд (хадгалах товчгүй) тусна.
 */
export default function CriteriaButton({
  value,
  flagged,
  total,
  onChange,
}: {
  value: Criteria;
  /** Одоогийн шалгуураар асуудалтай сурагчийн тоо */
  flagged: number;
  total: number;
  onChange: (next: Criteria) => void;
}) {
  const [open, setOpen] = useState(false);
  const windowId = useId();
  const changed = !same(value, DEFAULT_CRITERIA);
  const set = <K extends keyof Criteria>(k: K, v: Criteria[K]) => onChange({ ...value, [k]: v });

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Асуудалтай сурагчийн шалгуур"
      trigger={
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Шалгуур, асуудалтай ${flagged} сурагч`}
          title="Асуудалтай сурагчийн шалгуур"
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-sm font-medium transition-colors sm:min-h-9 sm:min-w-0",
            changed
              ? "border-brand-bright/40 bg-brand-bright/10 text-brand-soft hover:bg-brand-bright/20"
              : "border-line bg-surface text-ink-dim hover:bg-ink/5 hover:text-ink",
          )}
        >
          <SlidersHorizontal className="size-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">Шалгуур</span>
        </button>
      }
    >
      <p className="mb-2.5 flex items-start gap-2 text-xs text-ink-dim">
        <span aria-hidden className="mt-1 inline-flex size-2.5 shrink-0 rounded-full bg-error ring-2 ring-error/20" />
        <span>
          Хангаагүй сурагчийн нэрийн өмнө улаан тэмдэг гарна, одоо{" "}
          <b className="font-bold tabular-nums text-ink" aria-live="polite">
            {flagged}/{total}
          </b>{" "}
          сурагч
        </span>
      </p>

      <div className="mb-2">
        <p id={windowId} className="mb-1 text-xs font-semibold text-ink">
          Сүүлийн хэдэн хоногоор
        </p>
        <div role="group" aria-labelledby={windowId} className="grid grid-cols-5 gap-0.5 rounded-lg bg-ink/[0.06] p-0.5">
          {WINDOWS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={value.windowDays === d}
              onClick={() => set("windowDays", d)}
              className={cn(
                "min-h-11 rounded-md text-[13px] tabular-nums transition-colors sm:min-h-8",
                value.windowDays === d ? "bg-surface font-bold text-ink shadow-sm ring-1 ring-line" : "font-medium text-ink-dim hover:text-ink",
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-line">
        {FIELDS.map((f) => {
          const v = value[f.key];
          return (
            <li key={f.key} className="flex items-center gap-2 py-1.5">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-sm font-semibold text-ink">{f.title}</p>
                <p className="text-xs text-ink-dim">{f.hint(v)}</p>
              </div>
              <div role="group" aria-label={f.title} className="flex shrink-0 items-center">
                <button
                  type="button"
                  aria-label={`${f.title}, багасгах`}
                  disabled={v <= f.min}
                  onClick={() => set(f.key, Math.max(f.min, v - f.step))}
                  className="inline-flex size-11 items-center justify-center rounded-lg border border-line text-ink-dim hover:bg-ink/5 hover:text-ink disabled:opacity-35 sm:size-8"
                >
                  <Minus className="size-4" aria-hidden />
                </button>
                <span className="w-12 text-center text-sm font-bold tabular-nums text-ink">
                  {v}
                  {f.unit}
                </span>
                <button
                  type="button"
                  aria-label={`${f.title}, нэмэх`}
                  disabled={v >= f.max}
                  onClick={() => set(f.key, Math.min(f.max, v + f.step))}
                  className="inline-flex size-11 items-center justify-center rounded-lg border border-line text-ink-dim hover:bg-ink/5 hover:text-ink disabled:opacity-35 sm:size-8"
                >
                  <Plus className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
        <span className="text-xs text-ink-dim">Өөрчлөлт шууд хадгалагдана</span>
        <button
          type="button"
          disabled={!changed}
          onClick={() => onChange(DEFAULT_CRITERIA)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-brand hover:bg-brand-bright/10 disabled:opacity-40 sm:min-h-8"
        >
          <RotateCcw className="size-4" aria-hidden />
          Анхны утга
        </button>
      </div>
    </Popover>
  );
}
