"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, KeyRound } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Ажилтан (Админ/Багш+) сурагчийн утас руу нууц үг сэргээх код илгээх товч.
 *
 * Хоёр алхамтай: эхний товшилтод "итгэлтэй байна уу?" гэж асууна. Учир нь
 * илгээх бүрд SMS-ийн төлбөр гарах бөгөөд сурагчийн утас руу мессеж очно —
 * санамсаргүй товшилтоор давтагдах ёсгүй.
 *
 * ЧУХАЛ: ажилтан кодыг ХАРАХГҮЙ. Код зөвхөн сурагчийн утас руу очно.
 * Ингэснээр багш сурагчийн бүртгэлийг дангаараа булааж авах боломжгүй болно.
 */
export default function SendPasswordResetButton({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const [armed, setArmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<
    { kind: "success" | "error"; text: string } | null
  >(null);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await api<{ maskedTo: string }>(
        `/users/${studentId}/send-password-reset`,
        { method: "POST" },
      );
      setResult({
        kind: "success",
        text: `${res.maskedTo} дугаар руу сэргээх код илгээлээ. Сурагч нэвтрэх хуудасны «Нууц үгээ мартсан уу?» хэсгээс кодоо оруулна.`,
      });
      setArmed(false);
    } catch (e) {
      setResult({
        kind: "error",
        text: e instanceof Error ? e.message : "Алдаа гарлаа",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {armed ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink-dim">
            {studentName}-ийн утас руу код илгээх үү?
          </span>
          <button
            onClick={send}
            disabled={sending}
            className="rounded-lg bg-brand-bright px-3 py-2 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "Илгээж байна…" : "Тийм, илгээх"}
          </button>
          <button
            onClick={() => setArmed(false)}
            disabled={sending}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink-dim transition hover:text-ink"
          >
            Болих
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setArmed(true);
            setResult(null);
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition hover:border-brand hover:text-brand-soft"
        >
          <KeyRound className="h-4 w-4" aria-hidden />
          Нууц үг сэргээх
        </button>
      )}

      {result && (
        <p
          role="status"
          className={`flex max-w-md items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            result.kind === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
          }`}
        >
          {result.kind === "error" ? (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          )}
          {result.text}
        </p>
      )}
    </div>
  );
}
