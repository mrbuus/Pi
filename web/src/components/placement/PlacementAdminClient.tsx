"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, Camera, ImageOff, Loader2, Phone, Plus, Save, Trash2 } from "lucide-react";
import MathText from "@/components/MathText";
import RequireRole from "@/components/nav/RequireRole";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { PageHeader } from "@/components/ui/Surface";
import { api, fileUrl, getRole } from "@/lib/api";
import {
  CHOICE_KEYS,
  STATUS_LABEL,
  type Answers,
  type ChoiceKey,
  type PlacementProblem,
  type PlacementStatus,
  type PlacementTestPublic,
} from "./types";

interface Row {
  id: string; name: string; phone: string; grade: number; school: string | null; parentPhone: string | null;
  autoScore: number | null; maxScore: number | null; photoCount: number; startedAt: string;
  submittedAt: string | null; autoSubmitted: boolean; status: PlacementStatus; level: string | null; createdAt: string;
}
interface DetailProblem extends PlacementProblem { given: Answers[string] | null; correct: boolean; photos: string[] }
interface Detail extends Omit<Row, "photoCount"> { title: string; minutes: number; teacherNote: string | null; problems: DetailProblem[] }

const msg = (e: unknown) => (e instanceof Error ? e.message : "Алдаа гарлаа");
const when = (s: string) => new Date(s).toLocaleString("mn-MN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ulaanbaatar" });
const STATUS_TONE = { NEW: "warning", REVIEWED: "info", CONTACTED: "success" } as const;
const LEVELS = ["Суурь", "Дунд", "Ахисан", "Хоцрогдолтой, суурь ангид"];

export default function PlacementAdminClient() {
  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <PageHeader title="Түвшин тогтоох шалгалт" description="Шалгалт өгсөн хүүхдүүдийн мэдээлэл, бодолтын зураг, тестийн агуулга" />
      <Tabs defaultValue="attempts">
        <TabsList>
          <TabsTrigger value="attempts">Шалгалт өгсөн хүүхдүүд</TabsTrigger>
          <TabsTrigger value="config">Шалгалтын агуулга</TabsTrigger>
        </TabsList>
        <TabsContent value="attempts" className="mt-5"><Attempts /></TabsContent>
        <TabsContent value="config" className="mt-5"><ConfigEditor /></TabsContent>
      </Tabs>
    </RequireRole>
  );
}

/* ---------------- Хүүхдүүд ---------------- */
function Attempts() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<PlacementStatus | "ALL">("ALL");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api<Row[]>("/placement").then((r) => { if (alive) { setRows(r); setFailed(false); } }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [tick]);
  const shown = useMemo(() => (rows ?? []).filter((r) => filter === "ALL" || r.status === filter), [rows, filter]);

  if (open) return <AttemptDetail id={open} onBack={() => { setOpen(null); setTick((t) => t + 1); }} />;
  if (failed) return <ErrorState message="Жагсаалтыг ачаалж чадсангүй" onRetry={() => setTick((t) => t + 1)} />;
  if (!rows) return <LoadingState rows={5} />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Төлөвөөр шүүх">
        {(["ALL", "NEW", "REVIEWED", "CONTACTED"] as const).map((s) => (
          <button key={s} role="tab" aria-selected={filter === s} onClick={() => setFilter(s)}
            className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${filter === s ? "border-brand-bright bg-brand-bright/12 text-brand-soft" : "border-line text-ink-dim"}`}>
            {s === "ALL" ? "Бүгд" : STATUS_LABEL[s]} <span className="ml-1 text-xs opacity-70">{s === "ALL" ? rows.length : rows.filter((r) => r.status === s).length}</span>
          </button>
        ))}
      </div>
      {!shown.length ? (
        <EmptyState icon={Camera} title="Одоогоор шалгалт өгсөн хүүхэд алга" hint="Нүүр хуудасны «Түвшин тогтоох шалгалт» холбоосоор хүүхэд шалгалт өгөхөд энд гарч ирнэ" />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((r) => (
            <li key={r.id}>
              <button onClick={() => setOpen(r.id)} className="surface-interactive chunky flex w-full flex-col gap-2 p-4 text-left">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{r.name}</p>
                    <p className="text-sm text-ink-dim">{r.grade}-р анги{r.school ? `, ${r.school}` : ""}</p>
                  </div>
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {r.submittedAt
                    ? <Badge tone="brand">Хариу {r.autoScore ?? 0}/{r.maxScore ?? 0}</Badge>
                    : <Badge tone="neutral">Бодож байна</Badge>}
                  <Badge tone={r.photoCount ? "success" : "danger"}><Camera />{r.photoCount} зураг</Badge>
                  {r.level && <Badge tone="info">{r.level}</Badge>}
                  <span className="ml-auto text-xs text-ink-dim">{when(r.createdAt)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AttemptDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState({ status: "NEW" as PlacementStatus, level: "", teacherNote: "" });
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api<Detail>(`/placement/${encodeURIComponent(id)}`).then((r) => {
      if (!alive) return;
      setD(r); setFailed(false);
      setForm({ status: r.status === "NEW" ? "REVIEWED" : r.status, level: r.level ?? "", teacherNote: r.teacherNote ?? "" });
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [id, tick]);

  const saveReview = async () => {
    setBusy(true);
    try {
      await api(`/placement/${encodeURIComponent(id)}`, { method: "PATCH", body: form });
      toast.success("Хадгаллаа");
      setTick((t) => t + 1);
    } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  };

  const back = <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft aria-hidden />Жагсаалт руу</Button>;
  if (failed) return <div className="space-y-3">{back}<ErrorState message="Дэлгэрэнгүйг ачаалж чадсангүй" onRetry={() => setTick((t) => t + 1)} /></div>;
  if (!d) return <LoadingState rows={6} />;
  const usedMin = d.submittedAt ? Math.round((new Date(d.submittedAt).getTime() - new Date(d.startedAt).getTime()) / 60000) : null;
  return (
    <div className="space-y-5">
      {back}
      <section className="chunky grid gap-4 p-5 md:grid-cols-[1fr_auto]">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold">{d.name}</h2>
          <p className="text-ink-dim">{d.grade}-р анги{d.school ? `, ${d.school}` : ""}</p>
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            <a href={`tel:${d.phone}`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-brand"><Phone className="h-4 w-4" aria-hidden />{d.phone}</a>
            {d.parentPhone && <a href={`tel:${d.parentPhone}`} className="inline-flex min-h-10 items-center gap-1.5 text-brand"><Phone className="h-4 w-4" aria-hidden />Эцэг эх {d.parentPhone}</a>}
          </div>
        </div>
        <div className="flex flex-wrap content-start gap-2 md:justify-end">
          <Badge tone="brand">Хариу {d.autoScore ?? 0}/{d.maxScore ?? 0}</Badge>
          <Badge tone="neutral">{usedMin === null ? "Илгээгээгүй" : `${usedMin} мин / ${d.minutes} мин`}</Badge>
          {d.autoSubmitted && <Badge tone="warning">Хугацаа дуусаж илгээгдсэн</Badge>}
        </div>
      </section>

      <ol className="space-y-3">
        {d.problems.map((p) => (
          <li key={p.n} className="chunky space-y-3 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-bright text-sm font-bold text-on-brand">{p.n}</span>
              <div className="min-w-0 flex-1 overflow-x-auto"><MathText>{p.statement}</MathText></div>
              <Badge tone={p.given == null ? "neutral" : p.correct ? "success" : "danger"}>{p.given == null ? "Хариугүй" : p.correct ? "Зөв" : "Буруу"}</Badge>
            </div>
            <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-dim">
              <span>Хүүхдийн хариу: <b className="text-ink">{fmtAnswer(p, p.given)}</b></span>
              <span>Зөв хариу: <b className="text-ink">{fmtAnswer(p, p.answer ?? null)}</b></span>
            </p>
            {p.photos.length ? (
              <div className="flex flex-wrap gap-3">
                {p.photos.map((k, i) => (
                  <a key={k} href={fileUrl(k)} target="_blank" rel="noopener" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element -- эрхтэй /files зам (токен query-д) */}
                    <img src={fileUrl(k)} alt={`${d.name}, ${p.n}-р бодлогын бодолт ${i + 1}`} loading="lazy"
                      className="h-48 w-auto max-w-full rounded-xl border border-line bg-bg object-contain" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm font-semibold text-error"><ImageOff className="h-4 w-4" aria-hidden />Бодолтын зураг алга, чадаагүй гэж үзнэ</p>
            )}
          </li>
        ))}
      </ol>

      <section className="chunky space-y-4 p-5" aria-labelledby="rv">
        <h3 id="rv" className="text-lg font-bold">Багшийн дүгнэлт</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5"><span className="text-sm font-semibold">Түвшин</span>
            <input list="pl-levels" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} maxLength={80}
              className="min-h-11 w-full rounded-xl border border-line bg-surface px-3" placeholder="Жишээ: Дунд" />
            <datalist id="pl-levels">{LEVELS.map((l) => <option key={l} value={l} />)}</datalist></label>
          <label className="space-y-1.5"><span className="text-sm font-semibold">Төлөв</span>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PlacementStatus }))} className="min-h-11 w-full rounded-xl border border-line bg-surface px-3">
              {(Object.keys(STATUS_LABEL) as PlacementStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select></label>
          <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-semibold">Тэмдэглэл, санал болгох анги</span>
            <textarea value={form.teacherNote} onChange={(e) => setForm((f) => ({ ...f, teacherNote: e.target.value }))} maxLength={2000} rows={4}
              className="w-full rounded-xl border border-line bg-surface p-3" placeholder="Жишээ: Квадрат тэгшитгэл сайн, бутархайтай тэгшитгэлд алдаатай, 11-2 ангид тохирно" /></label>
        </div>
        <Button onClick={saveReview} disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}Хадгалах</Button>
      </section>
    </div>
  );
}

function fmtAnswer(p: PlacementProblem, v: Answers[string] | PlacementProblem["answer"] | null): React.ReactNode {
  if (v == null || v === "") return "-";
  if (typeof v === "string") return <span className="inline-flex items-center gap-1">{v}{p.choices?.[v as ChoiceKey] && <span className="font-normal">(<MathText>{p.choices[v as ChoiceKey] ?? ""}</MathText>)</span>}</span>;
  return (p.boxes ?? []).map((b) => `[${b.key}]=${(v as Record<string, string>)[b.key] ?? "?"}`).join(", ");
}

/* ---------------- Тестийн агуулга ---------------- */
type EditProblem = Required<Pick<PlacementProblem, "statement" | "kind" | "points">> & {
  choices: Record<ChoiceKey, string>; answerChoice: ChoiceKey; boxes: { key: string; digits: number; answer: string }[];
};
const blankChoices = (): Record<ChoiceKey, string> => ({ A: "", B: "", C: "", D: "", E: "" });
const toEdit = (p: PlacementProblem): EditProblem => ({
  statement: p.statement, kind: p.kind, points: p.points,
  choices: { ...blankChoices(), ...(p.choices ?? {}) } as Record<ChoiceKey, string>,
  answerChoice: (typeof p.answer === "string" ? p.answer : "A") as ChoiceKey,
  boxes: (p.boxes ?? []).map((b) => ({ ...b, answer: typeof p.answer === "object" && p.answer ? (p.answer as Record<string, string>)[b.key] ?? "" : "" })),
});
const fromEdit = (e: EditProblem) => e.kind === "choice"
  ? { kind: "choice", statement: e.statement, points: e.points, choices: e.choices, answer: e.answerChoice }
  : { kind: "boxes", statement: e.statement, points: e.points, boxes: e.boxes.map(({ key, digits }) => ({ key, digits })), answer: Object.fromEntries(e.boxes.map((b) => [b.key, b.answer])) };

function ConfigEditor() {
  const canEdit = ["ADMIN", "TEACHER_PLUS"].includes(getRole() ?? "");
  const [t, setT] = useState<{ title: string; minutes: number; instructions: string } | null>(null);
  const [ps, setPs] = useState<EditProblem[]>([]);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api<PlacementTestPublic>("/placement/config").then((r) => {
      if (!alive) return;
      setT({ title: r.title, minutes: r.minutes, instructions: r.instructions }); setPs(r.problems.map(toEdit)); setFailed(false);
    }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [tick]);

  const upd = useCallback((i: number, patch: Partial<EditProblem>) => setPs((all) => all.map((p, j) => (j === i ? { ...p, ...patch } : p))), []);
  const move = (i: number, d: -1 | 1) => setPs((all) => { const a = [...all], j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; });

  const saveAll = async () => {
    if (!t) return;
    setBusy(true);
    try {
      await api("/placement/config", { method: "PUT", body: { ...t, problems: ps.map(fromEdit) } });
      toast.success("Шалгалт шинэчлэгдлээ");
      setTick((x) => x + 1);
    } catch (e) { toast.error(msg(e)); } finally { setBusy(false); }
  };

  if (failed) return <ErrorState message="Шалгалтын агуулгыг ачаалж чадсангүй" onRetry={() => setTick((x) => x + 1)} />;
  if (!t) return <LoadingState rows={6} />;
  const input = "min-h-11 w-full rounded-xl border border-line bg-surface px-3 disabled:opacity-70";
  return (
    <fieldset disabled={!canEdit} className="space-y-5">
      {!canEdit && <p className="rounded-xl bg-info/10 p-3 text-sm">Засах эрх Админ, Багш+ хэрэглэгчид бий, та зөвхөн харах боломжтой</p>}
      <section className="chunky grid gap-4 p-5 md:grid-cols-[1fr_160px]">
        <label className="space-y-1.5"><span className="text-sm font-semibold">Гарчиг</span>
          <input className={input} value={t.title} onChange={(e) => setT({ ...t, title: e.target.value })} maxLength={120} /></label>
        <label className="space-y-1.5"><span className="text-sm font-semibold">Хугацаа, минут</span>
          <input className={input} type="number" min={5} max={180} value={t.minutes} onChange={(e) => setT({ ...t, minutes: Number(e.target.value) })} /></label>
        <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-semibold">Хүүхдэд харагдах заавар <span className="font-normal text-ink-dim">мөр бүр нэг дүрэм</span></span>
          <textarea className="w-full rounded-xl border border-line bg-surface p-3" rows={5} value={t.instructions} onChange={(e) => setT({ ...t, instructions: e.target.value })} maxLength={3000} /></label>
      </section>

      <ol className="space-y-4">
        {ps.map((p, i) => (
          <li key={i} className="chunky space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-bright text-sm font-bold text-on-brand">{i + 1}</span>
              <select className="min-h-10 rounded-xl border border-line bg-surface px-2 text-sm" value={p.kind}
                onChange={(e) => upd(i, { kind: e.target.value as EditProblem["kind"], boxes: p.boxes.length ? p.boxes : [{ key: "a", digits: 1, answer: "" }] })}>
                <option value="choice">A–E сонголттой</option>
                <option value="boxes">Нүдэнд бичих</option>
              </select>
              <label className="flex items-center gap-1.5 text-sm">Оноо
                <input type="number" min={1} max={10} value={p.points} onChange={(e) => upd(i, { points: Number(e.target.value) })} className="min-h-10 w-16 rounded-xl border border-line bg-surface px-2" /></label>
              <span className="ml-auto flex gap-1">
                <Button variant="ghost" size="icon" aria-label="Дээш" onClick={() => move(i, -1)}><ArrowUp aria-hidden /></Button>
                <Button variant="ghost" size="icon" aria-label="Доош" onClick={() => move(i, 1)}><ArrowDown aria-hidden /></Button>
                <Button variant="ghost" size="icon" aria-label="Устгах" onClick={() => setPs((a) => a.filter((_, j) => j !== i))}><Trash2 aria-hidden /></Button>
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <textarea className="min-h-24 w-full rounded-xl border border-line bg-surface p-3 font-mono text-sm" value={p.statement}
                onChange={(e) => upd(i, { statement: e.target.value })} placeholder="Нөхцөл, томьёог $...$ дотор: $x^2-4=0$ тэгшитгэлийг бод" aria-label={`${i + 1}-р бодлогын нөхцөл`} />
              <div className="overflow-x-auto rounded-xl bg-bg p-3 text-sm"><MathText>{p.statement || "Урьдчилан харах"}</MathText></div>
            </div>
            {p.kind === "choice" ? (
              <div className="grid gap-2 md:grid-cols-5">
                {CHOICE_KEYS.map((k) => (
                  <div key={k} className={`space-y-1 rounded-xl border p-2 ${p.answerChoice === k ? "border-success bg-success/8" : "border-line"}`}>
                    <label className="flex items-center gap-1.5 text-sm font-bold">
                      <input type="radio" name={`ans-${i}`} checked={p.answerChoice === k} onChange={() => upd(i, { answerChoice: k })} />{k}
                      {p.answerChoice === k && <span className="text-xs font-semibold text-success">зөв</span>}
                    </label>
                    <input className="min-h-9 w-full rounded-lg border border-line bg-surface px-2 font-mono text-xs" value={p.choices[k]}
                      onChange={(e) => upd(i, { choices: { ...p.choices, [k]: e.target.value } })} placeholder="$-4$" aria-label={`${k} сонголт`} />
                    <div className="min-h-6 overflow-x-auto text-sm"><MathText>{p.choices[k]}</MathText></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {p.boxes.map((b, j) => (
                  <div key={j} className="flex flex-wrap items-center gap-2 text-sm">
                    <span>Нүд</span>
                    <input className="min-h-9 w-16 rounded-lg border border-line bg-surface px-2 font-mono" value={b.key} maxLength={3}
                      onChange={(e) => upd(i, { boxes: p.boxes.map((x, y) => (y === j ? { ...x, key: e.target.value.toLowerCase() } : x)) })} aria-label="Нүдний нэр" />
                    <span>оронтой</span>
                    <input type="number" min={1} max={3} className="min-h-9 w-16 rounded-lg border border-line bg-surface px-2" value={b.digits}
                      onChange={(e) => upd(i, { boxes: p.boxes.map((x, y) => (y === j ? { ...x, digits: Number(e.target.value) } : x)) })} aria-label="Орны тоо" />
                    <span>зөв хариу</span>
                    <input className="min-h-9 w-20 rounded-lg border border-success/60 bg-surface px-2 font-mono" value={b.answer}
                      onChange={(e) => upd(i, { boxes: p.boxes.map((x, y) => (y === j ? { ...x, answer: e.target.value } : x)) })} aria-label="Зөв хариу" />
                    <Button variant="ghost" size="icon" aria-label="Нүд устгах" onClick={() => upd(i, { boxes: p.boxes.filter((_, y) => y !== j) })}><Trash2 aria-hidden /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => upd(i, { boxes: [...p.boxes, { key: String.fromCharCode(97 + p.boxes.length), digits: 1, answer: "" }] })}><Plus aria-hidden />Нүд нэмэх</Button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/95 p-3 backdrop-blur">
        <Button variant="outline" onClick={() => setPs((a) => [...a, { statement: "", kind: "choice", points: 1, choices: blankChoices(), answerChoice: "A", boxes: [] }])}><Plus aria-hidden />Бодлого нэмэх</Button>
        <Button onClick={saveAll} disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}Хадгалах</Button>
        <span className="text-xs text-ink-dim">Шинэ хувилбар дараагийн хүүхдээс эхэлж очно, өмнө нь өгсөн хүүхдийн дүн өөрчлөгдөхгүй</span>
      </div>
    </fieldset>
  );
}
