import type { Metadata } from "next";
import ClassBoard from "@/components/payments/ClassBoard";

export const metadata: Metadata = { title: "Ангийн төлбөр | Шинэ Ирээдүйн Эзэд" };

export default async function ClassPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClassBoard key={id} id={id} />;
}
