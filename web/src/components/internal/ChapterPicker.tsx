"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import type { Subject } from "./model";

interface Book {
  id: string;
  code: string;
  title: string;
}
interface Chapter {
  id: string;
  title: string;
  bookId: string | null;
  book?: { code: string; title: string } | null;
}

const select =
  "min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink focus:border-brand-bright focus:outline-none focus:ring-2 focus:ring-brand-bright/25 disabled:opacity-60";
/** ӨС-ийн «А · Б» гарчгийг сонголтын мөрөнд « — » болгоно (STATUS §6.3) */
const clean = (s: string) => s.replace(/\s+·\s+/g, " — ");

/** Ном → бүлэг. Сонгосон бүлгийн ID-г буцаана (хоосон бол null). */
export default function ChapterPicker({
  subject,
  value,
  onChange,
  idPrefix,
  className,
}: {
  subject?: Subject;
  value: string | null;
  onChange: (chapterId: string | null, chapter: { id: string; title: string } | null) => void;
  idPrefix: string;
  className?: string;
}) {
  const [books, setBooks] = useState<Book[] | null>(null);
  const [bookId, setBookId] = useState("");
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api<Book[]>(`/books${subject ? `?subject=${subject}` : ""}`)
      .then((list) => alive && setBooks(list))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Номын жагсаалт ирсэнгүй"));
    return () => {
      alive = false;
    };
  }, [subject]);

  // Урьдчилан сонгосон бүлгийн номыг олно
  useEffect(() => {
    if (!value || bookId) return;
    let alive = true;
    api<Chapter[]>(`/chapters${subject ? `?subject=${subject}` : ""}`)
      .then((list) => {
        const found = list.find((c) => c.id === value);
        if (alive && found?.bookId) setBookId(found.bookId);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value, bookId, subject]);

  useEffect(() => {
    if (!bookId) return;
    let alive = true;
    api<Chapter[]>(`/chapters?bookId=${encodeURIComponent(bookId)}`)
      .then((list) => alive && setChapters(list))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Бүлгийн жагсаалт ирсэнгүй"));
    return () => {
      alive = false;
    };
  }, [bookId]);

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <label htmlFor={`${idPrefix}-book`} className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
        Ном
        <select
          id={`${idPrefix}-book`}
          className={select}
          value={bookId}
          disabled={!books}
          onChange={(e) => {
            setBookId(e.target.value);
            setChapters(null);
            onChange(null, null);
          }}
        >
          <option value="">{books ? "Ном сонгох" : "Ачаалж байна"}</option>
          {books?.map((b) => (
            <option key={b.id} value={b.id}>
              {clean(b.title)} ({b.code})
            </option>
          ))}
        </select>
      </label>
      <label htmlFor={`${idPrefix}-chapter`} className="flex flex-col gap-1 text-xs font-semibold text-ink-dim">
        Бүлэг
        <select
          id={`${idPrefix}-chapter`}
          className={select}
          value={chapters?.some((c) => c.id === value) ? (value ?? "") : ""}
          disabled={!bookId || !chapters}
          onChange={(e) => {
            const chapter = chapters?.find((c) => c.id === e.target.value) ?? null;
            onChange(chapter?.id ?? null, chapter ? { id: chapter.id, title: chapter.title } : null);
          }}
        >
          <option value="">{!bookId ? "Эхлээд ном" : chapters ? "Бүлэг сонгох" : "Ачаалж байна"}</option>
          {chapters?.map((c) => (
            <option key={c.id} value={c.id}>
              {clean(c.title)}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-error sm:col-span-2">{error}</p>}
    </div>
  );
}
