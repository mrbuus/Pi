"use client";

import Link from "next/link";
import { BarChart3, CalendarDays, ClipboardList, Clock, GraduationCap, Inbox, ListChecks, Settings2, Timer } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * «Анги» хэсгийн нэгдсэн табууд (эзэн 2026-10-08): өмнө нь цэсэнд 6 тусдаа
 * мөр байсныг нэг «Анги» болгож, хуудсуудын хооронд энэ мөрөөр шилжинэ.
 * Хуудас, маршрут, функц өөрчлөгдөөгүй — зөвхөн хүрэх зам нэгдсэн.
 */
export const CLASS_HUB: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/schedule", label: "Хуваарь", icon: CalendarDays },
  { href: "/app/lesson-flow", label: "Өдрийн хичээл", icon: ClipboardList },
  { href: "/app/dismissal", label: "Тарах цаг", icon: Timer },
  { href: "/app/teacher-hours", label: "Хуваарийн цаг", icon: Clock },
  { href: "/app/planner", label: "Төлөвлөгч", icon: ListChecks },
  { href: "/app/insights", label: "Дүн шинжилгээ", icon: BarChart3 },
];

// «Элсэлт» = Хүсэлтүүд + Элсэлтийн удирдлага (эзэн 2026-10-13)
export const ENROLL_HUB: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/admin/leads", label: "Хүсэлтүүд", icon: Inbox },
  { href: "/app/admin/enrollment", label: "Элсэлтийн удирдлага", icon: Settings2 },
  // Түвшин тогтоох шалгалт: хүүхдийн мэдээлэл, бодолтын зураг, тестийн агуулга (эзэн 2026-10-13)
  { href: "/app/admin/placement", label: "Түвшин тогтоох", icon: GraduationCap },
];

const STAFF = new Set(["ADMIN", "TEACHER_PLUS", "TEACHER"]);
const ENROLL_ROLES = new Set(["ADMIN", "TEACHER_PLUS"]);

export function isClassHubPath(role: string | null | undefined, pathname: string) {
  return !!role && STAFF.has(role) && CLASS_HUB.some((t) => t.href === pathname);
}

/** Тухайн хуудсанд дээд табын мөр байх эсэх, байвал аль мөр, цэсэнд аль мөр идэвхтэй */
export function hubFor(role: string | null | undefined, pathname: string) {
  if (isClassHubPath(role, pathname)) return { tabs: CLASS_HUB, label: "Хуваарь", navHref: "/app/schedule" };
  if (role && ENROLL_ROLES.has(role) && ENROLL_HUB.some((t) => t.href === pathname))
    return { tabs: ENROLL_HUB, label: "Элсэлт", navHref: "/app/admin/leads" };
  return null;
}

export default function ClassHubTabs({
  pathname,
  tabs = CLASS_HUB,
  label = "Анги",
}: {
  pathname: string;
  tabs?: { href: string; label: string; icon: LucideIcon }[];
  label?: string;
}) {
  return (
    <nav aria-label={label} className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-1.5 border-b border-line">
        {tabs.map(({ href, label: tabLabel, icon: Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-semibold transition ${
                  active ? "border-brand-bright text-brand-soft" : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {tabLabel}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
