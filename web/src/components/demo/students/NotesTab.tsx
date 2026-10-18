"use client";

import { Lock, NotebookPen, StickyNote } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { dayMonth } from "../classes/format";
import type { StudentStat } from "../classes/stats";
import { ME, todayKey } from "../world";
import { sampleNotes, type NoteItem } from "./notes";

/** Багшийн тэмдэглэл: жишээ тэмдэглэлүүд + шинээр нэмэх (демод хадгалагдахгүй, зөвхөн энэ хуудсанд харагдана) */
export default function NotesTab({ stat }: { stat: StudentStat }) {
  const { student, cls, flags } = stat;
  const base = useMemo(() => sampleNotes(student, flags, [cls.leadId, cls.assistantId]), [student, flags, cls]);
  const [added, setAdded] = useState<NoteItem[]>([]);
  const [text, setText] = useState("");
  const notes = [...added, ...base];

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setAdded((list) => [{ id: `new-${list.length}`, dateKey: todayKey(), author: ME.name, text: t }, ...list]);
    setText("");
    toast.success("Тэмдэглэл нэмэгдлээ", { description: "Демо: өгөгдөл хадгалагдахгүй" });
  }

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-dim">
        <Lock className="size-3.5" aria-hidden />
        Зөвхөн багш нар харна, сурагч болон эцэг эхэд харагдахгүй
      </p>

      <form onSubmit={submit} className="mb-4">
        <label className="block text-sm text-ink-dim">
          <span className="mb-1 block">Шинэ тэмдэглэл</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Жишээ нь: эцэг эхтэй ярьсан, даалгаврын талаар сануулсан"
            className="min-h-11 w-full rounded-xl border border-line bg-bg px-3 py-2 text-base text-ink outline-none placeholder:text-ink-dim focus:border-brand"
          />
        </label>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs tabular-nums text-ink-dim">{text.length} / 500</span>
          <Button type="submit" disabled={!text.trim()} size="md">
            <NotebookPen aria-hidden />
            Нэмэх
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="Тэмдэглэл одоогоор алга" hint="Дээрх талбарт бичээд нэмнэ үү" />
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="rounded-xl border border-line p-3">
              <p className="text-sm text-ink">{n.text}</p>
              <p className="mt-1 text-xs text-ink-dim">
                {n.author}, {dayMonth(n.dateKey)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
