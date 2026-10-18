"use client";

import { Send, StickyNote } from "lucide-react";
import { useState } from "react";
import { Dot } from "@/components/ui/Meta";
import type { Note } from "./mock";
import { Avatar } from "./parts";
import { NOTE_MAX } from "./store";

/**
 * Сонгосон өдрийн нийтлэг тэмдэглэл — тухайн ангийн бүх багш харна.
 * Нягт: тэмдэглэл бүрийн доор жижгээр зохиогч (нэрийн үсэг, нэр, цаг).
 */
export default function DayNotes({ notes, onAdd }: { notes: Note[]; onAdd: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft("");
  };

  return (
    <section aria-label="Өдрийн тэмдэглэл" className="rounded-xl border border-line bg-surface">
      {notes.length > 0 && (
        <>
          <h2 className="flex items-center gap-1.5 px-3 pt-2 text-xs font-semibold text-ink-dim">
            <StickyNote className="size-3.5 shrink-0 text-brand" aria-hidden />
            Тэмдэглэл
            <span className="tabular-nums">{notes.length}</span>
            <span className="ml-auto font-normal">Бүх багш харна</span>
          </h2>
          <ul className="max-h-36 divide-y divide-line overflow-y-auto px-3 sm:max-h-44">
            {notes.map((n) => (
              <li key={n.id} className="py-1.5">
                <p className="text-sm text-ink">{n.text}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-4 text-ink-dim">
                  <Avatar name={n.author} className="size-4 text-[8px]" />
                  <span>{n.author}</span>
                  <Dot />
                  <time>{n.time}</time>
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      <form onSubmit={submit} className={notes.length > 0 ? "flex items-center gap-1 border-t border-line p-1" : "flex items-center gap-1 p-1"}>
        {notes.length === 0 && <StickyNote className="ml-2 size-4 shrink-0 text-brand" aria-hidden />}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Өдрийн тэмдэглэл нэмэх, бүх багш харна"
          placeholder={notes.length > 0 ? "Тэмдэглэл нэмэх" : "Тэмдэглэл нэмэх, бүх багш харна"}
          maxLength={NOTE_MAX}
          enterKeyHint="send"
          className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 text-sm text-ink placeholder:text-ink-dim/70 sm:min-h-9"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Тэмдэглэл нэмэх"
          title="Нэмэх"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-brand transition-colors hover:bg-brand-bright/10 disabled:pointer-events-none disabled:opacity-35 sm:size-9"
        >
          <Send className="size-4" aria-hidden />
        </button>
      </form>
    </section>
  );
}
