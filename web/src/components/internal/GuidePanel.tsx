"use client";

import { ArrowDown, BookOpenText, Check, ClipboardPaste, Copy, ImageIcon, LoaderCircle } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import { CHATGPT_PROMPT, GUIDE_EXAMPLE_OUTPUT, GUIDE_TIPS } from "./guide";
import ImportReview from "./ImportReview";
import { parseDraftText, type ParsedBlock } from "./parse";

function Step({ n, title, children }: { n: number; title: string; children?: ReactNode }) {
  return (
    <section className="relative pl-10">
      <span
        aria-hidden
        className="absolute left-0 top-0 flex size-7 items-center justify-center rounded-full bg-brand-tint text-sm font-extrabold text-brand-soft"
      >
        {n}
      </span>
      <h3 className="pt-0.5 text-[15px] font-bold text-ink">{title}</h3>
      {children && <div className="mt-2">{children}</div>}
    </section>
  );
}

/**
 * Гарын авлага: ChatGPT-д өгөх бэлэн prompt → хариуг буулгах → блок болгох.
 * Prompt нь parse.ts-ийн гэрээтэй таарна (web/tests/internal-parse.test.cjs).
 */
export default function GuidePanel({
  onAdd,
  idPrefix = "guide",
  className,
}: {
  onAdd: (blocks: ParsedBlock[]) => Promise<void>;
  /** Хажуугийн самбар ба утасны хуудас зэрэг байхад ID давхцахгүй */
  idPrefix?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => parseDraftText(text), [text]);
  const example = useMemo(() => parseDraftText(GUIDE_EXAMPLE_OUTPUT), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CHATGPT_PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShowPrompt(true);
      toast("Хуулж чадсангүй — бичвэрийг сонгоод хуулна уу");
    }
  }

  async function add() {
    if (!parsed.length) return;
    setBusy(true);
    try {
      await onAdd(parsed);
      setText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      <header className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand-soft">
          <BookOpenText className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="cyrillic-heading text-lg font-extrabold leading-tight text-ink">Гарын авлага</h2>
          <p className="mt-0.5 text-sm text-ink-dim">ChatGPT-ээр зураг, PDF-ийг LaTeX болгох</p>
        </div>
      </header>

      <Step n={1} title="Prompt-ыг хуулна">
        <div className="relative">
          <pre
            className={cn(
              "selectable overflow-hidden whitespace-pre-wrap break-words rounded-2xl border border-line bg-bg px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink",
              !showPrompt && "max-h-36",
            )}
          >
            {CHATGPT_PROMPT}
          </pre>
          {!showPrompt && (
            <div aria-hidden className="pointer-events-none absolute inset-x-px bottom-px h-14 rounded-b-2xl bg-linear-to-t from-bg to-transparent" />
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void copy()}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copied ? "Хуулсан" : "Хуулах"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowPrompt((v) => !v)} aria-expanded={showPrompt}>
            {showPrompt ? "Хураах" : "Бүтнээр харах"}
          </Button>
        </div>
      </Step>

      <Step n={2} title="ChatGPT-д зураг, PDF эсвэл бичвэртэй нь илгээнэ" />

      <Step n={3} title="Хариуг энд буулгана">
        <label htmlFor={`${idPrefix}-paste`} className="sr-only">
          ChatGPT-ийн хариу
        </label>
        <textarea
          id={`${idPrefix}-paste`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={"1. ...\nA. ...\nХариу: B"}
          className="w-full resize-y rounded-2xl border border-line bg-surface px-3.5 py-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-ink-dim/60 focus:border-brand-bright focus:outline-none focus:ring-2 focus:ring-brand-bright/25"
        />
        {text.trim() && (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-semibold text-ink" aria-live="polite">
              {parsed.length ? `${parsed.length} бодлого танигдлаа` : "Бодлого танигдсангүй — хэлбэрийг шалгана уу"}
            </p>
            {parsed.length > 0 && <ImportReview blocks={parsed} compact />}
            <Button className="w-full" disabled={!parsed.length || busy} onClick={() => void add()}>
              {busy ? <LoaderCircle className="animate-spin" aria-hidden /> : <ClipboardPaste aria-hidden />}
              {parsed.length ? `${parsed.length} бодлого нэмэх` : "Нэмэх"}
            </Button>
          </div>
        )}
      </Step>

      <section className="rounded-2xl bg-brand-tint/60 px-4 py-3">
        <h3 className="text-sm font-bold text-brand-soft">Зөвлөмж</h3>
        <ul className="mt-2 space-y-1.5">
          {GUIDE_TIPS.map((tip) => (
            <li key={tip} className="flex gap-2 text-sm leading-snug text-ink">
              <Check className="mt-0.5 size-4 shrink-0 text-brand-soft" aria-hidden />
              {tip}
            </li>
          ))}
        </ul>
      </section>

      <details className="group rounded-2xl border border-line">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-4 text-sm font-bold text-ink">
          Жишээ харах
          <ArrowDown className="size-4 text-ink-dim transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-3 text-sm text-ink-dim">
            <ImageIcon className="size-5 shrink-0" aria-hidden />
            Сурах бичгийн хуудасны зураг + prompt
          </div>
          <ArrowDown className="mx-auto size-4 text-ink-dim" aria-hidden />
          <pre className="selectable whitespace-pre-wrap break-words rounded-xl border border-line bg-bg px-3.5 py-3 font-mono text-[12px] leading-relaxed text-ink">
            {GUIDE_EXAMPLE_OUTPUT}
          </pre>
          <ArrowDown className="mx-auto size-4 text-ink-dim" aria-hidden />
          <ImportReview blocks={example} compact />
        </div>
      </details>
    </div>
  );
}
