"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import LogoMark from "@/components/LogoMark";
import { clearAuth, getRole, getToken } from "@/lib/api";

const NAV: Record<string, { href: string; label: string }[]> = {
  STUDENT: [
    { href: "/app/student", label: "Миний самбар" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/tests", label: "Шалгалт" },
  ],
  TEACHER: [
    { href: "/app/teacher", label: "Багшийн самбар" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/tests", label: "Шалгалт" },
  ],
  TEACHER_PLUS: [
    { href: "/app/teacher", label: "Багшийн самбар" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/tests", label: "Шалгалт" },
    { href: "/app/payments", label: "Төлбөр" },
  ],
  ADMIN: [
    { href: "/app/admin", label: "Удирдлага" },
    { href: "/app/teacher", label: "Багшийн самбар" },
    { href: "/app/library", label: "Бодлогын сан" },
    { href: "/app/tests", label: "Шалгалт" },
  ],
  BUYER: [
    { href: "/app/buyer", label: "Миний эрхүүд" },
    { href: "/app/library", label: "Бодлогын сан" },
  ],
  PARENT: [{ href: "/app/parent", label: "Хүүхдийн явц" }],
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const role = useSyncExternalStore(
    () => () => {},
    getRole,
    () => null,
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  if (!role) return null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#060c1d]/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <LogoMark size={28} />
            <span className="hidden font-extrabold sm:inline">
              Pi<span className="text-brand-bright">.mn</span>
            </span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm">
            {(NAV[role] ?? []).map((item) => (
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
          </nav>
          <button
            onClick={() => {
              clearAuth();
              router.push("/login");
            }}
            className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-sm text-ink-dim transition hover:text-ink"
          >
            Гарах
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
