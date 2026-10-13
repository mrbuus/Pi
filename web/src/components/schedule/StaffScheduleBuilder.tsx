"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CalendarDays, LayoutGrid, Repeat, UserCheck } from "lucide-react";
import PatternBuilder from "./PatternBuilder";
import PatternOverview from "./PatternOverview";
import ScheduleAdmin from "./ScheduleAdmin";
import SpecialDaysButton from "./special-days/SpecialDaysButton";
import TeacherWorkDays from "./TeacherWorkDays";
import WeekBuilder from "./WeekBuilder";

type TabKey = "overview" | "week" | "pattern" | "teachers";

const TABS: { key: TabKey; label: string; icon: typeof CalendarDays }[] = [
  // "Ерөнхий" нэгдүгээрт — бүтэн жилийн давтамжийг нэг дэлгэцэд харуулдаг
  // үндсэн харагдац (эзний загвар). "Долоо хоног" нь огноот төлөвлөгөө:
  // тухайн 7 хоногт сэдэв зоох, зөөх, цуцлах.
  { key: "overview", label: "Ерөнхий хуваарь", icon: LayoutGrid },
  { key: "week", label: "Өдрийн хуваарь", icon: CalendarDays },
  { key: "pattern", label: "Хуваарь зохиох", icon: Repeat },
  { key: "teachers", label: "Багшийн ажлын өдөр", icon: UserCheck },
];

/**
 * ADMIN / TEACHER_PLUS-ын хуваарийн ажлын талбар.
 *
 * Табууд нь ХИЙХ АЖЛААР нь тусгаарлагдсан: байнга хардаг ерөнхий давтамж,
 * долоо хоногийн сэдэв төлөвлөлт, ховор хийдэг хуваарь зохиох, багшийн
 * ажлын өдөр. Амралт/шалгалтын өдөр (жилд 1-2 удаа) таб биш, баруун
 * буланд «Онцгой өдөр» товчоор цонх нээнэ. Идэвхгүй табыг DOM-д огт үлдээхгүй
 * (нөхцөлт render) тул буцаж ирэхэд өгөгдөл нь өөрөө шинэчлэгддэг.
 */
export default function StaffScheduleBuilder({ role }: { role: string }) {
  const [tab, setTab] = useState<TabKey>("overview");
  // PatternBuilder хуваарь үүсгэсний дараа доорх жагсаалт хуучирдаггүй байх
  // энгийн арга: түлхүүрийг нь сольж дахин mount хийлгэнэ.
  const [version, setVersion] = useState(0);
  // Багш+ хуваарь засах нь `schedule.manage` тусгай эрхтэй (админ олгоно).
  // Эрхгүй бол засах табуудыг харуулахгүй — сервер хадгалахад 403 өгдөг.
  const [canEdit, setCanEdit] = useState(role === "ADMIN");
  useEffect(() => {
    if (role === "ADMIN") return;
    api<{ administrator: boolean; grants: { capability: string }[] }>(
      "/staff-capabilities/me",
    )
      .then((r) =>
        setCanEdit(
          r.administrator ||
            r.grants.some((g) => g.capability === "schedule.manage"),
        ),
      )
      .catch(() => setCanEdit(false));
  }, [role]);
  // Багшийн ажлын өдрийн хүснэгтийг Багш+ schedule.manage-гүйгээр засна —
  // өдөр бүр хуваарь зохиодог (эзэн 2026-10-11).
  const canRoster = canEdit || role === "TEACHER_PLUS";
  const tabs = TABS.filter(
    (t) =>
      t.key === "overview" ||
      t.key === "week" ||
      (t.key === "teachers" && canRoster) ||
      (t.key === "pattern" && canEdit),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div
          role="tablist"
          aria-label="Хуваарийн хэсгүүд"
          className="flex flex-wrap gap-2"
        >
          {tabs.map(({ key, label, icon: Icon }) => {
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
        <SpecialDaysButton canEdit={canEdit} />
      </div>

      {tab === "overview" && <PatternOverview />}

      {tab === "week" && <WeekBuilder />}

      {tab === "pattern" && (
        <div className="space-y-6">
          <PatternBuilder
            role={role}
            onCreated={() => setVersion((v) => v + 1)}
          />
          <ScheduleAdmin key={version} role={role} />
        </div>
      )}

      {tab === "teachers" && <TeacherWorkDays />}
    </div>
  );
}
