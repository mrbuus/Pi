"use client";

import Link from "next/link";
import MakeupNavBadge from "@/components/makeup/MakeupNavBadge";
import { NavIcon } from "./icons";
import { GROUP_LABEL, GROUP_TONE, getBottomTabs, getRoleNav, type NavLink } from "./nav-data";

/* ============================================================================
 * Утасны «Бусад» хуудасны агуулга (эзэн 2026-11-04: «доор харагдаж байгаа
 * зүйлсийг маш цэгцтэй»). Өмнө нь зүүн цэсний жагсаалтыг хаалттай бүлгүүдтэй
 * нь харуулдаг байсан — доод мөрөнд байгаа цэс давтагдаж, бүлэг бүрийг нээж
 * байж олддог. Одоо: доод мөрөнд БАЙХГҮЙ цэс л, бүлэг бүр нээлттэй, 3 баганат
 * том товч. «Тун удахгүй» гарахгүй.
 * ========================================================================== */

type Section = { key: string; label: string | null; tone: string; items: NavLink[] };

export default function MoreGrid({
  role,
  pathname,
  onNavigate,
}: {
  role: string;
  pathname: string;
  onNavigate: () => void;
}) {
  const { main, groups } = getRoleNav(role);
  const onBar = new Set(getBottomTabs(role).map((t) => t.href));
  const sections: Section[] = [
    { key: "main", label: null, tone: GROUP_TONE.learn, items: main },
    ...groups
      .filter((g) => g.key !== "soon")
      .map((g) => ({ key: g.key, label: GROUP_LABEL[g.key], tone: GROUP_TONE[g.key], items: g.items })),
  ]
    .map((s) => ({ ...s, items: s.items.filter((i) => !i.soon && !onBar.has(i.href)) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="flex flex-col gap-5">
      {sections.map((s) => (
        <section key={s.key} aria-label={s.label ?? undefined}>
          {s.label && <h3 className="mb-2 px-1 text-xs font-semibold text-ink-dim">{s.label}</h3>}
          <ul className="grid grid-cols-3 gap-2">
            {s.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="relative">
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1.5 py-2 text-center transition-colors active:opacity-80 ${
                      active ? "border-brand-bright bg-brand-bright/10" : "border-line bg-surface hover:bg-panel"
                    }`}
                  >
                    <span aria-hidden className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
                      <NavIcon name={item.icon} className="h-5 w-5" />
                    </span>
                    <span
                      className={`line-clamp-2 text-xs leading-tight ${
                        active ? "font-semibold text-brand-soft" : "text-ink"
                      }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                  {item.badge === "makeup" && <MakeupNavBadge className="absolute right-1.5 top-1.5" />}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
