import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Хичээл — Шинэ Ирээдүйн Эзэд",
  description: "Хичээлийн өдөр бүрийн сэдэв, тест, ирц, даалгаврын тэмдэглэгээ, онолын зураг нэг дор",
};

export default function MyClassLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
