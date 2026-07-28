"use client";

import { useState, type KeyboardEvent } from "react";

// Owner-ийн жишээ: "ө" бичихэд шууд "өвчтэй" гэж санал болгоно (угтвар-тааралт).
// Чөлөөт бичвэрийг үргэлж зөвшөөрнө — санал бол зөвхөн хурдасгуур, хязгаарлалт биш.
export const NOTE_SUGGESTIONS = [
  "өвчтэй",
  "тэмцээн",
  "олимпиад",
  "гэр бүлийн шалтгаан",
  "эмнэлэг",
  "хичээлийн бус ажил",
] as const;

interface NoteAutocompleteProps {
  id: string;
  /** screen reader-д зориулсан sr-only label */
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * Тайлбарын оролт — угтвараар (prefix) шүүсэн санал зөвлөмжтэй жижиг
 * combobox. Чөлөөт бичвэрийг ямагт зөвшөөрнө; жагсаалтаас сонгох нь
 * зөвхөн хурдасгуур.
 */
export function NoteAutocomplete({
  id,
  label,
  value,
  onChange,
  placeholder,
}: NoteAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const listId = `${id}-listbox`;

  const trimmed = value.trim().toLowerCase();
  const matches = trimmed
    ? NOTE_SUGGESTIONS.filter((s) => s.toLowerCase().startsWith(trimmed))
    : NOTE_SUGGESTIONS; // хоосон үед бүх сонголтыг харуулна
  const showList = open && matches.length > 0;

  function pick(s: string) {
    onChange(s);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showList) {
      if (e.key === "ArrowDown") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (matches[highlight]) {
        e.preventDefault();
        pick(matches[highlight]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setHighlight(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Жагсаалт дээрх сонголтын click эвент дуусахаас өмнө хаагдахгүй байх
          // жижиг хойшлуулалт.
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? "Тайлбар (сонголтоор)…"}
        className="w-full rounded-lg border border-line bg-ink/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
      />
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-line bg-panel py-1 shadow-lg"
        >
          {matches.map((s, i) => (
            <li key={s} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
                className={`block min-h-11 w-full px-3 py-2 text-left text-sm ${
                  i === highlight ? "bg-brand-tint" : ""
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
