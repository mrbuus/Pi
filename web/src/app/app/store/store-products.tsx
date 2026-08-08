'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/StateBlock';
import { SkeletonCard as Skeleton } from '@/components/ui/Skeleton';
import { Card as Surface } from '@/components/ui/Surface';
import { Meta } from '@/components/ui/Meta';
import { Button } from '@/components/ui/Button';
import { ShoppingBag, Check } from 'lucide-react';

interface Product {
  id: string;
  kind: 'TEST' | 'BOOK' | 'PASS';
  refId: string;
  price: number;
  active: boolean;
  title?: string;
  description?: string;
}

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

export default function StoreProducts() {
  const { user } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [myPurchases, setMyPurchases] = useState<Map<string, MyPurchase>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<{id: string, message: string} | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [productsRes, purchasesRes] = await Promise.all([
        api<Product[]>('/api/store/products'),
        user ? api<MyPurchase[]>('/api/store/my-purchases') : Promise.resolve([]),
      ]);

      if (Array.isArray(productsRes)) {
        setProducts(productsRes);
      }
      if (user && Array.isArray(purchasesRes)) {
        const purchaseMap = new Map(
          purchasesRes.map((p: MyPurchase) => [p.productItemId, p]),
        );
        setMyPurchases(purchaseMap);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Дэлгүүрийн өгөгдөл ачаалахад алдаа гарлаа';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(productId: string) {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setPurchasing(productId);
    setPurchaseError(null);
    try {
      const result = await api('/api/store/purchase', {
        method: 'POST',
        body: { productItemId: productId },
      });

      if (result) {
        // Миний худалдан авалтуудыг сэргээнэ
        const purchasesRes = await api('/api/store/my-purchases');
        if (Array.isArray(purchasesRes)) {
          const purchaseMap = new Map(
            purchasesRes.map((p: MyPurchase) => [p.productItemId, p]),
          );
          setMyPurchases(purchaseMap);
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Худалдан авалтад алдаа гарлаа';
      setPurchaseError({ id: productId, message: msg });
    } finally {
      setPurchasing(null);
    }
  }

  if (loading) {
    return (
      <div>
        <LoadingState rows={3} label="Дэлгүүрийн бүтээгдэхүүн" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadData}
      />
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Бүтээгдэхүүн олдсонгүй"
        hint="Одоогоор дэлгүүрт ямар ч бүтээгдэхүүн байхгүй байна"
      />
    );
  }

  // Тестүүд, номуудыг ялгаж бүлэглээ
  const tests = products.filter((p) => p.kind === 'TEST');
  const books = products.filter((p) => p.kind === 'BOOK');

  return (
    <div className="space-y-8">
      {purchaseError && (
        <ErrorState
          message={purchaseError.message}
          onRetry={() => handlePurchase(purchaseError.id)}
        />
      )}
      {/* Нэг удаагийн шалгалт */}
      {tests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Нэг удаагийн шалгалт</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tests.map((product) => {
              const isPurchased = myPurchases.has(product.id);
              return (
                <Surface
                  key={product.id}
                  className="p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="font-medium text-sm line-clamp-2">
                      {product.title || 'Шалгалт'}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-secondary mt-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {product.price.toLocaleString()}₮
                    </span>
                    {isPurchased ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                        <Check className="w-4 h-4" />
                        Авсан
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePurchase(product.id)}
                        disabled={purchasing === product.id}
                        loading={purchasing === product.id}
                      >
                        Худалдаж авах
                      </Button>
                    )}
                  </div>
                </Surface>
              );
            })}
          </div>
        </div>
      )}

      {/* Номуудын зарах хэсэг */}
      {books.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Номын дэлгүүр</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {books.map((product) => {
              const isPurchased = myPurchases.has(product.id);
              return (
                <Surface
                  key={product.id}
                  className="p-4 space-y-3 hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="font-medium text-sm line-clamp-2">
                      {product.title || 'Ном'}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-secondary mt-1">
                        {product.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">
                      {product.price.toLocaleString()}₮
                    </span>
                    {isPurchased ? (
                      <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                        <Check className="w-4 h-4" />
                        Авсан
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePurchase(product.id)}
                        disabled={purchasing === product.id}
                        loading={purchasing === product.id}
                      >
                        Худалдаж авах
                      </Button>
                    )}
                  </div>
                </Surface>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
