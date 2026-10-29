"use client";

import Link from "next/link";
import { CalendarDays, ListChecks, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import MakeupNavBadge from "@/components/makeup/MakeupNavBadge";

/**
 * Сурагчийн «Хичээл» hub (эзэн 2026-10-29, SURAGCH-SHINECHLEL §1): өмнө нь
 * цэсэнд 3 тусдаа мөр байсан Өдрийн хичээл, Нөхөх хичээл, Хуваарийг нэг
 * «Хичээл» болгож, хуудсуудын хооронд энэ мөрөөр шилжинэ. Маршрут өөрчлөгдөөгүй.
 * Зөвхөн STUDENT-д — ажилтны /app/schedule хуудас ClassHubTabs-аар хэвээр.
 */
export const STUDENT_LESSON_HUB: { href: string; label: string; icon: LucideIcon; badge?: "makeup" }[] = [
  { href: "/app/lesson-flow/my", label: "Өнөөдөр", icon: Sun },
  { href: "/app/makeup", label: "Нөхөх", icon: ListChecks, badge: "makeup" },
  { href: "/app/schedule", label: "Хуваарь", icon: CalendarDays },
];

/** Энэ хуудас сурагчийн «Хичээл» hub-д орох эсэх */
export function isStudentLessonPath(role: string | null | undefined, pathname: string) {
  return role === "STUDENT" && STUDENT_LESSON_HUB.some((t) => t.href === pathname);
}

export default function StudentLessonTabs({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Хичээл" className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-1.5 border-b border-line">
        {STUDENT_LESSON_HUB.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-bold transition ${
                  active ? "border-brand-bright text-brand-soft" : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
                {badge === "makeup" && <MakeupNavBadge />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
