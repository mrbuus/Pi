import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сурагчийн жагсаалт | Шинэ Ирээдүйн Эзэд",
  description:
    "Бүх 359 сурагчийг хайх, шүүх — анги, секц, салбар, төлбөрийн төлвөөр.",
};

export default function AdminStudentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
