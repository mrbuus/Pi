"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste, Save, Tags } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { Card } from "@/components/ui/Surface";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import { ANSWER_LETTERS, CONTENT_AREAS, type PaperItem } from "./types";

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

/**
 * Түлхүүр, оноо, агуулга (Багш+/Админ). Агуулгыг бөөнөөр: «1-12» → Алгебр.
 * Түлхүүрийг нэг мөрөөр буулгаж болно: «ABCDA EDCBA…» (машины key-ээс).
 */
export default function KeyEditor({ examId, items, onSaved }: { examId: string; items: PaperItem[]; onSaved: () => void }) {
  const [draft, setDraft] = useState<PaperItem[]>(() => items.map((i) => ({ ...i })));
  const [range, setRange] = useState("");
  const [area, setArea] = useState<string>(CONTENT_AREAS[0]);
  const [keyText, setKeyText] = useState("");
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(
    () => draft.some((d, i) => JSON.stringify(d) !== JSON.stringify(items[i])),
    [draft, items],
  );
  const set = (n: number, patch: Partial<PaperItem>) =>
    setDraft((prev) => prev.map((d) => (d.number === n ? { ...d, ...patch } : d)));

  function applyArea(value: string | null) {
    const nums = new Set(parseRange(range, items.length));
    if (nums.size === 0) {
      toast.error("Бодлогын дугаарыг «1-12, 15» хэлбэрээр бичнэ үү");
      return;
    }
    setDraft((prev) => prev.map((d) => (nums.has(d.number) ? { ...d, area: value } : d)));
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

  async function save() {
    setBusy(true);
    try {
      await api(`/paper-exams/${encodeURIComponent(examId)}/items`, {
        method: "PUT",
        body: { items: draft.map(({ number, answerKey, points, area, voided }) => ({ number, answerKey, points, area, voided })) },
      });
      toast.success("Хадгаллаа — оноо дахин бодогдлоо");
      onSaved();
    } catch (e) {
      toast.error(errorText(e, "Хадгалж чадсангүй"));
    } finally {
      setBusy(false);
    }
  }

  const missingArea = draft.filter((d) => !d.area && !d.voided).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card padding="tight">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-brand-soft">
            <Tags className="size-4" aria-hidden /> Агуулга бөөнөөр оноох
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="w-28 shrink-0 text-xs font-semibold text-ink-dim">
              Бодлого
              <input className={cn(field, "mt-1 block w-full")} value={range} onChange={(e) => setRange(e.target.value)} placeholder="1-12, 15" />
            </label>
            <label className="min-w-40 flex-1 text-xs font-semibold text-ink-dim">
              Агуулга
              <select className={cn(field, "mt-1 block w-full")} value={area} onChange={(e) => setArea(e.target.value)}>
                {CONTENT_AREAS.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
            <Button variant="secondary" onClick={() => applyArea(area)}>
              Оноох
            </Button>
            <Button variant="ghost" onClick={() => applyArea(null)}>
              Арилгах
            </Button>
          </div>
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
        </Card>
      </div>

      <Card padding="none" className="overflow-hidden">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-panel text-left text-xs text-ink-dim">
              <tr>
                <th className="px-3 py-2 font-bold">№</th>
                <th className="px-2 py-2 font-bold">Зөв хариу</th>
                <th className="px-2 py-2 font-bold">Оноо</th>
                <th className="px-2 py-2 font-bold">Агуулга</th>
                <th className="px-2 py-2 font-bold">Хүчингүй</th>
              </tr>
            </thead>
            <tbody>
              {draft.map((d) => (
                <tr key={d.number} className={cn(d.voided && "opacity-60")}>
                  <td className="border-t border-line px-3 py-1 font-bold tabular-nums text-ink">{d.number}</td>
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
                    <select
                      aria-label={`${d.number}-р бодлогын агуулга`}
                      className={cn(field, "w-full max-w-60")}
                      value={d.area ?? ""}
                      onChange={(e) => set(d.number, { area: e.target.value || null })}
                    >
                      <option value="">Оноогоогүй</option>
                      {CONTENT_AREAS.map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </td>
                  <td className="border-t border-line px-2 py-1">
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
          {missingArea > 0 ? `${missingArea} бодлогод агуулга оноогоогүй` : "Бүх бодлого агуулгатай"}
        </span>
        <Button variant="ghost" disabled={!dirty || busy} onClick={() => setDraft(items.map((i) => ({ ...i })))}>
          Буцаах
        </Button>
        <Button disabled={!dirty || busy} onClick={save}>
          <Save aria-hidden /> Хадгалах
        </Button>
      </div>
    </div>
  );
}
