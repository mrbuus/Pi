"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Loader2, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";

/** Серверийн GET /chapters/search-ийн мөр. */
export interface ChapterHit {
  id: string;
  title: string;
  bookId: string;
  bookCode: string;
  bookLabel: string;
}

/** Номд байхгүй, тогтмол тохиолддог хичээлийн төрлүүд — нэг товшилтоор. */
export const QUICK_TOPICS = ["Гар аргаар шалгалт", "Нэмэлт бодлого", "Явцын шалгалт"] as const;

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-base outline-none focus:border-brand sm:text-sm";

/** "Модультай тэгшитгэл · Тест 3" -> "Модультай тэгшитгэл" (тест дугаарыг тусад нь салгана) */
function baseTitle(title: string): string {
  return title.replace(/\s*\S\s*Тест\s*\d+\s*$/u, "").trim() || title;
}

interface Group {
  key: string;
  base: string;
  bookLabel: string;
  items: ChapterHit[];
}

/** Нэг ном + нэг сэдвийн "Тест 1..N" бүлгүүдийг нэг мөр болгон нэгтгэнэ. */
function groupHits(hits: ChapterHit[]): Group[] {
  const map = new Map<string, Group>();
  for (const h of hits) {
    const base = baseTitle(h.title);
    const key = `${h.bookId}:${base}`;
    let g = map.get(key);
    if (!g) {
      g = { key, base, bookLabel: h.bookLabel, items: [] };
      map.set(key, g);
    }
    g.items.push(h);
  }
  return [...map.values()];
}

/** Эхэнд нь түгээмэл сэдвийн товч байвал (жишээ "Явцын шалгалт — ...") түүнийг салгана */
function splitChip(text: string): { chip: string; rest: string } {
  const t = text.trimStart();
  for (const chip of QUICK_TOPICS) {
    if (t.startsWith(chip)) return { chip, rest: t.slice(chip.length).replace(/^\s*[-—]?\s*/, "") };
  }
  return { chip: "", rest: text };
}

function testNo(title: string): string {
  return title.match(/Тест\s*(\d+)\s*$/u)?.[1] ?? "";
}

/** Сонгосон нэг сэдэв (номын бүлэг) ба түүний сонгосон тестүүд. */
interface Part {
  key: string;
  base: string;
  bookLabel: string;
  items: ChapterHit[];
  /** Сонгосон тестийн chapter id — хоосон бол сэдэв бүхэлдээ */
  tests: string[];
}

/** "Урвуу функц · Тест 1, 2" — тест сонгоогүй бол зөвхөн сэдвийн нэр. */
function partText(p: Part): string {
  if (!p.tests.length || p.items.length < 2) return p.items.length === 1 ? p.items[0].title : p.base;
  const nos = p.items.filter((i) => p.tests.includes(i.id)).map((i) => testNo(i.title)).filter(Boolean);
  return nos.length ? `${p.base} · Тест ${nos.join(", ")}` : p.base;
}

/**
 * Хуваарийн сэдэв сонгогч (эзэн 2026-10-11): нэг хичээлд ОЛОН сэдэв, сэдэв
 * бүрээс ОЛОН тест сонгоно. Номоос хайх нь заавал биш — сэдэв сонгоогүй үед
 * талбар чөлөөт бичвэр. Доор нь түгээмэл сэдвийн товчнууд.
 * Гарчиг: «Явцын шалгалт — Урвуу функц · Тест 1, 2; Квадрат функц · Тест 3».
 */
export default function TopicPicker({
  title,
  onTitleChange,
  chapterId,
  onChapterIdChange,
  onSubmit,
  autoFocus,
}: {
  title: string;
  onTitleChange: (next: string) => void;
  chapterId: string;
  onChapterIdChange: (next: string) => void;
  /** Жагсаалтаас юу ч сонгоогүй үед Enter дарвал */
  onSubmit?: () => void;
  autoFocus?: boolean;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ChapterHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [parts, setParts] = useState<Part[]>([]);
  const [chip, setChip] = useState(() => splitChip(title).chip);

  const groups = useMemo(() => groupHits(hits), [hits]);
  const composing = parts.length > 0;

  // Сэдэв сонгосон үед гарчиг ба chapterId-г сонголтоос бүрдүүлнэ
  function emit(nextParts: Part[], nextChip: string) {
    if (!nextParts.length) return;
    const body = nextParts.map(partText).join("; ");
    onTitleChange(nextChip ? `${nextChip} — ${body}` : body);
    const first = nextParts[0];
    onChapterIdChange(first.tests[0] ?? first.items[0]?.id ?? "");
  }

  // Хайлт: 250мс саатуулж, хуучин хариуг орхино
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await api<ChapterHit[]>(`/chapters/search?q=${encodeURIComponent(q)}&limit=40`);
        if (cancelled) return;
        setHits(res);
        setFailed(false);
        setActive(-1);
      } catch {
        if (!cancelled) {
          setHits([]);
          setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  function pick(g: Group) {
    if (parts.some((p) => p.key === g.key)) {
      setQuery("");
      setOpen(false);
      return;
    }
    // Анхны сонголт: чөлөөт бичвэрээс түгээмэл товчийг хадгална
    const nextChip = composing ? chip : splitChip(title).chip;
    const next = [...parts, { key: g.key, base: g.base, bookLabel: g.bookLabel, items: g.items, tests: [] }];
    setChip(nextChip);
    setParts(next);
    emit(next, nextChip);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function toggleTest(key: string, id: string) {
    const next = parts.map((p) =>
      p.key !== key ? p : { ...p, tests: p.tests.includes(id) ? p.tests.filter((t) => t !== id) : [...p.tests, id] },
    );
    setParts(next);
    emit(next, chip);
  }

  function removePart(key: string) {
    const next = parts.filter((p) => p.key !== key);
    setParts(next);
    if (next.length) emit(next, chip);
    else {
      // Сүүлчийн сэдвийг хасвал зөвхөн түгээмэл товч (байвал) үлдэнэ
      onTitleChange(chip);
      onChapterIdChange("");
    }
  }

  function handleChange(next: string) {
    setOpen(true);
    if (composing) {
      // Сэдэв сонгосон үед талбар зөвхөн хайлт — гарчиг сонголтоос бүрдэнэ
      setQuery(next);
      return;
    }
    onTitleChange(next);
    setChip(splitChip(next).chip);
    setQuery(splitChip(next).rest);
    if (chapterId) onChapterIdChange("");
  }

  function applyChip(c: string) {
    const nextChip = chip === c ? "" : c;
    setChip(nextChip);
    if (composing) {
      emit(parts, nextChip);
    } else {
      const rest = splitChip(title).rest.trim();
      onTitleChange(nextChip ? (rest ? `${nextChip} — ${rest}` : nextChip) : rest);
      caretToEnd.current = true;
    }
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  const caretToEnd = useRef(false);
  useEffect(() => {
    if (!caretToEnd.current) return;
    caretToEnd.current = false;
    const el = inputRef.current;
    if (el) el.setSelectionRange(el.value.length, el.value.length);
  }, [title]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const showList = open && query.trim().length >= 2 && groups.length > 0;
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault();
      setActive((i) => (i + 1) % groups.length);
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? groups.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (showList && active >= 0) pick(groups[active]);
      else onSubmit?.();
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
    }
  }

  const q = query.trim();
  const listVisible = open && q.length >= 2;
  const activeId = active >= 0 ? `${uid}-opt-${active}` : undefined;

  return (
    <div className="space-y-2">
      {composing && (
        <p className="rounded-lg bg-bg px-3 py-2 text-sm font-medium text-ink" aria-live="polite">
          {title}
        </p>
      )}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-dim"
          aria-hidden
        />
        <input
          ref={inputRef}
          id={`${uid}-input`}
          role="combobox"
          aria-expanded={listVisible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          aria-label={composing ? "Өөр сэдэв нэмэх" : "Сэдвийн нэр"}
          autoComplete="off"
          value={composing ? query : title}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => query && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={composing ? "Өөр сэдэв нэмэх — номоос хайх" : "Сэдэв бичих эсвэл номоос хайх"}
          className={`${inputCls} pl-9 pr-9`}
          autoFocus={autoFocus}
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-dim"
            aria-hidden
          />
        )}
      </div>

      {listVisible && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Номын сэдвүүд"
          className="max-h-60 overflow-y-auto rounded-lg border border-line bg-surface"
        >
          {groups.map((g, i) => {
            const added = parts.some((p) => p.key === g.key);
            return (
              <li
                key={g.key}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                aria-disabled={added}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(g)}
                onMouseEnter={() => setActive(i)}
                className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink ${
                  i === active ? "bg-brand-tint" : "hover:bg-brand-tint"
                } ${added ? "opacity-60" : ""}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-semibold">{g.base}</span>
                  <span className="text-xs text-ink-dim">
                    <Meta items={[g.bookLabel, g.items.length > 1 && `${g.items.length} тест`]} />
                  </span>
                </span>
                {added && <Check className="h-4 w-4 shrink-0 text-success" aria-label="Нэмсэн" />}
              </li>
            );
          })}
          {!groups.length && !loading && (
            <li role="presentation" className="px-3 py-3 text-xs text-ink-dim">
              {failed
                ? "Хайлт ажиллахгүй байна. Сэдвээ шууд бичиж хадгалж болно."
                : composing
                  ? "Номд олдсонгүй."
                  : "Номд олдсонгүй. Бичсэн нэрээрээ хадгалж болно."}
            </li>
          )}
        </ul>
      )}

      {parts.map((p) => (
        <div key={p.key} className="flex items-start gap-2 rounded-lg bg-brand-tint px-3 py-2 text-xs text-ink">
          <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-soft" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">
              <Meta items={[p.base, p.bookLabel]} />
            </p>
            {p.items.length > 1 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={`${p.base} — тест сонгох (олныг)`}>
                {p.items.map((s) => {
                  const on = p.tests.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTest(p.key, s.id)}
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg border px-3 text-xs font-semibold transition ${
                        on
                          ? "border-brand bg-brand-bright text-on-brand"
                          : "border-line bg-surface text-ink hover:border-brand"
                      }`}
                    >
                      {on && <Check className="h-3 w-3" aria-hidden />}
                      Тест {testNo(s.title)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => removePart(p.key)}
            aria-label={`${p.base} сэдвийг хасах`}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-dim transition hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Түгээмэл сэдэв">
        {QUICK_TOPICS.map((c) => {
          const on = chip === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => applyChip(c)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3.5 text-xs font-semibold transition ${
                on
                  ? "border-brand bg-brand-tint text-brand-soft"
                  : "border-line text-ink hover:border-brand"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}
