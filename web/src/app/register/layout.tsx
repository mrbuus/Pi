import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Бүртгүүлэх — Шинэ Ирээдүйн Эзэд",
  description:
    "Танхимын болон онлайн сурагч, эцэг эх, худалдан авагч гэсэн төрлөөр Шинэ Ирээдүйн Эзэд сургалтын төвд бүртгүүлнэ үү.",
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
