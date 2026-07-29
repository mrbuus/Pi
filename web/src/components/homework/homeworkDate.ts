// Өдөр тутмын гэрийн даалгаврын тэмдэглэгээний (daily homework marking grid)
// огнооны туслах функцууд. Улаанбаатарын "өнөөдөр" тодорхойлолт болон
// хуанлийн арифметик (`ubToday`/`ubDateKey`)-ийг TeacherHomeworkCalendar-аас
// дахин ашиглана — хоёр газар цагийн бүсийн логик давхардуулахгүй.
export { ubDateKey, ubToday } from "./TeacherHomeworkCalendar";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

// Монгол долоо хоногийн дугаарлалт: Даваа = 1 дэх, Мягмар = 2 дахь,
// Лхагва = 3 дахь, Пүрэв = 4 дэх, Баасан = 5 дахь, Бямба = 6 дахь,
// Ням = 7 дэх өдөр (эзний тогтоосон дараалал).
const WEEKDAY_ORDINAL: Record<number, { n: number; suffix: string }> = {
  1: { n: 1, suffix: "дэх" }, // Даваа
  2: { n: 2, suffix: "дахь" }, // Мягмар
  3: { n: 3, suffix: "дахь" }, // Лхагва
  4: { n: 4, suffix: "дэх" }, // Пүрэв
  5: { n: 5, suffix: "дахь" }, // Баасан
  6: { n: 6, suffix: "дахь" }, // Бямба
  7: { n: 7, suffix: "дэх" }, // Ням
};

// "7 сарын 29, 3 дахь өдөр" — сарын дугаар + өдөр + монгол долоо хоногийн
// дугаарлалт. dateKey нь аль хэдийн шийдэгдсэн лаборын өдөр ("YYYY-MM-DD")
// тул цагийн бүсийн дахин хөрвүүлэлт хийхгүй (UTC-ээр л parse хийнэ).
export function mnDayOrdinalLabel(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  const jsDay = new Date(`${dateKey}T12:00:00Z`).getUTCDay(); // 0=Ням
  const isoDay = jsDay === 0 ? 7 : jsDay;
  const { n, suffix } = WEEKDAY_ORDINAL[isoDay];
  return `${month} сарын ${day}, ${n} ${suffix} өдөр`;
}
