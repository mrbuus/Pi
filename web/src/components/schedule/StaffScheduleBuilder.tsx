"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CalendarDays, LayoutGrid, UserCheck } from "lucide-react";
import { canManageAny } from "./pattern/model";
import { useScheduleAccess } from "./pattern/access";
import PatternOverview from "./PatternOverview";
import SpecialDaysButton from "./special-days/SpecialDaysButton";
import TeacherWorkDays from "./TeacherWorkDays";
import WeekBuilder from "./WeekBuilder";

type TabKey = "overview" | "week" | "teachers";

const TABS: { key: TabKey; label: string; icon: typeof CalendarDays }[] = [
  // Дараалал (эзэн 2026-10-22): өдрийн хуваарь ЭХЭНД, анхдагчаар нээгдэнэ — 7 хоногийн
  // тогтмол хэв маягийг ховор хардаг тул хоёрдугаарт. Дараа нь багшийн ажлын өдөр.
  // Хуучин «Хуваарь зохиох» таб (бөөнөөр үүсгэх маягт + мөрийн жагсаалт) нь
  // тогтмол хуваарийн торонд шингэсэн: «Шинэ цаг нэмэх» товч, хичээл дээр дарж засах,
  // доор «Төлөвлөсөн өөрчлөлт» (2026-10-18).
  { key: "week", label: "Өдрийн хуваарь", icon: CalendarDays },
  { key: "overview", label: "Ерөнхий хуваарь", icon: LayoutGrid },
  { key: "teachers", label: "Багшийн ажлын өдөр", icon: UserCheck },
];

/**
 * ADMIN / TEACHER_PLUS / TEACHER-ийн хуваарийн ажлын талбар.
 *
 * Энгийн Багш Багш+-тай ИЖИЛ табуудыг харна (ямар ч өдрийн хуваарь, 7 хоногийн
 * тогтмол хуваарь, багшийн ажлын өдөр, онцгой өдөр) — зөвхөн засах товч, цонх
 * гарахгүй (эзэн 2026-10-22).
 * Засах эрх: ADMIN бүгд; Багш+ `schedule.manage` тусгай эрхээр (анги тус бүрээр
 * олгогдсон байж болно). Эрхгүй бол тогтмол хуваарийг зөвхөн харна. Амралт/шалгалтын
 * өдөр (жилд 1-2 удаа) таб биш, баруун буланд «Онцгой өдөр» товчоор. Идэвхгүй табыг
 * DOM-д үлдээхгүй тул буцаж ирэхэд өгөгдөл нь шинэчлэгдэнэ.
 */
export default function StaffScheduleBuilder({ role }: { role: string }) {
  const [tab, setTab] = useState<TabKey>("week");
  const access = useScheduleAccess(role);
  const canEdit = canManageAny(access);
  // Багшийн ажлын өдрийн хүснэгтийг Багш+ schedule.manage-гүйгээр засна (эзэн 2026-10-11)
  const canEditRoster = canEdit || role === "TEACHER_PLUS";
  const tabs = TABS;
  const refs = useRef<Partial<Record<TabKey, HTMLButtonElement | null>>>({});

  function onKey(e: KeyboardEvent) {
    const i = tabs.findIndex((t) => t.key === tab);
    const next =
      e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = tabs[(next + tabs.length) % tabs.length].key;
    setTab(target);
    refs.current[target]?.focus();
  }

  return (
    <div className="space-y-6">
      {/* НЭГ мөр (эзэн 2026-10-18): багтвал нэг мөрөнд, багтахгүй бол баруун-зүүн тийш гүйлгэнэ */}
      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div role="tablist" aria-label="Хуваарийн хэсгүүд" className="flex shrink-0 gap-2" onKeyDown={onKey}>
          {tabs.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                ref={(el) => {
                  refs.current[key] = el;
                }}
                id={`sched-tab-${key}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`sched-panel-${key}`}
                tabIndex={active ? 0 : -1}
                onClick={(e) => {
                  setTab(key);
                  e.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
                }}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                  active ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-panel text-ink hover:border-brand"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
        <div className="ml-auto shrink-0 whitespace-nowrap">
          <SpecialDaysButton canEdit={canEdit} />
        </div>
      </div>

      <div id={`sched-panel-${tab}`} role="tabpanel" aria-labelledby={`sched-tab-${tab}`} className="min-w-0">
        {tab === "week" && <WeekBuilder />}
        {tab === "overview" && <PatternOverview access={access} />}
        {tab === "teachers" && <TeacherWorkDays readOnly={!canEditRoster} />}
      </div>
    </div>
  );
}
