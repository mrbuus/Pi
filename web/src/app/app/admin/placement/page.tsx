import type { Metadata } from "next";
import PlacementAdminClient from "@/components/placement/PlacementAdminClient";

export const metadata: Metadata = {
  title: "Түвшин тогтоох шалгалт | Шинэ Ирээдүйн Эзэд",
};

export default function PlacementAdminPage() {
  return <PlacementAdminClient />;
}
