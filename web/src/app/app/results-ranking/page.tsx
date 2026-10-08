"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/kit/card";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
type Rank = { rank: number | null; participants: number; tied: number; label?: string; id?: string };
type Ranking = { classes: Rank[]; school: Rank | null; exam: Rank };
type Result = { id: string; totalScore: number; maxScore: number; createdAt: string; test: { id: string; title: string } };
export default function ResultsRankingPage() {
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let alive = true; api<Result[]>("/tests/my-results").then(v => { if (alive) setResults(v); }).catch(() => { if (alive) setError("Дүнг ачаалж чадсангүй. Дахин нээнэ үү."); }); return () => { alive = false; }; }, []);
  return <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
    <h1 className="text-2xl font-semibold text-ink">Дүн ба эрэмбэ</h1>
    {error ? <ErrorState message={error} /> : !results ? <LoadingState /> : !results.length ? <EmptyState title="Дууссан шалгалт алга" action={<Link href="/app/tests" className="text-brand underline">Шалгалт харах</Link>} /> : results.map(result => <ResultCard key={result.id} result={result} />)}
  </main>;
}
function ResultCard({ result }: { result: Result }) {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load(open: boolean) {
    if (!open || ranking || busy) return;
    setBusy(true); setError("");
    try { setRanking(await api<Ranking>(`/test-rankings/${encodeURIComponent(result.test.id)}`)); }
    catch { setError("Эрэмбийг ачаалж чадсангүй."); }
    finally { setBusy(false); }
  }
  return <Card className="min-w-0"><CardHeader><CardTitle className="break-words text-lg">{result.test.title}</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xl font-semibold">{result.totalScore} / {result.maxScore}</p><time className="text-sm text-ink-dim">{new Date(result.createdAt).toLocaleDateString("mn-MN")}</time></div>
    <details onToggle={e => void load(e.currentTarget.open)}><summary className="min-h-11 cursor-pointer rounded-lg py-3 font-medium focus-visible:outline-2 focus-visible:outline-brand">Миний эрэмбэ</summary>
      {busy ? <LoadingState rows={3} /> : error ? <ErrorState message={error} onRetry={() => void load(true)} /> : ranking ? <div className="space-y-3 pt-2">
        {[...ranking.classes, ...(ranking.school ? [ranking.school] : []), { ...ranking.exam, label: "Энэ шалгалт" }].map((scope, i) => <div key={scope.id ?? i} className="flex flex-wrap justify-between gap-2 rounded-lg bg-panel p-3"><span className="break-words">{scope.label}</span><strong>{scope.rank === null ? "Эрэмбэ тооцохгүй" : `${scope.rank} / ${scope.participants}`}{scope.tied > 1 ? ` (${scope.tied} ижил дүн)` : ""}</strong></div>)}
        {!ranking.school && <p className="text-ink-dim">Сургууль бүртгэгдээгүй.</p>}
        <p className="text-ink-dim">Ижил хувийн дүнтэй сурагчид ижил байр эзэлнэ. Бусдын нэр, код харагдахгүй.</p>
      </div> : null}
    </details>
  </CardContent></Card>;
}
