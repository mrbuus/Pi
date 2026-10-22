"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ScheduleAccess } from "./model";

const ADMIN_ACCESS: ScheduleAccess = { all: true, classIds: [] };
// Энгийн Багш хуваарийг бүгдийг нь ХАРНА, засахгүй (эзэн 2026-10-22): засах API нь Багш+/Админ л.
const READ_ONLY_ACCESS: ScheduleAccess = { all: false, classIds: [] };

interface CapabilityResponse {
  administrator: boolean;
  grants: { capability: string; scopeKey?: string | null }[];
}

/**
 * `schedule.manage` эрх: ADMIN бүх анги; Багш+ олгогдсон эрхээрээ (scopeKey "" = бүх
 * анги, эс бөгөөс тухайн анги). Эрхгүй бол { all: false, classIds: [] } — зөвхөн харна.
 * Энгийн Багш үргэлж зөвхөн харна (дуудлага хийхгүй). null = ачаалж байна.
 */
export function useScheduleAccess(role: string): ScheduleAccess | null {
  const [fetched, setFetched] = useState<{ role: string; access: ScheduleAccess } | null>(null);
  useEffect(() => {
    if (role === "ADMIN" || role === "TEACHER") return;
    let alive = true;
    api<CapabilityResponse>("/staff-capabilities/me")
      .then((r) => {
        if (!alive) return;
        const grants = r.grants.filter((g) => g.capability === "schedule.manage");
        setFetched({
          role,
          access: {
            all: r.administrator || grants.some((g) => !g.scopeKey),
            classIds: grants.map((g) => g.scopeKey).filter((k): k is string => !!k),
          },
        });
      })
      .catch(() => {
        if (alive) setFetched({ role, access: { all: false, classIds: [] } });
      });
    return () => {
      alive = false;
    };
  }, [role]);
  if (role === "ADMIN") return ADMIN_ACCESS;
  if (role === "TEACHER") return READ_ONLY_ACCESS;
  return fetched?.role === role ? fetched.access : null;
}
