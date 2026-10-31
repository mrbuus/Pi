"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CalendarCheck, CalendarDays, CalendarRange, ClipboardCheck, ListChecks, type LucideIcon } from "lucide-react";
import MakeupNavBadge, { setMakeupCount } from "@/components/makeup/MakeupNavBadge";
import StudentMakeupView from "@/components/makeup/StudentMakeupView";
import type { MyMakeup } from "@/components/makeup/types";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import AttendanceTab from "./AttendanceTab";
import DaySheet from "./DaySheet";
import LessonDays from "./LessonDays";
import ScheduleTab from "./ScheduleTab";
import TestsTab from "./TestsTab";
import { dayKey } from "./lib";

type TabKey = "lessons" | "attendance" | "tests" | "makeup" | "schedule";

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: "lessons", label: "Хичээлүүд", icon: CalendarDays },
  { key: "attendance", label: "Ирц", icon: CalendarCheck },
  { key: "tests", label: "Тестүүд", icon: ClipboardCheck },
  { key: "makeup", label: "Нөхөх", icon: ListChecks },
  { key: "schedule", label: "Хуваарь", icon: CalendarRange },
];
const isTab = (v: string | null): v is TabKey => TABS.some((t) => t.key === v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Сурагчийн «Хичээл» (/app/my-class) — SURAGCH-V2-GEREE: Хичээлүүд, Ирц, Тестүүд,
 * Нөхөх (нөхөх зүйл байвал л), Хуваарь табууд (?tab=). Хичээлийн өдрийн дэлгэрэнгүй
 * ?day=YYYY-MM-DD&c=classroomId — аль ч табаас нээгдэж, линкээр хуваалцагдана.
 */
export default function MyClassHub() {
  const router = useRouter();
  const params = useSearchParams();
  const rawTab = params.get("tab");
  const tab: TabKey = isTab(rawTab) ? rawTab : "lessons";
  const dayParam = params.get("day");
  const classParam = params.get("c");
  const day = dayParam && DATE_RE.test(dayParam) && classParam ? { date: dayParam, classroomId: classParam } : null;

  // Нөхөх таб зөвхөн нөхөх зүйл байвал (эсвэл ?tab=makeup-ээр шууд орсон бол)
  const [makeupItems, setMakeupItems] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    api<MyMakeup[]>("/makeup/me")
      .then((items) => {
        setMakeupCount(items);
        if (alive) setMakeupItems(items.length);
      })
      .catch(() => alive && setMakeupItems(0));
    return () => {
      alive = false;
    };
  }, []);
  const tabs = TABS.filter((t) => t.key !== "makeup" || tab === "makeup" || (makeupItems ?? 0) > 0);

  // Апп дотроос нээсэн бол хаахад хөтчийн «буцах»; линкээр шууд орсон бол URL-аас л хасна
  const openedHere = useRef(false);
  const query = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) q.delete(k);
      else q.set(k, v);
    }
    const s = q.toString();
    return s ? `/app/my-class?${s}` : "/app/my-class";
  };
  const openDay = (date: string, classroomId: string) => {
    openedHere.current = true;
    router.push(query({ day: dayKey(date), c: classroomId }), { scroll: false });
  };
  const closeDay = () => {
    if (openedHere.current) {
      openedHere.current = false;
      router.back();
    } else {
      router.replace(query({ day: null, c: null }), { scroll: false });
    }
  };

  return (
    <div>
      <h1 className="sr-only">Хичээл</h1>
      <nav aria-label="Хичээлийн хэсгүүд" className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = key === tab;
            return (
              <li key={key}>
                <Link
                  href={key === "lessons" ? "/app/my-class" : `/app/my-class?tab=${key}`}
                  replace
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 px-3 text-sm font-bold transition",
                    active ? "border-brand-bright text-brand-soft" : "border-transparent text-ink-dim hover:text-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                  {key === "makeup" && <MakeupNavBadge />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {tab === "lessons" && <LessonDays onOpen={(d) => openDay(d.date, d.classroomId)} />}
      {tab === "attendance" && <AttendanceTab onOpen={openDay} />}
      {tab === "tests" && <TestsTab />}
      {tab === "makeup" && <StudentMakeupView />}
      {tab === "schedule" && <ScheduleTab />}

      {day && <DaySheet key={`${day.date}-${day.classroomId}`} date={day.date} classroomId={day.classroomId} onClose={closeDay} />}
    </div>
  );
}
