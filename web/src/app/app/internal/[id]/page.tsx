import type { Metadata } from "next";
import SetEditor from "@/components/internal/SetEditor";

export const metadata: Metadata = { title: "Ноорог — Pi.mn" };

export default async function InternalSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SetEditor id={id} />;
}
