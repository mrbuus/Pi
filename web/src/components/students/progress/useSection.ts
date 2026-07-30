"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type SectionStatus = "loading" | "ready" | "error";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * web/src/app/app/student/page.tsx-ийн useSection-тэй ижил зорилготой, гэхдээ
 * ЭНД `path` өөрөө өөрчлөгдөж болно (ж: огнооны муж сар сар бүр солигдоно) —
 * тиймээс эффектийн dependency array-д `path`-г МӨН оруулсан (эх хувилбарт
 * зөвхөн тогтмол path-тай дуудагддаг тул үүнийг орхисон байсан).
 */
export function useSection<T>(path: string): {
  data: T | undefined;
  status: SectionStatus;
  error: string;
  reload: () => void;
} {
  const [data, setData] = useState<T>();
  const [status, setStatus] = useState<SectionStatus>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setError("");
    api<T>(path)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(errMsg(e));
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);

  function reload() {
    setStatus("loading");
    setTick((t) => t + 1);
  }

  return { data, status, error, reload };
}
