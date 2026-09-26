"use client";

import { useEffect, useMemo, useState } from "react";
import MathText from "@/components/MathText";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Card } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import type { DistractorAnalysis } from "./types";

export default function DistractorAnalysisPanel() {
  const [rows, setRows] = useState<DistractorAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    api<DistractorAnalysis[]>("/insights/distractor-analysis?limit=100")
      .then((result) => { if (active) setRows(result); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const choices = useMemo(() => rows.map((row) => ({
    ...row,
    wrongChoices: row.distractor
      .filter((choice) => choice.mistakeType && choice.mistakeType !== "NONE" && choice.selectionCount > 0)
      .sort((a, b) => b.selectionCount - a.selectionCount)
      .slice(0, 3),
  })).filter((row) => row.wrongChoices.length > 0)
    .sort((a, b) => (b.wrongChoices[0]?.selectionCount ?? 0) - (a.wrongChoices[0]?.selectionCount ?? 0)), [rows]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-panel px-4 py-3 text-sm text-ink-dim">Зөв хариуны сонголтыг хасаж, хамгийн олон сонгосон буруу хувилбаруудыг харуулав.</div>
      {loading && <LoadingState rows={6} label="Сонголтын статистик ачаалж байна" />}
      {!loading && error && <ErrorState message="Сонголтын статистик ачаалсангүй. Дахин оролдоно уу." onRetry={() => { setError(false); setLoading(true); setRetry((value) => value + 1); }} />}
      {!loading && !error && rows.length === 0 && <EmptyState title="Одоогоор оролдлогын өгөгдөл алга" hint="Сурагчид тест бөглөсний дараа энд гарна." />}
      {!loading && !error && rows.length > 0 && choices.length === 0 && <EmptyState title="Бүртгэгдсэн буруу сонголт алга" hint="Оролдлогоос буруу хувилбар сонгогдсон үед энд гарна." />}
      {!loading && !error && choices.length > 0 && choices.map((row) => (
        <Card key={row.problemId} padding="tight">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="break-all font-semibold text-ink">{row.problemToken}</h2>
            <span className="text-sm text-ink-dim"><Meta items={[`${row.totalAttempts} оролдлого`]} /></span>
          </div>
          {row.totalAttempts < 10 && <p className="mt-3 rounded-lg bg-panel px-3 py-2 text-sm text-ink-dim">Дүгнэлт гаргахад оролдлого хангалтгүй ({row.totalAttempts})</p>}
          <ol className="mt-3 space-y-2">
            {row.wrongChoices.map((choice) => (
              <li key={`${row.problemId}-${choice.choiceLabel}`} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 break-words text-ink">
                  <span className="mr-2 font-bold">{choice.choiceLabel}</span>
                  <MathText>{choice.choiceText}</MathText>
                  {choice.mistakeNote && <p className="mt-2 text-sm text-ink-dim">{choice.mistakeNote}</p>}
                </div>
                <dl className="flex shrink-0 gap-4 text-sm sm:block sm:text-right">
                  <div><dt className="sr-only">Сонгосон тоо</dt><dd className="font-semibold text-ink">{choice.selectionCount} сонгосон</dd></div>
                  <div><dt className="sr-only">Сонголтын хувь</dt><dd className="text-ink-dim">{Math.round(choice.selectionRate * 100)}%</dd></div>
                </dl>
              </li>
            ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}
