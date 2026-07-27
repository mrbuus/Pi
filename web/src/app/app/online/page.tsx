import type { Metadata } from "next";
import OnlineRosterClient from "@/components/online/OnlineRosterClient";

export const metadata: Metadata = {
  title: "Онлайн сурагчид | Шинэ Ирээдүйн Эзэд",
  description:
    "Ангигүй, онлайн эрх худалдаж авсан сурагчдын идэвх, эрхийн төлөв, амжилтыг нэг дороос хардаг самбар.",
};

export default function OnlinePage() {
  return <OnlineRosterClient />;
}
