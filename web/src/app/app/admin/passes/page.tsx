import type { Metadata } from "next";
import PassesAdminClient from "@/components/passes-admin/PassesAdminClient";

export const metadata: Metadata = {
  title: "Эрхийн удирдлага | Шинэ Ирээдүйн Эзэд",
};

export default function PassesPage() {
  return <PassesAdminClient />;
}
