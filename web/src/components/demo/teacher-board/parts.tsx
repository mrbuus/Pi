import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { initials } from "../world";

/** Нэрийн эхний үсгүүдтэй жижиг дугуй («О. Баасанжав» → «ОБ») */
export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-bright/15 text-[9px] font-bold leading-none text-brand-soft",
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Дүрстэй жижиг товч: гар утсан дээр 44px, компьютер дээр 36px */
export function IconBtn({
  label,
  children,
  className = "",
  ...rest
}: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-35 sm:size-9",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Тайлбарын нэг зүйл (дүрс + бичиг) — жагсаалтын ДООР */
export function LegendItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      {icon}
      <span>{children}</span>
    </li>
  );
}

export function Legend({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <ul aria-label={label} className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-dim", className)}>
      {children}
    </ul>
  );
}
