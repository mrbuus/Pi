"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getClassroomColor } from "@/lib/classroomColor";

export interface ClassroomSelectOption {
  id: string;
  name: string;
  /** Жишээ: сурагчийн тоо — сонголт бүрийн доор жижигхэн харагдана */
  meta?: string;
}

interface ClassroomSelectProps {
  id?: string;
  /**
   * Screen reader-д зориулсан нэр. Хэрэв `labelledBy` өгвөл (гадна визуал
   * `<span id=...>` байгаа тохиолдолд) энэ нь зөвхөн fallback болно —
   * давхар accessible name үүсэхээс сэргийлнэ.
   */
  label: string;
  /** Гадна аль хэдийн харагдаж буй шошгын element id (aria-labelledby) */
  labelledBy?: string;
  options: ClassroomSelectOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Ангийн сонгогч — өнгөт бариултай, бүрэн хандалтын боломжтой (accessible)
 * custom dropdown. Native `<select>` ангийн өнгийг харуулж чадахгүй тул
 * button + listbox хэв маягаар сольсон (ARIA APG "Select-Only Combobox"-той
 * төстэй, гэхдээ owner-ийн хүсэлтээр button+listbox бүтэцтэй):
 *
 * - ArrowUp/ArrowDown: сонголт хооронд шилжинэ
 * - Home/End: эхний/сүүлийн сонголт руу
 * - Enter/Space: тухайн сонголтыг сонгож жагсаалтыг хаана
 * - Escape: хаана, button руу focus буцаана
 * - Гадна дараад хаагдана
 *
 * Ангийн өнгө `getClassroomColor()`-оос ирдэг тул сонгогч, жагсаалт хаана ч
 * ашиглагдсан ижил анги ЯГ ИЖИЛ өнгөтэй харагдана (нэг эх сурвалж).
 */
export function ClassroomSelect({
  id,
  label,
  labelledBy,
  options,
  value,
  onChange,
  disabled,
  placeholder,
}: ClassroomSelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const listboxId = id ? `${id}-listbox` : undefined;
  const selectedIndex = options.findIndex((o) => o.id === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  // Гадна товшихад хаах
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  // Нээгдэхэд одоогийн сонголт дээр идэвхжүүлж, listbox руу focus шилжүүлнэ
  useEffect(() => {
    if (!open) return;
    const idx = selectedIndex >= 0 ? selectedIndex : 0;
    setActiveIndex(idx);
    listRef.current?.focus();
  }, [open, selectedIndex]);

  // Идэвхтэй сонголтыг харагдах хэсэгт байлгана
  useEffect(() => {
    if (!open) return;
    const opt = options[activeIndex];
    if (opt) {
      optionRefs.current[opt.id]?.scrollIntoView({ block: "nearest" });
    }
  }, [open, activeIndex, options]);

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.id);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onListKeyDown(e: React.KeyboardEvent<HTMLUListElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, options.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const activeOptionId =
    open && options[activeIndex]
      ? `${listboxId}-opt-${options[activeIndex].id}`
      : undefined;

  const internalLabelId = id ? `${id}-sr-label` : undefined;
  const resolvedLabelledBy = labelledBy ?? internalLabelId;

  return (
    <div ref={rootRef} className="relative">
      {label && !labelledBy && (
        <span id={internalLabelId} className="sr-only">
          {label}
        </span>
      )}
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={
          resolvedLabelledBy ? `${resolvedLabelledBy} ${id}` : undefined
        }
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 min-w-56 items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand disabled:opacity-50"
      >
        {selected ? (
          <>
            <span
              aria-hidden
              className="h-4 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: getClassroomColor(selected.id) }}
            />
            <span className="flex-1 truncate text-left">
              {selected.name}
              {selected.meta && (
                <span className="text-ink-dim"> ({selected.meta})</span>
              )}
            </span>
          </>
        ) : (
          <span className="flex-1 truncate text-left text-ink-dim">
            {placeholder ?? "Сонгоно уу"}
          </span>
        )}
        <ChevronDown
          aria-hidden
          size={16}
          className={`shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-labelledby={resolvedLabelledBy}
          aria-activedescendant={activeOptionId}
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          className="absolute z-20 mt-1 max-h-64 w-full min-w-56 overflow-auto rounded-lg border border-line bg-panel py-1 shadow-lg"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.id === value;
            const isActive = idx === activeIndex;
            return (
              <li
                key={opt.id}
                id={`${listboxId}-opt-${opt.id}`}
                ref={(el) => {
                  optionRefs.current[opt.id] = el;
                }}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => commit(idx)}
                className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                  isActive ? "bg-brand-tint" : ""
                } ${isSelected ? "font-semibold" : ""}`}
              >
                <span
                  aria-hidden
                  className="h-4 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: getClassroomColor(opt.id) }}
                />
                <span className="flex-1 truncate">
                  {opt.name}
                  {opt.meta && (
                    <span className="text-ink-dim"> ({opt.meta})</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
