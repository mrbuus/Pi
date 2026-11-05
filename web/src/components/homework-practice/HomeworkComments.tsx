"use client";

import { LoaderCircle, Send, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatMnDateTime } from "@/lib/dateMn";

/** Гэрийн даалгавар дээрх сурагчид харагдах сэтгэгдэл (эзэн 2026-11-05) — API `HomeworkCommentView` */
export interface HwComment {
  id: string;
  kind: "NOTE" | "RETURN" | string;
  body: string;
  createdAt: string;
  fromTeacher: boolean;
  authorName: string;
  mine: boolean;
}

const stamp = (iso: string) =>
  formatMnDateTime(iso, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/**
 * Багш ↔ сурагчийн яриа нэг даалгавар дээр. Багшийн дотоод тэмдэглэлтэй ХОЛИХГҮЙ.
 * `onSend` амжилттай бол шинэ жагсаалтыг буцаана.
 */
export default function HomeworkComments({
  comments,
  onSend,
  placeholder,
  className,
  compact = false,
}: {
  comments: HwComment[];
  onSend: (body: string) => Promise<void>;
  placeholder: string;
  className?: string;
  compact?: boolean;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [comments.length]);

  async function send() {
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSend(body);
      setText("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Илгээж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      {comments.length > 0 && (
        <ol ref={listRef} className={cn("space-y-1.5 overflow-y-auto", compact ? "max-h-28" : "max-h-64")}>
          {comments.map((c) => (
            <li
              key={c.id}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm",
                c.kind === "RETURN"
                  ? "border border-error/40 bg-error/[0.07]"
                  : c.fromTeacher
                    ? "bg-brand-bright/10"
                    : "bg-panel",
              )}
            >
              <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-dim">
                {c.kind === "RETURN" && (
                  <b className="inline-flex items-center gap-0.5 text-error">
                    <Undo2 className="size-3" aria-hidden />
                    Буцаасан
                  </b>
                )}
                <b className="text-ink">{c.mine ? "Та" : c.authorName || (c.fromTeacher ? "Багш" : "Сурагч")}</b>
                <span className="tabular-nums">{stamp(c.createdAt)}</span>
              </p>
              <p className="selectable whitespace-pre-wrap break-words text-ink">{c.body}</p>
            </li>
          ))}
        </ol>
      )}
      <div className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{placeholder}</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={1}
            placeholder={placeholder}
            className="block min-h-11 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2 text-base text-ink outline-none placeholder:text-ink-dim focus:border-brand-bright sm:text-sm"
          />
        </label>
        <button
          type="button"
          onClick={send}
          disabled={!text.trim() || busy}
          aria-label="Илгээх"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-bright text-on-brand disabled:opacity-40"
        >
          {busy ? <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden /> : <Send className="size-4" aria-hidden />}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      )}
    </div>
  );
}
