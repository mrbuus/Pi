import type { Metadata } from "next";
import SolveView from "@/components/internal/SolveView";

export const metadata: Metadata = { title: "Ноорог бодох — Pi.mn" };

export default async function InternalSolvePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SolveView id={id} />;
}
