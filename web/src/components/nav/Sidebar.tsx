"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import LogoMark from "@/components/LogoMark";
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  function toggleRail() {
    writeRailCollapsed(!railCollapsed);
  }

  // Mobile drawer: backdrop click / Escape-ээр хаах, focus trap, body scroll
  // түгжих, нээх дээр сум удирдсан товч (hamburger)-руу фокусыг буцаах.
  useEffect(() => {
    if (!mobileOpen) return;
    triggerRef.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const drawer = drawerRef.current;
    const focusableSelector =
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const first = drawer?.querySelector<HTMLElement>(focusableSelector);
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onMobileOpenChange(false);
        return;
      }
      if (e.key !== "Tab" || !drawer) return;
      const items = Array.from(
        drawer.querySelectorAll<HTMLElement>(focusableSelector),
      );
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      triggerRef.current?.focus();
    };
  }, [mobileOpen, onMobileOpenChange]);

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
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim transition hover:bg-panel hover:text-ink ${
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
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim transition hover:bg-panel hover:text-ink ${
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

      {/* ── MOBILE: off-canvas drawer, зүүн талаас гулсаж гарна ── */}
      <div
        aria-hidden={!mobileOpen}
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => onMobileOpenChange(false)}
      />
      <div
        id="app-mobile-nav"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Үндсэн цэс"
        aria-hidden={!mobileOpen}
        inert={!mobileOpen ? true : undefined}
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[300px] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-3">
          <LogoMark variant="full" size={30} />
          <button
            type="button"
            onClick={() => onMobileOpenChange(false)}
            aria-label="Цэсийг хаах"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-dim transition hover:text-ink"
          >
            <NavIcon name="x" />
          </button>
        </div>
        {/* Драверыг хаалттай үед дотоод агуулгыг mount хийхгүй — desktop
            aside-тай зэрэг IdentityBadge-ийн /auth/me-г 2 дахин дуудахаас
            сэргийлнэ, зөвхөн нээгдэх үед л ачаална. */}
        {mobileOpen && (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
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
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-dim transition hover:bg-panel hover:text-ink"
              >
                <NavIcon name="logout" />
                <span>Гарах</span>
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
