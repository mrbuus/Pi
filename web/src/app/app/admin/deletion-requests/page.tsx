import type { Metadata } from "next";
import DeletionRequestsClient from "@/components/admin/deletion/DeletionRequestsClient";

export const metadata: Metadata = {
  title: "Устгах хүсэлт | Шинэ Ирээдүйн Эзэд",
  description:
    "Аппаас ирсэн бүртгэл устгах хүсэлтийг хянах, шийдвэрлэх.",
};

export default function DeletionRequestsPage() {
  return <DeletionRequestsClient />;
}
