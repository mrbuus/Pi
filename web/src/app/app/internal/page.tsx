import type { Metadata } from "next";
import SetList from "@/components/internal/SetList";

export const metadata: Metadata = { title: "Дотоод — Pi.mn" };

export default function InternalPage() {
  return <SetList />;
}
