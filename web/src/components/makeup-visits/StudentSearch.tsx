"use client";

import { Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { fullName, shortClass, type SearchHit } from "./types";

const DEBOUNCE_MS = 250;

/**
 * Нэрээр хайх: «Мишээл» гэж бичихэд тэр нэртэй БҮХ сурагч, овог нэр ба ангитайгаа.
 * Багш хүүхдээс «аль ангийнх вэ» гэж асуугаад зөвийг нь сонгоно.
 * `added` — аль хэдийн нэмсэн; `blocked` — нэмэх боломжгүй (шалтгаантай, ж: энэ ангийн сурагч).
 */
export default function StudentSearch({
  added,
  blocked,
  busyId,
  onAdd,
  autoFocus = true,
}: {
  added: Set<string>;
  blocked?: (hit: SearchHit) => string | null;
  busyId: string | null;
  onAdd: (hit: SearchHit) => void;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  const [error, setError] = useState<{ q: string; msg: string } | null>(null);
  const listId = useId();
  const q = query.replace(/\s+/g, " ").trim();
  const tooShort = q.replace(/\s/g, "").length < 2;

  useEffect(() => {
    if (tooShort) return;
    let alive = true;
    const t = window.setTimeout(() => {
      api<SearchHit[]>(`/makeup-visits/students/search?q=${encodeURIComponent(q)}`)
        .then((hits) => {
          if (!alive) return;
          setState({ q, hits });
          setError(null);
        })
        .catch((e) => alive && setError({ q, msg: e instanceof Error ? e.message : "Хайж чадсангүй" }));
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [q, tooShort]);

  const ready = state?.q === q;
  const loading = !tooShort && !ready && error?.q !== q;
  const hits = ready ? state!.hits : [];

  return (
    <div className="space-y-2">
      <label className="relative block">
        <span className="sr-only">Сурагчийн нэр</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-ink-dim" aria-hidden />
        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Сурагчийн нэр, ж: Мишээл"
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="search"
          aria-controls={listId}
          className="min-h-12 w-full rounded-xl border border-line bg-bg pl-10 pr-10 text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Хайлтыг цэвэрлэх"
            className="absolute right-1 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </label>

      <div id={listId} aria-live="polite">
        {tooShort ? (
          <p className="px-1 py-3 text-sm text-ink-dim">Нэрийн эхний 2 үсгийг бичнэ үү</p>
        ) : error?.q === q ? (
          <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
            {error.msg}
          </p>
        ) : loading ? (
          <div aria-busy="true" aria-label="Хайж байна" className="space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : hits.length === 0 ? (
          <p className="px-1 py-3 text-sm text-ink-dim">«{q}» нэртэй сурагч олдсонгүй</p>
        ) : (
          <ul className="space-y-1.5" aria-label="Олдсон сурагчид">
            {hits.map((h) => {
              const isAdded = added.has(h.id);
              const why = isAdded ? null : (blocked?.(h) ?? null);
              const busy = busyId === h.id;
              return (
                <li key={h.id} className="flex min-h-14 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="cyrillic-tight truncate text-[15px] font-semibold text-ink">{fullName(h)}</p>
                    <p className="flex flex-wrap gap-1 pt-0.5">
                      {h.classes.length ? (
                        h.classes.map((c) => (
                          <span key={c.id} className="rounded-md bg-brand-bright/10 px-1.5 text-xs font-bold text-brand-soft">
                            {shortClass(c.name)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-ink-dim">Ангигүй</span>
                      )}
                    </p>
                  </div>
                  {isAdded ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-success">
                      <Check className="size-4" aria-hidden />
                      Нэмсэн
                    </span>
                  ) : why ? (
                    <span className="max-w-[8rem] shrink-0 text-right text-xs text-ink-dim">{why}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAdd(h)}
                      disabled={busy}
                      aria-label={`${fullName(h)} нэмэх`}
                      className={cn(
                        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-brand-bright px-3 text-sm font-bold text-on-brand",
                        "hover:opacity-90 disabled:opacity-60",
                      )}
                    >
                      {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
                      Нэмэх
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
