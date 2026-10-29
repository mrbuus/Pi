import type { Metadata } from "next";
import { StudentComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "Хичээл үзэх — Шинэ Ирээдүйн Эзэд",
  description: "Онол, видео, дасгал, шалгалтыг дараалалтайгаар үзэж, ахицаа хянана.",
};

export default function LearnLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <StudentComingSoon title="Хичээл үзэх">{children}</StudentComingSoon>;
}
