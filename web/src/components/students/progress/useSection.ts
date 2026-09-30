"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { api } from "@/lib/api";

export type SectionStatus = "loading" | "ready" | "error";
type Section<T> = {
  data: T;
  status: SectionStatus;
  error: string;
  reload: () => void;
  setData: Dispatch<SetStateAction<T>>;
};

/** Shared by scoped management panels. Keep results tied to the requested
 * identity; effects only set state after asynchronous work completes. */
export function useAsyncSection<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  initialData: T,
): Section<T> {
  const [fallback] = useState(() => initialData);
  const [tick, setTick] = useState(0);
  // A new identity also distinguishes A to B to A and ignores older mutations.
  const request = useMemo(() => ({ key, tick, fetcher }), [key, tick, fetcher]);
  const [result, setResult] = useState<{
    request: typeof request;
    data: T;
    error: string;
    status: "ready" | "error";
  }>();
  useEffect(() => {
    if (request.key === null) return;
    let alive = true;
    async function load() {
      try {
        const data = await request.fetcher();
        if (alive) setResult({ request, data, error: "", status: "ready" });
      } catch (error) {
        if (alive)
          setResult((previous) => ({
            request,
            data:
              previous?.request.key === request.key ? previous.data : fallback,
            error: error instanceof Error ? error.message : "Алдаа гарлаа",
            status: "error",
          }));
      }
    }
    void load();
    return () => {
      alive = false;
    };
    // Capture the fallback once so render-time array literals do not refetch.
  }, [request, fallback]);
  const current = result?.request === request ? result : undefined;
  const reload = useCallback(() => setTick((value) => value + 1), []);
  const setData = useCallback<Dispatch<SetStateAction<T>>>(
    (value) => {
      setResult((previous) => {
        if (!previous || previous.request !== request) return previous;
        return {
          ...previous,
          data:
            typeof value === "function"
              ? (value as (old: T) => T)(previous.data)
              : value,
        };
      });
    },
    [request],
  );
  return {
    data: result?.request.key === key ? result.data : fallback,
    status: key === null ? "ready" : (current?.status ?? "loading"),
    error: current?.error ?? "",
    reload,
    setData,
  };
}

export function useSection<T>(path: string | null, initialData: T): Section<T>;
export function useSection<T>(path: string | null): Section<T | undefined>;
export function useSection<T>(
  path: string | null,
  initialData?: T,
): Section<T | undefined> {
  const fetcher = useCallback(() => api<T>(path!), [path]);
  return useAsyncSection<T | undefined>(path, fetcher, initialData);
}
