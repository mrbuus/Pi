import type { Metadata } from "next";
import FinanceDashboardClient from "@/components/finance/FinanceDashboardClient";

export const metadata: Metadata = {
  title: "Санхүүгийн тайлан | Шинэ Ирээдүйн Эзэд",
  description:
    "Сургалтын төвийн интегрирован орлого/зарлагын тайлан, зарлагын бүртгэл.",
};

export default function FinancePage() {
  return <FinanceDashboardClient />;
}
