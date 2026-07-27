"use client";

import { useEffect, useId, useState } from "react";
import { api } from "@/lib/api";
import { METHOD_LABEL, errMsg } from "./paymentHelpers";
import type { Payment } from "./types";

// datetime-local input-д зориулж ISO огноог "YYYY-MM-DDTHH:mm" болгоно
function toDatetimeLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * Багш+/Админ дурын төлбөрийг засах цонх — дүн, арга, төлсөн огноо, сар,
 * тайлбар. Шалтгаан ЗААВАЛ (API-ийн UpdatePaymentDto.reason шаардлагатай,
 * before/after хамт аудит лог-д хадгалагдана — эзэмшигчийн шаардлага).
 */
export default function PaymentEditModal({
  open,
  payment,
  onClose,
  onSaved,
}: {
  open: boolean;
  payment: Payment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [paidAt, setPaidAt] = useState("");
  const [forMonth, setForMonth] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !payment) return;
    setAmount(String(payment.amount));
    setMethod(payment.method);
    setPaidAt(toDatetimeLocal(payment.paidAt));
    setForMonth(payment.forMonth ?? "");
    setDescription(payment.description ?? "");
    setReason("");
    setError(null);
  }, [open, payment]);

  if (!open || !payment) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Засварын шалтгааныг заавал бичнэ үү");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isInteger(amountNum) || amountNum <= 0) {
      setError("Дүн бүхэл, 0-ээс их тоо байх ёстой");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api(`/payments/${payment!.id}`, {
        method: "PATCH",
        body: {
          amount: amountNum,
          method,
          paidAt: paidAt ? new Date(paidAt).toISOString() : undefined,
          forMonth: forMonth || undefined,
          // Хоосон утга ч зорилготой байж болно (тайлбарыг арилгах) — "" ч явуулна,
          // зөвхөн undefined үед л сервер өөрчлөхгүй (UpdatePaymentDto @IsOptional)
          description,
          reason: reason.trim(),
        },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full rounded-lg border border-line bg-bg px-3 py-2 text-base text-ink outline-none focus:border-brand";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-ink">
              Төлбөр засах
            </h2>
            {payment.user && (
              <p className="mt-0.5 text-sm text-ink-dim">
                {payment.user.firstName} {payment.user.lastName} ·{" "}
                {payment.user.phone}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg border border-line px-2 py-1 text-sm text-ink-dim transition hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
          ⚠ Мөнгөтэй холбоотой засвар — өөрчлөлт бүр хуучин/шинэ утгын хамт
          аудит лог-д хадгалагдана.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`${titleId}-amount`}
                className="mb-1 block text-sm font-semibold text-ink"
              >
                Дүн (₮)
              </label>
              <input
                id={`${titleId}-amount`}
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor={`${titleId}-method`}
                className="mb-1 block text-sm font-semibold text-ink"
              >
                Төлбөрийн арга
              </label>
              <select
                id={`${titleId}-method`}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputCls}
              >
                {Object.entries(METHOD_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`${titleId}-paidat`}
                className="mb-1 block text-sm font-semibold text-ink"
              >
                Төлсөн огноо, цаг
              </label>
              <input
                id={`${titleId}-paidat`}
                type="datetime-local"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label
                htmlFor={`${titleId}-formonth`}
                className="mb-1 block text-sm font-semibold text-ink"
              >
                Аль сарын төлбөр
              </label>
              <input
                id={`${titleId}-formonth`}
                type="month"
                value={forMonth}
                onChange={(e) => setForMonth(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={`${titleId}-desc`}
              className="mb-1 block text-sm font-semibold text-ink"
            >
              Тайлбар
            </label>
            <textarea
              id={`${titleId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          <div>
            <label
              htmlFor={`${titleId}-reason`}
              className="mb-1 block text-sm font-semibold text-ink"
            >
              Засварын шалтгаан <span className="text-error">*</span>
            </label>
            <textarea
              id={`${titleId}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              required
              placeholder="Жишээ: Сурагч 250,000₮ илгээснийг санамсаргүй 300,000₮ гэж бичсэнийг засав"
              className={inputCls}
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error"
            >
              ⚠ {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-ink-dim transition hover:text-ink"
            >
              Цуцлах
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-60"
            >
              {saving ? "Хадгалж байна…" : "Хадгалах"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
