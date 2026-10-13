/**
 * Засаж байх үеийн буцаах/урагшлах — ЦЭВЭР логик (React-гүй, tests/undoable.test.cjs).
 * docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md §1.
 *
 *   past ← present → future   (present = одоо дэлгэцэнд байгаа төлөв)
 *
 * Бичвэр бичихэд товч дарах бүрийг алхам болгохгүй: ижил `key`-тэй өөрчлөлт
 * COALESCE_MS (0.6 сек) дотор дахин ирвэл өмнөх алхамтай нийлнэ.
 * `baseline` — сүүлд хадгалсан (эсвэл ачаалсан) төлөв; dirty = present ≠ baseline.
 */

export const COALESCE_MS = 600;
/**
 * Засварлагч доторх буцаах алхмын дээд тоо (эзэн: «хэт олон үйлдэл буцааж болохгүй»).
 * Илүү хуучин төлөв рүү «Түүх»-ээр (хадгалсан хувилбар) буцна.
 */
export const HISTORY_LIMIT = 20;

export interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
  baseline: T;
  /** Сүүлийн нийлүүлж болох өөрчлөлтийн түлхүүр (ж: "statement") ба цаг */
  groupKey: string | null;
  groupAt: number;
}

export type UndoAction<T> =
  | {
      type: "set";
      value: T | ((prev: T) => T);
      key?: string | null;
      at?: number;
      coalesceMs?: number;
      limit?: number;
    }
  /**
   * Одоогийн төлөвийг ШИНЭ алхамгүйгээр солино — хөтчийн өөрийн текст буцаалт
   * (inputType historyUndo/historyRedo) манай түүхэнд давхар алхам болохгүй.
   */
  | { type: "replace"; value: T | ((prev: T) => T) }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; baseline: T }
  /** Дараагийн өөрчлөлтийг заавал шинэ алхам болгоно (талбараас гарах үед) */
  | { type: "break" };

export function initUndo<T>(value: T): UndoState<T> {
  return { past: [], present: value, future: [], baseline: value, groupKey: null, groupAt: 0 };
}

/** JSON-оор харьцуулна (Set/Map биш, энгийн өгөгдөл хадгална). */
export function sameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function undoReducer<T>(state: UndoState<T>, action: UndoAction<T>): UndoState<T> {
  switch (action.type) {
    case "set": {
      const next =
        typeof action.value === "function"
          ? (action.value as (prev: T) => T)(state.present)
          : action.value;
      if (sameValue(next, state.present)) return state;
      const at = action.at ?? Date.now();
      const key = action.key ?? null;
      const windowMs = action.coalesceMs ?? COALESCE_MS;
      const coalesce =
        key !== null && key === state.groupKey && at - state.groupAt <= windowMs && state.past.length > 0;
      if (coalesce) {
        // Ижил талбарын үргэлжилсэн бичвэр — шинэ алхам үүсгэхгүй
        return { ...state, present: next, future: [], groupAt: at };
      }
      const limit = action.limit ?? HISTORY_LIMIT;
      const past = [...state.past, state.present];
      return {
        ...state,
        past: past.length > limit ? past.slice(past.length - limit) : past,
        present: next,
        future: [],
        groupKey: key,
        groupAt: at,
      };
    }
    case "replace": {
      const next =
        typeof action.value === "function"
          ? (action.value as (prev: T) => T)(state.present)
          : action.value;
      return sameValue(next, state.present) ? state : { ...state, present: next };
    }
    case "undo": {
      // Одоогийнхтой ижил алхмуудыг алгасна (replace-ийн дараа үүсч болно)
      let past = state.past;
      while (past.length > 0 && sameValue(past[past.length - 1], state.present)) past = past.slice(0, -1);
      if (past.length === 0) return past === state.past ? state : { ...state, past, groupKey: null };
      const previous = past[past.length - 1];
      return {
        ...state,
        past: past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
        groupKey: null,
      };
    }
    case "redo": {
      let future = state.future;
      while (future.length > 0 && sameValue(future[0], state.present)) future = future.slice(1);
      if (future.length === 0) return future === state.future ? state : { ...state, future, groupKey: null };
      const [next, ...rest] = future;
      return {
        ...state,
        past: [...state.past, state.present],
        present: next,
        future: rest,
        groupKey: null,
      };
    }
    case "reset":
      return initUndo(action.baseline);
    case "break":
      return state.groupKey === null ? state : { ...state, groupKey: null };
    default:
      return state;
  }
}

export function canUndo<T>(state: UndoState<T>): boolean {
  return state.past.some((p) => !sameValue(p, state.present));
}

export function canRedo<T>(state: UndoState<T>): boolean {
  return state.future.some((f) => !sameValue(f, state.present));
}

export function isDirty<T>(state: UndoState<T>): boolean {
  return !sameValue(state.present, state.baseline);
}

// ======================= Товчлол =======================

export interface KeyLike {
  key: string;
  code?: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  isComposing?: boolean;
}

/**
 * Cmd+Z / Ctrl+Z → "undo"; Shift+Cmd+Z / Ctrl+Shift+Z / Ctrl+Y → "redo".
 * Кирилл (монгол) гарын байрлалтай үед key нь «я» г.м. байдаг тул физик
 * товчийг (code: KeyZ/KeyY) ч хүлээн авна.
 */
export function classifyUndoKey(e: KeyLike): "undo" | "redo" | null {
  if (e.isComposing || e.altKey) return null;
  if (!e.metaKey && !e.ctrlKey) return null;
  const k = (e.key || "").toLowerCase();
  const latin = /^[a-z]$/.test(k);
  const isZ = k === "z" || (!latin && e.code === "KeyZ");
  const isY = k === "y" || (!latin && e.code === "KeyY");
  if (isZ) return e.shiftKey ? "redo" : "undo";
  // Ctrl+Y (Windows). Mac-ийн Cmd+Y нь хөтчийн түүх нээдэг тул авахгүй.
  if (isY && e.ctrlKey && !e.metaKey && !e.shiftKey) return "redo";
  return null;
}

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "url",
  "tel",
  "email",
  "password",
  "number",
  "",
]);

interface ElementLike {
  tagName?: string;
  type?: string;
  isContentEditable?: boolean;
  readOnly?: boolean;
  disabled?: boolean;
}

/** Хөтчийн өөрийн текст буцаалт ажилладаг талбар уу (input/textarea/contenteditable). */
export function isTextEntry(el: ElementLike | null | undefined): boolean {
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName || "").toUpperCase();
  if (tag === "TEXTAREA") return !el.readOnly && !el.disabled;
  if (tag === "INPUT") return TEXT_INPUT_TYPES.has((el.type || "").toLowerCase()) && !el.readOnly && !el.disabled;
  return false;
}
