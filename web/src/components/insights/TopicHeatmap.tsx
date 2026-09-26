"use client";

import { Card, SectionHeader } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import type { TopicMastery } from "./types";

export default function TopicHeatmap({ rows }: { rows: TopicMastery[] }) {
  const topics = Array.from(
    new Map(rows.flatMap((row) => row.topicMasteries.map((topic) => [topic.topicId, topic.topicName] as const))).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], "mn"));

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <SectionHeader title="Сурагчийн сэдвийн эзэмшил" hint={<span className="text-sm font-normal text-ink-dim">Хувь болон оролдлогын тоо</span>} />
      </div>
      <div className="overflow-x-auto" role="region" aria-label="Сэдвийн эзэмшлийн хүснэгт" tabIndex={0}>
        <table className="min-w-[640px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-line bg-surface">
              <th scope="col" className="sticky left-0 z-10 min-w-36 bg-surface px-3 py-3 text-left font-semibold text-ink">Сурагч</th>
              {topics.map(([id, name]) => <th key={id} scope="col" className="min-w-28 px-3 py-3 text-left font-semibold text-ink">{name}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((student) => (
              <tr key={student.studentId} className="border-b border-line last:border-0">
                <th scope="row" className="sticky left-0 z-10 max-w-40 truncate bg-panel px-3 py-3 text-left font-medium text-ink">{student.studentName}</th>
                {topics.map(([topicId, topicName]) => {
                  const item = student.topicMasteries.find((topic) => topic.topicId === topicId);
                  if (!item) return <td key={topicId} className="px-3 py-3 text-ink-dim">—</td>;
                  const rate = Math.max(0, Math.min(1, item.masteryRate));
                  const tone = rate < 0.4 ? "bg-error/15" : rate < 0.7 ? "bg-warning/15" : "bg-success/15";
                  return (
                    <td key={topicId} className={`px-3 py-3 ${tone}`}>
                      <span className="font-semibold text-ink">{Math.round(rate * 100)}%</span>
                      <span className="mt-1 block text-xs text-ink-dim">{item.correctCount} зөв, {item.problemCount} бодлого</span>
                      <span className="sr-only">{student.studentName} — {topicName}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 text-xs text-ink-dim"><Meta items={["Хувь нь хэмжсэн бодлогуудын зөв хариултыг харуулна", "Өнгө нь нэмэлт дохио"]} /></div>
    </Card>
  );
}
