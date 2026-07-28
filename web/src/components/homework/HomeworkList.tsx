"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import HomeworkCard, { type Homework } from "./HomeworkCard";

type Status = "loading" | "ready" | "error";

/* ============================================================================
 * Сурагчийн гэрийн даалгавар тэмдэглэх хэсэг.
 *
 * API аль хэдийн бэлэн байсан (POST /assignments/:id/submit, GET /assignments/my)
 * — дутсан хэсэг нь UI: төлөвийн олон утга (icon+text), due date, зураг/тайлбар
 * хавсаргах, optimistic update + rollback, loading/empty/error/retry.
 * ========================================================================== */

export default function HomeworkList() {
  const [items, setItems] = useState<Homework[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // Анхны төлөв аль хэдийн "loading" тул энд дахин synchronous setState
    // хийхгүй — зөвхөн амжилт/алдааны үр дүнг async callback-аас бичнэ.
    api<Homework[]>("/assignments/my")
      .then((data) => {
        if (!alive) return;
        setItems(data);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [tick]);

  function load() {
    // Дахин оролдоход товч дарах мөчид (effect биш) шууд "ачаалж байна" болгоно.
    setStatus("loading");
    setError("");
    setTick((t) => t + 1);
  }

  function updateItem(id: string, patch: Partial<Homework>) {
    setItems((list) =>
      list.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Гэрийн даалгавар</h2>
      <p className="mb-4 text-sm text-ink-dim">
        Даалгавраа хийсний дараа энд тэмдэглээрэй — багш шалгаад баталгаажуулна.
      </p>

      {status === "loading" && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Даалгаврууд ачаалж байна…
        </p>
      )}

      {status === "error" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          <span>{error}</span>
          <button
            type="button"
            onClick={load}
            className="min-h-[44px] shrink-0 rounded-lg border border-error/40 px-4 text-sm font-semibold text-error transition hover:bg-error/10"
          >
            Дахин оролдох
          </button>
        </div>
      )}

      {status === "ready" && items.length === 0 && (
        <div className="rounded-xl border border-line bg-surface p-6 text-center text-sm text-ink-dim">
          Одоогоор өгөгдсөн даалгавар алга байна.
          <br />
          Багш даалгавар өгмөгц энд харагдаж, та тэмдэглэх боломжтой болно.
        </div>
      )}

      {status === "ready" && items.length > 0 && (
        <div className="space-y-3">
          {items.map((hw) => (
            <HomeworkCard
              key={hw.id}
              homework={hw}
              onUpdate={(patch) => updateItem(hw.id, patch)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
