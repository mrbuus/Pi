// api/src/activity сервистэй тохирсон хэлбэрүүд — эдгээрийг ӨӨРЧЛӨХӨӨС ӨМНӨ
// backend-ийн ActivityService/ActivityController-той тулгаж шалгаарай.
import type { CSSProperties } from "react";

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  date: string; // "YYYY-MM-DD"
  count: number;
  level: ActivityLevel;
  isHoliday: boolean;
  isClassDay: boolean;
}

export interface YearActivityResponse {
  year: number;
  totalActiveDays: number;
  days: ActivityDay[];
}

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

export interface ClassActivityDay {
  date: string;
  activeStudents: number;
  totalStudents: number;
  percent: number;
  level: ActivityLevel;
  isHoliday: boolean;
  isClassDay: boolean;
}

export interface ClassYearActivityResponse {
  year: number;
  totalStudents: number;
  days: ClassActivityDay[];
}

// Идэвхийн түвшин → өнгөний класс (brand/teal ramp, ХОЁР горимд ажиллана).
// Level 0-ийг ганц өнгөөр биш, бусад cell-үүдээс тод ялгаатай, өгөгдмөл саарал
// дэвсгэрээр үзүүлнэ — үүнийг title/aria-label-той хослуулж хэрэглэнэ, өнгө дангаараа
// утга илэрхийлдэггүй.
export const LEVEL_CLASS: Record<ActivityLevel, string> = {
  0: "bg-ink/5",
  1: "bg-accent-teal/20",
  2: "bg-accent-teal/40",
  3: "bg-accent-teal/65",
  4: "bg-accent-teal/90",
};

// Амралт/завсарлагын өдрийн диагональ сүлбэн хээ (color-blind-safe: зөвхөн өнгөөр
// ялгаагүй, хээгээр + зурвас хүрээгээр ялгарна).
export const HOLIDAY_HATCH_STYLE: CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(45deg, var(--line) 0, var(--line) 1.5px, transparent 1.5px, transparent 5px)",
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
