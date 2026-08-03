"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api } from "@/lib/api";
import { getBookMeta } from "@/lib/bookMeta";
import {
  BANK,
  TUITION,
  bankAccountPlain,
  formatMnt,
} from "@/lib/orgInfo";

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
interface Book {
  id: string;
  code: string;
  title: string;
  problemCount?: number;
}

type Status = "loading" | "ready" | "error";

/** Нэг API дуудлагыг ачаалж байгаа/бэлэн/алдаатай гэсэн 3 төлөвт хөрвүүлж,
 * дахин оролдох боломж өгнө — амжилтгүй дуудлага "хоосон дата"-с ялгагдана. */
function useSection<T>(
  path: string,
  opts: { auth?: boolean } = {},
): { data: T | undefined; status: Status; error: string; reload: () => void } {
  const [data, setData] = useState<T>();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // Анхны төлөв аль хэдийн "loading" тул энд дахин synchronous setState
    // хийхгүй — зөвхөн амжилт/алдааны үр дүнг async callback-аас бичнэ.
    api<T>(path, { auth: opts.auth })
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Алдаа гарлаа");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
    // path/auth нь тогтмол утгуудаар дуудагддаг тул зөвхөн tick өөрчлөгдөхөд дахин ачаална.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  function reload() {
    // Дахин оролдоход товч дарах мөчид (effect биш) шууд "ачаалж байна" болгоно.
    setStatus("loading");
    setTick((t) => t + 1);
  }

  return { data, status, error, reload };
}

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
      <span>{message}</span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
      >
        Дахин оролдох
      </button>
    </div>
  );
}

function formatAmount(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("en-US");
}

export default function BuyerDashboard() {
  const passesQ = useSection<UserPass[]>("/me/passes");
  const shopQ = useSection<Pass[]>("/catalog/passes", { auth: false });
  const booksQ = useSection<Book[]>("/books", { auth: false });

  const [selected, setSelected] = useState<Pass | null>(null);
  const [amount, setAmount] = useState(""); // форматтай харагдах утга
  const [desc, setDesc] = useState("");
  const [method, setMethod] = useState<"BANK_TRANSFER" | "QPAY">("BANK_TRANSFER");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [paying, setPaying] = useState(false);

  const myPasses = passesQ.data ?? [];
  const shop = shopQ.data ?? [];
  const books = booksQ.data ?? [];

  function choosePackage(p: Pass) {
    setSelected(p);
    setDesc(p.name);
    if (p.price) setAmount(p.price.toLocaleString("en-US"));
    setMsg("");
  }

  function copyAccount() {
    navigator.clipboard?.writeText(bankAccountPlain());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /** Төлбөрийн багц сонгоход дүн болон утга автоматаар бөглөгдөнө */
  function chooseTuition(tierLabel: string, planLabel: string, amount: number) {
    setSelected(null);
    setAmount(amount.toLocaleString("en-US"));
    setDesc(`${tierLabel} — ${planLabel}`);
    setMethod("BANK_TRANSFER");
    setMsg("");
  }

  const numericAmount = parseInt(amount.replace(/\D/g, ""), 10) || 0;
  const canPay = numericAmount >= 1000;

  async function pay() {
    // Давхар дарахаас хамгаална — үгүй бол давхардсан төлбөрийн бичлэг үүснэ
    if (paying) return;
    setPaying(true);
    setMsg("");
    try {
      await api("/payments", {
        method: "POST",
        body: { amount: numericAmount, method, description: desc },
      });
      setMsg(
        method === "QPAY"
          ? "QPay нэхэмжлэх үүсгэгдлээ — төлбөр хиймэгц эрх тань автоматаар нээгдэнэ"
          : "Төлбөрийн мэдэгдэл илгээгдлээ — баталгаажмагц эрх тань нээгдэнэ",
      );
      setAmount("");
      setDesc("");
      setSelected(null);
      passesQ.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Миний эрхүүд</h1>

      {/* Идэвхтэй эрхүүд */}
      <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Идэвхтэй эрхүүд</h2>
        {passesQ.status === "loading" && (
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Эрхүүд ачаалж байна…
          </p>
        )}
        {passesQ.status === "error" && (
          <SectionError message={passesQ.error} onRetry={passesQ.reload} />
        )}
        {passesQ.status === "ready" && myPasses.length === 0 && (
          <p className="text-sm text-ink-dim">
            Одоогоор эрх байхгүй. Доорх дэлгүүрээс багц сонгоод нээлгээрэй.
          </p>
        )}
        {passesQ.status === "ready" && myPasses.length > 0 && (
          <div className="space-y-2">
            {myPasses.map((up) => {
              const active = new Date(up.expiresAt) > new Date();
              return (
                <div
                  key={up.id}
                  className="flex items-center justify-between rounded-lg border border-line px-4 py-3 text-sm"
                >
                  <span className="font-medium">{up.pass.name}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      active
                        ? "bg-success/15 text-success"
                        : "bg-error/15 text-error"
                    }`}
                  >
                    {active ? "Хүчинтэй" : "Дууссан"} · {up.expiresAt.slice(0, 10)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Номын сан — одоохондоо нэрсээр нь л (тун удахгүй тус тусад нь худалдана) */}
      <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="mb-1 font-bold text-brand-soft">Ном</h2>
        <p className="mb-4 text-sm text-ink-dim">
          Тун удахгүй ном тус бүрээр нь эрх худалдаж авах боломжтой болно
        </p>
        {booksQ.status === "loading" && (
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Ном ачаалж байна…
          </p>
        )}
        {booksQ.status === "error" && (
          <SectionError message={booksQ.error} onRetry={booksQ.reload} />
        )}
        {booksQ.status === "ready" && books.length === 0 && (
          <p className="text-sm text-ink-dim">Одоогоор ном бүртгэгдээгүй байна</p>
        )}
        {booksQ.status === "ready" && books.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {books.map((b) => {
              const meta = getBookMeta(b.code, b.title);
              return (
                <div
                  key={b.id}
                  className="rounded-xl border p-4 text-center transition hover:-translate-y-0.5"
                  style={{ borderColor: `${meta.accent}55`, background: meta.soft }}
                >
                  <p className="font-extrabold" style={{ color: meta.accent }}>
                    {meta.label}
                  </p>
                  {meta.desc && (
                    <p className="mt-1 text-xs text-ink-dim">{meta.desc}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Дэлгүүр — багц сонгоно */}
      <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="mb-1 font-bold text-brand-soft">Дэлгүүр</h2>
        <p className="mb-4 text-sm text-ink-dim">
          Багцаа сонгоход төлбөрийн мэдээлэл автоматаар бөглөгдөнө
        </p>
        {shopQ.status === "loading" && (
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Багцууд ачаалж байна…
          </p>
        )}
        {shopQ.status === "error" && (
          <SectionError message={shopQ.error} onRetry={shopQ.reload} />
        )}
        {shopQ.status === "ready" && shop.length === 0 && (
          <p className="text-sm text-ink-dim">Идэвхтэй багц алга байна</p>
        )}
        {shopQ.status === "ready" && shop.length > 0 && (
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
                      : "border-line hover:border-brand-bright/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{p.name}</p>
                    {isSel && (
                      <span className="shrink-0 rounded-full bg-brand-bright px-2 py-0.5 text-[11px] font-bold text-on-brand">
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
        )}
      </section>

      {/* Сургалтын төлбөр — төвийн албан ёсны үнэ */}
      <section className="rounded-2xl border border-line bg-panel p-6">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-bold text-brand-soft">Сургалтын төлбөр</h2>
          <p className="text-xs text-ink-dim">2026–2027 оны хичээлийн жил</p>
        </div>
        <p className="mb-5 text-sm text-ink-dim">
          Багц дээр дарвал төлбөрийн дүн доор автоматаар бөглөгдөнө.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {TUITION.map((tier) => (
            <div
              key={tier.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <h3 className="mb-3 text-lg font-extrabold">{tier.label}</h3>

              <ul className="space-y-2">
                {tier.plans.map((plan) => (
                  <li key={plan.kind}>
                    <button
                      type="button"
                      onClick={() =>
                        chooseTuition(tier.label, plan.label, plan.amount)
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition hover:border-brand-bright/60 hover:bg-brand-bright/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {plan.label}
                        </span>
                        {plan.note && (
                          <span className="block text-xs text-ink-dim">
                            {plan.note}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 font-extrabold text-brand-soft">
                        {formatMnt(plan.amount)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mt-3 rounded-lg bg-panel px-3 py-2 text-xs leading-relaxed text-ink-dim">
                <span className="font-semibold text-ink">Хуваан төлөх нөхцөл:</span>{" "}
                эхний төлөлт {formatMnt(tier.installment.firstPayment)}, үлдэгдлийг{" "}
                {tier.installment.deadline}-ноос өмнө барагдуулна.
              </p>
            </div>
          ))}
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
                  : "border-line text-ink-dim hover:text-ink"
              }`}
            >
              {m === "BANK_TRANSFER" ? "Дансаар шилжүүлэх" : "QPay-ээр төлөх"}
            </button>
          ))}
        </div>

        {/* Дансны мэдээлэл (зөвхөн дансны төлбөрт) */}
        {method === "BANK_TRANSFER" && (
          <div className="mt-4 rounded-xl border border-line bg-surface p-4">
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
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-ink-dim transition hover:text-ink"
                  >
                    {copied ? <><Check className="h-3 w-3" aria-hidden /> Хууллаа</> : "Хуулах"}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="shrink-0 text-ink-dim">IBAN</span>
                <span className="truncate font-mono text-xs">{BANK.iban}</span>
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
            <label htmlFor="buyer-amount" className="mb-1.5 block text-sm text-ink-dim">
              Төлсөн дүн
            </label>
            <div className="relative">
              <input
                id="buyer-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(formatAmount(e.target.value))}
                placeholder="0"
                className="w-full rounded-xl border border-line bg-surface py-3 pl-4 pr-10 text-lg font-bold outline-none transition focus:border-brand-bright"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-dim">
                ₮
              </span>
            </div>
            {amount && !canPay && (
              <p className="mt-1 text-xs text-warning">
                Дүн 1,000₮-өөс багагүй байх ёстой
              </p>
            )}
          </div>
          <div>
            <label htmlFor="buyer-desc" className="mb-1.5 block text-sm text-ink-dim">
              Тайлбар
            </label>
            <input
              id="buyer-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Аль багц, нэмэлт тэмдэглэл"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm outline-none transition focus:border-brand-bright"
            />
          </div>
        </div>

        <button
          onClick={pay}
          disabled={!canPay || paying}
          aria-busy={paying}
          className="mt-4 w-full rounded-xl bg-brand-bright py-3 font-bold text-on-brand transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {paying
            ? "Илгээж байна…"
            : method === "QPAY"
              ? "QPay нэхэмжлэх үүсгэх"
              : `${numericAmount ? numericAmount.toLocaleString("en-US") + " ₮ " : ""}төлсөнөө мэдэгдэх`}
        </button>

        {msg && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            <Check className="h-4 w-4" aria-hidden /> {msg}
          </p>
        )}
      </section>
    </div>
  );
}
