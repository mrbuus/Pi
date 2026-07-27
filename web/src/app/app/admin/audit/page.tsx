import type { Metadata } from "next";
import AuditClient from "@/components/audit/AuditClient";

export const metadata: Metadata = {
  title: "Аудит лог | Шинэ Ирээдүйн Эзэд",
  description:
    "Систем дэх бүх өөрчлөлт — хэн, юуг, хэзээ, ямар шалтгаанаар өөрчилснийг харах, шүүх.",
};

export default function AuditPage() {
  return <AuditClient />;
}
