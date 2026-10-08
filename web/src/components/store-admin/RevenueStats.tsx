'use client';

import { useMemo } from 'react';
import { Card, SectionHeader } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/StateBlock';
import { Dot } from '@/components/ui/Meta';

interface RevenueSummary {
  totalPurchases: number;
  totalRevenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
  cashReceived?: number;
  confirmedReceiptCount?: number;
  totalOrderValue?: number;
  pendingQuoteValue?: number;
  awaitingFulfillmentValue?: number;
}

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

interface RevenueStatsProps {
  revenue: RevenueSummary | null;
  purchases: Purchase[];
}

export default function RevenueStats({ revenue, purchases }: RevenueStatsProps) {
  const productStats = useMemo(() => {
    if (!purchases.length) return [];

    const groupedByProduct = purchases.reduce(
      (acc, p) => {
        const key = p.productItemId;
        if (!acc[key]) {
          acc[key] = {
            title: p.productTitle,
            kind: p.productKind,
            count: 0,
            orderValue: 0,
            grantedCount: 0,
            grantedOrderValue: 0,
          };
        }
        acc[key].count++;
        acc[key].orderValue += p.price;
        if (p.grantedAt) {
          acc[key].grantedCount++;
          acc[key].grantedOrderValue += p.price;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          title: string;
          kind: string;
          count: number;
          orderValue: number;
          grantedCount: number;
          grantedOrderValue: number;
        }
      >,
    );

    return Object.entries(groupedByProduct)
      .map(([id, stats]) => ({
        id,
        ...stats,
      }))
      .sort((a, b) => b.orderValue - a.orderValue);
  }, [purchases]);

  if (!revenue) {
    return (
      <EmptyState
        title="Орлогын мэдээлэл олдсонгүй"
        hint="Өгөгдөл ачаалахад алдаа гарсан байна"
      />
    );
  }

  const money = (value: number | undefined) =>
    value == null ? '—' : `${value.toLocaleString()}₮`;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-dim">
        Захиалгын үнэ нь мөнгөн орлого биш. Доорх мөнгөн дүн нь баталгаажсан төлбөрийн баримт;
        тусдаа буцаалтыг хассан цэвэр орлого биш.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-2 p-6">
          <div className="text-sm text-ink-dim">Хүлээн авсан төлбөр</div>
          <div className="break-words text-3xl font-bold">{money(revenue.cashReceived)}</div>
          <div className="text-xs text-ink-dim">
            {revenue.confirmedReceiptCount == null ? 'Баримтын тоо тодорхойгүй' : `${revenue.confirmedReceiptCount} баталгаажсан баримт`}
          </div>
        </Card>
        <Card className="space-y-2 p-6">
          <div className="text-sm text-ink-dim">Нийт захиалгын үнийн дүн</div>
          <div className="break-words text-3xl font-bold">{money(revenue.totalOrderValue)}</div>
          <div className="text-xs text-ink-dim">{revenue.totalPurchases} захиалга</div>
        </Card>
        <Card className="space-y-2 p-6">
          <div className="text-sm text-ink-dim">Төлбөр хүлээж буй захиалгын дүн</div>
          <div className="break-words text-3xl font-bold">{money(revenue.pendingQuoteValue)}</div>
          <div className="text-xs text-ink-dim">Хүлээн авсан орлогод ороогүй</div>
        </Card>
        <Card className="space-y-2 p-6">
          <div className="text-sm text-ink-dim">Төлбөртэй, эрх олголт хүлээж буй дүн</div>
          <div className="break-words text-3xl font-bold">{money(revenue.awaitingFulfillmentValue)}</div>
          <div className="text-xs text-ink-dim">Эрх олгосон гэж тооцохгүй</div>
        </Card>
      </div>

      {/* Бүтээгдэхүүн бүрээр */}
      {productStats.length > 0 && (
        <div className="space-y-3">
          <SectionHeader title="Бүтээгдэхүүний захиалгын дүнгээр" />
          <div className="space-y-2">
            {productStats.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex flex-col items-start justify-between gap-4 mb-3 sm:flex-row">
                  <div className="flex-1">
                    <h3 className="font-medium">{product.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-ink-dim mt-1">
                      <span>{product.kind === 'TEST' ? 'Шалгалт' : product.kind === 'PASS' ? 'Багц эрх' : 'Ном'}</span>
                      <Dot />
                      <span>{product.count} худалдан авалт</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-ink-dim">Захиалгын дүн</div>
                    <div className="text-lg font-semibold">
                      {product.orderValue.toLocaleString()}₮
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-ink-dim">Бүх худалдан авалт: </span>
                    <span className="font-medium">{product.count}</span>
                  </div>
                  <div>
                    <span className="text-ink-dim">Эрх олгосон: </span>
                    <span className="font-medium text-success">{product.grantedCount}</span>
                  </div>
                  <div>
                    <span className="text-ink-dim">Эрх олгосон захиалгын дүн: </span>
                    <span className="font-medium">
                      {product.grantedOrderValue.toLocaleString()}₮
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {purchases.length === 0 && (
        <EmptyState
          title="Захиалгын түүх олдсонгүй"
          hint="Одоогоор худалдан авалт байхгүй"
        />
      )}
    </div>
  );
}
