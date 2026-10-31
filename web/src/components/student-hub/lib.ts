"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ApiError, api } from "@/lib/api";
import { formatMnDate } from "@/lib/dateMn";
import { todayUBKey } from "@/components/schedule/types";
import type { HubDay, HubDaysResponse } from "./types";

/* ───────── Огноо (YYYY-MM-DD түлхүүр, Улаанбаатарын өдөр) ───────── */

export const todayKey = todayUBKey;
export const dayKey = (iso: string) => iso.slice(0, 10);
export const currentMonth = () => todayUBKey().slice(0, 7);

/** «10-р сарын 23, Баасан» */
export function dayTitle(key: string): string {
  return formatMnDate(dayKey(key), { month: "long", day: "numeric", weekday: "long" });
}
/** «10-р сарын 23» */
export function dayShort(key: string): string {
  return formatMnDate(dayKey(key), { month: "long", day: "numeric" });
}
/** «Ба» */
export function weekdayShort(key: string): string {
  return formatMnDate(dayKey(key), { weekday: "short" });
}
/** «2026-10» → «2026 оны 10-р сар» */
export function monthTitle(month: string): string {
  return formatMnDate(`${month}-01`, { year: "numeric", month: "long" });
}
/** 600 → «10:00» */
export function hm(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}
export function timeRange(start: number | null, end: number | null): string | null {
  if (start == null) return null;
  return end == null ? hm(start) : `${hm(start)}–${hm(end)}`;
}

/** Хичээлийн өдрийн дэлгэрэнгүй цонхны холбоос (линкээр хуваалцаж болно) */
export function dayHref(day: Pick<HubDay, "date" | "classroomId">, tab?: string): string {
  const q = new URLSearchParams();
  if (tab) q.set("tab", tab);
  q.set("day", dayKey(day.date));
  q.set("c", day.classroomId);
  return `/app/my-class?${q.toString()}`;
}

export function errorText(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Мэдээлэл ачаалагдсангүй";
}

/* ───────── Нэг дуудлагын төлөв: ачаалж буй / бэлэн / алдаа ───────── */

export type LoadStatus = "loading" | "ready" | "error";

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{ path: string | null; data?: T; status: LoadStatus; error: string; code?: number }>(
    { path: null, status: "loading", error: "" },
  );
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path)
      .then((data) => alive && setState({ path, data, status: "ready", error: "" }))
      .catch(
        (e) =>
          alive &&
          setState({ path, status: "error", error: errorText(e), code: e instanceof ApiError ? e.status : undefined }),
      );
    return () => {
      alive = false;
    };
  }, [path, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  // Зам солигдоход хуучин өгөгдлийг шинэ замынх мэт харуулахгүй
  const fresh = state.path === path;
  return {
    data: fresh ? state.data : undefined,
    status: (fresh ? state.status : "loading") as LoadStatus,
    error: fresh ? state.error : "",
    code: fresh ? state.code : undefined,
    reload,
  };
}

/* ───────── Сарын хичээлийн өдрүүд — жагсаалт ба дэлгэрэнгүй цонх НЭГ санг хуваалцана ───────── */

export interface MonthState {
  status: LoadStatus;
  data?: HubDaysResponse;
  error?: string;
}

const months = new Map<string, MonthState>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Сарыг татна. `force` = зураг илгээсний дараа гэх мэт шинэчлэх (хуучин өгөгдөл харагдсаар) */
export function loadMonth(month: string, force = false): void {
  const prev = months.get(month);
  if (!force && prev && prev.status !== "error") return;
  months.set(month, { status: "loading", data: prev?.data });
  emit();
  api<HubDaysResponse>(`/student-hub/days?month=${encodeURIComponent(month)}`)
    .then((data) => months.set(month, { status: "ready", data }))
    .catch((e) => months.set(month, { status: "error", data: prev?.data, error: errorText(e) }))
    .finally(emit);
}

export function useMonthDays(month: string | null): MonthState | undefined {
  useEffect(() => {
    if (month) loadMonth(month);
  }, [month]);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (month ? months.get(month) : undefined),
    () => undefined,
  );
}
