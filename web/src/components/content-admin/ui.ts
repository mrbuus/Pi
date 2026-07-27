// Контент CMS-ийн бүх панелд хуваалцаж ашиглах CSS класс тогтмолууд —
// загварын систем (design system) дагаж бичсэн (bg-surface, text-ink гэх мэт).

export const inputCls =
  "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";

export const primaryBtn =
  "rounded-lg bg-brand-bright py-2 text-sm font-bold text-on-brand transition disabled:opacity-50 hover:brightness-110";

export const secondaryBtn =
  "rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50";

export const dangerBtn =
  "rounded-lg border border-error/40 px-3 py-2 text-sm font-semibold text-error transition hover:bg-error/10 disabled:opacity-50";

export const iconBtn =
  "flex h-7 w-7 items-center justify-center rounded-lg border border-line text-xs text-ink-dim transition hover:border-brand hover:text-ink disabled:opacity-40";

export const badgeCls =
  "rounded-full bg-bg px-2 py-0.5 text-[11px] text-ink-dim";

export function pillCls(active: boolean): string {
  return `rounded-full px-3 py-1 text-xs transition ${
    active
      ? "bg-brand-bright text-on-brand"
      : "border border-line text-ink-dim hover:border-brand"
  }`;
}

export const rowCls = (active: boolean): string =>
  `flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition ${
    active
      ? "border-brand-bright bg-brand-bright/10"
      : "border-line hover:border-brand"
  }`;
