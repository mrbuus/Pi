"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, WalletCards } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/Surface";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";

type PaidUntilResponse = { paidUntil: string | null };
type PaidUntilCardProps = {
  /** Omit for the signed-in student's own payment; supply for a verified child. */
  studentId?: string;
  studentName?: string;
  paymentHref?: string;
};

function dayStamp(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function errorMessage(error: unknown) {
  if (
    error instanceof Error &&
    /403|хандах эрх|эцэг эх биш|хүүхдийн/i.test(error.message)
  )
    return "Энэ хүүхдийн төлбөрийн мэдээллийг үзэх баталгаатай холбоос алга байна.";
  return "Төлбөрийн хугацааг ачаалж чадсангүй.";
}

export default function PaidUntilCard({
  studentId,
  studentName,
  paymentHref = "/app/student/payments",
}: PaidUntilCardProps) {
  const key = studentId ?? "self";
  const [state, setState] = useState<
    | { key: string; status: "loading" }
    | { key: string; status: "error"; message: string }
    | { key: string; status: "loaded"; paidUntil: string | null }
  >({ key, status: "loading" });
  const requestSequence = useRef(0);

  const path = studentId
    ? `/tuition/paid-until/${encodeURIComponent(studentId)}`
    : "/tuition/paid-until/my";
  const request = useCallback(() => api<PaidUntilResponse>(path), [path]);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setState({ key, status: "loading" });
    try {
      const response = await request();
      if (sequence === requestSequence.current)
        setState({ key, status: "loaded", paidUntil: response.paidUntil });
    } catch (cause) {
      if (sequence === requestSequence.current)
        setState({ key, status: "error", message: errorMessage(cause) });
    }
  }, [key, request]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    request()
      .then((response) => {
        if (sequence === requestSequence.current)
          setState({ key, status: "loaded", paidUntil: response.paidUntil });
      })
      .catch((cause: unknown) => {
        if (sequence === requestSequence.current)
          setState({ key, status: "error", message: errorMessage(cause) });
      });
    return () => {
      requestSequence.current += 1;
    };
  }, [key, request]);

  const visibleState =
    state.key === key ? state : { key, status: "loading" as const };
  const title = studentName
    ? `${studentName} — төлбөрийн хугацаа`
    : "Төлбөрийн хугацаа";

  return (
    <Card className="min-w-0" padding="tight">
      <div className="mb-3 flex items-center gap-2 text-brand-soft">
        <CalendarClock className="h-5 w-5 shrink-0" aria-hidden />
        <h2 className="font-bold text-ink">{title}</h2>
      </div>
      {visibleState.status === "loading" ? (
        <LoadingState rows={2} label="Төлбөрийн хугацааг ачаалж байна" />
      ) : visibleState.status === "error" ? (
        <ErrorState
          message={visibleState.message}
          onRetry={() => void load()}
        />
      ) : !visibleState.paidUntil ? (
        <EmptyState
          icon={WalletCards}
          title="Баталгаажсан төлбөр алга"
          hint="Төлбөр баталгаажсаны дараа хугацаа энд харагдана."
          action={
            <Link
              href={paymentHref}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-on-brand transition hover:bg-brand-bright"
            >
              Төлбөр хийх
            </Link>
          }
        />
      ) : (
        (() => {
          const date = new Date(visibleState.paidUntil);
          if (Number.isNaN(date.getTime())) {
            return (
              <ErrorState
                message="Төлбөрийн огноо буруу байна."
                onRetry={() => void load()}
              />
            );
          }
          // Billing dates use the training centre's calendar, regardless of the device timezone.
          const today = new Date(Date.now() + 8 * 60 * 60 * 1000);
          const remainingDays = Math.round(
            (dayStamp(date) - dayStamp(today)) / 86_400_000,
          );
          const atRisk = remainingDays < 7;
          return (
            <div
              className={`rounded-xl border px-4 py-3 ${atRisk ? "border-warning/30 bg-warning/5" : "border-line bg-bg"}`}
            >
              <p className="text-sm text-ink-dim">Төлбөр дуусах огноо</p>
              <p
                className={`mt-1 text-xl font-extrabold ${atRisk ? "text-warning" : "text-ink"}`}
              >
                <time dateTime={visibleState.paidUntil}>
                  {`${date.getUTCFullYear()} оны ${date.getUTCMonth() + 1}-р сарын ${date.getUTCDate()}`}
                </time>
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${atRisk ? "text-warning" : "text-ink-dim"}`}
              >
                {remainingDays < 0
                  ? `${Math.abs(remainingDays)} хоногийн өмнө дууссан`
                  : remainingDays === 0
                    ? "Өнөөдөр дуусна"
                    : `${remainingDays} хоног үлдсэн`}
              </p>
            </div>
          );
        })()
      )}
    </Card>
  );
}
