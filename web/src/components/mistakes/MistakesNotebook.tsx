"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpenCheck, Brain, RotateCw, Sparkles } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { Card, CardContent } from "@/components/ui/kit/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { api } from "@/lib/api";
import MistakeCard from "./MistakeCard";
import { STATUS_LABELS, type Mistake, type NotebookPayload, type RetryResult } from "./types";

const STATS = [
  ["NEW", "border-accent-gold/40 bg-accent-gold/10", BookOpenCheck],
  ["RETRYING", "border-accent-teal/40 bg-accent-teal/10", RotateCw],
  ["MASTERED", "border-success/40 bg-success/10", Sparkles],
] as const;
const TABS = ["ALL", "NEW", "RETRYING", "MASTERED"] as const;
type Session = { items: Mistake[]; position: number; results: Record<string, RetryResult>; done: boolean };

export default function MistakesNotebook() {
  const [data, setData] = useState<NotebookPayload | null>(null);
  const [resolvedKey, setResolvedKey] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [source, setSource] = useState("");
  const [topic, setTopic] = useState("");
  const [revision, setRevision] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [starting, setStarting] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const startLock = useRef(false);
  const sessionHeading = useRef<HTMLHeadingElement>(null);
  const listRequest = useRef(0);
  const moreLock = useRef(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<{ key: string; message: string } | null>(null);

  const requestKey = JSON.stringify([status, source, topic, revision]);
  const loading = resolvedKey !== requestKey;

  useEffect(() => {
    const request = ++listRequest.current;
    let active = true;
    const query = new URLSearchParams({ ...(status !== "ALL" ? { status } : {}), ...(source ? { source } : {}), ...(topic ? { topic } : {}) });
    api<NotebookPayload>(`/mistakes/my${query.size ? `?${query}` : ""}`)
      .then(payload => { if (active && request === listRequest.current) { setData(payload); setError(""); } })
      .catch(() => { if (active && request === listRequest.current) setError("Алдааны жагсаалт ачаалсангүй. Дахин оролдоорой."); })
      .finally(() => { if (active && request === listRequest.current) setResolvedKey(requestKey); });
    return () => { active = false; };
  }, [status, source, topic, requestKey]);

  const position = session?.position;
  const sessionDone = session?.done;
  const hasSession = !!session;
  useEffect(() => { if (hasSession) sessionHeading.current?.focus(); }, [position, sessionDone, hasSession]);

  const change = useCallback((id: string, patch: Partial<Mistake>) => {
    setData(old => {
      if (!old) return old;
      const previous = old.items.find(item => item.id === id);
      const counts = { ...old.counts };
      if (previous && patch.status && previous.status !== patch.status) {
        counts[previous.status] = Math.max(0, counts[previous.status] - 1);
        counts[patch.status]++;
      }
      return { ...old, counts, items: old.items.map(item => item.id === id ? { ...item, ...patch } : item) };
    });
    setSession(old => old ? { ...old, items: old.items.map(item => item.id === id ? { ...item, ...patch } : item) } : old);
  }, []);

  async function startSession() {
    if (startLock.current) return;
    startLock.current = true; setStarting(true); setSessionError("");
    try {
      const items = await api<Mistake[]>("/mistakes/today");
      setSession({ items, position: 0, results: {}, done: false });
    } catch { setSessionError("Өнөөдрийн давтлага ачаалсангүй. Дахин оролдоорой."); }
    finally { startLock.current = false; setStarting(false); }
  }

  async function loadMore() {
    if (!data?.nextCursor || moreLock.current) return;
    const request = listRequest.current;
    moreLock.current = true; setLoadingMore(true); setMoreError(null);
    const query = new URLSearchParams({ cursor: data.nextCursor, ...(status !== "ALL" ? { status } : {}), ...(source ? { source } : {}), ...(topic ? { topic } : {}) });
    try {
      const page = await api<NotebookPayload>(`/mistakes/my?${query}`);
      if (request !== listRequest.current) return;
      setData(old => !old ? page : {
        ...page, items: [...old.items, ...page.items.filter(item => !old.items.some(existing => existing.id === item.id))],
      });
    } catch {
      if (request === listRequest.current) setMoreError({ key: requestKey, message: "Дараагийн бодлогууд ачаалсангүй. Дахин оролдоорой." });
    } finally { moreLock.current = false; setLoadingMore(false); }
  }

  const active = session?.items[session.position];
  const totalReviewed = session ? Object.keys(session.results).length : 0;
  const correctCount = session ? Object.values(session.results).filter(result => result.correct).length : 0;
  const closeSession = () => { setSession(null); setRevision(value => value + 1); };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-ink-dim"><Brain aria-hidden className="h-4 w-4" />Өөрийн алдаанаас сур</p>
          <h1 className="cyrillic-heading mt-1 text-3xl font-black text-ink">Алдааны дэвтэр</h1>
          <p className="mt-1 text-ink-dim">Алдаагаа тэмдэглээд, өөр өдөр дахин бодож бататгаарай.</p>
        </div>
        {!session && <Button onClick={() => void startSession()} disabled={starting} className="whitespace-normal">
          <RotateCw aria-hidden />{starting ? "Ачаалж байна" : "Өнөөдрийн давтлага"}
        </Button>}
      </header>
      {sessionError && <ErrorState message={sessionError} onRetry={() => void startSession()} />}
      {data && <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Алдааны төлөвийн тоо">
        {STATS.map(([key, cls, Icon]) => <Card key={key} className={cls}>
          <CardContent><div className="flex items-center gap-2 text-sm font-semibold"><Icon aria-hidden className="h-4 w-4" />{STATUS_LABELS[key]}</div>
            <strong className="mt-1 block text-3xl">{data.counts[key]}</strong></CardContent>
        </Card>)}
      </section>}
      {session ? <section className="space-y-4" aria-label="Давтлагын сесс">
        <h2 ref={sessionHeading} tabIndex={-1} className="text-xl font-bold">
          {session.done ? "Давтлагын дүн" : session.items.length ? `Давтлага ${session.position + 1} / ${session.items.length}` : "Өнөөдрийн давтлага"}
        </h2>
        {session.done ? <Card><CardContent className="space-y-3">
          <p role="status">{totalReviewed} бодлогоос {correctCount}-ыг эхний оролдлогоор зөв бодлоо.</p>
          <p className="text-ink-dim">{totalReviewed - correctCount > 0 ? "Зөрүүтэй бодлогууд дэвтэртээ үлдэнэ. Зөв аргаа дараагийн давтлагаар бататгаарай." : "Дараагийн өдөр дахин бататгаарай."}</p>
          <Button onClick={closeSession}>Дэвтэртээ буцах</Button>
        </CardContent></Card> : !active ? <EmptyState icon={Sparkles} title="Өнөөдөр товлосон давтлага алга"
          hint="Дэвтрийн бусад бодлогоо хүссэн үедээ давтаж болно."
          action={<Button variant="outline" onClick={closeSession}>Дэвтэртээ буцах</Button>} /> : <>
          <MistakeCard key={active.id} item={active} sessionMode onChange={change}
            onRetried={(id, result) => setSession(old => old ? { ...old, results: { ...old.results, [id]: old.results[id] ?? result } } : old)} />
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3">
            <Button variant="outline" onClick={closeSession}>Сессээс гарах</Button>
            <Button disabled={!session.results[active.id]} onClick={() => setSession(old => !old ? old : old.position + 1 < old.items.length
              ? { ...old, position: old.position + 1 } : { ...old, done: true })}>
              {session.position + 1 === session.items.length ? "Дүнгээ харах" : "Дараагийнх"}
            </Button>
          </div>
        </>}
      </section> : <Tabs value={status} onValueChange={setStatus} className="space-y-4">
        <Card><CardContent className="space-y-4">
          <TabsList aria-label="Алдааны төлөв">{TABS.map(value => <TabsTrigger key={value} value={value}>
            {value === "ALL" ? "Бүгд" : STATUS_LABELS[value]}
          </TabsTrigger>)}</TabsList>
          <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">Эх үүсвэр
            <select aria-label="Эх сурвалж" value={source} onChange={event => setSource(event.target.value)}
              className="min-h-11 rounded-xl border border-line bg-surface px-3">
              <option value="">Бүх эх үүсвэр</option><option value="PRACTICE">Дасгал</option><option value="TEST">Тест</option>
            </select>
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Сэдвийн шүүлтүүр">
            <Button variant={topic === "" ? "secondary" : "outline"} aria-pressed={topic === ""} onClick={() => setTopic("")}>Бүх сэдэв</Button>
            {data?.byTopic.map(entry => <Button key={entry.topic} variant={topic === entry.topic ? "secondary" : "outline"}
              className="whitespace-normal text-left" aria-pressed={topic === entry.topic} onClick={() => setTopic(topic === entry.topic ? "" : entry.topic)}>
              {entry.topic} ({entry.count})
            </Button>)}
          </div>
        </CardContent></Card>
        {TABS.map(value => <TabsContent key={value} value={value}>
          {loading ? <LoadingState rows={3} /> : error ? <ErrorState message={error} onRetry={() => setRevision(old => old + 1)} />
            : !data?.items.length ? <EmptyState icon={Sparkles} title="Энд хараахан алдаа алга"
              hint={status !== "ALL" || source || topic ? "Өөр төлөв, сэдэв сонгож үзээрэй." : "Тест эсвэл дасгалын дараа буруу хариунууд энд хадгалагдана."} />
            : <div className="space-y-4">
              {data.items.map(item => <MistakeCard key={item.id} item={item} onChange={change} />)}
              {moreError?.key === requestKey && <ErrorState message={moreError.message} />}
              {data.nextCursor && <Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore ? "Ачаалж байна" : "Дараагийн бодлогууд"}
              </Button>}
            </div>}
        </TabsContent>)}
      </Tabs>}
    </main>
  );
}
