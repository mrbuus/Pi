"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste, Save, Sigma, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Card } from "@/components/ui/Surface";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import FormulaPicker from "./FormulaPicker";
import { ANSWER_LETTERS, CONTENT_AREAS, type FormulaRef, type PaperItem } from "./types";

const field = "min-h-11 rounded-lg border border-line bg-surface px-2 text-sm text-ink focus-visible:border-brand-bright";

/** «1-12, 15, 20-22» → [1..12, 15, 20, 21, 22] (шалгалтын хүрээнд) */
export function parseRange(text: string, max: number): number[] {
  const out = new Set<number>();
  for (const part of text.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    for (let n = Math.min(a, b); n <= Math.max(a, b); n++) if (n >= 1 && n <= max) out.add(n);
  }
  return [...out].sort((x, y) => x - y);
}

type PickTarget = { kind: "row"; number: number } | { kind: "bulk"; numbers: number[] };

/**
 * Түлхүүр, оноо, ангилал (Багш+/Админ). Бодлого бүрт:
 *   сэдэв (жиш: «Модультай тэгшитгэл»), ашиглах томьёо, агуулга (БҮТ-ийн 5 ангилал).
 * Бөөнөөр: «1-12» гэж бичээд сэдэв / агуулга / томьёог нэг дор онооно.
 * Түлхүүрийг нэг мөрөөр буулгаж болно: «ABCDA EDCBA…».
 */
export default function KeyEditor({
  examId,
  items,
  formulas,
  topics,
  onSaved,
}: {
  examId: string;
  items: PaperItem[];
  formulas: FormulaRef[];
  topics: { slug: string; name: string }[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<PaperItem[]>(() => items.map((i) => ({ ...i, formulaSlugs: [...i.formulaSlugs] })));
  const [refs, setRefs] = useState<Map<string, FormulaRef>>(() => new Map(formulas.map((f) => [f.slug, f])));
  const [range, setRange] = useState("");
  const [area, setArea] = useState<string>(CONTENT_AREAS[1]);
  const [topic, setTopic] = useState("");
  const [keyText, setKeyText] = useState("");
  const [pick, setPick] = useState<PickTarget | null>(null);
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(() => draft.some((d, i) => JSON.stringify(d) !== JSON.stringify(items[i])), [draft, items]);
  const set = (n: number, patch: Partial<PaperItem>) =>
    setDraft((prev) => prev.map((d) => (d.number === n ? { ...d, ...patch } : d)));

  function rangeNumbers(): Set<number> | null {
    const nums = new Set(parseRange(range, items.length));
    if (nums.size === 0) {
      toast.error("Бодлогын дугаарыг «1-12, 15» хэлбэрээр бичнэ үү");
      return null;
    }
    return nums;
  }
  function applyBulk(patch: Partial<PaperItem>) {
    const nums = rangeNumbers();
    if (!nums) return;
    setDraft((prev) => prev.map((d) => (nums.has(d.number) ? { ...d, ...patch } : d)));
  }

  function applyKeys() {
    // Үсгүүдийг дарааллаар; «-», «.» = түлхүүргүй үлдээх
    const letters = keyText.toUpperCase().replace(/[^A-E.\-]/g, "").split("");
    if (letters.length === 0) return;
    setDraft((prev) =>
      prev.map((d, i) => (i < letters.length ? { ...d, answerKey: /[A-E]/.test(letters[i]) ? letters[i] : null } : d)),
    );
    toast.success(`${Math.min(letters.length, items.length)} бодлогын түлхүүр буулгав — «Хадгалах»-ыг дарна уу`);
  }

  function applyFormulas(picked: FormulaRef[]) {
    if (!pick) return;
    setRefs((prev) => {
      const next = new Map(prev);
      for (const f of picked) next.set(f.slug, f);
      return next;
    });
    const slugs = picked.map((f) => f.slug).slice(0, 8);
    if (pick.kind === "row") set(pick.number, { formulaSlugs: slugs });
    else {
      // Бөөнөөр: байгаа томьёон дээр НЭМНЭ (бодлого бүрийн өөрийнх нь устахгүй)
      const nums = new Set(pick.numbers);
      setDraft((prev) =>
        prev.map((d) => (nums.has(d.number) ? { ...d, formulaSlugs: [...new Set([...d.formulaSlugs, ...slugs])].slice(0, 8) } : d)),
      );
    }
    setPick(null);
  }

  async function save() {
    setBusy(true);
    try {
      await api(`/paper-exams/${encodeURIComponent(examId)}/items`, {
        method: "PUT",
        body: {
          items: draft.map((d) => ({
            number: d.number,
            answerKey: d.answerKey,
            points: d.points,
            area: d.area,
            topic: d.topic?.trim() || null,
            formulaSlugs: d.formulaSlugs,
            voided: d.voided,
          })),
        },
      });
      toast.success("Хадгаллаа — оноо дахин бодогдлоо");
      onSaved();
    } catch (e) {
      toast.error(errorText(e, "Хадгалж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  const live = draft.filter((d) => !d.voided);
  const noTopic = live.filter((d) => !d.topic?.trim()).length;
  const noFormula = live.filter((d) => d.formulaSlugs.length === 0).length;
  const pickRow = pick?.kind === "row" ? draft.find((d) => d.number === pick.number) : null;

  return (
    <div className="space-y-4">
      <datalist id="paper-topics">
        {topics.map((t) => (
          <option key={t.slug} value={t.name} />
        ))}
      </datalist>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="tight">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-soft">
            <Tags className="size-4" aria-hidden /> Бөөнөөр оноох
          </h3>
          <label className="block text-xs font-semibold text-ink-dim">
            Аль бодлогууд
            <input className={cn(field, "mt-1 block w-full")} value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-12, 15" />
          </label>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
            <label className="text-xs font-semibold text-ink-dim">
              Сэдэв
              <input
                className={cn(field, "mt-1 block w-full")}
                list="paper-topics"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Модультай тэгшитгэл"
                maxLength={60}
              />
            </label>
            <Button variant="secondary" aria-label="Сэдэв оноох" onClick={() => applyBulk({ topic: topic.trim() || null })}>
              Оноох
            </Button>
            <label className="text-xs font-semibold text-ink-dim">
              Агуулга (БҮТ)
              <select className={cn(field, "mt-1 block w-full")} value={area} onChange={(e) => setArea(e.target.value)}>
                {CONTENT_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <Button variant="secondary" aria-label="Агуулга оноох" onClick={() => applyBulk({ area })}>
              Оноох
            </Button>
          </div>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => {
              const nums = rangeNumbers();
              if (nums) setPick({ kind: "bulk", numbers: [...nums] });
            }}
          >
            <Sigma aria-hidden /> Эдгээр бодлогод томьёо нэмэх
          </Button>
        </Card>
        <Card padding="tight">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-soft">
            <ClipboardPaste className="size-4" aria-hidden /> Түлхүүрийг нэг мөрөөр
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 text-xs font-semibold text-ink-dim">
              1-р бодлогоос эхлэн үсгүүд
              <input
                className={cn(field, "mt-1 block w-full font-mono uppercase")}
                value={keyText}
                onChange={(e) => setKeyText(e.target.value)}
                placeholder="ABCDA EDCBA ..."
              />
            </label>
            <Button variant="secondary" onClick={applyKeys}>
              Буулгах
            </Button>
          </div>
          <p className="mt-3 text-xs text-ink-dim">
            Дүн 1 / хоосон хэлбэрээр орсон бол түлхүүр шаардлагагүй. Машины үсэгтэй гаралтад түлхүүрээр оноо бодогдоно.
          </p>
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full min-w-[56rem] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-panel text-left text-xs text-ink-dim">
              <tr>
                <th className="px-3 py-2 font-bold">№</th>
                <th className="px-2 py-2 font-bold">Зөв хариу</th>
                <th className="px-2 py-2 font-bold">Оноо</th>
                <th className="px-2 py-2 font-bold">Сэдэв</th>
                <th className="px-2 py-2 font-bold">Ашиглах томьёо</th>
                <th className="px-2 py-2 font-bold">Агуулга (БҮТ)</th>
                <th className="px-2 py-2 font-bold">Хүчингүй</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((d) => (
                <tr key={d.number} className={cn("align-top", d.voided && "opacity-60")}>
                  <td className="border-t border-line px-3 py-3 font-bold tabular-nums text-ink">{d.number}</td>
                  <td className="border-t border-line px-2 py-1">
                    <select
                      aria-label={`${d.number}-р бодлогын зөв хариу`}
                      className={field}
                      value={d.answerKey ?? ""}
                      onChange={(e) => set(d.number, { answerKey: e.target.value || null })}
                    >
                      <option value="">—</option>
                      {ANSWER_LETTERS.map((l) => (
                        <option key={l}>{l}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-t border-line px-2 py-1">
                    <input
                      aria-label={`${d.number}-р бодлогын оноо`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={20}
                      className={cn(field, "w-16")}
                      value={d.points}
                      onChange={(e) => set(d.number, { points: Math.max(0, Math.min(20, Math.round(Number(e.target.value) || 0))) })}
                    />
                  </td>
                  <td className="border-t border-line px-2 py-1">
                    <input
                      aria-label={`${d.number}-р бодлогын сэдэв`}
                      className={cn(field, "w-52")}
                      list="paper-topics"
                      maxLength={60}
                      value={d.topic ?? ""}
                      onChange={(e) => set(d.number, { topic: e.target.value || null })}
                    />
                  </td>
                  <td className="border-t border-line px-2 py-1">
                    <div className="flex min-h-11 flex-wrap items-center gap-1.5">
                      {d.formulaSlugs.map((slug) => (
                        <span
                          key={slug}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-bright/12 py-0.5 pl-2.5 pr-1 text-xs font-semibold text-brand-soft"
                        >
                          {refs.get(slug)?.title ?? slug}
                          <button
                            type="button"
                            aria-label={`${refs.get(slug)?.title ?? slug} — хасах`}
                            className="inline-flex size-6 items-center justify-center rounded-full hover:bg-brand-bright/20"
                            onClick={() => set(d.number, { formulaSlugs: d.formulaSlugs.filter((s) => s !== slug) })}
                          >
                            <X className="size-3.5" aria-hidden />
                          </button>
                        </span>
                      ))}
                      <Button
                        variant="ghost"
                        aria-label={`${d.number}-р бодлогын томьёо сонгох`}
                        onClick={() => setPick({ kind: "row", number: d.number })}
                      >
                        <Sigma aria-hidden /> {d.formulaSlugs.length ? "Засах" : "Томьёо"}
                      </Button>
                    </div>
                  </td>
                  <td className="border-t border-line px-2 py-1">
                    <select
                      aria-label={`${d.number}-р бодлогын агуулга`}
                      className={cn(field, "w-48")}
                      value={d.area ?? ""}
                      onChange={(e) => set(d.number, { area: e.target.value || null })}
                    >
                      <option value="">Оноогоогүй</option>
                      {CONTENT_AREAS.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-t border-line px-2 py-3">
                    <input
                      aria-label={`${d.number}-р бодлогыг хүчингүй болгох`}
                      type="checkbox"
                      className="size-5 accent-[var(--brand-bright)]"
                      checked={d.voided}
                      onChange={(e) => set(d.number, { voided: e.target.checked })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-surface/95 p-3 elev-2">
        <span className="mr-auto text-sm text-ink-dim">
          {noTopic === 0 && noFormula === 0
            ? "Бүх бодлого сэдэв, томьёотой"
            : [noTopic ? `${noTopic} бодлого сэдэвгүй` : null, noFormula ? `${noFormula} бодлого томьёогүй` : null].filter(Boolean).join(", ")}
        </span>
        <Button variant="ghost" disabled={!dirty || busy} onClick={() => setDraft(items.map((i) => ({ ...i, formulaSlugs: [...i.formulaSlugs] })))}>
          Буцаах
        </Button>
        <Button disabled={!dirty || busy} onClick={save}>
          <Save aria-hidden /> Хадгалах
        </Button>
      </div>

      <FormulaPicker
        open={!!pick}
        title={pick?.kind === "row" ? `${pick.number}-р бодлогын томьёо` : pick ? `${pick.numbers.length} бодлогод томьёо нэмэх` : ""}
        topics={topics}
        initialTopic={pickRow?.topic ?? (pick?.kind === "bulk" ? topic.trim() || null : null)}
        selected={pickRow ? pickRow.formulaSlugs.map((s) => refs.get(s) ?? { slug: s, title: s, latex: null }) : []}
        onClose={() => setPick(null)}
        onApply={applyFormulas}
      />
    </div>
  );
}
