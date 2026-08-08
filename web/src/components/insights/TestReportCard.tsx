"use client";

import { Card, SectionHeader } from "@/components/ui/Surface";
import { Dot, Meta } from "@/components/ui/Meta";
import type { TestStats } from "./types";

interface TestReportCardProps {
  stats: TestStats;
  testTitle: string;
  conductedAt: string;
}

export default function TestReportCard({
  stats,
  testTitle,
  conductedAt,
}: TestReportCardProps) {
  const passRate = stats.totalAttempts > 0
    ? ((stats.passCount / stats.totalAttempts) * 100).toFixed(1)
    : 0;

  return (
    <Card className="space-y-6">
      <SectionHeader
        title={testTitle}
        hint={
          <span className="text-xs text-ink-dim ml-auto">
            {new Date(conductedAt).toLocaleDateString("mn-MN")}
          </span>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <div className="text-sm text-ink-dim">Нийт оролцоо</div>
          <div className="text-2xl font-bold text-ink">{stats.totalAttempts}</div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-ink-dim">Амжилттай</div>
          <div className="text-2xl font-bold text-brand">
            {stats.passCount}
            <span className="ml-1 text-sm font-normal text-ink-dim">
              ({passRate}%)
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-ink-dim">Дундаж оноо</div>
          <div className="text-2xl font-bold text-ink">
            {stats.averageScore.toFixed(1)}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-sm text-ink-dim">Медиан</div>
          <div className="text-2xl font-bold text-ink">
            {stats.medianScore.toFixed(1)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium text-ink">Оноо шинжилгээ</div>
        <div>
        <Meta
          items={[
            `Хамгийн бага: ${stats.minScore.toFixed(1)}`,
            `Хамгийн их: ${stats.maxScore.toFixed(1)}`,
            `Стандарт хазайлт: ${stats.stdDeviation.toFixed(2)}`,
          ]}
        />
      </div>
      </div>

      {stats.scoreDistribution.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium text-ink">Оноо тархалт</div>
          <div className="space-y-2">
            {stats.scoreDistribution.map((bin) => (
              <div key={bin.bin} className="flex items-center gap-3">
                <div className="w-20 text-sm text-ink-dim">{bin.bin}</div>
                <div className="flex-1 h-6 bg-panel rounded overflow-hidden">
                  <div
                    className="h-full bg-brand-bright transition-all"
                    style={{
                      width: `${Math.min(
                        (bin.count / Math.max(...stats.scoreDistribution.map((b) => b.count))) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <div className="w-12 text-right text-sm font-medium text-ink">
                  {bin.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
