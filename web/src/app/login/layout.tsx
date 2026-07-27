import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Нэвтрэх — Шинэ Ирээдүйн Эзэд",
  description:
    "Утас, имэйл эсвэл нэвтрэх нэрээрээ Шинэ Ирээдүйн Эзэд сургалтын төвийн системд нэвтэрнэ үү.",
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
