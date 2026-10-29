import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Гэрийн даалгавар — Шинэ Ирээдүйн Эзэд",
  description: "Хичээлийн дараах гэрийн даалгавар, шалгах, илгээх, дэвтрийн зураг",
};

export default function HomeworkLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
