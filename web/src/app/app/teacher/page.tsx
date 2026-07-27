import type { Metadata } from "next";
import TeacherDashboardClient from "./TeacherDashboardClient";

export const metadata: Metadata = {
  title: "Багшийн самбар | Шинэ Ирээдүйн Эзэд",
  description:
    "Ирц, даалгавар, дүгнэлт, анхаарах сурагчид, эцэг эхийн холболт — багшийн өдөр тутмын самбар.",
};

export default function TeacherPage() {
  return <TeacherDashboardClient />;
}
