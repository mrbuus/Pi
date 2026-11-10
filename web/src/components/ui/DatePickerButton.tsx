"use client";

import { useRef, type ReactNode } from "react";

/**
 * Огноо сонгох товч. Харагдахгүй `<input type="date">`-ийг товч дээр давхарлавал компьютерийн
 * хөтөч (Chrome/Safari/Firefox) календарь НЭЭДЭГГҮЙ (зөвхөн фокус авдаг) — тестэрийн санал
 * 2026-11-05. Товч дарахад showPicker()-ээр шууд нээнэ; дэмжихгүй хөтөчид фокус руу.
 */
export default function DatePickerButton({
  value,
  onChange,
  max,
  ariaLabel,
  className,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  max?: string;
  ariaLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={ariaLabel}
        className={className}
        onClick={() => {
          const el = input.current;
          if (!el) return;
          try {
            el.showPicker();
          } catch {
            el.focus();
            el.click();
          }
        }}
      >
        {children}
      </button>
      <input
        ref={input}
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
      />
    </span>
  );
}
