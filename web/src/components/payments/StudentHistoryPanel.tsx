"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMnt, TUITION } from "@/lib/orgInfo";
import {
  METHOD_LABEL,
  STATUS_LABEL,
  TUITION_PLAN_LABEL,
  errMsg,
} from "./paymentHelpers";
import type { Payment, StudentHistory, StudentSearchResult } from "./types";

/**
 * Сурагч хайж сонгоод, ёстой/төлсөн/үлдэгдэл дүн болон бүх төлбөрийн түүхийг
 * харуулна (GET /users/search, GET /payments/student/:id). Мөр бүрээс шууд
 * засах/буцаах боломжтой — Багш+ бүрэн эрхтэй тул хаанаас ч удирдана.
 */
export default function StudentHistoryPanel({
  onEdit,
  onReverse,
  refreshKey,
}: {
  onEdit: (p: Payment) => void;
  onReverse: (p: Payment) => void;
  refreshKey: number;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<StudentSearchResult | null>(null);
  const [history, setHistory] = useState<StudentHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;
    setHistoryLoading(true);
    setHistoryError(null);
    api<StudentHistory>(`/payments/student/${selected.id}`)
      .then(setHistory)
      .catch((e) => setHistoryError(errMsg(e)))
      .finally(() => setHistoryLoading(false));
  }, [selected, refreshKey]);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) {
      setSearchError("Хайх үг 2-оос дээш тэмдэгттэй байх ёстой");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const rows = await api<StudentSearchResult[]>(
        `/users/search?q=${encodeURIComponent(q.trim())}`,
      );
      setResults(rows);
      if (rows.length === 0) setSearchError("Сурагч олдсонгүй");
    } catch (err) {
      setSearchError(errMsg(err));
    } finally {
      setSearching(false);
    }
  }

  // Тухайн сурагчийн ёстой дүнтэй тохирох сургалтын багц — лавлагаа зорилготой
  const matchingTier =
    history && history.summary.expected > 0
      ? TUITION.find((tier) =>
          tier.plans.some((p) => p.amount === history.summary.expected),
        )
      : null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Сурагчийн төлбөрийн түүх</h2>
      <p className="mb-4 text-xs text-ink-dim">
        Нэр, код эсвэл хэрэглэгчийн нэрээр хайж, тухайн сурагчийн ёстой/төлсөн/
        үлдэгдэл дүн болон бүх төлбөрийг харна.
      </p>

      <form onSubmit={search} className="mb-4 flex flex-wrap gap-2">
        <label htmlFor="student-history-search" className="sr-only">
          Сурагч хайх
        </label>
        <input
          id="student-history-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Нэр, код эсвэл хэрэглэгчийн нэр"
          className="min-w-[200px] flex-1 rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-60"
        >
          {searching ? "Хайж байна…" : "Хайх"}
        </button>
      </form>

      {searchError && <p className="mb-3 text-sm text-error">⚠ {searchError}</p>}

      {results.length > 0 && !selected && (
        <div className="mb-4 flex flex-wrap gap-2">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setSelected(r);
                setResults([]);
              }}
              className="rounded-lg border border-line px-3 py-1.5 text-sm transition hover:border-brand"
            >
              {r.firstName} {r.lastName}
              {r.studentCode && (
                <span className="ml-1 text-ink-dim">· {r.studentCode}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {selected.firstName} {selected.lastName}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setHistory(null);
                setQ("");
              }}
              className="text-xs text-ink-dim underline hover:text-ink"
            >
              Өөр сурагч хайх
            </button>
          </div>

          {historyLoading && (
            <p className="animate-pulse text-sm text-ink-dim" role="status">
              Ачаалж байна…
            </p>
          )}
          {historyError && (
            <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
              ⚠ {historyError}
            </div>
          )}

          {!historyLoading && !historyError && history && (
            <>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-line p-4">
                  <p className="text-xs text-ink-dim">Ёстой</p>
                  <p className="text-lg font-extrabold">
                    {formatMnt(history.summary.expected)}
                  </p>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="text-xs text-ink-dim">Төлсөн</p>
                  <p className="text-lg font-extrabold text-success">
                    {formatMnt(history.summary.totalPaid)}
                  </p>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <p className="text-xs text-ink-dim">Үлдэгдэл</p>
                  <p
                    className={`text-lg font-extrabold ${
                      history.summary.outstanding > 0
                        ? "text-error"
                        : "text-success"
                    }`}
                  >
                    {formatMnt(history.summary.outstanding)}
                  </p>
                </div>
              </div>

              {/* Лавлагаа: сурагчийн ёстой дүнтэй тохирох сургалтын багц —
                  өнөөдрийг хүртэл огт байгаагүй, staff-д баримт болгож харуулна */}
              <div className="mb-4 rounded-xl border border-line p-4">
                <p className="mb-1 text-xs font-semibold text-ink-dim">
                  Сургалтын төлбөрийн лавлагаа
                  {history.tuitionPlan &&
                    ` — ${TUITION_PLAN_LABEL[history.tuitionPlan] ?? history.tuitionPlan}`}
                </p>
                {matchingTier ? (
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold">{matchingTier.label}</p>
                    {matchingTier.plans.map((p) => (
                      <div
                        key={p.kind}
                        className="flex justify-between text-ink-dim"
                      >
                        <span>{p.label}</span>
                        <span
                          className={
                            p.amount === history.summary.expected
                              ? "font-bold text-brand"
                              : ""
                          }
                        >
                          {formatMnt(p.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-dim">
                    Мэдэгдэж буй сургалтын багцтай тохирохгүй байна
                    {history.tuitionNote && ` — ${history.tuitionNote}`}
                  </p>
                )}
              </div>

              <h3 className="mb-2 text-sm font-bold">Төлбөрийн түүх</h3>
              {history.payments.length === 0 ? (
                <p className="text-sm text-ink-dim">Төлбөрийн бичлэг алга</p>
              ) : (
                <div className="space-y-2">
                  {history.payments.map((p) => {
                    const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.PENDING;
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-2.5 text-sm"
                      >
                        <span>
                          {formatMnt(p.amount)} ·{" "}
                          {METHOD_LABEL[p.method] ?? p.method}
                          {p.forMonth && ` · ${p.forMonth}`}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] ${st.cls}`}
                          >
                            {st.text}
                          </span>
                          <button
                            type="button"
                            onClick={() => onEdit(p)}
                            className="rounded-lg border border-line px-2 py-1 text-xs font-semibold transition hover:border-brand"
                          >
                            Засах
                          </button>
                          {p.status === "CONFIRMED" && (
                            <button
                              type="button"
                              onClick={() => onReverse(p)}
                              className="rounded-lg border border-error/30 px-2 py-1 text-xs font-semibold text-error transition hover:bg-error/10"
                            >
                              Буцаах
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
