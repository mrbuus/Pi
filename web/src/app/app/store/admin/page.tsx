import type { Metadata } from "next";
import AdminProducts from "@/components/store/AdminProducts";

export const metadata: Metadata = { title: "Бүтээгдэхүүн удирдах — Pi.mn" };
export default function AdminStorePage() {
  return <AdminProducts />;
}
