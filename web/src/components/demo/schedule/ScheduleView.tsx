"use client";

import { Building2, CalendarOff, CircleDashed, Info, LayoutList, Table2, BadgeCheck, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import InfoHint from "@/components/ui/InfoHint";
import { EmptyState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import DateStrip, { type YearMonth } from "../shell/DateStrip";
import { ClientOnly } from "../shell/status";
import {
  CLASSES,
  SEASON_START,
  addDays,
  fromKey,
  fromMin,
  lessonsOnDate,
  longLabel,
  nowMinute,
  teachersOnDate,
  todayKey,
} from "../world";
import LessonRow from "./LessonRow";
import { ConfirmedBadge, RolePill, StatusBadge, WarnBadge } from "./parts";
import PublishButton from "./PublishButton";
import TeacherPanel from "./TeacherPanel";
import {
  BRANCHES,
  decorate,
  relativeDay,
  teacherLoads,
  uniqueTeacherCount,
  warningCounts,
  weekRangeLabel,
  weekStartOf,
} from "./util";
import WeekGrid from "./WeekGrid";

type Mode = "day" | "week";

const MODES: Array<{ key: Mode; label: string; icon: LucideIcon }> = [
  { key: "day", label: "Өдөр", icon: LayoutList },
  { key: "week", label: "7 хоног", icon: Table2 },
];

/** Ямар нэг анги хичээлтэй бүх гараг (0 = Даваа, 6 = Ням) */
const LESSON_DAYS = [...new Set(CLASSES.flatMap((c) => c.slots.map((s) => s.day)))].sort((a, b) => a - b);

const ymOf = (key: string): YearMonth => {
  const d = fromKey(key);
  return { y: d.getFullYear(), m: d.getMonth() };
};

/** Цаг хамаарсан өгөгдөл (хичээлийн төлөв) тул зөвхөн хөтөч дээр зурна, сервер дээр араг яс */
export default function ScheduleView() {
  return (
    <ClientOnly fallback={<ScheduleSkeleton />}>
      <Schedule />
    </ClientOnly>
  );
}

function ScheduleSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-3">
      <div className="skeleton h-8 w-60 rounded-lg" />
      <div className="skeleton h-11 rounded-xl" />
      <div className="skeleton h-[104px] rounded-xl" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="skeleton h-32 rounded-xl" />
      ))}
    </div>
  );
}

/** Хичээлийн төлөв цагийн дагуу өөрчлөгддөг тул 30 секунд тутам дахин зурна */
function useMinuteTick() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(id);
  }, []);
}

function Schedule() {
  const [today] = useState(() => todayKey());
  const [mode, setMode] = useState<Mode>("day");
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<YearMonth>(() => ymOf(today));
  const [open, setOpen] = useState<Record<string, true>>({});
  // Баталгаажуулалт: world-ийн анхны төлөвийг дарж бичнэ (true = батласан, false = цуцалсан)
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [published, setPublished] = useState<{ at: string; recipients: number } | null>(null);
  const tabs = useRef<Record<Mode, HTMLButtonElement | null>>({ day: null, week: null });
  useMinuteTick();

  const pickDate = (key: string) => {
    setSelected(key);
    setView(ymOf(key));
  };

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });

  const onTabKey = (e: KeyboardEvent) => {
    const i = MODES.findIndex((m) => m.key === mode);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? MODES.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const target = MODES[(next + MODES.length) % MODES.length].key;
    setMode(target);
    tabs.current[target]?.focus();
  };

  // Өдрийн харагдац
  const views = decorate(lessonsOnDate(selected));
  const loads = teacherLoads(views, teachersOnDate(selected));

  // 7 хоногийн харагдац
  const startKey = weekStartOf(selected);
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
  const lessonsByDay = mode === "week" ? weekKeys.map((k) => lessonsOnDate(k)) : [];
  const weekLessons = lessonsByDay.flat();

  // «Нийтлэх» нь үргэлж маргаашийн хуваарьт хамаарна
  const tomorrow = addDays(today, 1);
  const tomorrowViews = decorate(lessonsOnDate(tomorrow));
  const tomorrowWarn = warningCounts(tomorrowViews);
  const tomorrowTeachers = uniqueTeacherCount(tomorrowViews.map((v) => v.lesson));
  const tomorrowStudents = tomorrowViews.reduce((n, v) => n + v.students, 0);

  const publish = () => {
    setPublished({ at: fromMin(nowMinute()), recipients: tomorrowTeachers + tomorrowStudents });
    toast.success(published ? "Өөрчлөлт илгээгдлээ" : "Маргаашийн хуваарь нийтлэгдлээ", {
      description: `Мэдэгдэл очсон: ${tomorrowTeachers} багш, ${tomorrowStudents} сурагч`,
    });
  };

  const rel = relativeDay(selected, today);
  const seasonStart = fromKey(SEASON_START);
  const footer =
    mode === "day" ? (
      <span className="tabular-nums">
        {views.length} хичээл, {loads.length} багш
      </span>
    ) : (
      <span className="tabular-nums">
        {weekRangeLabel(startKey)}: {weekLessons.length} хичээл, {uniqueTeacherCount(weekLessons)} багш
      </span>
    );

  return (
    <div className="space-y-3">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="cyrillic-heading text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Хичээлийн хуваарь</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-bright/30 bg-brand-bright/10 px-2.5 py-1 text-xs font-semibold text-brand-soft">
            <Info className="size-3.5" aria-hidden />
            Демо — хадгалагдахгүй
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="tablist" aria-label="Харагдац" onKeyDown={onTabKey} className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1">
            {MODES.map(({ key, label, icon: Icon }) => {
              const on = key === mode;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    tabs.current[key] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`sch-tab-${key}`}
                  aria-selected={on}
                  aria-controls="sch-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => setMode(key)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3.5 text-sm font-semibold transition-colors sm:min-h-9",
                    on ? "border-brand-bright bg-brand-bright/10 text-brand-soft" : "border-transparent text-ink-dim hover:text-ink",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
          <PublishButton
            dateLabel={longLabel(fromKey(tomorrow))}
            lessons={tomorrowViews.length}
            teachers={tomorrowTeachers}
            students={tomorrowStudents}
            overCount={tomorrowWarn.over}
            clashCount={tomorrowWarn.clash}
            published={published}
            onPublish={publish}
          />
        </div>
      </header>

      <DateStrip
        todayKey={today}
        lessonDays={LESSON_DAYS}
        selectedKey={selected}
        view={view}
        onView={setView}
        onSelect={pickDate}
        footer={footer}
      />

      <div role="tabpanel" id="sch-panel" aria-labelledby={`sch-tab-${mode}`} className="space-y-4">
        {mode === "day" ? (
          <>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <h2 className="cyrillic-heading text-lg font-bold text-ink">{longLabel(fromKey(selected))}</h2>
              {rel && <Badge tone="brand">{rel}</Badge>}
              {selected === tomorrow &&
                (published ? (
                  <Badge tone="success">
                    <BadgeCheck aria-hidden />
                    Нийтэлсэн {published.at} — {published.recipients} хүнд очсон
                  </Badge>
                ) : (
                  <Badge tone="neutral">
                    <CircleDashed aria-hidden />
                    Нийтлээгүй
                  </Badge>
                ))}
            </div>

            {views.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="Энэ өдөр хичээл алга"
                hint={`Улирал ${seasonStart.getMonth() + 1}-р сарын ${seasonStart.getDate()}-нд эхэлсэн тул өмнөх өдрүүдэд хуваарь байхгүй`}
                action={
                  <Button variant="outline" size="sm" onClick={() => pickDate(today)} className="min-h-11 rounded-lg px-3 sm:min-h-9">
                    Өнөөдөр рүү очих
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17.5rem] lg:items-start">
                <div className="min-w-0 space-y-5">
                  {BRANCHES.map((branch, bi) => {
                    const items = views.filter((v) => v.cls.branch === branch);
                    return (
                      <section key={branch} aria-labelledby={`sch-branch-${bi}`}>
                        <h3 id={`sch-branch-${bi}`} className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
                          <Building2 className="size-4 text-ink-dim" aria-hidden />
                          {branch}
                          <span className="text-xs font-medium tabular-nums text-ink-dim">{items.length} хичээл</span>
                        </h3>
                        {items.length ? (
                          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                            {items.map((v) => (
                              <LessonRow
                                key={v.lesson.id}
                                view={v}
                                expanded={!!open[v.lesson.id]}
                                confirmed={confirmed[v.lesson.id] ?? v.lesson.confirmed}
                                onToggle={() => toggle(v.lesson.id)}
                                onConfirm={() => setConfirmed((prev) => ({ ...prev, [v.lesson.id]: true }))}
                                onUnconfirm={() => setConfirmed((prev) => ({ ...prev, [v.lesson.id]: false }))}
                              />
                            ))}
                          </ul>
                        ) : (
                          <p className="rounded-xl border border-dashed border-line px-3 py-4 text-sm text-ink-dim">Энэ байранд хичээл алга</p>
                        )}
                      </section>
                    );
                  })}
                </div>
                <TeacherPanel loads={loads} className="lg:sticky lg:top-[4.5rem]" />
              </div>
            )}
          </>
        ) : weekLessons.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="Энэ 7 хоногт хичээл алга"
            hint="Өөр 7 хоног сонгоно уу"
            action={
              <Button variant="outline" size="sm" onClick={() => pickDate(today)} className="min-h-11 rounded-lg px-3 sm:min-h-9">
                Энэ 7 хоног руу очих
              </Button>
            }
          />
        ) : (
          <WeekGrid
            startKey={startKey}
            weekKeys={weekKeys}
            lessonsByDay={lessonsByDay}
            today={today}
            selected={selected}
            onPickDay={(key) => {
              pickDate(key);
              setMode("day");
            }}
            onShift={(delta) => pickDate(addDays(selected, delta * 7))}
          />
        )}
      </div>

      <Legend mode={mode} />
    </div>
  );
}

/** Тэмдэглэгээ — үргэлж хуудасны хамгийн доор. Тайлбарыг ил бичихгүй, «i» тэмдэг дотор (STATUS §3.5) */
function Legend({ mode }: { mode: Mode }) {
  return (
    <section aria-labelledby="sch-legend" className="rounded-xl border border-line bg-surface px-3 py-3">
      <h2 id="sch-legend" className="mb-2 flex items-center gap-1 text-xs font-bold text-ink-dim">
        Тэмдэглэгээ
        <InfoHint label="Тэмдэглэгээний тайлбар" className="[&>button]:-m-4 [&>button]:p-4">
          {mode === "day" ? (
            <span className="block space-y-1.5">
              <span className="block">«Батлах» товч дууссан хичээлд гарна</span>
              <span className="block">Үсгэн тэмдгийн өнгө багшийн ролийг заана</span>
              <span className="block">Анхааруулга: танхимд суудлаас олон сурагч байна, эсвэл багш нэгэн зэрэг хоёр ангид хичээлтэй</span>
            </span>
          ) : (
            <span className="block space-y-1.5">
              <span className="block">Нүд бүрт цаг, анги, сурагч/суудлын тоо байна</span>
              <span className="block">Хоосон нүд нь танхим чөлөөтэй гэсэн үг</span>
              <span className="block">Өдрийн толгойг дарвал тухайн өдрийн жагсаалт нээгдэнэ</span>
            </span>
          )}
        </InfoHint>
      </h2>
      <ul className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
        {mode === "day" ? (
          <>
            <li className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status="upcoming" />
              <StatusBadge status="now" />
              <StatusBadge status="done" />
            </li>
            <li>
              <ConfirmedBadge />
            </li>
            <li className="flex flex-wrap items-center gap-1.5">
              <RolePill role="TEACHER_PLUS" />
              <RolePill role="TEACHER" />
            </li>
            <li>
              <WarnBadge>Анхааруулга</WarnBadge>
            </li>
          </>
        ) : (
          <>
            <li className="text-xs text-ink-dim">Нүд: цаг, анги, сурагч/суудал</li>
            <li>
              <WarnBadge>Суудал дутсан</WarnBadge>
            </li>
          </>
        )}
      </ul>
    </section>
  );
}
