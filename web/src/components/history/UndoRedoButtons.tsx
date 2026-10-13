"use client";

import { useSyncExternalStore } from "react";
import { Redo2, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";

const noopSubscribe = () => () => {};

/** Mac дээр «Cmd», бусад үед «Ctrl» гэж зөвлөмжид бичнэ. */
function useIsMac(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

const buttonClass =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-ink-dim transition hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-40";

/**
 * ↶ Буцаах · ↷ Урагшлах (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md §1).
 * Утсан дээр зөвхөн дүрс (aria-label-тай), өргөн дэлгэцэнд шошготой.
 */
export default function UndoRedoButtons({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  compact = false,
  className,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  /** true — шошгогүй, зөвхөн дүрс */
  compact?: boolean;
  className?: string;
}) {
  const mac = useIsMac();
  const undoHint = `Буцаах (${mac ? "Cmd+Z" : "Ctrl+Z"})`;
  const redoHint = `Урагшлах (${mac ? "Shift+Cmd+Z" : "Ctrl+Y"})`;
  return (
    <div role="group" aria-label="Засварыг буцаах, урагшлах" className={cn("inline-flex items-center gap-0.5", className)}>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label={undoHint}
        title={undoHint}
        aria-keyshortcuts={mac ? "Meta+Z" : "Control+Z"}
        className={buttonClass}
      >
        <Undo2 className="h-4 w-4" aria-hidden />
        {!compact && <span className="hidden sm:inline">Буцаах</span>}
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label={redoHint}
        title={redoHint}
        aria-keyshortcuts={mac ? "Shift+Meta+Z" : "Control+Y"}
        className={buttonClass}
      >
        <Redo2 className="h-4 w-4" aria-hidden />
        {!compact && <span className="hidden sm:inline">Урагшлах</span>}
      </button>
    </div>
  );
}
