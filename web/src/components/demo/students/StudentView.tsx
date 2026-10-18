"use client";

import {
  ArrowLeft,
  CircleCheck,
  FileCheck,
  ListChecks,
  NotebookPen,
  Phone,
  StickyNote,
  Trophy,
  TriangleAlert,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Dot } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { Button } from "@/components/ui/kit/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/kit/tabs";
import { Avatar, FlagBadges, Kpi, PayBadge, Panel, monthOfToday, type YM } from "../classes/common";
import { dotDate, seenLabel } from "../classes/format";
import { classDetail, studentStat, onlineRows, windowRange } from "../classes/stats";
import { RaisedHandIcon } from "../shell/status";
import { ME, TUITION_PLAN_LABEL, fmtPhone, focusOf, studentById, type DemoStudent } from "../world";
import AttendanceTab from "./AttendanceTab";
import ExamsTab from "./ExamsTab";
import HomeworkTab from "./HomeworkTab";
import NotesTab from "./NotesTab";
import PaymentTab from "./PaymentTab";

type TabKey = "att" | "hw" | "exams" | "pay" | "notes";

const TABS: Array<{ key: TabKey; label: string; icon: LucideIcon | ComponentType<{ className?: string }> }> = [
  { key: "att", label: "Ирц", icon: RaisedHandIcon },
  { key: "hw", label: "Даалгавар", icon: NotebookPen },
  { key: "exams", label: "Шалгалт", icon: FileCheck },
  { key: "pay", label: "Төлбөр", icon: Wallet },
  { key: "notes", label: "Тэмдэглэл", icon: StickyNote },
];

/** Төлбөрийг зөвхөн Багш+ харна (бодит системд эрхээр хаагдана) */
const CAN_SEE_PAYMENTS = ME.role === "TEACHER_PLUS";

function readHash(keys: TabKey[]): TabKey {
  if (typeof window === "undefined") return "att";
  const h = window.location.hash.slice(1) as TabKey;
  return keys.includes(h) ? h : "att";
}

function Contact({ label, phone }: { label: string; phone: string | null }) {
  const inner = (
    <>
      <span className="flex items-center gap-1.5 text-xs text-ink-dim">
        <Phone className={phone ? "size-3.5 shrink-0 text-brand" : "size-3.5 shrink-0 opacity-50"} aria-hidden />
        {label}
      </span>
      <span className={phone ? "text-sm font-semibold tabular-nums text-ink" : "text-sm text-ink-dim"}>{phone ? fmtPhone(phone) : "Бүртгээгүй"}</span>
    </>
  );
  if (!phone) {
    return <div className="flex min-h-14 flex-col justify-center gap-0.5 rounded-xl border border-dashed border-line px-2.5 py-2 sm:px-3">{inner}</div>;
  }
  return (
    <a
      href={`tel:${phone}`}
      aria-label={`${label}, залгах ${fmtPhone(phone)}`}
      className="flex min-h-14 flex-col justify-center gap-0.5 rounded-xl border border-line px-2.5 py-2 outline-none transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-brand-bright/60 sm:px-3"
    >
      {inner}
    </a>
  );
}

function Fact({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={className ? `min-w-0 ${className}` : "min-w-0"}>
      <dt className="text-xs text-ink-dim">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{children}</dd>
      {hint && <dd className="text-xs text-ink-dim">{hint}</dd>}
    </div>
  );
}

function StudentBody({ student }: { student: DemoStudent }) {
  const stat = useMemo(() => studentStat(student), [student]);
  const { cls, flags, pay } = stat;
  const detail = useMemo(() => classDetail(cls), [cls]);
  const rank = detail.rank.find((r) => r.stat.student.id === student.id);
  const online = useMemo(() => {
    const { from, to } = windowRange();
    const rows = onlineRows(cls, student, from, to);
    return rows.length ? Math.round(rows.reduce((s, r) => s + r.pct, 0) / rows.length) : null;
  }, [cls, student]);
  const focus = focusOf(student);

  const tabs = useMemo(() => TABS.filter((t) => t.key !== "pay" || CAN_SEE_PAYMENTS), []);
  const [tab, setTab] = useState<TabKey>(() => readHash(tabs.map((t) => t.key)));
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

  const fullName = `${student.lastName} ${student.firstName}`;

  return (
    <div>
      <Link href="/demo/students" className="-ml-1 mb-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-semibold text-ink-dim hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        Сурагчид
      </Link>

      <header className="chunky p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Avatar name={student.name} className="size-12 text-base" />
          <div className="min-w-0 flex-1">
            <h1 className="cyrillic-heading text-xl font-extrabold text-ink sm:text-2xl">{fullName}</h1>
            <p className="mt-0.5 flex flex-wrap items-center text-sm text-ink-dim">
              <span className="tabular-nums">Код {student.code}</span>
              <Dot />
              <Link
                href={`/demo/classes/${cls.id}`}
                prefetch={false}
                className="-mx-2 -my-3 inline-block px-2 py-3 font-semibold text-ink underline decoration-ink-dim/40 decoration-dotted underline-offset-4 hover:text-brand-soft"
              >
                {cls.label} ({cls.branch})
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2">
          {flags.length > 0 ? (
            <div className="min-w-0 flex-1 rounded-xl border border-error/30 bg-error/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-error">
                <TriangleAlert className="size-4" aria-hidden />
                Шалгуур хангаагүй
              </p>
              <FlagBadges flags={flags} />
            </div>
          ) : (
            <p className="inline-flex min-h-7 items-center gap-1.5 text-sm font-medium text-success">
              <CircleCheck className="size-4" aria-hidden />
              Шалгуурыг хангасан
            </p>
          )}
          {CAN_SEE_PAYMENTS && <PayBadge status={pay.status} className="shrink-0" />}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Contact label="Сурагч" phone={student.phone} />
          <Contact label="Аав" phone={student.fatherPhone} />
          <Contact label="Ээж" phone={student.motherPhone} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
          <Fact label="Сургууль">{student.school}</Fact>
          <Fact label="Сургуулийн анги">{student.grade}-р анги</Fact>
          <Fact label="Сурч эхэлсэн">
            <span className="tabular-nums">{dotDate(student.joinedOn)}</span>
          </Fact>
          <Fact label="Бүртгүүлсэн">
            <span className="tabular-nums">{dotDate(student.registeredOn)}</span>
          </Fact>
          <Fact label="Сүүлд орсон">
            <span title={student.lastSeenAt ?? undefined}>{seenLabel(student.lastSeenAt)}</span>
          </Fact>
          {CAN_SEE_PAYMENTS && <Fact label="Төлбөрийн хэлбэр">{TUITION_PLAN_LABEL[student.tuitionPlan]}</Fact>}
          <Fact label="Бодож байхдаа сайтаас гарсан" hint={`Тест ${focus.testSessions} удаа бодсон`} className="col-span-2">
            <span className="tabular-nums">
              Тест {focus.testLeaves} удаа, дасгал {focus.practiceLeaves} удаа
            </span>
          </Fact>
        </dl>
      </header>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={RaisedHandIcon} label="Ирц" value={stat.att === null ? "—" : `${stat.att}%`} hint="Сүүлийн 30 хоног" onClick={() => select("att", true)} />
        <Kpi icon={NotebookPen} label="Даалгавар" value={stat.hw === null ? "—" : `${stat.hw}%`} hint="Сүүлийн 30 хоног" onClick={() => select("hw", true)} />
        <Kpi icon={ListChecks} label="Онлайн тест" value={online === null ? "—" : `${online}%`} hint="Дундаж оноо" onClick={() => select("hw", true)} />
        <Kpi icon={Trophy} label="Ангийн эрэмбэ" value={rank ? `${rank.rank}/${cls.students.length}` : "—"} hint={rank?.total != null ? `Нийлбэр ${rank.total}%` : undefined} />
      </div>

      <Tabs value={tab} onValueChange={(v) => select(v as TabKey)} className="mt-5">
        <div ref={tabsRef} className="scroll-mt-20">
          <TabsList aria-label="Сурагчийн хэсгүүд">
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger key={t.key} value={t.key}>
                  <Icon />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="att" className="mt-4">
          <Panel>
            <AttendanceTab cls={cls} student={student} view={view} onView={setView} />
          </Panel>
        </TabsContent>
        <TabsContent value="hw" className="mt-4">
          <Panel>
            <HomeworkTab cls={cls} student={student} />
          </Panel>
        </TabsContent>
        <TabsContent value="exams" className="mt-4">
          <Panel>
            <ExamsTab cls={cls} student={student} />
          </Panel>
        </TabsContent>
        {CAN_SEE_PAYMENTS && (
          <TabsContent value="pay" className="mt-4">
            <Panel>
              <PaymentTab student={student} pay={pay} />
            </Panel>
          </TabsContent>
        )}
        <TabsContent value="notes" className="mt-4">
          <Panel>
            <NotesTab stat={stat} />
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Сурагчийн бүтэн хуудас: холбоо барих, үндсэн мэдээлэл, ирц, даалгавар, шалгалт, төлбөр, тэмдэглэл.
 * Бодит: GET /users/:id (профайл, холбоо барих), studentFocus (сайтаас гарсан тоо), Attendance ба
 * DailyHomeworkMark (сарын ирц, даалгаврын түүх), Attempt (онлайн тест), notes.service (тэмдэглэл),
 * payments.service (төлбөр — зөвхөн Багш+).
 */
export default function StudentView({ id }: { id: string }) {
  const student = studentById(id);
  if (!student) {
    return (
      <EmptyState
        icon={Users}
        title="Сурагч олдсонгүй"
        hint="Холбоос буруу эсвэл сурагч хасагдсан байж болно"
        action={
          <Button asChild variant="outline">
            <Link href="/demo/students">Сурагчид руу буцах</Link>
          </Button>
        }
      />
    );
  }
  return <StudentBody student={student} />;
}
