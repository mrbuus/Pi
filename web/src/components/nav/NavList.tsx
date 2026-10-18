"use client";

import Link from "next/link";
import { useState } from "react";
import MakeupNavBadge from "@/components/makeup/MakeupNavBadge";
import { NavIcon } from "./icons";
import { GROUP_TONE, type NavGroup, type NavLink as NavLinkType } from "./nav-data";

// Идэвхтэй маршрутыг зөвхөн өнгөөр биш — зүүн талын зураас + тод үсгээр
// давхар илэрхийлнэ (өнгө дам харагдахгүй хэрэглэгчид ч ялгах боломжтой).
function ItemRow({
  item,
  active,
  collapsedRail,
  tone,
  onNavigate,
}: {
  item: NavLinkType;
  active: boolean;
  collapsedRail: boolean;
  tone: string;
  onNavigate?: () => void;
}) {
  return (
    <li className="relative">
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-brand-bright"
        />
      )}
      <Link
        href={item.href}
        onClick={onNavigate}
        title={collapsedRail ? item.label : undefined}
        aria-current={active ? "page" : undefined}
        className={`row-interactive flex items-center gap-3 rounded-lg py-1 transition-colors ${
          collapsedRail ? "justify-center px-2" : "px-3"
        } ${
          active
            ? "bg-brand-bright/10 font-semibold text-brand-soft"
            : "text-ink-dim hover:bg-panel hover:text-ink"
        }`}
      >
        {/* Бүлгийн өнгөт дэвсгэртэй дүрс — цэсийг нүдээр хурдан ялгана. */}
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tone}`}
        >
          <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
        </span>
        <span className={collapsedRail ? "sr-only" : "truncate text-sm"}>
          {item.label}
        </span>
        {item.badge === "makeup" && !collapsedRail && <MakeupNavBadge />}
      </Link>
    </li>
  );
}

function GroupSection({
  group,
  pathname,
  collapsedRail,
  onNavigate,
  open,
  onToggle,
}: {
  group: NavGroup;
  pathname: string;
  collapsedRail: boolean;
  onNavigate?: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  const containsActive = group.items.some((i) => i.href === pathname);
  const listId = `nav-group-${group.key}`;

  // Хумигдсан үед дэлгэсэнтэй ЯГ ижил бүтэц: бүлэг бүр нэг дүрс (эзэн 2026-10-17 —
  // доторх бүх зүйлийн дүрс зэрэгцэн гарвал ойлгомжгүй). Дарахад тэр бүлэг нээгдэнэ.
  if (collapsedRail) {
    return (
      <div className="relative">
        {containsActive && (
          <span aria-hidden className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-brand-bright" />
        )}
        <button
          type="button"
          onClick={onToggle}
          title={group.label}
          aria-label={group.label}
          className={`row-interactive flex w-full items-center justify-center rounded-lg px-2 py-1 transition-colors ${
            containsActive ? "bg-brand-bright/10 text-brand-soft" : "text-ink-dim hover:bg-panel hover:text-ink"
          }`}
        >
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-xl">
            <NavIcon name={group.icon} className="h-[18px] w-[18px]" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-dim/80 transition hover:text-ink"
      >
        <NavIcon name={group.icon} className="h-3.5 w-3.5 opacity-70" />
        <span className="flex-1">{group.label}</span>
        {containsActive && !open && (
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-bright" />
        )}
        <NavIcon
          name="chevron-down"
          className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${
            open ? "rotate-0" : "-rotate-90"
          }`}
        />
      </button>
      {open && (
        <ul id={listId} className="mt-0.5 flex flex-col gap-0.5">
          {group.items.map((item) => (
            <ItemRow
              key={item.href}
              item={item}
              active={item.href === pathname}
              collapsedRail={false}
              tone={GROUP_TONE[group.key]}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NavList({
  home,
  groups,
  pathname,
  collapsedRail = false,
  openActive = false,
  onNavigate,
}: {
  home: NavLinkType | null;
  groups: NavGroup[];
  pathname: string;
  collapsedRail?: boolean;
  /** Утасны «Бусад» цэс: одоогийн хуудасны бүлэг нээлттэй эхэлнэ — нэг товшилт хэмнэнэ */
  openActive?: boolean;
  onNavigate?: () => void;
}) {
  // Бүлгүүд ҮРГЭЛЖ хумигдсан эхэлнэ (эзэн 2026-10-13); нэг удаад нэг бүлэг
  // нээгдэнэ, хуудас солигдоход дахин хумигдана. Идэвхтэй бүлэгт цэг харагдана.
  const activeKey = openActive ? (groups.find((g) => g.items.some((i) => i.href === pathname))?.key ?? null) : null;
  const [openKey, setOpenKey] = useState<string | null>(activeKey);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpenKey(activeKey);
  }
  return (
    <nav aria-label="Үндсэн цэс" className="flex flex-col gap-3">
      {home && (
        <ul>
          <ItemRow
            item={home}
            active={home.href === pathname}
            collapsedRail={collapsedRail}
            tone={GROUP_TONE.home}
            onNavigate={onNavigate}
          />
        </ul>
      )}
      <div className={`flex flex-col ${collapsedRail ? "gap-1" : "gap-2"}`}>
        {groups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            pathname={pathname}
            collapsedRail={collapsedRail}
            onNavigate={onNavigate}
            open={openKey === group.key}
            onToggle={() => setOpenKey((k) => (k === group.key ? null : group.key))}
          />
        ))}
      </div>
    </nav>
  );
}
