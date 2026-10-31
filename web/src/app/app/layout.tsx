"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import ContextNavigation from "@/components/layout/ContextNavigation";
import BottomTabs from "@/components/nav/BottomTabs";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import Sidebar from "@/components/nav/Sidebar";
import ClassHubTabs, { hubFor } from "@/components/nav/ClassHubTabs";
import UserMenu from "@/components/nav/UserMenu";
import ThemeToggle from "@/components/ThemeToggle";
import { TopBarSlotProvider } from "@/components/nav/TopBarSlot";
import { getPageTitle } from "@/components/nav/nav-data";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api, clearAuth, getRole, getToken } from "@/lib/api";
import { navigationRole } from "@/lib/navigation-role";

/** Нэвтэрсний дараах зөвшөөрлийн шалгалт (G17). Өгөгдмөл УНТРААЛТТАЙ — эзэн 2026-10-22. */
const CONSENT_GATE_ENABLED = process.env.NEXT_PUBLIC_CONSENT_GATE === "1";

// Role бүрийн монгол нэр — header identity badge-д ашиглана
const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Админ",
  TEACHER_PLUS: "Багш+",
  TEACHER: "Багш",
  STUDENT: "Сурагч",
  PARENT: "Эцэг эх",
  BUYER: "Худалдан авагч",
  GROUP_TEACHER: "Анги удирдах",
};

interface Me {
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string | null;
  studentCode?: string | null;
  teacherCode?: string | null;
  externalTeacherProfile?: { verifiedAt: string | null } | null;
}
interface ChildLink {
  verified: boolean;
  student: { firstName: string; lastName: string };
}

// Эцэг эхэд баталгаажсан хүүхдийн нэрийг хэрэглэгчийн цэст давхар харуулна.
function useVerifiedChildName(role: string | undefined): string {
  const [children, setChildren] = useState<ChildLink[]>([]);
  useEffect(() => {
    if (role === "PARENT") api<ChildLink[]>("/parent/children").then(setChildren).catch(() => {});
  }, [role]);
  return children.find((c) => c.verified)?.student.firstName ?? "";
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
  const [identity, setIdentity] = useState<{ authRole: string; me: Me } | null>(null);
  const [identityError, setIdentityError] = useState(false);
  const [identityRetry, setIdentityRetry] = useState(0);
  const me = identity?.authRole === role ? identity.me : null;
  const needsStaffMode = role === "TEACHER" || role === "TEACHER_PLUS";
  const displayRole = me ? navigationRole(me) : role;
  const childName = useVerifiedChildName(me?.role);

  useEffect(() => {
    const token = getToken();
    if (!token || !role) return;
    let active = true;
    api<Me>("/auth/me").then((value) => {
      if (active && getToken() === token) {
        setIdentity({ authRole: role, me: value });
        setIdentityError(false);
      }
    }).catch(() => { if (active && getToken() === token) setIdentityError(true); });
    return () => { active = false; };
  }, [role, identityRetry]);

  useEffect(() => {
    if (displayRole === "GROUP_TEACHER" && pathname === "/app/teacher") {
      router.replace("/app/groups");
    }
  }, [displayRole, pathname, router]);
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
      // Нэвтэрсний дараа яг энэ хуудас руу буцна (ж: жишиг сорилын бүртгэл)
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [router, pathname]);

  // Нууцлалын нөхцөлийг (G17) хараахан зөвшөөрөөгүй хэрэглэгчийг нэг удаа
  // /app/consent руу чиглүүлнэ. Сервер алдаа өгвөл ажлыг ХААХГҮЙ (шалгалт
  // саадгүй үргэлжилнэ) — дараагийн ачааллаар дахин шалгана.
  // ⏸ ТҮР УНТРААСАН (эзэн 2026-10-22): нэвтэрсний дараах «Үйлчилгээний нөхцөл»
  // алхмыг хасав. Код, /app/consent хуудас, /consent/my API, ӨС-ийн талбарууд
  // хэвээр. Дахин асаахдаа CONSENT_GATE_ENABLED (доор) — env NEXT_PUBLIC_CONSENT_GATE=1.
  const [consentChecked, setConsentChecked] = useState(!CONSENT_GATE_ENABLED);
  useEffect(() => {
    if (!CONSENT_GATE_ENABLED) return;
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
  // Resolve the current user's group/staff mode before mounting a centre
  // dashboard. Network failure has an explicit retry instead of a wrong menu.
  if (needsStaffMode && !me) return <div className="mx-auto max-w-xl px-4 py-12">
    {identityError
      ? <ErrorState message="Таны хэсгийг нээхэд холболт тасарлаа." onRetry={() => { setIdentityError(false); setIdentityRetry((value) => value + 1); }} />
      : <LoadingState label="Таны хэсгийг нээж байна…" />}
    <Link href="/" className="mt-4 inline-flex min-h-11 items-center text-brand underline">Нүүр хуудас</Link>
  </div>;

  const pageTitle = getPageTitle(displayRole, pathname);
  // Дэд хуудсууд цэсэнд эх хэсгээ идэвхтэй харуулна: табтай хэсгүүд (Хуваарь,
  // Элсэлт) → эх мөр, анги/сурагч/ноорогийн дэлгэрэнгүй → жагсаалт.
  const hub = hubFor(displayRole, pathname);
  // Сурагчийн «Хичээл» hub (/app/my-class, табууд нь ?tab=) ба тестийн дэд хуудас → цэсэнд «Хичээл» идэвхтэй
  const navPathname = displayRole === "STUDENT" && pathname.startsWith("/app/my-class/")
    ? "/app/my-class"
    : hub
    ? hub.navHref
    : pathname.startsWith("/app/classes/")
      ? "/app/classes"
      : pathname.startsWith("/app/students/")
        ? "/app/admin/students"
        : pathname.startsWith("/app/internal/")
          ? "/app/internal"
          : pathname;
  const logout = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <TopBarSlotProvider node={topBarSlotEl}>
      <a
        href="#main-content"
        className="absolute -top-full left-0 z-[9999] rounded-b-lg border-b-2 border-brand-bright bg-brand-bright/10 px-4 py-2 text-sm font-semibold text-brand-soft focus:top-0"
      >
        Агуулга руу шилжих
      </a>
      <div className="min-h-screen md:flex">
        {!examFullscreen && (
          <Sidebar
            role={displayRole ?? role}
            pathname={navPathname}
            mobileOpen={navOpen}
            onMobileOpenChange={setNavOpen}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* backdrop-blur үгүй: сул утсан дээр гүйлгэх, товшилт бүрт бүдгэрүүлгийг дахин зурж гацаадаг (эзэн 2026-10-31) */}
          {!examFullscreen && (
            <header className="sticky top-0 z-30 border-b border-line bg-bg">
              <div className="flex h-14 items-center gap-3 px-4">
                <ContextNavigation role={displayRole ?? role} pathname={pathname} />
                {pageTitle && (
                  <span className="min-w-0 max-w-[40vw] truncate text-sm font-semibold text-ink sm:max-w-none sm:text-base">
                    {pageTitle}
                  </span>
                )}
                {/* Хуудас бүр өөрийн удирдлагыг (ж: ангийн сонголт) энд portal-аар
                    оруулж болно — @/components/nav/TopBarSlot-г үзнэ үү. */}
                <div
                  ref={setTopBarSlotEl}
                  className="ml-2 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                />
                {/* Баруун дээд: цагаан/хар, мэдэгдлийн хонх (G27), хэрэглэгчийн цэс */}
                <div className="flex shrink-0 items-center gap-0.5">
                  <ThemeToggle />
                  <NotificationBell />
                  <UserMenu
                    me={me}
                    role={displayRole ?? role}
                    roleLabel={ROLE_LABEL[displayRole ?? ""] ?? displayRole ?? ""}
                    extra={childName}
                    onLogout={logout}
                  />
                </div>
              </div>
            </header>
          )}
          {/* Утсан дээр доод таб мөрөнд агуулга дарагдахгүйн тулд доод зай нэмэгдэнэ. */}
          <main
            id="main-content"
            className={`mx-auto w-full max-w-6xl px-4 pt-6 md:pb-8 lg:pt-8 ${
              examFullscreen ? "pb-8" : "pb-28"
            }`}
          >
            {displayRole === "GROUP_TEACHER" && pathname === "/app/teacher"
              ? <LoadingState label="Анги удирдах хэсгийг нээж байна…" />
              : <>
                  {hub && <ClassHubTabs pathname={pathname} tabs={hub.tabs} label={hub.label} />}
                  {children}
                </>}
          </main>
        </div>
      </div>
      {!examFullscreen && (
        <BottomTabs
          role={displayRole ?? role}
          pathname={navPathname}
          moreOpen={navOpen}
          onMore={() => setNavOpen((v) => !v)}
        />
      )}
    </TopBarSlotProvider>
  );
}
