import type { Metadata } from "next";
import AdminDashboardClient from "./AdminDashboardClient";

export const metadata: Metadata = {
  title: "Удирдлага | Шинэ Ирээдүйн Эзэд",
  description:
    "Хэрэглэгч, багш, анги, эрх, төлбөр — сургалтын төвийн удирдлагын самбар.",
};

export default function AdminPage() {
  return <AdminDashboardClient />;
}
