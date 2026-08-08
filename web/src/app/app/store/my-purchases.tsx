'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { SkeletonCard as Skeleton } from '@/components/ui/Skeleton';
import { Card as Surface } from '@/components/ui/Surface';
import { ShoppingBag } from 'lucide-react';

interface MyPurchase {
  id: string;
  productItemId: string;
  kind: 'TEST' | 'BOOK' | 'PASS';
  price: number;
  grantedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  title: string;
}

export default function MyPurchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<MyPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      loadPurchases();
    }
  }, [user]);

  async function loadPurchases() {
    try {
      setLoading(true);
      setError("");
      const result = await api('/api/store/my-purchases');
      if (Array.isArray(result)) {
        setPurchases(result);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Худалдан авалтуудыг авахад алдаа гарлаа';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Нэвтэрнэ үү"
        hint="Миний худалдан авалтуудыг харахын тулд нэвтэрнэ үү"
      />
    );
  }

  if (loading) {
    return (
      <LoadingState rows={3} label="Миний худалдан авалтууд" />
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadPurchases}
      />
    );
  }

  if (purchases.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Худалдан авалт байхгүй"
        hint="Та өөрийн дэлгүүрээс ямар ч бүтээгдэхүүнийг худалдаж авааш байна"
      />
    );
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('mn-MN');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Миний авсан бүтээгдэхүүнүүд</h2>
      <div className="space-y-2">
        {purchases.map((purchase) => (
          <Surface key={purchase.id} className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-center text-sm">
              <div>
                <p className="font-medium line-clamp-1">{purchase.title}</p>
                <p className="text-xs text-secondary">{purchase.kind}</p>
              </div>
              <div className="hidden sm:block">
                <p className="font-semibold">{purchase.price.toLocaleString()}₮</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs">{formatDate(purchase.grantedAt)}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs">
                  {purchase.expiresAt ? formatDate(purchase.expiresAt) : 'Байнгалай'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-secondary">
                  {formatDate(purchase.createdAt)}
                </p>
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
