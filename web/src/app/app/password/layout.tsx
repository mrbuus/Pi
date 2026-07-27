import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Нууц үг солих — Шинэ Ирээдүйн Эзэд",
  description: "Өөрийн бүртгэлийн нууц үгээ шинэчлэн солино уу.",
};

export default function PasswordLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
