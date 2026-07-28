"use client";

import Link from "next/link";
import { useState } from "react";
import { NavIcon } from "./icons";
import type { NavGroup, NavLink as NavLinkType } from "./nav-data";

// Идэвхтэй маршрутыг зөвхөн өнгөөр биш — зүүн талын зураас + тод үсгээр
// давхар илэрхийлнэ (өнгө дам харагдахгүй хэрэглэгчид ч ялгах боломжтой).
function ItemRow({
  item,
  active,
  collapsedRail,
  onNavigate,
}: {
  item: NavLinkType;
  active: boolean;
  collapsedRail: boolean;
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
        className={`flex items-center gap-3 rounded-lg py-2 transition-colors ${
          collapsedRail ? "justify-center px-2" : "px-3"
        } ${
          active
            ? "bg-brand-bright/10 font-semibold text-brand-soft"
            : "text-ink-dim hover:bg-panel hover:text-ink"
        }`}
      >
        <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
        <span className={collapsedRail ? "sr-only" : "truncate text-sm"}>
          {item.label}
        </span>
      </Link>
    </li>
  );
}

function GroupSection({
  group,
  pathname,
  collapsedRail,
  onNavigate,
}: {
  group: NavGroup;
  pathname: string;
  collapsedRail: boolean;
  onNavigate?: () => void;
}) {
  const containsActive = group.items.some((i) => i.href === pathname);
  const [open, setOpen] = useState(true);
  const listId = `nav-group-${group.key}`;

  if (collapsedRail) {
    return (
      <div className="flex flex-col gap-1 border-t border-line/70 pt-2 first:border-t-0 first:pt-0">
        {group.items.map((item) => (
          <ul key={item.href}>
            <ItemRow
              item={item}
              active={item.href === pathname}
              collapsedRail
              onNavigate={onNavigate}
            />
          </ul>
        ))}
      </div>
    );
  }

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
  onNavigate,
}: {
  home: NavLinkType | null;
  groups: NavGroup[];
  pathname: string;
  collapsedRail?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Үндсэн цэс" className="flex flex-col gap-3">
      {home && (
        <ul>
          <ItemRow
            item={home}
            active={home.href === pathname}
            collapsedRail={collapsedRail}
            onNavigate={onNavigate}
          />
        </ul>
      )}
      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <GroupSection
            key={group.key}
            group={group}
            pathname={pathname}
            collapsedRail={collapsedRail}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}
