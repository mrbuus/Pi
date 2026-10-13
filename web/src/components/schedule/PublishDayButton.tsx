"use client";

import { useState } from "react";
import { BellRing, Check, X } from "lucide-react";
import { useSection } from "@/components/students/progress/useSection";
import { api } from "@/lib/api";

interface Publication {
  date: string;
  publishedAt: string | null;
  recipients: number;
  publishedBy: string | null;
}

function hhmmUB(iso: string) {
  const d = new Date(new Date(iso).getTime() + 8 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * «Нийтлэх» (эзэн 2026-10-11): тэр өдөр хичээлтэй багш бүрт өөрийн хичээл,
 * сурагч бүрт өөрийн ангийн хуваарь мэдэгдлээр очно. Дахин дарвал «өөрчлөгдлөө».
 * Олон хүнд очих тул нэг удаа баталгаажуулна.
 */
export default function PublishDayButton({ date }: { date: string }) {
  const { data, setData } = useSection<Publication | null>(`/schedule/day/${date}/publication`, null);
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const published = !!data?.publishedAt;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ publishedAt: string; recipients: number }>(`/schedule/day/${date}/publish`, {
        method: "POST",
      });
      setData((prev) => ({
        date,
        publishedAt: r.publishedAt,
        recipients: r.recipients,
        publishedBy: prev?.publishedBy ?? null,
      }));
      setArmed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Илгээж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {published && !armed && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-3 py-1 text-xs font-semibold text-success">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Нийтэлсэн {hhmmUB(data!.publishedAt!)} — {data!.recipients} хүнд очсон
        </span>
      )}
      {!armed ? (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-bright px-4 text-sm font-semibold text-brand-soft transition hover:bg-brand-bright/10"
        >
          <BellRing className="h-4 w-4" aria-hidden />
          {published ? "Өөрчлөлт илгээх" : "Нийтлэх"}
        </button>
      ) : (
        <div role="group" aria-label="Нийтлэхийг баталгаажуулах" className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink">Тэр өдөр хичээлтэй багш, сурагчдад мэдэгдэл очно.</span>
          <button
            type="button"
            onClick={send}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-bright px-4 text-sm font-semibold text-on-brand disabled:opacity-60"
          >
            <BellRing className="h-4 w-4" aria-hidden />
            {busy ? "Илгээж байна…" : "Илгээх"}
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            aria-label="Болих"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line text-ink-dim hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
      {error && <span role="alert" className="text-sm text-error">{error}</span>}
    </div>
  );
}
