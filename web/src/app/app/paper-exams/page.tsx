"use client";

import { useEffect, useSyncExternalStore } from "react";
import { getRole } from "@/lib/api";
import { LoadingState } from "@/components/ui/StateBlock";
import PaperExamsList from "@/components/paper-exams/PaperExamsList";

const noopSubscribe = () => () => {};

/** Ажилтны «Нэгдсэн шалгалт» (төвийн цаасан шалгалт: OMR / Excel). Сурагч «Шалгалт» → «Нэгдсэн шалгалт» таб руу. */
export default function PaperExamsPage() {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const role = mounted ? getRole() : null;
  const staff = role === "ADMIN" || role === "TEACHER_PLUS" || role === "TEACHER";
  useEffect(() => {
    if (mounted && !staff) window.location.replace("/app/tests?tab=paper");
  }, [mounted, staff]);
  if (!mounted || !staff) return <LoadingState rows={3} />;
  return <PaperExamsList canManage={role === "ADMIN" || role === "TEACHER_PLUS"} />;
}
