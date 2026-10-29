import type { Metadata } from "next";
import { StudentComingSoon } from "@/components/ui/ComingSoon";

export const metadata: Metadata = {
  title: "Миний зорилго | Шинэ Ирээдүйн Эзэд",
  description:
    "Сурагчийн өөрийн сурлагын зорилтуудыг тодорхойлж, зорилтот хугацаа тавьж, явцаа хянах хуудас.",
};

export default function GoalsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <StudentComingSoon title="Миний зорилго">{children}</StudentComingSoon>;
}
