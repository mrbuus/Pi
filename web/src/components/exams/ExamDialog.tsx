"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * «Шалгалт» хэсгийн модал (Radix Dialog): role="dialog", aria-modal, фокус
 * занга, Escape — STATUS §6.9. Утсан дээр бүтэн өргөн, доороосоо гүйлгэнэ.
 */
export default function ExamDialog({
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
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-modal="true"
          className={cn(
            "elev-3 fixed inset-x-2 bottom-2 top-auto z-[71] flex max-h-[88dvh] flex-col rounded-2xl border border-line bg-surface outline-none sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:-translate-x-1/2 sm:-translate-y-1/2",
            wide ? "sm:w-[min(56rem,calc(100vw-2rem))]" : "sm:w-[min(32rem,calc(100vw-2rem))]",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="cyrillic-heading text-base font-bold text-ink">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-ink-dim">
                  {description}
                </DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Хаах"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              <X className="h-5 w-5" aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
