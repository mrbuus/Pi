import { mongoliaDay } from "./dateGroups";

// Stable across API ordering and browser timezones; never select an EXTRA row.
export function dailyFormula<T extends { slug: string; level: string }>(
  items: T[],
  now: Date,
): T | undefined {
  const core = items
    .filter((item) => item.level === "CORE")
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return core.length
    ? core[Math.floor(mongoliaDay(now) / 86400000) % core.length]
    : undefined;
}
