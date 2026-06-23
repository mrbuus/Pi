"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LogoMark from "@/components/LogoMark";
import { api, homeForRole, setAuth } from "@/lib/api";

type Kind = "CLASSROOM" | "ONLINE" | "PARENT" | "BUYER";

const KINDS: { value: Kind; title: string; desc: string }[] = [
  {
    value: "CLASSROOM",
    title: "Танхимын сурагч",
    desc: "Сургалтын төвд суралцдаг — багшаас өнөөдрийн код авна",
  },
  {
    value: "ONLINE",
    title: "Онлайн сурагч",
    desc: "Гэрээсээ өөрийн хурдаар — эрх аваад шууд суралцана",
  },
  {
    value: "BUYER",
    title: "Зүгээр үзэх",
    desc: "Бодлого, ном, тестийг багцаар худалдаж авна",
  },
  {
    value: "PARENT",
    title: "Эцэг эх",
    desc: "Хүүхдийнхээ ирц, даалгавар, шалгалтын дүнг харна",
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("CLASSROOM");
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    phone: "",
    grade: "12",
    school: "",
    activationCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        phone: form.phone,
        firstName: form.firstName,
        lastName: form.lastName,
      };
      if (kind === "PARENT") {
        body.asParent = true;
      }
      if (kind !== "BUYER" && kind !== "PARENT") {
        body.studentType = kind;
        body.grade = parseInt(form.grade, 10);
        if (form.school) body.school = form.school;
      }
      if (kind === "CLASSROOM") body.activationCode = form.activationCode;

      const res = await api<{ accessToken: string; role: string }>(
        "/auth/register",
        { method: "POST", body, auth: false },
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
    <main className="relative flex min-h-screen items-center justify-center px-5 py-10">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0b142e] p-8">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <p className="text-lg font-extrabold">
              Pi<span className="text-brand-bright">.mn</span> бүртгүүлэх
            </p>
            <p className="text-xs text-ink-dim">Шинэ ирээдүйн эзэд</p>
          </div>
        </div>

        {/* Төрөл сонгох */}
        <div className="mb-5 space-y-2">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              onClick={() => setKind(k.value)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                kind === k.value
                  ? "border-brand-bright bg-brand-bright/10"
                  : "border-white/10 hover:border-white/25"
              }`}
            >
              <p className="text-sm font-semibold">{k.title}</p>
              <p className="mt-0.5 text-xs text-ink-dim">{k.desc}</p>
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Овог"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-bright"
              required
            />
            <input
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="Нэр"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-bright"
              required
            />
          </div>
          <input
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            inputMode="numeric"
            placeholder="Утасны дугаар (8 орон)"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-bright"
            required
          />

          {kind !== "BUYER" && kind !== "PARENT" && (
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.grade}
                onChange={(e) => set("grade", e.target.value)}
                className="rounded-xl border border-white/10 bg-[#0b142e] px-3 py-2.5 text-sm outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    {g}-р анги
                  </option>
                ))}
              </select>
              <input
                value={form.school}
                onChange={(e) => set("school", e.target.value)}
                placeholder="Сургууль"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-bright"
              />
            </div>
          )}

          {kind === "CLASSROOM" && (
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
              <input
                value={form.activationCode}
                onChange={(e) => set("activationCode", e.target.value)}
                inputMode="numeric"
                placeholder="Багшаас авсан код (ж: 20260613)"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-brand-bright"
                required
              />
              <p className="mt-2 text-xs text-amber-200/70">
                Танхимын ангид бүртгүүлэхэд багшаас өнөөдрийн кодыг авах шаардлагатай
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-brand-bright py-3 font-bold text-white transition hover:bg-[#6190f0] disabled:opacity-50"
          >
            {loading ? "Бүртгэж байна…" : "Бүртгүүлэх"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-dim">
          Бүртгэлтэй юу?{" "}
          <Link href="/login" className="text-brand-soft hover:underline">
            Нэвтрэх
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-ink-dim">
          Эхний нууц үг тань утасны дугаар тань байна
        </p>
      </div>
    </main>
  );
}
