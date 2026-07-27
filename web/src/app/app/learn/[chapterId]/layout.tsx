import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Хичээл — Шинэ Ирээдүйн Эзэд",
  description: "Онол, видео, дасгал, шалгалтыг дараалалтайгаар үзнэ.",
};

export default function LearnChapterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
