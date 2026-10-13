// Монгол огноо/цаг — хөтчийн ICU-д найдахгүй.
//
// Chromium (Chrome, Edge, Electron) нь "mn-MN" locale-ийн өгөгдөлгүй тул
// `toLocaleString("mn-MN")` чимээгүйгээр en-US руу буцаж «Oct 8»,
// «10/7/2026, 10:53 AM» гэж харуулдаг. Энд зөвхөн тоон хэсгийг Intl-ээс
// аваад монгол хэлбэрийг өөрсдөө угсарна. Intl.DateTimeFormat-ийн options-ыг
// (dateStyle/timeStyle орно) хүлээн авах тул дуудах газрыг солиход хялбар.
//
// Цагийн бүс өгөгдөөгүй бол Улаанбаатар (STATUS.md §8.9).

type DateInput = Date | string | number;
type Opts = Intl.DateTimeFormatOptions;

const WEEKDAY_LONG = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
const WEEKDAY_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

function parts(value: DateInput, timeZone: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const map: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(date)) {
    map[p.type] = p.value;
  }
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour === "24" ? "00" : map.hour,
    minute: map.minute,
    second: map.second,
    weekday: WEEKDAY_INDEX[map.weekday] ?? 0,
  };
}

function render(value: DateInput, o: Opts, fallback: "date" | "time" | "both") {
  const p = parts(value, o.timeZone ?? "Asia/Ulaanbaatar");
  if (!p) return "";

  // dateStyle/timeStyle-ийг тусдаа талбар руу задлах
  const opts: Opts = { ...o };
  if (o.dateStyle) {
    opts.year = "numeric";
    opts.month = o.dateStyle === "short" ? "2-digit" : "long";
    opts.day = "numeric";
    if (o.dateStyle === "full") opts.weekday = "long";
  }
  if (o.timeStyle) {
    opts.hour = "2-digit";
    opts.minute = "2-digit";
    if (o.timeStyle !== "short") opts.second = "2-digit";
  }

  let hasDate = !!(opts.year || opts.month || opts.day || opts.weekday);
  let hasTime = !!(opts.hour || opts.minute || opts.second);
  if (!hasDate && !hasTime) {
    // toLocaleDateString / toLocaleString-ийн өгөгдмөл
    if (fallback !== "time") {
      opts.year = opts.month = opts.day = "numeric";
      hasDate = true;
    }
    if (fallback !== "date") {
      opts.hour = opts.minute = "2-digit";
      hasTime = true;
    }
  }

  const out: string[] = [];
  if (hasDate && (opts.year || opts.month || opts.day)) {
    const m = Number(p.month);
    const d = Number(p.day);
    if (opts.month === "short" || opts.month === "long") {
      // «2026 оны 10-р сарын 8»
      let s = `${m}-р сар`;
      if (opts.day) s += `ын ${d}`;
      if (opts.year) s = `${p.year} оны ${s}`;
      out.push(s);
    } else {
      // «2026.10.07» — тоон хэлбэр
      out.push(
        [opts.year && p.year, opts.month && p.month, opts.day && p.day]
          .filter(Boolean)
          .join("."),
      );
    }
  }
  if (opts.weekday) {
    const name = (opts.weekday === "long" ? WEEKDAY_LONG : WEEKDAY_SHORT)[p.weekday];
    if (out.length) out[out.length - 1] += ",";
    out.push(name);
  }
  if (hasTime) {
    out.push(
      [opts.hour && p.hour, opts.minute && p.minute, opts.second && p.second]
        .filter(Boolean)
        .join(":"),
    );
  }
  return out.join(" ");
}

/** `toLocaleDateString("mn-MN", opts)`-ийн оронд. Өгөгдмөл: 2026.10.07 */
export function formatMnDate(value: DateInput, opts: Opts = {}) {
  return render(value, opts, "date");
}

/** `toLocaleString("mn-MN", opts)` болон `Intl.DateTimeFormat("mn-MN", opts).format`-ийн оронд. Өгөгдмөл: 2026.10.07 10:53 */
export function formatMnDateTime(value: DateInput, opts: Opts = {}) {
  return render(value, opts, "both");
}

/** `toLocaleTimeString("mn-MN", opts)`-ийн оронд. Өгөгдмөл: 10:53 */
export function formatMnTime(value: DateInput, opts: Opts = {}) {
  return render(value, opts, "time");
}
