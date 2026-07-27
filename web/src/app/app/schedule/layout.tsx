import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Хичээлийн хуваарь — Шинэ Ирээдүйн Эзэд",
  description:
    "Долоо хоногийн хичээлийн хуваарь, ойрын амралт/завсарлагатай өдрүүд нэг дороос.",
};

export default function ScheduleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
