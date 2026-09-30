import type { Metadata } from "next";
import InsightsDashboard from "@/components/insights/InsightsDashboard";

export const metadata: Metadata = {
  title: "Дүн шинжилгээ | Шинэ Ирээдүйн Эзэд",
  description:
    "Оролдлогод суурилсан сэдвийн эзэмшил, бодлогын чанарын бодит хэмжилт",
};

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <InsightsDashboard />
    </div>
  );
}
