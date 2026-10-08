"use client";

import { Toaster as Sonner } from "sonner";

/* Нэг удаа root layout-д. Хаанаас ч: import { toast } from "sonner";
   toast.success("Төлбөр баталгаажлаа") / toast.error(msg). Утсан дээр
   доод таб мөрний дээр, компьютер дээр баруун доор гарна. */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={{ bottom: 96 }}
      mobileOffset={{ bottom: 96 }}
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border !border-line !bg-surface !text-ink !shadow-lg !font-sans",
          description: "!text-ink-dim",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-error",
        },
      }}
    />
  );
}
