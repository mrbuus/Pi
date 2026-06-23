"use client";

interface SummaryStats {
  studentsTotal: number;
  studentsMarked: number;
  totalAttempts: number;
  byState: Record<string, number>;
  byChapter: Record<string, { total: number; failed: number }>;
}

interface SummarySectionProps {
  summary: { stats: SummaryStats } | null;
}

/**
 * Өчигдрийн/өнөөдрийн дүгнэлт.
 * Сурагчдын ирцийн статистик, бодлогын үр дүнг харуулна.
 */
export default function SummarySection({ summary }: SummarySectionProps) {
  if (!summary) {
    return (
      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-4 md:p-6">
        <h2 className="mb-4 font-bold text-brand-soft">
          Өчигдрийн/өнөөдрийн дүгнэлт
        </h2>
        <p className="text-sm text-ink-dim">
          Дүгнэлт араахан бодогдоогүй (шөнө 23:30-д автоматаар бодогдоно)
        </p>
      </section>
    );
  }

  const { stats } = summary;

  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-4 md:p-6">
      <h2 className="mb-4 font-bold text-brand-soft">
        Өчигдрийн/өнөөдрийн дүгнэлт
      </h2>

      <div className="space-y-4 text-sm">
        {/* Main Stats */}
        <div className="rounded-lg bg-white/5 px-3 py-2">
          <p>
            Тэмдэглэсэн: <span className="font-semibold">{stats.studentsMarked}</span>/
            <span className="font-semibold">{stats.studentsTotal}</span> сурагч ·{" "}
            <span className="text-ink-dim">нийт {stats.totalAttempts} бодлого</span>
          </p>
        </div>

        {/* State Distribution */}
        {Object.entries(stats.byState).length > 0 && (
          <div>
            <p className="mb-2 text-xs text-ink-dim">Статус:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byState).map(([state, count]) => (
                <span
                  key={state}
                  className="rounded-lg bg-white/5 px-3 py-1 text-xs font-medium"
                >
                  {state}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Chapter Statistics */}
        {Object.entries(stats.byChapter).length > 0 && (
          <div>
            <p className="mb-2 text-xs text-ink-dim">Бүлэг сэдвээр:</p>
            <div className="space-y-1.5">
              {Object.entries(stats.byChapter).map(([chapter, data]) => (
                <div
                  key={chapter}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5"
                >
                  <span className="text-xs font-medium">{chapter}</span>
                  <span
                    className={`text-xs font-semibold ${
                      data.failed > 0 ? "text-red-300" : "text-teal-300"
                    }`}
                  >
                    {data.failed}/{data.total} алдаатай
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
