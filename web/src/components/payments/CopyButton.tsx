"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Хуулах товч — дарахад 1.8 секунд «Хуулсан» гэж харуулна (төлбөрийн мэдээлэлд) */
export default function CopyButton({ text, label, caption = "Хуулах" }: { text: string; label: string; caption?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        }
      }}
      aria-label={`${label} хуулах`}
      className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink transition hover:border-brand-bright/50"
    >
      {done ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4 text-ink-dim" aria-hidden />}
      {done ? "Хуулсан" : caption}
    </button>
  );
}
