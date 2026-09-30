import type { Metadata } from "next";
import TeacherHoursClient from "@/components/teacher-hours/TeacherHoursClient";

export const metadata: Metadata = {
  title: "Ажилласан цаг | Шинэ Ирээдүйн Эзэд",
  description: "Багш бүрийн сарын хичээлийн цаг — хуваариас автоматаар.",
};

export default function TeacherHoursPage() {
  return <TeacherHoursClient />;
}
