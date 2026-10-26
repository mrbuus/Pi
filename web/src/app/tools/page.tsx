import type { Metadata } from "next";
import { Suspense } from "react";
import PublicShell from "@/components/tools/core/PublicShell";
import ToolsEntry from "@/components/tools/core/ToolsEntry";
import { LoadingState } from "@/components/ui/StateBlock";

export const metadata: Metadata = {
  title: "Хэрэглэгдэхүүн | Шинэ Ирээдүйн Эзэд",
  description: "График, хавтгайн дүрс, огторгуйн биет, томьёо, бодогч, тор цаас: багш, сурагч бүхэнд нэвтрэлтгүй",
};

export default function ToolsPage() {
  return (
    <PublicShell>
      <Suspense fallback={<LoadingState rows={6} />}>
        <ToolsEntry basePath="/tools" />
      </Suspense>
    </PublicShell>
  );
}
