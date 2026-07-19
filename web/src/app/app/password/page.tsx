"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

/* Нууц үг солих — анхны нууц үг = утасны дугаар тул энэ хуудас чухал (SPEC §6.2) */
export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setOk(false);
    if (next.length < 6) {
      setMsg("Шинэ нууц үг дор хаяж 6 тэмдэгт байна");
      return;
    }
    if (next !== confirm) {
      setMsg("Шинэ нууц үг давталттайгаа таарахгүй байна");
      return;
    }
    setLoading(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword: current, newPassword: next },
      });
      setOk(true);
      setMsg("✓ Нууц үг амжилттай солигдлоо");
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => router.back(), 1200);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-extrabold">Нууц үг солих</h1>
      <p className="mt-1 text-sm text-ink-dim">
        Анхны нууц үг тань утасны дугаар байсан бол заавал солиорой.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {[
          { label: "Одоогийн нууц үг", value: current, set: setCurrent },
          { label: "Шинэ нууц үг (≥6 тэмдэгт)", value: next, set: setNext },
          { label: "Шинэ нууц үг давтах", value: confirm, set: setConfirm },
        ].map((f) => (
          <div key={f.label}>
            <label className="mb-1.5 block text-sm text-ink-dim">{f.label}</label>
            <input
              type="password"
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-bright"
            />
          </div>
        ))}
        {msg && (
          <p
            className={`rounded-lg px-3 py-2 text-sm ${ok ? "bg-teal-400/10 text-teal-300" : "bg-red-500/10 text-red-300"}`}
          >
            {msg}
          </p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-brand-bright py-3 font-bold text-white transition hover:bg-[#6190f0] disabled:opacity-50"
        >
          {loading ? "Хадгалж байна…" : "Солих"}
        </button>
      </form>
    </div>
  );
}
