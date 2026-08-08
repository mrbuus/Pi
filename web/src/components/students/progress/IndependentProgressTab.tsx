"use client";

import { useMemo } from "react";
import { Meta } from "@/components/ui/Meta";
import ActivityHeatmap from "@/components/activity/ActivityHeatmap";
import { SectionEmpty, SectionError, SectionLoading } from "./ProgressSectionStatus";
import { useSection } from "./useSection";

// api/src/tests/tests.service.ts resultsForStudent()-тэй яг тохирсон хэлбэр
interface TestResultRow {
  id: string;
  totalScore: number;
  maxScore: number;
  createdAt: string;
  test: { id: string; title: string; type: string };
}

const TEST_TYPE_LABEL: Record<string, string> = {
  DAILY: "Өдрийн тест",
  CHAPTER_EXAM: "Сэдвийн шалгалт",
  EESH_MOCK: "ЭЕШ сорил",
  CUSTOM: "Бусад",
};

function percentOf(r: TestResultRow): number {
  return r.maxScore > 0 ? Math.round((r.totalScore / r.maxScore) * 100) : 0;
}

function percentColorClass(pct: number): string {
  if (pct >= 80) return "text-success";
  if (pct >= 50) return "text-warning";
  return "text-error";
}

/**
 * "Бие даасан явц" таб: идэвхийн heatmap+стрийк (ActivityHeatmap-ыг дахин
 * ашигласан, дотроо streak-ийг өөрөө зохицуулна — teacher горимд
 * /activity/streak дуудахгүйгээр ойролцоо стрийк тооцдог) + онлайн шалгалтын
 * дүнгийн жагсаалт + оролдлогын статистик.
 */
export default function IndependentProgressTab({ studentId }: { studentId: string }) {
  const resultsQ = useSection<TestResultRow[]>(`/students/${studentId}/test-results`);
  const results = resultsQ.data ?? [];

  const stats = useMemo(() => {
    if (results.length === 0) return null;
    const percents = results.map(percentOf);
    const avg = Math.round(percents.reduce((s, p) => s + p, 0) / percents.length);
    const best = Math.max(...percents);
    return { count: results.length, avg, best };
  }, [results]);

  return (
    <div className="space-y-6">
      <ActivityHeatmap studentId={studentId} />

      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Онлайн шалгалтын дүн</h2>

        {resultsQ.status === "loading" && <SectionLoading label="Шалгалтын дүн" />}
        {resultsQ.status === "error" && (
          <SectionError message={resultsQ.error} onRetry={resultsQ.reload} />
        )}
        {resultsQ.status === "ready" && results.length === 0 && (
          <SectionEmpty text="Шалгалтын дүн алга байна" />
        )}

        {stats && (
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-dim">Өгсөн тестийн тоо</p>
              <p className="text-lg font-bold text-ink">{stats.count}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-dim">Дундаж хувь</p>
              <p className="text-lg font-bold text-ink">{stats.avg}%</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="text-xs text-ink-dim">Хамгийн сайн дүн</p>
              <p className="text-lg font-bold text-success">{stats.best}%</p>
            </div>
          </div>
        )}

        {resultsQ.status === "ready" && results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => {
              const pct = percentOf(r);
              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-2.5 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{r.test.title}</p>
                    <p className="text-xs text-ink-dim">
                      <Meta
                        items={[
                          TEST_TYPE_LABEL[r.test.type] ?? r.test.type,
                          r.createdAt.slice(0, 10),
                        ]}
                      />
                    </p>
                  </div>
                  <span className={`font-bold ${percentColorClass(pct)}`}>
                    {r.totalScore}/{r.maxScore} ({pct}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
