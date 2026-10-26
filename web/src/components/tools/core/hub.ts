"use client";

import { createContext, useContext, useEffect, useRef } from "react";

export type ToolKey = "graph" | "plane" | "solid" | "formula" | "solve";

// Бодогч эхэнд: хамгийн их хэрэглэгдэнэ (эзэн 2026-10-24, Photomath шиг)
export const TOOL_KEYS: ToolKey[] = ["solve", "graph", "plane", "solid", "formula"];

export interface ToolsNav {
  /** Өөр хэрэгсэл рүү шилжиж, өгөгдөл дамжуулна (Бодогч → График г.м.) */
  go: (tool: ToolKey, payload?: unknown) => void;
}

export const ToolsNavContext = createContext<ToolsNav>({ go: () => {} });
export const useToolsNav = () => useContext(ToolsNavContext);

/** Шилжихэд дамжсан өгөгдөл — хүлээн авагч хэрэгсэл ачаалахдаа НЭГ удаа авна */
const pending = new Map<ToolKey, unknown>();
export function setPending(tool: ToolKey, payload: unknown) {
  pending.set(tool, payload);
  // Хүлээн авагч хэрэгсэл аль хэдийн нээгдсэн (нуугдмал) байж болно
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("pi-tools-pending", { detail: tool }));
}
export function takePending<T>(tool: ToolKey): T | undefined {
  const v = pending.get(tool) as T | undefined;
  pending.delete(tool);
  return v;
}

/** Өөр хэрэгслээс ирсэн өгөгдлийг хүлээн авна: ачаалахад ба нуугдмал байхад ч */
export function usePending<T>(tool: ToolKey, onData: (data: T) => void) {
  const cb = useRef(onData);
  useEffect(() => {
    cb.current = onData;
  });
  useEffect(() => {
    const take = () => {
      const v = takePending<T>(tool);
      if (v !== undefined) cb.current(v);
    };
    take();
    const on = (e: Event) => {
      if ((e as CustomEvent).detail === tool) take();
    };
    window.addEventListener("pi-tools-pending", on);
    return () => window.removeEventListener("pi-tools-pending", on);
  }, [tool]);
}
