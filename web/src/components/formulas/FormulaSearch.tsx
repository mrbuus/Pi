"use client";
import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
export function FormulaSearch({
  query,
  level,
  grade,
  onChange,
}: {
  query: string;
  level: string;
  grade: string;
  onChange: (name: string, value: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(query);
  const [previous, setPrevious] = useState(query);
  if (previous !== query) {
    setPrevious(query);
    setDraft(query);
  }
  useEffect(() => {
    if (draft === query) return;
    const timer = setTimeout(() => onChange("q", draft), 250);
    return () => clearTimeout(timer);
  }, [draft, query, onChange]);
  const input =
    "min-h-12 w-full rounded-xl border border-line bg-panel px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand-bright";
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
      <div>
        <label htmlFor={`${id}-q`} className="mb-1 block text-sm font-semibold">
          Томьёо хайх
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-5 text-ink-dim"
            aria-hidden
          />
          <input
            id={`${id}-q`}
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Нэр, томьёо, сэдэв"
            className={`${input} pl-10`}
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${id}-level`}
          className="mb-1 block text-sm font-semibold"
        >
          Түвшин
        </label>
        <select
          id={`${id}-level`}
          value={level}
          onChange={(e) => onChange("level", e.target.value)}
          className={input}
        >
          <option value="">Бүгд</option>
          <option value="CORE">ЭЕШ-ийн гол</option>
          <option value="EXTRA">Нэмэлт</option>
        </select>
      </div>
      <div>
        <label
          htmlFor={`${id}-grade`}
          className="mb-1 block text-sm font-semibold"
        >
          Анги
        </label>
        <select
          id={`${id}-grade`}
          value={grade}
          onChange={(e) => onChange("grade", e.target.value)}
          className={input}
        >
          <option value="">Бүгд</option>
          {[7, 8, 9, 10, 11, 12].map((n) => (
            <option key={n} value={n}>
              {n}-р анги
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
