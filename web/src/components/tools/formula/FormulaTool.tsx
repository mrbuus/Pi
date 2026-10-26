"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, ListChecks, Play, Presentation, Printer, Search, SearchX, SlidersHorizontal, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import InfoHint from "@/components/ui/InfoHint";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { Panel, Segmented, Toggle } from "../core/ToolFrame";
import { loadState, saveState } from "../core/export";
import { FormulaCard } from "./FormulaCard";
import ProjectorView from "./ProjectorView";
import PrintSheet, { DEFAULT_PRINT, type PrintDetail, type PrintOpts } from "./PrintSheet";
import WidgetPanel, { WIDGET_KEYS } from "./WidgetPanel";
import {
  DEFAULT_FILTER, filterFormulas, inlineMath, moveSlug, parseSheet, resolveBasket, sanitizeFilter, sectionLabel, toggleSlug,
  type FormulaFilter, type FormulaSheet, type SheetFormula,
} from "./formulaSheet.ts";

/* ============================================================================
 * «Томьёо» — нийтийн томьёоны сан (нэвтрэлтгүй).
 * Өгөгдөл: /tools/formulas.json (scripts/build-formula-sheet.cjs үүсгэдэг
 * статик файл) — нэг удаа татаж кэшилнэ. Шүүлт, хайлт formulaSheet.ts-д.
 * ========================================================================== */

let sheetPromise: Promise<FormulaSheet> | null = null;
function loadSheet(): Promise<FormulaSheet> {
  if (!sheetPromise) {
    sheetPromise = fetch("/tools/formulas.json", { cache: "force-cache" })
      .then((r) => {
        if (!r.ok) throw new Error("status");
        return r.json();
      })
      .then((j: unknown) => {
        const s = parseSheet(j);
        if (!s || !s.formulas.length) throw new Error("shape");
        return s;
      })
      .catch((e) => {
        sheetPromise = null;
        throw e;
      });
  }
  return sheetPromise;
}

type View = "list" | "widgets" | "basket";
const PAGE = 24;

const GRADE_OPTIONS = [
  { value: "0", label: "Бүгд" },
  ...[7, 8, 9, 10, 11, 12].map((g) => ({ value: String(g), label: String(g) })),
];

export default function FormulaTool() {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: number; sheet?: FormulaSheet; failed?: boolean } | null>(null);
  useEffect(() => {
    let live = true;
    loadSheet()
      .then((sheet) => live && setResult({ key: retry, sheet }))
      .catch(() => live && setResult({ key: retry, failed: true }));
    return () => {
      live = false;
    };
  }, [retry]);

  if (!result || result.key !== retry) return <SheetSkeleton />;
  if (result.failed || !result.sheet)
    return <ErrorState message="Томьёоны санг ачаалж чадсангүй. Интернэт холболтоо шалгаад дахин оролдоно уу" onRetry={() => setRetry((n) => n + 1)} />;
  return <FormulaBrowser sheet={result.sheet} />;
}

function SheetSkeleton() {
  return (
    <div role="status" aria-label="Томьёог ачаалж байна" className="space-y-4">
      <div className="h-12 rounded-2xl skeleton" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-10 w-28 rounded-xl skeleton" />
        ))}
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-44 rounded-2xl skeleton" />
        ))}
      </div>
      <span className="sr-only">Томьёог ачаалж байна</span>
    </div>
  );
}

function FormulaBrowser({ sheet }: { sheet: FormulaSheet }) {
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  const sectionSlugs = useMemo(() => sheet.sections.map((s) => s.slug), [sheet]);
  const [view, setView] = useState<View>(() => {
    const v = loadState<string>("formula-view", "list");
    return v === "widgets" || v === "basket" ? v : "list";
  });
  const [filter, setFilter] = useState<FormulaFilter>(() => sanitizeFilter(loadState<Partial<FormulaFilter>>("formula-filter", DEFAULT_FILTER), sectionSlugs));
  const [basket, setBasket] = useState<string[]>(() => loadState<string[]>("formula-basket", []).filter((s) => typeof s === "string"));
  const [printOpts, setPrintOpts] = useState<PrintOpts>(() => ({ ...DEFAULT_PRINT, ...loadState<Partial<PrintOpts>>("formula-print", DEFAULT_PRINT) }));
  const [widget, setWidget] = useState<string>(() => loadState<string>("formula-widget", WIDGET_KEYS[0] ?? ""));
  const [projector, setProjector] = useState<{ list: SheetFormula[]; index: number } | null>(null);
  const [printing, setPrinting] = useState<SheetFormula[] | null>(null);
  const [shown, setShown] = useState({ sig: "", n: PAGE });
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveState("formula-filter", filter), [filter]);
  useEffect(() => saveState("formula-basket", basket), [basket]);
  useEffect(() => saveState("formula-print", printOpts), [printOpts]);
  useEffect(() => saveState("formula-view", view), [view]);
  useEffect(() => saveState("formula-widget", widget), [widget]);

  const query = useDeferredValue(filter.query);
  const { items, counts } = useMemo(() => filterFormulas(sheet, { ...filter, query }), [sheet, filter, query]);
  const sig = `${filter.section}|${filter.grade}|${filter.gradeMode}|${filter.level}|${query}`;
  const limit = shown.sig === sig ? shown.n : PAGE;
  const basketItems = useMemo(() => resolveBasket(sheet, basket), [sheet, basket]);
  const basketSet = useMemo(() => new Set(basket), [basket]);
  const secName = useMemo(() => new Map(sheet.sections.map((s) => [s.slug, sectionLabel(s)])), [sheet]);
  const bySlug = useMemo(() => new Map(sheet.formulas.map((f) => [f.slug, f])), [sheet]);

  const set = <K extends keyof FormulaFilter>(k: K, v: FormulaFilter[K]) => setFilter((f) => ({ ...f, [k]: v }));
  const toggleBasket = useCallback((slug: string) => setBasket((b) => toggleSlug(b, slug)), []);
  const projectSlug = useCallback(
    (slug: string) => {
      const idx = items.findIndex((f) => f.slug === slug);
      if (idx >= 0) setProjector({ list: items, index: idx });
      else {
        const f = bySlug.get(slug);
        if (f) setProjector({ list: [f], index: 0 });
      }
    },
    [items, bySlug],
  );
  const openWidget = useCallback((w: string) => {
    setWidget(w);
    setView("widgets");
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);
  const endPrint = useCallback(() => setPrinting(null), []);

  const startPrint = (list: SheetFormula[]) => {
    if (!list.length) return;
    if (list.length > 150) toast.message(`${list.length} томьёо хэвлэгдэнэ, хэдэн хуудас болно`);
    setPrinting(list);
  };

  const clearBasket = () => {
    const prev = basket;
    setBasket([]);
    toast("Миний хуудас цэвэрлэгдлээ", { action: { label: "Буцаах", onClick: () => setBasket(prev) } });
  };

  const filtered = filter.grade !== 0 || filter.level !== "all" || filter.section !== "all" || filter.query.trim() !== "";

  return (
    <div ref={topRef} className="min-w-0 scroll-mt-24 space-y-4">
      <div className="flex items-center gap-2">
        <Segmented<View>
          className="flex-nowrap"
          label="Харах хэсэг"
          value={view}
          onChange={setView}
          options={[
            { value: "list", label: <span className="inline-flex items-center gap-1.5"><BookOpen className="h-4 w-4" aria-hidden />Томьёо</span> },
            { value: "widgets", label: <span className="inline-flex items-center gap-1.5"><Play className="h-4 w-4" aria-hidden />Хөдөлгөөнт</span> },
            {
              value: "basket",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4" aria-hidden />
                  <span className="sm:hidden">Хуудас</span>
                  <span className="hidden sm:inline">Миний хуудас</span>
                  {basket.length > 0 && <span className="rounded-full bg-surface/25 px-1.5 text-xs tabular-nums">{basketItems.length}</span>}
                </span>
              ),
            },
          ]}
        />
        <InfoHint label="Томьёоны тухай">
          {sheet.formulas.length} томьёо {sheet.sections.length} бүлгээр. Картын «Хуудсанд» товчоор сонгоод «Миний хуудас» хэсгээс хэвлэнэ. «Томруулах» нь проектороор харуулахад
        </InfoHint>
      </div>

      {view === "list" && (
        <>
          <div className="space-y-3 rounded-2xl border border-line bg-surface p-3 sm:p-4">
            <label className="relative block">
              <span className="sr-only">Томьёо хайх</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim" aria-hidden />
              <input
                type="search"
                value={filter.query}
                onChange={(e) => set("query", e.target.value)}
                placeholder="Нэр, үг эсвэл \sin^2, a^2+b^2"
                className="h-12 w-full rounded-xl border border-line bg-bg pl-10 pr-12 text-base text-ink placeholder:text-ink-dim"
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
              />
              {filter.query && (
                <button
                  type="button"
                  onClick={() => set("query", "")}
                  className="absolute right-1 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink-dim hover:text-ink"
                  aria-label="Хайлтыг арилгах"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </label>

            <div role="group" aria-label="Бүлэг" className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
              {[{ slug: "all", label: "Бүгд" }, ...sheet.sections.map((s) => ({ slug: s.slug, label: sectionLabel(s) }))].map((s) => {
                const on = filter.section === s.slug;
                const n = counts[s.slug] ?? 0;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set("section", s.slug)}
                    title={s.slug === "all" ? undefined : sheet.sections.find((x) => x.slug === s.slug)?.title}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-sm font-medium transition-colors duration-[var(--dur-micro)] cyrillic-tight",
                      on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
                      !on && n === 0 && "opacity-60",
                    )}
                  >
                    {s.label}
                    <span className={cn("text-xs tabular-nums", on ? "text-on-brand" : "text-ink-dim")}>{n}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              aria-expanded={showFilters}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-1 text-sm font-medium text-ink-dim hover:text-ink sm:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Анги, түвшин
              {(filter.grade !== 0 || filter.level !== "all") && <span className="rounded-full bg-brand-bright px-1.5 text-xs text-on-brand">{(filter.grade !== 0 ? 1 : 0) + (filter.level !== "all" ? 1 : 0)}</span>}
            </button>
            <div className={cn("flex-wrap items-center gap-x-4 gap-y-2 sm:flex", showFilters ? "flex" : "hidden")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-dim">Анги</span>
                <Segmented
                  label="Анги"
                  value={String(filter.grade)}
                  onChange={(v) => set("grade", Number(v))}
                  options={GRADE_OPTIONS}
                />
                {filter.grade !== 0 && (
                  <Toggle on={filter.gradeMode === "upto"} onChange={(on) => set("gradeMode", on ? "upto" : "only")}>
                    {filter.grade}-р анги хүртэл
                  </Toggle>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-dim">Түвшин</span>
                <Segmented
                  label="Түвшин"
                  value={filter.level}
                  onChange={(v) => set("level", v)}
                  options={[
                    { value: "all", label: "Бүгд" },
                    { value: "CORE", label: "Үндсэн" },
                    { value: "EXTRA", label: "Нэмэлт" },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <p className="flex-1 text-sm text-ink-dim" aria-live="polite">
              <span className="font-semibold text-ink tabular-nums">{items.length}</span> томьёо
            </p>
            {items.length > 0 && (
              <>
                <Button variant="ghost" size="sm" className="min-h-11" onClick={() => setProjector({ list: items, index: 0 })} aria-label="Слайдаар харуулах">
                  <Presentation aria-hidden />
                  <span className="hidden sm:inline">Слайдаар</span>
                </Button>
                <Button variant="ghost" size="sm" className="min-h-11" onClick={() => startPrint(items)} aria-label="Жагсаалтыг хэвлэх">
                  <Printer aria-hidden />
                  <span className="hidden sm:inline">Жагсаалтыг хэвлэх</span>
                </Button>
              </>
            )}
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Тохирох томьёо олдсонгүй"
              hint="Өөр үгээр хайх эсвэл шүүлтээ цэвэрлэнэ үү"
              action={
                filtered ? (
                  <Button variant="outline" size="sm" className="min-h-11" onClick={() => setFilter(DEFAULT_FILTER)}>
                    Шүүлт цэвэрлэх
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="grid min-w-0 gap-3 xl:grid-cols-2">
                {items.slice(0, limit).map((f) => (
                  <FormulaCard
                    key={f.slug}
                    f={f}
                    sectionName={filter.section === "all" ? secName.get(f.section) : undefined}
                    inBasket={basketSet.has(f.slug)}
                    onToggleBasket={toggleBasket}
                    onProject={projectSlug}
                    onWidget={openWidget}
                    loggedIn={!!user}
                  />
                ))}
              </div>
              {items.length > limit && (
                <div className="flex justify-center">
                  <Button variant="outline" onClick={() => setShown({ sig, n: limit + PAGE * 2 })}>
                    Цааш харах ({items.length - limit})
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === "widgets" && (
        <WidgetPanel selected={widget} onSelect={setWidget} formulas={sheet.formulas} onProject={(list, index) => setProjector({ list, index })} />
      )}

      {view === "basket" && (
        <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-4 lg:order-2">
            {basketItems.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="Миний хуудас хоосон байна"
                hint="Томьёоны карт дээрх «Хуудсанд» товчоор нэмээд энд хэвлэнэ"
                action={
                  <Button variant="outline" size="sm" className="min-h-11" onClick={() => setView("list")}>
                    Томьёо сонгох
                  </Button>
                }
              />
            ) : (
              <ol className="divide-y divide-line rounded-2xl border border-line bg-surface">
                {basketItems.map((f, i) => (
                  <li key={f.slug} className="flex min-w-0 items-center gap-2 px-3 py-2">
                    <span className="w-6 shrink-0 text-right text-sm tabular-nums text-ink-dim">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{f.title}</p>
                      <div className="overflow-x-auto text-ink-dim">
                        <MathText>{inlineMath(f.latex)}</MathText>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <IconBtn label="Дээш" disabled={i === 0} onClick={() => setBasket((b) => moveSlug(b, f.slug, -1))}>
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </IconBtn>
                      <IconBtn label="Доош" disabled={i === basketItems.length - 1} onClick={() => setBasket((b) => moveSlug(b, f.slug, 1))}>
                        <ArrowDown className="h-4 w-4" aria-hidden />
                      </IconBtn>
                      <IconBtn label="Хасах" onClick={() => toggleBasket(f.slug)}>
                        <X className="h-4 w-4" aria-hidden />
                      </IconBtn>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <div className="space-y-4 lg:order-1">
            <Panel title="Хэвлэх тохиргоо">
              <div className="space-y-3">
                <label className="block">
                  <span className="text-sm text-ink-dim">Хуудасны гарчиг</span>
                  <input
                    value={printOpts.title}
                    maxLength={80}
                    onChange={(e) => setPrintOpts((o) => ({ ...o, title: e.target.value }))}
                    className="mt-1 h-11 w-full rounded-xl border border-line bg-bg px-3 text-sm text-ink"
                  />
                </label>
                <div>
                  <span className="mb-1 block text-sm text-ink-dim">Агуулга</span>
                  <Segmented<PrintDetail>
                    label="Агуулга"
                    value={printOpts.detail}
                    onChange={(detail) => setPrintOpts((o) => ({ ...o, detail }))}
                    options={[
                      { value: "formula", label: "Томьёо" },
                      { value: "conditions", label: "Нөхцөлтэй" },
                      { value: "full", label: "Тайлбартай" },
                    ]}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-sm text-ink-dim">Багана</span>
                  <Segmented
                    label="Багана"
                    value={String(printOpts.columns)}
                    onChange={(v) => setPrintOpts((o) => ({ ...o, columns: v === "1" ? 1 : 2 }))}
                    options={[
                      { value: "1", label: "1 багана" },
                      { value: "2", label: "2 багана" },
                    ]}
                  />
                </div>
                <Toggle on={printOpts.nameLine} onChange={(nameLine) => setPrintOpts((o) => ({ ...o, nameLine }))}>
                  Нэр, анги, огнооны мөр
                </Toggle>
              </div>
            </Panel>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => startPrint(basketItems)} disabled={!basketItems.length}>
                <Printer aria-hidden />
                Хэвлэх
              </Button>
              <Button variant="outline" onClick={() => setProjector({ list: basketItems, index: 0 })} disabled={!basketItems.length}>
                <Presentation aria-hidden />
                Слайдаар
              </Button>
              <Button variant="danger" onClick={clearBasket} disabled={!basket.length}>
                <Trash2 aria-hidden />
                Цэвэрлэх
              </Button>
            </div>
          </div>
        </div>
      )}

      {projector && projector.list.length > 0 && (
        <ProjectorView list={projector.list} start={projector.index} onClose={() => setProjector(null)} />
      )}
      {printing && <PrintSheet formulas={printing} opts={printOpts} onDone={endPrint} />}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line text-ink-dim hover:text-ink disabled:opacity-40"
    >
      {children}
    </button>
  );
}
