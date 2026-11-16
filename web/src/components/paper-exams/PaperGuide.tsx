"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, Lightbulb, ListChecks, LockOpen, Sigma } from "lucide-react";
import MathText from "@/components/MathText";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Card } from "@/components/ui/Surface";
import { ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import MistakeNotes, { type MistakeNoteItem } from "@/components/exam/MistakeNotes";
import { cn } from "@/lib/cn";
import { STATUS_LABEL, TONE_CELL, toneOf, type GuideContent, type GuideEntry, type GuideMark, type MyAnswer, type MyPaperDetail, type MyPaperGuide } from "./types";

type MyItem = MyPaperDetail["me"]["items"][number];
/** Нэг бодлогын нээсэн шат: stage = нээсэн санамж (0–3), step = нээсэн бодолтын алхам */
interface Progress {
  stage: number;
  step: number;
  tries: number;
  wrong: string[];
  fixed: boolean;
  retry?: Record<string, string>;
}
/** «II.2» → «2-2» (эзэн 2026-11-15: 2-р хэсэг 2-1…2-4) */
export const shownLabel = (label: string) => label.replace(/^II\.(\d+)$/, "2-$1");
const EMPTY: Progress = { stage: 0, step: 0, tries: 0, wrong: [], fixed: false };
const LETTERS = ["A", "B", "C", "D", "E"];
const HINTS = ["Ашиглагдах чанар", "Энгийнээр хэлбэл", "100x100 номын төстэй бодлого"];

/** «Түгээмэл алдаа»: буруу сонголт бүрийн тайлбар (үсэг + утга) — сурагчийн сонгосон нь эхэнд */
export function guideMistakeNotes(c: GuideContent, mine: string | null | undefined): MistakeNoteItem[] {
  if (c.kind !== "choice" || !c.mistakes) return [];
  const out: MistakeNoteItem[] = [];
  LETTERS.forEach((letter, i) => {
    const note = c.mistakes?.[letter]?.trim();
    const choice = c.choices?.[i];
    if (note && choice !== undefined && letter !== c.answer) {
      out.push({ label: letter, text: `$${choice}$`, note, mine: letter === mine });
    }
  });
  return out.sort((a, b) => Number(b.mine) - Number(a.mine));
}

/** Хөтөчийн санах ой — зөвхөн тав тухын төлөө (аль санамжийг нээснээ санах); байхгүй ч ажиллана. */
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStore(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хувийн горим г.м. — хадгалахгүй */
  }
}

/**
 * Урт томьёог «⇒»-оор хуваана: «A ⇒ B ⇒ C» → [«A», «⇒ B», «⇒ C»]. Утсанд нэг мөрөнд
 * багтахгүй томьёо гүйлгэх биш, мөр мөрөөрөө доош буухын тулд (эзэн 2026-11-15).
 */
function splitMath(tex: string): string[] {
  const body = tex.replace(/^\$\$|\$\$$/g, "");
  const parts = body.split(/\\quad\s*\\Rightarrow\s*\\quad/);
  if (parts.length < 2) return [tex];
  return parts.map((p, i) => `$$${i ? "\\Rightarrow\\ " : ""}${p.trim()}$$`);
}

/** Мөрүүд: `$$…$$` бол тусдаа мөрийн томьёо (урт бол хуваана), «Жишээ:» өнгөт картаар, бусад нь өгүүлбэр. */
export function Lines({ lines, mathClass }: { lines: string[]; mathClass?: string }) {
  return (
    <>
      {lines.map((line, i) =>
        line.startsWith("$$") ? (
          <div key={i} className={cn("py-1 text-center", mathClass)}>
            {splitMath(line).map((part, j) => (
              <div key={j} className="overflow-x-auto overflow-y-hidden">
                <MathText>{part}</MathText>
              </div>
            ))}
          </div>
        ) : /^Жишээ[:：]/.test(line) ? (
          <div key={i} className="my-2 rounded-xl border-l-4 border-l-brand-bright bg-brand-bright/10 px-3 py-2">
            <span className="mb-0.5 block text-xs font-bold tracking-wide text-brand-soft">ЖИШЭЭ</span>
            <MathText>{line.replace(/^Жишээ[:：]\s*/, "")}</MathText>
          </div>
        ) : (
          <p key={i} className="my-1.5">
            <MathText>{line}</MathText>
          </p>
        ),
      )}
    </>
  );
}

/**
 * Хариултын байрлал (эзэн: хугарахгүй, мөрөө тэгш дүүргэнэ): богино бол 5 нэг мөрөнд,
 * дунд бол 3+2, урт бол мөр бүрт нэг. Томьёо нүдэн дотроо хэзээ ч хугарахгүй.
 */
export function choiceLayout(choices: string[]): "row" | "split" | "stack" {
  const visible = (c: string) =>
    c.replace(/\\(dfrac|frac|cdot|left|right|lbrack|rbrack|infty)/g, "x").replace(/\\text\{([^}]*)\}/g, "$1").replace(/[{}\s\\]/g, "").length;
  const len = Math.max(0, ...choices.map(visible));
  if (len <= 6) return "row";
  if (len <= 16) return "split";
  return "stack";
}

function fillParts(c: GuideContent, values: Record<string, string> | undefined): boolean[] {
  return (c.parts ?? []).map((_, part) =>
    (c.fields ?? []).filter((f) => f.part === part).every((f) => (values?.[f.key] ?? "").trim() === f.value),
  );
}

/**
 * Нэгдсэн шалгалтын «Бодлогын тайлбар»: бодлого бүрийн чанар → энгийн тайлбар → 100x100-ын
 * төстэй бодлого → бодолт. Одоохондоо зөвхөн ажилтанд (эзэн 2026-11-14) — бүх шат шууд нээлттэй.
 * `items` (сурагчийн дүн) өгвөл шаттай санамжийн горим — сурагчдад нээх үед ашиглана.
 */
export default function PaperGuide({
  examId,
  variants,
  items,
  open,
  onOpen,
  editor,
  stats,
  path,
}: {
  /** Сурагч: өөрийн хувилбарын бодлогууд + өөрийн зөв/алдсан тэмдэг ирэх зам (хувилбар сонгохгүй) */
  path?: string;
  examId: string;
  variants: string[];
  items: MyItem[];
  /** Нээлттэй бодлогын дугаар (label); null бол жагсаалт */
  open: string | null;
  onOpen: (label: string | null) => void;
  /** Багш+/Админ: бодлого дээр нь ангилал засах хэсэг */
  editor?: (entry: GuideEntry) => ReactNode;
  /** Ажилтанд: бодлого бүрийн төвийн зөв бодсон % (label → %) — жагсаалтыг картаар харуулна */
  stats?: Record<string, number | null>;
}) {
  const [variant, setVariant] = useState(() => {
    const saved = readStore<string | null>(`paper-guide-variant:${examId}`, null);
    return saved !== null && variants.includes(saved) ? saved : variants[0];
  });
  const [guides, setGuides] = useState<Record<string, GuideEntry[]>>({});
  const [error, setError] = useState("");
  const [marks, setMarks] = useState<MyPaperGuide["marks"]>(undefined);
  const [mine, setMine] = useState<MyPaperGuide["mine"]>(undefined);

  const load = useCallback(() => {
    api<MyPaperGuide>(path ?? `/paper-exams/${encodeURIComponent(examId)}/guide?variant=${encodeURIComponent(variant)}`)
      .then((g) => {
        setError("");
        setMarks(g.marks);
        setMine(g.mine);
        setGuides((prev) => ({ ...prev, [path ? variant : g.variant]: g.entries }));
      })
      .catch((e) => setError(errorText(e, "Тайлбарыг ачаалж чадсангүй")));
  }, [examId, variant, path]);
  useEffect(() => {
    if (!guides[variant]) load();
  }, [guides, variant, load]);

  const entries = guides[variant];
  return (
    <div className="space-y-4">
      {variants.length > 1 && open === null && (
        <Card padding="tight">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-ink">Хувилбар</div>
              <div className="text-sm text-ink-dim">Шалгалтын материал дээрх хувилбараа сонгоно</div>
            </div>
            <div className="flex gap-2" role="group" aria-label="Хувилбар">
              {variants.map((v) => (
                <button
                  key={v}
                  aria-pressed={variant === v}
                  onClick={() => {
                    setVariant(v);
                    writeStore(`paper-guide-variant:${examId}`, v);
                  }}
                  className={cn(
                    "min-h-12 min-w-14 rounded-xl border-2 px-4 text-lg font-bold",
                    variant === v ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink-dim",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !entries ? (
        <SkeletonRows rows={5} />
      ) : (
        <GuideBody key={variant} storeKey={`paper-guide:${examId}:${variant}`} entries={entries} items={items} open={open} onOpen={onOpen} editor={editor} stats={stats} marks={marks} mine={mine} />
      )}
    </div>
  );
}

function GuideBody({
  storeKey,
  entries,
  items,
  open,
  onOpen,
  editor,
  stats,
  marks,
  mine,
}: {
  mine?: MyPaperGuide["mine"];
  marks?: MyPaperGuide["marks"];
  stats?: Record<string, number | null>;
  storeKey: string;
  entries: GuideEntry[];
  items: MyItem[];
  open: string | null;
  onOpen: (label: string | null) => void;
  editor?: (entry: GuideEntry) => ReactNode;
}) {
  const [progress, setProgress] = useState<Record<string, Progress>>(() => readStore(storeKey, {}));
  useEffect(() => writeStore(storeKey, progress), [storeKey, progress]);
  const itemBy = useMemo(() => new Map(items.map((i) => [i.number, i])), [items]);

  const current = open === null ? -1 : entries.findIndex((e) => e.label === open);
  const patch = (label: string, next: Partial<Progress>) =>
    setProgress((prev) => ({ ...prev, [label]: { ...(prev[label] ?? EMPTY), ...next } }));

  /** Жагсаалтын нүдний өнгө: зөв, буруу, санамж аваад зассан, дүнд ороогүй */
  const cellClass = (e: GuideEntry) => {
    const item = e.number === null ? undefined : itemBy.get(e.number);
    const fixed = progress[e.label]?.fixed;
    if (item?.status === "CORRECT") return "border-success bg-success/15 text-success";
    if (fixed) return "border-success bg-panel text-success";
    if (item && item.status !== "UNGRADED") return "border-error bg-error/12 text-error";
    return "border-line bg-panel text-ink";
  };

  if (current < 0) {
    if (entries.length === 0) {
      return (
        <Card>
          <p className="text-sm text-ink-dim">Бодлогын тайлбар хараахан ороогүй байна</p>
        </Card>
      );
    }
    const groups = [
      { title: "Сонгох даалгавар", list: entries.filter((e) => e.content.kind === "choice") },
      { title: "Нөхөх даалгавар", list: entries.filter((e) => e.content.kind === "fill") },
    ].filter((g) => g.list.length > 0);
    return (
      <Card>
        <h2 className="mb-1 flex items-center gap-2 font-bold text-brand-soft">
          <ListChecks className="size-5" aria-hidden /> Бодлого бүрээр
        </h2>
        <p className="mb-4 text-sm text-ink-dim">
          {marks
            ? "Таны өгсөн хувилбарын бодлогууд. Бодлогоо дарж тайлбар, бодолтыг үзнэ"
            : stats
            ? "Бодлого бүрийн сэдэв, оноо, бүх сурагчийн хэдэн хувь нь зөв бодсон. Дарж тайлбар, бодолтыг үзнэ"
            : "Бодлогоо дарж санамж, томьёо, бодолтыг шат шатаар нээнэ. Ногоон хүрээтэй цагаан нь санамж аваад зассан бодлого"}
        </p>
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.title}>
              {groups.length > 1 && <h3 className="mb-2 text-sm font-bold text-ink">{g.title}</h3>}
              {stats || marks ? (
                <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {g.list.map((e) => (
                    <li key={shownLabel(e.label)}>
                      <ProblemCard entry={e} pct={stats?.[e.label] ?? null} mark={marks ? (marks[e.label] ?? null) : undefined} onOpen={() => onOpen(e.label)} />
                    </li>
                  ))}
                </ol>
              ) : (
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] gap-2">
                {g.list.map((e) => (
                  <li key={shownLabel(e.label)}>
                    <button
                      onClick={() => onOpen(e.label)}
                      className={cn("h-12 w-full rounded-xl border-2 text-sm font-bold tabular-nums", cellClass(e))}
                    >
                      {shownLabel(e.label)}
                    </button>
                  </li>
                ))}
              </ol>
              )}
            </section>
          ))}
        </div>
      </Card>
    );
  }

  const entry = entries[current];
  return (
    <GuideProblem
      key={entry.label}
      entry={entry}
      item={entry.number === null ? undefined : itemBy.get(entry.number)}
      progress={progress[entry.label] ?? EMPTY}
      onPatch={(next) => patch(entry.label, next)}
      position={`${current + 1} / ${entries.length}`}
      onBack={() => onOpen(null)}
      onPrev={current > 0 ? () => onOpen(entries[current - 1].label) : undefined}
      onNext={current < entries.length - 1 ? () => onOpen(entries[current + 1].label) : undefined}
      editor={editor?.(entry)}
      mark={marks?.[entry.label]}
      mine={mine?.[entry.label]}
    />
  );
}

function GuideProblem({
  entry,
  item,
  progress: r,
  onPatch,
  position,
  onBack,
  onPrev,
  onNext,
  editor,
  mark,
  mine,
}: {
  /** Сурагчид: энэ бодлогод өөрийнх нь зөв/алдсан ба яг хариу (эзэн 2026-11-16) */
  mark?: GuideMark;
  mine?: MyAnswer;
  editor?: ReactNode;
  entry: GuideEntry;
  item: MyItem | undefined;
  progress: Progress;
  onPatch: (next: Partial<Progress>) => void;
  position: string;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const c = entry.content;
  // Анхнаасаа зөв бодсон (эсвэл тооцохгүй болсон) бодлогод бүх тайлбар шууд нээлттэй
  const free = !item || item.status === "CORRECT" || item.status === "UNGRADED";
  const solved = free || r.fixed;
  const stage = free ? 3 : r.stage;
  const step = solved ? c.steps.length : r.step;
  // Зөв хариу ил болох мөч: зөв бодсон, санамж аваад зассан, эсвэл бодолтыг дуустал нээсэн
  const revealed = solved || r.step >= c.steps.length;
  const used = r.stage + (r.step > 0 ? 1 : 0);

  const picked = mine?.answer;
  const badge = mark ? (
    <Badge tone={mark === "CORRECT" ? "success" : mark === "MISSED" ? "danger" : "neutral"}>
      {mark === "CORRECT" ? `Зөв · ${c.points} оноо` : MARK[mark][0]}
    </Badge>
  ) : !item ? null : free ? (
    <Badge tone="success">{item.status === "CORRECT" ? `Зөв · ${c.points} оноо` : STATUS_LABEL.UNGRADED}</Badge>
  ) : r.fixed ? (
    <Badge tone="success">Санамж аваад зөв болголоо</Badge>
  ) : item ? (
    <Badge tone="danger">{STATUS_LABEL[item.status]}</Badge>
  ) : null;

  const choose = (letter: string) => {
    if (revealed || letter === item?.answer || r.wrong.includes(letter)) return;
    onPatch(letter === c.answer ? { tries: r.tries + 1, fixed: true } : { tries: r.tries + 1, wrong: [...r.wrong, letter] });
  };
  const values = revealed ? Object.fromEntries((c.fields ?? []).map((f) => [f.key, f.value])) : (r.retry ?? {});
  const partsOk = fillParts(c, values);
  const layout = choiceLayout(c.choices ?? []);
  const five = c.choices?.length === 5;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-dim hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> Бүх бодлого
        </button>
        {badge}
      </div>

      <Card>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold tabular-nums text-ink">{shownLabel(entry.label)}</span>
          <span className="text-sm text-ink-dim">{c.points} оноо</span>
        </div>
        {c.image && (
          // eslint-disable-next-line @next/next/no-img-element -- санд хадгалсан жижиг data URI зураг
          <img src={c.image} alt="Бодлогын зураг" className="mx-auto mb-3 block max-w-full rounded-lg bg-white sm:max-w-sm" />
        )}
        <div className="overflow-x-auto overflow-y-hidden text-ink">
          <Lines lines={c.statement} />
        </div>

        {c.kind === "choice" && c.choices && (
          <div
            className={cn(
              "mt-4 grid gap-2",
              layout === "stack" ? "grid-cols-1" : layout === "split" || !five ? "grid-cols-6" : "grid-cols-6 sm:grid-cols-5",
            )}
          >
            {c.choices.map((choice, i) => {
              const letter = LETTERS[i];
              const good = revealed && letter === c.answer;
              const bad = (!free && (letter === item?.answer || r.wrong.includes(letter))) || (letter === picked && letter !== c.answer);
              return (
                <button
                  key={letter}
                  onClick={() => choose(letter)}
                  aria-disabled={revealed || bad}
                  className={cn(
                    "flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-xl border-2 px-3 py-1.5 text-ink",
                    layout === "split" && (i < 3 ? "col-span-2" : "col-span-3"),
                    layout === "row" && five && (i < 3 ? "col-span-2 sm:col-span-1" : "col-span-3 sm:col-span-1"),
                    layout === "row" && !five && "col-span-3",
                    good ? "border-success bg-success/15" : bad ? "border-error bg-error/12" : "border-line bg-panel",
                    !revealed && !bad && "hover:border-brand",
                  )}
                >
                  <span className="font-bold text-ink-dim">{letter}</span>
                  <span className="whitespace-nowrap">
                    <MathText>{`$${choice}$`}</MathText>
                  </span>
                  {good && <Check className="size-4 shrink-0 text-success" aria-label="зөв хариу" />}
                </button>
              );
            })}
          </div>
        )}
        {c.kind === "choice" && picked !== undefined && (
          <p className={cn("mt-3 text-sm font-semibold", picked === c.answer ? "text-success" : "text-error")}>
            {picked === c.answer ? (
              <>Та {picked} гэж зөв хариулсан</>
            ) : picked === "" ? (
              <>Та хариу дугуйлаагүй, зөв хариу {c.answer}</>
            ) : picked === "*" ? (
              <>Та хоёр хариу дугуйлсан тул тооцоогүй, зөв хариу {c.answer}</>
            ) : (
              <>
                Та {picked} гэж дугуйлсан, зөв хариу {c.answer}
              </>
            )}
          </p>
        )}

        {c.kind === "fill" && c.fields && (
          <>
            {mine?.fields && <div className="-mb-3 mt-4 text-sm font-semibold text-ink-dim">Зөв хариу</div>}
            <div className="mt-4 flex flex-wrap gap-3">
              {c.fields.map((f) => {
                const marked = revealed || r.tries > 0;
                return (
                  <label key={f.key} className="flex flex-col items-center gap-1 text-sm font-bold text-ink-dim">
                    {f.key}
                    <input
                      inputMode="numeric"
                      maxLength={f.key.length}
                      readOnly={revealed}
                      value={values[f.key] ?? ""}
                      onChange={(e) => onPatch({ retry: { ...(r.retry ?? {}), [f.key]: e.target.value.replace(/[^0-9]/g, "") } })}
                      className={cn(
                        "h-13 rounded-xl border-2 bg-panel text-center text-xl font-bold text-ink outline-none focus:border-brand",
                        f.key.length > 1 ? "w-19" : "w-14",
                        marked ? (partsOk[f.part] ? "border-success bg-success/15" : "border-error bg-error/12") : "border-line",
                      )}
                    />
                  </label>
                );
              })}
            </div>
            {mine?.fields && (
              <div className="mt-4">
                <div className="mb-1 text-sm font-semibold text-ink-dim">Таны бичсэн</div>
                <div className="flex flex-wrap gap-3">
                  {c.fields.map((f) => {
                    const mineValue = mine.fields?.[f.key] ?? "";
                    const ok = mineValue === f.value;
                    return (
                      <span key={f.key} className="flex flex-col items-center gap-1 text-sm font-bold text-ink-dim">
                        {f.key}
                        <span
                          className={cn(
                            "flex h-13 items-center justify-center rounded-xl border-2 text-xl font-bold tabular-nums",
                            f.key.length > 1 ? "w-19" : "w-14",
                            ok ? "border-success bg-success/15 text-success" : "border-error bg-error/12 text-error",
                          )}
                          title={ok ? "зөв" : `зөв нь ${f.value}`}
                        >
                          {mineValue.replace(/_/g, "")}
                        </span>
                      </span>
                    );
                  })}
                </div>
                <p className="mt-2 text-sm text-ink-dim">Улаан нүдэнд алдсан</p>
              </div>
            )}
            {!revealed && (
              <button
                onClick={() => onPatch(partsOk.every(Boolean) ? { tries: r.tries + 1, fixed: true } : { tries: r.tries + 1 })}
                className="mt-4 min-h-12 rounded-xl bg-brand px-5 font-semibold text-on-brand"
              >
                Шалгах
              </button>
            )}
          </>
        )}

        {!revealed && (
          <p className={cn("mt-3 text-sm font-semibold", r.tries ? "text-error" : "text-ink-dim")}>
            {r.tries === 0
              ? "Санамж аваад дахин оролдоорой. Зөв хариу хамгийн сүүлд нээгдэнэ"
              : c.kind === "fill"
                ? "Ногоон нүд зөв, улаан нүдийг засаарай. Хэрэгтэй бол дараагийн санамжийг аваарай"
                : "Буруу байна. Дараагийн санамжийг аваад дахин оролдоорой"}
          </p>
        )}
        {r.fixed && !free && <p className="mt-3 text-sm font-semibold text-success">Зөв! {used} санамж ашиглалаа</p>}
      </Card>

      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < (free ? 4 : r.stage + (r.step >= c.steps.length ? 1 : 0)) ? "bg-brand" : "bg-line")} />
        ))}
      </div>

      {stage >= 1 && (
        <section className="rounded-2xl border border-line border-l-4 border-l-error bg-panel px-4 py-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-error">
            <Sigma className="size-4" aria-hidden /> АШИГЛАГДАХ ЧАНАР
          </h3>
          <div className="overflow-x-auto overflow-y-hidden font-semibold text-ink">
            <Lines lines={c.rule} />
          </div>
        </section>
      )}
      {stage >= 2 && (
        <section className="rounded-2xl border border-line bg-panel px-4 py-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-ink-dim">
            <Lightbulb className="size-4" aria-hidden /> ЭНГИЙНЭЭР ХЭЛБЭЛ
          </h3>
          <div className="overflow-x-auto overflow-y-hidden text-ink">
            <Lines lines={c.easy} />
          </div>
        </section>
      )}
      {stage >= 3 && c.refs.length > 0 && (
        <section className="rounded-2xl bg-brand-bright/10 px-4 py-3">
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wide text-brand-soft">
            <BookOpen className="size-4" aria-hidden /> 100x100 НОМД ТӨСТЭЙ БОДЛОГО
          </h3>
          <ul className="text-sm text-ink">
            {c.refs.map((ref, i) => (
              <li key={i} className="my-1.5 overflow-x-auto overflow-y-hidden">
                <span className="font-semibold">
                  {ref.chapter}, Тест {ref.test}, №{ref.number}
                </span>
                <span className="text-ink-dim"> — </span>
                <MathText>{ref.text}</MathText>
              </li>
            ))}
          </ul>
        </section>
      )}
      {step > 0 && (
        <section className="rounded-2xl border border-line bg-panel px-4 py-3">
          <h3 className="mb-1 text-xs font-bold tracking-wide text-ink-dim">
            БОДОЛТ{step < c.steps.length ? ` · ${step} / ${c.steps.length} алхам` : ""}
          </h3>
          <div className="text-ink">
            <Lines lines={c.steps.slice(0, step)} mathClass="text-brand-soft" />
          </div>
        </section>
      )}
      {/* Түгээмэл алдаа — бодолт бүрэн харагдсаны дараа л (бодолттой ижил нөхцөл) */}
      {step >= c.steps.length && <MistakeNotes notes={guideMistakeNotes(c, mine?.answer)} />}
      {revealed && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border-2 border-success bg-success/15 px-4 py-3 font-bold text-ink">
          Зөв хариу:
          {c.kind === "choice" && c.choices && c.answer ? (
            <>
              {c.answer} <MathText>{`$${c.choices[LETTERS.indexOf(c.answer)]}$`}</MathText>
            </>
          ) : (
            <span>{(c.fields ?? []).map((f) => `${f.key} = ${f.value}`).join(", ")}</span>
          )}
        </div>
      )}
      {!free && !r.fixed && (r.stage < 3 || r.step < c.steps.length) && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-line px-4 py-3">
          <span className="flex-1 font-semibold text-ink-dim">
            {r.stage < 3
              ? `${r.stage + 1}-р санамж: ${HINTS[r.stage]}`
              : r.step === 0
                ? "4-р санамж: Бодолтыг алхам алхмаар"
                : "Бодолтын дараагийн алхам"}
          </span>
          <button
            onClick={() => onPatch(r.stage < 3 ? { stage: r.stage + 1 } : { step: r.step + 1 })}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-brand px-4 font-semibold text-on-brand"
          >
            <LockOpen className="size-4" aria-hidden /> Нээх
          </button>
        </div>
      )}

      {editor}

      {/* Апп-ын доод цэстэй давхцуулахгүйн тулд хөвөгч биш, агуулгын төгсгөлд */}
      <div className="flex items-center gap-3 pt-2">
        <button onClick={onPrev} disabled={!onPrev} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl border border-line bg-panel px-4 font-semibold text-ink disabled:opacity-40">
          <ArrowLeft className="size-4" aria-hidden /> Өмнөх
        </button>
        <span className="flex-1 text-center font-semibold tabular-nums text-ink">{position}</span>
        <button onClick={onNext} disabled={!onNext} className="inline-flex min-h-12 items-center gap-1.5 rounded-xl bg-brand px-4 font-semibold text-on-brand disabled:opacity-40">
          Дараах <ArrowRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/**
 * Ажилтны жагсаалтын карт: дугаар, оноо, төвийн зөв %, сэдэв, нөхцөлийн эхний мөр —
 * дарахаас өмнө бодлогыг ойлгохуйц (эзэн 2026-11-15).
 */
const MARK: Record<GuideMark, [string, string]> = {
  CORRECT: ["Зөв", "bg-success/15 text-success"],
  MISSED: ["Алдсан", "bg-error/12 text-error"],
  UNGRADED: [STATUS_LABEL.UNGRADED, "bg-line text-ink-dim"],
};
function ProblemCard({
  entry,
  pct,
  mark,
  onOpen,
}: {
  entry: GuideEntry;
  pct: number | null;
  /** Сурагчид: хувийн оронд өөрийнх нь зөв/алдсан (undefined = ажилтны харагдац) */
  mark?: GuideMark | null;
  onOpen: () => void;
}) {
  const c = entry.content;
  return (
    <button
      onClick={onOpen}
      className="flex h-full w-full flex-col gap-1.5 rounded-xl border border-line bg-panel px-3 py-2.5 text-left transition hover:border-brand"
    >
      <span className="flex items-center gap-2">
        <span className="font-display text-lg font-bold tabular-nums text-ink">{shownLabel(entry.label)}</span>
        <span className="text-xs text-ink-dim">{c.points} оноо</span>
        {mark !== undefined ? (
          mark && (
            <span className={cn("ml-auto inline-flex h-7 items-center justify-center rounded-lg px-2 text-xs font-bold", MARK[mark][1])}>{MARK[mark][0]}</span>
          )
        ) : (
          <span
            className={cn("ml-auto inline-flex h-7 min-w-12 items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums", TONE_CELL[toneOf(pct)])}
            title="Бүх сурагчийн хэдэн хувь нь зөв бодсон"
          >
            {pct === null ? "" : `${pct}%`}
          </span>
        )}
      </span>
      <span className="text-xs font-semibold text-brand-soft">{c.topic}</span>
      <span className="line-clamp-2 overflow-hidden text-sm text-ink">
        <MathText>{c.statement[0] ?? ""}</MathText>
      </span>
    </button>
  );
}
