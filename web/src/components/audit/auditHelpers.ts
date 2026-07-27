import { formatMnt } from "@/lib/orgInfo";

/** API алдааг хэрэглэгчид харуулах эвтэй мессеж болгоно. */
export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

// Мөнгө болон дүнтэй холбоотой талбарууд — эзэмшигчийн шаардлагаар
// хамгийн анхаарал татахуйц харагдана
export const MONEY_FIELD =
  /amount|price|paid|shortfall|balance|tuition|outstanding|expected/i;
// Дүн/оноотой холбоотой талбарууд (шалгалт, тест, гэрийн даалгавар)
export const GRADE_FIELD = /grade|score|mark|result/i;

// Entity нэрээр мөнгө/дүнтэй холбоотой бичлэгийг ялгаж, жагсаалтад тодруулна
export const MONEY_ENTITY = /payment/i;
export const GRADE_ENTITY = /testresult|attempt/i;

const FIELD_LABEL: Record<string, string> = {
  amount: "Дүн",
  method: "Арга",
  status: "Төлөв",
  paidAt: "Төлсөн огноо",
  forMonth: "Аль сар",
  description: "Тайлбар",
  grade: "Анги",
  score: "Оноо",
  reason: "Шалтгаан",
  tuitionAmount: "Сургалтын төлбөр",
  tuitionPlan: "Төлбөрийн багц",
  firstName: "Нэр",
  lastName: "Овог",
  phone: "Утас",
  revokedUserPassIds: "Цуцлагдсан эрхүүд",
  grantedPassId: "Олгосон эрх",
  passId: "Эрх",
  role: "Эрх (role)",
  archived: "Архивласан",
  title: "Гарчиг",
  name: "Нэр",
};

export function fieldLabel(key: string): string {
  return FIELD_LABEL[key] ?? key;
}

function looksIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
}

export function formatDiffValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Тийм" : "Үгүй";
  if (typeof value === "number") {
    return MONEY_FIELD.test(key) ? formatMnt(value) : value.toLocaleString("en-US");
  }
  if (typeof value === "string") {
    if (value === "[REDACTED]") return "🔒 нууцалсан";
    if (looksIsoDate(value)) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) return d.toLocaleString("en-US");
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((v) => String(v)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export interface DiffField {
  key: string;
  before: unknown;
  after: unknown;
  changed: boolean;
  prominent: boolean;
}

/** before/after JSON-г талбар тус бүрээр харьцуулж уншихад хялбар жагсаалт болгоно. */
export function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): DiffField[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  const fields: DiffField[] = [];
  for (const key of keys) {
    const b = before ? before[key] : undefined;
    const a = after ? after[key] : undefined;
    const changed = JSON.stringify(b) !== JSON.stringify(a);
    fields.push({
      key,
      before: b,
      after: a,
      changed,
      prominent: MONEY_FIELD.test(key) || GRADE_FIELD.test(key),
    });
  }
  // Өөрчлөгдсөн, мөнгө/дүнтэй холбоотой чухал талбарууд эхэндээ гарна
  fields.sort((x, y) => {
    if (x.changed !== y.changed) return x.changed ? -1 : 1;
    if (x.prominent !== y.prominent) return x.prominent ? -1 : 1;
    return x.key.localeCompare(y.key);
  });
  return fields;
}
