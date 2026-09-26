import type { ReactNode } from "react";
import RequireRole from "@/components/nav/RequireRole";

export default function Layout({ children }: { children: ReactNode }) {
  return <RequireRole allow={["ADMIN", "TEACHER_PLUS"]}>{children}</RequireRole>;
}
