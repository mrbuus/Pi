"use client";

import Link from "next/link";
import { NavIcon } from "./icons";
import { getBottomTabs } from "./nav-data";

/* ============================================================================
 * Гар утасны доод таб мөр (шинэ дизайн, 2026-09-26).
 *
 * Эзэн хажуугийн цэсэнд дургүй байсан — утсан дээр hamburger-ийн оронд
 * эрхий хуруунд ойр доод мөр: Нүүр + 3 гол цэс + «Бусад». «Бусад» нь
 * хуучин бүрэн цэсийг (Sidebar-ийн drawer) нээнэ тул нэг ч холбоос хасагдаагүй.
 * Компьютер (lg+) дээр харагдахгүй — тэнд зүүн самбар хэвээр.
 * ========================================================================== */

export default function BottomTabs({
  role,
  pathname,
  moreOpen,
  onMore,
}: {
  role: string;
  pathname: string;
  moreOpen: boolean;
  onMore: () => void;
}) {
  const tabs = getBottomTabs(role);
  // Идэвхтэй таб: яг тэнцүү эсвэл дэд хуудас. Нүүрийг зөвхөн яг тэнцүү үед
  // (эс бөгөөс /app/student/payments дээр «Нүүр» бас асна).
  const activeHref = tabs
    .filter((t, i) => (i === 0 ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`)))
    .map((t) => t.href)[0];
  const moreActive = moreOpen || !activeHref;

  return (
    <nav
      aria-label="Гол цэс"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg auto-cols-fr grid-flow-col gap-1 px-2 py-1.5">
        {tabs.map((t) => {
          const active = t.href === activeHref && !moreOpen;
          return (
            <li key={t.href} className="min-w-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold leading-tight transition-colors ${
                  active ? "text-brand-soft" : "text-ink-dim hover:text-ink"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    active ? "bg-brand-bright/15" : ""
                  }`}
                >
                  <NavIcon name={t.icon} className="h-5 w-5" />
                </span>
                <span className="max-w-full truncate">{t.short}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={onMore}
            aria-expanded={moreOpen}
            aria-controls="app-mobile-nav"
            className={`flex min-h-12 w-full flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold leading-tight transition-colors ${
              moreActive ? "text-brand-soft" : "text-ink-dim hover:text-ink"
            }`}
          >
            <span
              className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                moreActive ? "bg-brand-bright/15" : ""
              }`}
            >
              <NavIcon name="grid" className="h-5 w-5" />
            </span>
            <span>Бусад</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
