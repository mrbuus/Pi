import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Онлайн сурагчийн профайл | Шинэ Ирээдүйн Эзэд",
  description:
    "Нэг онлайн сурагчийн идэвх, явц, тестийн түүх — багш+/админд засварын хяналттай.",
};

export default function OnlineStudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
