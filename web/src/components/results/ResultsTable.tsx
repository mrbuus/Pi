"use client";

/* ============================================================================
 * ResultsTable — багшийн "Дүнгийн жагсаалт" унших дэлгэц.
 * Нэр/оноо/хувиар эрэмбэлнэ, ангийн дундаж + тархалт, анти-чит leaveCount
 * дохио, CSV татах боломжтой.
 * ========================================================================== */

import { useMemo, useState } from "react";
import type { ResultRow } from "./types";
import { scorePercent, sourceLabel } from "./types";

type SortKey = "name" | "score" | "percent";
type SortDir = "asc" | "desc";

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function ResultsTable({
  rows,
  loading,
  error,
  onRetry,
}: {
  rows: ResultRow[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const withPct = rows.map((r) => ({ r, pct: scorePercent(r.totalScore, r.maxScore) }));
    const dir = sortDir === "asc" ? 1 : -1;
    withPct.sort((a, b) => {
      if (sortKey === "name") {
        const an = `${a.r.student.firstName} ${a.r.student.lastName}`;
        const bn = `${b.r.student.firstName} ${b.r.student.lastName}`;
        return an.localeCompare(bn, "mn") * dir;
      }
      if (sortKey === "score") {
        return (a.r.totalScore - b.r.totalScore) * dir;
      }
      // percent — maxScore=0 бичилтийг сүүлд нь тавина (харьцуулах боломжгүй тул)
      const ap = a.pct ?? -1;
      const bp = b.pct ?? -1;
      return (ap - bp) * dir;
    });
    return withPct;
  }, [rows, sortKey, sortDir]);

  const stats = useMemo(() => {
    const valid = rows.filter((r) => r.maxScore > 0);
    if (valid.length === 0) return null;
    const avgPct =
      valid.reduce((s, r) => s + (r.totalScore / r.maxScore) * 100, 0) / valid.length;
    const good = valid.filter((r) => (r.totalScore / r.maxScore) * 100 >= 80).length;
    const mid = valid.filter((r) => {
      const p = (r.totalScore / r.maxScore) * 100;
      return p >= 50 && p < 80;
    }).length;
    const low = valid.length - good - mid;
    return { avgPct: Math.round(avgPct), good, mid, low, total: valid.length };
  }, [rows]);

  function exportCsv() {
    const header = ["№", "Нэр", "Оноо", "Нийт", "Хувь", "Эх сурвалж", "Горимоос гарсан тоо"];
    const lines = [header.map(csvEscape).join(",")];
    sorted.forEach(({ r, pct }, i) => {
      lines.push(
        [
          i + 1,
          `${r.student.firstName} ${r.student.lastName}`,
          r.totalScore,
          r.maxScore,
          pct ?? "",
          sourceLabel(r.source),
          r.leaveCount ?? 0,
        ]
          .map(csvEscape)
          .join(","),
      );
    });
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dun-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function sortButton(key: SortKey, label: string) {
    const active = sortKey === key;
    const dirLabel = active ? (sortDir === "asc" ? "өсөхөөр" : "буурахаар") : "";
    return (
      <button
        type="button"
        onClick={() => toggleSort(key)}
        aria-label={`${label}-аар эрэмблэх${dirLabel ? `, одоо ${dirLabel} эрэмблэгдсэн` : ""}`}
        className="flex h-11 items-center gap-1 text-sm font-bold text-ink-dim transition hover:text-ink"
      >
        {label}
        <span aria-hidden className={active ? "text-brand" : "text-ink-dim/40"}>
          {active ? (sortDir === "asc" ? "▲" : "▼") : "▲▼"}
        </span>
      </button>
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-brand-soft">Дүнгийн жагсаалт ({rows.length})</h2>
        {rows.length > 0 && (
          <button
            type="button"
            onClick={exportCsv}
            className="h-11 rounded-lg border border-line px-4 text-base font-semibold text-ink transition hover:bg-panel"
          >
            ⬇ CSV татах
          </button>
        )}
      </div>

      {stats && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel px-4 py-3">
          <p className="text-base font-semibold text-ink">Ангийн дундаж: {stats.avgPct}%</p>
          <span className="flex items-center gap-1 text-sm text-success">
            ✓ 80%+: {stats.good}
          </span>
          <span className="flex items-center gap-1 text-sm text-warning">
            ▲ 50–79%: {stats.mid}
          </span>
          <span className="flex items-center gap-1 text-sm text-error">
            ✕ 50%-с доош: {stats.low}
          </span>
        </div>
      )}

      {loading && (
        <div className="space-y-2" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-lg border border-line bg-panel" />
          ))}
          <p className="sr-only">Дүн ачаалж байна…</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-error/30 bg-error/5 p-4">
          <p className="text-base font-semibold text-error">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 h-11 rounded-lg border border-line px-4 text-base font-semibold text-ink transition hover:bg-panel"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="rounded-lg border border-line bg-panel p-4 text-base text-ink-dim">
          Дүн алга байна
        </p>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="mb-1 flex items-center gap-3 border-b border-line px-1 pb-1">
            <span className="w-6 shrink-0" aria-hidden />
            <span className="flex-1">{sortButton("name", "Нэр")}</span>
            <span className="w-28 text-right">{sortButton("score", "Оноо")}</span>
            <span className="w-16 text-right">{sortButton("percent", "Хувь")}</span>
          </div>
          <div className="space-y-2">
            {sorted.map(({ r, pct }, i) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-4 py-2.5 text-base"
              >
                <span className="w-6 text-sm text-ink-dim">{i + 1}.</span>
                <span className="flex-1 font-medium text-ink">
                  {r.student.firstName} {r.student.lastName}
                </span>
                <span className="text-sm text-ink-dim">{sourceLabel(r.source)}</span>
                {(r.leaveCount ?? 0) > 0 && (
                  <button
                    type="button"
                    tabIndex={0}
                    aria-label={`Шалгалтын горимоос ${r.leaveCount} удаа гарсан — анти-чит дохио. Тасалбар (таб) эсвэл апп-аас гарсан тоог харуулна; өндөр тоо хуулах гэж оролдсоныг илтгэж болно.`}
                    title="Шалгалтын горимоос (таб/апп) хэдэн удаа гарснаа — өндөр тоо магадгүй хуулах гэж оролдсоныг илтгэнэ"
                    className="cursor-help rounded-lg bg-warning/15 px-2 py-1 text-sm font-bold text-warning"
                  >
                    ⚠ {r.leaveCount}
                  </button>
                )}
                <span className="w-28 text-right font-bold text-ink">
                  {r.totalScore}/{r.maxScore}
                </span>
                <span
                  className={`w-16 text-right font-bold ${
                    pct === null
                      ? "text-ink-dim"
                      : pct >= 80
                        ? "text-success"
                        : pct >= 50
                          ? "text-warning"
                          : "text-error"
                  }`}
                >
                  {pct === null ? "—" : `${pct}%`}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
