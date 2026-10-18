"use client";

import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileCheck,
  ListChecks,
  NotebookPen,
  School,
  Trophy,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ComponentType } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { RaisedHandIcon } from "../shell/status";
import { ME, classById, fmtMoney, latestLessonDayKey, teacherById, type DemoClass } from "../world";
import { Avatar, Kpi, Panel, monthOfToday, type YM } from "./common";
import ExamsPanel from "./ExamsPanel";
import { boardHref, roomsOf, slotGroups } from "./format";
import MonthGrid from "./MonthGrid";
import PaymentsPanel from "./PaymentsPanel";
import RankingPanel from "./RankingPanel";
import RiskPanel from "./RiskPanel";
import { WINDOW_DAYS, classDetail } from "./stats";

type TabKey = "att" | "hw" | "exams" | "rank" | "risk" | "pay";

const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon | ComponentType<{ className?: string }> }> = [
  { key: "att", label: "Ирц", icon: RaisedHandIcon },
  { key: "hw", label: "Даалгавар", icon: NotebookPen },
  { key: "exams", label: "Шалгалт", icon: FileCheck },
  { key: "rank", label: "Эрэмбэ", icon: Trophy },
  { key: "risk", label: "Асуудалтай", icon: TriangleAlert },
  { key: "pay", label: "Төлбөр", icon: Wallet },
];

/** Төлбөрийг зөвхөн Багш+ харна (бодит системд эрхээр хаагдана) */
const CAN_SEE_PAYMENTS = ME.role === "TEACHER_PLUS";

function hashTab(tabs: TabKey[]): TabKey {
  if (typeof window === "undefined") return "att";
  const h = window.location.hash.slice(1) as TabKey;
  return tabs.includes(h) ? h : "att";
}

function Teacher({ id, role }: { id: string | null; role: string }) {
  const t = teacherById(id);
  if (!t) return null;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={t.name} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
        <p className="text-xs text-ink-dim">{role}</p>
      </div>
    </div>
  );
}

function ClassBody({ cls }: { cls: DemoClass }) {
  const detail = useMemo(() => classDetail(cls), [cls]);
  const tabs = useMemo(() => TABS.filter((t) => t.key !== "pay" || CAN_SEE_PAYMENTS), []);
  const [tab, setTab] = useState<TabKey>(() =>
    hashTab(
      tabs.map((t) => t.key),
    ),
  );
  const [view, setView] = useState<YM>(monthOfToday);
  const tabsRef = useRef<HTMLDivElement>(null);

  const select = (key: TabKey, scroll = false) => {
    setTab(key);
    try {
      window.history.replaceState(null, "", `#${key}`);
    } catch {
      /* hash хадгалж чадахгүй бол алгасна */
    }
    if (scroll) {
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      requestAnimationFrame(() => tabsRef.current?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" }));
    }
  };

  const counts: Partial<Record<TabKey, number>> = { risk: detail.risk };

  return (
    <div>
      <Link href="/demo/classes" className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-ink-dim hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Ангиуд
      </Link>

      <header className="chunky p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="cyrillic-heading text-2xl font-extrabold text-ink">{cls.label}</h1>
              <Badge tone="brand">{cls.branch}</Badge>
            </div>
            <p className="mt-1 text-sm text-ink-dim">
              <Meta items={[`${cls.students.length} сурагч`, `Танхим ${roomsOf(cls)}`]} />
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button asChild className="w-full sm:w-auto">
              <Link href={boardHref(cls.id, latestLessonDayKey(cls))}>
                <ClipboardCheck aria-hidden />
                Ирц ба даалгавар
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-2">
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            <Teacher id={cls.leadId} role="Үндсэн багш" />
            <Teacher id={cls.assistantId} role="Туслах багш" />
          </div>
          <ul className="flex flex-wrap gap-2" aria-label="Хичээлийн хуваарь">
            {slotGroups(cls).map((g) => (
              <li key={`${g.days}-${g.start}-${g.room}`} className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-2.5 py-1.5 text-sm text-ink">
                <CalendarDays className="size-4 shrink-0 text-ink-dim" aria-hidden />
                <Meta items={[`${g.days} ${g.start}–${g.end}`, g.room]} />
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi icon={RaisedHandIcon} label="Ирц" value={detail.att === null ? "—" : `${detail.att}%`} hint={`Сүүлийн ${WINDOW_DAYS} хоног`} onClick={() => select("att", true)} />
        <Kpi icon={NotebookPen} label="Даалгавар" value={detail.hw === null ? "—" : `${detail.hw}%`} hint={`Сүүлийн ${WINDOW_DAYS} хоног`} onClick={() => select("hw", true)} />
        <Kpi icon={ListChecks} label="Онлайн тест" value={detail.online === null ? "—" : `${detail.online}%`} hint="Дундаж оноо" onClick={() => select("rank", true)} />
        <Kpi
          icon={TriangleAlert}
          label="Асуудалтай"
          value={detail.risk}
          hint={`${cls.students.length} сурагчаас`}
          danger={detail.risk > 0}
          onClick={() => select("risk", true)}
        />
        {CAN_SEE_PAYMENTS && (
          <div className="col-span-2 md:col-span-1">
            <Kpi icon={Wallet} label="Төлбөр дутуу" value={detail.unpaid} hint={fmtMoney(detail.outstanding)} onClick={() => select("pay", true)} />
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => select(v as TabKey)} className="mt-5">
        <div ref={tabsRef} className="scroll-mt-20">
          <TabsList aria-label="Ангийн хэсгүүд">
            {tabs.map((t) => {
              const Icon = t.icon;
              const n = counts[t.key];
              return (
                <TabsTrigger key={t.key} value={t.key} className="group">
                  <Icon />
                  {t.label}
                  {n ? (
                    <span className="rounded-full bg-error/15 px-1.5 text-xs font-bold tabular-nums text-error group-data-[state=active]:bg-on-brand/25 group-data-[state=active]:text-on-brand">
                      {n}
                    </span>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="att" className="mt-4">
          <Panel>
            <MonthGrid cls={cls} kind="att" rows={detail.rows} view={view} onView={setView} />
          </Panel>
        </TabsContent>
        <TabsContent value="hw" className="mt-4">
          <Panel>
            <MonthGrid cls={cls} kind="hw" rows={detail.rows} view={view} onView={setView} />
          </Panel>
        </TabsContent>
        <TabsContent value="exams" className="mt-4">
          <Panel>
            <ExamsPanel cls={cls} exams={detail.exams} />
          </Panel>
        </TabsContent>
        <TabsContent value="rank" className="mt-4">
          <Panel>
            <RankingPanel rank={detail.rank} />
          </Panel>
        </TabsContent>
        <TabsContent value="risk" className="mt-4">
          <Panel>
            <RiskPanel rows={detail.rows} />
          </Panel>
        </TabsContent>
        {CAN_SEE_PAYMENTS && (
          <TabsContent value="pay" className="mt-4">
            <Panel>
              <PaymentsPanel rows={detail.rows} />
            </Panel>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/**
 * Ангийн хяналтын самбар: үзүүлэлт, сарын тор, шалгалт, эрэмбэ, асуудалтай, төлбөр.
 *
 * Бодит системтэй тулгалт (components/demo/world.ts-ийн толгойтой нийцнэ):
 * - Ирц % = Attendance (PRESENT + LATE) / тэмдэглэгдсэн; даалгавар % = DailyHomeworkMark (DONE + ½ PARTIAL);
 *   онлайн тест = Attempt.autoCorrect-ийн зөв/нийт; хугацаа = сүүлийн 30 хоног (= «асуудалтай» шалгуурын цонх)
 * - Асуудалтай = Classroom-ийн шалгуур (Багш+ тохируулна) хангаагүй сурагч
 * - Нийлбэр эрэмбэ = ирц 30% + даалгавар 30% + онлайн тест 20% + явцын шалгалт 20% (демогийн санал, тохируулж болно)
 * - Төлбөр: payments.service-ийн дутуу дүн; зөвхөн TEACHER_PLUS/админ харна (серверт эрх шалгана)
 * - Сарын тор: сурагч × хичээлийн өдөр, өдөр бүр Attendance/DailyHomeworkMark нэг мөр (upsert)
 */
export default function ClassView({ id }: { id: string }) {
  const cls = classById(id);
  if (!cls) {
    return (
      <EmptyState
        icon={School}
        title="Анги олдсонгүй"
        hint="Холбоос буруу эсвэл анги устсан байж болно"
        action={
          <Button asChild variant="outline">
            <Link href="/demo/classes">Ангиуд руу буцах</Link>
          </Button>
        }
      />
    );
  }
  return <ClassBody cls={cls} />;
}
