"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const DESKTOP = "(min-width: 640px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(DESKTOP);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** ≥640px эсэх (самбар зөвхөн хөтөчид зурагддаг тул серверийн утга ач холбогдолгүй) */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
}

/**
 * Жижиг тохиргооны цонх: компьютер дээр товчны доор унжина, утсан дээр доороос
 * гарах хуудас (доод таб мөрийг давхарлан, бүдэг дэвсгэртэй). Гадна дарахад,
 * Escape-д хаагдана; Escape/«Хаах»-аар хаагдвал фокус товч руугаа буцна.
 */
export default function Popover({
  open,
  onOpenChange,
  title,
  trigger,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const desktop = useIsDesktop();
  const titleId = useId();

  const close = useCallback(
    (refocus: boolean) => {
      onOpenChange(false);
      if (refocus) wrap.current?.querySelector<HTMLElement>("button")?.focus();
    },
    [onOpenChange],
  );
  // Сонсогчид зөвхөн нээгдэх/хаагдахад солигдоно — эцгийн шинэ функц бүрт фокус булаахгүй
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });

  useEffect(() => {
    if (!open) return;
    panel.current?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (wrap.current?.contains(t) || panel.current?.contains(t)) return;
      closeRef.current(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      closeRef.current(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const head = (
    <div className="mb-2 flex items-center gap-2">
      <h2 id={titleId} className="min-w-0 flex-1 text-sm font-bold text-ink">
        {title}
      </h2>
      <button
        type="button"
        aria-label="Хаах"
        onClick={() => close(true)}
        className="-mr-1.5 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink sm:size-8"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );

  return (
    <div ref={wrap} className="relative">
      {trigger}
      {open &&
        (desktop ? (
          <div
            ref={panel}
            role="dialog"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cn(
              "elev-3 enter-pop absolute right-0 top-full z-30 mt-1.5 w-[21rem] rounded-xl border border-line bg-surface p-3 pt-1.5",
              className,
            )}
          >
            {head}
            {children}
          </div>
        ) : (
          createPortal(
            <>
              <div aria-hidden className="fixed inset-0 z-[60] bg-ink/40" />
              <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className={cn(
                  "elev-3 fixed inset-x-0 bottom-0 z-[61] max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2",
                  className,
                )}
              >
                <span aria-hidden className="mx-auto mb-1 block h-1 w-10 rounded-full bg-line" />
                {head}
                {children}
              </div>
            </>,
            document.body,
          )
        ))}
    </div>
  );
}
