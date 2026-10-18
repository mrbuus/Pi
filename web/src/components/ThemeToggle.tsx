"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeToggleProps {
  className?: string;
}

/**
 * Цагаан / хар горимын нэг товч (эзэн 2026-10-13). Анх төхөөрөмжийн өнгөөр
 * нээгдэнэ; дармагц эсрэг горим руу шилжиж, тэр сонголт тогтмол хадгалагдана.
 */
export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const label = dark ? "Цагаан горим руу шилжих" : "Хар горим руу шилжих";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-dim transition hover:bg-panel hover:text-ink ${className}`}
    >
      {dark ? <Sun className="h-5 w-5" aria-hidden /> : <Moon className="h-5 w-5" aria-hidden />}
    </button>
  );
}
