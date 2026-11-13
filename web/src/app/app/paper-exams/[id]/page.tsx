"use client";

import { useParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getRole } from "@/lib/api";
import { LoadingState } from "@/components/ui/StateBlock";
import PaperBoard from "@/components/paper-exams/PaperBoard";
import StudentPaperDetail from "@/components/paper-exams/StudentPaperDetail";

const noopSubscribe = () => () => {};

/** Ажилтан — багийн хүснэгт, тойм, удирдлага; сурагч — өөрийн дүн + төвийн жагсаалт. */
export default function PaperExamPage() {
  const { id } = useParams<{ id: string }>();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted || !id) return <LoadingState rows={4} />;
  const role = getRole();
  if (role === "STUDENT") return <StudentPaperDetail id={id} />;
  return <PaperBoard id={id} />;
}
