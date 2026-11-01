"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { byFirstName } from "@/lib/personName";
import type { StudentRow } from "./types";

// Сурагчийн кодын жагсаалт (эзэн 2026-11-01): багш хүүхдүүдэд кодыг нь
// хэлж/илгээж өгөхөд. Зөвхөн нэр, код, нэг «Хуулах» товч — өөр юу ч үгүй.
export default function CodesTab({ students }: { students: StudentRow[] }) {
  const rows = [...students].sort(byFirstName);
  const [copied, setCopied] = useState<boolean | null>(null);
  const text = rows.map((s) => `${s.firstName} ${s.lastName} - ${s.studentCode ?? "кодгүй"}`).join("\n");

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      // Хуучин утас/эрхгүй орчин: далд textarea-аар хуулна
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      ok = document.execCommand("copy");
      ta.remove();
    }
    setCopied(ok);
    setTimeout(() => setCopied(null), 1800);
  }

  if (rows.length === 0) return <p className="text-sm text-ink-dim">Ангид сурагч алга</p>;

  return (
    <section className="chunky p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-bold text-brand-soft">Сурагчийн код</h2>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-semibold text-ink hover:border-brand-bright/50"
        >
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4 text-ink-dim" aria-hidden />}
          {copied ? "Хуулсан" : copied === false ? "Хуулж чадсангүй" : "Бүгдийг хуулах"}
        </button>
      </div>
      <ol className="divide-y divide-line">
        {rows.map((s, i) => (
          <li key={s.id} className="flex items-center gap-3 py-2.5">
            <span className="w-6 shrink-0 text-right text-sm tabular-nums text-ink-dim">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">
              {s.firstName} <span className="text-ink-dim">{s.lastName}</span>
            </span>
            <span className={s.studentCode ? "font-mono text-lg font-bold tabular-nums" : "text-sm text-ink-dim"}>
              {s.studentCode ?? "кодгүй"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
