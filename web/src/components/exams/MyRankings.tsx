"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronDown, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { formatMnDate } from "@/lib/dateMn";
import { cleanTitle } from "@/lib/studentTitle";

type Rank = { rank: number | null; participants: number; tied: number; label?: string; id?: string };
type Ranking = { classes: Rank[]; school: Rank | null; exam: Rank };
export type MyResult = {
  id: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  test: { id: string; title: string };
};

/** Өгсөн шалгалт бүрийн эрэмбэ (анги, сургууль, тухайн шалгалт) — /tests/my-results */
export default function MyRankings() {
  const [results, setResults] = useState<MyResult[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    api<MyResult[]>("/tests/my-results")
      .then(setResults)
      .catch(() => setError("Дүнг ачаалж чадсангүй"));
  }, []);
  useEffect(() => {
    const t = window.setTimeout(load, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!results) return <LoadingState rows={3} />;
  if (!results.length)
    return (
      <EmptyState
        icon={Trophy}
        title="Эрэмбэ хараахан алга"
        hint="Шалгалт өгмөгц ангидаа хэддүгээрт орсноо энд харна"
      />
    );
  return (
    <ul className="space-y-3">
      {results.map((r) => (
        <li key={r.id}>
          <ResultCard result={r} />
        </li>
      ))}
    </ul>
  );
}

function ResultCard({ result }: { result: MyResult }) {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(open: boolean) {
    if (!open || ranking || busy) return;
    setBusy(true);
    setError("");
    try {
      setRanking(await api<Ranking>(`/test-rankings/${encodeURIComponent(result.test.id)}`));
    } catch {
      setError("Эрэмбийг ачаалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }
  const scopes = ranking
    ? [...ranking.classes, ...(ranking.school ? [ranking.school] : []), { ...ranking.exam, label: "Энэ шалгалт" }]
    : [];
  return (
    <article className="min-w-0 rounded-xl border border-line bg-surface p-4 elev-1">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={`/app/tests/${result.test.id}/result`}
          className="min-w-0 break-words font-bold text-ink hover:text-brand-soft"
        >
          {cleanTitle(result.test.title, null, result.test.title)}
        </Link>
        <span className="shrink-0 text-right tabular-nums">
          <span className="block font-display text-lg font-bold text-ink">
            {result.totalScore}/{result.maxScore}
          </span>
          <time className="block text-xs text-ink-dim">{formatMnDate(result.createdAt)}</time>
        </span>
      </div>
      <details className="group mt-2" onToggle={(e) => void load(e.currentTarget.open)}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-lg text-sm font-bold text-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
          Миний эрэмбэ
        </summary>
        {busy ? (
          <LoadingState rows={3} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(true)} />
        ) : ranking ? (
          <div className="space-y-2 pt-1">
            {scopes.map((scope, i) => (
              <div key={scope.id ?? i} className="flex flex-wrap justify-between gap-2 rounded-lg bg-bg p-3 text-sm">
                <span className="break-words text-ink">{scope.label}</span>
                <strong className="tabular-nums text-ink">
                  {scope.rank === null ? "Эрэмбэ тооцохгүй" : `${scope.rank} / ${scope.participants}`}
                  {scope.tied > 1 ? ` (${scope.tied} ижил дүн)` : ""}
                </strong>
              </div>
            ))}
            <p className="text-xs text-ink-dim">
              Ижил хувийн дүнтэй сурагчид ижил байр эзэлнэ. Бусдын нэр, код харагдахгүй
            </p>
          </div>
        ) : null}
      </details>
    </article>
  );
}
