"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import LogoMark from "@/components/LogoMark";
import { api, homeForRole, setAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ accessToken: string; role: string }>(
        "/auth/login",
        { method: "POST", body: { phone, password }, auth: false },
      );
      setAuth(res.accessToken, res.role);
      router.push(homeForRole(res.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-5">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b142e] p-8">
        <div className="mb-7 flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <p className="text-lg font-extrabold">
              Pi<span className="text-brand-bright">.mn</span>
            </p>
            <p className="text-xs text-ink-dim">Шинэ ирээдүйн эзэд</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-ink-dim">
              Утасны дугаар
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="numeric"
              placeholder="99112233"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-bright"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-dim">Нууц үг</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Эхний нууц үг = утасны дугаар"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition focus:border-brand-bright"
              required
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-brand-bright py-3 font-bold text-white transition hover:bg-[#6190f0] disabled:opacity-50"
          >
            {loading ? "Нэвтэрч байна…" : "Нэвтрэх"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-ink-dim">
          Шинэ хэрэглэгч үү?{" "}
          <a href="/register" className="text-brand-soft hover:underline">
            Бүртгүүлэх
          </a>
        </p>
      </div>
    </main>
  );
}
