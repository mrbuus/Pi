import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сурагчийн явц | Шинэ Ирээдүйн Эзэд",
  description:
    "Сурагчийн ирц, гэрийн даалгавар, идэвх, шалгалтын дүнгийн явцыг нэг дэлгэцэд харах.",
};

export default function StudentProgressLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
