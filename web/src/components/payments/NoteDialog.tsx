"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import LedgerDialog, { Field, inputCls } from "./LedgerDialog";
import { addDays, dayLabel, todayUB } from "./ledgerFormat";
import { errMsg } from "./paymentHelpers";

/**
 * Төлбөрийн тэмдэглэл: хэнтэй юу ярьсан + хэзээ төлөхөөр амласан.
 * Зохиогч, цаг нь автоматаар (POST /students/:id/notes, type PAYMENT).
 */
export default function NoteDialog({
  studentId,
  studentName,
  onClose,
  onSaved,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = todayUB();
  const [body, setBody] = useState("");
  const [promisedOn, setPromisedOn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quick = [
    { label: "Маргааш", value: addDays(today, 1) },
    { label: "3 хоногт", value: addDays(today, 3) },
    { label: "7 хоногт", value: addDays(today, 7) },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Юу ярьсныг бичнэ үү");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/students/${encodeURIComponent(studentId)}/notes`, {
        method: "POST",
        body: { type: "PAYMENT", body: body.trim(), ...(promisedOn ? { promisedOn } : {}) },
      });
      toast.success(promisedOn ? `Тэмдэглэл, амлалт ${dayLabel(promisedOn)} хадгалагдлаа` : "Тэмдэглэл хадгалагдлаа");
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <LedgerDialog open onOpenChange={(o) => !o && onClose()} title="Төлбөрийн тэмдэглэл" description={studentName}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Юу ярьсан" htmlFor="note-body">
          <textarea
            id="note-body"
            rows={3}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Ээжтэй утсаар ярьсан, цалин буухаар шилжүүлнэ гэсэн"
            className={`${inputCls} min-h-24 resize-y`}
          />
        </Field>
        <Field label="Төлөхөөр амласан өдөр" htmlFor="note-promise">
          <input
            id="note-promise"
            type="date"
            min={today}
            value={promisedOn}
            onChange={(e) => setPromisedOn(e.target.value)}
            className={inputCls}
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                aria-pressed={promisedOn === q.value}
                onClick={() => setPromisedOn(promisedOn === q.value ? "" : q.value)}
                className={`min-h-11 rounded-lg border px-3 text-sm transition ${
                  promisedOn === q.value ? "border-brand bg-brand-tint text-ink" : "border-line text-ink-dim hover:text-ink"
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? "Хадгалж байна" : "Хадгалах"}
        </Button>
      </form>
    </LedgerDialog>
  );
}
