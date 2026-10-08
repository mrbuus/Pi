"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/kit/button";
import { paymentAttempt } from "./payment-attempt";
import QpayCheckout from "./QpayCheckout";
import type {
  CreatePaymentResponse,
  PaymentDetails,
  PaymentMethod,
} from "./types";

export interface QuotedPurchase {
  id: string;
  productItemId: string;
  price: number;
  grantedAt: string | null;
}
export default function StoreCheckout({
  userId,
  purchase,
  title,
  onGranted,
}: {
  userId: string;
  purchase: QuotedPurchase;
  title: string;
  onGranted: () => void;
}) {
  const key = `pi-store-checkout-v1:${userId}:${purchase.id}`;
  const [receiptId, setReceiptId] = useState<string | null>(null),
    [method, setMethod] = useState<PaymentMethod | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [granted, setGranted] = useState(false);
  const [requestId, setRequestId] = useState<string | undefined>();
  const lock = useRef(false);
  const description = `Дэлгүүр: ${title}`.slice(0, 200);
  function identify(next: PaymentMethod) {
    const id = paymentAttempt(userId, `${purchase.id}:${next}`, {
      amount: purchase.price,
      method: next,
      description,
      purchaseId: purchase.id,
    });
    localStorage.setItem(
      key,
      JSON.stringify({
        method: next,
        clientRequestId: id,
        ...(receiptId ? { paymentId: receiptId } : {}),
      }),
    );
    return id;
  }
  function chooseQpay() {
    try {
      setRequestId(identify("QPAY"));
      setMethod("QPAY");
      setError("");
    } catch {
      setError(
        "Хүсэлтийн дугаарыг хадгалж чадсангүй. Давхар төлбөрөөс сэргийлж хүсэлт илгээсэнгүй.",
      );
    }
  }
  useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (
          saved &&
          typeof saved.paymentId === "string" &&
          /^[a-zA-Z0-9_-]{1,200}$/.test(saved.paymentId)
        ) {
          setReceiptId(saved.paymentId);
          setStatus(
            "Өмнөх төлбөрийн баримт хадгалагдсан. Дахин төлөхөөс өмнө төлвийг шалгана уу.",
          );
        }
        if (!saved?.paymentId && saved?.method === "QPAY") {
          const id = paymentAttempt(userId, `${purchase.id}:QPAY`, {
            amount: purchase.price,
            method: "QPAY",
            description,
            purchaseId: purchase.id,
          });
          setRequestId(id);
          setMethod("QPAY");
        }
      } catch {
        setError(
          "Өмнөх баримтыг уншиж чадсангүй. Төлбөр хийсэн бол ажилтанд хандаарай.",
        );
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [key, userId, purchase.id, purchase.price, description]);
  function remember(payment: CreatePaymentResponse) {
    setReceiptId(payment.id);
    try {
      localStorage.setItem(key, JSON.stringify({ paymentId: payment.id }));
    } catch {
      setError(
        "Баримтыг төхөөрөмжид хадгалж чадсангүй. Доорх дугаараа тэмдэглэж аваарай.",
      );
    }
  }
  async function fulfill(paymentId: string) {
    setConfirmed(true);
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ purchase: QuotedPurchase }>(
        "/store/purchase",
        {
          method: "POST",
          body: { productItemId: purchase.productItemId, paymentId },
        },
      );
      if (!result.purchase.grantedAt)
        throw new Error(
          "Төлбөр баталгаажсан боловч бүтээгдэхүүний эрх хараахан олгогдоогүй. Баримт хэвээр хадгалагдсан.",
        );
      setGranted(true);
      setStatus("Бүтээгдэхүүний эрх олгогдлоо.");
      try {
        localStorage.removeItem(key);
      } catch {
        /* Server grant remains authoritative even when storage is blocked. */
      }
      onGranted();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Эрх олгож чадсангүй. Баримт хэвээр; дахин оролдож болно.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function check() {
    if (!receiptId || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    let receipt: PaymentDetails | undefined;
    try {
      receipt = await api<PaymentDetails>(
        `/payments/${encodeURIComponent(receiptId)}`,
      );
      if (receipt.amount < purchase.price)
        throw new Error(
          "Баримтын дүн энэ худалдан авалтын үнийн саналд хүрэхгүй байна.",
        );
      if (receipt.status !== "CONFIRMED")
        setStatus(
          receipt.status === "PENDING"
            ? "Төлбөр хүлээгдэж байна. Банкны гүйлгээ дангаараа эрх олгосон гэсэн үг биш."
            : "Төлбөр баталгаажаагүй эсвэл буцаагдсан. Ажилтанд хандаарай.",
        );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Шалгаж чадсангүй. Баримт хэвээр байна.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
    if (receipt?.status === "CONFIRMED") await fulfill(receipt.id);
  }
  async function create(next: "BANK_TRANSFER" | "CASH") {
    if (lock.current || receiptId) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const receipt = await api<CreatePaymentResponse>("/payments", {
        method: "POST",
        body: {
          clientRequestId: identify(next),
          purchaseId: purchase.id,
          amount: purchase.price,
          method: next,
          description,
        },
      });
      remember(receipt);
      setMethod(next);
      setStatus(
        "Төлбөрийн мэдэгдэл хүлээгдэж байна. Төвийн баталгаатай сувгаар данс эсвэл бэлэн төлбөрийн мэдээллээ лавлаарай; ажилтан баталгаажуулсны дараа төлвийг шалгана.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Мэдэгдэл үүсгэж чадсангүй. Үнийн санал хэвээр.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!ready) return <p role="status">Өмнөх төлбөрийн төлвийг уншиж байна…</p>;
  return (
    <section
      aria-label={`${title} төлбөр`}
      className="space-y-3 rounded-xl border border-line bg-panel p-4"
    >
      <h4 className="font-semibold">
        Хадгалсан үнийн санал: {purchase.price.toLocaleString("mn-MN")}₮
      </h4>
      <p className="text-sm text-ink-dim">
        Төлбөрийн баримт болон бүтээгдэхүүний эрхийг тусад нь шалгана. Төлбөр
        хүлээгдэж байх үед дахин төлөх шаардлагагүй.
      </p>
      {receiptId && (
        <p className="break-all text-xs text-ink-dim">
          Баримтын дугаар: {receiptId}
        </p>
      )}
      {!receiptId && !method && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={chooseQpay} disabled={busy}>
            QPay
          </Button>
          <Button
            variant="outline"
            onClick={() => void create("BANK_TRANSFER")}
            disabled={busy}
          >
            Дансаар төлөх мэдэгдэл
          </Button>
          <Button
            variant="outline"
            onClick={() => void create("CASH")}
            disabled={busy}
          >
            Бэлэн төлөх мэдэгдэл
          </Button>
        </div>
      )}
      {method === "QPAY" && !granted && (
        <QpayCheckout
          clientRequestId={requestId}
          purchaseId={purchase.id}
          amount={purchase.price}
          description={`Дэлгүүр: ${title}`.slice(0, 200)}
          onCreated={remember}
          onCancel={!receiptId ? () => setMethod(null) : undefined}
          onConfirmed={(receipt) => void fulfill(receipt.id)}
        />
      )}
      {receiptId && !granted && (
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void (confirmed ? fulfill(receiptId) : check())}
        >
          {busy
            ? "Шалгаж байна…"
            : confirmed
              ? "Эрх олголтыг дахин оролдох"
              : "Төлбөр, эрхийн төлвийг шалгах"}
        </Button>
      )}
      {status && (
        <p role="status" className="text-sm text-ink-dim">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </section>
  );
}
