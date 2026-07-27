import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Хүүхдийн явц — Шинэ Ирээдүйн Эзэд",
  description:
    "Баталгаажсан хүүхдийнхээ ирц, даалгавар, шалгалтын дүнгийн явцыг хянана.",
};

export default function ParentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
