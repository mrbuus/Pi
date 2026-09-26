"use client";
import Link from "next/link";
import { RotateCw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto my-10 flex max-w-lg flex-col items-center gap-4 rounded-2xl border border-line bg-panel px-5 py-10 text-center text-ink">
    <TriangleAlert className="h-8 w-8 text-warning" aria-hidden />
    <h1 className="cyrillic-heading text-xl font-bold">Алдаа гарлаа</h1>
    <p className="text-ink-dim">Хуудсыг ачаалж чадсангүй. Дахин оролдоно уу.</p>
    <div className="flex flex-wrap justify-center gap-3">
      <button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-on-brand"><RotateCw size={18} aria-hidden />Дахин оролдох</button>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 py-3">Нүүр хуудас</Link>
    </div>
  </section>;
}
