"use client";

import { Card, SectionHeader } from "@/components/ui/Surface";
import { Meta } from "@/components/ui/Meta";
import type { ProblemStats } from "./types";
import InfoHint from "@/components/ui/InfoHint";

interface TopMistakesProps {
  problems: ProblemStats[];
}

export default function TopMistakes({ problems }: TopMistakesProps) {
  if (!problems.length) {
    return (
      <Card>
        <SectionHeader title="Хамгийн олон андуурсан сонголт" />
        <div className="text-sm text-ink-dim">Өгөгдөл байхгүй</div>
      </Card>
    );
  }

  // Хамгийн олон андуурсан сонголтуудыг цуглуулна
  const allMistakes = problems
    .flatMap((p) =>
      p.commonMistakes
        .filter((m) => m.selectionRate > 0)
        .map((m) => ({
          problemId: p.problemId,
          problemTitle: p.problemTitle,
          topicName: p.topicName,
          optionText: m.optionText,
          selectionRate: m.selectionRate,
          successRate: p.successRate,
        }))
    )
    .sort((a, b) => b.selectionRate - a.selectionRate)
    .slice(0, 10);

  return (
    <Card>
      <SectionHeader
        title="Хамгийн олон андуурсан сонголту"
        hint={
          <InfoHint>Сурагчдын сонгосон гуравдахь болон сөргүү хариултууд — сөргүүлэх идеяг уг үгээр тодорхойлно</InfoHint>
        }
      />

      <div className="space-y-4">
        {allMistakes.map((mistake, idx) => (
          <div
            key={`${mistake.problemId}-${idx}`}
            className="p-4 bg-panel rounded border border-line space-y-2"
          >
            <div>
              <div className="font-medium text-ink">{mistake.problemTitle}</div>
              <div className="text-xs text-ink-dim">{mistake.topicName}</div>
            </div>

            <div className="p-3 bg-surface rounded text-sm text-ink">
              {mistake.optionText}
            </div>

            <div className="text-xs">
              <Meta
                items={[
                  `Сонгосон: ${(mistake.selectionRate * 100).toFixed(1)}%`,
                  `Бодлогын амжилт: ${(mistake.successRate * 100).toFixed(1)}%`,
                ]}
              />
            </div>
          </div>
        ))}
      </div>

      {allMistakes.length === 0 && (
        <div className="text-sm text-ink-dim">Сагаатсан сонголтүүд байхгүй</div>
      )}
    </Card>
  );
}
