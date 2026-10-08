"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { House, LayoutDashboard } from "lucide-react";
import LogoMark from "@/components/LogoMark";
import { getRole, getToken, homeForRole } from "@/lib/api";

export default function NotFound() {
  const [dashboard, setDashboard] = useState("/login");
  useEffect(() => {
    try { const role = getRole(); if (getToken() && role) setDashboard(homeForRole(role)); } catch { /* Browser storage may be unavailable. */ }
  }, []);
  return <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-5 px-5 py-12 text-center text-ink">
    <LogoMark size={64} />
    <p className="text-sm font-semibold text-ink-dim">404</p>
    <h1 className="cyrillic-heading text-2xl font-bold">Хуудас олдсонгүй</h1>
    <p className="text-ink-dim">Хаяг өөрчлөгдсөн эсвэл буруу бичигдсэн байж болно.</p>
    <div className="flex flex-wrap justify-center gap-3">
      <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-panel px-4 py-3"><House size={18} aria-hidden />Нүүр хуудас</Link>
      <Link href={dashboard} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-3 text-on-brand"><LayoutDashboard size={18} aria-hidden />Миний самбар</Link>
    </div>
  </main>;
}
