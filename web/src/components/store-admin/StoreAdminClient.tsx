'use client';

import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Surface';
import { api } from '@/lib/api';
import ProductsManager from './ProductsManager';
import PurchaseHistory from './PurchaseHistory';
import RevenueStats from './RevenueStats';
import { LoadingState, ErrorState } from '@/components/ui/StateBlock';

interface Product {
  id: string;
  kind: 'TEST' | 'BOOK' | 'PASS';
  refId: string;
  price: number;
  active: boolean;
  title?: string;
  description?: string;
  purchaseCount: number;
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

interface RevenueSummary {
  totalPurchases: number;
  totalRevenue: number;
  confirmedRevenue: number;
  pendingRevenue: number;
}

interface Test {
  id: string;
  title: string;
}

interface Book {
  id: string;
  code: string;
  title: string;
}

export default function StoreAdminClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      setLoading(true);
      setError(null);
      const [productsRes, purchasesRes, revenueRes, testsRes, booksRes] = await Promise.all([
        api<Product[]>('/store/admin/products'),
        api<Purchase[]>('/store/admin/purchases'),
        api<RevenueSummary>('/store/admin/revenue'),
        api<Test[]>('/tests'),
        api<Book[]>('/books'),
      ]);

      if (Array.isArray(productsRes)) setProducts(productsRes);
      if (Array.isArray(purchasesRes)) setPurchases(purchasesRes);
      if (revenueRes && typeof revenueRes === 'object') setRevenue(revenueRes);
      if (Array.isArray(testsRes)) setTests(testsRes);
      if (Array.isArray(booksRes)) setBooks(booksRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Өгөгдөл ачаалахад алдаа');
      console.error('Алдаа:', err);
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={loadAllData}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Дэлгүүрийн удирдлага</h1>
        <p className="text-ink-dim mt-1">
          Бүтээгдэхүүн, үнэ, орлогын үзүүлэлтүүдийг удирдана
        </p>
      </div>

      {loading ? (
        <LoadingState rows={5} label="Өгөгдөл ачаалж байна" />
      ) : (
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">Бүтээгдэхүүнүүд</TabsTrigger>
            <TabsTrigger value="history">Худалдан авалтууд</TabsTrigger>
            <TabsTrigger value="revenue">Орлого</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
            <ProductsManager
              products={products}
              tests={tests}
              books={books}
              onProductsUpdate={loadAllData}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <PurchaseHistory purchases={purchases} />
          </TabsContent>

          <TabsContent value="revenue" className="mt-6">
            <RevenueStats
              revenue={revenue}
              purchases={purchases}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
