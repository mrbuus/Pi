"use client";

import { ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { HOMEWORK_MARK_OPTIONS, type HomeworkMark } from "./HomeworkMarkPills";

/* ============================================================================
 * Танхимын сурагчийн гэрийн даалгавар — багшийн өдрийн тэмдэглэгээ.
 *
 * Эзний шийдвэр (2026-09-26): даалгавар 2 загвартай.
 *   Танхим → багш дэвтрийг ангид шалгаад Хийсэн / Дутуу / Хийгээгүй (энд)
 *   Онлайн → сурагч зураг илгээж, багш батална (HomeworkList)
 * Өмнө нь багш тэмдэглэдэг ч сурагч өөрөө огт хардаггүй байв.
 * ========================================================================== */

interface MarkRow {
  date: string;
  status: HomeworkMark;
  comment: string | null;
  classroom: { id: string; name: string };
}

type Status = "loading" | "ready" | "error";

// JS гараг (0 = Ням). Эзний дугаарлалт өөр боловч энд зөвхөн нэр харуулна.
const WEEKDAY = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

function dayLabel(iso: string): string {
  // @db.Date нь UTC шөнө дундаар ирдэг — UTC-ээр уншихгүй бол +08 бүсэд
  // өмнөх өдөр рүү гулсахгүй ч, эсрэг бүсэд гулсана. UTC-ээр тогтвортой.
  const d = new Date(iso);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${mm}-${dd}, ${WEEKDAY[d.getUTCDay()]}`;
}

export default function MyHomeworkMarks() {
  const [rows, setRows] = useState<MarkRow[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    api<MarkRow[]>("/homework-marks/my")
      .then((data) => {
        if (!alive) return;
        setRows(data);
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

  function reload() {
    setStatus("loading");
    setError("");
    setTick((t) => t + 1);
  }

  const counts = HOMEWORK_MARK_OPTIONS.map((o) => ({
    ...o,
    count: rows.filter((r) => r.status === o.value).length,
  }));

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 sm:p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Гэрийн даалгавар</h2>
      <p className="mb-4 text-sm text-ink-dim">Сүүлийн 14 хоногт багшийн тэмдэглэсэн байдал</p>

      {status === "loading" && <LoadingState rows={4} label="Гэрийн даалгавар" />}
      {status === "error" && <ErrorState message={error} onRetry={reload} />}

      {status === "ready" && rows.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="Тэмдэглэгээ алга байна"
          hint="Багш ангид дэвтрийг чинь шалгаж тэмдэглэмэгц энд харагдана."
        />
      )}

      {status === "ready" && rows.length > 0 && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {counts.map(({ value, label, icon: Icon, count }) => (
              <span
                key={value}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm"
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                <b className="tabular-nums">{count}</b>
              </span>
            ))}
          </div>
          <ul className="divide-y divide-line">
            {rows.map((r) => {
              const opt = HOMEWORK_MARK_OPTIONS.find((o) => o.value === r.status);
              if (!opt) return null;
              const Icon = opt.icon;
              return (
                <li key={`${r.classroom.id}-${r.date}`} className="flex items-start gap-3 py-2.5">
                  <span
                    className={`mt-0.5 inline-flex h-7 min-w-24 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-xs font-semibold ${opt.selectedClass}`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {opt.label}
                  </span>
                  <div className="min-w-0 text-sm">
                    <Meta items={[dayLabel(r.date), r.classroom.name]} />
                    {r.comment && <p className="mt-0.5 text-ink-dim">{r.comment}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
