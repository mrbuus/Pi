"use client";

import { Suspense } from "react";
import RequireRole from "@/components/nav/RequireRole";
import MyClassHub from "@/components/student-hub/MyClassHub";
import { LoadingState } from "@/components/ui/StateBlock";

/** Сурагчийн «Хичээл» hub (SURAGCH-V2-GEREE, 2026-10-31) */
export default function MyClassPage() {
  return (
    <RequireRole allow={["STUDENT"]}>
      <Suspense fallback={<LoadingState rows={6} label="Хичээл" />}>
        <MyClassHub />
      </Suspense>
    </RequireRole>
  );
}
