"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getRole, homeForRole } from "@/lib/api";

const STAFF_ROLES = new Set(["ADMIN", "TEACHER_PLUS", "TEACHER"]);

// Онлайн сурагчийн бүх дэд хуудсууд (жагсаалт + дэлгэрэнгүй) багш эрхтэй
// хүмүүст л зориулагдсан. Энгийн TEACHER мөн орж болно — тэр зөвхөн уншиж
// харна (READ-ONLY хяналт нь дэд компонент бүрт тусад нь шалгагдана), харин
// STUDENT/PARENT/BUYER рольтой хэн ч энд хандах ёсгүй тул нүүр хуудас руу нь буцаана.
export default function OnlineLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const role = useSyncExternalStore(
    () => () => {},
    getRole,
    () => null,
  );

  useEffect(() => {
    if (role && !STAFF_ROLES.has(role)) {
      router.replace(homeForRole(role));
    }
  }, [role, router]);

  if (!role || !STAFF_ROLES.has(role)) return null;

  return <>{children}</>;
}
