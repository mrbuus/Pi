"use client";

import { Card, SectionHeader } from "@/components/ui/Surface";
import { Meta, Dot } from "@/components/ui/Meta";
import type { ProblemStats } from "./types";

interface ProblematicProblemsProps {
  problems: ProblemStats[];
}

export default function ProblematicProblems({
  problems,
}: ProblematicProblemsProps) {
  if (!problems.length) {
    return (
      <Card>
        <SectionHeader title="Хамгийн хүнд бодлого" />
        <div className="text-sm text-ink-dim">Өгөгдөл байхгүй</div>
      </Card>
    );
  }

  // Бодлогуудыг амжилтын хувиар эрэмбэлж, хамгийн сөргүүнүүд дээр
  const hardest = [...problems]
    .sort((a, b) => a.successRate - b.successRate)
    .slice(0, 5);

  const easiest = [...problems]
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Хамгийн хүнд */}
      <Card>
        <SectionHeader title="Хамгийн хүнд бодлогу" />
        <div className="space-y-4">
          {hardest.map((prob) => (
            <div
              key={prob.problemId}
              className="p-3 bg-panel rounded border border-line hover:border-text-ink-dim transition"
            >
              <div className="font-medium text-ink mb-2">{prob.problemTitle}</div>
              <div className="text-xs text-ink-dim mb-2">{prob.topicName}</div>
              <div className="text-xs">
                <Meta
                  items={[
                    `Өнгөрүүлэх хувь: ${(prob.successRate * 100).toFixed(1)}%`,
                    `Оролцоо: ${prob.totalAttempts}`,
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Хамгийн амархан */}
      <Card>
        <SectionHeader title="Хамгийн амархан бодлогу" />
        <div className="space-y-4">
          {easiest.map((prob) => (
            <div
              key={prob.problemId}
              className="p-3 bg-panel rounded border border-line hover:border-text-ink-dim transition"
            >
              <div className="font-medium text-ink mb-2">{prob.problemTitle}</div>
              <div className="text-xs text-ink-dim mb-2">{prob.topicName}</div>
              <div className="text-xs">
                <Meta
                  items={[
                    `Өнгөрүүлэх хувь: ${(prob.successRate * 100).toFixed(1)}%`,
                    `Оролцоо: ${prob.totalAttempts}`,
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
