import type { Metadata } from "next";
import TeacherHoursTabs from "@/components/teacher-hours/TeacherHoursTabs";

export const metadata: Metadata = {
  title: "Ажилласан цаг | Шинэ Ирээдүйн Эзэд",
  description: "Багш бүрийн хагас сарын ажилласан цаг, цалингийн данс.",
};

export default function TeacherHoursPage() {
  return <TeacherHoursTabs />;
}
