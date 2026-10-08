"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, BookOpen, MessageCircle, Send } from "lucide-react";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";

type Answer = { id: string; question: string; answer: string; source: { label: string; href: string } };
type Reply = { version: string; mode: string; matches: Answer[]; fallback: string | null };
const QUICK = ["Гэрийн даалгаврын зураг яаж илгээх вэ?", "Онол, бодолтоо хаанаас үзэх вэ?", "Эцэг эх хүүхдийн явцыг яаж харах вэ?", "Танхимын ангид яаж бүртгүүлэх вэ?"];

export default function CentreHelp() {
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [replies, setReplies] = useState<{ question: string; reply: Reply }[]>([]);
  async function ask(value = question) {
    const trimmed = value.trim();
    if (pending || trimmed.length < 2 || trimmed.length > 400) return;
    setError(""); setPending(true);
    try {
      const reply = await api<Reply>("/centre-help/ask", { method: "POST", body: { question: trimmed } });
      setReplies((rows) => [...rows.slice(-9), { question: trimmed, reply }]);
      setQuestion("");
    } catch {
      setError("Туслахтай холбогдож чадсангүй. Таны асуулт талбарт хэвээр байна. Дахин илгээх эсвэл төвтэй холбогдоно уу.");
      setQuestion(trimmed);
    } finally { setPending(false); }
  }
  return (
    <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="help-heading">
      <header className="space-y-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-bright/10 text-brand"><MessageCircle aria-hidden className="h-6 w-6" /></span>
        <h1 id="help-heading" className="cyrillic-heading text-2xl font-bold text-ink">Төвийн туслах</h1>
        <p className="max-w-xl text-sm leading-relaxed text-ink-dim">Сургалт болон вэбийн хэрэглээний баталгаатай мэдээллийг олно. Хариу бүрийн эх сурвалжийг нээж болно.</p>
        <details className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">Туслах юу мэддэг вэ?</summary>
          <p className="mt-2 leading-relaxed text-ink-dim">Төвийн нийтэд зориулж бичсэн мэдээллийг хайна. Хувийн дүн, төлбөрийн хуулга, нууц үг уншихгүй. Ерөнхий хиймэл оюун ухаан болон бодлого боддог чат биш. Мэдээлэл олдохгүй бол зохиож хариулахгүй.</p>
        </details>
      </header>

      {replies.length === 0 && <div className="grid gap-2 sm:grid-cols-2">{QUICK.map((item) => <button key={item} disabled={pending} onClick={() => void ask(item)} className="min-h-14 rounded-2xl border border-line bg-surface p-4 text-left text-sm text-ink transition hover:border-brand-bright focus-visible:outline-2 focus-visible:outline-brand">{item}</button>)}</div>}

      <div className="space-y-5" aria-live="polite" aria-relevant="additions">
        {replies.map(({ question: asked, reply }, index) => (
          <article key={`${index}-${asked}`} className="space-y-3">
            <p className="ml-8 rounded-2xl bg-brand-bright/10 p-4 text-sm font-medium text-ink break-words">{asked}</p>
            {reply.fallback && <p className="rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed text-ink-dim">{reply.fallback}</p>}
            {reply.matches.map((match, position) => <div key={match.id} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
              {position > 0 && <p className="mb-2 text-xs font-semibold text-ink-dim">Холбоотой мэдээлэл</p>}
              <h2 className="text-sm font-bold text-ink">{match.question}</h2>
              <div className="mt-2 text-sm leading-relaxed text-ink-dim"><MathText>{match.answer}</MathText></div>
              <Link href={match.source.href} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand"><BookOpen aria-hidden className="h-4 w-4" />{match.source.label}<ArrowUpRight aria-hidden className="h-4 w-4" /></Link>
            </div>)}
          </article>
        ))}
      </div>

      <form onSubmit={(event) => { event.preventDefault(); void ask(); }} className="space-y-3 rounded-2xl border border-line bg-panel p-4">
        <label htmlFor="centre-question" className="text-sm font-semibold">Асуултаа бичээрэй</label>
        <textarea id="centre-question" rows={3} value={question} maxLength={400} onChange={(event) => setQuestion(event.target.value)} placeholder="Жишээ нь: даалгаврынхаа зургийг хаана илгээх вэ?" className="mt-2 w-full resize-y rounded-xl border border-line bg-surface p-3 text-base text-ink focus-visible:outline-2 focus-visible:outline-brand" />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending || question.trim().length < 2} aria-busy={pending}><Send aria-hidden />{pending ? "Хайж байна…" : "Асуух"}</Button>
          <Link href="/app/feedback" className="inline-flex min-h-11 items-center text-sm text-brand underline">Санал хүсэлт өгөх</Link>
        </div>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
      </form>
      <p className="text-xs leading-relaxed text-ink-dim">Нууц үг, банкны мэдээлэл эсвэл бусдын хувийн мэдээллийг чатад бичихгүй байхыг хүсье.</p>
    </section>
  );
}
