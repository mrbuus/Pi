"use client";

import { useEffect, useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";

/**
 * Ерөнхий баталгаажуулах цонх — устгах болон хадгалаагүй өөрчлөлт хаях үед
 * ХОЁУЛАНД нь ашиглана (TaskFormModal-тай ижил дизайн хэв маяг: overlay +
 * rounded-2xl surface dialog).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Тийм",
  cancelLabel = "Болих",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function rememberOpener(event: FocusEvent) {
      if (
        !contentRef.current &&
        event.target instanceof HTMLElement &&
        event.target !== document.body
      )
        returnFocus.current = event.target;
    }
    document.addEventListener("focusin", rememberOpener);
    return () => document.removeEventListener("focusin", rememberOpener);
  }, []);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/60" />
        <Dialog.Content
          ref={contentRef}
          {...(!description ? { "aria-describedby": undefined } : {})}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-5 outline-none"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            const active = document.activeElement;
            if (
              active instanceof HTMLElement &&
              active !== document.body &&
              !contentRef.current?.contains(active)
            )
              returnFocus.current = active;
            cancelRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <Dialog.Title className="text-base font-bold text-ink">
            {title}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-ink-dim">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              ref={cancelRef}
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition hover:border-brand"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`min-h-11 rounded-lg px-3 text-sm font-bold transition ${danger ? "bg-error text-on-error hover:opacity-90" : "bg-brand-bright text-on-brand hover:opacity-90"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
