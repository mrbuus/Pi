import type { Metadata } from "next";
import MockExamsAdminClient from "@/components/mock-exams/MockExamsAdminClient";

export const metadata: Metadata = { title: "Жишиг сорил | Шинэ Ирээдүйн Эзэд" };

export default function MockExamsAdminPage() {
  return <MockExamsAdminClient />;
}
