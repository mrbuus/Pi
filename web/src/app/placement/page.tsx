import type { Metadata } from "next";
import PlacementClient from "@/components/placement/PlacementClient";

export const metadata: Metadata = {
  title: "Түвшин тогтоох шалгалт | Шинэ Ирээдүйн Эзэд",
  description: "Математикийн түвшин тогтоох шалгалт: цагтай тест бодоод бодолтын зургаа илгээ, багш түвшинг чинь тогтоож холбогдоно",
};

export default function PlacementPage() {
  return <PlacementClient />;
}
