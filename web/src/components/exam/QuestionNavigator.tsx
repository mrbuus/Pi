"use client";

import { Flag } from "lucide-react";
import { useEffect, useRef } from "react";

/* ============================================================================
 * QuestionNavigator — толгойн товчноос нээгддэг 8×5 (=40) торон навигатор.
 *
 * Дөрвөн төлөв, БҮГД өнгөөс ГАДНА хэлбэрээр ялгаатай (өнгөөр төдийгүй):
 *   Хариулаагүй  → зөвхөн хүрээ (дотор нь хоосон)
 *   Хариулсан    → дотроо будагдсан
 *   Тэмдэглэсэн  → буланд ⚑ дүрс (хариулсан эсэхээс үл хамаарна)
 *   Одоогийн     → зузаан хүрээ + сүүдэр (elevation)
 *
 * Esc дарахад анкет/асуулт руу шилжихгүйгээр л хаагдана (pageIdx хэвээр —
 * зөвхөн нүд дээр дарж байж очих боломжтой тул "байрлал алдагдахгүй"),
 * бас нээхийн өмнөх фокусыг сэргээнэ (стандарт modal хандалт).
 * ========================================================================== */

export interface NavigatorCell {
  id: string;
  answered: boolean;
  flagged: boolean;
}

export default function QuestionNavigator({
  open,
  onClose,
  cells,
  currentIndex,
  onJump,
  partIIStart,
}: {
  open: boolean;
  onClose: () => void;
  cells: NavigatorCell[];
  currentIndex: number;
  onJump: (index: number) => void;
  /** Хэсэг II эхлэх индекс (0-based) — өгвөл торыг I/II гэж бүлэглэнэ */
  partIIStart?: number;
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    lastFocusRef.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lastFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const answeredCount = cells.filter((c) => c.answered).length;
  const flaggedCount = cells.filter((c) => c.flagged).length;

  return (
    <div
      // bg-black/50: зургийн бус, модаль цонхны хараанцар — text-white биш, тул өөрчлөх шаардлагагүй
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Бодлогын навигатор"
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-ink">Бодлогын навигатор</p>
            <p className="text-xs text-ink-dim">
              {answeredCount}/{cells.length} хариулсан
              {flaggedCount > 0 && (
                <span> · <Flag size={12} className="inline mr-0.5" aria-hidden /> {flaggedCount} тэмдэглэсэн</span>
              )}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Навигаторыг хаах"
            className="flex min-h-11 items-center rounded-lg border border-line px-3 text-sm text-ink-dim transition hover:text-ink"
          >
            Хаах (Esc)
          </button>
        </div>

        {/* Тайлбар — өнгөөс гадна дүрсээр ялгасныг тодотгоно */}
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-ink-dim">
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded border border-line" /> Хариулаагүй
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded border border-brand bg-brand/20" /> Хариулсан
          </span>
          <span className="flex items-center gap-1.5">
            <Flag size={16} aria-hidden />
            Тэмдэглэсэн
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded border-[3px] border-ink" /> Одоогийн
          </span>
        </div>

        {partIIStart !== undefined && partIIStart > 0 && partIIStart < cells.length ? (
          <div className="space-y-4">
            <NavigatorGrid
              label={`I БҮЛЭГ — Сонгох (${partIIStart})`}
              cells={cells.slice(0, partIIStart)}
              offset={0}
              currentIndex={currentIndex}
              onJump={onJump}
              onClose={onClose}
            />
            <NavigatorGrid
              label={`II БҮЛЭГ — Тоо нөхөх (${cells.length - partIIStart})`}
              cells={cells.slice(partIIStart)}
              offset={partIIStart}
              currentIndex={currentIndex}
              onJump={onJump}
              onClose={onClose}
            />
          </div>
        ) : (
          <NavigatorGrid
            cells={cells}
            offset={0}
            currentIndex={currentIndex}
            onJump={onJump}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}

function NavigatorGrid({
  label,
  cells,
  offset,
  currentIndex,
  onJump,
  onClose,
}: {
  label?: string;
  cells: NavigatorCell[];
  offset: number;
  currentIndex: number;
  onJump: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div>
      {label && <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-dim">{label}</p>}
      <div className="overflow-x-auto">
        <div className="grid w-max grid-cols-8 gap-1.5 sm:gap-2">
          {cells.map((c, i) => {
            const globalIndex = offset + i;
            const isCurrent = globalIndex === currentIndex;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onJump(globalIndex);
                  onClose();
                }}
                aria-current={isCurrent ? "true" : undefined}
                aria-label={`${globalIndex + 1}-р бодлого${c.answered ? ", хариулсан" : ", хариулаагүй"}${c.flagged ? ", тэмдэглэсэн" : ""}${isCurrent ? ", одоогийн" : ""}`}
                className={`relative flex h-11 w-11 items-center justify-center rounded-lg text-xs font-bold transition ${
                  c.answered
                    ? "border border-brand bg-brand/15 text-ink"
                    : "border border-line text-ink-dim"
                } ${isCurrent ? "border-[3px] border-ink shadow-md" : ""}`}
              >
                {globalIndex + 1}
                {c.flagged && (
                  <Flag
                    size={14}
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-warning text-on-warning"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
