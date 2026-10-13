import type { Metadata } from "next";
import StudentLedger from "@/components/payments/StudentLedger";

export const metadata: Metadata = { title: "Сурагчийн төлбөр | Шинэ Ирээдүйн Эзэд" };

export default async function StudentPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StudentLedger key={id} id={id} />;
}
