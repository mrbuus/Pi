// "Ангийн явц" табын огнооны мужийн туслах функцууд — цэвэр функцүүд (React
// hook биш), учир нь logики state нь ClassProgressTab.tsx дотор байрлана.
// Өгөгдмөл нь сүүлийн 30 хоног; "өмнөх/дараагийн сар" товч бүрд бүтэн
// хуанлийн сараар (1-ний өдрөөс сарын сүүлийн өдөр хүртэл) шилждэг.
import { addDaysToDateKey, ubToday } from "@/components/homework/homeworkDate";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export interface MonthRange {
  from: string;
  to: string;
  label: string;
}

// monthsBack = 0 → сүүлийн 30 хоног (өгөгдмөл). monthsBack >= 1 → тухайн
// тооны сарын өмнөх БҮТЭН хуанлийн сар (1-ний өдрөөс сарын сүүлчийн өдөр хүртэл).
export function monthRangeFor(monthsBack: number): MonthRange {
  const today = ubToday();
  if (monthsBack <= 0) {
    return {
      from: addDaysToDateKey(today, -29),
      to: today,
      label: "Сүүлийн 30 хоног",
    };
  }

  const [ty, tm] = today.split("-").map(Number); // tm нь 1-ээс эхэлсэн сар
  const totalMonths = ty * 12 + (tm - 1) - monthsBack;
  const y = Math.floor(totalMonths / 12);
  const m0 = ((totalMonths % 12) + 12) % 12; // 0-ээс эхэлсэн сар

  const from = `${y}-${pad2(m0 + 1)}-01`;
  const lastDay = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
  const to = `${y}-${pad2(m0 + 1)}-${pad2(lastDay)}`;
  const label = `${y} оны ${m0 + 1}-р сар`;

  return { from, to, label };
}
