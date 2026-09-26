import type { ReactNode } from "react";
import RequireRole from "@/components/nav/RequireRole";

export default function TeacherHoursLayout({ children }: { children: ReactNode }) {
  return <RequireRole allow={["TEACHER", "TEACHER_PLUS", "ADMIN"]}>{children}</RequireRole>;
}
