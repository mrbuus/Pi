"use client";

import type { ReactNode } from "react";
import { getRole } from "@/lib/api";

interface RequireRoleProps {
  /** Зөвшөөрөгдсөн rolууд — сервер талын @Roles decorator-той яг тохирно */
  allow: string[];
  children: ReactNode;
}

// Cамбарын route-ууд (жш: /app/admin/*) серверт @Roles + RolesGuard-аар
// хамгаалагдсан ч клиент талд өмнө нь зөвхөн НЭГ цэс/меню л нуудаг байсан —
// URL-г шууд бичиж орвол эрхгүй хэрэглэгчид ч бүтэн UI нээгддэг байв (энэ
// нь аудитаар илэрсэн 2 дахь цоорхой). Жинхэнэ хамгаалалт үргэлж СЕРВЕРТ
// байна — энэ бол зөвхөн эрхгүй хэрэглэгчид харагдах ёсгүй UI-г нүүрлэхгүй,
// оронд нь эелдэг мессеж харуулах NAV/UX gate.
export default function RequireRole({ allow, children }: RequireRoleProps) {
  const role = getRole();
  if (!role || !allow.includes(role)) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-lg font-semibold text-ink">Хандах эрхгүй байна</p>
        <p className="mt-1 text-sm text-ink-dim">
          Энэ хуудсанд хандах эрхгүй байна.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
