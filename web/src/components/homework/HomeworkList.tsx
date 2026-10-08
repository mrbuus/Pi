"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingState, EmptyState } from "@/components/ui/StateBlock";
import HomeworkCard, { type Homework } from "./HomeworkCard";

type Status = "loading" | "ready" | "error";

/* ============================================================================
 * Сурагчийн гэрийн даалгавар тэмдэглэх хэсэг.
 *
 * API аль хэдийн бэлэн байсан (POST /assignments/:id/submit, GET /assignments/my)
 * — дутсан хэсэг нь UI: төлөвийн олон утга (icon+text), due date, зураг/тайлбар
 * хавсаргах, optimistic update + rollback, loading/empty/error/retry.
 * ========================================================================== */

export default function HomeworkList({ hideWhenEmpty = false }: { hideWhenEmpty?: boolean }) {
  const [items, setItems] = useState<Homework[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<"pending" | "history">("pending");

  useEffect(() => {
    let alive = true;
    // Анхны төлөв аль хэдийн "loading" тул энд дахин synchronous setState
    // хийхгүй — зөвхөн амжилт/алдааны үр дүнг async callback-аас бичнэ.
    api<Homework[]>("/assignments/my")
      .then((data) => {
        if (!alive) return;
        setItems(data.filter((homework) => homework.classroom.type === "ONLINE"));
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

  if (hideWhenEmpty && status === "ready" && items.length === 0) return null;

  return (
    <section className="chunky p-4 sm:p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Онлайн гэрийн даалгавар</h2>
      <p className="mb-4 text-sm text-ink-dim">
        Даалгавраа хийсний дараа энд тэмдэглээрэй — багш шалгаад баталгаажуулна.
      </p>

      {status === "loading" && <LoadingState rows={3} label="Даалгаврууд" />}

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
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Даалгавар шүүх"
          >
            <button
              type="button"
              aria-pressed={filter === "pending"}
              onClick={() => setFilter("pending")}
              className="min-h-11 rounded-lg border border-line px-3 text-sm"
            >
              Хийх, шалгуулах (
              {
                items.filter(
                  (hw) =>
                    hw.canSubmit !== false &&
                    ["NOT_DONE", "RETURNED", "SUBMITTED"].includes(hw.myStatus),
                ).length
              }
              )
            </button>
            <button
              type="button"
              aria-pressed={filter === "history"}
              onClick={() => setFilter("history")}
              className="min-h-11 rounded-lg border border-line px-3 text-sm"
            >
              Өмнөх түүх (
              {
                items.filter(
                  (hw) =>
                    hw.canSubmit === false ||
                    ["DONE_ONLINE", "DONE_IN_CLASS"].includes(hw.myStatus),
                ).length
              }
              )
            </button>
          </div>
          {!items.some((hw) =>
            filter === "pending"
              ? hw.canSubmit !== false &&
                ["NOT_DONE", "RETURNED", "SUBMITTED"].includes(hw.myStatus)
              : hw.canSubmit === false ||
                ["DONE_ONLINE", "DONE_IN_CLASS"].includes(hw.myStatus),
          ) && (
            <EmptyState
              title={
                filter === "pending"
                  ? "Хийх, шалгуулах даалгавар алга"
                  : "Өмнөх түүх хараахан алга"
              }
              hint={
                filter === "pending"
                  ? "Шалгасан болон өмнөх ангийн даалгаврыг түүхээс харж болно."
                  : "Багш даалгаврыг шалгасны дараа энд хадгалагдана."
              }
            />
          )}
          {items
            .filter((hw) =>
              filter === "pending"
                ? hw.canSubmit !== false &&
                  ["NOT_DONE", "RETURNED", "SUBMITTED"].includes(hw.myStatus)
                : hw.canSubmit === false ||
                  ["DONE_ONLINE", "DONE_IN_CLASS"].includes(hw.myStatus),
            )
            .map((hw) => (
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
