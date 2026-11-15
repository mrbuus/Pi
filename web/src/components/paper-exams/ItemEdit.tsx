"use client";

import { useState } from "react";
import { Save, Sigma, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { errorText } from "@/components/exams/types";
import FormulaPicker from "./FormulaPicker";
import { CONTENT_AREAS, itemName, type FormulaRef, type PaperItem } from "./types";

const field = "min-h-11 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink focus-visible:border-brand-bright";

/**
 * Нэг бодлогын (эсвэл 2-р хэсгийн нэг бодлогын бүх багцын) сэдэв, агуулга, томьёо, хүчингүй
 * эсэхийг тухайн бодлого дээр нь засна — тусдаа «Түлхүүр, агуулга» табгүй (эзэн 2026-11-15).
 * Багш+/Админ. Түлхүүр, оноо машины файлаас ирдэг тул энд засахгүй.
 */
export default function ItemEdit({
  examId,
  items,
  formulas,
  topics,
  examTopics,
  onSaved,
}: {
  examId: string;
  items: PaperItem[];
  formulas: FormulaRef[];
  topics: { slug: string; name: string }[];
  /** Энэ шалгалтын бодлогуудад оноосон сэдвүүд — сонгох боломжтой цорын ганц сэдвүүд */
  examTopics: string[];
  onSaved: () => void;
}) {
  const first = items[0];
  const [topic, setTopic] = useState(first?.topic ?? "");
  const [area, setArea] = useState(first?.area ?? "");
  const [voided, setVoided] = useState(items.every((i) => i.voided));
  const [slugs, setSlugs] = useState<string[]>(() => [...new Set(items.flatMap((i) => i.formulaSlugs))]);
  const [refs, setRefs] = useState(() => new Map(formulas.map((f) => [f.slug, f])));
  const [pick, setPick] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!first) return null;

  async function save() {
    setBusy(true);
    try {
      await api(`/paper-exams/${encodeURIComponent(examId)}/items`, {
        method: "PUT",
        body: {
          items: items.map((it) => ({
            number: it.number,
            points: it.points,
            area: area || null,
            topic: topic.trim() || null,
            formulaSlugs: slugs,
            voided,
          })),
        },
      });
      toast.success("Хадгаллаа");
      onSaved();
    } catch (e) {
      toast.error(errorText(e, "Хадгалж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel px-4 py-3">
      <h3 className="mb-2 text-xs font-bold tracking-wide text-ink-dim">
        АНГИЛАЛ · {items.map((i) => `${itemName(i, items)} (${i.points} оноо)`).join(", ")}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Сэдэв
          {/* Зөвхөн энэ шалгалтад орсон сэдвүүдээс (эзэн: тестийн хамрахаас гадуурх сэдэв оруулахгүй) */}
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className={field}>
            <option value="">Оноогоогүй</option>
            {[...new Set([...examTopics, topic].filter(Boolean))].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-ink">
          Агуулга (БҮТ)
          <select value={area} onChange={(e) => setArea(e.target.value)} className={field}>
            <option value="">Оноогоогүй</option>
            {CONTENT_AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {slugs.map((slug) => (
          <span key={slug} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-line px-2 text-sm text-ink">
            {refs.get(slug)?.title ?? slug}
            <button aria-label="Томьёо хасах" onClick={() => setSlugs((s) => s.filter((x) => x !== slug))} className="text-ink-dim hover:text-ink">
              <X className="size-4" aria-hidden />
            </button>
          </span>
        ))}
        <Button variant="outline" size="sm" onClick={() => setPick(true)}>
          <Sigma aria-hidden /> Томьёо
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex min-h-11 items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={voided} onChange={(e) => setVoided(e.target.checked)} className="size-5" />
          Хүчингүй (оноонд тооцохгүй)
        </label>
        <Button disabled={busy} onClick={save}>
          <Save aria-hidden /> Хадгалах
        </Button>
      </div>
      <FormulaPicker
        open={pick}
        title={`${itemName(first, items)} — томьёо`}
        topics={topics}
        initialTopic={topic || null}
        selected={slugs.flatMap((s) => (refs.get(s) ? [refs.get(s)!] : []))}
        onClose={() => setPick(false)}
        onApply={(picked) => {
          setRefs((m) => new Map([...m, ...picked.map((f) => [f.slug, f] as const)]));
          setSlugs(picked.map((f) => f.slug).slice(0, 8));
          setPick(false);
        }}
      />
    </section>
  );
}
