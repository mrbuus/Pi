"use client";

import { useParams } from "next/navigation";
import OnlineStudentDetailClient from "@/components/online/OnlineStudentDetailClient";

export default function OnlineStudentPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  if (!id) return null;
  return <OnlineStudentDetailClient studentId={id} />;
}
