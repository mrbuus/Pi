"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useSection } from "@/components/students/progress/useSection";
import { api } from "@/lib/api";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";

import { Card as Surface } from "@/components/ui/Surface";

import { Button } from "@/components/ui/Button";
import { ShoppingBag, Check } from "lucide-react";
import StoreCheckout, {
  type QuotedPurchase,
} from "@/components/checkout/StoreCheckout";

interface Product {
  id: string;
  kind: "TEST" | "BOOK" | "PASS";
  refId: string;
  price: number;
  active: boolean;
  title?: string;
  description?: string;
}

interface MyPurchase {
  id: string;
  productItemId: string;
  kind: "TEST" | "BOOK" | "PASS";
  price: number;
  grantedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  title: string;
}

export default function StoreProducts() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<QuotedPurchase | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const identityQuery = useSection<{ id: string } | null>(
    user ? "/auth/me" : null,
    null,
  );
  const productsQuery = useSection<Product[]>("/store/products", []);
  const purchasesQuery = useSection<MyPurchase[]>(
    user ? "/store/my-purchases" : null,
    [],
  );
  const products = productsQuery.data;
  const myPurchases = useMemo(
    () => new Map(purchasesQuery.data.map((p) => [p.productItemId, p])),
    [purchasesQuery.data],
  );
  const loading =
    authLoading ||
    (user && identityQuery.status === "loading") ||
    productsQuery.status === "loading" ||
    purchasesQuery.status === "loading";
  const error =
    identityQuery.error || productsQuery.error || purchasesQuery.error;
  function loadData() {
    identityQuery.reload();
    productsQuery.reload();
    purchasesQuery.reload();
  }

  async function handlePurchase(productId: string) {
    if (!user) {
      router.push("/login");
      return;
    }

    setPurchasing(productId);
    setPurchaseError(null);
    try {
      const result = await api<{ purchase: QuotedPurchase }>(
        "/store/purchase",
        {
          method: "POST",
          body: { productItemId: productId },
        },
      );

      if (result) {
        if (!result.purchase.grantedAt) setSelected(result.purchase);
        // Миний худалдан авалтуудыг сэргээнэ
        const purchasesRes = await api<MyPurchase[]>("/store/my-purchases");
        if (Array.isArray(purchasesRes)) {
          purchasesQuery.setData(purchasesRes);
        }
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "Худалдан авалтад алдаа гарлаа";
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
    return <ErrorState message={error} onRetry={loadData} />;
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

  const groups = [
    { kind: "TEST", title: "Нэг удаагийн шалгалт" },
    { kind: "BOOK", title: "Номын дэлгүүр" },
    { kind: "PASS", title: "Сургалтын багц" },
  ];
  return (
    <div className="space-y-8">
      {purchaseError && (
        <ErrorState
          message={purchaseError.message}
          onRetry={() => handlePurchase(purchaseError.id)}
        />
      )}
      {groups.map((group) => {
        const entries = products.filter(
          (product) => product.kind === group.kind,
        );
        return (
          entries.length > 0 && (
            <section key={group.kind} className="space-y-4">
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {entries.map((product) => {
                  const purchase = myPurchases.get(product.id);
                  const accessible =
                    !!purchase?.grantedAt &&
                    (!purchase.expiresAt ||
                      new Date(purchase.expiresAt) > new Date());
                  return (
                    <Surface key={product.id} className="min-w-0 space-y-3 p-4">
                      <h3 className="text-sm font-medium">
                        {product.title || group.title}
                      </h3>
                      {product.description && (
                        <p className="text-xs text-ink-dim">
                          {product.description}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="text-lg font-semibold">
                          {(purchase?.price ?? product.price).toLocaleString()}₮
                        </span>
                        {accessible ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                            <Check className="size-4" aria-hidden />
                            Эрх олгогдсон
                          </span>
                        ) : purchase?.grantedAt ? (
                          <span className="text-sm text-ink-dim">
                            Хугацаа дууссан
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => void handlePurchase(product.id)}
                            disabled={!!purchasing}
                            loading={purchasing === product.id}
                          >
                            {purchase
                              ? "Хүлээгдэж буй төлбөрөө нээх"
                              : "Худалдаж авах"}
                          </Button>
                        )}
                      </div>
                      {purchase && !accessible && (
                        <p className="text-sm text-ink-dim">
                          {purchase.grantedAt
                            ? "Өмнөх эрхийн хугацаа дууссан. Ажилтнаас сунгах боломжийг лавлана уу."
                            : "Худалдан авалт хүлээгдэж байна; эрх хараахан олгогдоогүй."}
                        </p>
                      )}
                      {selected?.productItemId === product.id &&
                        identityQuery.data?.id && (
                          <StoreCheckout
                            key={`${identityQuery.data.id}:${selected.id}`}
                            userId={identityQuery.data.id}
                            purchase={selected}
                            title={product.title || group.title}
                            onGranted={() => {
                              setSelected(null);
                              purchasesQuery.reload();
                            }}
                          />
                        )}
                    </Surface>
                  );
                })}
              </div>
            </section>
          )
        );
      })}
    </div>
  );
}
