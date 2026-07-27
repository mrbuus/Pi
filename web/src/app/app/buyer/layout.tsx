import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Миний эрхүүд — Шинэ Ирээдүйн Эзэд",
  description: "Идэвхтэй эрх, ном, багц, төлбөрөө нэг дороос удирдана.",
};

export default function BuyerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
