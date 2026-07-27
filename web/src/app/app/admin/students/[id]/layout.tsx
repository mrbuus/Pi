import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сурагчийн дэлгэрэнгүй | Шинэ Ирээдүйн Эзэд",
  description:
    "Нэг сурагчийн бүх мэдээлэл, төлбөр, тэмдэглэл, идэвх нэг дэлгэцэд.",
};

export default function AdminStudentDetailLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
