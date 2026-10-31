"use client";

import { Check, ChevronDown, EyeOff, NotebookPen, Plus, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useSection } from "@/components/students/progress/useSection";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { roadmapUnits, type Roadmap, type TestUnit } from "./types";

const shortDay = (d: string) => d.slice(5).replace("-", ".");
/** API-ийн CUSTOM_TOPIC_MAX-тай ижил */
const TOPIC_MAX = 12;
const sameTopic = (a: string, b: string) => a.toLocaleLowerCase("mn") === b.toLocaleLowerCase("mn");

/**
 * Номын дарааллаар тест сонгох (эзэн 2026-10-18): хамгийн сүүлд хийсний
 * ДАРААХ тестүүд эхэнд санал болно; хийсэн, хассан тест сонголтод гарахгүй;
 * алгассан (үлдсэн) нь өөр өнгөөр. 100V3 дуусвал 200V3 үргэлжилнэ.
 */
export default function TestPicker({
  classroomId,
  date,
  selected,
  onChange,
  keepIds = [],
  customTopics = [],
  onCustomTopicsChange,
  hideChips = false,
}: {
  classroomId: string;
  date: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Хийсэн гэж бүртгэгдсэн ч энэ жагсаалтад сонгогдох ёстой (батлах цонх) */
  keepIds?: string[];
  /**
   * Бодлогын санд байхгүй сэдвүүд (эзэн 2026-10-27, 2026-10-31): бичих зуур доорх
   * жагсаалт тохирох ном/сэдэв/тестээр шүүгдэнэ; тест сонговол холбогдоно, Enter
   * эсвэл «сэдэв болгох» дарвал бичвэр нь ТУСДАА сэдэв болж нэмэгдэнэ. Хэдийг ч,
   * тесттэй зэрэг. Өгөөгүй бол энгийн хайлт.
   */
  customTopics?: string[];
  onCustomTopicsChange?: (list: string[]) => void;
  /** Сонгосон ТЕСТИЙН чипийг нуух (батлах цонх өөрөө жагсаадаг); сэдвийн чип үргэлж харагдана */
  hideChips?: boolean;
}) {
  const { data, status, error, reload } = useSection<Roadmap | null>(
    `/classrooms/${classroomId}/roadmap?date=${date}`,
    null,
  );
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const units = useMemo(() => roadmapUnits(data), [data]);
  const byId = useMemo(() => new Map(units.map((u) => [u.test.testId, u])), [units]);
  const index = useMemo(() => new Map(units.map((u, i) => [u.test.testId, i])), [units]);
  const chosen = new Set(selected);
  const keep = new Set(keepIds);

  const sortIds = (ids: string[]) =>
    [...ids].sort((a, b) => (index.get(a) ?? 1e9) - (index.get(b) ?? 1e9));
  const freeMode = onCustomTopicsChange !== undefined;
  const typed = query.replace(/\s+/g, " ").trim();
  const typedExists = customTopics.some((t) => sameTopic(t, typed));
  const canAddTopic = freeMode && !!typed && !typedExists && customTopics.length < TOPIC_MAX;
  const toggle = (id: string) =>
    onChange(chosen.has(id) ? selected.filter((x) => x !== id) : sortIds([...selected, id]));
  /** Жагсаалтаас сонгох — хайсан бичвэр арилна, бичсэн сэдвүүд хэвээр */
  const pick = (id: string) => {
    const adding = !chosen.has(id);
    toggle(id);
    if (adding && freeMode && query.trim()) setQuery("");
  };
  /** Бичсэн бичвэрийг тусдаа сэдэв болгоно (тест, бусад сэдэв хэвээр) */
  const addTopic = () => {
    // Аль хэдийн нэмсэн сэдэв — дахин нэмэхгүй, талбарыг л цэвэрлэнэ
    if (freeMode && typedExists) setQuery("");
    if (!canAddTopic) return;
    onCustomTopicsChange?.([...customTopics, typed.slice(0, 200)]);
    setQuery("");
  };

  async function setRemoved(u: TestUnit, removed: boolean) {
    setBusy(u.test.testId);
    setActionError(null);
    try {
      await api(`/classrooms/${classroomId}/tests/${u.test.testId}/status`, {
        method: "PUT",
        body: { status: removed ? "REMOVED" : null },
      });
      if (removed && chosen.has(u.test.testId)) onChange(selected.filter((x) => x !== u.test.testId));
      // Санал болгох жагсаалт серверээс дахин тооцогдоно
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(null);
    }
  }

  if (status === "loading" && !data)
    return (
      <div aria-busy className="space-y-2">
        <SkeletonRows rows={4} />
      </div>
    );
  if (status === "error" && !data) return <ErrorState message={error} onRetry={reload} />;

  const visible = (u: TestUnit) =>
    keep.has(u.test.testId) || chosen.has(u.test.testId) || (u.test.status !== "DONE" && u.test.status !== "REMOVED");
  const q = query.trim().toLowerCase();
  const suggestions = (data?.next ?? []).filter((id) => !chosen.has(id)).slice(0, 6);
  const removed = units.filter((u) => u.test.status === "REMOVED");
  const groups: { key: string; book: string; topic: string; units: TestUnit[] }[] = [];
  for (const u of units) {
    if (!visible(u)) continue;
    if (q && !`${u.test.short} ${u.topic} ${u.bookTitle}`.toLowerCase().includes(q)) continue;
    const key = `${u.bookCode}|${u.topic}`;
    const last = groups.at(-1);
    if (last?.key === key) last.units.push(u);
    else groups.push({ key, book: u.bookTitle, topic: u.topic, units: [u] });
  }
  const focusTopic = byId.get(data?.next[0] ?? "")?.topic;

  return (
    <div className="space-y-3">
      {((selected.length > 0 && !hideChips) || customTopics.length > 0) && (
        <ul aria-label="Сонгосон тест, сэдэв" className="flex flex-wrap gap-1.5">
          {!hideChips && selected.map((id) => {
            const u = byId.get(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`${u?.test.short ?? "Тест"} хасах`}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand-bright bg-brand-bright/10 px-3 text-sm font-semibold text-brand-soft"
                >
                  {u?.test.short ?? "Тест"}
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            );
          })}
          {customTopics.map((t) => (
            <li key={`topic-${t}`}>
              <button
                type="button"
                onClick={() => onCustomTopicsChange?.(customTopics.filter((x) => x !== t))}
                aria-label={`${t} сэдвийг хасах`}
                title="Бодлогын санд байхгүй сэдэв"
                className="inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-sm font-semibold text-ink"
              >
                <NotebookPen className="size-3.5 shrink-0 text-ink-dim" aria-hidden />
                <span className="min-w-0 truncate">{t}</span>
                <X className="size-3.5 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && !q && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-ink-dim">
            <Sparkles className="size-3.5" aria-hidden />
            Дараагийн тест
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => pick(id)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-line bg-panel px-3 text-sm font-semibold text-ink hover:border-brand"
              >
                <Plus className="size-4 text-brand-soft" aria-hidden />
                {byId.get(id)?.test.short ?? "Тест"}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="relative block">
        <span className="sr-only">Орох тест</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            addTopic();
          }}
          maxLength={freeMode ? 200 : undefined}
          placeholder={freeMode ? "Тест хайх эсвэл сэдэв бичих" : "Орох тест"}
          autoComplete="off"
          className="min-h-11 w-full rounded-lg border border-line bg-bg pl-9 pr-3 text-sm"
        />
      </label>
      {freeMode && typed && (
        <button
          type="button"
          onClick={addTopic}
          disabled={!canAddTopic}
          className="inline-flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-dashed border-brand bg-brand-bright/5 px-3 text-left text-sm font-semibold text-brand-soft hover:bg-brand-bright/10 disabled:border-line disabled:text-ink-dim"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">
            {typedExists ? `«${typed}» нэмэгдсэн` : customTopics.length >= TOPIC_MAX ? "Сэдэв 12-оос олон болохгүй" : `«${typed}» сэдэв болгож нэмэх`}
          </span>
        </button>
      )}

      {actionError && (
        <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
          {actionError}
        </p>
      )}

      <div className="max-h-72 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-line p-1" data-vaul-no-drag>
        {groups.length === 0 && <p className="px-2 py-3 text-sm text-ink-dim">Тохирох тест алга</p>}
        {groups.map((g) => (
          <details key={g.key} open={!!q || g.topic === focusTopic || g.units.some((u) => chosen.has(u.test.testId))} className="group rounded-lg">
            <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink hover:bg-ink/[0.03]">
              <ChevronDown className="size-4 shrink-0 text-ink-dim transition group-open:rotate-180" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{g.topic}</span>
              <span className="shrink-0 text-xs font-normal text-ink-dim">{g.book}</span>
            </summary>
            <ul className="pb-1 pl-6">
              {g.units.map((u) => {
                const on = chosen.has(u.test.testId);
                const skipped = u.test.status === "SKIPPED";
                return (
                  <li key={u.test.testId} className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(u.test.testId)}
                      className={cn(
                        "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-sm",
                        on ? "bg-brand-bright/10 font-semibold text-brand-soft" : skipped ? "text-warning hover:bg-warning/10" : "text-ink hover:bg-ink/[0.03]",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line",
                        )}
                      >
                        {on && <Check className="size-3" />}
                      </span>
                      <span className="min-w-0 truncate">{u.test.short}</span>
                      {skipped && <span className="shrink-0 text-[11px] font-semibold">Үлдсэн</span>}
                      {u.test.plannedOn && <span className="shrink-0 text-[11px] text-ink-dim">{shortDay(u.test.plannedOn)} төлөвлөсөн</span>}
                      {u.test.status === "DONE" && <span className="shrink-0 text-[11px] text-success">Хийсэн</span>}
                    </button>
                    {u.test.status !== "DONE" && (
                      <button
                        type="button"
                        onClick={() => setRemoved(u, true)}
                        disabled={busy === u.test.testId}
                        aria-label={`${u.test.short} — энэ ангиас хасах`}
                        title="Энэ ангиас хасах"
                        className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                      >
                        <EyeOff className="size-4" aria-hidden />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>

      {removed.length > 0 && (
        <details className="group text-sm">
          <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-xs font-semibold text-ink-dim">
            <ChevronDown className="size-3.5 transition group-open:rotate-180" aria-hidden />
            Хассан тестүүд ({removed.length})
          </summary>
          <ul className="mt-1 space-y-0.5">
            {removed.map((u) => (
              <li key={u.test.testId} className="flex items-center gap-2 pl-5 text-ink-dim">
                <span className="min-w-0 flex-1 truncate">{u.test.short}</span>
                <button
                  type="button"
                  onClick={() => setRemoved(u, false)}
                  disabled={busy === u.test.testId}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand-soft hover:bg-brand-bright/10 disabled:opacity-50"
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Буцаах
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
