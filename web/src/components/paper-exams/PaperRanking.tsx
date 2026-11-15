"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { errorText } from "@/components/exams/types";
import { cn } from "@/lib/cn";
import { dayText, scoreText, type PaperExamRow, type PaperRanking as Ranking } from "./types";

/** Excel (UTF-8 BOM) — «Нэгдсэн шалгалт 1» гарчиг, доор нь Дүн | Сурагчийн код | Байр. */
function downloadCsv(r: Ranking) {
  const esc = (v: string) => (/[",\n;]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  const lines = [esc(r.exam.title), ["Дүн", "Сурагчийн код", "Байр"].join(","), ...r.rows.map((x) => [scoreText(x.score), esc(x.code), esc(x.rank)].join(","))];
  const blob = new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${r.exam.title} — дүн.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * «Дүн» — нэгдсэн шалгалтын жагсаалт: Дүн | Сурагчийн код | Байр. Ижил оноотой сурагчид
 * нэг байрыг хуваана («1-2»). Нэр харуулахгүй. Excel-ээр татна (эзэн 2026-11-15).
 */
export default function PaperRanking() {
  const [exams, setExams] = useState<PaperExamRow[] | null>(null);
  const [examId, setExamId] = useState("");
  const [data, setData] = useState<Ranking | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadExams = useCallback(() => {
    api<PaperExamRow[]>("/paper-exams")
      .then((list) => {
        setError("");
        const scored = list.filter((e) => e.sheetCount > 0);
        setExams(scored);
        setExamId((cur) => cur || scored[0]?.id || "");
      })
      .catch((e) => setError(errorText(e, "Жагсаалтыг ачаалж чадсангүй")));
  }, []);
  useEffect(loadExams, [loadExams]);
  const withScores = exams ?? [];

  const load = useCallback(() => {
    if (!examId) return;
    setData(null);
    api<Ranking>(`/paper-exams/${encodeURIComponent(examId)}/ranking`)
      .then((r) => {
        setError("");
        setData(r);
      })
      .catch((e) => setError(errorText(e, "Дүнг ачаалж чадсангүй")));
  }, [examId]);
  useEffect(load, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (data?.rows ?? []).filter((r) => !q || r.code.toUpperCase().includes(q));
  }, [data, query]);

  if (!exams) return error ? <ErrorState message={error} onRetry={loadExams} /> : <SkeletonRows rows={8} />;
  if (withScores.length === 0) return <EmptyState title="Дүн оруулсан нэгдсэн шалгалт алга" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {withScores.length > 1 && (
          <select
            aria-label="Шалгалт сонгох"
            value={examId}
            onChange={(e) => setExamId(e.target.value)}
            className="h-11 rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-brand"
          >
            {withScores.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
          </select>
        )}
        <div className="relative min-w-0 flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-dim" aria-hidden />
          <input
            aria-label="Сурагчийн кодоор хайх"
            inputMode="numeric"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Сурагчийн код"
            className="h-11 w-full rounded-xl border border-line bg-bg py-2 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand sm:w-56"
          />
        </div>
        {data && (
          <Button variant="outline" className="ml-auto" onClick={() => downloadCsv(data)}>
            <Download aria-hidden /> Excel татах
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !data ? (
        <SkeletonRows rows={8} />
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3 pt-4">
            <h2 className="cyrillic-heading font-display text-xl font-bold text-ink">{data.exam.title}</h2>
            <Meta className="text-sm text-ink-dim" items={[dayText(data.exam.heldOn), `${data.rows.length} сурагч`]} />
            {!data.exam.published && <Badge>Сурагчдад нээгээгүй</Badge>}
          </div>
          <table className="w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-panel text-left text-xs text-ink-dim">
              <tr className="border-t border-line">
                <th className="px-5 py-2 text-right">Дүн</th>
                <th className="px-3 py-2">Сурагчийн код</th>
                <th className="px-5 py-2 text-right">Байр</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`${r.code}-${i}`} className={cn("border-t border-line", i % 2 === 1 && "bg-ink/[0.025]")}>
                  <td className="px-5 py-2 text-right font-bold text-ink">{scoreText(r.score)}</td>
                  <td className="px-3 py-2 text-ink">{r.code}</td>
                  <td className="px-5 py-2 text-right text-ink-dim">{r.rank}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-6 text-center text-sm text-ink-dim">«{query}» кодтой сурагч алга</p>}
        </Card>
      )}
    </div>
  );
}
