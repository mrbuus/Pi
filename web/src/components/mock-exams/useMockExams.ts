"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { api, getRole, getToken } from "@/lib/api";
import type { MockMine, MockPublic } from "@/components/books/types";

// Жишиг сорилын нийтийн төлөв (+ нэвтэрсэн сурагч/худалдан авагчийн бүртгэл)
export function useMockExams() {
  const [pub, setPub] = useState<MockPublic | null>(null);
  const [mine, setMine] = useState<MockMine | null>({ registrations: [] });
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  // Нэвтрэлтийн төлөв localStorage-д — серверийн HTML (нэвтрээгүй) ба эхний клиент рендер
  // ижил байх ёстой; эс бөгөөс hydration зөрнө. Тиймээс hydration-ий дараа л уншина.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const role = mounted ? getRole() : null;
  const token = mounted ? getTokenSafe() : null;
  const canRegister = !!token && (role === "STUDENT" || role === "BUYER");

  useEffect(() => {
    let alive = true;
    api<MockPublic>("/catalog/mock-exams", { auth: false }).then((r) => { if (alive) { setPub(r); setFailed(false); } }).catch(() => alive && setFailed(true));
    if (canRegister) api<MockMine>("/mock-exams/my").then((r) => alive && setMine(r)).catch(() => alive && setMine({ registrations: [] }));
    return () => { alive = false; };
  }, [tick, canRegister]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const register = useCallback(async (eventId: string) => { await api(`/mock-exams/${encodeURIComponent(eventId)}/register`, { method: "POST" }); refresh(); }, [refresh]);
  const unregister = useCallback(async (eventId: string) => { await api(`/mock-exams/${encodeURIComponent(eventId)}/register`, { method: "DELETE" }); refresh(); }, [refresh]);
  const regOf = useCallback((eventId: string) => mine?.registrations.find((r) => r.eventId === eventId) ?? null, [mine]);

  return { pub, mine, failed, role, canRegister, loggedIn: !!token, refresh, register, unregister, regOf };
}

const noopSubscribe = () => () => {};

function getTokenSafe() {
  try { return getToken(); } catch { return null; }
}
