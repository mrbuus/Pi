"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Hourglass,
  CheckCircle,
  Clock,
  AlertTriangle,
  Undo,
  Copy,
  Check,
  ArrowLeft,
} from "lucide-react";
import { api } from "@/lib/api";
import type {
  CreatePaymentResponse,
  PaymentDetails,
  QpayInvoiceInfo,
} from "./types";

/* ============================================================
   ТОГТМОЛУУД — poll-той холбоотой хугацаанууд
   ============================================================ */
const FAST_INTERVAL_MS = 3_000; // эхний 1 минутад 3 секунд тутам
const FAST_WINDOW_MS = 60_000; // "эхний 1 минут"-ын хэмжээ
const SLOW_INTERVAL_MS = 10_000; // үүний дараа 10 секунд тутам
const MAX_POLL_MS = 10 * 60_000; // нийт 10 минутын дараа зогсооно

type CheckoutState =
  | "creating" // нэхэмжлэх үүсгэж байна
  | "pending" // хэрэглэгчийн төлбөрийг хүлээж байна (QR/deeplink харагдана)
  | "success" // баталгаажлаа
  | "expired" // 10 минут өнгөрсөн ч хариу ирээгүй
  | "error" // нэхэмжлэх үүсгэхэд/шалгахад алдаа гарсан
  | "rejected" // ажилтан татгалзсан
  | "reversed"; // төлбөрийг эргүүлж буцаасан

/* ============================================================
   ТУСЛАХ ФУНКЦУУД
   ============================================================ */

function formatMnt(amount: number): string {
  return `${amount.toLocaleString("en-US")}₮`;
}

/** qr_image нь base64 (data URI угтвартай эсвэл угтваргүй) — img src болгож хувиргана */
function qrImageSrc(qrImage: string): string {
  if (qrImage.startsWith("data:")) return qrImage;
  return `data:image/png;base64,${qrImage}`;
}

/* ============================================================
   PROPS
   ============================================================ */

export interface QpayCheckoutProps {
  /** Төлөх дүн, төгрөгөөр (бүхэл тоо) */
  amount: number;
  /** Гүйлгээний тайлбар (жишээ нь: "10-р сарын сургалтын төлбөр") */
  description: string;
  /** Сарын төлбөрийн хувьд — аль сарынх болохыг илгээнэ */
  forMonth?: string;
  /** Нэхэмжлэлийн API дуудлагад auth токен хэрэгтэй эсэх (өгөгдмөл: тийм) */
  auth?: boolean;
  /** Төлбөр амжилттай баталгаажихад дуудагдана */
  onConfirmed?: (payment: PaymentDetails) => void;
  /** "Буцах" товч харуулах бол — жишээ нь өөр арга сонгох боломж өгөхөд */
  onCancel?: () => void;
  className?: string;
}

/**
 * QPay-ээр төлөх нэхэмжлэх үүсгэж, төлөв бэлэн болтол хянадаг компонент.
 *
 * Ажиллах дараалал: creating → pending (QR/deeplink) → success | expired | error.
 * Утасны дэлгэц дээр deeplink товчнууд ХАМГИЙН ЭХЭНД, компьютер дээр QR
 * ХАМГИЙН ЭХЭНД харагдана (доорх README-с дэлгэрэнгүй үзнэ үү).
 */
export default function QpayCheckout({
  amount,
  description,
  forMonth,
  auth = true,
  onConfirmed,
  onCancel,
  className = "",
}: QpayCheckoutProps) {
  const [state, setState] = useState<CheckoutState>("creating");
  const [invoice, setInvoice] = useState<QpayInvoiceInfo | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [manualChecking, setManualChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nonce, setNonce] = useState(0); // "Дахин оролдох" дарахад нэмэгдэж, дахин эхэлнэ
  const [successMounted, setSuccessMounted] = useState(false); // амжилтын дүрсний жижиг "pop" анимэйшнд

  // Онгойлгосон эсэхийг хадгалж, unmount дараа setState дуудахаас сэргийлнэ
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // onConfirmed нь эцэг компонентоос ирэх inline callback байж болзошгүй тул
  // ref-ээр дамжуулна — эс тэгвэл render болгонд poll-ийн useEffect дахин
  // эхэлж, 3с→10с шатлал болон 10 минутын хугацааны тоолуур дахин 0-с эхэлнэ.
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  }, [onConfirmed]);

  /* ---------- 1) Нэхэмжлэх үүсгэх ---------- */
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState("creating");
      setErrorMsg("");
      setInvoice(null);
      setPaymentId(null);
      setPaidAt(null);
      setLastCheckedAt(null);

      try {
        const res = await api<CreatePaymentResponse>("/payments", {
          method: "POST",
          body: {
            amount,
            method: "QPAY",
            description,
            ...(forMonth ? { forMonth } : {}),
          },
          auth,
        });
        if (cancelled || !aliveRef.current) return;
        setPaymentId(res.id);

        if (res.status === "CONFIRMED") {
          setState("success");
          return;
        }
        if (!res.qpay) {
          setErrorMsg(
            "QPay нэхэмжлэлийн мэдээлэл ирсэнгүй — сервер тал дээр дахин шалгаарай.",
          );
          setState("error");
          return;
        }
        setInvoice(res.qpay);
        setState("pending");
      } catch (e) {
        if (cancelled || !aliveRef.current) return;
        setErrorMsg(e instanceof Error ? e.message : "Нэхэмжлэх үүсгэхэд алдаа гарлаа");
        setState("error");
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [amount, description, forMonth, auth, nonce]);

  /* ---------- 2) Төлөв хянах нэг удаагийн шалгалт (poll болон гар шалгалт хоёуланд ашиглана) ---------- */
  const checkOnce = useCallback(async (): Promise<PaymentDetails | null> => {
    if (!paymentId) return null;
    const res = await api<PaymentDetails>(`/payments/${paymentId}`, { auth });
    return res;
  }, [paymentId, auth]);

  /* ---------- 3) Poll — 3с × 1мин, дараа нь 10с, нийт 10 минутын дараа зогсоно ---------- */
  useEffect(() => {
    if (state !== "pending" || !paymentId) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function scheduleNext(elapsedMs: number) {
      if (stopped) return;
      if (elapsedMs >= MAX_POLL_MS) {
        setState("expired");
        return;
      }
      const interval = elapsedMs < FAST_WINDOW_MS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
      timer = setTimeout(() => void tick(elapsedMs + interval), interval);
    }

    async function tick(elapsedMs: number) {
      if (stopped) return;
      try {
        const res = await checkOnce();
        if (stopped) return;
        setLastCheckedAt(new Date());
        if (!res) return;
        if (res.status === "CONFIRMED") {
          setPaidAt(res.paidAt);
          setState("success");
          onConfirmedRef.current?.(res);
          return;
        }
        if (res.status === "REJECTED") {
          setState("rejected");
          return;
        }
        if (res.status === "REVERSED") {
          setState("reversed");
          return;
        }
        // PENDING хэвээр байна — үргэлжлүүлнэ
      } catch {
        // Сүлжээний нэг товч тасалдал — чимээгүй үргэлжлүүлнэ, төлөв алдагдахгүй
      }
      scheduleNext(elapsedMs);
    }

    scheduleNext(0);

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [state, paymentId, checkOnce]);

  /* ---------- Гар аргаар шалгах ("шалгах" товч, 10 минутын дараа) ---------- */
  async function handleManualCheck() {
    if (manualChecking) return;
    setManualChecking(true);
    try {
      const res = await checkOnce();
      setLastCheckedAt(new Date());
      if (!res) return;
      if (res.status === "CONFIRMED") {
        setPaidAt(res.paidAt);
        setState("success");
        onConfirmedRef.current?.(res);
      } else if (res.status === "REJECTED") {
        setState("rejected");
      } else if (res.status === "REVERSED") {
        setState("reversed");
      }
      // хэвээр PENDING бол "expired" төлөвт үлдээд, зөвхөн сүүлд шалгасан цагийг шинэчилнэ
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Шалгахад алдаа гарлаа");
    } finally {
      setManualChecking(false);
    }
  }

  function handleRetryCreate() {
    setNonce((n) => n + 1);
  }

  // "success" төлөвт ормогц дараагийн frame-д className солигдож transition ажиллана.
  // (successMounted үргэлж false-с эхэлдэг, "success" терминал төлөв тул буцааж
  // false болгох шаардлагагүй — тиймээс энд зөвхөн rAF callback дотор л setState хийнэ.)
  useEffect(() => {
    if (state !== "success") return;
    const id = requestAnimationFrame(() => setSuccessMounted(true));
    return () => cancelAnimationFrame(id);
  }, [state]);

  function copyQrText() {
    if (!invoice) return;
    navigator.clipboard?.writeText(invoice.qrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ---------- aria-live-д зориулсан богино төлөвийн текст ---------- */
  const statusLine: Record<CheckoutState, string> = {
    creating: "Нэхэмжлэх үүсгэж байна…",
    pending: "Төлбөрийг хүлээж байна…",
    success: "Төлбөр амжилттай баталгаажлаа",
    expired: "Хугацаа дууссан — төлбөр хараахан баталгаажаагүй байна",
    error: "Алдаа гарлаа",
    rejected: "Төлбөр татгалзагдсан",
    reversed: "Төлбөр буцаагдсан",
  };

  return (
    <div className={`rounded-2xl border border-line bg-panel p-5 sm:p-6 ${className}`}>
      {/* Дэлгэцийн уншигчид зориулж — төлөв өөрчлөгдөх бүрт дуудагдана */}
      <p aria-live="polite" role="status" className="sr-only">
        {statusLine[state]}
      </p>

      {onCancel && state !== "success" && (
        <button
          type="button"
          onClick={onCancel}
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-dim underline-offset-2 hover:text-ink hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Буцах / өөр арга сонгох
        </button>
      )}

      {state === "creating" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-brand" aria-hidden="true" />
          <p className="font-bold">Нэхэмжлэх үүсгэж байна…</p>
          <p className="text-sm text-ink-dim">{formatMnt(amount)} — {description}</p>
        </div>
      )}

      {state === "pending" && invoice && (
        <div className="space-y-5">
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 text-xs font-bold text-warning">
              <Hourglass className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Төлбөрийг хүлээж байна
            </span>
            <p className="text-lg font-extrabold">{formatMnt(amount)}</p>
            <p className="text-sm text-ink-dim">{description}</p>
          </div>

          {/* Утасны дэлгэц дээр эхэнд Banks (deeplink), компьютер дээр эхэнд QR
              — эх html дараалал нь "Банкууд → QR", md:flex-col-reverse нь том
              дэлгэцэнд харагдах дарааллыг эргүүлдэг (доорх README үзнэ үү). */}
          <div className="flex flex-col gap-5 md:flex-col-reverse">
            {/* Банкны апп руу шууд орох товчнууд — ГАР УТАСНЫ ГОЛ ХЭРЭГЛЭЭ */}
            {invoice.deeplinks.length > 0 && (
              <div>
                <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-ink-dim">
                  Банкны аппаар нээх
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {invoice.deeplinks.map((d) => (
                    <a
                      key={d.name + d.link}
                      href={d.link}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface p-2.5 text-center transition hover:border-brand/50 hover:bg-brand-tint/30"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={d.logo}
                        alt=""
                        aria-hidden="true"
                        className="h-8 w-8 rounded-md object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                        }}
                      />
                      <span className="text-[11px] font-medium leading-tight text-ink">
                        {d.description || d.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* QR код — КОМПЬЮТЕРИЙН ГОЛ ХЭРЭГЛЭЭ, утсанд туслах хувилбар */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
                Эсвэл QR код уншуулах
              </p>
              {invoice.qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrImageSrc(invoice.qrImage)}
                  alt="QPay төлбөрийн QR код"
                  width={260}
                  height={260}
                  className="h-[260px] w-[260px] rounded-xl border border-line bg-white p-2"
                />
              ) : (
                <div className="w-full max-w-[320px] space-y-2 rounded-xl border border-line bg-surface p-3">
                  <p className="text-center text-xs text-ink-dim">
                    QR зураг ачаалагдсангүй — доорх кодыг банкныхаа аппад
                    гараар оруулна уу
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-lg bg-panel px-2.5 py-2 text-xs">
                      {invoice.qrText}
                    </code>
                    <button
                      type="button"
                      onClick={copyQrText}
                      className="shrink-0 rounded-lg border border-line px-2.5 py-2 text-ink-dim transition hover:text-ink"
                      aria-label="Хуулах"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-ink-dim">
            Нэхэмжлэлийн дугаар: {invoice.invoiceId}
          </p>
        </div>
      )}

      {state === "success" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full bg-success/15 transition-all duration-500 ease-out ${
              successMounted ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            <CheckCircle className="h-9 w-9 text-success" aria-hidden="true" />
          </span>
          <p className="text-lg font-extrabold text-success">Төлбөр амжилттай!</p>
          <p className="text-sm text-ink-dim">
            {formatMnt(amount)}
            {paidAt ? ` — ${new Date(paidAt).toLocaleString("mn-MN")}` : ""}
          </p>
          <p className="max-w-xs text-xs text-ink-dim">
            Эрх тань автоматаар нээгдлээ. Хуудсаа шинэчилбэл (refresh) харагдана.
          </p>
        </div>
      )}

      {state === "expired" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Clock className="h-9 w-9 text-warning" aria-hidden="true" />
          <p className="font-bold">Хугацаа дууслаа</p>
          <p className="max-w-xs text-sm text-ink-dim">
            10 минутын дотор төлбөр баталгаажсангүй. Хэрэв төлсөн бол доор
            дарж шалгаарай.
          </p>
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={manualChecking}
            aria-busy={manualChecking}
            className="mt-1 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {manualChecking ? "Шалгаж байна…" : "Шалгах"}
          </button>
          {lastCheckedAt && (
            <p className="text-[11px] text-ink-dim">
              Сүүлд шалгасан: {lastCheckedAt.toLocaleTimeString("mn-MN")}
            </p>
          )}
        </div>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertTriangle className="h-9 w-9 text-error" aria-hidden="true" />
          <p className="font-bold">Алдаа гарлаа</p>
          <p className="max-w-xs text-sm text-ink-dim">{errorMsg}</p>
          <button
            type="button"
            onClick={handleRetryCreate}
            className="mt-1 rounded-xl border border-error/40 px-5 py-2.5 text-sm font-bold text-error transition hover:bg-error/10"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      {state === "rejected" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertTriangle className="h-9 w-9 text-error" aria-hidden="true" />
          <p className="font-bold">Төлбөр татгалзагдсан</p>
          <p className="max-w-xs text-sm text-ink-dim">
            Ажилтан таны төлбөрийг баталгаажуулаагүй байна. Дэлгэрэнгүй
            мэдээлэл авахыг хүсвэл төвтэй холбогдоно уу.
          </p>
        </div>
      )}

      {state === "reversed" && (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Undo className="h-9 w-9 text-warning" aria-hidden="true" />
          <p className="font-bold">Төлбөр буцаагдсан</p>
          <p className="max-w-xs text-sm text-ink-dim">
            Энэ төлбөрийг сүүлд буцаасан байна. Дэлгэрэнгүй мэдээлэл авахыг
            хүсвэл төвтэй холбогдоно уу.
          </p>
        </div>
      )}
    </div>
  );
}
