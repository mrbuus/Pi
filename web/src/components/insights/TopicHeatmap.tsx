"use client";

import { Card, SectionHeader } from "@/components/ui/Surface";
import type { StudentTopicStats } from "./types";
import InfoHint from "@/components/ui/InfoHint";

interface TopicHeatmapProps {
  studentTopics: StudentTopicStats[];
}

export default function TopicHeatmap({ studentTopics }: TopicHeatmapProps) {
  if (!studentTopics.length) {
    return (
      <Card>
        <SectionHeader title="Сэдвийн ялгаа" />
        <div className="text-sm text-ink-dim">Өгөгдөл байхгүй</div>
      </Card>
    );
  }

  // Бүх сэдвүүдийн жагсаалтыг цуглуулна
  const allTopics = Array.from(
    new Set(
      studentTopics.flatMap((st) =>
        st.topicStats.map((t) => t.topicName)
      )
    )
  ).sort();

  return (
    <Card>
      <SectionHeader
        title="Сэдвийн ялгаа (оноо %)"
        hint={<InfoHint>Сурагч бүрийн сэдвийн өнгөрүүлэх хувь — өнгөлөх байдлаар харагдана</InfoHint>}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-2 px-3 text-ink-dim font-medium sticky left-0 bg-panel z-10 w-40">
                Сурагч
              </th>
              {allTopics.map((topic) => (
                <th
                  key={topic}
                  className="text-center py-2 px-2 text-ink-dim font-medium whitespace-nowrap min-w-20"
                >
                  <div className="transform -rotate-45 origin-center whitespace-normal h-24 flex items-end justify-center">
                    <span className="text-xs">{topic}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {studentTopics.map((student) => (
              <tr key={student.studentId} className="border-b border-line hover:bg-panel">
                <td className="py-3 px-3 font-medium text-ink sticky left-0 bg-surface z-10 w-40 truncate">
                  {student.studentName}
                </td>
                {allTopics.map((topicName) => {
                  const topicStat = student.topicStats.find(
                    (t) => t.topicName === topicName
                  );
                  const rate = topicStat?.successRate ?? 0;
                  const percentage = Math.round(rate * 100);

                  // Өнгөний масштаб: 0%=улаан, 100%=ногоон
                  const hue = (rate * 120).toFixed(0); // 0=улаан, 120=ногоон
                  const bgColor = `hsl(${hue}, 70%, 75%)`;

                  return (
                    <td
                      key={`${student.studentId}-${topicName}`}
                      className="text-center py-3 px-2 relative group"
                      style={{
                        backgroundColor: bgColor,
                      }}
                    >
                      <span className="text-xs font-semibold text-ink">
                        {percentage}%
                      </span>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-ink text-on-brand text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20">
                        {topicName}: {percentage}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: "hsl(0, 70%, 75%)" }}
          />
          <span className="text-ink-dim">0% (сөргүү)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: "hsl(60, 70%, 75%)" }}
          />
          <span className="text-ink-dim">50% (дунд)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded"
            style={{ backgroundColor: "hsl(120, 70%, 75%)" }}
          />
          <span className="text-ink-dim">100% (сайн)</span>
        </div>
      </div>
    </Card>
  );
}
