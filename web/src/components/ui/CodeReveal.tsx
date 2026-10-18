"use client";

import { useState } from "react";
import { Check, Copy, Hash } from "lucide-react";

/**
 * Бодлогын код (token) — эзний дүрэм (2026-10-08): анхдагчаар ХАРАГДАХГҮЙ.
 * Ажилтан жижиг «#» товч дарж л харж/хуулна. Сурагчийн хуудсанд ашиглахгүй
 * (сурагчийн API-д код огт ирэхгүй).
 */
export default function CodeReveal({ code, className = "" }: { code?: string | null; className?: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  if (!open) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="Бодлогын кодыг харах"
        title="Бодлогын код"
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand ${className}`}
      >
        <Hash className="h-4 w-4" aria-hidden />
      </button>
    );
  }
  return (
    // className нь зөвхөн хаалттай «#» товчны хэмжээ — нээлттэй кодод хэрэглэвэл (h-6 w-6)
    // код босоо тасарч хөрш элементтэй давхцдаг байв (2026-10-18)
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-line bg-panel px-2 py-0.5 font-mono text-xs text-ink">
      {code}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void navigator.clipboard?.writeText(code).then(() => setCopied(true)).catch(() => {});
        }}
        aria-label="Кодыг хуулах"
        className="inline-flex h-6 w-6 items-center justify-center rounded text-ink-dim hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </span>
  );
}
