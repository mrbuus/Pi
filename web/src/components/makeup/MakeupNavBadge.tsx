"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api, getRole } from "@/lib/api";
import type { MyMakeup } from "./types";
import { isOpen } from "./types";

/**
 * Сурагчийн цэсний «Нөхөх хичээл»-ийн тоо (нөхөөгүй + дутуу). Модулийн түвшний
 * жижиг сан: цэс хуудас солих бүрт дахин татахгүй (1 минут), нөхөх хуудас
 * өөрчлөгдөхөд `refreshMakeupCount()` шууд шинэчилнэ.
 */
let count = 0;
let openItems: MyMakeup[] = [];
let loadedAt = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setMakeupCount(items: MyMakeup[]) {
  openItems = items.filter((i) => isOpen(i.status));
  count = openItems.length;
  loadedAt = Date.now();
  emit();
}

export function refreshMakeupCount(force = false): Promise<void> {
  if (getRole() !== "STUDENT") return Promise.resolve();
  if (!force && Date.now() - loadedAt < 60_000) return Promise.resolve();
  if (inflight) return inflight;
  inflight = api<MyMakeup[]>("/makeup/me")
    .then(setMakeupCount)
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useMakeupCount(): number {
  useEffect(() => {
    void refreshMakeupCount();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => count,
    () => 0,
  );
}

/** Сурагчийн нөхөх шаардлагатай (нөхөөгүй + дутуу) мөрүүд — самбар дээд талд харуулахад */
export function useOpenMakeups(): MyMakeup[] {
  useEffect(() => {
    void refreshMakeupCount();
  }, []);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => openItems,
    () => EMPTY,
  );
}
const EMPTY: MyMakeup[] = [];

/** Цэсний мөрийн баруун талд: `{item.badge === "makeup" && <MakeupNavBadge />}` */
export default function MakeupNavBadge({ className = "" }: { className?: string }) {
  const n = useMakeupCount();
  if (!n) return null;
  return (
    <span
      className={`ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-bold leading-5 tabular-nums text-on-error ${className}`}
      aria-label={`${n} нөхөх хичээл`}
    >
      {n > 9 ? "9+" : n}
    </span>
  );
}
