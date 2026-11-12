"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import { api } from "@/lib/api";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import ExamDialog from "@/components/exams/ExamDialog";
import { cn } from "@/lib/cn";
import type { FormulaRef } from "./types";

interface FormulaRow {
  slug: string;
  title: string;
  latex: string | null;
  general: string | null;
  topicSlugs: string[];
}

/**
 * Томьёоны сангаас сонгох (олон сонголт). Сэдвээр шүүнэ — жишээ нь
 * «Модультай тэгшитгэл» сонгоход тухайн сэдвийн томьёонууд л гарна.
 */
export default function FormulaPicker({
  open,
  title,
  topics,
  initialTopic,
  selected,
  onClose,
  onApply,
}: {
  open: boolean;
  title: string;
  topics: { slug: string; name: string }[];
  /** Бодлогын сэдвийн нэр — таарвал шүүлтүүр урьдчилан сонгогдоно */
  initialTopic: string | null;
  selected: FormulaRef[];
  onClose: () => void;
  onApply: (picked: FormulaRef[]) => void;
}) {
  const [topic, setTopic] = useState("");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<FormulaRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<Map<string, FormulaRef>>(new Map());

  // Нээгдэх бүрт: сэдвийн шүүлтүүр, одоогийн сонголтоос эхэлнэ
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setTopic(topics.find((x) => x.name === initialTopic)?.slug ?? "");
      setQ("");
      setPicked(new Map(selected.map((f) => [f.slug, f])));
    }, 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      const query = new URLSearchParams();
      if (topic) query.set("topic", topic);
      if (q.trim()) query.set("q", q.trim());
      api<FormulaRow[]>(`/formulas?${query}`)
        .then((list) => {
          setFailed(false);
          setRows(list);
        })
        .catch(() => {
          setFailed(true);
          setRows([]);
        });
    }, 200);
    return () => window.clearTimeout(t);
  }, [open, topic, q]);

  const toggle = (f: FormulaRow) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(f.slug)) next.delete(f.slug);
      else next.set(f.slug, { slug: f.slug, title: f.title, latex: f.latex ?? f.general });
      return next;
    });

  const field = "min-h-11 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-visible:border-brand-bright";

  return (
    <ExamDialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      wide
      title={title}
      description="Томьёоны сангаас сонгоно. Сурагчид алдсан бодлогын доор эдгээр томьёо харагдана."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Болих
          </Button>
          <Button onClick={() => onApply([...picked.values()])}>
            <Check aria-hidden /> {picked.size} томьёо сонгох
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <label className="w-full sm:w-64">
            <span className="sr-only">Сэдэв</span>
            <select className={cn(field, "w-full")} value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">Бүх сэдэв</option>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="relative min-w-40 flex-1">
            <span className="sr-only">Томьёо хайх</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
            <input className={cn(field, "w-full pl-9")} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Нэрээр хайх" />
          </label>
        </div>

        {rows === null ? (
          <p className="text-sm text-ink-dim">Уншиж байна…</p>
        ) : failed ? (
          <p className="text-sm text-error">Томьёоны санг ачаалж чадсангүй. Дахин оролдоно уу.</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-dim">Тохирох томьёо олдсонгүй.</p>
        ) : (
          <ul className="max-h-[50vh] space-y-1.5 overflow-auto pr-1">
            {rows.map((f) => {
              const on = picked.has(f.slug);
              return (
                <li key={f.slug}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(f)}
                    className={cn(
                      "flex min-h-11 w-full items-start gap-3 rounded-xl border px-3 py-2 text-left transition-colors",
                      on ? "border-brand-bright bg-brand-bright/12" : "border-line hover:border-brand",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md border",
                        on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line",
                      )}
                      aria-hidden
                    >
                      {on && <Check className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{f.title}</span>
                      {(f.latex ?? f.general) && (
                        <span className="block max-w-full overflow-x-auto text-sm text-ink">
                          <MathText>{`$${f.latex ?? f.general}$`}</MathText>
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </ExamDialog>
  );
}
