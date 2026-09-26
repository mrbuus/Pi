"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpenCheck, Brain, RotateCw, Sparkles } from "lucide-react";
import MathText from "@/components/MathText";
import ProblemFigure from "@/components/ProblemFigure";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";

type Mistake = { id: string; problem: { id: string; statementText: string | null; choices: string[] | null; choiceMode: string | null; format: string; imageKey: string | null }; givenAnswer: unknown; correctAnswer?: unknown; status: string; reason: string | null; note: string | null; testTitle: string | null; formulas: { slug: string; title: string; latex: string | null }[] };
type Payload = { counts: { NEW: number; RETRYING: number; MASTERED: number }; byTopic: { topic: string; count: number }[]; items: Mistake[] };
const REASONS = [{ key: "CALC", label: "Бодолтын алдаа" }, { key: "CONCEPT", label: "Ойлголт" }, { key: "FORMULA", label: "Томьёо мартсан" }, { key: "READING", label: "Буруу уншсан" }, { key: "TIME", label: "Цаг дууссан" }, { key: "UNKNOWN", label: "Мэдэхгүй" }];
const STATS = [["NEW", "Шинэ", "border-accent-gold/40 bg-accent-gold/10", BookOpenCheck], ["RETRYING", "Давтаж байна", "border-accent-teal/40 bg-accent-teal/10", RotateCw], ["MASTERED", "Эзэмшсэн", "border-success/40 bg-success/10", Sparkles]] as const;

export default function MistakesNotebook() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [topic, setTopic] = useState("");
  const [answer, setAnswer] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [solutions, setSolutions] = useState<Record<string, string>>({});
  const [session, setSession] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionItems, setSessionItems] = useState<Mistake[]>([]);
  const [position, setPosition] = useState(0);
  const reload = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await api<Payload>(`/mistakes/my${status || source || topic ? `?${new URLSearchParams({ ...(status ? { status } : {}), ...(source ? { source } : {}), ...(topic ? { topic } : {}) })}` : ""}`)); }
    catch (e) { setError(e instanceof Error ? e.message : "Алдааны жагсаалт ачаалсангүй"); }
    finally { setLoading(false); }
  }, [status, source, topic]);
  useEffect(() => { void reload(); }, [reload]);
  const items = data?.items ?? [];
  const active = session ? sessionItems[position] : null;
  async function retry(item: Mistake) {
    try {
      const result = await api<{ correct: boolean; correctAnswer: unknown; status: string; solutionOutline?: string | null }>(`/mistakes/${item.id}/retry`, { method: "POST", body: { answer: item.problem.choiceMode === "TEXT" ? Number(answer[item.id]) : answer[item.id] } });
      setFeedback((old) => ({ ...old, [item.id]: result.correct ? `Зөв. ${result.status === "MASTERED" ? "Эзэмшсэн төлөвт орлоо." : "Дараагийн давтлагаа хугацаанд нь хийгээрэй."}` : `Дахиад бодоорой. Зөв хариу: ${typeof result.correctAnswer === "object" ? JSON.stringify(result.correctAnswer) : String(result.correctAnswer)}` }));
      if (result.solutionOutline) setSolutions((old) => ({ ...old, [item.id]: result.solutionOutline! }));
      await reload();
    } catch (e) { setFeedback((old) => ({ ...old, [item.id]: e instanceof Error ? e.message : "Хариу хадгалсангүй" })); }
  }
  async function setReason(item: Mistake, reason: string) { await api(`/mistakes/${item.id}`, { method: "PATCH", body: { reason } }); await reload(); }
  async function saveNote(item: Mistake, note: string) { await api(`/mistakes/${item.id}`, { method: "PATCH", body: { note } }); }
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-bold text-accent-teal"><Brain className="h-4 w-4" /> ӨӨРИЙН АЛДААНААС СУР</p><h1 className="mt-1 text-3xl font-black text-ink">Алдааны дэвтэр</h1><p className="mt-1 text-ink-dim">Алдаагаа тэмдэглээд, өөр өдөр дахин бодож бататгаарай.</p></div><button onClick={async () => { try { const today = await api<Mistake[]>("/mistakes/today"); setSessionItems(today); setPosition(0); setSessionDone(false); setSession(true); } catch (e) { setError(e instanceof Error ? e.message : "Давтлага ачаалсангүй"); } }} className="btn-3d inline-flex min-h-12 items-center gap-2 rounded-xl px-5 font-bold"><RotateCw className="h-5 w-5" />Өнөөдрийн давтлага</button></header>
    {sessionDone && <p role="status" className="rounded-2xl bg-accent-teal/10 p-4 font-bold">Давтлагын сесс дууслаа. Өнөөдрийн бодлогуудыг шалгалаа.</p>}
    {data && <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Алдааны төлөвийн тоо">{STATS.map(([key, label, cls, Icon]) => <div key={key} className={`chunky rounded-3xl p-4 ${cls}`}><div className="flex items-center gap-2 text-sm font-semibold"><Icon className="h-4 w-4" />{label}</div><strong className="mt-1 block text-3xl">{data.counts[key]}</strong></div>)}</section>}
    <section className="chunky rounded-3xl bg-surface p-4"><div className="flex flex-wrap gap-2" aria-label="Алдааны шүүлтүүр">{["", "NEW", "RETRYING", "MASTERED"].map((value) => <button key={value || "all"} onClick={() => setStatus(value)} className={`min-h-11 rounded-full border px-4 font-semibold ${status === value ? "border-brand bg-brand/10 text-brand" : "border-line"}`}>{value || "Бүгд"}</button>)}<select aria-label="Эх сурвалж" value={source} onChange={(e) => setSource(e.target.value)} className="min-h-11 rounded-xl border border-line bg-surface px-3"><option value="">Бүх эх үүсвэр</option><option value="PRACTICE">Дасгал</option><option value="TEST">Тест</option></select>{data?.byTopic.map((x) => <button key={x.topic} onClick={() => setTopic(topic === x.topic ? "" : x.topic)} className={`min-h-11 rounded-full border px-4 ${topic === x.topic ? "border-brand bg-brand/10" : "border-line"}`}>{x.topic} ({x.count})</button>)}</div></section>
    {loading ? <LoadingState rows={3} /> : error ? <ErrorState message={error} onRetry={() => void reload()} /> : items.length === 0 ? <EmptyState icon={Sparkles} title="Энд хараахан алдаа алга" hint="Тест эсвэл дасгалын дараа буруу хариунууд энд хадгалагдана." /> : <section className="space-y-4">{(active ? [active] : items).map((item) => <article key={item.id} className="chunky rounded-3xl bg-surface p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-accent-gold/15 px-3 py-1 text-sm font-semibold">{item.status === "MASTERED" ? "Эзэмшсэн" : item.status === "RETRYING" ? "Давтаж байна" : "Шинэ алдаа"}</span>{item.testTitle && <span className="text-sm text-ink-dim">{item.testTitle}</span>}</div><div className="mt-4"><ProblemFigure imageKey={item.problem.imageKey} alt="Бодлогын зураг"><MathText>{item.problem.statementText ?? "Бодлогын нөхцөл олдсонгүй"}</MathText></ProblemFigure></div>{Array.isArray(item.problem.choices) && <div className="mt-3 grid gap-2 sm:grid-cols-2">{item.problem.choices.map((choice, i) => <button key={`${i}-${choice}`} onClick={() => setAnswer((x) => ({ ...x, [item.id]: item.problem.choiceMode === "TEXT" ? String(i) : choice }))} className={`min-h-12 rounded-xl border px-3 text-left ${answer[item.id] === (item.problem.choiceMode === "TEXT" ? String(i) : choice) ? "border-brand bg-brand/10" : "border-line"}`}><MathText>{choice}</MathText></button>)}</div>}<p className="mt-3 text-sm text-ink-dim">Чиний хариулт: {typeof item.givenAnswer === "object" && item.givenAnswer !== null ? JSON.stringify(item.givenAnswer) : String(item.givenAnswer ?? "Хариулаагүй")}</p><label className="mt-4 block text-sm font-semibold">Алдааны шалтгаан<select value={item.reason ?? ""} onChange={(e) => void setReason(item, e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-line bg-surface px-3">{REASONS.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select></label><label className="mt-3 block text-sm font-semibold">Тэмдэглэл<textarea maxLength={500} defaultValue={item.note ?? ""} onBlur={(e) => void saveNote(item, e.target.value)} className="mt-1 block min-h-20 w-full rounded-xl border border-line bg-surface p-3" placeholder="Юуг анхаарах вэ?" /></label><div className="mt-4 flex flex-wrap items-center gap-3"><input aria-label="Хариугаа оруул" value={answer[item.id] ?? ""} onChange={(e) => setAnswer((x) => ({ ...x, [item.id]: e.target.value }))} className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3" placeholder="Хариугаа бичих" /><button onClick={() => void retry(item)} className="btn-3d min-h-12 rounded-xl px-5 font-bold">Дахин бодох</button></div>{feedback[item.id] && <p role="status" className="mt-3 rounded-xl bg-accent-teal/10 p-3 font-semibold">{feedback[item.id]}{solutions[item.id] && <div className="mt-2 border-t border-line pt-2"><MathText>{solutions[item.id]}</MathText></div>}</p>}{item.formulas.length > 0 && <div className="mt-4"><p className="text-sm font-bold">Хэрэгтэй томьёо</p><div className="mt-2 flex flex-wrap gap-2">{item.formulas.map((formula) => <a key={formula.slug} href={`/app/formulas/${formula.slug}`} className="rounded-full border border-accent-teal/40 px-3 py-2 text-sm"><MathText>{formula.title}</MathText></a>)}</div></div>}</article>)}{session && <div className="sticky bottom-3 flex justify-between rounded-2xl border border-line bg-surface p-3 shadow-lg"><button className="min-h-11 rounded-lg border border-line px-4" onClick={() => position > 0 ? setPosition(position - 1) : setSession(false)}>Буцах</button><span className="self-center">{Math.min(position + 1, sessionItems.length)} / {sessionItems.length}</span><button className="btn-3d min-h-11 rounded-lg px-4" onClick={() => position + 1 < sessionItems.length ? setPosition(position + 1) : (setSession(false), setSessionDone(true))}>Дараагийнх</button></div>}</section>}
  </main>;
}
