"use client";

import { ChevronDown, Clock, Download, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, getRole } from "@/lib/api";
import { formatMnt } from "@/lib/orgInfo";

/* ============================================================================
 * «Ажилласан цаг» — эзний шийдвэр (2026-09-26): ажилтны төлбөрт зүгээр цагийг
 * нь тооцоход хангалттай. Эх сурвалж нь хичээлийн хуваарь (сервер цуцалсан
 * хичээл, амралтын өдрийг хасаж, зөөсөн хичээлийг шинэ цагт нь тоолно).
 * Цагийн хөлсийг ХАДГАЛАХГҮЙ — зөвхөн энд оруулж тооцоо харна (цалингийн
 * бодлого эзнийх). Удирдлага бүх багшийг, багш зөвхөн өөрийгөө харна.
 * ========================================================================== */

interface Session {
  date: string;
  classroomName: string;
  startMinute: number;
  endMinute: number;
}
interface Row {
  teacherId: string;
  teacherName: string;
  lessons: number;
  minutes: number;
  sessions: Session[];
}

type Status = "loading" | "ready" | "error";

function hm(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}
function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} цаг ${m} мин` : `${h} цаг`;
}
function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TeacherHoursClient() {
  const [month, setMonth] = useState(currentMonth);
  const [rate, setRate] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState(`${month}|${tick}`);
  if (loadedKey !== `${month}|${tick}`) {
    setLoadedKey(`${month}|${tick}`);
    setStatus("loading");
  }

  const isStaff = getRole() === "ADMIN" || getRole() === "TEACHER_PLUS";

  useEffect(() => {
    let alive = true;
    api<{ teachers: Row[] }>(`/teacher-hours${isStaff ? "" : "/me"}?month=${month}`)
      .then((r) => {
        if (!alive) return;
        setRows(r.teachers);
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
  }, [month, tick, isStaff]);

  const rateNum = Number(rate.replace(/\D/g, "")) || 0;
  const totals = useMemo(
    () => ({
      minutes: rows.reduce((s, r) => s + r.minutes, 0),
      lessons: rows.reduce((s, r) => s + r.lessons, 0),
    }),
    [rows],
  );

  function downloadCsv() {
    const lines = [["Багш", "Хичээл", "Цаг", ...(rateNum ? ["Цагийн хөлс", "Дүн"] : [])].join(",")];
    for (const r of rows) {
      const hours = (r.minutes / 60).toFixed(2);
      lines.push(
        [
          `"${r.teacherName.replace(/"/g, '""')}"`,
          r.lessons,
          hours,
          ...(rateNum ? [rateNum, Math.round((r.minutes / 60) * rateNum)] : []),
        ].join(","),
      );
    }
    // UTF-8 BOM — Excel кирилл үсгийг зөв уншина.
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bagshiin-tsag-${month}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Ажилласан цаг</h1>

      <section className="chunky p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Сар
            <input
              type="month"
              value={month}
              onChange={(e) => e.target.value && setMonth(e.target.value)}
              className="min-h-12 rounded-xl border-2 border-line bg-bg px-3 text-ink outline-none focus:border-brand"
            />
          </label>
          {isStaff && (
            <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
              Цагийн хөлс (₮, заавал биш)
              <input
                inputMode="numeric"
                value={rate}
                onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))}
                placeholder="ж: 25000"
                className="min-h-12 w-44 rounded-xl border-2 border-line bg-bg px-3 text-ink outline-none focus:border-brand"
              />
            </label>
          )}
          {isStaff && status === "ready" && rows.length > 0 && (
            <Button variant="outline" onClick={downloadCsv} className="ml-auto">
              <Download aria-hidden />
              CSV татах
            </Button>
          )}
        </div>

        {status === "ready" && rows.length > 0 && (
          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col rounded-2xl bg-accent-teal/10 p-4">
              <dt className="order-last text-xs text-ink-dim">нийт цаг</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-ink">
                <Clock className="mb-1 h-5 w-5 text-accent-teal" aria-hidden />
                {(totals.minutes / 60).toFixed(1)}
              </dd>
            </div>
            <div className="flex flex-col rounded-2xl bg-accent-violet/10 p-4">
              <dt className="order-last text-xs text-ink-dim">хичээл</dt>
              <dd className="font-display text-2xl font-bold tabular-nums text-ink">{totals.lessons}</dd>
            </div>
            {rateNum > 0 && (
              <div className="col-span-2 flex flex-col rounded-2xl bg-accent-gold/10 p-4 sm:col-span-1">
                <dt className="order-last text-xs text-ink-dim">нийт цалин (тооцоо)</dt>
                <dd className="font-display text-2xl font-bold tabular-nums text-ink">
                  <Wallet className="mb-1 h-5 w-5 text-accent-gold" aria-hidden />
                  {formatMnt(Math.round((totals.minutes / 60) * rateNum))}
                </dd>
              </div>
            )}
          </dl>
        )}
      </section>

      {status === "loading" && (
        <section className="chunky p-5">
          <LoadingState rows={4} label="Ажилласан цаг" />
        </section>
      )}
      {status === "error" && <ErrorState message={error} onRetry={() => setTick((t) => t + 1)} />}
      {status === "ready" && rows.length === 0 && (
        <EmptyState
          icon={Clock}
          title="Энэ сард хичээл алга"
          hint="Хуваарьт багш оноосон хичээл байхгүй эсвэл бүгд амралтын өдөр таарсан."
        />
      )}

      {status === "ready" && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((r) => {
            const expanded = open === r.teacherId;
            return (
              <li key={r.teacherId} className="chunky overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? null : r.teacherId)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-teal/15 font-bold text-accent-teal">
                    {r.teacherName.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-ink">{r.teacherName}</span>
                    <span className="block text-sm text-ink-dim">
                      <Meta items={[`${r.lessons} хичээл`, hoursLabel(r.minutes)]} />
                    </span>
                  </span>
                  {rateNum > 0 && (
                    <span className="shrink-0 text-right font-bold tabular-nums text-ink">
                      {formatMnt(Math.round((r.minutes / 60) * rateNum))}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-ink-dim transition-transform motion-reduce:transition-none ${expanded ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>
                {expanded && (
                  <ul className="divide-y divide-line border-t-2 border-line">
                    {r.sessions.map((s) => (
                      <li key={`${s.date}-${s.startMinute}-${s.classroomName}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                        <span className="tabular-nums text-ink">{s.date}</span>
                        <span className="min-w-0 flex-1 truncate text-ink-dim">{s.classroomName}</span>
                        <span className="tabular-nums text-ink-dim">
                          {hm(s.startMinute)}–{hm(s.endMinute)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
