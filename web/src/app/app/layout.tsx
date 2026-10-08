"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import BottomTabs from "@/components/nav/BottomTabs";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import Sidebar from "@/components/nav/Sidebar";
import { TopBarSlotProvider } from "@/components/nav/TopBarSlot";
import { getPageTitle } from "@/components/nav/nav-data";
import { Meta } from "@/components/ui/Meta";
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
          <Meta items={[ROLE_LABEL[me.role] ?? me.role, verifiedChild ? verifiedChild.firstName : ""]} />
        </span>
      </span>
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
  // Дэд хуудаснууд TopBarSlot-оор дамжуулан удирдлагаа portal хийдэг DOM
  // зангилаа — @/components/nav/TopBarSlot-ийн гэрээг үзнэ үү.
  const [topBarSlotEl, setTopBarSlotEl] = useState<HTMLDivElement | null>(null);
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

  // Нууцлалын нөхцөлийг (G17) хараахан зөвшөөрөөгүй хэрэглэгчийг нэг удаа
  // /app/consent руу чиглүүлнэ. Сервер алдаа өгвөл ажлыг ХААХГҮЙ (шалгалт
  // саадгүй үргэлжилнэ) — дараагийн ачааллаар дахин шалгана.
  const [consentChecked, setConsentChecked] = useState(false);
  useEffect(() => {
    if (consentChecked || !getToken() || pathname === "/app/consent") return;
    api<{ needsConsent: boolean }>("/consent/my")
      .then((r) => {
        setConsentChecked(true);
        if (r.needsConsent) router.replace("/app/consent");
      })
      .catch(() => setConsentChecked(true));
  }, [consentChecked, pathname, router]);

  useEffect(() => {
    function sync() {
      setExamFullscreen(!!document.fullscreenElement);
    }
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  if (!role) return null;

  const pageTitle = getPageTitle(role, pathname);

  return (
    <TopBarSlotProvider node={topBarSlotEl}>
      <a
        href="#main-content"
        className="absolute -top-full left-0 z-[9999] rounded-b-lg border-b-2 border-brand-bright bg-brand-bright/10 px-4 py-2 text-sm font-semibold text-brand-soft focus:top-0"
      >
        Агуулга руу шилжих
      </a>
      <div className="min-h-screen lg:flex">
        {!examFullscreen && (
          <Sidebar
            role={role}
            pathname={pathname}
            mobileOpen={navOpen}
            onMobileOpenChange={setNavOpen}
            identity={<IdentityBadge />}
            onLogout={() => {
              clearAuth();
              router.push("/login");
            }}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {!examFullscreen && (
            <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
              <div className="flex h-14 items-center gap-3 px-4">
                {pageTitle && (
                  <span className="shrink-0 truncate text-sm font-semibold text-ink sm:text-base">
                    {pageTitle}
                  </span>
                )}
                {/* Хуудас бүр өөрийн удирдлагыг (ж: ангийн сонголт) энд portal-аар
                    оруулж болно — @/components/nav/TopBarSlot-г үзнэ үү. */}
                <div
                  ref={setTopBarSlotEl}
                  className="ml-2 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                />
                {/* Мэдэгдлийн хонх (G27) — 60 сек тутам уншаагүй тоог шалгана */}
                <div className="shrink-0">
                  <NotificationBell />
                </div>
              </div>
            </header>
          )}
          {/* Утсан дээр доод таб мөрөнд агуулга дарагдахгүйн тулд доод зай нэмэгдэнэ. */}
          <main
            id="main-content"
            className={`mx-auto w-full max-w-6xl px-4 pt-6 lg:pb-8 lg:pt-8 ${
              examFullscreen ? "pb-8" : "pb-28"
            }`}
          >
            {children}
          </main>
        </div>
      </div>
      {!examFullscreen && (
        <BottomTabs
          role={role}
          pathname={pathname}
          moreOpen={navOpen}
          onMore={() => setNavOpen((v) => !v)}
        />
      )}
    </TopBarSlotProvider>
  );
}
