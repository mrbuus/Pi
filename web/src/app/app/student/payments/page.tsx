import type { Metadata } from "next";
import StudentPaymentsClient from "./StudentPaymentsClient";

export const metadata: Metadata = {
  title: "Миний төлбөр | Шинэ Ирээдүйн Эзэд",
  description: "Төлбөрийн түүх, төлөлт, үлдэгдэл дүнг харах.",
};

export default function StudentPaymentsPage() {
  return <StudentPaymentsClient />;
}
