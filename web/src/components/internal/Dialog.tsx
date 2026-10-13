"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * «Дотоод»-ын цонх: утсан дээр доороос гарах хуудас, компьютер дээр голд.
 * Radix — фокус занга, Escape, aria-modal, гарчгаар нэрлэгдэнэ (STATUS §6.9).
 */
export default function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-[2px] enter-fade" />
        <RadixDialog.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-[28px] border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] outline-none enter-pop",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[calc(100vw-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:border sm:border-b-4",
            wide ? "sm:max-w-3xl" : "sm:max-w-lg",
          )}
        >
          <div className="flex items-start gap-3 px-5 pb-2 pt-5 sm:px-6">
            <div className="min-w-0 flex-1">
              <RadixDialog.Title className="cyrillic-heading text-lg font-extrabold text-ink">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-ink-dim">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
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
