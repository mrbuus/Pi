"use client";

import { useCallback, useEffect, useRef } from "react";
import type { HwActivity } from "./types";

export interface ActivityPayload {
  activeSec: number;
  awaySec: number;
  leaveCount: number;
}

interface State {
  activeMs: number;
  awayMs: number;
  leaves: number;
  /** Хуудас нүдэнд харагдаж эхэлсэн агшин (харагдахгүй бол null) */
  visibleSince: number | null;
  hiddenSince: number | null;
}

const isAway = (): boolean => document.visibilityState === "hidden";

/**
 * Гэрийн даалгаврын идэвхийн хяналт (эзэн 2026-11-03): хуудас нүдэнд харагдаж байсан хугацаа
 * (бодсон), вэбээс (таб/апп) гарсан тоо ба хугацаа. Тоолуур серверийн хадгалсан утгаас үргэлжилнэ
 * (дахин ачаалахад 0 болохгүй); сервер зөвхөн өсгөж, бодит хугацаагаар хязгаарлана.
 * `onLeave` — гарах агшинд (хариуг шууд илгээхэд). Хуудасны ӨӨР ЮУ Ч хориглохгүй, зөвхөн тоолно.
 */
export function useActivityTracker(
  enabled: boolean,
  seed: { key: string; activity: HwActivity } | null,
  onLeave?: () => void,
) {
  const st = useRef<State>({ activeMs: 0, awayMs: 0, leaves: 0, visibleSince: null, hiddenSince: null });
  const leaveRef = useRef(onLeave);
  useEffect(() => {
    leaveRef.current = onLeave;
  }, [onLeave]);

  const seedKey = seed?.key ?? null;
  const seedActivity = seed?.activity ?? null;
  useEffect(() => {
    if (!enabled || !seedKey || !seedActivity) return;
    const now = Date.now();
    const hidden = isAway();
    st.current = {
      activeMs: seedActivity.activeSec * 1000,
      awayMs: seedActivity.awaySec * 1000,
      leaves: seedActivity.leaveCount,
      visibleSince: hidden ? null : now,
      hiddenSince: hidden ? now : null,
    };
    // Зөвхөн даалгавар (key) солигдох/эхлэх үед seed хийнэ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, seedKey]);

  useEffect(() => {
    if (!enabled) return;
    function sync() {
      const s = st.current;
      const now = Date.now();
      const away = isAway();
      if (away && s.visibleSince !== null) {
        s.activeMs += now - s.visibleSince;
        s.visibleSince = null;
        s.hiddenSince = now;
        s.leaves += 1;
        leaveRef.current?.();
      } else if (!away && s.visibleSince === null) {
        if (s.hiddenSince !== null) s.awayMs += now - s.hiddenSince;
        s.hiddenSince = null;
        s.visibleSince = now;
      }
    }
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("pagehide", sync);
    window.addEventListener("pageshow", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pagehide", sync);
      window.removeEventListener("pageshow", sync);
    };
  }, [enabled]);

  /** Одоогийн тоолуур (нээлттэй завсарыг оролцуулан) */
  return useCallback((): ActivityPayload => {
    const s = st.current;
    const now = Date.now();
    const active = s.activeMs + (s.visibleSince !== null ? now - s.visibleSince : 0);
    const away = s.awayMs + (s.hiddenSince !== null ? now - s.hiddenSince : 0);
    return {
      activeSec: Math.floor(active / 1000),
      awaySec: Math.floor(away / 1000),
      leaveCount: s.leaves,
    };
  }, []);
}
