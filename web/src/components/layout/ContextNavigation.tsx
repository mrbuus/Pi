"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { ArrowLeft, House } from "lucide-react";
import { getPageTitle } from "@/components/nav/nav-data";
import { homeForRole } from "@/lib/api";

/*
 * Буцах товч = ӨМНӨХ хуудас руу (эзэн 2026-10-18: «Ангиуд → ... → буцах нь шууд
 * нүүр рүү очдог, өмнөх таб руугаа буцах ёстой»). Энэ табын доторх апп-ын явсан
 * замыг sessionStorage-д хадгална: өмнөх хуудас байвал хөтчийн back (түүх зөв
 * хэвээр), байхгүй бол (шинэ табад шууд линкээр нээсэн) эцэг хуудас руу.
 */
const TRAIL_KEY = "pi_nav_trail";
const TRAIL_MAX = 30;
const listeners = new Set<() => void>();

function readTrail(): string[] {
  try {
    const raw = window.sessionStorage.getItem(TRAIL_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function writeTrail(trail: string[]) {
  try {
    window.sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail.slice(-TRAIL_MAX)));
  } catch {
    // хадгалах боломжгүй (private mode) — эцэг хуудас руу буцна
  }
  listeners.forEach((l) => l());
}
/** Шинэ хуудас: өмнөхийн өмнөх рүү буцсан бол (хөтчийн back) сүүлийнхийг хасна, эс бөгөөс нэмнэ */
function recordVisit(path: string) {
  const trail = readTrail();
  if (trail[trail.length - 1] === path) return;
  if (trail[trail.length - 2] === path) writeTrail(trail.slice(0, -1));
  else writeTrail([...trail, path]);
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const previousOf = (path: string) => {
  const trail = readTrail();
  return trail[trail.length - 1] === path ? (trail[trail.length - 2] ?? null) : null;
};

/** Эцэг хуудас — түүхгүй үед (шинэ таб, гаднаас линкээр) */
function parentOf(role: string, pathname: string) {
  const candidates = pathname.split("/").filter(Boolean).slice(0, -1);
  let parent = homeForRole(role);
  while (candidates.length > 1) {
    const path = `/${candidates.join("/")}`;
    if (getPageTitle(role, path)) {
      parent = path;
      break;
    }
    candidates.pop();
  }
  return parent;
}

const BTN = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-dim hover:bg-panel hover:text-ink";

export default function ContextNavigation({ role, pathname }: { role: string; pathname: string }) {
  const router = useRouter();
  useEffect(() => recordVisit(pathname), [pathname]);
  const previous = useSyncExternalStore(subscribe, () => previousOf(pathname), () => null);

  const atHome = pathname === homeForRole(role);
  if (atHome && !previous)
    return (
      <Link href="/" aria-label="Нийтийн нүүр хуудас" title="Нийтийн нүүр хуудас" className={BTN}>
        <House className="h-4 w-4" aria-hidden />
      </Link>
    );

  if (previous) {
    const label = `${getPageTitle(role, previous) || "Өмнөх хуудас"} руу буцах`;
    return (
      <button type="button" onClick={() => router.back()} aria-label={label} title={label} className={BTN}>
        <ArrowLeft className="h-4 w-4" aria-hidden />
      </button>
    );
  }

  const parent = parentOf(role, pathname);
  const label = `${getPageTitle(role, parent) || "Миний самбар"} руу буцах`;
  return (
    <Link href={parent} aria-label={label} title={label} className={BTN}>
      <ArrowLeft className="h-4 w-4" aria-hidden />
    </Link>
  );
}
