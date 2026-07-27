"use client";

import { useMemo, useState } from "react";
import MathText from "@/components/MathText";
import {
  DIFFICULTY_LABEL,
  DIFFICULTY_OPTIONS,
  FORMAT_LABEL,
  FORMAT_OPTIONS,
  difficultyOf,
  hasKnownAnswer,
  type Problem,
} from "./types";

/**
 * Алхам 2 · Бодлого сонгох — багш хамгийн олон цагаа энд өнгөрөөдөг тул
 * хайлт/шүүлтүүр хурдан, хариугүй бодлогыг НУУЛГҮЙ тодоор анхааруулна.
 */
export default function ProblemPicker({
  problems,
  loading,
  error,
  chapterChosen,
  selectedIds,
  onToggle,
  onPreview,
  onSelectFirst,
  onClearSelection,
}: {
  problems: Problem[];
  loading: boolean;
  error: string;
  chapterChosen: boolean;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onPreview: (p: Problem) => void;
  onSelectFirst: (n: number) => void;
  onClearSelection: () => void;
}) {
  const [search, setSearch] = useState("");
  const [format, setFormat] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [answerKey, setAnswerKey] = useState<"" | "known" | "missing">("");
  const [hasImage, setHasImage] = useState<"" | "yes" | "no">("");

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return problems.filter((p) => {
      if (format && p.format !== format) return false;
      if (difficulty && difficultyOf(p) !== difficulty) return false;
      if (answerKey === "known" && !hasKnownAnswer(p)) return false;
      if (answerKey === "missing" && hasKnownAnswer(p)) return false;
      if (hasImage === "yes" && !p.imageKey) return false;
      if (hasImage === "no" && p.imageKey) return false;
      if (q) {
        const inToken = p.token.toLowerCase().includes(q);
        const inStatement = (p.statementText ?? "").toLowerCase().includes(q);
        const inTags = (p.tags ?? []).some((t) => t.tag.name.toLowerCase().includes(q));
        const inTopic = (p.analysis?.topic ?? "").toLowerCase().includes(q);
        const inSubtopic = (p.analysis?.subtopic ?? "").toLowerCase().includes(q);
        if (!inToken && !inStatement && !inTags && !inTopic && !inSubtopic) return false;
      }
      return true;
    });
  }, [problems, search, format, difficulty, answerKey, hasImage]);

  const missingInView = filtered.filter((p) => !hasKnownAnswer(p)).length;
  const selectStyle =
    "min-h-11 rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink outline-none transition focus:border-brand";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="problem-search" className="mb-1.5 block text-sm text-ink-dim">
            Хайх (код, бодлогын текст, сэдэв/tag-аар)
          </label>
          <input
            id="problem-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ж: 100-23-05, эсвэл 'квадрат тэгшитгэл'"
            className="w-full min-h-11 rounded-xl border border-line bg-bg px-4 py-2.5 text-base text-ink outline-none transition focus:border-brand"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onSelectFirst(40)}
            disabled={problems.length === 0}
            className="min-h-11 rounded-lg border border-line px-3 py-2 text-base transition hover:border-brand disabled:opacity-40"
          >
            Эхний 40
          </button>
          <button
            type="button"
            onClick={onClearSelection}
            className="min-h-11 rounded-lg border border-line px-3 py-2 text-base transition hover:border-brand"
          >
            Цэвэрлэх
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="filter-format" className="mb-1 block text-sm text-ink-dim">
            Төрөл
          </label>
          <select
            id="filter-format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className={`${selectStyle} w-full`}
          >
            {FORMAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-difficulty" className="mb-1 block text-sm text-ink-dim">
            Түвшин
          </label>
          <select
            id="filter-difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className={`${selectStyle} w-full`}
          >
            {DIFFICULTY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-answerkey" className="mb-1 block text-sm text-ink-dim">
            Хариуны түлхүүр
          </label>
          <select
            id="filter-answerkey"
            value={answerKey}
            onChange={(e) => setAnswerKey(e.target.value as typeof answerKey)}
            className={`${selectStyle} w-full`}
          >
            <option value="">Бүгд</option>
            <option value="known">Зөвхөн хариутай</option>
            <option value="missing">⚠ Зөвхөн хариугүй</option>
          </select>
        </div>
        <div>
          <label htmlFor="filter-image" className="mb-1 block text-sm text-ink-dim">
            Зураг
          </label>
          <select
            id="filter-image"
            value={hasImage}
            onChange={(e) => setHasImage(e.target.value as typeof hasImage)}
            className={`${selectStyle} w-full`}
          >
            <option value="">Бүгд</option>
            <option value="yes">Зурагтай</option>
            <option value="no">Зураггүй</option>
          </select>
        </div>
      </div>

      {missingInView > 0 && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-base text-warning"
        >
          ⚠ Харагдаж буй {filtered.length}-ийн {missingInView} нь хариугүй —
          сонговол онооны нийлбэрт орохгүй.
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-base text-ink-dim">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand"
          />
          <span role="status">Бодлого ачаалж байна…</span>
        </div>
      )}
      {error && !loading && (
        <p
          role="alert"
          className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-base text-error"
        >
          {error}
        </p>
      )}
      {!chapterChosen && !loading && (
        <p className="text-base text-ink-dim">
          Бүлэг сэдэв сонговол тухайн бүлгийн бодлогууд энд гарна.
        </p>
      )}
      {chapterChosen && !loading && !error && problems.length === 0 && (
        <p className="text-base text-ink-dim">Энэ бүлэгт бодлого алга байна</p>
      )}
      {chapterChosen && !loading && !error && problems.length > 0 && filtered.length === 0 && (
        <p className="text-base text-ink-dim">Шүүлтүүрт тохирох бодлого олдсонгүй</p>
      )}

      <ul className="space-y-2">
        {filtered.map((p) => {
          const selected = selectedSet.has(p.id);
          const order = selectedIds.indexOf(p.id) + 1;
          const known = hasKnownAnswer(p);
          const diff = difficultyOf(p);
          return (
            <li
              key={p.id}
              className={`flex items-start gap-2 rounded-xl border p-3 transition ${
                selected ? "border-brand-bright bg-brand-bright/10" : "border-line"
              }`}
            >
              <button
                type="button"
                onClick={() => onToggle(p.id)}
                aria-pressed={selected}
                aria-label={
                  selected
                    ? `${p.token} бодлогыг тестээс хасах`
                    : `${p.token} бодлогыг тестэд нэмэх`
                }
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition ${
                  selected ? "bg-brand text-on-brand" : "bg-line/30 text-ink-dim"
                }`}
              >
                {selected ? order : "+"}
              </button>

              <button
                type="button"
                onClick={() => onToggle(p.id)}
                aria-pressed={selected}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block text-base leading-snug text-ink">
                  {p.statementText ? (
                    <MathText>{p.statementText}</MathText>
                  ) : (
                    <span className="italic text-ink-dim">(текстгүй — токенгоор л таних)</span>
                  )}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="rounded bg-line/30 px-2 py-0.5 font-mono text-ink-dim">
                    {p.token}
                  </span>
                  <span className="rounded bg-brand-bright/15 px-2 py-0.5 text-brand-soft">
                    {FORMAT_LABEL[p.format] ?? p.format}
                  </span>
                  <span className="rounded bg-line/30 px-2 py-0.5 text-ink-dim">
                    {p.points} оноо
                  </span>
                  {diff !== "unknown" && (
                    <span className="rounded bg-line/30 px-2 py-0.5 text-ink-dim">
                      {DIFFICULTY_LABEL[diff]}
                    </span>
                  )}
                  {p.imageKey && (
                    <span className="rounded bg-line/30 px-2 py-0.5 text-ink-dim">🖼 зурагтай</span>
                  )}
                  {!known && (
                    <span className="rounded border border-error/40 bg-error/10 px-2 py-0.5 font-semibold text-error">
                      ⚠ хариугүй
                    </span>
                  )}
                  {known && p.analysis?.answerKeyStatus === "REVIEW_REQUIRED" && (
                    <span className="rounded border border-warning/40 bg-warning/10 px-2 py-0.5 text-warning">
                      ⚠ шалгах шаардлагатай
                    </span>
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onPreview(p)}
                className="min-h-11 shrink-0 rounded-lg border border-line px-3 py-2 text-sm transition hover:border-brand"
              >
                Харах
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
