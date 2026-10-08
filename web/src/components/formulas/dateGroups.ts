// Calendar comparisons use Mongolia's day and Monday-based week, not the
// browser's timezone or a rolling 7-day duration.
export function mongoliaDay(value: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (name: string) =>
    Number(parts.find((p) => p.type === name)?.value);
  return Date.UTC(part("year"), part("month") - 1, part("day"));
}
export function dateGroup(
  date: string | null,
  now: Date,
): "today" | "week" | "earlier" {
  if (!date || Number.isNaN(Date.parse(date))) return "earlier";
  const today = mongoliaDay(now),
    day = mongoliaDay(new Date(date));
  const monday = today - ((new Date(today).getUTCDay() + 6) % 7) * 86400000;
  return day === today
    ? "today"
    : day >= monday && day < today
      ? "week"
      : "earlier";
}
