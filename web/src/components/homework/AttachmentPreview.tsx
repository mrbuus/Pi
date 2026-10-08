"use client";

import { useState } from "react";
import { ExternalLink, FileText, Maximize2, RotateCcw, X } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";

export default function AttachmentPreview({
  fileKey,
  label = "Хавсралт",
  inline = false,
}: {
  fileKey: string;
  label?: string;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const pdf = /\.pdf$/i.test(fileKey);
  const source = fileUrl(fileKey);
  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label} — томруулж харах`}
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-panel text-brand ${inline ? "min-h-24 max-w-full" : "h-24 w-24"}`}
      >
        {pdf ? (
          <>
            <FileText className="h-8 w-8" aria-hidden />
            <span className="absolute bottom-2 text-xs font-semibold">PDF</span>
          </>
        ) : failed ? (
          <span className="px-2 text-xs text-ink-dim">Зураг нээх</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={attempt}
            src={source}
            alt={label}
            loading="lazy"
            className={
              inline
                ? "max-h-[60dvh] max-w-full object-contain"
                : "h-full w-full object-cover"
            }
            onError={() => setFailed(true)}
          />
        )}
        <Maximize2
          className="absolute right-1 top-1 h-5 w-5 rounded bg-surface text-ink"
          aria-hidden
        />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent aria-describedby={undefined}>
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
            <DrawerTitle className="min-w-0 truncate font-bold">
              {label}
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Хавсралтыг хаах"
              onClick={() => setOpen(false)}
            >
              <X aria-hidden />
            </Button>
          </div>
          <div className="min-h-0 overflow-auto p-4" data-vaul-no-drag>
            {pdf ? (
              <div className="space-y-3">
                <p className="text-sm text-ink-dim">
                  PDF файлыг шинэ цонхонд нээж, томруулан уншиж болно.
                </p>
                <Button asChild variant="outline">
                  <a href={source} target="_blank" rel="noopener noreferrer">
                    PDF нээх <ExternalLink aria-hidden />
                  </a>
                </Button>
              </div>
            ) : failed ? (
              <div role="alert" className="space-y-3">
                <p className="text-sm text-error">
                  Зураг ачаалсангүй. Холболтоо шалгаад дахин оролдоорой.
                </p>
                <Button variant="outline" onClick={retry}>
                  <RotateCcw aria-hidden /> Дахин оролдох
                </Button>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={attempt}
                src={source}
                alt={label}
                className="mx-auto max-h-[65dvh] max-w-full rounded-lg object-contain"
                onError={() => setFailed(true)}
              />
            )}
            {!pdf && (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline"
              >
                Эх хэмжээгээр нээх{" "}
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
