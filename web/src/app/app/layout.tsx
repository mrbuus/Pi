"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import LogoMark from "@/components/LogoMark";
import ThemeToggle from "@/components/ThemeToggle";
import { api, clearAuth, fileUrl, getRole, getToken } from "@/lib/api";

// Role бүрийн монгол нэр — header identity badge-д ашиглана
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
};

interface Me {
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
}
interface ChildLink {
  verified: boolean;
  student: { firstName: string; lastName: string };
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// Дээд буланд харагдах identity — нэвтэрсэн ямар ч role-той хүн өөрийн нэр
// + role-оо, эцэг эх бол баталгаажсан хүүхдийнхээ нэрийг давхар харна.
// Header дотор байрладаг тул БҮХ дотоод хуудсан дээр байнга харагдана.
function IdentityBadge() {
  const [me, setMe] = useState<Me | null>(null);
  const [children, setChildren] = useState<ChildLink[]>([]);

  useEffect(() => {
    api<Me>("/auth/me").then(setMe).catch(() => {});
  }, []);
  useEffect(() => {
    if (me?.role === "PARENT") {
      api<ChildLink[]>("/parent/children").then(setChildren).catch(() => {});
    }
  }, [me?.role]);

  if (!me) return null;
  const verifiedChild = children.find((c) => c.verified)?.student;
  const fullName = `${me.firstName} ${me.lastName}`;

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-lg border border-line px-2 py-1">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-bright/20 text-[11px] font-bold text-brand-soft">
        {me.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fileUrl(me.avatarUrl)}
            alt={`${fullName} профайл зураг`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials(me.firstName, me.lastName)
        )}
      </span>
      <span className="hidden text-sm leading-tight sm:block">
        <span className="block font-semibold">{me.firstName}</span>
        <span className="block text-[11px] text-ink-dim">
          {ROLE_LABEL[me.role] ?? me.role}
          {verifiedChild && ` · ${verifiedChild.firstName}`}
        </span>
      </span>
    </div>
  );
}

const NAV: Record<string, { href: string; label: string }[]> = {
  STUDENT: [
    { href: "/app/student", label: "Миний самбар" },
    { href: "/app/learn", label: "Хичээл үзэх" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/videos", label: "Онлайн хичээл" },
    { href: "/app/tests", label: "Шалгалт" },
    { href: "/app/goals", label: "Миний зорилго" },
    { href: "/app/schedule", label: "Хуваарь" },
  ],
  TEACHER: [
    { href: "/app/teacher", label: "Багшийн самбар" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/videos", label: "Онлайн хичээл" },
    { href: "/app/tests", label: "Шалгалт" },
    { href: "/app/schedule", label: "Хуваарь" },
    { href: "/app/planner", label: "Төлөвлөгч" },
    { href: "/app/admin/theory", label: "Онолын агуулга" },
  ],
  TEACHER_PLUS: [
    { href: "/app/teacher", label: "Багшийн самбар" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/videos", label: "Онлайн хичээл" },
    { href: "/app/tests", label: "Шалгалт" },
    { href: "/app/payments", label: "Төлбөр" },
    { href: "/app/admin/leads", label: "Хүсэлтүүд" },
    { href: "/app/admin/enrollment", label: "Элсэлтийн удирдлага" },
    { href: "/app/schedule", label: "Хуваарь" },
    { href: "/app/planner", label: "Төлөвлөгч" },
    { href: "/app/admin/theory", label: "Онолын агуулга" },
    { href: "/app/admin/students", label: "Сурагчид" },
    { href: "/app/admin/audit", label: "Аудит" },
  ],
  ADMIN: [
    { href: "/app/admin", label: "Удирдлага" },
    { href: "/app/teacher", label: "Багшийн самбар" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/videos", label: "Онлайн хичээл" },
    { href: "/app/tests", label: "Шалгалт" },
    { href: "/app/admin/leads", label: "Хүсэлтүүд" },
    { href: "/app/admin/enrollment", label: "Элсэлтийн удирдлага" },
    { href: "/app/schedule", label: "Хуваарь" },
    { href: "/app/planner", label: "Төлөвлөгч" },
    { href: "/app/admin/theory", label: "Онолын агуулга" },
    { href: "/app/admin/students", label: "Сурагчид" },
    { href: "/app/admin/audit", label: "Аудит" },
  ],
  BUYER: [
    { href: "/app/buyer", label: "Миний эрхүүд" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/videos", label: "Онлайн хичээл" },
    { href: "/app/schedule", label: "Хуваарь" },
  ],
  PARENT: [
    { href: "/app/parent", label: "Хүүхдийн явц" },
    { href: "/app/schedule", label: "Хуваарь" },
  ],
};

function HamburgerIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

// Дунд болон том дэлгэцэн дэх хэвтээ цэс — item их байвал гүйлгэж болно,
// хажуугийн бүдгэрэлт + сум товчоор гүйлгэх боломжтойг мэдэгддэг.
function NavStrip({
  items,
  pathname,
  className = "",
}: {
  items: { href: string; label: string }[];
  pathname: string;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update, items.length]);

  function scrollByDir(dir: number) {
    scrollerRef.current?.scrollBy({ left: dir * 168, behavior: "smooth" });
  }

  return (
    <div className={`relative min-w-0 flex-1 ${className}`}>
      {canLeft && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 z-10 h-full w-6 bg-gradient-to-r from-bg to-transparent"
          />
          <button
            type="button"
            onClick={() => scrollByDir(-1)}
            aria-label="Цэсийг зүүн тийш гүйлгэх"
            className="absolute left-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink-dim shadow-sm transition hover:text-ink"
          >
            ‹
          </button>
        </>
      )}
      <div
        ref={scrollerRef}
        className="flex items-center gap-1 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-lg px-3 py-1.5 transition ${
              pathname === item.href
                ? "bg-brand-bright/20 text-brand-soft"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      {canRight && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 z-10 h-full w-6 bg-gradient-to-l from-bg to-transparent"
          />
          <button
            type="button"
            onClick={() => scrollByDir(1)}
            aria-label="Цэсийг баруун тийш гүйлгэх"
            className="absolute right-0 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-ink-dim shadow-sm transition hover:text-ink"
          >
            ›
          </button>
        </>
      )}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useSyncExternalStore(
    () => () => {},
    getRole,
    () => null,
  );
  const [navOpen, setNavOpen] = useState(false);
  // Шалгалтын fullscreen горимд header-ийг бүхэлд нь нуух ёстой (анти-чит горим
  // document.documentElement.requestFullscreen()-ийг exam хуудас дуудна).
  const [examFullscreen, setExamFullscreen] = useState(false);
  // Хуудас солигдох бүрт mobile drawer-ийг хаах — render үеийн харьцуулалт
  // ("adjust state while rendering" загвар), useEffect дотор setState дуудахгүй.
  const [drawerClosedForPathname, setDrawerClosedForPathname] = useState(pathname);
  if (pathname !== drawerClosedForPathname) {
    setDrawerClosedForPathname(pathname);
    setNavOpen(false);
  }

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    function sync() {
      setExamFullscreen(!!document.fullscreenElement);
    }
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  if (!role) return null;

  const items = NAV[role] ?? [];

  return (
    <div className="min-h-screen">
      {!examFullscreen && (
        <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <Link href="/" className="flex shrink-0 items-center">
              <LogoMark variant="full" size={34} />
            </Link>

            <NavStrip items={items} pathname={pathname} className="hidden sm:flex" />

            <button
              type="button"
              onClick={() => setNavOpen((v) => !v)}
              aria-expanded={navOpen}
              aria-controls="app-mobile-nav"
              aria-label={navOpen ? "Цэсийг хаах" : "Цэсийг нээх"}
              className="flex shrink-0 items-center justify-center rounded-lg border border-line p-2 text-ink-dim transition hover:text-ink sm:hidden"
            >
              <HamburgerIcon open={navOpen} />
            </button>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <ThemeToggle className="hidden sm:inline-flex" />
              <IdentityBadge />
              <Link
                href="/app/password"
                title="Нууц үг солих"
                className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-dim transition hover:text-ink"
              >
                🔑
              </Link>
              <button
                onClick={() => {
                  clearAuth();
                  router.push("/login");
                }}
                className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm text-ink-dim transition hover:text-ink"
              >
                Гарах
              </button>
            </div>
          </div>

          {navOpen && (
            <div
              id="app-mobile-nav"
              className="border-t border-line bg-bg px-4 py-3 sm:hidden"
            >
              <nav className="flex flex-col gap-1">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setNavOpen(false)}
                    className={`rounded-lg px-3 py-2 text-sm transition ${
                      pathname === item.href
                        ? "bg-brand-bright/20 text-brand-soft"
                        : "text-ink-dim hover:bg-panel hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-3 border-t border-line pt-3">
                <ThemeToggle />
              </div>
            </div>
          )}
        </header>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
