"use client";

import { useEffect, useId, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { formatMnt } from "@/lib/orgInfo";
import { METHOD_LABEL, errMsg } from "./paymentHelpers";
import type { Payment } from "./types";

/**
 * Баталгаажсан төлбөрийг буцаах цонх — эрх (pass) автоматаар цуцлагдахыг
 * тодорхой сануулж, шалтгааныг заавал авна (POST /payments/:id/reverse).
 */
export default function ReversePaymentModal({
  open,
  payment,
  onClose,
  onReversed,
}: {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
  onReversed: () => void;
}) {
  const titleId = useId();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError(null);
  }, [open, payment]);

  if (!open || !payment) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Буцаах шалтгааныг заавал бичнэ үү");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/payments/${payment!.id}/reverse`, {
        method: "POST",
        body: { reason: reason.trim() },
      });
      onReversed();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6"
      >
        <h2 id={titleId} className="text-lg font-bold text-ink">
          Баталгаажсан төлбөр буцаах
        </h2>
        <p className="mt-2 text-sm text-ink-dim">
          {payment.user && `${payment.user.firstName} ${payment.user.lastName} · `}
          {formatMnt(payment.amount)} · {METHOD_LABEL[payment.method] ?? payment.method}
          {payment.forMonth && ` · ${payment.forMonth}`}
        </p>

        <div className="mt-4 flex gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            Буцаавал энэ төлбөрөөр олгосон ЭРХ (pass) автоматаар ЦУЦЛАГДАНА.
            Энэ үйлдлийг дараа нь буцаах боломжгүй.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor={`${titleId}-reason`}
              className="mb-1 block text-sm font-semibold text-ink"
            >
              Буцаах шалтгаан <span className="text-error">*</span>
            </label>
            <textarea
              id={`${titleId}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              placeholder="Жишээ: Сурагч буруу дансаар шилжүүлсэн тул цуцалж, дахин бүртгэнэ"
              className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink outline-none focus:border-brand"
            />
          </div>
          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition hover:text-ink"
            >
              Болих
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-error px-4 py-2 text-sm font-bold text-on-error transition disabled:opacity-60"
            >
              {saving ? "Буцааж байна…" : "Тийм, буцаах"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
