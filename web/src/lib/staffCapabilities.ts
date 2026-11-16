"use client";

import { useEffect, useState } from "react";
import { api, getRole, getToken } from "@/lib/api";

/* ============================================================================
 * Эрхийн матриц (эзэн 2026-11-16) — вэб тал. Жинхэнэ хамгаалалт сервер дээр
 * (CapabilityGuard); энд зөвхөн 403 өгөх товчийг нуухад ашиглана.
 *
 * - Админ: бүх эрх
 * - Багш+: GET /staff-capabilities/me → `capabilities` (анхдагч эрхүүдээс Админ
 *   хаасныг хассан + олгосон эрхүүд). Ачаалж дуустал анхдагч эрх нээлттэй гэж үзнэ
 *   (өнөөдрийнхтэй ижил харагдана).
 * - Бусад үүрэг: эдгээр эрх хамаарахгүй (false)
 * ========================================================================== */

export type StaffCapabilityId =
  | "schedule.manage"
  | "finance.manage"
  | "time.review"
  | "payroll.view"
  | "teacher-hours.edit"
  | "student-password.set"
  | "classes.manage"
  | "students.manage"
  | "students.export"
  | "exams.manage"
  | "content.manage"
  | "tasks.manage"
  | "reports.view";

/** Сервертэй ижил: Багш+-д анхдагчаар нээлттэй эрхүүд */
export const TEACHER_PLUS_DEFAULT: readonly StaffCapabilityId[] = [
  "finance.manage",
  "schedule.manage",
  "classes.manage",
  "students.manage",
  "students.export",
  "exams.manage",
  "content.manage",
  "tasks.manage",
  "reports.view",
];

let cache: { token: string | null; caps: Set<string> | null; promise: Promise<Set<string>> | null } = {
  token: null,
  caps: null,
  promise: null,
};
const listeners = new Set<() => void>();

function loadStaffCaps(): Promise<Set<string>> {
  const token = getToken();
  if (cache.token !== token) cache = { token, caps: null, promise: null };
  if (cache.caps) return Promise.resolve(cache.caps);
  if (!cache.promise)
    cache.promise = api<{ capabilities?: string[] }>("/staff-capabilities/me")
      .then((r) => {
        const caps = new Set(r.capabilities ?? TEACHER_PLUS_DEFAULT);
        if (cache.token === token) cache.caps = caps;
        listeners.forEach((l) => l());
        return caps;
      })
      .catch(() => {
        if (cache.token === token) cache.promise = null;
        return new Set<string>(TEACHER_PLUS_DEFAULT);
      });
  return cache.promise;
}

/** Синхрон шалгалт (ачаалсан бол кэшээс). Ачаалаагүй бол анхдагч эрхийг нээлттэй гэж үзнэ */
export function staffCan(cap: StaffCapabilityId, role: string | null = getRole()): boolean {
  if (role === "ADMIN") return true;
  if (role !== "TEACHER_PLUS") return false;
  if (cache.token === getToken() && cache.caps) return cache.caps.has(cap);
  return TEACHER_PLUS_DEFAULT.includes(cap);
}

/** Админ эсвэл тухайн эрхтэй Багш+ эсэх — эрх ачаалагдахад дахин зурна */
export function useStaffCan(cap: StaffCapabilityId, role?: string | null): boolean {
  const [, bump] = useState(0);
  const r = role === undefined ? getRole() : role;
  useEffect(() => {
    if (r !== "TEACHER_PLUS") return;
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    void loadStaffCaps().then(l);
    return () => {
      listeners.delete(l);
    };
  }, [r]);
  return staffCan(cap, r);
}

/** Олон эрхийг нэг дор (цэс) — эрх ачаалагдахад дахин зурна */
export function useStaffCanFn(role?: string | null): (cap: StaffCapabilityId) => boolean {
  const [, bump] = useState(0);
  const r = role === undefined ? getRole() : role;
  useEffect(() => {
    if (r !== "TEACHER_PLUS") return;
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    void loadStaffCaps().then(l);
    return () => {
      listeners.delete(l);
    };
  }, [r]);
  return (cap) => staffCan(cap, r);
}
