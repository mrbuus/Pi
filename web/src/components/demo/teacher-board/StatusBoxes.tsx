import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ATT_META, HW_META, TONE_SELECTED, TONE_TEXT, type StatusMeta } from "../shell/status";
import type { AttStatus, HwStatus } from "../world";

export const ATT_ORDER: AttStatus[] = ["present", "late", "absent", "excused"];
export const HW_ORDER: HwStatus[] = ["done", "partial", "missing"];

/** Бүх хайрцгийн нийтлэг хэлбэр: утсан дээр дүрс дээр, бичиг доор (≥44px); компьютер дээр нэг мөр */
export const BOX =
  "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-1 py-1 text-[11px] font-medium leading-tight transition-colors sm:min-h-9 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-[13px]";

/** Сонгоогүй хайрцаг */
export const BOX_IDLE = "border-line bg-surface text-ink-dim hover:border-ink/30 hover:text-ink";

export function StatusGroup<T extends string>({
  label,
  values,
  metaOf,
  value,
  onChange,
  extra,
  leading,
  className = "",
  children,
}: {
  label: string;
  values: T[];
  metaOf: Record<T, StatusMeta>;
  value: T | null;
  onChange: (v: T | null) => void;
  /** Сонгогдсон хайрцаг дотор нэмэлт бичиг (ж: «10–30 мин») */
  extra?: (v: T) => ReactNode;
  leading?: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div role="group" aria-label={label} className={cn("grid items-stretch gap-1 sm:gap-1.5", className)}>
      {leading}
      {values.map((v) => {
        const meta = metaOf[v];
        const on = value === v;
        const Icon = meta.icon;
        const more = on ? extra?.(v) : null;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? null : v)}
            className={cn(BOX, "active:scale-[0.98]", on ? cn(TONE_SELECTED[meta.tone], "font-semibold") : BOX_IDLE)}
          >
            <Icon className={cn("size-4 shrink-0", on ? TONE_TEXT[meta.tone] : "opacity-60")} aria-hidden />
            <span className="cyrillic-tight max-w-full truncate">{meta.label}</span>
            {more && <span className="max-w-full truncate font-bold tabular-nums">{more}</span>}
          </button>
        );
      })}
      {children}
    </div>
  );
}

export { ATT_META, HW_META };
