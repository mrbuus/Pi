"use client";
import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import LogoMark from "@/components/LogoMark";
import { homeForRole } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/kit/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/kit/drawer";
import styles from "./landing.module.css";
const LINKS = [
  { href: "#subjects", label: "Хичээлүүд" },
  { href: "#achievements", label: "Амжилтууд" },
  { href: "#centre-info", label: "Манай төв" },
  { href: "#tuition", label: "Төлбөр" },
  { href: "#branches", label: "Салбар" },
  { href: "/preview", label: "Номоос үзэх" },
  { href: "/help", label: "Тусламж" },
];
export default function Nav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  return (
    <header className={styles.header}>
      <nav
        aria-label="Нүүр хуудасны цэс"
        className={styles.navigation}
      >
        <Link
          href="/"
          aria-label="Шинэ Ирээдүйн Эзэд — нүүр хуудас"
          className={styles.logoLink}
        >
          <LogoMark variant="mark" size={36} priority />
          <span className={styles.logoName}>
            Шинэ Ирээдүйн Эзэд
          </span>
        </Link>
        <div className={styles.navLinks}>
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={styles.navLink}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <Button asChild variant="outline" className={styles.navAction}>
          <Link href={user ? homeForRole(user.role ?? "STUDENT") : "/login"}>
            {user ? "Миний хэсэг" : "Нэвтрэх"}
          </Link>
        </Button>
        {!user && (
          <Button asChild className={`hidden sm:inline-flex ${styles.navAction}`}>
            <Link href="/register">Бүртгүүлэх</Link>
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Цэс нээх"
          aria-expanded={open}
          aria-controls="public-nav"
          onClick={() => setOpen(true)}
        >
          <Menu aria-hidden />
        </Button>
      </nav>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent id="public-nav" aria-describedby={undefined}>
          <div className="px-5 pb-6">
            <DrawerTitle className="text-lg font-bold">
              Шинэ Ирээдүйн Эзэд
            </DrawerTitle>
            <nav aria-label="Утасны нүүр хуудасны цэс" className="mt-4 grid">
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-12 items-center border-b border-line text-ink"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <Button asChild className="mt-4 w-full">
              <Link
                href={user ? homeForRole(user.role ?? "STUDENT") : "/register"}
                onClick={() => setOpen(false)}
              >
                {user ? "Миний хэсэгт очих" : "Бүртгүүлэх"}
              </Link>
            </Button>
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => setOpen(false)}
            >
              Цэс хаах
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </header>
  );
}
