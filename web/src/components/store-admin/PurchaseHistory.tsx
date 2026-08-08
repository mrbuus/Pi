'use client';

import { useMemo, useState } from 'react';
import { Card, SectionHeader } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/StateBlock';
import { Meta, Dot } from '@/components/ui/Meta';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Purchase {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  productItemId: string;
  productKind: 'TEST' | 'BOOK' | 'PASS';
  productTitle: string;
  price: number;
  grantedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  paymentStatus: string | null;
  paymentConfirmedAt: string | null;
}

interface PurchaseHistoryProps {
  purchases: Purchase[];
}

export default function PurchaseHistory({ purchases }: PurchaseHistoryProps) {
  const [expandedPurchases, setExpandedPurchases] = useState<Set<string>>(new Set());

  const stats = useMemo(() => {
    return {
      total: purchases.length,
      totalRevenue: purchases.reduce((sum, p) => sum + p.price, 0),
      confirmed: purchases.filter((p) => p.grantedAt !== null).length,
      confirmedRevenue: purchases
        .filter((p) => p.grantedAt !== null)
        .reduce((sum, p) => sum + p.price, 0),
      pending: purchases.filter((p) => p.grantedAt === null).length,
    };
  }, [purchases]);

  const toggleExpanded = (id: string) => {
    setExpandedPurchases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const sortedPurchases = [...purchases].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Хураангуй */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <div className="text-sm text-ink-dim mb-1">Нийт худалдан авалт</div>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-ink-dim mt-1">
            {stats.totalRevenue.toLocaleString()}₮
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-ink-dim mb-1">Баталгаажсан</div>
          <div className="text-2xl font-bold text-success">{stats.confirmed}</div>
          <div className="text-xs text-ink-dim mt-1">
            {stats.confirmedRevenue.toLocaleString()}₮
          </div>
        </Card>
      </div>

      {/* Худалдан авалтын жагсаалт */}
      {sortedPurchases.length > 0 ? (
        <div className="space-y-2">
          <SectionHeader
            title={`Бүх худалдан авалт (${purchases.length})`}
          />
          {sortedPurchases.map((purchase) => {
            const isExpanded = expandedPurchases.has(purchase.id);
            const isConfirmed = purchase.grantedAt !== null;

            return (
              <Card key={purchase.id} className="overflow-hidden">
                <button
                  onClick={() => toggleExpanded(purchase.id)}
                  className="w-full p-4 text-left hover:bg-panel transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium truncate">
                          {purchase.productTitle}
                        </h3>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-surface text-ink-dim whitespace-nowrap">
                          {purchase.productKind === 'TEST' ? 'Шалгалт' : 'Ном'}
                        </span>
                        {!isConfirmed && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-warning bg-opacity-20 text-warning whitespace-nowrap">
                            Хүлээлтэнд
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-ink-dim">
                        <span className="truncate">{purchase.userName}</span>
                        <Dot />
                        <span>{formatDate(purchase.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-semibold">
                          {purchase.price.toLocaleString()}₮
                        </div>
                        {isConfirmed && (
                          <div className="text-xs text-success">Баталгаажсан</div>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-ink-dim" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-ink-dim" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Өргөтгөсөн мэдээлэл */}
                {isExpanded && (
                  <div className="px-4 py-3 bg-surface text-sm space-y-2 border-t border-line">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <span className="text-ink-dim">Хэрэглэгч: </span>
                        <span>{purchase.userName}</span>
                      </div>
                      <div>
                        <span className="text-ink-dim">Имэйл: </span>
                        <span className="truncate">{purchase.userEmail || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ink-dim">Утас: </span>
                        <span>{purchase.userPhone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-ink-dim">Үнэ: </span>
                        <span className="font-semibold">{purchase.price.toLocaleString()}₮</span>
                      </div>
                      <div>
                        <span className="text-ink-dim">Олгосон: </span>
                        <span>
                          {purchase.grantedAt
                            ? formatDate(purchase.grantedAt)
                            : 'Хүлээлтэнд'}
                        </span>
                      </div>
                      {purchase.expiresAt && (
                        <div>
                          <span className="text-ink-dim">Дуусах: </span>
                          <span>{formatDate(purchase.expiresAt)}</span>
                        </div>
                      )}
                      {purchase.paymentStatus && (
                        <div>
                          <span className="text-ink-dim">Төлбөрийн статус: </span>
                          <span className="capitalize">{purchase.paymentStatus}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Худалдан авалт олдсонгүй"
          hint="Одоогоор ямар ч худалдан авалт байхгүй"
        />
      )}
    </div>
  );
}
