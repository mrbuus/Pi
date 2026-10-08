"use client";
import Link from "next/link";
import { ArrowLeft, House } from "lucide-react";
import { getPageTitle } from "@/components/nav/nav-data";
import { homeForRole } from "@/lib/api";

/** A deterministic parent link also works after opening a deep link in a new tab. */
export default function ContextNavigation({ role, pathname }: { role: string; pathname: string }) {
  const parts = pathname.split("/").filter(Boolean);
  const candidates = parts.slice(0, -1);
  let parent = homeForRole(role);
  while (candidates.length > 1) {
    const path = `/${candidates.join("/")}`;
    if (getPageTitle(role, path)) { parent = path; break; }
    candidates.pop();
  }
  const atHome = pathname === homeForRole(role);
  return <Link href={atHome ? "/" : parent} aria-label={atHome ? "Нийтийн нүүр хуудас" : `${getPageTitle(role, parent) || "Миний самбар"} руу буцах`} title={atHome ? "Нийтийн нүүр хуудас" : `${getPageTitle(role, parent) || "Миний самбар"} руу буцах`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-dim hover:bg-panel hover:text-ink">
    {atHome ? <House className="h-4 w-4" aria-hidden /> : <ArrowLeft className="h-4 w-4" aria-hidden />}
  </Link>;
}
