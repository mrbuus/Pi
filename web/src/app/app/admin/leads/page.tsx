import type { Metadata } from "next";
import LeadInboxClient from "@/components/leads/LeadInboxClient";

export const metadata: Metadata = {
  title: "Хүсэлтийн урсгал | Шинэ Ирээдүйн Эзэд",
  description:
    "Facebook-с ирсэн элсэлтийн хүсэлтүүдийг нэг дороос хүлээн авч, төлөвийг нь хөтлөх самбар.",
};

export default function LeadsPage() {
  return <LeadInboxClient />;
}
