"use client";

import Link from "next/link";
import { BookOpen, Shapes, Sparkles } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { Button } from "@/components/ui/kit/button";
import { useAuth } from "@/hooks/useAuth";
import { homeForRole } from "@/lib/api";

/** Нийтийн хэрэглэгдэхүүний толгой: нэвтрээгүй хүнд «Нэвтрэх» доор нь үлдэнэ */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/92 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4">
          <Link href="/" className="flex min-h-11 items-center gap-2" aria-label="Нүүр хуудас">
            <LogoMark size={34} />
            <span className="hidden text-sm font-bold sm:block">Шинэ Ирээдүйн Эзэд</span>
          </Link>
          <nav aria-label="Нийтийн хэсэг" className="ml-2 flex items-center gap-1 text-sm">
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-brand-bright/12 px-3 font-semibold text-brand-soft">
              <Shapes className="h-4 w-4" aria-hidden />
              Хэрэглэгдэхүүн
            </span>
            <Link href="/books" className="hidden min-h-10 items-center gap-1.5 rounded-xl px-3 font-semibold text-ink-dim hover:text-ink sm:inline-flex">
              <BookOpen className="h-4 w-4" aria-hidden />
              Ном, тест
            </Link>
            <Link href="/sorils" className="hidden min-h-10 items-center gap-1.5 rounded-xl px-3 font-semibold text-ink-dim hover:text-ink md:inline-flex">
              <Sparkles className="h-4 w-4" aria-hidden />
              Жишиг сорил
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Button asChild variant="outline" size="sm">
                <Link href={homeForRole(user.role ?? "STUDENT")}>Миний хэсэг</Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link href="/login?next=%2Ftools">Нэвтрэх</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-5 sm:py-6">{children}</main>
    </div>
  );
}
