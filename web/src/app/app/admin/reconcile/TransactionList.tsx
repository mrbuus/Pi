'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { BankTransaction, BankMatchStatus } from './types';
import { SectionHeader, Card } from '@/components/ui/Surface';
import { SkeletonRows } from '@/components/ui/Skeleton';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateBlock';
import { UserSearch } from './UserSearch';
import { X, Check, AlertCircle } from 'lucide-react';

interface TransactionListProps {
  refreshKey?: number;
}

const STATUS_LABEL: Record<BankMatchStatus, string> = {
  UNMATCHED: 'Тулгаагүй',
  AUTO_MATCHED: 'Автоматаар холбогдсон',
  MANUALLY_MATCHED: 'Гараар холбогдсон',
  IGNORED: 'Үл хэлэлцсэн',
};

const STATUS_COLOR: Record<BankMatchStatus, string> = {
  UNMATCHED: 'bg-warning/10 text-warning border-warning',
  AUTO_MATCHED: 'bg-success/10 text-success border-success',
  MANUALLY_MATCHED: 'bg-info/10 text-info border-info',
  IGNORED: 'bg-error/10 text-error border-error',
};

export function TransactionList({ refreshKey = 0 }: TransactionListProps) {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const loadTransactions = async (offset: number) => {
    setLoading(true);
    setError(null);

    try {
      const response = await api<{
        items: BankTransaction[];
        total: number;
      }>(`/reconcile/transactions?status=UNMATCHED&limit=${limit}&offset=${offset}`, {
        method: 'GET',
      });

      setTransactions(response.items);
      setTotal(response.total);
    } catch (err: any) {
      setError(err?.message || 'Гүйлгээ дүүргээ амжилтгүй');
    } finally {
      setLoading(false);
    }
  };

  // Эхлээд ачаал, refreshKey өөрчлөгдөхөд дахин ачаал
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    loadTransactions(0);
  }

  const handleManualMatch = async (transaction: BankTransaction) => {
    if (!selectedUser) return;

    setMatchingId(transaction.id);
    try {
      await api('/reconcile/' + transaction.id + '/match', {
        method: 'POST',
        body: { userId: selectedUser.id },
      });

      // Жагсаалтаас арилгаа
      setTransactions(transactions.filter((t) => t.id !== transaction.id));
      setTotal(Math.max(0, total - 1));
      setSelectedUser(null);
    } catch (err: any) {
      setError(err?.message || 'Гүйлгээ холбоход амжилтгүй');
    } finally {
      setMatchingId(null);
    }
  };

  const handleIgnore = async (transaction: BankTransaction) => {
    setMatchingId(transaction.id);
    try {
      await api('/reconcile/' + transaction.id + '/ignore', {
        method: 'POST',
      });

      setTransactions(transactions.filter((t) => t.id !== transaction.id));
      setTotal(Math.max(0, total - 1));
    } catch (err: any) {
      setError(err?.message || 'Гүйлгээ үл хэлэлцэхэд амжилтгүй');
    } finally {
      setMatchingId(null);
    }
  };

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadTransactions(offset)}
      />
    );
  }

  if (loading && transactions.length === 0) {
    return <SkeletonRows rows={3} />;
  }

  if (!loading && transactions.length === 0) {
    return (
      <EmptyState
        title="Тулгаагүй гүйлгээ байхгүй"
        hint="Бүх банкны гүйлгээ аль хэдийн холбогдсон эсвэл үл хэлэлцсэн байна"
      />
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Тулгаагүй гүйлгээ" />

      {/* Сурагч сонгох */}
      <div className="bg-panel p-4 rounded-lg border border-line">
        <p className="text-sm font-medium text-ink mb-2">
          Гараар холбох сурагчыг сонгоо
        </p>
        <UserSearch
          selectedUser={selectedUser}
          onUserSelect={setSelectedUser}
        />
      </div>

      {/* Жагсаалт */}
      <div className="space-y-2">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="p-4">
            <div className="flex flex-col gap-3">
              {/* Үндсэн мэдээлэл */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="text-lg font-semibold text-ink">
                      {transaction.amount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'MNT',
                        minimumFractionDigits: 0,
                      })}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded border ${
                        STATUS_COLOR[transaction.matchStatus]
                      }`}
                    >
                      {STATUS_LABEL[transaction.matchStatus]}
                    </span>
                  </div>
                  <p className="text-sm text-ink-dim">
                    {transaction.description}
                  </p>
                  <p className="text-xs text-ink-dim mt-1">
                    <span className="font-mono">
                      {transaction.bankRef}
                    </span>{' '}
                    — {new Date(transaction.bookedAt).toLocaleDateString('mn-MN')}
                  </p>
                </div>
              </div>

              {/* Хүрээний дугаар (утаст холбогдсон хэрэг) */}
              {transaction.counterparty && (
                <div className="bg-surface px-3 py-2 rounded text-sm">
                  <p className="text-ink-dim text-xs mb-0.5">Эх дүүргүүлэгч</p>
                  <p className="text-ink font-mono text-sm">
                    {transaction.counterparty}
                  </p>
                </div>
              )}

              {/* Холбогдсон сурагч */}
              {transaction.matchedUser && (
                <div className="bg-success/5 px-3 py-2 rounded border border-success/20">
                  <p className="text-success text-xs font-medium mb-0.5">
                    Холбогдсон сурагч
                  </p>
                  <p className="text-success text-sm font-semibold">
                    {transaction.matchedUser.firstName}{' '}
                    {transaction.matchedUser.lastName}
                  </p>
                  <p className="text-success/70 text-xs">
                    {transaction.matchedUser.phone}
                  </p>
                </div>
              )}

              {/* Үйл ажиллагааны товчнууд (зөвхөн UNMATCHED) */}
              {transaction.matchStatus === 'UNMATCHED' && (
                <div className="flex gap-2 pt-2 border-t border-line">
                  <button
                    onClick={() => handleManualMatch(transaction)}
                    disabled={
                      !selectedUser || matchingId === transaction.id
                    }
                    className="flex-1 px-3 py-2 bg-info text-on-brand text-sm font-medium rounded hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {matchingId === transaction.id ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Холбож байна…
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Холбоо (сонгосон)
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleIgnore(transaction)}
                    disabled={matchingId === transaction.id}
                    className="px-3 py-2 bg-error/10 text-error text-sm font-medium rounded hover:bg-error/20 disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {matchingId === transaction.id ? (
                      <>
                        <span className="animate-spin">⏳</span>
                      </>
                    ) : (
                      <>
                        <X className="w-4 h-4" />
                        Үл хэлэлцэх
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Хуудаслалт */}
      {total > limit && (
        <div className="flex gap-2 justify-center pt-4">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || loading}
            className="px-3 py-1 text-sm border border-line rounded hover:bg-panel disabled:opacity-50"
          >
            Өмнөх
          </button>
          <span className="px-3 py-1 text-xs text-ink-dim">
            {Math.floor(offset / limit) + 1} /
            {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total || loading}
            className="px-3 py-1 text-sm border border-line rounded hover:bg-panel disabled:opacity-50"
          >
            Дараагийн
          </button>
        </div>
      )}

      <p className="text-xs text-ink-dim text-center">
        {total} гүйлгээ байна
      </p>
    </div>
  );
}
