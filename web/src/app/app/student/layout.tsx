import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Миний самбар — Шинэ Ирээдүйн Эзэд",
  description:
    "Даалгавар, шалгалтын дүн, ирц, сул талуудаа нэг дороос хянана.",
};

export default function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
