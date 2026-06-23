"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface UserPass {
  id: string;
  expiresAt: string;
  pass: { name: string; durationDays: number };
}
interface Pass {
  id: string;
  name: string;
  durationDays: number;
  price?: number;
}

// Дансны мэдээлэл — админ тохиргооноос ирэх ёстой (одоогоор жишээ)
const BANK = {
  name: "Хаан банк",
  account: "5000 1234 5678",
  holder: "Шинэ ирээдүйн эзэд ХХК",
};

function formatAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("en-US");
}

export default function BuyerDashboard() {
  const [myPasses, setMyPasses] = useState<UserPass[]>([]);
  const [shop, setShop] = useState<Pass[]>([]);
  const [selected, setSelected] = useState<Pass | null>(null);
  const [amount, setAmount] = useState(""); // форматтай харагдах утга
  const [desc, setDesc] = useState("");
  const [method, setMethod] = useState<"BANK_TRANSFER" | "QPAY">("BANK_TRANSFER");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  function load() {
    api<UserPass[]>("/me/passes").then(setMyPasses).catch(() => {});
    api<Pass[]>("/catalog/passes", { auth: false }).then(setShop).catch(() => {});
  }
  useEffect(load, []);

  function choosePackage(p: Pass) {
    setSelected(p);
    setDesc(p.name);
    if (p.price) setAmount(p.price.toLocaleString("en-US"));
    setMsg("");
  }

  function copyAccount() {
    navigator.clipboard?.writeText(BANK.account.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const numericAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const canPay = numericAmount >= 1000;

  async function pay() {
    setMsg("");
    try {
      await api("/payments", {
        method: "POST",
        body: { amount: numericAmount, method, description: desc },
      });
      setMsg(
        method === "QPAY"
          ? "✓ QPay нэхэмжлэх үүсгэгдлээ — төлбөр хиймэгц эрх тань автоматаар нээгдэнэ"
          : "✓ Төлбөрийн мэдэгдэл илгээгдлээ — баталгаажмагц эрх тань нээгдэнэ",
      );
      setAmount("");
      setDesc("");
      setSelected(null);
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Миний эрхүүд</h1>

      {/* Идэвхтэй эрхүүд */}
      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Идэвхтэй эрхүүд</h2>
        {myPasses.length === 0 && (
          <p className="text-sm text-ink-dim">
            Одоогоор эрх байхгүй. Доорх дэлгүүрээс багц сонгоод нээлгээрэй.
          </p>
        )}
        <div className="space-y-2">
          {myPasses.map((up) => {
            const active = new Date(up.expiresAt) > new Date();
            return (
              <div
                key={up.id}
                className="flex items-center justify-between rounded-lg border border-white/8 px-4 py-3 text-sm"
              >
                <span className="font-medium">{up.pass.name}</span>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    active
                      ? "bg-teal-400/15 text-teal-300"
                      : "bg-red-400/15 text-red-300"
                  }`}
                >
                  {active ? "Хүчинтэй" : "Дууссан"} · {up.expiresAt.slice(0, 10)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Дэлгүүр — багц сонгоно */}
      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-1 font-bold text-brand-soft">Дэлгүүр</h2>
        <p className="mb-4 text-sm text-ink-dim">
          Багцаа сонгоход төлбөрийн мэдээлэл автоматаар бөглөгдөнө
        </p>
        {shop.length === 0 && (
          <p className="text-sm text-ink-dim">Идэвхтэй багц алга байна</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {shop.map((p) => {
            const isSel = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => choosePackage(p)}
                className={`rounded-xl border p-4 text-left transition ${
                  isSel
                    ? "border-brand-bright bg-brand-bright/10"
                    : "border-white/8 hover:border-white/25"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{p.name}</p>
                  {isSel && (
                    <span className="shrink-0 rounded-full bg-brand-bright px-2 py-0.5 text-[11px] font-bold text-white">
                      Сонгосон
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-dim">{p.durationDays} хоног</p>
                {p.price ? (
                  <p className="mt-1 text-lg font-extrabold text-brand-soft">
                    {p.price.toLocaleString("en-US")}
                    <span className="ml-0.5">₮</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-ink-dim">Үнэ чөлөөтэй</p>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Төлбөр төлөх */}
      <section className="rounded-2xl border border-brand-bright/30 bg-brand-bright/5 p-6">
        <h2 className="font-bold text-brand-soft">Төлбөр төлөх</h2>

        {/* Төлбөрийн арга сонгох */}
        <div className="mt-4 flex gap-2">
          {(["BANK_TRANSFER", "QPAY"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                method === m
                  ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                  : "border-white/10 text-ink-dim hover:text-ink"
              }`}
            >
              {m === "BANK_TRANSFER" ? "Дансаар шилжүүлэх" : "QPay-ээр төлөх"}
            </button>
          ))}
        </div>

        {/* Дансны мэдээлэл (зөвхөн дансны төлбөрт) */}
        {method === "BANK_TRANSFER" && (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0b142e] p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-dim">
              Дараах данс руу шилжүүлээрэй
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-dim">Банк</span>
                <span className="font-medium">{BANK.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-dim">Дансны дугаар</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-semibold">
                    {BANK.account}
                  </span>
                  <button
                    onClick={copyAccount}
                    className="rounded-md bg-white/10 px-2 py-1 text-xs transition hover:bg-white/20"
                  >
                    {copied ? "Хууллаа ✓" : "Хуулах"}
                  </button>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-dim">Хүлээн авагч</span>
                <span className="font-medium">{BANK.holder}</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-dim">
              Гүйлгээний утга дээр <b>өөрийн утасны дугаар</b>-аа бичээрэй —
              баталгаажуулахад хялбар болно.
            </p>
          </div>
        )}

        {/* Дүн ба тайлбар */}
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1.5 block text-sm text-ink-dim">
              Төлсөн дүн
            </label>
            <div className="relative">
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatAmount(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-4 pr-10 text-lg font-bold outline-none transition focus:border-brand-bright"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-dim">
                ₮
              </span>
            </div>
            {amount && !canPay && (
              <p className="mt-1 text-xs text-amber-300">
                Дүн 1,000₮-өөс багагүй байх ёстой
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-dim">
              Тайлбар
            </label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Аль багц, нэмэлт тэмдэглэл"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition focus:border-brand-bright"
            />
          </div>
        </div>

        <button
          onClick={pay}
          disabled={!canPay}
          className="mt-4 w-full rounded-xl bg-brand-bright py-3 font-bold text-white transition hover:bg-[#6190f0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {method === "QPAY"
            ? "QPay нэхэмжлэх үүсгэх"
            : `${numericAmount ? numericAmount.toLocaleString("en-US") + " ₮ " : ""}төлсөнөө мэдэгдэх`}
        </button>

        {msg && (
          <p className="mt-3 rounded-lg bg-teal-400/10 px-3 py-2 text-sm text-teal-300">
            {msg}
          </p>
        )}
      </section>
    </div>
  );
}
