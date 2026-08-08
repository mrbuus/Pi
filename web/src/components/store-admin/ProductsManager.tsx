'use client';

import { useState, useMemo } from 'react';
import { Card, SectionHeader } from '@/components/ui/Surface';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/StateBlock';
import { api } from '@/lib/api';
import { Meta, Dot } from '@/components/ui/Meta';
import { Trash2, Plus, Save, ChevronDown } from 'lucide-react';

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

interface Test {
  id: string;
  title: string;
}

interface Book {
  id: string;
  code: string;
  title: string;
}

interface ProductsManagerProps {
  products: Product[];
  tests: Test[];
  books: Book[];
  onProductsUpdate: () => void;
}

export default function ProductsManager({
  products,
  tests,
  books,
  onProductsUpdate,
}: ProductsManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKind, setNewKind] = useState<'TEST' | 'BOOK'>('TEST');
  const [newRefId, setNewRefId] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [creating, setCreating] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [savingPrices, setSavingPrices] = useState<Record<string, boolean>>({});
  const [deletingProducts, setDeletingProducts] = useState<Record<string, boolean>>({});

  const availableItems = useMemo(() => {
    const existingRefIds = products.map((p) => p.refId);
    return {
      tests: tests.filter((t) => !existingRefIds.includes(t.id)),
      books: books.filter((b) => !existingRefIds.includes(b.id)),
    };
  }, [products, tests, books]);

  async function handleCreateProduct() {
    if (!newRefId || !newPrice) {
      alert('Өнгөрүүлэх боломжгүй талбар бөглөнө');
      return;
    }

    setCreating(true);
    try {
      const price = parseInt(newPrice);
      if (price < 0) {
        alert('Үнэ сөрөг байж болохгүй');
        return;
      }

      await api('/api/store/admin/products', {
        method: 'POST',
        body: {
          kind: newKind,
          refId: newRefId,
          price,
        },
      });

      setNewKind('TEST');
      setNewRefId('');
      setNewPrice('0');
      setShowCreateForm(false);
      onProductsUpdate();
    } catch (error) {
      alert(`Алдаа: ${error instanceof Error ? error.message : 'Үл мэдэгдэх'}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdatePrice(productId: string) {
    const newPrice = editingPrices[productId];
    if (newPrice === undefined) return;

    setSavingPrices((prev) => ({ ...prev, [productId]: true }));
    try {
      await api(`/api/store/admin/products/${productId}/price`, {
        method: 'POST',
        body: { price: newPrice },
      });

      setEditingPrices((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      onProductsUpdate();
    } catch (error) {
      alert(`Алдаа: ${error instanceof Error ? error.message : 'Үл мэдэгдэх'}`);
    } finally {
      setSavingPrices((prev) => ({ ...prev, [productId]: false }));
    }
  }

  async function handleDeactivate(productId: string) {
    if (!confirm('Энэ бүтээгдэхүүнийг үнэхээр идэвхгүй болгох уу?')) return;

    setDeletingProducts((prev) => ({ ...prev, [productId]: true }));
    try {
      await api(`/api/store/admin/products/${productId}/deactivate`, {
        method: 'POST',
        body: {},
      });

      onProductsUpdate();
    } catch (error) {
      alert(`Алдаа: ${error instanceof Error ? error.message : 'Үл мэдэгдэх'}`);
    } finally {
      setDeletingProducts((prev) => ({ ...prev, [productId]: false }));
    }
  }

  const activeProducts = products.filter((p) => p.active);
  const inactiveProducts = products.filter((p) => !p.active);

  return (
    <div className="space-y-6">
      {/* Бүтээгдэхүүн үүсгэх товчлуур */}
      <div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Шинэ бүтээгдэхүүн
        </Button>
      </div>

      {/* Үүсгэх форм */}
      {showCreateForm && (
        <Card className="p-4 space-y-4 border-brand">
          <SectionHeader title="Шинэ бүтээгдэхүүн үүсгэх" />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Төрөл</label>
              <select
                value={newKind}
                onChange={(e) => {
                  setNewKind(e.target.value as 'TEST' | 'BOOK');
                  setNewRefId('');
                }}
                className="w-full px-3 py-2 text-sm border border-line rounded-md bg-panel text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="TEST">Шалгалт</option>
                <option value="BOOK">Ном</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Сонгох</label>
              <select
                value={newRefId}
                onChange={(e) => setNewRefId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-line rounded-md bg-panel text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">-- Сонгоно уу --</option>
                {newKind === 'TEST'
                  ? availableItems.tests.map((test) => (
                      <option key={test.id} value={test.id}>
                        {test.title}
                      </option>
                    ))
                  : availableItems.books.map((book) => (
                      <option key={book.id} value={book.id}>
                        {book.code} — {book.title}
                      </option>
                    ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Үнэ (₮)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-line rounded-md bg-panel text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                onClick={handleCreateProduct}
                disabled={creating || !newRefId}
                loading={creating}
                className="flex-1"
              >
                Үүсгэх
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCreateForm(false)}
                className="flex-1"
              >
                Цуцлах
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Идэвхитэй бүтээгдэхүүнүүд */}
      {activeProducts.length > 0 && (
        <div className="space-y-3">
          <SectionHeader title={`Идэвхитэй (${activeProducts.length})`} />
          <div className="space-y-2">
            {activeProducts.map((product) => (
              <Card
                key={product.id}
                className="p-4 space-y-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm line-clamp-1">
                      {product.title || 'Бүтээгдэхүүн'}
                    </h3>
                    {product.description && (
                      <p className="text-xs text-ink-dim mt-0.5 line-clamp-1">
                        {product.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-ink-dim">
                      <span>{product.kind === 'TEST' ? 'Шалгалт' : 'Ном'}</span>
                      <Dot />
                      <span>{product.purchaseCount} худалдан авалт</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingPrices[product.id] !== undefined ? (
                    <>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingPrices[product.id]}
                        onChange={(e) =>
                          setEditingPrices((prev) => ({
                            ...prev,
                            [product.id]: parseInt(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                        className="flex-1 max-w-[120px] px-3 py-2 text-sm border border-line rounded-md bg-panel text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <span className="text-sm text-ink-dim">₮</span>
                      <Button
                        size="sm"
                        onClick={() => handleUpdatePrice(product.id)}
                        disabled={savingPrices[product.id]}
                        loading={savingPrices[product.id]}
                        className="gap-1"
                      >
                        <Save className="w-3 h-3" />
                        Хадгалах
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setEditingPrices((prev) => {
                            const updated = { ...prev };
                            delete updated[product.id];
                            return updated;
                          })
                        }
                      >
                        Цуцлах
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-lg font-semibold flex-1">
                        {product.price.toLocaleString()}₮
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setEditingPrices((prev) => ({
                            ...prev,
                            [product.id]: product.price,
                          }))
                        }
                      >
                        Үнэ өөрчлөх
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleDeactivate(product.id)}
                        disabled={deletingProducts[product.id]}
                        loading={deletingProducts[product.id]}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Идэвхигүй бүтээгдэхүүнүүд */}
      {inactiveProducts.length > 0 && (
        <div className="space-y-3">
          <SectionHeader title={`Идэвхигүй (${inactiveProducts.length})`} />
          <div className="space-y-2">
            {inactiveProducts.map((product) => (
              <Card
                key={product.id}
                className="p-4 opacity-60 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm line-clamp-1">
                      {product.title || 'Бүтээгдэхүүн'}
                    </h3>
                    <p className="text-xs text-ink-dim mt-0.5">
                      Идэвхигүй · {product.purchaseCount} худалдан авалт
                    </p>
                  </div>
                  <span className="text-sm font-medium">
                    {product.price.toLocaleString()}₮
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {products.length === 0 && (
        <EmptyState
          title="Бүтээгдэхүүн байхгүй"
          hint="Шинэ бүтээгдэхүүн үүсгэж эхлүүлнэ үү"
        />
      )}
    </div>
  );
}
