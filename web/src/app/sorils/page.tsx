import type { Metadata } from "next";
import SorilsClient from "@/components/mock-exams/SorilsClient";

export const metadata: Metadata = {
  title: "Жишиг сорил | Шинэ Ирээдүйн Эзэд",
  description: "Долоо хоног бүрийн онлайн жишиг сорил: ЭЕШ-ийн бүтэцтэй, хугацаатай, дүн, байр шууд",
};

export default function SorilsPage() {
  return <SorilsClient />;
}
