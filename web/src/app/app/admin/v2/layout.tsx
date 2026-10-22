import type { ReactNode } from "react";
import AdminOnly from "@/components/v2/AdminOnly";

// Зөвхөн ADMIN (сервер талд мөн Roles(ADMIN)). Багш, Багш+ URL-аар орвол хаагдана.
export default function Layout({ children }: { children: ReactNode }) {
  return <AdminOnly>{children}</AdminOnly>;
}
