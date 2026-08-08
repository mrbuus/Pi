'use client';

import { useMemo } from 'react';
import { Card, SectionHeader } from '@/components/ui/Surface';
import { EmptyState } from '@/components/ui/StateBlock';
import { Meta, Dot } from '@/components/ui/Meta';

interface RevenueSummary {
  totalPurchases: number;
  totalRevenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
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
            revenue: 0,
            confirmedCount: 0,
            confirmedRevenue: 0,
          };
        }
        acc[key].count++;
        acc[key].revenue += p.price;
        if (p.grantedAt) {
          acc[key].confirmedCount++;
          acc[key].confirmedRevenue += p.price;
        }
        return acc;
      },
      {} as Record<
        string,
        {
          title: string;
          kind: string;
          count: number;
          revenue: number;
          confirmedCount: number;
          confirmedRevenue: number;
        }
      >,
    );

    return Object.entries(groupedByProduct)
      .map(([id, stats]) => ({
        id,
        ...stats,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [purchases]);

  if (!revenue) {
    return (
      <EmptyState
        title="Орлогын мэдээлэл олдсонгүй"
        hint="Өгөгдөл ачаалахад алдаа гарсан байна"
      />
    );
  }

  const percentConfirmed =
    revenue.totalRevenue > 0
      ? Math.round((revenue.confirmedRevenue / revenue.totalRevenue) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Үндсэн үзүүлэлтүүд */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-6 space-y-2">
          <div className="text-sm text-ink-dim">Нийт орлого</div>
          <div className="text-3xl font-bold">
            {revenue.totalRevenue.toLocaleString()}₮
          </div>
          <div className="text-xs text-ink-dim mt-2">
            {revenue.totalPurchases} худалдан авалт
          </div>
        </Card>

        <Card className="p-6 space-y-2 border-success border">
          <div className="text-sm text-ink-dim">Баталгаажсан орлого</div>
          <div className="text-3xl font-bold text-success">
            {revenue.confirmedRevenue.toLocaleString()}₮
          </div>
          <div className="text-xs text-success mt-2">
            {percentConfirmed}% баталгаажсан
          </div>
        </Card>

        <Card className="p-6 space-y-2 border-warning border">
          <div className="text-sm text-ink-dim">Хүлээлтэнд байгаа орлого</div>
          <div className="text-3xl font-bold text-warning">
            {revenue.pendingRevenue.toLocaleString()}₮
          </div>
          <div className="text-xs text-ink-dim mt-2">
            Төлбөр баталгаажаагүй
          </div>
        </Card>

        <Card className="p-6 space-y-2">
          <div className="text-sm text-ink-dim">Дундаж үнэ</div>
          <div className="text-3xl font-bold">
            {revenue.totalPurchases > 0
              ? Math.round(revenue.totalRevenue / revenue.totalPurchases)
                  .toLocaleString()
              : 0}
            ₮
          </div>
          <div className="text-xs text-ink-dim mt-2">нэг худалдан авалтад</div>
        </Card>
      </div>

      {/* Бүтээгдэхүүн бүрээр */}
      {productStats.length > 0 && (
        <div className="space-y-3">
          <SectionHeader title="Бүтээгдэхүүн бүрээр" />
          <div className="space-y-2">
            {productStats.map((product) => (
              <Card key={product.id} className="p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium">{product.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-ink-dim mt-1">
                      <span>{product.kind === 'TEST' ? 'Шалгалт' : 'Ном'}</span>
                      <Dot />
                      <span>{product.count} худалдан авалт</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {product.revenue.toLocaleString()}₮
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="text-ink-dim">Бүх худалдан авалт: </span>
                    <span className="font-medium">{product.count}</span>
                  </div>
                  <div>
                    <span className="text-ink-dim">Баталгаажсан: </span>
                    <span className="font-medium text-success">{product.confirmedCount}</span>
                  </div>
                  <div>
                    <span className="text-ink-dim">Баталгаажсан орлого: </span>
                    <span className="font-medium">
                      {product.confirmedRevenue.toLocaleString()}₮
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
          title="Орлогын түүх олдсонгүй"
          hint="Одоогоор худалдан авалт байхгүй"
        />
      )}
    </div>
  );
}
