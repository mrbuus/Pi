"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

interface Payment {
  id: string;
  amount: number;
  method: string;
  status: string;
  description?: string | null;
  forMonth?: string | null;
  createdAt: string;
  paidAt?: string | null;
  user: { id: string; firstName: string; lastName: string; phone: string };
}

interface Pass {
  id: string;
  name: string;
  durationDays: number;
  price?: number | null;
}

interface MonthRow {
  student: { firstName: string; lastName: string; phone: string };
  classroom: { name: string };
  paid: boolean;
}

const METHOD_LABEL: Record<string, string> = {
  QPAY: "QPay",
  BANK_TRANSFER: "Данс",
  CASH: "Бэлэн",
};

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  PENDING: { text: "Хүлээгдэж буй", cls: "bg-amber-400/15 text-amber-300" },
  CONFIRMED: { text: "Баталгаажсан", cls: "bg-teal-400/15 text-teal-300" },
  REJECTED: { text: "Цуцалсан", cls: "bg-red-400/15 text-red-300" },
};

function money(amount: number) {
  return `${amount.toLocaleString("en-US")}₮`;
}

export default function PaymentsPage() {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [pending, setPending] = useState<Payment[]>([]);
  const [recent, setRecent] = useState<Payment[]>([]);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [passPick, setPassPick] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api<Payment[]>("/payments?status=PENDING").then(setPending).catch(() => {});
    api<Payment[]>("/payments").then(setRecent).catch(() => {});
    api<Pass[]>("/catalog/passes", { auth: false }).then(setPasses).catch(() => {});
    api<MonthRow[]>(`/payments/months/${month}`).then(setMonthRows).catch(() => {});
  }, [month]);

  useEffect(load, [load]);

  const totals = useMemo(() => {
    const pendingAmount = pending.reduce((sum, p) => sum + p.amount, 0);
    const unpaid = monthRows.filter((r) => !r.paid).length;
    return { pendingAmount, unpaid };
  }, [pending, monthRows]);

  async function confirm(id: string) {
    setMsg("");
    try {
      await api(`/payments/${id}/confirm`, {
        method: "POST",
        body: {
          ...(passPick[id] ? { passId: passPick[id] } : {}),
          ...(notes[id]?.trim() ? { note: notes[id].trim() } : {}),
        },
      });
      setPassPick((m) => ({ ...m, [id]: "" }));
      setNotes((m) => ({ ...m, [id]: "" }));
      setMsg("Төлбөр баталгаажлаа");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }

  async function reject(id: string) {
    setMsg("");
    try {
      await api(`/payments/${id}/reject`, { method: "POST" });
      setMsg("Төлбөр цуцлагдлаа");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа гарлаа");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Төлбөрийн хяналт</h1>
          <p className="mt-1 text-sm text-ink-dim">
            Данс, бэлэн, QPay төлбөрийг баталгаажуулж эрх олгоно.
          </p>
        </div>
        {msg && (
          <span className="rounded-lg bg-teal-400/10 px-3 py-2 text-sm text-teal-300">
            {msg}
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/8 bg-[#0b142e] p-5">
          <p className="text-2xl font-extrabold">{pending.length}</p>
          <p className="mt-1 text-sm text-ink-dim">хүлээгдэж буй төлбөр</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#0b142e] p-5">
          <p className="text-2xl font-extrabold">{money(totals.pendingAmount)}</p>
          <p className="mt-1 text-sm text-ink-dim">баталгаажаагүй нийт дүн</p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-[#0b142e] p-5">
          <p className="text-2xl font-extrabold">{totals.unpaid}</p>
          <p className="mt-1 text-sm text-ink-dim">{month} сард төлөөгүй</p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Баталгаажуулах төлбөрүүд</h2>
        {pending.length === 0 && (
          <p className="text-sm text-ink-dim">Хүлээгдэж буй төлбөр алга</p>
        )}
        <div className="space-y-3">
          {pending.map((p) => (
            <div key={p.id} className="rounded-xl border border-white/8 p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="font-semibold">
                  {p.user.firstName} {p.user.lastName}
                </span>
                <span className="text-ink-dim">{p.user.phone}</span>
                <span className="rounded-full bg-amber-400/15 px-3 py-0.5 text-xs font-bold text-amber-300">
                  {money(p.amount)} · {METHOD_LABEL[p.method] ?? p.method}
                </span>
                {p.forMonth && <span className="text-ink-dim">{p.forMonth}</span>}
              </div>
              {p.description && (
                <p className="mt-2 text-sm text-ink-dim">{p.description}</p>
              )}
              <div className="mt-4 grid gap-2 lg:grid-cols-[1fr_1fr_auto_auto]">
                <select
                  value={passPick[p.id] ?? ""}
                  onChange={(e) =>
                    setPassPick((m) => ({ ...m, [p.id]: e.target.value }))
                  }
                  className="rounded-lg border border-white/10 bg-[#0b142e] px-3 py-2 text-sm"
                >
                  <option value="">Эрх олгохгүй</option>
                  {passes.map((pass) => (
                    <option key={pass.id} value={pass.id}>
                      {pass.name} · {pass.durationDays} хоног
                    </option>
                  ))}
                </select>
                <input
                  value={notes[p.id] ?? ""}
                  onChange={(e) =>
                    setNotes((m) => ({ ...m, [p.id]: e.target.value }))
                  }
                  placeholder="Баталгаажуулалтын тайлбар"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
                />
                <button
                  onClick={() => confirm(p.id)}
                  className="rounded-lg bg-teal-500/80 px-4 py-2 text-sm font-bold text-white"
                >
                  Батлах
                </button>
                <button
                  onClick={() => reject(p.id)}
                  className="rounded-lg border border-red-400/30 px-4 py-2 text-sm font-bold text-red-300"
                >
                  Цуцлах
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-brand-soft">Сарын төлөлт</h2>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
          />
        </div>
        <div className="space-y-2">
          {monthRows.map((r, i) => (
            <div
              key={`${r.student.phone}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 px-4 py-2.5 text-sm"
            >
              <span>
                {r.student.firstName} {r.student.lastName} ·{" "}
                <span className="text-ink-dim">
                  {r.classroom.name} · {r.student.phone}
                </span>
              </span>
              <span className={r.paid ? "text-teal-300" : "font-bold text-red-300"}>
                {r.paid ? "Төлсөн" : "Төлөөгүй"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Сүүлийн төлбөрүүд</h2>
        <div className="space-y-2">
          {recent.slice(0, 30).map((p) => {
            const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING;
            return (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/8 px-4 py-2.5 text-sm"
              >
                <span>
                  {p.user.firstName} {p.user.lastName} ·{" "}
                  <span className="text-ink-dim">
                    {money(p.amount)} · {METHOD_LABEL[p.method] ?? p.method}
                  </span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${st.cls}`}>
                  {st.text}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
