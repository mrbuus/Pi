"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Brain, Target } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { PageHeader, SectionHeader } from "@/components/ui/Surface";
import { Card } from "@/components/ui/kit/card";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState, EmptyState } from "@/components/ui/StateBlock";
import type { ReadinessData, ReadinessTopic } from "./ReadinessTypes";

type Goal = { id: string; title: string; description?: string | null };
const GOAL_PREFIX = "Бэлэн байдлын зорилго:";
const formulaUrl = (topic: ReadinessTopic) => `/app/formulas?q=${encodeURIComponent(topic.topic)}`;

function ReadinessRing({ value, low, high, measured }: { value: number; low: number; high: number; measured: boolean }) {
  const radius = 66, circumference = 2 * Math.PI * radius;
  return <div className="relative mx-auto h-44 w-44" role="img" aria-label={measured ? `Бэлэн байдал ойролцоогоор ${value}, баримжаа хүрээ ${low}–${high}` : "Бэлэн байдлыг тооцох оролдлого хараахан алга"}>
    <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90" aria-hidden="true">
      <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="13" className="stroke-line/60" />
      <circle cx="80" cy="80" r={radius} fill="none" strokeWidth="13" strokeLinecap="round" strokeDasharray={`${circumference * value / 100} ${circumference}`} className="stroke-brand-soft transition-all duration-700 motion-reduce:transition-none" />
    </svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-black text-ink">{measured ? `~${value}` : "—"}</span><span className="text-sm font-semibold text-ink-dim">{low}–{high} баримжаа</span></div>
  </div>;
}

function HistoryChart({ points }: { points: ReadinessData["weeklyHistory"] }) {
  const coords = useMemo(() => points.flatMap((p, i) => p.coverage > 0 ? [{ week: p.week, x: 12 + i * (276 / Math.max(1, points.length - 1)), y: 116 - p.index * 0.9 }] : []), [points]);
  if (!points.length) return null;
  return <div className="w-full overflow-hidden"><svg viewBox="0 0 300 130" className="w-full" role="img" aria-label="Сүүлийн найман долоо хоногийн бэлэн байдлын өөрчлөлт">
    <path d="M12 26H288M12 71H288M12 116H288" className="stroke-line" strokeDasharray="3 5" />
    {coords.length > 1 && <polyline points={coords.map(p => `${p.x},${p.y}`).join(" ")} fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand-soft" />}
    {coords.map(p => <circle key={p.week} cx={p.x} cy={p.y} r="4" className="fill-accent-teal" />)}
  </svg><div className="flex justify-between text-xs text-ink-dim"><span>{points[0].week}</span><span>{points.at(-1)?.week}</span></div><div className="sr-only max-w-full overflow-hidden"><table className="w-full table-fixed"><caption>Найман долоо хоногийн бэлэн байдлын түүх</caption><thead><tr><th scope="col">Долоо хоног</th><th scope="col">Баримжаа индекс</th><th scope="col">Хамралт</th></tr></thead><tbody>{points.map(point => <tr key={point.week}><th scope="row">{point.week}</th><td>{point.coverage ? point.index : "Хэмжээгүй"}</td><td>{point.coverage}%</td></tr>)}</tbody></table></div></div>;
}

function TopicHeatmap({ topics }: { topics: ReadinessTopic[] }) {
  if (!topics.length) return <EmptyState icon={Brain} title="Сэдвийн мэдээлэл хараахан алга" hint="Бодлого ажиллах тусам энд эзэмшлийн зураг үүснэ." />;
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{topics.map(topic => {
    const mastery = topic.mastery ?? 0;
    const tone = mastery >= 75 ? "border-success/40 bg-success/10" : mastery >= 50 ? "border-accent-teal/40 bg-accent-teal/10" : "border-warning/40 bg-warning/10";
    return <div key={topic.topic} className={`rounded-2xl border p-4 ${tone}`}><div className="flex items-start justify-between gap-2"><p className="font-bold text-ink">{topic.title}</p><span className="shrink-0 text-sm font-extrabold text-ink">{mastery}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-brand-soft" style={{ width: `${mastery}%` }} /></div><p className="mt-2 text-xs text-ink-dim">{topic.attempts ? `${topic.attempts} үнэлэгдэх оролдлого, ${topic.trend === "UP" ? "өсөж байна" : topic.trend === "DOWN" ? "буурч байна" : "тогтвортой"}` : "Одоогоор үнэлэх оролдлого алга"}</p></div>;
  })}</div>;
}

export default function ReadinessDashboard() {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState("70");
  const [saving, setSaving] = useState(false);
  const [goalError, setGoalError] = useState("");
  const goalBusy = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [readiness, goalList] = await Promise.all([api<ReadinessData>("/readiness/my"), api<Goal[]>("/goals")]);
      setData(readiness); setGoals(goalList);
      const saved = goalList.find(g => g.title.startsWith(GOAL_PREFIX));
      if (saved) setTarget(saved.title.slice(GOAL_PREFIX.length).trim());
    } catch { setError("Бэлэн байдлын мэдээлэл ачаалж чадсангүй."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, [load]);

  async function saveGoal() {
    const value = Number(target);
    if (!target.trim() || !Number.isInteger(value) || value < 0 || value > 100) {
      setGoalError("Бүхэл тоогоор 0–100 хооронд оруулна уу.");
      return;
    }
    if (goalBusy.current) return;
    goalBusy.current = true;
    setGoalError("");
    setSaving(true);
    try {
      const existing = goals.find(g => g.title.startsWith(GOAL_PREFIX));
      const body = { title: `${GOAL_PREFIX} ${value}`, description: "ЭЕШ-ийн бэлэн байдлын хувийн зорилт." };
      if (existing) await api(`/goals/${existing.id}`, { method: "PATCH", body });
      else await api("/goals", { method: "POST", body });
      toast.success("Зорилго хадгалагдлаа."); await load();
    } catch { toast.error("Зорилго хадгалж чадсангүй."); }
    finally { goalBusy.current = false; setSaving(false); }
  }

  if (loading) return <LoadingState rows={7} label="Бэлэн байдлыг тооцоолж байна" />;
  if (error || !data) return <ErrorState message={error ?? "Мэдээлэл олдсонгүй."} onRetry={() => void load()} />;
  const ideas = data.nextBestTopics;
  return <div className="space-y-6">
    <PageHeader title="Бэлэн байдал" description="Сүүлийн 60 хоногийн оролдлогын чиг хандлага. Энэ нь суралцахад туслах индекс бөгөөд ЭЕШ-ийн албан оноо биш." />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Card className="flex flex-col items-center justify-center p-5 text-center md:p-6"><ReadinessRing value={data.index} low={data.low} high={data.high} measured={data.dataPoints > 0 && data.coverage > 0} /><p className="mt-2 text-sm text-ink-dim">{data.coverage}% сэдэв хамрагдсан, {data.dataPoints} оролдлого</p><p className="mt-1 text-xs text-ink-dim">Ойролцоогоор {data.effectiveDataPoints} тусдаа бодлогын нотолгоо. Муж нь хэмжсэн сэдвийн баримжаа, албан оноо биш.</p></Card>
    <Card className="p-5 md:p-6"><SectionHeader icon={Target} title="8 долоо хоногийн түүх" hint={<span className="text-xs text-ink-dim">Бэлэн байдлын индекс</span>} />{data.weeklyHistory.some(point => point.coverage > 0) ? <HistoryChart points={data.weeklyHistory} /> : <EmptyState icon={Brain} title="Түүх үүсэхэд оролдлого хэрэгтэй" hint="Бодлого бодож эхэлмэгц долоо хоногийн өөрчлөлт харагдана." />}</Card>
    </div>
    <Card className="p-5 md:p-6"><SectionHeader title="Сэдвийн эзэмшил" hint={<span className="text-xs text-ink-dim">Зөв хариулт + өөрийн үнэлгээнд тулгуурлав</span>} /><TopicHeatmap topics={data.topics.filter(topic => topic.measured)} /></Card>
    <section><SectionHeader icon={ArrowRight} title="Дараагийн алхам" hint={<span className="text-xs text-ink-dim">Сул тал ба ЭЕШ-ийн жингээр эрэмбэлэв</span>} />{ideas.length ? <div className="grid gap-4 md:grid-cols-3">{ideas.map((topic, i) => <Card key={topic.topic} className="flex flex-col p-5 md:p-6"><p className="text-xs font-bold uppercase tracking-wide text-brand-soft">Алхам {i + 1}</p><h3 className="mt-2 text-lg font-extrabold text-ink">{topic.title}</h3><p className="mt-1 flex-1 text-sm text-ink-dim">{topic.measured ? `${topic.mastery}% эзэмшил, ${topic.attempts} оролдлого. Богино давтлагаас эхлээрэй.` : "Одоогоор мэдээлэлгүй. Энэ өндөр жинтэй сэдвээр эхний бодлогоо бодоорой."}</p><div className="mt-4 grid grid-cols-2 gap-2"><Link className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-brand px-3 text-sm font-bold text-on-brand hover:opacity-90" href="/app/practice">Дасгал <ArrowRight className="h-4 w-4" /></Link><Link className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl border border-line px-3 text-sm font-bold text-ink hover:bg-surface" href={formulaUrl(topic)}><BookOpen className="h-4 w-4" /> Томьёо</Link><Link className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1 rounded-xl px-3 text-sm font-bold text-brand-soft hover:bg-brand/10" href="/app/mistakes"><Brain className="h-4 w-4" /> Алдаагаа давтах</Link></div></Card>)}</div> : <EmptyState title="Зөвлөмж бэлтгэх оролдлого хараахан алга" hint="Бодлого ажилласны дараа сул сэдэвт чиглэсэн алхмууд гарна." />}</section>
    <Card className="p-5 md:p-6"><SectionHeader icon={Target} title="Миний зорилго" /><div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-semibold text-ink">Зорьж буй бэлэн байдлын индекс (0–100)<input type="number" inputMode="numeric" step="1" min="0" max="100" required value={target} onChange={e => { setTarget(e.target.value); setGoalError(""); }} aria-invalid={!!goalError} aria-describedby={goalError ? "readiness-goal-error" : undefined} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink" /></label><Button disabled={saving} onClick={() => void saveGoal()} className="min-h-11">{saving ? "Хадгалж байна" : "Зорилго хадгалах"}</Button></div>{goalError && <p id="readiness-goal-error" role="alert" className="mt-2 text-sm text-error">{goalError}</p>}<p className="mt-2 text-xs text-ink-dim">Зорилго нь сурагчийн одоо ашиглаж буй хувийн зорилгын жагсаалтад хадгалагдана.</p></Card>
  </div>;
}
