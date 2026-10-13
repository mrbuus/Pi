import { FILL_EMPTY, parseFillSlots } from "@/components/exam/fillSlots";

export type ReviewLevel = "NONE" | "PROBLEMS" | "FULL";

export const LEVEL_LABEL: Record<ReviewLevel, string> = {
  NONE: "Хаалттай",
  PROBLEMS: "Зөвхөн бодлого",
  FULL: "Бүтэн (хариу, бодолт)",
};

function parts(value: string | Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), min: get("minute") };
}

/** Улаанбаатарын цагаар «2026.10.15 14:30» */
export function dateTimeUB(value: string | Date): string {
  const p = parts(value);
  return p ? `${p.y}.${p.m}.${p.d} ${p.h}:${p.min}` : "";
}

/** <input type="datetime-local">-ийн утга (УБ цаг) */
export function toLocalInputUB(value: string | Date): string {
  const p = parts(value);
  return p ? `${p.y}-${p.m}-${p.d}T${p.h}:${p.min}` : "";
}

/** datetime-local (УБ цаг) → ISO */
export function fromLocalInputUB(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}:00+08:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Нөхөх бодлогын хариу (нүднүүдийн цифрийг залгасан нэг стринг, жиш: "354")-г
 * бодлогын [a][bc] тэмдэглэгээний дарааллаар үсэг бүрт хуваана.
 */
export function splitFillAnswer(
  statement: string | null | undefined,
  value: unknown,
): { letter: string; value: string }[] | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([letter, v]) => ({ letter, value: String(v) }));
  }
  const text = String(value);
  const letters = parseFillSlots(statement).flatMap((g) => g.key.split(""));
  if (letters.length === 0) return [{ letter: "", value: text }];
  // "_" = сурагч хоосон орхисон нүд (fillSlots.ts FILL_EMPTY)
  return letters.map((letter, i) => ({
    letter,
    value: text[i] === FILL_EMPTY ? "" : (text[i] ?? ""),
  }));
}
