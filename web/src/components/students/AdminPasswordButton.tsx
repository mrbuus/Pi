"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, KeyRound } from "lucide-react";
import { api, getRole } from "@/lib/api";

/**
 * Зөвхөн Админ: хэрэглэгчийн нэвтрэх нууц үгийг шинээр тохируулна.
 * Хадгалсан нууц үг нэг чигийн hash тул ХАРАГДАХГҮЙ — шинийг тавина, эсвэл
 * утасны дугаар руу буцаана (анхны дүрэм: нууц үг = утас).
 * Багш+ энэ товчийг харахгүй.
 */
export default function AdminPasswordButton({
  userId,
  hasPhone,
}: {
  userId: string;
  hasPhone: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  if (getRole() !== "ADMIN") return null;

  async function submit(toPhone: boolean) {
    setBusy(true);
    setResult(null);
    try {
      await api(`/users/${userId}/password`, {
        method: "POST",
        body: toPhone ? {} : { password },
      });
      setResult({
        kind: "success",
        text: toPhone
          ? "Нууц үгийг утасны дугаар руу буцаалаа"
          : "Шинэ нууц үг хадгалагдлаа",
      });
      setPassword("");
      setOpen(false);
    } catch (e) {
      setResult({ kind: "error", text: e instanceof Error ? e.message : "Алдаа гарлаа" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {open ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="admin-new-password" className="sr-only">
            Шинэ нууц үг
          </label>
          <input
            id="admin-new-password"
            type="text"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Шинэ нууц үг"
            className="min-h-11 rounded-lg border border-line bg-surface px-3 text-base text-ink"
          />
          <button
            onClick={() => submit(false)}
            disabled={busy || password.length === 0}
            className="min-h-11 rounded-lg bg-brand-bright px-3 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Хадгалж байна…" : "Хадгалах"}
          </button>
          {hasPhone && (
            <button
              onClick={() => submit(true)}
              disabled={busy}
              className="min-h-11 rounded-lg border border-line px-3 text-sm text-ink-dim transition hover:border-brand hover:text-brand-soft disabled:opacity-50"
            >
              Утасны дугаар руу буцаах
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              setPassword("");
            }}
            disabled={busy}
            className="min-h-11 rounded-lg px-3 text-sm text-ink-dim transition hover:text-ink"
          >
            Болих
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setOpen(true);
            setResult(null);
          }}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-4 text-sm font-semibold text-ink-dim transition hover:border-brand hover:text-brand-soft"
        >
          <KeyRound className="h-4 w-4" aria-hidden />
          Нууц үг тохируулах
        </button>
      )}

      {result && (
        <p
          role="status"
          className={`flex max-w-md items-start gap-2 rounded-lg px-3 py-2 text-sm ${
            result.kind === "error" ? "bg-error/10 text-error" : "bg-success/10 text-success"
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
