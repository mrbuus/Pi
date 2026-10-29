import type { ReactNode } from "react";
import RequireRole from "@/components/nav/RequireRole";
import { StudentComingSoon } from "@/components/ui/ComingSoon";

export default function Layout({ children }: { children: ReactNode }) {
  // Сурагчид одоохондоо «Тун удахгүй» (эзэн 2026-10-29)
  return (
    <StudentComingSoon title="Дасгал">
      <RequireRole allow={["STUDENT"]}>{children}</RequireRole>
    </StudentComingSoon>
  );
}
