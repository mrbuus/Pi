"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CalendarDays, Check, Clock, Loader2, LogIn, Sparkles, Trophy, Users, X } from "lucide-react";
import { toast } from "sonner";
import LogoMark from "@/components/LogoMark";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { fmtLeft, fmtUb, type MockEvent } from "@/components/books/types";
import { homeForRole } from "@/lib/api";
import { useMockExams } from "./useMockExams";

// Долоо хоног бүрийн онлайн жишиг сорил — нийтийн хуудас (/sorils)
const STEPS = [
  { icon: LogIn, t: "Бүртгүүл", d: "Нэвтэрч ороод сорилд нэрээ бүртгүүл, нэг товч" },
  { icon: Clock, t: "Цагтаа ор", d: "Эхлэх цагт энэ хуудаснаас «Шалгалт эхлэх», хугацаа автоматаар явна" },
  { icon: Trophy, t: "Дүн, байраа хар", d: "Илгээмэгц оноо, бусад сурагчдын дунд эзлэх байр гарна" },
];

export default function SorilsClient() {
  const { pub, failed, role, canRegister, loggedIn, regOf, register, unregister, refresh } = useMockExams();
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);
  // Сорил эхлэх мөчид төлөв шинэчлэгдэнэ
  useEffect(() => {
    const ev = pub?.next; if (!ev) return;
    const ms = new Date(ev.startsAt).getTime() - Date.now();
    if (ms <= 0 || ms > 6 * 3_600_000) return;
    const id = setTimeout(refresh, ms + 500);
    return () => clearTimeout(id);
  }, [pub, refresh]);

  const act = async (ev: MockEvent, on: boolean) => {
    setBusy(ev.id);
    try {
      if (on) { await register(ev.id); toast.success("Бүртгүүллээ, цагтаа энэ хуудаснаас эхлүүлээрэй"); }
      else { await unregister(ev.id); toast.success("Бүртгэлийг цуцаллаа"); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Алдаа гарлаа"); } finally { setBusy(null); }
  };
  const staff = role === "ADMIN" || role === "TEACHER_PLUS" || role === "TEACHER";
  const main = pub?.live ?? pub?.next ?? null;

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="Нүүр хуудас"><LogoMark size={34} /><span className="hidden text-sm font-bold sm:block">Шинэ Ирээдүйн Эзэд</span></Link>
          <nav className="ml-2 flex items-center gap-1 text-sm" aria-label="Хэсгүүд">
            <Link href="/books" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 font-semibold text-ink-dim hover:text-ink"><BookOpen className="h-4 w-4" aria-hidden />Ном, тест</Link>
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-bright/12 px-3 font-semibold text-brand-soft"><Sparkles className="h-4 w-4" aria-hidden />Жишиг сорил</span>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {loggedIn ? <Button asChild variant="outline" size="sm"><Link href={homeForRole(role ?? "STUDENT")}>Миний хэсэг</Link></Button>
              : <><Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login?next=%2Fsorils">Нэвтрэх</Link></Button><Button asChild size="sm"><Link href="/register?next=%2Fsorils">Бүртгүүлэх</Link></Button></>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:py-12">
        <section className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-wide text-brand">Долоо хоног бүр, онлайн</p>
            <h1 className="cyrillic-heading mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Жишиг сорил</h1>
            <p className="mt-3 max-w-lg text-ink-dim">ЭЕШ-ийн бүтэцтэй, хугацаатай сорилыг гэрээсээ өгч, дүн, байраа шууд хар<br />Танхимын ч, онлайн ч сурагч бүртгүүлж болно</p>
            {staff && <Button asChild variant="outline" size="sm" className="mt-4"><Link href="/app/admin/sorils">Удирдлага</Link></Button>}
          </div>
          {failed ? <ErrorState message="Сорилын мэдээллийг ачаалж чадсангүй" onRetry={refresh} /> : !pub ? <LoadingState rows={4} /> : main ? (
            <EventCard ev={main} now={now} reg={regOf(main.id)} canRegister={canRegister} loggedIn={loggedIn} busy={busy === main.id} onAct={(on) => act(main, on)} big />
          ) : (
            <div className="rounded-3xl border border-dashed border-line p-6 text-center text-ink-dim">
              <CalendarDays className="mx-auto mb-2 h-7 w-7" aria-hidden />Дараагийн сорилын хуваарь удахгүй зарлагдана
            </div>
          )}
        </section>

        <section aria-labelledby="how" className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
          <h2 id="how" className="text-lg font-bold">Хэрхэн явагддаг вэ</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {STEPS.map(({ icon: Icon, t, d }, i) => (
              <li key={t} className="flex gap-3 rounded-2xl bg-bg p-4 sm:flex-col">
                <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-bright/12 text-brand-soft"><Icon className="h-5 w-5" aria-hidden /><span className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-bright text-[11px] font-bold text-on-brand">{i + 1}</span></span>
                <span><span className="block font-semibold">{t}</span><span className="text-sm text-ink-dim">{d}</span></span>
              </li>
            ))}
          </ol>
        </section>

        {pub && pub.upcoming.length > (pub.live ? 0 : 1) && (
          <section aria-labelledby="up">
            <h2 id="up" className="mb-3 text-lg font-bold">Дараагийн долоо хоногууд</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {pub.upcoming.filter((e) => e.id !== main?.id).map((ev) => (
                <li key={ev.id}><EventCard ev={ev} now={now} reg={regOf(ev.id)} canRegister={canRegister} loggedIn={loggedIn} busy={busy === ev.id} onAct={(on) => act(ev, on)} /></li>
              ))}
            </ul>
          </section>
        )}

        {pub?.last && (
          <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-line bg-surface p-5">
            <Users className="h-6 w-6 text-brand" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Өмнөх сорил: {pub.last.title}</p>
              <p className="text-sm text-ink-dim">{fmtUb(pub.last.startsAt)} · {pub.last.participants} сурагч оролцсон{pub.last.avgPct != null ? `, дундаж ${pub.last.avgPct}%` : ""}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function EventCard({ ev, now, reg, canRegister, loggedIn, busy, onAct, big = false }: {
  ev: MockEvent; now: number; reg: ReturnType<ReturnType<typeof useMockExams>["regOf"]>;
  canRegister: boolean; loggedIn: boolean; busy: boolean; onAct: (on: boolean) => void; big?: boolean;
}) {
  const start = new Date(ev.startsAt).getTime(), end = new Date(ev.endsAt).getTime();
  const live = now >= start && now <= end;
  return (
    <article className={`rounded-3xl border bg-surface ${big ? "border-brand-bright/40 p-5 sm:p-6" : "border-line p-4"}`} aria-labelledby={`ev-${ev.id}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-brand">{live ? "Явагдаж байна" : fmtLeft(start - now) === "одоо" ? "Эхэлж байна" : `Эхлэхэд ${fmtLeft(start - now)} үлдлээ`}</p>
          <h3 id={`ev-${ev.id}`} className={`font-extrabold tracking-tight ${big ? "text-2xl" : "text-lg"}`}>{ev.title}</h3>
          <p className="mt-1 text-sm text-ink-dim">{fmtUb(ev.startsAt)}</p>
        </div>
        {reg && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" aria-hidden />Бүртгүүлсэн</span>}
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-dim">
        <div><dt className="sr-only">Бодлого</dt><dd><b className="text-ink">{ev.problemCount}</b> бодлого</dd></div>
        {ev.timeLimitMin ? <div><dt className="sr-only">Хугацаа</dt><dd><b className="text-ink">{ev.timeLimitMin}</b> минут</dd></div> : null}
        <div><dt className="sr-only">Бүртгүүлсэн</dt><dd><b className="text-ink">{ev.registered}</b> бүртгүүлсэн</dd></div>
      </dl>
      {ev.note && <p className="mt-2 text-sm text-ink-dim">{ev.note}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {reg?.status === "SUBMITTED" ? (
          <Button asChild><Link href={`/app/tests/${reg.testId}`}><Trophy aria-hidden />Дүн, байр харах{reg.score != null ? ` · ${reg.score}/${reg.max}` : ""}</Link></Button>
        ) : reg && live ? (
          <Button asChild size="lg"><Link href={`/app/tests/${reg.testId}`}>{reg.status === "IN_PROGRESS" ? "Үргэлжлүүлэх" : "Шалгалт эхлэх"}<ArrowRight aria-hidden /></Link></Button>
        ) : reg ? (
          <>
            <span className="text-sm text-ink-dim">Эхлэх цагт энд «Шалгалт эхлэх» товч гарна</span>
            {now < start && <Button variant="ghost" size="sm" onClick={() => onAct(false)} disabled={busy}><X aria-hidden />Цуцлах</Button>}
          </>
        ) : canRegister ? (
          <Button size={big ? "lg" : "md"} onClick={() => onAct(true)} disabled={busy || now > end}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}Бүртгүүлэх</Button>
        ) : !loggedIn ? (
          <>
            <Button asChild size={big ? "lg" : "md"}><Link href="/login?next=%2Fsorils"><LogIn aria-hidden />Нэвтэрч бүртгүүлэх</Link></Button>
            <Link href="/register?next=%2Fsorils" className="inline-flex min-h-10 items-center text-sm font-semibold text-brand">Шинэ хэрэглэгч үү? Бүртгүүлэх</Link>
          </>
        ) : (
          <span className="text-sm text-ink-dim">Сорилд сурагч, худалдан авагч эрхээр бүртгүүлнэ</span>
        )}
      </div>
    </article>
  );
}
