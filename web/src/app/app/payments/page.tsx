import type { Metadata } from "next";
import { Suspense } from "react";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import PaymentsClient from "./PaymentsClient";

export const metadata: Metadata = {
  title: "Төлбөр | Шинэ Ирээдүйн Эзэд",
  description: "Анги, сурагч бүрийн сарын төлбөр, өр, амлалт, баталгаажуулалт.",
};

export default function PaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4" role="status" aria-label="Ачаалж байна">
          <SkeletonCard className="h-48" />
          <SkeletonRows rows={8} />
        </div>
      }
    >
      <PaymentsClient />
    </Suspense>
  );
}
