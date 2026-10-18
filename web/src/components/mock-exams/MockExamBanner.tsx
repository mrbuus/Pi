"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { fmtUb } from "@/components/books/types";
import { useMockExams } from "./useMockExams";

// Номын хуудасны дээд зурвас: дараагийн (эсвэл явагдаж буй) жишиг сорил
export default function MockExamBanner() {
  const { pub, canRegister, loggedIn, regOf, register } = useMockExams();
  const [busy, setBusy] = useState(false);
  const ev = pub?.live ?? pub?.next ?? null;
  if (!pub) return null;
  const reg = ev ? regOf(ev.id) : null;
  const act = async () => {
    if (!ev) return;
    setBusy(true);
    try { await register(ev.id); toast.success("Жишиг сорилд бүртгүүллээ"); } catch (e) { toast.error(e instanceof Error ? e.message : "Алдаа гарлаа"); } finally { setBusy(false); }
  };
  return (
    <div className="border-b border-line bg-brand-bright/8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold"><Sparkles className="h-4 w-4 text-brand" aria-hidden />{ev?.phase === "live" ? "Жишиг сорил явагдаж байна" : "Долоо хоногийн жишиг сорил"}</span>
        {ev ? (
          <>
            <span className="text-ink-dim">{fmtUb(ev.startsAt)} · {ev.problemCount} бодлого{ev.timeLimitMin ? `, ${ev.timeLimitMin} мин` : ""} · {ev.registered} бүртгүүлсэн</span>
            <span className="ml-auto flex items-center gap-2">
              {reg?.status === "SUBMITTED" ? (
                <Button asChild size="sm" variant="outline"><Link href={`/app/tests/${reg.testId}`}>Дүн харах</Link></Button>
              ) : reg && ev.phase === "live" ? (
                <Button asChild size="sm"><Link href={`/app/tests/${reg.testId}`}>Шалгалт эхлэх<ArrowRight aria-hidden /></Link></Button>
              ) : reg ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-4 w-4" aria-hidden />Бүртгүүлсэн</span>
              ) : canRegister ? (
                <Button size="sm" onClick={act} disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : null}Бүртгүүлэх</Button>
              ) : !loggedIn ? (
                <Button asChild size="sm"><Link href="/login?next=%2Fsorils">Нэвтэрч бүртгүүлэх</Link></Button>
              ) : null}
              <Link href="/sorils" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-brand">Дэлгэрэнгүй<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
            </span>
          </>
        ) : (
          <span className="ml-auto"><Link href="/sorils" className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-brand">Хуваарь удахгүй<ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link></span>
        )}
      </div>
    </div>
  );
}
