import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Нөхөх хичээл — Шинэ Ирээдүйн Эзэд",
  description: "Тасалсан, хоцорсон өдрийн хичээлээ нөхөх, онолын зураг",
};

export default function MakeupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
