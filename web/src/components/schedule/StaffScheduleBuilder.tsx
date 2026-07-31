"use client";

import { useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  Repeat,
  UserCheck,
} from "lucide-react";
import CalendarAdmin from "./CalendarAdmin";
import PatternBuilder from "./PatternBuilder";
import PatternOverview from "./PatternOverview";
import ScheduleAdmin from "./ScheduleAdmin";
import TeacherWorkDays from "./TeacherWorkDays";
import WeekBuilder from "./WeekBuilder";

type TabKey = "overview" | "week" | "pattern" | "teachers" | "calendar";

const TABS: { key: TabKey; label: string; icon: typeof CalendarDays }[] = [
  // "Ерөнхий" нэгдүгээрт — бүтэн жилийн давтамжийг нэг дэлгэцэд харуулдаг
  // үндсэн харагдац (эзний загвар). "Долоо хоног" нь огноот төлөвлөгөө:
  // тухайн 7 хоногт сэдэв зоох, зөөх, цуцлах.
  { key: "overview", label: "Ерөнхий хуваарь", icon: LayoutGrid },
  { key: "week", label: "Долоо хоногийн төлөвлөгөө", icon: CalendarDays },
  { key: "pattern", label: "Хуваарь зохиох", icon: Repeat },
  { key: "teachers", label: "Багшийн ажлын өдөр", icon: UserCheck },
  { key: "calendar", label: "Сургалтын хуанли", icon: CalendarRange },
];

/**
 * ADMIN / TEACHER_PLUS-ын хуваарийн ажлын талбар.
 *
 * Табууд нь ХИЙХ АЖЛААР нь тусгаарлагдсан: байнга хардаг ерөнхий давтамж,
 * долоо хоногийн сэдэв төлөвлөлт, ховор хийдэг хуваарь зохиох, багшийн
 * ажлын өдөр, амралтын өдрийн хуанли. Идэвхгүй табыг DOM-д огт үлдээхгүй
 * (нөхцөлт render) тул буцаж ирэхэд өгөгдөл нь өөрөө шинэчлэгддэг.
 */
export default function StaffScheduleBuilder({ role }: { role: string }) {
  const [tab, setTab] = useState<TabKey>("overview");
  // PatternBuilder хуваарь үүсгэсний дараа доорх жагсаалт хуучирдаггүй байх
  // энгийн арга: түлхүүрийг нь сольж дахин mount хийлгэнэ.
  const [version, setVersion] = useState(0);

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Хуваарийн хэсгүүд"
        className="flex flex-wrap gap-2"
      >
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-brand-bright bg-brand-bright text-on-brand"
                  : "border-line bg-panel text-ink hover:border-brand"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <PatternOverview />}

      {tab === "week" && <WeekBuilder />}

      {tab === "pattern" && (
        <div className="space-y-6">
          <PatternBuilder role={role} onCreated={() => setVersion((v) => v + 1)} />
          <ScheduleAdmin key={version} role={role} />
        </div>
      )}

      {tab === "teachers" && <TeacherWorkDays />}

      {tab === "calendar" && <CalendarAdmin />}
    </div>
  );
}
