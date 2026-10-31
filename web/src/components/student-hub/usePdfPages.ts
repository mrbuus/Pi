"use client";

import { useEffect, useState } from "react";
import { loadPdfImages, peekPdfImages } from "@/lib/pdfImages";

export type PagesState =
  | { status: "idle" | "loading"; urls: null }
  | { status: "ready"; urls: string[] }
  | { status: "error"; urls: null };

function peekAll(keys: string[]): string[] | null {
  const parts = keys.map(peekPdfImages);
  return parts.every(Boolean) ? (parts as string[][]).flat() : null;
}

/**
 * Нэг багц файлын (ихэвчлэн ганц) хуудсуудын зургийг татна. `enabled` false бол
 * татахгүй, гэхдээ кэшэд байгаа бол шууд буцаана. `retry` нэмэгдэхэд дахин оролдоно.
 */
export function usePdfPages(keys: string[], enabled: boolean, retry = 0): PagesState {
  const id = keys.join("|");
  const [state, setState] = useState<PagesState>(() => {
    const urls = peekAll(keys);
    return urls ? { status: "ready", urls } : { status: "idle", urls: null };
  });

  useEffect(() => {
    const list = id ? id.split("|") : [];
    const cached = peekAll(list);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- кэшээс синк
      setState({ status: "ready", urls: cached });
      return;
    }
    if (!enabled || !list.length) {
      setState({ status: "idle", urls: null });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", urls: null });
    Promise.all(list.map(loadPdfImages))
      .then((parts) => !cancelled && setState({ status: "ready", urls: parts.flat() }))
      .catch(() => !cancelled && setState({ status: "error", urls: null }));
    return () => {
      cancelled = true;
    };
  }, [id, enabled, retry]);

  return state;
}
