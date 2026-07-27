import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ажилтны төлөвлөгч | Шинэ Ирээдүйн Эзэд",
  description:
    "16 ажилтан жилийн ажлаа жижиг даалгавар болгон хуваан, хариуцагчаа оноож, ачааллаа тэнцвэржүүлэх төлөвлөгч.",
};

export default function PlannerLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
