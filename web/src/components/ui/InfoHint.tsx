"use client";

import { Info } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const GAP = 8;
const VIEWPORT_PADDING = 8;
const POPOVER_WIDTH = 260;

interface Position {
  top: number;
  left: number;
  placement: "top" | "bottom";
}

/**
 * Жижиг "i" тэмдэг — дарахад тайлбар popover нээгдэнэ. Дахин дарах, гадна
 * талд дарах, Escape дарах эсвэл гүйлгэх үед хаагдана.
 *
 * Зорилго: урт тайлбар текстийг байнга харагдах caption байдлаар биш,
 * зөвхөн хэрэгтэй үед л ил гаргах. Товч UI дэвсгэрийг бохирдуулахгүй.
 */
export default function InfoHint({
  children,
  label = "Тайлбар харах",
  className = "",
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const close = useCallback(() => setOpen(false), []);

  // Байрлалыг тооцоолно — доор/дээр эргэх, хажуу тийш тайрагдахгүй байх.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const btn = buttonRef.current;
    const pop = popoverRef.current;
    if (!btn || !pop) return;

    const btnRect = btn.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - btnRect.bottom;
    const spaceAbove = btnRect.top;
    const placement: Position["placement"] =
      spaceBelow >= popRect.height + GAP || spaceBelow >= spaceAbove
        ? "bottom"
        : "top";
    const top =
      placement === "bottom"
        ? btnRect.bottom + GAP
        : btnRect.top - GAP - popRect.height;

    let left = btnRect.left + btnRect.width / 2 - popRect.width / 2;
    left = Math.max(
      VIEWPORT_PADDING,
      Math.min(left, vw - popRect.width - VIEWPORT_PADDING),
    );

    setPos({ top, left, placement });
  }, [open]);

  // Гадна талд дарах / товчийг дахин дарах үед хаана — button дотор
  // товшсон бол энд оролцохгүй, товчны onClick өөрөө toggle хийнэ.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      close();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    }
    function onScroll() {
      close();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, close]);

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-describedby={open ? popoverId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5 text-ink-dim transition hover:text-ink focus-visible:text-ink"
      >
        <Info aria-hidden size={15} strokeWidth={2.25} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          role="status"
          style={{
            position: "fixed",
            width: POPOVER_WIDTH,
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            visibility: pos ? "visible" : "hidden",
          }}
          className={`z-50 rounded-xl border border-line bg-surface p-3 text-sm leading-relaxed text-ink shadow-lg ${
            pos?.placement === "top" ? "info-hint-pop-top" : "info-hint-pop-bottom"
          }`}
        >
          {children}
        </div>
      )}
    </span>
  );
}
