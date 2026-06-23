"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface ResultRow {
  id: string;
  totalScore: number;
  maxScore: number;
  source: string;
  student: { id: string; firstName: string; lastName: string };
}

export default function TestResultsPage() {
  const params = useParams<{ id: string }>();
  const [rows, setRows] = useState<ResultRow[]>([]);
  // Гараар дүн оруулах (36+4 цаасан шалгалт)
  const [studentId, setStudentId] = useState("");
  const [total, setTotal] = useState("");
  const [max, setMax] = useState("100");
  const [msg, setMsg] = useState("");

  function load() {
    api<ResultRow[]>(`/tests/${params.id}/results`).then(setRows).catch(() => {});
  }
  useEffect(load, [params.id]);

  async function enterResult() {
    setMsg("");
    try {
      await api(`/tests/${params.id}/results`, {
        method: "POST",
        body: {
          studentId,
          totalScore: parseFloat(total),
          maxScore: parseFloat(max),
        },
      });
      setMsg("✓ Дүн орлоо");
      setStudentId("");
      setTotal("");
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Шалгалтын дүн</h1>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">
          Цаасан шалгалтын дүн гараар оруулах
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Сурагчийн ID"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
          />
          <input
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            inputMode="numeric"
            placeholder="Авсан оноо"
            className="w-28 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <input
            value={max}
            onChange={(e) => setMax(e.target.value)}
            inputMode="numeric"
            placeholder="Нийт"
            className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={enterResult}
            className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
          >
            Оруулах
          </button>
        </div>
        {msg && <p className="mt-2 text-sm text-teal-300">{msg}</p>}
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">
          Дүнгийн жагсаалт ({rows.length})
        </h2>
        {rows.length === 0 && (
          <p className="text-sm text-ink-dim">Дүн алга байна</p>
        )}
        <div className="space-y-2">
          {rows.map((r, i) => {
            const pct = Math.round((r.totalScore / r.maxScore) * 100);
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg border border-white/8 px-4 py-2.5 text-sm"
              >
                <span className="w-6 text-ink-dim">{i + 1}.</span>
                <span className="flex-1 font-medium">
                  {r.student.firstName} {r.student.lastName}
                </span>
                <span className="text-ink-dim">{r.source === "CHAPTER_EXAM" ? "Цаасан" : "Онлайн"}</span>
                <span className="font-bold">
                  {r.totalScore}/{r.maxScore}
                </span>
                <span
                  className={`w-12 text-right font-bold ${
                    pct >= 80
                      ? "text-teal-300"
                      : pct >= 50
                        ? "text-amber-300"
                        : "text-red-300"
                  }`}
                >
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
