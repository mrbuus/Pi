import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Бүртгүүлэх — Шинэ Ирээдүйн Эзэд",
  description:
    "Танхимын сурагч, эцэг эх эсвэл цахим ном, тестээр бие даан суралцах хэрэглэгчээр бүртгүүлнэ үү. Төвийн шинэ онлайн ангийн элсэлт одоогоор нээгдээгүй.",
};

export default function RegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
