"use client";

import { Check, ChevronDown, History, NotebookPen, Plus, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { roadmapUnits, type Roadmap, type TestUnit } from "@/components/schedule/day/types";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";

export interface PickedTest {
  testId: string | null;
  title: string;
}

const shortDay = (d: string) => d.slice(5).replace("-", ".");
const norm = (s: string) => s.toLocaleLowerCase("mn").replace(/\s+/g, " ").trim();
const keyOf = (t: PickedTest) => (t.testId ? `t:${t.testId}` : `x:${norm(t.title)}`);
const TOPIC_MAX = 12;

/**
 * 406-д нөхсөн тест сонгох — өдрийн хуваарийн тест сонголттой ижил ном/сэдвийн
 * дараалал (замын зураг), гэхдээ нөхөлтөд хэрэгтэй нь ангид аль хэдийн ХИЙСЭН тест
 * тул тэдгээр нуугдахгүй, «Ангид хийсэн» гэж хамгийн шинэ нь эхэнд санал болно.
 * Бодлогын санд байхгүй сэдвийг бичээд нэмж болно.
 */
export default function MakeupTestPicker({
  classroomId,
  className,
  date,
  selected,
  onChange,
}: {
  /** Замын зургийн анги (сурагчийн өөрийн анги) */
  classroomId: string | null;
  className: string | null;
  date: string;
  selected: PickedTest[];
  onChange: (list: PickedTest[]) => void;
}) {
  const [data, setData] = useState<{ key: string; map: Roadmap } | null>(null);
  const [error, setError] = useState<{ key: string; msg: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const reqKey = `${classroomId}|${date}|${retry}`;

  useEffect(() => {
    if (!classroomId) return;
    let alive = true;
    api<Roadmap>(`/makeup-visits/roadmap?classroomId=${encodeURIComponent(classroomId)}&date=${date}`)
      .then((map) => alive && setData({ key: reqKey, map }))
      .catch((e) => alive && setError({ key: reqKey, msg: e instanceof Error ? e.message : "Тестүүд ачаалагдсангүй" }));
    return () => {
      alive = false;
    };
  }, [classroomId, date, reqKey]);

  const map = data?.key === reqKey ? data.map : null;
  const units = useMemo(() => roadmapUnits(map), [map]);
  const chosen = new Set(selected.map(keyOf));
  const toggle = (u: TestUnit) => {
    const item = { testId: u.test.testId, title: u.test.short };
    const k = keyOf(item);
    onChange(chosen.has(k) ? selected.filter((x) => keyOf(x) !== k) : [...selected, item]);
  };
  const typed = query.replace(/\s+/g, " ").trim();
  const topics = selected.filter((t) => !t.testId);
  const typedExists = selected.some((t) => !t.testId && norm(t.title) === norm(typed));
  const canAddTopic = !!typed && !typedExists && topics.length < TOPIC_MAX;
  const addTopic = () => {
    if (typedExists) setQuery("");
    if (!canAddTopic) return;
    onChange([...selected, { testId: null, title: typed.slice(0, 200) }]);
    setQuery("");
  };

  // Ангид хийсэн — хамгийн сүүлд хийсэн нь эхэнд (сурагч ихэвчлэн эдгээрийг нөхдөг)
  const recentDone = units
    .filter((u) => u.test.status === "DONE" && u.test.doneOn)
    .sort((a, b) => (b.test.doneOn ?? "").localeCompare(a.test.doneOn ?? ""))
    .slice(0, 8);
  const q = norm(query);
  const groups: { key: string; book: string; topic: string; units: TestUnit[] }[] = [];
  for (const u of units) {
    if (u.test.status === "REMOVED" && !chosen.has(`t:${u.test.testId}`)) continue;
    if (q && !norm(`${u.test.short} ${u.topic} ${u.bookTitle}`).includes(q)) continue;
    const key = `${u.bookCode}|${u.topic}`;
    const last = groups.at(-1);
    if (last?.key === key) last.units.push(u);
    else groups.push({ key, book: u.bookTitle, topic: u.topic, units: [u] });
  }
  const focusTopic = recentDone[0]?.topic;

  const loading = !!classroomId && !map && error?.key !== reqKey;

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <ul aria-label="Сонгосон тест, сэдэв" className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <li key={keyOf(t)}>
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => keyOf(x) !== keyOf(t)))}
                aria-label={`${t.title} хасах`}
                className={cn(
                  "inline-flex min-h-10 max-w-full items-center gap-1.5 rounded-full border px-3 text-sm font-semibold",
                  t.testId ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-line bg-panel text-ink",
                )}
              >
                {!t.testId && <NotebookPen className="size-3.5 shrink-0 text-ink-dim" aria-hidden />}
                <span className="min-w-0 truncate">{t.title}</span>
                <X className="size-3.5 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!q && recentDone.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-ink-dim">
            <History className="size-3.5" aria-hidden />
            {className ? `${className} ангид сүүлд хийсэн` : "Ангид сүүлд хийсэн"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recentDone.map((u) => {
              const on = chosen.has(`t:${u.test.testId}`);
              return (
                <button
                  key={u.test.testId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(u)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold",
                    on ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-line bg-panel text-ink hover:border-brand",
                  )}
                >
                  {on ? <Check className="size-4" aria-hidden /> : <Plus className="size-4 text-brand-soft" aria-hidden />}
                  {u.test.short}
                  <span className="text-[11px] font-normal text-ink-dim">{shortDay(u.test.doneOn!)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <label className="relative block">
        <span className="sr-only">Тест хайх эсвэл сэдэв бичих</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            addTopic();
          }}
          maxLength={200}
          placeholder="Тест хайх эсвэл сэдэв бичих"
          autoComplete="off"
          className="min-h-12 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-base"
        />
      </label>
      {typed && (
        <button
          type="button"
          onClick={addTopic}
          disabled={!canAddTopic}
          className="inline-flex min-h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-dashed border-brand bg-brand-bright/5 px-3 text-left text-sm font-semibold text-brand-soft hover:bg-brand-bright/10 disabled:border-line disabled:text-ink-dim"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">
            {typedExists ? `«${typed}» нэмэгдсэн` : topics.length >= TOPIC_MAX ? "Сэдэв 12-оос олон болохгүй" : `«${typed}» сэдэв болгож нэмэх`}
          </span>
        </button>
      )}

      {!classroomId ? (
        <p className="rounded-lg bg-panel px-3 py-2 text-sm text-ink-dim">Сурагч ангигүй тул тестийн жагсаалт алга, сэдвээ бичиж нэмнэ үү</p>
      ) : error?.key === reqKey && !map ? (
        <ErrorState message={error.msg} onRetry={() => setRetry((r) => r + 1)} />
      ) : loading ? (
        <div aria-busy className="space-y-2">
          <SkeletonRows rows={4} />
        </div>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto overscroll-contain rounded-xl border border-line p-1" data-vaul-no-drag>
          {groups.length === 0 && <p className="px-2 py-3 text-sm text-ink-dim">Тохирох тест алга, бичсэнээ сэдэв болгож нэмж болно</p>}
          {groups.map((g) => (
            <details
              key={g.key}
              open={!!q || g.topic === focusTopic || g.units.some((u) => chosen.has(`t:${u.test.testId}`))}
              className="group rounded-lg"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-2 text-sm font-semibold text-ink hover:bg-ink/[0.03]">
                <ChevronDown className="size-4 shrink-0 text-ink-dim transition group-open:rotate-180" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{g.topic}</span>
                <span className="shrink-0 text-xs font-normal text-ink-dim">{g.book}</span>
              </summary>
              <ul className="pb-1 pl-6">
                {g.units.map((u) => {
                  const on = chosen.has(`t:${u.test.testId}`);
                  return (
                    <li key={u.test.testId}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(u)}
                        className={cn(
                          "flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg px-2 text-left text-sm",
                          on ? "bg-brand-bright/10 font-semibold text-brand-soft" : "text-ink hover:bg-ink/[0.03]",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded border",
                            on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line",
                          )}
                        >
                          {on && <Check className="size-3.5" />}
                        </span>
                        <span className="min-w-0 truncate">{u.test.short}</span>
                        {u.test.status === "DONE" && (
                          <span className="ml-auto shrink-0 text-[11px] text-success">
                            Ангид хийсэн{u.test.doneOn ? ` ${shortDay(u.test.doneOn)}` : ""}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
