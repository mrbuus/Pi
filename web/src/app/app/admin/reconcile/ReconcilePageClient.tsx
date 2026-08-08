'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ImportResult, ReconcileSummary } from './types';
import { ImportUploader } from './ImportUploader';
import { TransactionList } from './TransactionList';
import { SummaryCards } from './SummaryCards';
import { ErrorState } from '@/components/ui/StateBlock';

export function ReconcilePageClient() {
  const [summary, setSummary] = useState<ReconcileSummary>({
    total: 0,
    autoMatched: 0,
    manuallyMatched: 0,
    unmatched: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSummary = async () => {
    try {
      // Тулгаагүй, автоматаар холбогдсон, гараар холбогдсон гүйлгээний тоо авах
      const [unmatched, autoMatched, manualMatched] = await Promise.all([
        api<{ items: []; total: number }>('/reconcile/transactions?status=UNMATCHED&limit=1&offset=0', {
          method: 'GET',
        }),
        api<{ items: []; total: number }>('/reconcile/transactions?status=AUTO_MATCHED&limit=1&offset=0', {
          method: 'GET',
        }),
        api<{ items: []; total: number }>('/reconcile/transactions?status=MANUALLY_MATCHED&limit=1&offset=0', {
          method: 'GET',
        }),
      ]);

      const total =
        unmatched.total + autoMatched.total + manualMatched.total;

      setSummary({
        total,
        autoMatched: autoMatched.total,
        manuallyMatched: manualMatched.total,
        unmatched: unmatched.total,
      });
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Хураангуйг ачаалж чадсангүй');
    }
  };

  useEffect(() => {
    loadSummary();
  }, [refreshKey]);

  const handleImportSuccess = (result: ImportResult) => {
    // Импорт амжилттай болсны дараа хураангуй болон жагсаалтыг шинэчил
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {/* Хураангуй */}
      {error ? (
        <ErrorState
          message={error}
          onRetry={loadSummary}
        />
      ) : (
        <SummaryCards summary={summary} />
      )}

      {/* Хуулга импортлоо */}
      <ImportUploader onSuccess={handleImportSuccess} />

      {/* Гүйлгээний жагсаалт */}
      <TransactionList refreshKey={refreshKey} />
    </div>
  );
}
