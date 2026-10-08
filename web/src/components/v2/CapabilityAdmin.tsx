"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
type Grant = { id: string; userId: string; capability: string; scopeKey: string; reason: string; expiresAt: string | null; revokedAt: string | null };
type Data = { asOf: string; grants: Grant[]; staff: { id: string; firstName: string; lastName: string }[]; classrooms: { id: string; name: string }[] };
const names: Record<string, string> = { "schedule.manage": "Хуваарь удирдах", "time.review": "Ажилласан цагийн нэгдсэн мэдээлэл", "payroll.view": "Цалингийн мэдээлэл үзэх", "finance.manage": "Төлбөр, банкны тулгалт удирдах" };
export default function CapabilityAdmin() {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [userId, setUserId] = useState(""), [capability, setCapability] = useState("schedule.manage"), [scopeKey, setScopeKey] = useState("");
  const [reason, setReason] = useState(""), [expires, setExpires] = useState(""), [saving, setSaving] = useState(false), [revoking, setRevoking] = useState<string | null>(null), [revokeReason, setRevokeReason] = useState("");
  async function reload() { try { const next = await api<Data>("/staff-capabilities"); setData(next); setError(""); } catch { setError("Эрхийн жагсаалтыг уншиж чадсангүй. Админ эрхээр нэвтэрсэн эсэхээ шалгана уу."); } }
  useEffect(() => { let active = true; void api<Data>("/staff-capabilities").then((next) => { if (active) { setData(next); } }).catch(() => { if (active) setError("Эрхийн жагсаалтыг уншиж чадсангүй. Админ эрхээр нэвтэрсэн эсэхээ шалгана уу."); }); return () => { active = false; }; }, []);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving) return; setSaving(true); setMessage("");
    try {
      await api("/staff-capabilities", { method: "POST", body: JSON.stringify({ userId, capability, scopeKey: capability === "schedule.manage" ? scopeKey : "", reason,
        ...(expires ? { expiresAt: `${expires}:00+08:00` } : {}) }) });
      setReason(""); setMessage("Эрх олголоо. Өөрчлөлт аудитад хадгалагдсан."); await reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Эрхийг хадгалж чадсангүй. Маягтын мэдээлэл хэвээр байна."); }
    finally { setSaving(false); }
  }
  async function revoke(id: string) {
    if (saving) return; setSaving(true);
    try { await api(`/staff-capabilities/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ reason: revokeReason }) }); setRevoking(null); setRevokeReason(""); setMessage("Эрх цуцлагдлаа. Өмнөх түүх хадгалагдсан."); await reload(); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Цуцалж чадсангүй. Дахин оролдоно уу."); }
    finally { setSaving(false); }
  }
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <LoadingState rows={4} />;
  const control = "mt-2 min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base font-normal text-ink focus-visible:outline-2 focus-visible:outline-brand";
  return <div className="mx-auto max-w-3xl space-y-6"><header className="space-y-3"><Link href="/app/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">Удирдлага руу буцах</Link><h1 className="text-2xl font-bold text-ink">Ажилтны нарийн эрх</h1><p className="text-sm leading-relaxed text-ink-dim">Багш+ эрх нь хуваарь, төлбөр, цагийн нэгдсэн мэдээллийг өөрөө нээхгүй. Админ тодорхой ажилтан, хамрах хүрээ, хугацаагаар эрх олгоно. Нэр солигдсон ч эрх тогтвортой хэрэглэгчийн дугаартай холбогдоно.</p></header>
    <form onSubmit={save} className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="text-lg font-semibold">Эрх олгох эсвэл шинэчлэх</h2>
      <label className="block text-sm font-semibold" htmlFor="cap-staff">Ажилтан<select id="cap-staff" required value={userId} onChange={(e) => setUserId(e.target.value)} className={control}><option value="">Ажилтнаа сонгоно уу</option>{data.staff.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}</select></label>
      <label className="block text-sm font-semibold" htmlFor="cap-type">Үйлдлийн эрх<select id="cap-type" value={capability} onChange={(e) => { setCapability(e.target.value); setScopeKey(""); }} className={control}>{Object.entries(names).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      {capability === "schedule.manage" && <label className="block text-sm font-semibold" htmlFor="cap-scope">Хуваарийн хамрах хүрээ<select id="cap-scope" value={scopeKey} onChange={(e) => setScopeKey(e.target.value)} className={control}><option value="">Бүх анги болон багшийн ажлын хуваарь</option>{data.classrooms.map((c) => <option key={c.id} value={c.id}>{c.name} анги</option>)}</select></label>}
      <label className="block text-sm font-semibold" htmlFor="cap-expiry">Дуусах хугацаа — Улаанбаатар<input id="cap-expiry" type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} className={control} /><span className="mt-1 block text-xs font-normal text-ink-dim">Хоосон үлдээвэл цуцлах хүртэл хүчинтэй. Тодорхой хугацаа өгөхийг зөвлөж байна.</span></label>
      <label className="block text-sm font-semibold" htmlFor="cap-reason">Олгох шалтгаан<textarea id="cap-reason" required minLength={3} maxLength={500} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={`${control} py-3`} /></label>
      <p className="text-xs leading-relaxed text-ink-dim">Цалингийн эрхийн нэр нь хэрэгжсэн цалингийн системийн баталгаа биш. Одоогийн цагийн мэдээлэл хуваариас тооцсон төлөвлөгөөт цаг; бодит ажлын цагийг батлах бүрэн урсгал тусдаа хөгжүүлэлттэй.</p>
      <Button type="submit" disabled={saving} className="min-h-12 w-full">{saving ? "Хадгалж байна…" : "Эрхийг хадгалах"}</Button>
    </form><p role="status" className="text-sm text-brand">{message || error}</p><section className="space-y-3"><h2 className="text-lg font-semibold">Олгосон эрх ба түүх</h2>{data.grants.length === 0 && <p className="rounded-xl border border-line p-4 text-sm text-ink-dim">Нарийн эрх хараахан олгоогүй байна. Админ өөрийн удирдлагын эрхээр ажиллана.</p>}{data.grants.map((g) => {
      const staff = data.staff.find((s) => s.id === g.userId), scope = data.classrooms.find((c) => c.id === g.scopeKey);
      const expired = !!g.expiresAt && Date.parse(g.expiresAt) <= Date.parse(data.asOf), inactive = !!g.revokedAt || expired;
      return <article key={g.id} className="space-y-3 rounded-2xl border border-line bg-surface p-4"><p className="font-semibold text-ink">{staff ? `${staff.lastName} ${staff.firstName}` : "Архивласан ажилтан"} · {names[g.capability] ?? g.capability}</p><p className="text-sm text-ink-dim">{scope?.name ?? (g.scopeKey ? "Архивласан анги" : "Бүх хамрах хүрээ")} · {g.revokedAt ? "Цуцалсан" : expired ? "Хугацаа дууссан" : "Хүчинтэй"}</p><p className="break-words text-sm text-ink-dim">{g.reason}</p>{g.expiresAt && <time className="block text-sm text-ink-dim" dateTime={g.expiresAt}>{new Intl.DateTimeFormat("mn-MN", { timeZone: "Asia/Ulaanbaatar", dateStyle: "medium", timeStyle: "short" }).format(new Date(g.expiresAt))}</time>}
        {!inactive && revoking !== g.id && <Button variant="outline" onClick={() => { setRevoking(g.id); setRevokeReason(""); }}>Эрхийг цуцлах</Button>}
        {revoking === g.id && <div className="space-y-3 rounded-xl border border-line p-3"><label className="block text-sm font-semibold" htmlFor={`revoke-${g.id}`}>Цуцлах шалтгаан<textarea id={`revoke-${g.id}`} minLength={3} maxLength={500} rows={2} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} className={`${control} py-3`} /></label><div className="flex flex-wrap gap-2"><Button disabled={saving || revokeReason.trim().length < 3} onClick={() => void revoke(g.id)}>Цуцлахыг батлах</Button><Button variant="outline" disabled={saving} onClick={() => setRevoking(null)}>Болих</Button></div></div>}
      </article>;
    })}</section></div>;
}
