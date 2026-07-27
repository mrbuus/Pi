import { DailyActivity, EngagementLevel } from "./types";

// GET /progress/student/:id (гүнзгий дэлгэц) нь engagement/lastActiveAt-ыг
// шууд буцаадаггүй — зөвхөн жагсаалтын endpoint (onlineStudentsRoster) л
// эдгээрийг SQL түвшинд бодож буцаадаг. Дэлгэрэнгүй хуудсанд БАЙГАА дата
// (dailyActivity, activity.service.ts-ийн yearActivity) дээрээс ижил
// босгоор (progress.service.ts: ENGAGEMENT_ACTIVE_DAYS=3, SLOWING_DAYS=10)
// ОЙРОЛЦОО тооцно — ActivityHeatmap.tsx-ийн "approxStreak" загвартай ижил
// зарчим. Хоногийн нарийвчлалтай (цагийн тэмдэг биш) тул бага зэрэг ойролцоо,
// гэхдээ шинэ endpoint нэмэхгүйгээр хангалттай зорилгодоо нийцнэ.
const ACTIVE_DAYS = 3;
const SLOWING_DAYS = 10;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function deriveLastActiveDate(activity: DailyActivity | undefined | null): string | null {
  if (!activity) return null;
  const today = todayIso();
  for (let i = activity.days.length - 1; i >= 0; i -= 1) {
    const day = activity.days[i];
    if (day.date > today) continue;
    if (day.count > 0) return day.date;
  }
  return null;
}

export function deriveEngagement(lastActiveDate: string | null): EngagementLevel {
  if (!lastActiveDate) return "DORMANT";
  const daysInactive = Math.floor(
    (Date.now() - new Date(`${lastActiveDate}T00:00:00Z`).getTime()) / 86400000,
  );
  if (daysInactive <= ACTIVE_DAYS) return "ACTIVE";
  if (daysInactive <= SLOWING_DAYS) return "SLOWING";
  return "DORMANT";
}
