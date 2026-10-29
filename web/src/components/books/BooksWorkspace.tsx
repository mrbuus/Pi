"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, Clock, Lock, Play, School, Sparkles } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { useAuth } from "@/hooks/useAuth";
import { api, homeForRole } from "@/lib/api";
import { toneFor } from "@/lib/topicSymbols";
import MockExamBanner from "@/components/mock-exams/MockExamBanner";
import Book3D from "./Book3D";
import { BOOK_META, bookName as displayBookName } from "./bookMeta";
import TryTest from "./TryTest";
import UnlockPanel from "./UnlockPanel";
import type { BookDetail, BookSummary, ChapterItem, TestItem, TopicItem } from "./types";

// Номын хуудас (нийтэд нээлттэй), 3 багана: ном (3D) ба бусад номууд → сэдвүүд →
// тухайн сэдвийн тестүүд (A/B). Сэдэв бүрийн эхний тест үнэгүй, шууд бодно.
// Утсан дээр: ном дээр нь, сэдэв/тест хоёр таб; тест бодох үед ном нуугдана.

const order = (b: BookSummary) => BOOK_META[b.code]?.order ?? 99;

export default function BooksWorkspace({ initialCode }: { initialCode?: string }) {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookSummary[] | null>(null);
  const [code, setCode] = useState<string | null>(initialCode ?? null);
  const [detail, setDetail] = useState<BookDetail | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [variants, setVariants] = useState<Record<string, string>>({});
  const [openTest, setOpenTest] = useState<string | null>(null);
  const [pane, setPane] = useState<"topics" | "tests">("topics");
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const cache = useRef(new Map<string, BookDetail>());
  const urlState = useRef<{ topic: string | null; test: string | null }>({ topic: null, test: null });

  // Эхний ачаалал: хаягийн ?topic, ?test
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    urlState.current = { topic: q.get("topic"), test: q.get("test") };
  }, []);

  useEffect(() => {
    let alive = true;
    api<BookSummary[]>("/catalog/books", { auth: false })
      .then((r) => {
        if (!alive) return;
        const sorted = [...r].sort((a, b) => order(a) - order(b));
        setBooks(sorted);
        setFailed(false);
        if (!code || !sorted.some((b) => b.code === code)) setCode(sorted[0]?.code ?? null);
      })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retry]);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    const hit = cache.current.get(code);
    const apply = (d: BookDetail) => {
      setDetail(d);
      const wantTopic = urlState.current.topic, wantTest = urlState.current.test;
      urlState.current = { topic: null, test: null };
      const t = d.topics.find((x) => x.name === wantTopic)?.name ?? d.topics[0]?.name ?? null;
      setTopic(t);
      setOpenTest(wantTest && d.topics.some((x) => x.chapters.some((c) => c.tests.some((tt) => tt.id === wantTest && tt.free))) ? wantTest : null);
    };
    if (hit) { apply(hit); return; }
    setDetail(null);
    api<BookDetail>(`/catalog/books/${encodeURIComponent(code)}`, { auth: false })
      .then((d) => { if (!alive) return; cache.current.set(code, d); apply(d); })
      .catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [code]);

  // Хаягийг чимээгүй шинэчилнэ (хуваалцахад)
  useEffect(() => {
    if (!code) return;
    const q = new URLSearchParams();
    if (topic) q.set("topic", topic);
    if (openTest) q.set("test", openTest);
    const url = `/books/${code}${q.toString() ? `?${q}` : ""}`;
    if (location.pathname + location.search !== url) history.replaceState(null, "", url);
  }, [code, topic, openTest]);

  const pickBook = (c: string) => { if (c === code) return; setOpenTest(null); setTopic(null); setPane("topics"); setCode(c); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const pickTopic = (t: string) => { setTopic(t); setOpenTest(null); setPane("tests"); };
  const current = books?.find((b) => b.code === code) ?? null;
  const meta = code ? BOOK_META[code] : undefined;
  const bookName = current ? displayBookName(current.code, current.title, current.displayName) : (meta?.name ?? "");
  const topicObj = detail?.topics.find((t) => t.name === topic) ?? null;

  // Дараагийн үнэгүй тест (сэдвийн дарааллаар)
  const freeList = useMemo(() => (detail?.topics ?? []).flatMap((t) => t.chapters.flatMap((c) => c.tests.filter((x) => x.free && x.solvable).map((x) => ({ test: x, topic: t.name, chapter: c })))), [detail]);
  const nextFree = useCallback((id: string) => {
    const i = freeList.findIndex((f) => f.test.id === id);
    const nx = freeList.slice(i + 1).find((f) => f.test.variantLabel === freeList[i]?.test.variantLabel || !f.test.variantLabel);
    return nx ?? null;
  }, [freeList]);

  if (failed) return <Shell user={user}><ErrorState message="Номын жагсаалтыг ачаалж чадсангүй" onRetry={() => { setFailed(false); setRetry((r) => r + 1); }} /></Shell>;
  if (!books || !code) return <Shell user={user}><LoadingState rows={8} /></Shell>;

  const others = books.filter((b) => b.code !== code);
  const solving = !!openTest;

  return (
    <Shell user={user}>
      <div className="grid gap-5 lg:grid-cols-[272px_292px_minmax(0,1fr)] lg:items-start">
        {/* 1. Ном */}
        <aside className={`${solving ? "hidden lg:block" : ""} space-y-4 lg:sticky lg:top-24`}>
          <div className="relative overflow-hidden rounded-3xl bg-[var(--brand-navy)] text-[var(--brand-paper)]">
            <div className="hidden lg:block"><Book3D code={code} title={bookName} size={176} /></div>
            <div className="flex items-center gap-3 p-4 lg:hidden">
              <div className="w-[104px] shrink-0"><Book3D code={code} title={bookName} size={78} /></div>
              <div className="min-w-0"><p className="text-xs text-[var(--brand-paper)]/70">{meta?.sub}</p><h1 className="text-lg font-extrabold leading-tight">{bookName}</h1><Stats b={current} /></div>
            </div>
            <div className="hidden px-5 pb-5 lg:block">
              <p className="text-xs text-[var(--brand-paper)]/70">{meta?.sub}</p>
              <h1 className="text-xl font-extrabold leading-tight">{bookName}</h1>
              {meta?.blurb && <p className="mt-1.5 text-sm text-[var(--brand-paper)]/75">{meta.blurb}</p>}
              <Stats b={current} />
            </div>
          </div>
          <div>
            <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-ink-dim">Бусад номууд</h2>
            <ul className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {others.map((b) => {
                const m = BOOK_META[b.code];
                return (
                  <li key={b.code} className="shrink-0 lg:shrink">
                    <button onClick={() => pickBook(b.code)} className="surface-interactive flex min-h-12 w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-left">
                      <span className="h-8 w-6 shrink-0 rounded-[3px] shadow-sm" style={{ background: `linear-gradient(170deg, ${m?.color ?? "#1E3263"}, ${m?.color2 ?? "#122142"})` }} aria-hidden />
                      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{displayBookName(b.code, b.title, b.displayName)}</span><span className="block text-xs text-ink-dim">{b.solvableTests ? `${b.tests} тест, ${b.freeTests} үнэгүй` : "Удахгүй"}</span></span>
                      <ChevronRight className="ml-auto hidden h-4 w-4 text-ink-dim lg:block" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Утас: таб */}
        {!solving && (
          <div className="flex gap-1 rounded-2xl bg-surface p-1 lg:hidden" role="tablist" aria-label="Сэдэв ба тест">
            {(["topics", "tests"] as const).map((p) => (
              <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)} className={`min-h-10 flex-1 rounded-xl text-sm font-semibold transition ${pane === p ? "bg-brand-bright text-on-brand" : "text-ink-dim"}`}>
                {p === "topics" ? `Сэдвүүд${detail ? ` · ${detail.topics.length}` : ""}` : `Тестүүд${topicObj ? ` · ${topicObj.tests}` : ""}`}
              </button>
            ))}
          </div>
        )}

        {/* 2. Сэдвүүд */}
        <section className={`${solving || pane !== "topics" ? "hidden lg:block" : ""} lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1`} aria-label="Сэдвүүд">
          <h2 className="mb-2 hidden px-1 text-xs font-semibold tracking-wide text-ink-dim lg:block">Сэдвүүд{detail ? ` · ${detail.topics.length}` : ""}</h2>
          {!detail ? <LoadingState rows={8} /> : !detail.topics.length ? (
            <p className="rounded-2xl border border-dashed border-line p-5 text-sm text-ink-dim">Энэ номын тестүүд удахгүй нэмэгдэнэ</p>
          ) : (
            <ul className="space-y-1.5">
              {detail.topics.map((t) => {
                const tone = toneFor(t.name), on = t.name === topic;
                return (
                  <li key={t.name}>
                    <button onClick={() => pickTopic(t.name)} aria-current={on ? "true" : undefined}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition ${on ? "border-brand-bright bg-brand-bright/10" : "border-transparent hover:bg-surface"}`}>
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[13px] ${tone.soft} ${tone.text}`}><MathText>{tone.symbol}</MathText></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{t.name}</span><span className="block text-xs text-ink-dim">{t.tests} тест{t.freeTests ? `, ${t.freeTests} үнэгүй` : ""}</span></span>
                      {on && <Check className="h-4 w-4 shrink-0 text-brand" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 3. Тестүүд / бодох */}
        <section className={`${!solving && pane !== "tests" ? "hidden lg:block" : ""} min-w-0`} aria-label="Тестүүд">
          {solving && detail ? (
            <TryTest key={openTest} testId={openTest!} bookId={detail.id} bookName={bookName} onBack={() => setOpenTest(null)}
              next={(() => { const n = nextFree(openTest!); return n ? { label: `Дараах үнэгүй: ${n.topic}`, onOpen: () => { setTopic(n.topic); setOpenTest(n.test.id); window.scrollTo({ top: 0, behavior: "smooth" }); } } : null; })()} />
          ) : !detail ? <LoadingState rows={6} /> : topicObj ? (
            <TestsPane topic={topicObj} variants={variants} setVariant={(ch, v) => setVariants((x) => ({ ...x, [ch]: v }))}
              onOpen={(id) => { setOpenTest(id); window.scrollTo({ top: 0, behavior: "smooth" }); }} user={!!user} bookId={detail.id} bookName={bookName} />
          ) : null}
        </section>
      </div>
    </Shell>
  );
}

function Stats({ b }: { b: BookSummary | null }) {
  if (!b) return null;
  return (
    <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--brand-paper)]/80">
      <div><dt className="sr-only">Сэдэв</dt><dd><b className="font-display text-base text-[var(--brand-paper)]">{b.topics}</b> сэдэв</dd></div>
      <div><dt className="sr-only">Тест</dt><dd><b className="font-display text-base text-[var(--brand-paper)]">{b.tests}</b> тест</dd></div>
      <div><dt className="sr-only">Үнэгүй</dt><dd><b className="font-display text-base text-[var(--brand-paper)]">{b.freeTests}</b> үнэгүй</dd></div>
    </dl>
  );
}

function TestsPane({ topic, variants, setVariant, onOpen, user, bookId, bookName }: {
  topic: TopicItem; variants: Record<string, string>; setVariant: (chapterId: string, v: string) => void;
  onOpen: (testId: string) => void; user: boolean; bookId: string; bookName: string;
}) {
  const tone = toneFor(topic.name);
  const unlockRef = useRef<HTMLDivElement>(null);
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4 rounded-3xl border border-line bg-surface p-4 sm:p-5">
        <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg ${tone.soft} ${tone.text}`}><MathText>{tone.symbol}</MathText></span>
        <div className="min-w-0">
          <h2 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">{topic.name}</h2>
          <p className="text-sm text-ink-dim">{topic.chapters.length} тест, {topic.problems} бодлого{topic.freeTests ? `, ${topic.freeTests} нь үнэгүй` : ""}</p>
        </div>
      </header>

      <ol className="space-y-2.5">
        {topic.chapters.map((ch, i) => (
          <li key={ch.id}><ChapterCard ch={ch} first={i === 0} variant={variants[ch.id]} setVariant={(v) => setVariant(ch.id, v)} onOpen={onOpen} user={user} onUnlock={() => unlockRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })} /></li>
        ))}
      </ol>
      <div ref={unlockRef}><UnlockPanel bookId={bookId} bookName={bookName} /></div>
    </div>
  );
}

function ChapterCard({ ch, first, variant, setVariant, onOpen, user, onUnlock }: {
  ch: ChapterItem; first: boolean; variant: string | undefined; setVariant: (v: string) => void;
  onOpen: (testId: string) => void; user: boolean; onUnlock: () => void;
}) {
  const withVariant = ch.tests.filter((t) => t.variantLabel);
  const labels = [...new Set(withVariant.map((t) => t.variantLabel!))].sort();
  const selected = labels.length ? (variant && labels.includes(variant) ? variant : labels[0]) : null;
  const rows: TestItem[] = labels.length ? ch.tests.filter((t) => t.variantLabel === selected) : ch.tests;
  const anyFree = ch.tests.some((t) => t.free);
  return (
    <article className={`rounded-3xl border bg-surface p-4 sm:p-5 ${anyFree ? "border-brand-bright/40" : "border-line"}`} aria-labelledby={`ch-${ch.id}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h3 id={`ch-${ch.id}`} className="text-base font-bold">{ch.label}</h3>
        {anyFree && <span className="inline-flex items-center gap-1 rounded-full bg-brand-bright/12 px-2.5 py-0.5 text-xs font-semibold text-brand-soft"><Sparkles className="h-3.5 w-3.5" aria-hidden />Үнэгүй</span>}
        {labels.length > 1 && (
          <div role="radiogroup" aria-label="Хувилбар" className="ml-auto inline-flex rounded-xl border border-line p-0.5">
            {labels.map((l) => (
              <button key={l} role="radio" aria-checked={selected === l} onClick={() => setVariant(l)} className={`min-h-9 min-w-10 rounded-lg px-3 text-sm font-bold transition ${selected === l ? "bg-brand-bright text-on-brand" : "text-ink-dim hover:text-ink"}`}>{l}</button>
            ))}
          </div>
        )}
      </div>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5 first:pt-0 last:pb-0">
            <span className="min-w-0 flex-1">
              {!labels.length && ch.tests.length > 1 && <span className="block text-sm font-semibold">{t.title}</span>}
              <span className="flex flex-wrap gap-x-3 text-xs text-ink-dim">
                <span>{t.problemCount} бодлого</span>
                {t.timeLimitMin ? <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden />{t.timeLimitMin} мин</span> : null}
                {t.variantLabel && <span>{t.variantLabel} хувилбар</span>}
              </span>
            </span>
            {!t.solvable ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-dim"><School className="h-4 w-4" aria-hidden />Танхимд, удахгүй онлайнаар</span>
            ) : t.free ? (
              <Button size="sm" onClick={() => onOpen(t.id)}><Play aria-hidden />Бодож үзэх</Button>
            ) : user ? (
              <span className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline"><Link href={`/app/tests/${t.id}`}>Эрхтэй бол нээх<ArrowRight aria-hidden /></Link></Button>
                <button onClick={onUnlock} className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-ink-dim hover:text-ink"><Lock className="h-3.5 w-3.5" aria-hidden />Эрх</button>
              </span>
            ) : (
              <Button size="sm" variant="outline" onClick={onUnlock}><Lock aria-hidden />Эрх нээх</Button>
            )}
          </li>
        ))}
      </ul>
      {first && anyFree && <p className="mt-3 text-xs text-ink-dim">Эхний тестийг нэвтрэлтгүй, шууд бодож болно</p>}
    </article>
  );
}

function Shell({ children, user }: { children: React.ReactNode; user: { role?: string } | null }) {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4">
          <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="Нүүр хуудас"><LogoMark size={34} /><span className="hidden text-sm font-bold sm:block">Шинэ Ирээдүйн Эзэд</span></Link>
          <nav aria-label="Номын хуудас" className="ml-2 flex items-center gap-1 text-sm">
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-bright/12 px-3 font-semibold text-brand-soft"><BookOpen className="h-4 w-4" aria-hidden />Ном, тест</span>
            <Link href="/sorils" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 font-semibold text-ink-dim hover:text-ink"><Sparkles className="h-4 w-4" aria-hidden />Жишиг сорил</Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Button asChild variant="outline" size="sm"><Link href={homeForRole(user.role ?? "STUDENT")}>Миний хэсэг</Link></Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link href="/login?next=%2Fbooks">Нэвтрэх</Link></Button>
                <Button asChild size="sm"><Link href="/register?next=%2Fbooks">Бүртгүүлэх</Link></Button>
              </>
            )}
          </div>
        </div>
      </header>
      <MockExamBanner />
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:py-6">{children}</main>
    </div>
  );
}
