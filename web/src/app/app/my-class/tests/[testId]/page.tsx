"use client";

import { useParams } from "next/navigation";
import RequireRole from "@/components/nav/RequireRole";
import TestView from "@/components/student-hub/TestView";

/** Анги хийсэн тестийн бодлого, хариу — GET /student-hub/tests/:testId */
export default function MyClassTestPage() {
  const params = useParams<{ testId: string }>();
  return (
    <RequireRole allow={["STUDENT"]}>
      <TestView testId={decodeURIComponent(params.testId)} />
    </RequireRole>
  );
}
