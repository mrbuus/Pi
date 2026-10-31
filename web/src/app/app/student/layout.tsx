import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Миний самбар — Шинэ Ирээдүйн Эзэд",
  description:
    "Өнөөдрийн хичээл, ирц, даалгаврын хувь, багшийн тэмдэглэгээ нэг дор",
};

export default function StudentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
