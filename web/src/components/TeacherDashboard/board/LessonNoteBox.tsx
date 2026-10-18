"use client";

import { CloudCheck, LoaderCircle, StickyNote, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dot } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { POLL_MS } from "./useBoard";
import { whenLabel, type LessonNote } from "./lib";

const NOTE_LIMIT = 500;

/** «Баасанжав О.» → «О. Баасанжав» (аппын бусад газартай ижил хэлбэр) */
function initialFirst(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length !== 2) return name;
  const [first, last] = parts;
  return `${last.charAt(0).toUpperCase()}. ${first}`;
}
const TYPE_MS = 900;

/**
 * Өдрийн хуваарьтай НЭГ тэмдэглэл (D4, LessonNote): тэнд бичсэн нь энд, энд бичсэн нь тэнд.
 * Бичиж зогсоход эсвэл гарахад хадгална; бусад багшийн засварыг 15 сек тутам татна
 * (бичиж байх үед дарж бичихгүй). Доор нь сүүлд зассан хүн, цаг жижгээр.
 */
export default function LessonNoteBox({ scheduleId, date, today }: { scheduleId: string; date: string; today: string }) {
  const [note, setNote] = useState<LessonNote | null>(null);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "saving" | "error">("loading");
  const [error, setError] = useState("");
  const dirty = useRef(false);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  // field-sizing: content-ийг дэмждэггүй хөтөч (хуучин Safari) — өндрийг бичвэрт тааруулна
  useEffect(() => {
    const el = area.current;
    if (!el || CSS.supports("field-sizing", "content")) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);
  const draftRef = useRef("");

  const load = useCallback(async () => {
    try {
      const day = await api<{ notes?: LessonNote[] }>(`/lesson-records/day?date=${date}`);
      const mine = (day.notes ?? []).find((n) => n.scheduleId === scheduleId) ?? null;
      setNote(mine);
      if (!dirty.current && !focused.current) {
        setDraft(mine?.body ?? "");
        draftRef.current = mine?.body ?? "";
      }
      setState((s) => (s === "loading" || s === "error" ? "ready" : s));
    } catch (e) {
      setState((s) => (s === "loading" ? "error" : s));
      setError(e instanceof Error ? e.message : "Тэмдэглэл ачаалагдсангүй");
    }
  }, [date, scheduleId]);

  // Анги/өдөр солигдоход эцэг нь шинээр mount хийнэ (key) — анхны төлөв «loading»
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [load]);

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    const body = draftRef.current.trim();
    setState("saving");
    try {
      const res = await api<{ note: { body: string; updatedByName: string; updatedAt: string } | null }>(
        `/lesson-records/${encodeURIComponent(scheduleId)}/note`,
        { method: "PUT", body: { date, body: body || null } },
      );
      // Хадгалах хооронд дахин бичээгүй бол л цэвэр гэж тооцно
      if (draftRef.current.trim() === body) dirty.current = false;
      setNote(res.note ? { scheduleId, ...res.note } : null);
      setState("ready");
      setError("");
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    }
  }, [date, scheduleId]);

  // Гарахад/анги солиход хадгалаагүй бичвэрийг илгээнэ
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => () => void saveRef.current(), [scheduleId, date]);

  const meta = note ? initialFirst(note.updatedByName) : null;

  return (
    <section aria-label="Хичээлийн тэмдэглэл" className="rounded-xl border border-line bg-surface">
      <div className="flex items-start gap-2 px-3 pt-2">
        <StickyNote className="mt-2.5 size-4 shrink-0 text-brand sm:mt-2" aria-hidden />
        <textarea
          ref={area}
          value={draft}
          rows={1}
          maxLength={NOTE_LIMIT}
          disabled={state === "loading"}
          aria-label="Хичээлийн тэмдэглэл"
          placeholder={state === "loading" ? "Ачаалж байна" : "Тэмдэглэл бичих"}
          onFocus={() => (focused.current = true)}
          onBlur={() => {
            focused.current = false;
            void save();
          }}
          onChange={(e) => {
            setDraft(e.target.value);
            draftRef.current = e.target.value;
            dirty.current = true;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => void save(), TYPE_MS);
          }}
          className="field-sizing-content block min-h-11 min-w-0 flex-1 resize-none overflow-x-hidden rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden bg-transparent px-1 py-2.5 text-sm leading-5 text-ink placeholder:text-ink-dim/70 sm:min-h-9 sm:py-2"
        />
      </div>
      <p className="flex min-h-2 flex-wrap items-center gap-1.5 px-3 pb-1.5 pl-9 text-[11px] leading-4 text-ink-dim">
        {state === "saving" ? (
          <>
            <LoaderCircle className="size-3 animate-spin text-brand motion-reduce:animate-none" aria-hidden />
            Хадгалж байна…
          </>
        ) : state === "error" ? (
          <span role="alert" className="inline-flex items-center gap-1 text-error">
            <TriangleAlert className="size-3" aria-hidden />
            {error || "Хадгалж чадсангүй"}
          </span>
        ) : note ? (
          <>
            <CloudCheck className="size-3 text-success" aria-hidden />
            <span>{meta}</span>
            <Dot />
            <time dateTime={note.updatedAt}>{whenLabel(note.updatedAt, today, "")}</time>
          </>
        ) : null}
        {draft.length > NOTE_LIMIT - 60 && <span className="ml-auto tabular-nums">{draft.length}/{NOTE_LIMIT}</span>}
      </p>
    </section>
  );
}
