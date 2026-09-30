"use client";

import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";
import LogoMark from "@/components/LogoMark";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import ThemeToggle from "@/components/ThemeToggle";
import { NavIcon } from "./icons";
import NavList from "./NavList";
import { getRoleNav } from "./nav-data";

const RAIL_STORAGE_KEY = "app-sidebar-rail-collapsed";

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

interface SidebarProps {
  role: string;
  pathname: string;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  identity: ReactNode;
  onLogout: () => void;
}

// Зүүн самбар — desktop дээр байнга харагдах багана, mobile дээр off-canvas
// slide-in drawer. Хоёулаа ижил NAV_DATA-г ашигладаг ч тусдаа markup-тай
// (desktop нь sticky+scroll, mobile нь fixed+transform+backdrop).
export default function Sidebar({
  role,
  pathname,
  mobileOpen,
  onMobileOpenChange,
  identity,
  onLogout,
}: SidebarProps) {
  const { home, groups } = getRoleNav(role);
  const railCollapsed = useSyncExternalStore(
    subscribeRail,
    readRailCollapsed,
    getServerRailCollapsed,
  );

  function toggleRail() {
    writeRailCollapsed(!railCollapsed);
  }


  return (
    <>
      {/* ── DESKTOP: байнга харагдах, өөрөө гүйлгэдэг багана ── */}
      <aside
        aria-label="Үндсэн навигац"
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 motion-reduce:transition-none lg:flex ${
          railCollapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center border-b border-line px-3">
          <LogoMark variant={railCollapsed ? "mark" : "full"} size={30} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <NavList
            home={home}
            groups={groups}
            pathname={pathname}
            collapsedRail={railCollapsed}
          />
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-line p-2.5">
          {!railCollapsed && (
            <>
              <ThemeToggle className="w-full justify-center" />
              <div className="px-0.5">{identity}</div>
            </>
          )}
          <button
            type="button"
            onClick={onLogout}
            title="Гарах"
            className={`row-interactive flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim transition hover:bg-panel hover:text-ink ${
              railCollapsed ? "justify-center px-2" : ""
            }`}
          >
            <NavIcon name="logout" />
            {!railCollapsed && <span>Гарах</span>}
          </button>
          <button
            type="button"
            onClick={toggleRail}
            aria-pressed={railCollapsed}
            title={railCollapsed ? "Самбарыг дэлгэх" : "Самбарыг хумих"}
            className={`row-interactive flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim transition hover:bg-panel hover:text-ink ${
              railCollapsed ? "justify-center px-2" : ""
            }`}
          >
            <NavIcon
              name="panel-left"
              className={`transition-transform motion-reduce:transition-none ${
                railCollapsed ? "rotate-180" : ""
              }`}
            />
            {!railCollapsed && <span>Самбарыг хумих</span>}
          </button>
        </div>
      </aside>

      {/* ── MOBILE: «Бусад» — доороос гарч ирэх, хуруугаар доош чирч хаадаг хуудас
          (shadcn/ui Drawer = vaul). Фокус занга, Escape, дэвсгэр дарж хаах,
          body гүйлгэлт түгжих бүгд vaul дотор. Бүрэн цэс энд — юу ч хасагдаагүй. ── */}
      <Drawer open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <DrawerContent id="app-mobile-nav" aria-describedby={undefined} className="lg:hidden">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
            <DrawerTitle className="text-base font-bold text-ink">Бүх цэс</DrawerTitle>
            <button
              type="button"
              onClick={() => onMobileOpenChange(false)}
              aria-label="Цэсийг хаах"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-dim transition hover:text-ink"
            >
              <NavIcon name="x" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3" data-vaul-no-drag>
            <NavList
              home={home}
              groups={groups}
              pathname={pathname}
              onNavigate={() => onMobileOpenChange(false)}
            />
          </div>
          <div className="flex shrink-0 flex-col gap-2 border-t border-line p-2.5">
            <ThemeToggle className="w-full justify-center" />
            <div className="px-0.5">{identity}</div>
            <button
              type="button"
              onClick={onLogout}
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim transition hover:bg-panel hover:text-ink"
            >
              <NavIcon name="logout" />
              <span>Гарах</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
