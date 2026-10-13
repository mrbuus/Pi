"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type RefObject } from "react";
import {
  canRedo,
  canUndo,
  classifyUndoKey,
  COALESCE_MS,
  HISTORY_LIMIT,
  initUndo,
  isDirty,
  isTextEntry,
  undoReducer,
  type UndoAction,
  type UndoState,
} from "@/lib/undoable";
import { markUnsaved } from "@/lib/unsavedChanges";

/**
 * Засварлагчийн бүх засах боломжтой төлөвийг буцаах/урагшлах стектэй болгоно.
 * Логик нь @/lib/undoable (цэвэр reducer, тесттэй).
 *
 * Товчлол: Cmd+Z / Ctrl+Z — буцаах; Shift+Cmd+Z / Ctrl+Shift+Z / Ctrl+Y — урагшлах.
 * Текст талбар дотор хөтчийн өөрийн текст буцаалт ажиллана; харин тэр талбарт
 * фокус авснаас хойш юу ч бичээгүй бол (хөтчид буцаах зүйл алга) манай буцаалт.
 */

export interface UndoableOptions {
  /** Товчлол идэвхтэй эсэх (ж: тухайн таб нээлттэй, дээр нь өөр цонх алга) */
  shortcuts?: boolean;
  /**
   * Нэг хуудсанд олон засварлагч байвал (алхмын багц): зөвхөн фокус энэ хүрээнд
   * байх эсвэл сүүлд энэ хүрээнд дарсан үед товчлол ажиллана.
   */
  scopeRef?: RefObject<HTMLElement | null>;
  coalesceMs?: number;
  limit?: number;
}

export interface SetOptions {
  /** Ижил түлхүүртэй дараалсан өөрчлөлт (бичвэр) 0.6 сек дотор нэг алхам болно */
  coalesceKey?: string;
}

// Текст талбарт фокус авсан үеийн утга — түүнээс өөрчлөгдөөгүй бол хөтчид буцаах зүйл алга.
const pristine = new WeakMap<Element, string>();
let focusTracking = false;
// Хөтчийн өөрийн текст буцаалт (Cmd+Z талбар дотор) — onChange-ийг шинэ алхам болгохгүй.
// Capture үе шатанд React-ийн onChange-оос ӨМНӨ тавигдаж, тэр task дотроо арилна.
let nativeHistoryInput = false;

function fieldValue(el: Element): string {
  const html = el as HTMLElement;
  if (html.isContentEditable) return html.innerText;
  return (el as HTMLInputElement).value ?? "";
}

function trackFocus() {
  if (focusTracking || typeof document === "undefined") return;
  focusTracking = true;
  document.addEventListener(
    "input",
    (event) => {
      const type = (event as InputEvent).inputType;
      nativeHistoryInput = type === "historyUndo" || type === "historyRedo";
      if (nativeHistoryInput) queueMicrotask(() => (nativeHistoryInput = false));
    },
    true,
  );
  document.addEventListener(
    "focusin",
    (event) => {
      const el = event.target as HTMLElement | null;
      if (el && isTextEntry(el)) pristine.set(el, fieldValue(el));
    },
    true,
  );
}

function nativeUndoAvailable(el: Element): boolean {
  const start = pristine.get(el);
  if (start === undefined) return true; // мэдэхгүй бол хөтчид үлдээнэ
  return start !== fieldValue(el);
}

export function useUndoable<T>(initial: T | (() => T), options: UndoableOptions = {}) {
  const { shortcuts = true, scopeRef, coalesceMs = COALESCE_MS, limit = HISTORY_LIMIT } = options;
  const [state, dispatch] = useReducer(
    (s: UndoState<T>, a: UndoAction<T>) => undoReducer(s, a),
    undefined,
    () => initUndo(typeof initial === "function" ? (initial as () => T)() : initial),
  );
  const stateRef = useRef(state);
  const insideRef = useRef(false);
  const historyOp = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const set = useCallback(
    (value: T | ((prev: T) => T), opts: SetOptions = {}) => {
      if (nativeHistoryInput) {
        nativeHistoryInput = false;
        dispatch({ type: "replace", value });
        return;
      }
      dispatch({ type: "set", value, key: opts.coalesceKey ?? null, at: Date.now(), coalesceMs, limit });
    },
    [coalesceMs, limit],
  );
  const undo = useCallback(() => {
    historyOp.current = true;
    dispatch({ type: "undo" });
  }, []);
  const redo = useCallback(() => {
    historyOp.current = true;
    dispatch({ type: "redo" });
  }, []);
  const reset = useCallback((baseline: T) => dispatch({ type: "reset", baseline }), []);
  /** Шинэ буцаах алхамгүйгээр одоогийн утгыг солино (ж: хэсэгчлэн хадгалсны дараах цэвэрлэгээ) */
  const replace = useCallback(
    (value: T | ((prev: T) => T)) => dispatch({ type: "replace", value }),
    [],
  );
  /** Дараагийн өөрчлөлтийг шинэ алхам болгоно (ж: талбараас гарах үед) */
  const commitGroup = useCallback(() => dispatch({ type: "break" }), []);

  // Манай буцаалтын дараа фокустай талбар шинэ утгаа «хөндөгдөөгүй» гэж тооцно.
  useEffect(() => {
    if (!historyOp.current) return;
    historyOp.current = false;
    const el = typeof document !== "undefined" ? document.activeElement : null;
    if (el && isTextEntry(el as HTMLElement)) pristine.set(el, fieldValue(el));
  }, [state.present]);

  useEffect(() => {
    if (!scopeRef) return;
    const track = (event: Event) => {
      const root = scopeRef.current;
      insideRef.current = !!root && root.contains(event.target as Node);
    };
    document.addEventListener("pointerdown", track, true);
    document.addEventListener("focusin", track, true);
    return () => {
      document.removeEventListener("pointerdown", track, true);
      document.removeEventListener("focusin", track, true);
    };
  }, [scopeRef]);

  useEffect(() => {
    if (!shortcuts) return;
    trackFocus();
    const onKey = (event: KeyboardEvent) => {
      const kind = classifyUndoKey(event);
      if (!kind || event.defaultPrevented) return;
      if (scopeRef) {
        const root = scopeRef.current;
        const active = document.activeElement;
        const inside = !!root && ((!!active && root.contains(active)) || insideRef.current);
        if (!inside) return;
      }
      const target = event.target as Element | null;
      if (target && isTextEntry(target as HTMLElement) && nativeUndoAvailable(target)) return;
      const s = stateRef.current;
      if (kind === "undo" ? !canUndo(s) : !canRedo(s)) return;
      event.preventDefault();
      if (kind === "undo") undo();
      else redo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcuts, scopeRef, undo, redo]);

  return useMemo(
    () => ({
      value: state.present,
      baseline: state.baseline,
      set,
      undo,
      redo,
      reset,
      replace,
      commitGroup,
      canUndo: canUndo(state),
      canRedo: canRedo(state),
      dirty: isDirty(state),
    }),
    [state, set, undo, redo, reset, replace, commitGroup],
  );
}

/** Хадгалаагүй өөрчлөлттэй үед хуудас хаах / холбоос дарахад асууна (@/lib/unsavedChanges). */
export function useUnsavedGuard(dirty: boolean, label = "editor") {
  const [id] = useState(() => Symbol(label));
  useEffect(() => {
    markUnsaved(id, dirty, label);
    return () => markUnsaved(id, false);
  }, [id, dirty, label]);
}
