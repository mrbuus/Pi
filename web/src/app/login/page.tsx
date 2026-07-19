"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LogoMark from "@/components/LogoMark";
import { api, homeForRole, setAuth } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  // Утас, имэйл, username аль нэгээр нэвтэрнэ — backend /auth/login
  // "identifier" талбарыг гурвуулаа шалгадаг (auth.service.ts)
  const [identifier, setIdentifier] = useState("");
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
        { method: "POST", body: { identifier, password }, auth: false },
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
        <Link
          href="/"
          aria-label="Pi.mn үндсэн нүүр"
          className="mb-7 flex w-fit rounded-xl outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-brand-bright/70"
        >
          <LogoMark variant="full" size={58} priority />
        </Link>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-ink-dim">
              Утас, имэйл эсвэл нэвтрэх нэр
            </label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="99112233 / you@gmail.com / username"
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
