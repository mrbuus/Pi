"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "pi_theme";

type Listener = () => void;

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/* ---- Хадгалсан сонголтын гадаад дэлгэц (localStorage) ----
   useSyncExternalStore ашигласнаар useEffect дотор setState дуудахгүй
   тул cascading render болон hydration mismatch үүсэхгүй. */
const themeListeners = new Set<Listener>();

// ӨГӨГДМӨЛ нь "light" — layout.tsx дахь inline скрипттэй ЯГ ижил байх ёстой,
// эс бөгөөс эхний paint дээр нэг frame гялсхийнэ.
const DEFAULT_THEME: Theme = "light";

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function getServerTheme(): Theme {
  return DEFAULT_THEME;
}

function subscribeTheme(onStoreChange: Listener) {
  themeListeners.add(onStoreChange);
  // Өөр tab дээр сонголт өөрчлөгдвөл энэ tab-т ч мөн синк хийнэ
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    themeListeners.delete(onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Санах ойд бичих боломжгүй (private mode гэх мэт) — зөвхөн энэ session-д ажиллана
  }
  themeListeners.forEach((listener) => listener());
}

/* ---- Систем өнгөний горимын гадаад дэлгэц (matchMedia) ---- */
function subscribeSystemPref(onStoreChange: Listener) {
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

function readSystemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSystemPref(): boolean {
  return false;
}

// layout.tsx доторх blocking script-той яг ижил дүрмээр <html>-д
// data-theme болон color-scheme тавина.
function applyThemeToDom(theme: Theme, resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.style.colorScheme = resolved;
}

interface ThemeContextValue {
  /** Хэрэглэгчийн сонголт — "систем"-ийг ч мөн тоолно */
  theme: Theme;
  /** Дэлгэцэнд бодитоор хэрэглэгдэж буй горим ("систем" биш, зөвхөн light/dark) */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, readStoredTheme, getServerTheme);
  const systemPrefersDark = useSyncExternalStore(
    subscribeSystemPref,
    readSystemPrefersDark,
    getServerSystemPref,
  );
  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemPrefersDark ? "dark" : "light") : theme;

  // DOM-той синк хийх side effect — React state биш, тул setState-with-effect
  // дүрэмд баригдахгүй.
  useEffect(() => {
    applyThemeToDom(theme, resolvedTheme);
  }, [theme, resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme() нь зөвхөн <ThemeProvider> дотор ашиглагдана");
  }
  return ctx;
}
