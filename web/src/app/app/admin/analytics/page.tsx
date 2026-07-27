import type { Metadata } from "next";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export const metadata: Metadata = {
  title: "Аналитик самбар | Шинэ Ирээдүйн Эзэд",
  description:
    "Сурагчдын идэвх, ангийн оролцоо, сэдвийн амжилт болон эрсдэлтэй сурагчдын жагсаалт.",
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
