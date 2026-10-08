"use client";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

// Identity-tagged results never expose the previous child's or slug's data.
// api() owns networking/retry; effect cleanup ignores any late response.
export function useFormulaRequest<T>(path: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    path: string;
    attempt: number;
    data?: T;
    error?: string;
    status?: number;
  } | null>(null);
  useEffect(() => {
    if (!path) return;
    let active = true;
    api<T>(path)
      .then((data) => {
        if (active) setResult({ path, attempt, data });
      })
      .catch((error: unknown) => {
        if (active)
          setResult({
            path,
            attempt,
            error:
              error instanceof ApiError && error.status === 403
                ? "Энэ сурагчийн мэдээллийг харах эрх хүрэхгүй байна."
                : "Мэдээллийг ачаалж чадсангүй. Дахин оролдоно уу.",
            status: error instanceof ApiError ? error.status : undefined,
          });
      });
    return () => {
      active = false;
    };
  }, [path, attempt]);
  const current =
    result?.path === path && result.attempt === attempt ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    status: current?.status,
    loading: !!path && !current,
    retry: () => setAttempt((n) => n + 1),
  };
}
