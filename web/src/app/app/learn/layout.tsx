import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Хичээл үзэх — Шинэ Ирээдүйн Эзэд",
  description: "Онол, видео, дасгал, шалгалтыг дараалалтайгаар үзэж, ахицаа хянана.",
};

export default function LearnLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
