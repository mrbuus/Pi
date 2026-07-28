import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Миний мэдээлэл — Шинэ Ирээдүйн Эзэд",
  description: "Хувийн мэдээлэл, профайл зураг, нууц үгээ энд удирдана.",
};

export default function ProfileLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
