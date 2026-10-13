// Сурагч хэр удаан суралцаж байгааг «2 сар 11 хоног» хэлбэрээр.
// Цэвэр функц — огноог YYYY-MM-DD (Улаанбаатарын календарийн өдөр) гэж үзнэ.

function ymd(value: string | Date): { y: number; m: number; d: number } | null {
  const s = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Календарийн жил/сар/хоногийн зөрүү. `to` < `from` бол null. */
export function studyDuration(
  from: string | Date,
  to: string | Date = new Date(),
): { years: number; months: number; days: number } | null {
  const a = ymd(from);
  const b = ymd(to);
  if (!a || !b) return null;
  let years = b.y - a.y;
  let months = b.m - a.m;
  let days = b.d - a.d;
  if (days < 0) {
    months -= 1;
    const pm = b.m === 1 ? 12 : b.m - 1;
    const py = b.m === 1 ? b.y - 1 : b.y;
    days += daysInMonth(py, pm);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return null;
  return { years, months, days };
}

/** «1 жил 2 сар», «2 сар 11 хоног», «5 хоног», «Өнөөдөр эхэлсэн». */
export function studyDurationLabel(from: string | Date, to: string | Date = new Date()): string | null {
  const d = studyDuration(from, to);
  if (!d) return null;
  const parts: string[] = [];
  if (d.years) parts.push(`${d.years} жил`);
  if (d.months) parts.push(`${d.months} сар`);
  // Жилээр тоолох үед хоног нэмэх нь илүүц — уншихад хүнд
  if (d.days && !d.years) parts.push(`${d.days} хоног`);
  return parts.length ? parts.join(" ") : "Өнөөдөр эхэлсэн";
}
