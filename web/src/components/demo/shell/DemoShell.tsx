"use client";

import {
  ArrowLeft,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronsRight,
  ClipboardCheck,
  Home,
  LayoutGrid,
  PencilRuler,
  School,
  Shield,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import LogoMark from "@/components/LogoMark";
import ThemeToggle from "@/components/ThemeToggle";
import { cn } from "@/lib/cn";
import { ME, initials } from "../world";

/**
 * /demo/* хэсгүүдийн НИЙТЛЭГ бүрхүүл — жинхэнэ аппын (nav/Sidebar, BottomTabs,
 * app/app/layout) дүрслэл: компьютер дээр 72px хумигдсан зүүн багана + дээд толгой,
 * утсан дээр дээд толгой + доод таб мөр. Демо хэсгүүдийн хооронд шилжих холбоос
 * ажиллана; бусад нь зөвхөн хэмжээ, байрлалыг үнэлэх дүрслэл.
 */

export type DemoSection = "teacher" | "schedule" | "classes" | "students";

export const DEMO_SECTIONS: Array<{ key: DemoSection; href: string; label: string; icon: LucideIcon }> = [
  { key: "teacher", href: "/demo/teacher", label: "Ирц ба даалгавар", icon: ClipboardCheck },
  { key: "schedule", href: "/demo/schedule", label: "Хуваарь", icon: CalendarDays },
  { key: "classes", href: "/demo/classes", label: "Ангиуд", icon: School },
  { key: "students", href: "/demo/students", label: "Сурагчид", icon: Users },
];

/** Жинхэнэ зүүн баганы 6 бүлэг; демо хэсэг аль бүлэгт багтахыг `sections` заана */
const RAIL: Array<{ label: string; icon: LucideIcon; tone: string; href?: string; sections: DemoSection[] }> = [
  { label: "Багшийн самбар", icon: Home, tone: "bg-brand-bright/15 text-brand-soft", href: "/demo/teacher", sections: ["teacher"] },
  { label: "Сургалт", icon: BookOpen, tone: "bg-accent-teal/15 text-accent-teal", sections: [] },
  { label: "Анги", icon: CalendarDays, tone: "bg-accent-violet/15 text-accent-violet", href: "/demo/schedule", sections: ["schedule", "classes"] },
  { label: "Төлбөр", icon: Wallet, tone: "bg-success/15 text-success", sections: [] },
  { label: "Удирдлага", icon: Shield, tone: "bg-brand-bright/15 text-brand-soft", href: "/demo/students", sections: ["students"] },
  { label: "Дотоод", icon: PencilRuler, tone: "bg-accent-sky/15 text-accent-sky", sections: [] },
];

const TABS: Array<{ label: string; icon: LucideIcon; href?: string; section?: DemoSection }> = [
  { label: "Самбар", icon: Home, href: "/demo/teacher", section: "teacher" },
  { label: "Хуваарь", icon: CalendarDays, href: "/demo/schedule", section: "schedule" },
  { label: "Анги", icon: School, href: "/demo/classes", section: "classes" },
  { label: "Сурагчид", icon: Users, href: "/demo/students", section: "students" },
  { label: "Бусад", icon: LayoutGrid },
];

export default function DemoShell({
  active,
  title,
  children,
}: {
  active: DemoSection;
  /** Толгой мөрийн гарчиг (жинхэнэ аппын getPageTitle-тэй адил) */
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:flex">
      <aside aria-label="Үндсэн навигац (дүрслэл)" className="sticky top-0 z-40 hidden h-screen w-[72px] shrink-0 lg:block">
        <div className="absolute inset-y-0 left-0 flex w-[72px] flex-col border-r border-line bg-surface">
          <div className="flex h-14 shrink-0 items-center border-b border-line px-2">
            <Link href="/demo/teacher" aria-label="Демо нүүр" className="flex min-h-11 items-center">
              <LogoMark variant="full" size={24} />
            </Link>
          </div>
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3">
            {RAIL.map(({ label, icon: Icon, tone, href, sections }) => {
              const on = sections.includes(active);
              const body = (
                <span aria-hidden className={cn("flex size-8 items-center justify-center rounded-xl", on ? tone : "text-ink-dim")}>
                  <Icon className="size-[18px]" />
                </span>
              );
              const cls = cn(
                "flex min-h-11 w-full items-center justify-center rounded-lg px-2 py-1 transition-colors",
                on ? "bg-brand-bright/10" : "hover:bg-panel",
              );
              return (
                <li key={label} className="relative">
                  {on && <span aria-hidden className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full bg-brand-bright" />}
                  {href ? (
                    <Link href={href} title={label} aria-label={label} aria-current={on ? "page" : undefined} className={cls}>
                      {body}
                    </Link>
                  ) : (
                    <span title={`${label} (демод байхгүй)`} aria-label={`${label} (демод байхгүй)`} className={cn(cls, "opacity-60")}>
                      {body}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="flex shrink-0 justify-center border-t border-line p-2">
            <span aria-hidden className="flex size-11 items-center justify-center rounded-lg text-ink-dim">
              <ChevronsRight className="size-5" />
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4">
            <button
              type="button"
              aria-label="Буцах"
              className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim hover:bg-panel hover:text-ink"
            >
              <ArrowLeft className="size-5" aria-hidden />
            </button>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink sm:text-base">{title}</span>
            <div className="flex shrink-0 items-center gap-0.5">
              <ThemeToggle />
              <button
                type="button"
                aria-label="Мэдэгдэл"
                className="relative inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-panel hover:text-ink"
              >
                <Bell className="size-[18px]" aria-hidden />
              </button>
              <button type="button" aria-label="Хэрэглэгчийн цэс" className="inline-flex size-11 items-center justify-center rounded-full hover:bg-panel">
                <span className="flex size-8 items-center justify-center rounded-full bg-brand-bright/15 text-[11px] font-bold text-brand-soft ring-1 ring-line">
                  {initials(ME.name)}
                </span>
              </button>
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 lg:pb-8 lg:pt-6">
          {/* Демо хэсгүүдийн шилжүүлэгч — жинхэнэ аппад бүлгийн таб (ClassHubTabs) болно */}
          <nav aria-label="Демо хэсгүүд" className="-mx-4 mb-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex w-max gap-1.5">
              {DEMO_SECTIONS.map(({ key, href, label, icon: Icon }) => {
                const on = key === active;
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors",
                        on ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-line text-ink-dim hover:text-ink",
                      )}
                    >
                      <Icon className="size-4" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {children}
        </main>
      </div>

      <nav
        aria-label="Гол цэс (дүрслэл)"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col gap-1 px-2 py-1.5">
          {TABS.map(({ label, icon: Icon, href, section }) => {
            const on = section === active;
            const inner = (
              <>
                <span className={cn("flex h-7 w-12 items-center justify-center rounded-full", on && "bg-brand-bright/15")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="max-w-full truncate">{label}</span>
              </>
            );
            const cls = cn(
              "flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold leading-tight transition-colors",
              on ? "text-brand-soft" : "text-ink-dim hover:text-ink",
            );
            return (
              <li key={label} className="min-w-0">
                {href ? (
                  <Link href={href} aria-current={on ? "page" : undefined} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <span className={cn(cls, "opacity-60")} aria-label={`${label} (демод байхгүй)`}>
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
