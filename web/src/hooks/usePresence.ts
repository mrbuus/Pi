"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * «Хэн засаж байна» (docs/v2/ZEREG-ZASVAR-TOLOVLOGOO.md §4). Нээлттэй үед 45 сек
 * тутам жижиг дохио (сервер санах ойд л барина — ӨС-д бичихгүй), таб нуугдвал
 * зогсож, буцаж харагдмагц дахин. Хаахад жагсаалтаас гарна. Алдааг чимээгүй
 * алгасна — зөвхөн мэдээллийн тэмдэг, засварт саад болохгүй.
 *
 * Түлхүүр: exam:<testId> · problem:<problemId> · grades:<testId>:<classId> · test-edit:<testId>
 */

export interface PresenceEditor {
  name: string;
  /** Хэзээнээс хойш нээсэн (ISO) */
  since: string;
}

/** Сервер 100 сек чимээгүйг гарсанд тооцно (api/src/presence) — 2 дохио алгасах зай */
export const PRESENCE_BEAT_MS = 45_000;

export function usePresence(keys: (string | null | undefined | false)[]): Record<string, PresenceEditor[]> {
  const signature = keys.filter(Boolean).join("|");
  const [editors, setEditors] = useState<Record<string, PresenceEditor[]>>({});

  useEffect(() => {
    if (!signature) return;
    const list = signature.split("|");
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const beat = async () => {
      clearTimeout(timer);
      if (document.visibilityState !== "visible") return; // нуугдсан таб ачаалал өгөхгүй
      try {
        const res = await api<{ editors: Record<string, PresenceEditor[]> }>("/presence", {
          method: "POST",
          body: { keys: list },
        });
        if (alive) setEditors(res.editors ?? {});
      } catch {
        // мэдээллийн тэмдэг — алдааг алгасна
      }
      if (alive) timer = setTimeout(() => void beat(), PRESENCE_BEAT_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void beat();
    };

    void beat();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      void api("/presence", { method: "POST", body: { keys: list, leave: true } }).catch(() => {});
    };
  }, [signature]);

  return editors;
}
