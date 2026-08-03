"use client";

import type { SVGProps } from "react";
import { useTheme, type Theme } from "@/components/ThemeProvider";

function SystemIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="4" width="18" height="12" rx="1.5" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
    </svg>
  );
}

function MoonIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2Z" />
    </svg>
  );
}

const OPTIONS: { value: Theme; label: string; Icon: (props: SVGProps<SVGSVGElement>) => React.JSX.Element }[] = [
  { value: "system", label: "Систем", Icon: SystemIcon },
  { value: "light", label: "Цайвар", Icon: SunIcon },
  { value: "dark", label: "Харанхуй", Icon: MoonIcon },
];

interface ThemeToggleProps {
  className?: string;
}

// Загварын горим сонгох 3 төлөвт удирдлага. Өнгөөр ялгаагүй —
// aria-pressed, дүрс, монгол шошго гурвуулаа идэвхтэй/идэвхгүйг илэрхийлнэ.
export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="group"
      aria-label="Загварын горим сонгох"
      className={`inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface p-1.5 ${className}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150 ${
              active
                ? "bg-brand text-on-brand shadow-sm"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
