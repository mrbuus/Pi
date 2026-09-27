"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, LoaderCircle, Settings2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { api, getRole } from "@/lib/api";
import { useSection } from "@/components/students/progress/useSection";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/kit/card";
import { Badge } from "@/components/ui/kit/badge";

type Product = {
  id: string;
  kind: "TEST" | "BOOK" | "PASS";
  refId: string;
  price: number;
  active: boolean;
  title?: string;
  purchaseCount: number;
};
const kinds = { TEST: "Шалгалт", BOOK: "Ном", PASS: "Эрх" };
const subscribe = (notify: () => void) => {
  window.addEventListener("storage", notify);
  return () => window.removeEventListener("storage", notify);
};
function useRole() {
  return useSyncExternalStore(subscribe, getRole, () => null);
}

export function AdminStoreLink() {
  const role = useRole();
  if (role !== "ADMIN") return null;
  return (
    <Button asChild variant="outline">
      <Link href="/app/store/admin">
        <Settings2 aria-hidden />
        Бүтээгдэхүүн удирдах
      </Link>
    </Button>
  );
}

function ProductEditor({
  product,
  onUpdate,
}: {
  product: Product;
  onUpdate: (product: Product) => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [pending, setPending] = useState<"price" | "status" | null>(null);
  const [error, setError] = useState("");
  const title = product.title || `${kinds[product.kind]}: ${product.refId}`;
  async function save(kind: "price" | "status") {
    if (pending) return;
    const amount = Number(price);
    if (
      kind === "price" &&
      (!price.trim() ||
        !Number.isInteger(amount) ||
        amount < 0 ||
        amount > 2147483647)
    ) {
      setError("Үнэ 0–2,147,483,647 төгрөгийн хооронд бүхэл тоо байна.");
      return;
    }
    setPending(kind);
    setError("");
    try {
      const updated = await api<Product>(
        `/store/admin/products/${encodeURIComponent(product.id)}/${kind}`,
        {
          method: kind === "price" ? "POST" : "PATCH",
          body:
            kind === "price" ? { price: amount } : { active: !product.active },
        },
      );
      onUpdate(updated);
      toast.success(
        kind === "price"
          ? "Үнэ хадгалагдлаа."
          : "Бүтээгдэхүүний төлөв хадгалагдлаа.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Өөрчлөлтийг хадгалж чадсангүй. Дахин оролдоно уу.",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <Card role="region" aria-label={title}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{kinds[product.kind]}</Badge>
          <Badge tone={product.active ? "success" : "neutral"} className={product.active ? "text-ink" : undefined}>
            {product.active ? "Идэвхтэй" : "Идэвхгүй"}
          </Badge>
        </div>
        <CardTitle className="break-words">{title}</CardTitle>
        <p className="text-sm text-ink-dim">
          Худалдан авалт: {product.purchaseCount ?? 0}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void save("price");
          }}
          className="space-y-2"
        >
          <label
            htmlFor={`price-${product.id}`}
            className="block text-sm font-semibold"
          >
            Үнэ (₮)
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`price-${product.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={2147483647}
              step={1}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              disabled={pending !== null}
              aria-describedby={error ? `error-${product.id}` : undefined}
              className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-ink focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-60"
            />
            <Button
              type="submit"
              disabled={pending !== null || price === String(product.price)}
            >
              {pending === "price" && (
                <LoaderCircle className="animate-spin" aria-hidden />
              )}
              {pending === "price" ? "Хадгалж байна" : "Үнэ хадгалах"}
            </Button>
          </div>
        </form>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending !== null}
            onClick={() => void save("status")}
          >
            {pending === "status" && (
              <LoaderCircle className="animate-spin" aria-hidden />
            )}
            {product.active ? "Идэвхгүй болгох" : "Идэвхжүүлэх"}
          </Button>
          <p className="text-sm text-ink-dim">
            Идэвхгүй бүтээгдэхүүн дэлгүүрт харагдахгүй.
          </p>
        </div>
        {error && (
          <p
            id={`error-${product.id}`}
            role="alert"
            className="text-sm text-error"
          >
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProductList() {
  const {
    data: products,
    status,
    error,
    reload,
    setData,
  } = useSection<Product[]>("/store/admin/products", []);
  return (
    <div className="space-y-4">
      {status === "loading" && (
        <LoadingState rows={4} label="Бүтээгдэхүүн ачаалж байна" />
      )}
      {error && <div className="[&_button]:min-h-11"><ErrorState message={error} onRetry={reload} /></div>}
      {status === "ready" && products.length === 0 && (
        <EmptyState
          icon={ShoppingBag}
          title="Бүтээгдэхүүн бүртгэгдээгүй байна"
          hint="Бүтээгдэхүүн бүртгэгдсэний дараа үнэ, идэвхтэй төлөвийг энд удирдана."
        />
      )}
      {status === "ready" &&
        products.map((product) => (
          <ProductEditor
            key={`${product.id}:${product.price}`}
            product={product}
            onUpdate={(updated) =>
              setData((rows) =>
                rows.map((row) =>
                  row.id === updated.id ? { ...row, ...updated } : row,
                ),
              )
            }
          />
        ))}
    </div>
  );
}

export default function AdminProducts() {
  const role = useRole();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button asChild variant="ghost">
        <Link href="/app/store">
          <ArrowLeft aria-hidden />
          Дэлгүүр рүү буцах
        </Link>
      </Button>
      <header>
        <h1 className="text-2xl font-bold">Бүтээгдэхүүн удирдах</h1>
        <p className="mt-2 text-sm text-ink-dim">
          Үнэ болон дэлгүүрт харагдах төлөвийг өөрчилнө.
        </p>
      </header>
      {role === "ADMIN" ? (
        <ProductList />
      ) : (
        <EmptyState
          title="Хандах эрхгүй байна"
          hint="Бүтээгдэхүүний үнэ, төлөвийг зөвхөн администратор өөрчилнө."
        />
      )}
    </div>
  );
}
