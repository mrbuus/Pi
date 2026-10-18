"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Хуваарийн цонх: утсан дээр доороос гарах хуудас, компьютер дээр голд.
 * Radix — role="dialog", aria-modal, гарчгаар нэрлэгдэнэ, фокус занга, Escape (STATUS §6.9).
 */
export default function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="enter-fade fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px]" />
        <RadixDialog.Content className="enter-pop elev-3 fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-[28px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] outline-none sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(34rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border">
          <div className="flex items-start gap-3 px-5 pb-2 pt-5 sm:px-6">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="cyrillic-heading text-lg font-extrabold text-ink">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description asChild>
                  <div className="mt-1 text-sm text-ink-dim">{description}</div>
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">Хуваарь</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close
              aria-label="Хаах"
              className="-mr-2 -mt-1 inline-flex size-11 shrink-0 items-center justify-center rounded-2xl text-ink-dim transition hover:bg-ink/5 hover:text-ink"
            >
              <X className="size-5" aria-hidden />
            </RadixDialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-4 sm:px-6">{footer}</div>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const FIELD =
  "min-h-11 w-full rounded-xl border border-line bg-bg px-3 text-base text-ink outline-none focus:border-brand disabled:opacity-60";

export function Field({ label, htmlFor, children, wide = false }: { label: string; htmlFor: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : "col-span-2 sm:col-span-1"}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm text-ink-dim">
        {label}
      </label>
      {children}
    </div>
  );
}
