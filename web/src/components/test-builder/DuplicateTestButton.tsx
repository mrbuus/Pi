"use client";
import { useState } from "react";
import Link from "next/link";
import { Copy } from "lucide-react";
import { api, getRole } from "@/lib/api";
export default function DuplicateTestButton({ testId }: { testId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyId, setCopyId] = useState("");
  const role = getRole();
  if (role !== "ADMIN" && role !== "TEACHER") return null;
  async function duplicate() {
    if (!window.confirm("Хадгалсан тестээс нийтлэгдээгүй хуулбар үүсгэх үү? Сурагчийн дүн, оролдлого хуулагдахгүй.")) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ id: string }>(`/tests/${encodeURIComponent(testId)}/duplicate`, { method: "POST" });
      setCopyId(result.id);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Хуулж чадсангүй."); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    {copyId ? <Link className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm text-brand-soft" href={`/app/tests/${encodeURIComponent(copyId)}/edit`}>Ноорог хуулбарыг нээх</Link> :
      <button type="button" disabled={busy} onClick={() => void duplicate()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line px-4 text-sm text-ink disabled:opacity-50"><Copy className="h-4 w-4" aria-hidden />{busy ? "Хуулж байна..." : "Ноорог хуулбар үүсгэх"}</button>}
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
  </div>;
}
