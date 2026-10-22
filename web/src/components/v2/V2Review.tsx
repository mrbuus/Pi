"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CheckCheck, Download, FileSearch, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import MathText from "@/components/MathText";
// Ажлын жагсаалтын JSON-ыг ЗӨВХӨН админ гэдгийг шалгасны дараа татна (Багш+ URL-аар орвол
// өгөгдөл ачаалагдахгүй). Жинхэнэ нэвтрэх хаалт: app/app/admin/v2/layout.tsx (AdminOnly).
type ReviewData = typeof import("./review-data.json");
type Status = "tested" | "implemented" | "partial" | "external-config" | "future";
type Note = { checked: boolean; comment: string };
type Notes = Record<string, Note>;
const labels: Record<Status, string> = { tested: "Туршсан", implemented: "Кодод орсон", partial: "Дутуу хэсэгтэй", "external-config": "Гадаад тохиргоо", future: "Дараагийн шат" };
const tones: Record<Status, string> = { tested: "bg-success/10 text-success", implemented: "bg-info/10 text-info", partial: "bg-accent-violet/10 text-accent-violet", "external-config": "bg-panel text-ink-dim", future: "bg-ink text-bg" };
function validateNotes(value: unknown, ids: Set<string>): Notes {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid notes");
  const clean: Notes = {};
  for (const [id, note] of Object.entries(value)) {
    if (!ids.has(id) || !note || typeof note !== "object" || Array.isArray(note) || typeof note.checked !== "boolean" || typeof note.comment !== "string" || note.comment.length > 2000) throw new Error("Invalid note");
    clean[id] = { checked: note.checked, comment: note.comment };
  }
  return clean;
}
export default function V2Review() {
  const [role, setRole] = useState<string | null>(null), [error, setError] = useState(""), [message, setMessage] = useState("");
  const [query, setQuery] = useState(""), [filter, setFilter] = useState("all"), [notes, setNotes] = useState<Notes>({}), [storageKey, setStorageKey] = useState("");
  const [data, setData] = useState<ReviewData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ids = useMemo(() => new Set((data?.items ?? []).map((item) => item.id)), [data]);
  useEffect(() => {
    let active = true;
    void api<{ id: string; role: string }>("/auth/me").then(async (me) => {
      if (!active) return;
      setRole(me.role);
      if (me.role !== "ADMIN") return;
      // Өгөгдлийг ЗӨВХӨН админ гэдэг нь батлагдсаны дараа татна
      const mod = await import("./review-data.json");
      if (!active) return;
      const key = `pi-v2-review-v1:${me.id}`;
      setStorageKey(key);
      setData(mod.default);
      try { const raw = localStorage.getItem(key); if (raw) setNotes(validateNotes(JSON.parse(raw), new Set(mod.default.items.map((item) => item.id)))); } catch { setMessage("Өмнөх тэмдэглэлийг уншиж чадсангүй. Хадгалсан хуулгаа оруулж болно."); }
    }).catch(() => { if (active) setError("Эрхийг шалгаж чадсангүй. Дахин нэвтэрч оролдоно уу."); });
    return () => { active = false; };
  }, []);
  const items = useMemo(() => (data?.items ?? []).filter((item) => (filter === "all" || item.status === filter) && `${item.id} ${item.title} ${item.requirement} ${item.verification}`.toLowerCase().includes(query.toLowerCase())), [query, filter, data]);
  function updateNote(id: string, value: Partial<Note>) {
    const previous = notes[id] ?? { checked: false, comment: "" };
    const next = { ...notes, [id]: { ...previous, ...value } }; setNotes(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setMessage("Тэмдэглэл энэ төхөөрөмж дээр хадгалагдлаа."); } catch { setMessage("Хадгалж чадсангүй. Тэмдэглэлээ татаж аваарай."); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, notes }, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "pi-v2-review-notes.json"; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importNotes(file: File | undefined) {
    try {
      if (!file || file.size > 500000) throw new Error("Invalid file");
      const parsed = JSON.parse(await file.text()); if (parsed.version !== 1) throw new Error("Version");
      const next = { ...notes, ...validateNotes(parsed.notes, ids) }; localStorage.setItem(storageKey, JSON.stringify(next)); setNotes(next); setMessage("Тэмдэглэл орууллаа.");
    } catch { setMessage("Файл тохирохгүй байна. Өмнөх тэмдэглэл хэвээр үлдлээ."); }
  }
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  if (role === null) return <LoadingState rows={5} />;
  if (role !== "ADMIN") return <ErrorState message="Энэ хөгжүүлэлтийн хяналт удирдлагад зориулагдсан." />;
  if (!data) return <LoadingState rows={5} />;
  return <div className="mx-auto max-w-5xl space-y-6">
    <header className="space-y-3"><span className="inline-flex items-center gap-2 rounded-full bg-brand-bright/10 px-4 py-2 text-sm font-semibold text-brand"><FileSearch aria-hidden className="size-4" />Хөгжүүлэлтийн хяналт</span><h1 className="cyrillic-heading text-2xl font-bold text-ink">Pi.mn v2 — ажлын жагсаалт</h1><p className="text-sm leading-relaxed text-ink-dim">{data.limits}</p><Link href="/app/admin" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">Удирдлагын самбар руу буцах</Link></header>
    <div className="grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2"><label className="text-sm font-semibold">Ажлаас хайх<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Онол, Word, зураг, түүх…" className="mt-2 min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-brand" /></label><label className="text-sm font-semibold">Төлөв<select value={filter} onChange={(e) => setFilter(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-brand"><option value="all">Бүх төлөв</option>{Object.entries(labels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></div>
    <div className="flex flex-wrap items-center gap-3"><Button variant="outline" onClick={download}><Download aria-hidden />Тэмдэглэл татах</Button><Button variant="outline" onClick={() => fileRef.current?.click()}><Upload aria-hidden />Тэмдэглэл оруулах</Button><input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => { void importNotes(e.target.files?.[0]); e.target.value = ""; }} /><span className="text-sm text-ink-dim"><MathText>{`$${items.length}$ / $${data.items.length}$ ажил`}</MathText></span></div>
    <p className="text-sm text-ink-dim">Уншсан тэмдэглэл нь ажиллагаа баталгаажсан гэсэн үг биш. Тэмдэглэл энэ төхөөрөмж дээр үлдэнэ; хадгалсан хуулгаа татаж аваарай.</p><p role="status" className="min-h-6 text-sm text-brand">{message}</p>
    <div className="space-y-4">{items.map((item) => <article key={item.id} className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5"><span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${tones[item.status as Status]}`}>{labels[item.status as Status]}</span><h2 className="text-lg font-bold text-ink">{item.id} — {item.title}</h2><p className="text-sm leading-relaxed text-ink-dim">{item.workflow}</p><details className="rounded-xl border border-line bg-bg px-3"><summary className="min-h-12 cursor-pointer content-center text-sm font-semibold">Шалгах нөхцөл, эх код</summary><div className="space-y-3 pb-4 text-sm leading-relaxed"><p>{item.verification}</p><p>{item.acceptanceTest}</p>{item.limitations.map((limit) => <p key={limit} className="text-ink-dim">Хязгаар: {limit}</p>)}<p className="text-ink-dim">{item.evidenceSource}</p>{item.actualFiles.map((file) => <p key={file} className="break-all font-mono text-xs text-ink-dim">{file}</p>)}</div></details><label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={notes[item.id]?.checked ?? false} onChange={(e) => updateNote(item.id, { checked: e.target.checked })} className="size-5 accent-brand" /><CheckCheck aria-hidden className="size-4 text-ink-dim" />Би уншиж хянасан</label><label className="block text-sm font-semibold">Засах зүйлээ тэмдэглэх<textarea rows={2} maxLength={2000} value={notes[item.id]?.comment ?? ""} onChange={(e) => updateNote(item.id, { comment: e.target.value })} className="mt-2 w-full rounded-xl border border-line bg-bg p-3 text-base font-normal focus-visible:outline-2 focus-visible:outline-brand" /></label></article>)}</div>
    {items.length === 0 && <p className="rounded-2xl border border-line p-5 text-sm text-ink-dim">Тохирох ажил олдсонгүй. Хайлт эсвэл төлвөө өөрчилнө үү.</p>}
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5"><h2 className="text-xl font-bold">Судалгааны эхүүд</h2><p className="text-sm text-ink-dim"><MathText>{`$${data.researchCounts.sources}$ эх, үүнээс шинэ судалгааны $${data.researchCounts.new_intellectual_papers}$ ажил. Өмнөх сангийн бодит тоо баталгаажаагүй тул хоёр дахин өссөн гэж зарлаагүй.`}</MathText></p>{data.research.map((source) => <details key={source.id} className="border-t border-line"><summary className="min-h-12 cursor-pointer py-3 text-sm font-semibold">{source.title}</summary><div className="space-y-3 pb-4 text-sm leading-relaxed text-ink-dim"><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-brand underline">Анхдагч эх сурвалж нээх</a><p>{source.application}</p><p>Хязгаар: {source.limits}</p><p>Лиценз: {source.license}</p><p>Төхөөрөмжийн шалгалт: {source.hardware_evaluation}</p></div></details>)}</section>
  </div>;
}
