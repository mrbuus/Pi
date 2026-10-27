"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CalendarDays, ClipboardCheck, LayoutDashboard, ListChecks, MoreHorizontal, Pencil, Settings2, Trash2, UserPlus, Users } from "lucide-react";
import MakeupPanel from "@/components/makeup/MakeupPanel";
import RequireRole from "@/components/nav/RequireRole";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { Meta } from "@/components/ui/Meta";
import { SkeletonCard, SkeletonRows } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import ClassChecksPanel from "./ClassChecksPanel";
import DisbandClassDialog from "./DisbandClassDialog";
import MonthView, { METRICS } from "./MonthView";
import OverviewTab from "./OverviewTab";
import StudentsTab, { type QuickView } from "./StudentsTab";
import TeacherPicker from "./TeacherPicker";
import TopicsTab from "./TopicsTab";
import type { ClassDashboard, MonthMetric, PersonRef } from "./types";

type TabKey = "overview" | "month" | "students" | "makeup" | "topics";
/** «Чек» нь табын жагсаалтад БИШ — толгойн товчоор нээгдэх тусдаа горим (#checks) */
type ViewKey = TabKey | "checks";
const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "overview", label: "Тойм", icon: LayoutDashboard },
  { key: "month", label: "Сарын явц", icon: CalendarDays },
  { key: "students", label: "Сурагчид", icon: Users },
  { key: "makeup", label: "Нөхөх", icon: ListChecks },
  { key: "topics", label: "Сэдэв, хөтөлбөр", icon: BookOpen },
];

/** Нөхөх хичээлийн цонх: сүүлийн 60 хоног (Улаанбаатарын цагаар) */
function makeupRange(): { from: string; to: string } {
  const ub = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar" }).format(d);
  const now = new Date();
  return { from: ub(new Date(now.getTime() - 60 * 86_400_000)), to: ub(now) };
}

/** Хэш: #overview, #students, #topics, #checks эсвэл сарын хэмжүүр (#attendance, #homework, #exams, #independent) */
function readHash(): { tab: ViewKey; metric: MonthMetric | null } {
  if (typeof window === "undefined") return { tab: "overview", metric: null };
  const h = window.location.hash.replace("#", "");
  if (h === "checks") return { tab: "checks", metric: null };
  if (METRICS.some((m) => m.value === h)) return { tab: "month", metric: h as MonthMetric };
  if (h === "month") return { tab: "month", metric: null };
  return { tab: TABS.some((t) => t.key === h) ? (h as TabKey) : "overview", metric: null };
}

function writeHash(h: string) {
  try {
    window.history.replaceState(null, "", `#${h}`);
  } catch {
    /* hash солих боломжгүй орчинд зүгээр л алгасна */
  }
}

/**
 * Нэг ангийн самбар (эзэн 2026-10-13): цөөн том тоо → сарын тор (ирц,
 * даалгавар, шалгалт, бие даасан) → сурагчид → сэдэв. Ангийн багш + туслах
 * багшийг толгойноос шууд солино (Багш+/Админ).
 */
export default function ClassDashboardClient({ classroomId }: { classroomId: string }) {
  const [data, setData] = useState<ClassDashboard | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ViewKey>("overview");
  const [lastTab, setLastTab] = useState<TabKey>("overview");
  const [checkCount, setCheckCount] = useState<number | null>(null);
  const [metric, setMetric] = useState<MonthMetric>("attendance");
  const [view, setView] = useState<QuickView | null>(null);
  const [picking, setPicking] = useState(false);
  const [disbanding, setDisbanding] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await api<ClassDashboard>(`/class-dashboard/classes/${encodeURIComponent(classroomId)}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ангийн самбарыг ачаалж чадсангүй");
    }
  }, [classroomId]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const h = readHash();
      setTab(h.tab);
      if (h.metric) setMetric(h.metric);
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  // Хуудсан доторх #exams гэх мэт холбоос (ижил баримт бичигт hash л солигдоно)
  useEffect(() => {
    const onHash = () => {
      const h = readHash();
      setTab(h.tab);
      if (h.metric) setMetric(h.metric);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function changeTab(next: string) {
    setTab(next as ViewKey);
    if (next !== "checks") setLastTab(next as TabKey);
    writeHash(next === "month" ? metric : next);
  }

  function toggleChecks() {
    changeTab(tab === "checks" ? lastTab : "checks");
  }

  function changeMetric(m: MonthMetric) {
    setMetric(m);
    setTab("month");
    writeHash(m);
  }

  function openStudents(v: QuickView) {
    setView(v);
    changeTab("students");
  }

  return (
    <RequireRole allow={["ADMIN", "TEACHER_PLUS", "TEACHER"]}>
      <div className="min-w-0 space-y-5">
        <Link
          href="/app/classes"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Ангиуд
        </Link>

        {error && !data && <ErrorState message={error} onRetry={() => void load()} />}
        {!data && !error && <DashboardSkeleton />}

        {data && (
          <>
            <header
              className="class-row flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5"
              style={{ "--cls": getClassroomColor(data.classroom.id) } as React.CSSProperties}
            >
              <div className="min-w-0 flex-1">
                <h1 className="break-words text-2xl font-extrabold tracking-tight text-ink">{data.classroom.name}</h1>
                <Meta
                  className="mt-1 text-sm text-ink-dim"
                  items={[data.classroom.type === "ONLINE" ? "Онлайн" : "Танхим", `${data.summary.students} сурагч`]}
                />
                <ClassTeachers
                  lead={data.classroom.classTeacher}
                  assistant={data.classroom.assistantTeacher}
                  canEdit={!!data.permissions.manageClass}
                  onEdit={() => setPicking(true)}
                />
              </div>
              {/* Утсан дээр: [бүртгэл][⋯] дээр, «Чек» доор — гарчиг шахагдахгүй. sm-ээс нэг мөрөнд «Чек» эхэнд */}
              <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row-reverse sm:items-center sm:gap-1">
                {data.permissions.manageClass && (
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/app/admin/classrooms/${encodeURIComponent(data.classroom.id)}`}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                      aria-label="Ангийн бүртгэл удирдах"
                      title="Ангийн бүртгэл удирдах"
                    >
                      <Settings2 className="h-5 w-5" aria-hidden />
                    </Link>
                    {/* Анги тараах — зориуд нууцалсан (аюулын бүс) */}
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button
                          type="button"
                          aria-label="Ангийн нэмэлт үйлдэл"
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-dim hover:bg-panel hover:text-ink focus-visible:outline-2 focus-visible:outline-brand"
                        >
                          <MoreHorizontal className="h-5 w-5" aria-hidden />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" sideOffset={4} className="elev-2 z-[65] w-52 rounded-xl border border-line bg-surface p-1">
                          <DropdownMenu.Item
                            onSelect={() => setDisbanding(true)}
                            className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-error outline-none data-[highlighted]:bg-error/10"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden /> Анги тараах
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleChecks}
                  aria-pressed={tab === "checks"}
                  aria-label={`Чек${(checkCount ?? data.openChecks ?? 0) > 0 ? ` — нээлттэй ${checkCount ?? data.openChecks}` : ""}`}
                  className={cn(
                    "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand",
                    tab === "checks"
                      ? "border-transparent bg-brand-bright text-on-brand"
                      : "border-line text-ink-dim hover:bg-panel hover:text-ink",
                  )}
                >
                  <ClipboardCheck className="h-5 w-5" aria-hidden />
                  Чек
                  {(checkCount ?? data.openChecks ?? 0) > 0 && (
                    <span
                      aria-hidden
                      className={cn(
                        "rounded-full px-1.5 text-xs tabular-nums",
                        tab === "checks" ? "bg-on-brand/20" : "bg-brand-bright/12 text-brand",
                      )}
                    >
                      {checkCount ?? data.openChecks}
                    </span>
                  )}
                </button>
              </div>
            </header>
            {error && <ErrorState message={error} onRetry={() => void load()} />}

            {tab === "checks" ? (
              <ClassChecksPanel
                classroomId={data.classroom.id}
                onClose={() => changeTab(lastTab)}
                onOpenCountChange={setCheckCount}
              />
            ) : (
              <Tabs value={tab} onValueChange={changeTab}>
                <TabsList aria-label="Ангийн самбарын хэсгүүд">
                  {TABS.map(({ key, label, icon: Icon }) => (
                    <TabsTrigger key={key} value={key}>
                      <Icon aria-hidden />
                      {label}
                      {key === "students" && data.summary.riskCount > 0 && (
                        <span className="rounded-full bg-error/15 px-1.5 text-xs tabular-nums text-error">{data.summary.riskCount}</span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="overview" className="mt-4">
                  <OverviewTab data={data} onOpenStudents={openStudents} onOpenTab={changeTab} onOpenMonth={changeMetric} />
                </TabsContent>
                <TabsContent value="month" className="mt-4">
                  <MonthView classroomId={data.classroom.id} metric={metric} onMetric={changeMetric} />
                </TabsContent>
                <TabsContent value="students" className="mt-4">
                  <StudentsTab data={data} view={view} onViewChange={setView} onChanged={() => void load()} />
                </TabsContent>
                <TabsContent value="makeup" className="mt-4">
                  <MakeupPanel classroomId={data.classroom.id} {...makeupRange()} />
                </TabsContent>
                <TabsContent value="topics" className="mt-4">
                  <TopicsTab data={data} onChanged={() => void load()} />
                </TabsContent>
              </Tabs>
            )}

            {disbanding && (
              <DisbandClassDialog
                classroom={data.classroom}
                students={data.summary.students}
                onClose={() => setDisbanding(false)}
                onDone={() => router.push("/app/classes")}
              />
            )}
            {picking && (
              <TeacherPicker
                classroom={data.classroom}
                onClose={() => setPicking(false)}
                onSaved={() => void load()}
              />
            )}
          </>
        )}
      </div>
    </RequireRole>
  );
}

/** Ангийн багш ба туслах — Багш+/Админ нэр дээр дарж солино. */
export function ClassTeachers({
  lead,
  assistant,
  canEdit,
  onEdit,
}: {
  lead: PersonRef | null;
  assistant: PersonRef | null;
  canEdit: boolean;
  onEdit: () => void;
}) {
  if (!lead && !assistant)
    return canEdit ? (
      <div className="mt-1">
        <button
          type="button"
          onClick={onEdit}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-brand hover:bg-brand-bright/8 focus-visible:outline-2 focus-visible:outline-brand"
        >
          <UserPlus className="h-4 w-4" aria-hidden /> Ангийн багш оноох
        </button>
      </div>
    ) : (
      <p className="mt-1.5 text-sm text-ink-dim">Ангийн багш оноогоогүй</p>
    );
  const items = [
    { role: "Ангийн багш", p: lead },
    { role: "Туслах", p: assistant },
  ];
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
      {items.map(({ role, p }) =>
        canEdit ? (
          <button
            key={role}
            type="button"
            onClick={onEdit}
            className="group inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 -mx-0.5 text-left hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
            aria-label={`${role}: ${p ? p.name : "оноогоогүй"} — солих`}
          >
            <span className="text-ink-dim">{role}</span>
            <span className={p ? "font-semibold text-ink" : "font-semibold text-brand"}>{p ? p.name : "Оноох"}</span>
            <Pencil className="h-3.5 w-3.5 text-ink-dim opacity-60 group-hover:opacity-100" aria-hidden />
          </button>
        ) : p ? (
          <span key={role} className="inline-flex items-center gap-1.5 px-0.5 py-1">
            <span className="text-ink-dim">{role}</span>
            <span className="font-semibold text-ink">{p.name}</span>
          </span>
        ) : null,
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Ангийн самбар ачаалж байна">
      <SkeletonCard />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <SkeletonRows rows={6} />
    </div>
  );
}
