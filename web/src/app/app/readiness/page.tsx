import type { Metadata } from "next";
import ReadinessDashboard from "@/components/readiness/ReadinessDashboard";

export const metadata: Metadata = { title: "Бэлэн байдлын индекс | Шинэ Ирээдүйн Эзэд", description: "Сүүлийн оролдлогод суурилсан ЭЕШ-ийн бэлэн байдал" };

export default function ReadinessPage() { return <ReadinessDashboard />; }
