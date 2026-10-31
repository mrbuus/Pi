"use client";

import { Suspense } from "react";
import RequireRole from "@/components/nav/RequireRole";
import TheoryBrowser from "@/components/student-hub/TheoryBrowser";
import { LoadingState } from "@/components/ui/StateBlock";

/** Сурагчийн «Онолын зураг» (V2, эзэн 2026-10-31) — ?date=YYYY-MM-DD&c=classroomId тухайн өдөр */
export default function TheoryPage() {
  return (
    <RequireRole allow={["STUDENT"]}>
      <Suspense fallback={<LoadingState rows={5} />}>
        <TheoryBrowser />
      </Suspense>
    </RequireRole>
  );
}
