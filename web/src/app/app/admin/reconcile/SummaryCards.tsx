'use client';

import { ReconcileSummary } from './types';
import { Meta } from '@/components/ui/Meta';

interface SummaryCardsProps {
  summary: ReconcileSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Нийт гүйлгээ',
      value: summary.total,
      color: 'text-ink',
      bg: 'bg-surface',
    },
    {
      label: 'Автоматаар холбогдсон',
      value: summary.autoMatched,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: 'Гараар холбогдсон',
      value: summary.manuallyMatched,
      color: 'text-info',
      bg: 'bg-info/10',
    },
    {
      label: 'Тулгаагүй',
      value: summary.unmatched,
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} rounded-lg p-3 border border-line`}
        >
          <p className="text-xs font-medium text-ink-dim mb-1">
            {card.label}
          </p>
          <p className={`text-2xl font-bold ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
