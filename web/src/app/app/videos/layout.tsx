import type { ReactNode } from "react";
import { StudentComingSoon } from "@/components/ui/ComingSoon";

// Сурагчид одоохондоо «Тун удахгүй» (эзэн 2026-10-29); ажилтан, худалдан авагч хэвээр
export default function VideosLayout({ children }: { children: ReactNode }) {
  return <StudentComingSoon title="Онлайн хичээл">{children}</StudentComingSoon>;
}
