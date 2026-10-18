"use client";

import RequireRole from "@/components/nav/RequireRole";
import StudentMakeupView from "@/components/makeup/StudentMakeupView";

/** Сурагчийн «Нөхөх хичээл» (эзэн 2026-10-18) — нөхөх үүрэг + онолын зураг */
export default function MakeupPage() {
  return (
    <RequireRole allow={["STUDENT"]}>
      <StudentMakeupView />
    </RequireRole>
  );
}
