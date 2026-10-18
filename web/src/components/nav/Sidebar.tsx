"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import { NavIcon } from "./icons";
import NavList from "./NavList";
import { getRoleNav } from "./nav-data";

const RAIL_STORAGE_KEY = "app-sidebar-rail-collapsed";
// 24px өндөр = 54px өргөн бүтэн лого — 72px баганын дотор (px-2) бүтнээрээ багтана
const RAIL_LOGO_SIZE = 24;

/* ---- Rail-ийн хумигдсан төлөвийн гадаад дэлгэц (localStorage) ----
   ThemeProvider-тэй ЯГ ижил хэлбэр: useSyncExternalStore ашигласнаар
   useEffect дотор setState дуудахгүй тул cascading render болон hydration
   mismatch үүсэхгүй. */
const railListeners = new Set<() => void>();

function readRailCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerRailCollapsed(): boolean {
  return false;
}
function subscribeRail(onStoreChange: () => void) {
  railListeners.add(onStoreChange);
  return () => railListeners.delete(onStoreChange);
}
function writeRailCollapsed(next: boolean) {
  try {
    window.localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Санах ойд бичих боломжгүй (private mode гэх мэт) — зөвхөн энэ session-д ажиллана
  }
  railListeners.forEach((listener) => listener());
}

/* ---- Дэлгэцийн өргөн: 768–1023px (томруулсан зөөврийн компьютер, таблет) дээр
   зүүн цэс ХУМИГДСАН rail байдлаар л гарна (эзэн 2026-10-18: «жижиг дэлгэц дээр
   ч өмнөхтэйгээ адил хэдхэн үйлдлээр»). Утсан (<768) дээр доод таб мөр. ---- */
const WIDE_QUERY = "(min-width: 1024px)";
function subscribeWide(onChange: () => void) {
  const mq = window.matchMedia(WIDE_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const readWide = () => window.matchMedia(WIDE_QUERY).matches;
const getServerWide = () => true;

interface SidebarProps {
  role: string;
  pathname: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

// Зүүн самбар — desktop дээр байнга харагдах багана, mobile дээр «Бусад» drawer.
// Хувийн цэс, гарах, цагаан/хар нь баруун дээд булангийн хэрэглэгчийн цэст
// (nav/UserMenu.tsx) шилжсэн (эзэн 2026-10-13).
export default function Sidebar({ role, pathname, mobileOpen, onMobileOpenChange }: SidebarProps) {
  const { home, groups } = getRoleNav(role);
  const railPreference = useSyncExternalStore(subscribeRail, readRailCollapsed, getServerRailCollapsed);
  const wide = useSyncExternalStore(subscribeWide, readWide, getServerWide);
  const railCollapsed = railPreference || !wide;
  // Хумигдсан үед хулгана (эсвэл гарын фокус) ирэхэд түр дэлгэгдэж, гарахад хумигдана
  const [peek, setPeek] = useState(false);
  const expanded = !railCollapsed || peek;

  return (
    <>
      {/* ── DESKTOP ── багана нь үргэлж ижил өргөнтэй зай эзэлнэ; түр дэлгэгдэхдээ
          агуулгын дээгүүр давхарлана (хуудас хөдлөхгүй). */}
      <aside
        aria-label="Үндсэн навигац"
        className={`sticky top-0 z-40 hidden h-screen shrink-0 transition-[width] duration-200 motion-reduce:transition-none md:block ${
          railCollapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div
          onMouseEnter={() => railCollapsed && setPeek(true)}
          onMouseLeave={() => setPeek(false)}
          onFocus={() => railCollapsed && setPeek(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPeek(false);
          }}
          className={`absolute inset-y-0 left-0 flex flex-col border-r border-line bg-surface transition-[width] duration-200 motion-reduce:transition-none ${
            expanded ? "w-64" : "w-[72px]"
          } ${railCollapsed && peek ? "elev-3 z-40" : ""}`}
        >
          {/* Лого нэг л хэмжээтэй, нэг л байрлалтай: хумигдсан 72px баганад бүтнээрээ
              багтаж, дэлгэхэд томорч/жижгэрч, үсэрч хөдлөхгүй (эзэн 2026-10-13). */}
          <div className="flex h-14 shrink-0 items-center border-b border-line px-2">
            <Link href="/" aria-label="Нүүр хуудас" title="Нүүр хуудас" className="flex min-h-11 items-center">
              <LogoMark variant="full" size={RAIL_LOGO_SIZE} />
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
            <NavList home={home} groups={groups} pathname={pathname} collapsedRail={!expanded} />
          </div>
          {/* Нарийн дэлгэц дээр rail байнга хумигдсан — тогтоох товч хэрэггүй */}
          <div className={`shrink-0 border-t border-line p-2 ${wide ? "flex" : "hidden"} ${expanded ? "justify-end" : "justify-center"}`}>
            <button
              type="button"
              onClick={() => {
                writeRailCollapsed(!railCollapsed);
                setPeek(false);
              }}
              aria-pressed={railCollapsed}
              aria-label={railCollapsed ? "Самбарыг тогтмол дэлгэх" : "Самбарыг хумих"}
              title={railCollapsed ? "Самбарыг тогтмол дэлгэх" : "Самбарыг хумих"}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-dim transition hover:bg-panel hover:text-ink"
            >
              {railCollapsed ? <ChevronsRight className="h-5 w-5" aria-hidden /> : <ChevronsLeft className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </aside>

      {/* ── MOBILE: «Бусад» — доороос гарч ирэх хуудас (vaul). ── */}
      <Drawer open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <DrawerContent id="app-mobile-nav" aria-describedby={undefined} className="md:hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <Link href="/" onClick={() => onMobileOpenChange(false)} aria-label="Нүүр хуудас" className="flex min-h-11 items-center">
              <LogoMark variant="full" size={26} />
            </Link>
            <DrawerTitle className="sr-only">Бүх цэс</DrawerTitle>
            <button
              type="button"
              onClick={() => onMobileOpenChange(false)}
              aria-label="Цэсийг хаах"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-line text-ink-dim transition hover:text-ink"
            >
              <NavIcon name="x" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3" data-vaul-no-drag>
            <NavList home={home} groups={groups} pathname={pathname} openActive onNavigate={() => onMobileOpenChange(false)} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
