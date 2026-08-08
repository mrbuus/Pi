"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Loader2, X } from "lucide-react";

interface AcknowledgeResultDialogProps {
  testResultId: string;
  testTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AcknowledgeResultDialog({
  testResultId,
  testTitle,
  isOpen,
  onClose,
  onSuccess,
}: AcknowledgeResultDialogProps) {
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && step === "verify") {
      codeInputRef.current?.focus();
    }
  }, [isOpen, step]);

  async function handleRequest() {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const response = await api<{ maskedEmail: string }>(
        `/parent/results/${testResultId}/ack/request`,
        { method: "POST" }
      );
      setMaskedEmail(response.maskedEmail);
      setStep("verify");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (loading || !code) return;
    setLoading(true);
    setError("");

    try {
      await api(`/parent/results/${testResultId}/ack/verify`, {
        method: "POST",
        body: { code },
      });
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Дүнтэй танилцлаа</h2>
            <p className="mt-1 text-sm text-ink-dim">"{testTitle}"</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-ink-dim transition hover:text-ink"
            aria-label="Хаах"
          >
            <X size={20} />
          </button>
        </div>

        {step === "request" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-dim">
              Та шалгалтын дүнтэй танилцохоор нэгдэж байна. Нэг удаагийн кодыг имэйлээр илгээх болно.
            </p>
            {error && <p className="text-sm text-error">{error}</p>}
            <button
              onClick={handleRequest}
              disabled={loading}
              className="w-full rounded-xl bg-brand-bright px-4 py-3 text-sm font-bold text-on-brand transition disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Код явуулж байна…
                </span>
              ) : (
                "Кодыг явуул"
              )}
            </button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-4">
            <p className="text-sm text-ink-dim">
              {maskedEmail} адресруу 6 оронтой код явуулсан. Кодыг оруулнуу:
            </p>
            {error && <p className="text-sm text-error">{error}</p>}
            <input
              ref={codeInputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-2xl font-bold tracking-widest outline-none focus:border-brand-bright"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setError("");
                }}
                disabled={loading}
                className="flex-1 rounded-lg border border-line px-4 py-2 text-sm font-bold transition hover:bg-panel disabled:opacity-50"
              >
                Буцах
              </button>
              <button
                onClick={handleVerify}
                disabled={loading || code.length !== 6}
                className="flex-1 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Баталгаажуулах"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
