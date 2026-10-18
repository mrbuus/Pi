"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Eye, EyeOff, Loader2, Plus, Trash2, Users } from "lucide-react";
import RequireRole from "@/components/nav/RequireRole";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { PageHeader } from "@/components/ui/Surface";
import { api, getRole } from "@/lib/api";
import { fmtUb } from "@/components/books/types";

interface AdminEvent { id: string; title: string; startsAt: string; endsAt: string; note: string | null; published: boolean; timeLimitMin: number | null; problemCount: number; registered: number; results: number; phase: "upcoming" | "live" | "done"; test: { id: string; title: string; type: string } }
interface PickTest { id: string; title: string; type: string; timeLimitMin: number | null; problemCount: number }
interface Reg { id: string; firstName: string; lastName: string; phone: string | null; role: string; studentCode: string | null; studentProfile: { school: string | null; grade: number | null } | null; registeredAt: string; status: "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED"; score: number | null; max: number | null }

const msg = (e: unknown) => (e instanceof Error ? e.message : "Алдаа гарлаа");
const PHASE = { upcoming: ["Удахгүй", "info"], live: ["Явагдаж байна", "success"], done: ["Дууссан", "neutral"] } as const;
const STATUS = { NOT_STARTED: "Эхлээгүй", IN_PROGRESS: "Бодож байна", SUBMITTED: "Илгээсэн" } as const;

/** Дараагийн Ням 11:00 (хэрэглэгчийн цагаар) — datetime-local утга */
function nextSundayLocal() {
  const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); d.setHours(11, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function MockExamsAdminClient() {
  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <PageHeader title="Жишиг сорил" description="Долоо хоног бүрийн онлайн сорилын хуваарь, бүртгэл, дүн" />
      <Body />
    </RequireRole>
  );
}

function Body() {
  const canEdit = ["ADMIN", "TEACHER_PLUS"].includes(getRole() ?? "");
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [showForm, setShowForm] = useState(false);
  useEffect(() => {
    let alive = true;
    api<AdminEvent[]>("/mock-exams/admin").then((r) => { if (alive) { setEvents(r); setFailed(false); } }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [tick]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  if (failed) return <ErrorState message="Сорилын жагсаалтыг ачаалж чадсангүй" onRetry={refresh} />;
  if (!events) return <LoadingState rows={5} />;
  return (
    <div className="space-y-5">
      {canEdit && (
        <div>
          <Button onClick={() => setShowForm((v) => !v)} variant={showForm ? "outline" : "default"}><Plus aria-hidden />{showForm ? "Маягтыг хаах" : "Шинэ сорил"}</Button>
          {showForm && <CreateForm onDone={() => { setShowForm(false); refresh(); }} />}
        </div>
      )}
      {!events.length ? (
        <EmptyState icon={Users} title="Сорил хараахан алга" hint="«Шинэ сорил» дарж тест, өдөр, цагаа сонгоход нийтийн хуудсанд шууд гарна" />
      ) : (
        <ul className="space-y-3">{events.map((e) => <EventRow key={e.id} e={e} canEdit={canEdit} onChanged={refresh} />)}</ul>
      )}
    </div>
  );
}

function CreateForm({ onDone }: { onDone: () => void }) {
  const [tests, setTests] = useState<PickTest[] | null>(null);
  const [f, setF] = useState({ title: "Долоо хоногийн жишиг сорил", testId: "", startsAt: nextSundayLocal(), lateMin: 30, note: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { api<PickTest[]>("/mock-exams/tests").then(setTests).catch(() => setTests([])); }, []);
  const input = "min-h-11 w-full rounded-xl border border-line bg-surface px-3";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.testId) return toast.error("Тестээ сонгоно уу");
    setBusy(true);
    try {
      await api("/mock-exams", { method: "POST", body: { ...f, startsAt: new Date(f.startsAt).toISOString(), note: f.note || undefined } });
      toast.success("Сорил нэмэгдлээ");
      onDone();
    } catch (err) { toast.error(msg(err)); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="chunky mt-3 grid gap-4 p-5 md:grid-cols-2">
      <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-semibold">Нэр</span><input className={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={120} required /></label>
      <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-semibold">Тест <span className="font-normal text-ink-dim">автомат дүнтэй, хугацаатай</span></span>
        <select className={input} value={f.testId} onChange={(e) => setF({ ...f, testId: e.target.value })} required>
          <option value="">{tests === null ? "Ачаалж байна" : tests.length ? "Сонгох" : "Тохирох тест алга (ЭЕШ сорил, 1000 бодлого, хугацаатай)"}</option>
          {(tests ?? []).map((t) => <option key={t.id} value={t.id}>{t.title} · {t.problemCount} бодлого · {t.timeLimitMin ?? "?"} мин</option>)}
        </select></label>
      <label className="space-y-1.5"><span className="text-sm font-semibold">Эхлэх өдөр, цаг</span><input className={input} type="datetime-local" value={f.startsAt} onChange={(e) => setF({ ...f, startsAt: e.target.value })} required /></label>
      <label className="space-y-1.5"><span className="text-sm font-semibold">Хоцорч эхлүүлж болох минут</span><input className={input} type="number" min={0} max={600} value={f.lateMin} onChange={(e) => setF({ ...f, lateMin: Number(e.target.value) })} /></label>
      <label className="space-y-1.5 md:col-span-2"><span className="text-sm font-semibold">Тайлбар <span className="font-normal text-ink-dim">заавал биш</span></span><input className={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} maxLength={500} placeholder="Жишээ: 12-р ангийнханд, математик" /></label>
      <div className="md:col-span-2"><Button type="submit" disabled={busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}Нэмэх</Button></div>
    </form>
  );
}

function EventRow({ e, canEdit, onChanged }: { e: AdminEvent; canEdit: boolean; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [regs, setRegs] = useState<Reg[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [label, tone] = PHASE[e.phase];
  useEffect(() => {
    if (!open || regs) return;
    api<Reg[]>(`/mock-exams/${encodeURIComponent(e.id)}/registrations`).then(setRegs).catch(() => setRegs([]));
  }, [open, regs, e.id]);
  const toggle = async () => {
    setBusy(true);
    try { await api(`/mock-exams/${encodeURIComponent(e.id)}`, { method: "PATCH", body: { published: !e.published } }); onChanged(); } catch (err) { toast.error(msg(err)); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm(`«${e.title}» сорилыг устгах уу?`)) return;
    setBusy(true);
    try { await api(`/mock-exams/${encodeURIComponent(e.id)}`, { method: "DELETE" }); toast.success("Устгалаа"); onChanged(); } catch (err) { toast.error(msg(err)); } finally { setBusy(false); }
  };
  return (
    <li className="chunky p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-bold">{e.title}<Badge tone={tone}>{label}</Badge>{!e.published && <Badge tone="warning">Нийтлээгүй</Badge>}</p>
          <p className="text-sm text-ink-dim">{fmtUb(e.startsAt)} · {e.test.title} · {e.problemCount} бодлого, {e.timeLimitMin ?? "?"} мин</p>
        </div>
        <Badge tone="brand"><Users />{e.registered} бүртгэл</Badge>
        <Badge tone={e.results ? "success" : "neutral"}>{e.results} дүн</Badge>
        {canEdit && <Button variant="ghost" size="icon" aria-label={e.published ? "Нийтлэлийг хаах" : "Нийтлэх"} onClick={toggle} disabled={busy}>{e.published ? <EyeOff aria-hidden /> : <Eye aria-hidden />}</Button>}
        {canEdit && <Button variant="ghost" size="icon" aria-label="Устгах" onClick={remove} disabled={busy}><Trash2 aria-hidden /></Button>}
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>Бүртгэл<ChevronDown className={`transition ${open ? "rotate-180" : ""}`} aria-hidden /></Button>
      </div>
      {open && (
        <div className="mt-4 overflow-x-auto">
          {!regs ? <LoadingState rows={3} /> : !regs.length ? <p className="text-sm text-ink-dim">Бүртгүүлсэн хүн алга</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-ink-dim"><tr><th className="py-1.5 pr-3 font-semibold">Сурагч</th><th className="py-1.5 pr-3 font-semibold">Сургууль, анги</th><th className="py-1.5 pr-3 font-semibold">Утас</th><th className="py-1.5 pr-3 font-semibold">Төлөв</th><th className="py-1.5 font-semibold">Оноо</th></tr></thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="py-2 pr-3 font-semibold">{r.lastName?.[0] ? `${r.lastName[0]}. ` : ""}{r.firstName}{r.studentCode ? <span className="ml-1 font-mono text-xs text-ink-dim">{r.studentCode}</span> : null}</td>
                    <td className="py-2 pr-3 text-ink-dim">{[r.studentProfile?.school, r.studentProfile?.grade ? `${r.studentProfile.grade}-р анги` : null].filter(Boolean).join(", ") || "-"}</td>
                    <td className="py-2 pr-3">{r.phone ? <a className="text-brand" href={`tel:${r.phone}`}>{r.phone}</a> : "-"}</td>
                    <td className="py-2 pr-3">{STATUS[r.status]}</td>
                    <td className="py-2 font-semibold">{r.score != null ? `${r.score}/${r.max}` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </li>
  );
}
