"use client";

import {
  BookOpen,
  CalendarCheck,
  ChevronRight,
  ClipboardCheck,
  Gauge,
  PencilLine,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  Trophy,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/kit/badge";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import { minuteLabel, PAYMENT_META, TEACHER_ROLE_LABEL, WEEKDAY_SHORT } from "./meta";
import { StatTile, WeekBars } from "./parts";
import type { QuickView } from "./StudentsTab";
import type { ClassDashboard, MonthMetric } from "./types";

/**
 * Тойм (эзэн 2026-10-13): 4 гол тоо — дарахад сарын тор нээгдэнэ; дараа нь
 * анхаарах хүүхдүүд, хөтөлбөр, багш/хуваарь, байр, төлбөр. Илүү товч, цөөн товч.
 */
export default function OverviewTab({
  data,
  onOpenStudents,
  onOpenTab,
  onOpenMonth,
}: {
  data: ClassDashboard;
  onOpenStudents: (v: QuickView) => void;
  onOpenTab: (t: string) => void;
  onOpenMonth: (m: MonthMetric) => void;
}) {
  const s = data.summary;
  const nameBy = new Map(data.students.map((x) => [x.id, `${x.lastName} ${x.firstName}`]));
  // Байр: шалгалтын дунджаар (дүнтэй сурагчид)
  const ranking = data.students
    .filter((x) => x.exam.avg !== null)
    .sort((a, b) => (b.exam.avg ?? 0) - (a.exam.avg ?? 0))
    .slice(0, 5);
  const latest = data.exams[0] ?? null;

  return (
    <div className="space-y-4">
      {/* 1. Дөрвөн гол тоо — сарын тор руу */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={CalendarCheck}
          label="Ирц"
          value={s.attendanceRate}
          suffix="%"
          hint={`Сүүлийн ${data.windowDays} хоног. Чөлөөтэйг тооцохгүй, хоцорсон нь ирсэнд орно. Багана бүр нэг долоо хоног`}
          empty="Ирц бүртгэгдээгүй"
          onOpen={() => onOpenMonth("attendance")}
          openLabel="Ирц — сараар харах"
        >
          <WeekBars weeks={data.attendanceTrend} label="Ирцийн 8 долоо хоногийн хандлага" />
        </StatTile>
        <StatTile
          icon={PencilLine}
          label="Гэрийн даалгавар"
          value={s.homeworkRate}
          suffix="%"
          hint={`Сүүлийн ${data.windowDays} хоног. Дутуу хийсэн нь хагаст тооцогдоно`}
          empty="Даалгавар тэмдэглээгүй"
          onOpen={() => onOpenMonth("homework")}
          openLabel="Даалгавар — сараар харах"
        >
          <WeekBars weeks={data.homeworkTrend} label="Даалгаврын 8 долоо хоногийн хандлага" />
        </StatTile>
        <StatTile
          icon={ClipboardCheck}
          label="Шалгалтын дундаж"
          value={s.examAvg}
          suffix="%"
          empty={s.exams ? "Дүн оруулаагүй" : "Шалгалт өгөөгүй"}
          hint="Ангид оноосон сүүлийн 20 шалгалт"
          onOpen={() => onOpenMonth("exams")}
          openLabel="Шалгалт — сараар харах"
        >
          <p className="mt-2 text-xs text-ink-dim">{s.exams} шалгалт</p>
        </StatTile>
        <StatTile
          icon={BookOpen}
          label="Бие даасан ажил"
          value={data.practice.attempts || data.practice.tests ? data.practice.attempts : null}
          empty={`Сүүлийн ${data.practiceDays} хоногт алга`}
          hint={`Шалгалтаас гадуур өөрөө бодсон бодлого ба ангид оноогоогүй тест (сүүлийн ${data.practiceDays} хоног)`}
          onOpen={() => onOpenMonth("independent")}
          openLabel="Бие даасан ажил — сараар харах"
        >
          {(data.practice.attempts > 0 || data.practice.tests > 0) && (
            <Meta
              className="mt-2 text-xs text-ink-dim"
              items={[
                `${data.practice.activeStudents} сурагч`,
                data.practice.accuracy !== null ? `${data.practice.accuracy}% зөв` : null,
                data.practice.tests ? `${data.practice.tests} тест` : null,
              ]}
            />
          )}
        </StatTile>
      </div>

      {/* 2. Дэлгэрэнгүй */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Panel icon={Users} title="Сурагчдын төлөв">
          <ul className="-my-1 divide-y divide-line">
            <StatusRow
              icon={ShieldAlert}
              label="Анхаарах хүүхэд"
              hint="Ирц, даалгавар, дүн сул, буурч буй эсвэл анхаарах шошготой"
              value={s.riskCount}
              tone={s.riskCount ? "text-error" : undefined}
              onClick={() => onOpenStudents("risk")}
            />
            <StatusRow
              icon={TrendingUp}
              label="Сайжирсан"
              hint="«Сайжирсан» шошготой эсвэл чадамж 4 долоо хоногт 8+ өссөн"
              value={s.improvedCount}
              onClick={() => onOpenStudents("improved")}
            />
            <StatusRow
              icon={RotateCcw}
              label="Нөхөх хичээлтэй"
              hint={`Сүүлийн ${data.makeupDays} хоногт батлагдсан хичээлээс тасалсан. Нөхсөнийг бүртгэх хэсэг хараахан байхгүй`}
              value={data.syllabus.confirmedLessons ? s.makeupStudents : null}
              onClick={() => onOpenStudents("makeup")}
            />
            <StatusRow
              icon={Gauge}
              label="Чадамжийн дундаж"
              hint={`Шалгалт 50%, бие даасан бодлого 20%, даалгавар 15%, ирц 15%. «Буудсан» хариулт торгуультай. ${s.competencyCovered}/${s.students} сурагч тооцогдсон`}
              value={s.competencyAvg}
              badge={<Badge tone="neutral">v0</Badge>}
              onClick={() => onOpenStudents("all")}
            />
          </ul>
        </Panel>

        <Panel icon={BookOpen} title="Хөтөлбөрийн явц" action={<LinkButton onClick={() => onOpenTab("topics")}>Сэдэв</LinkButton>}>
          {data.syllabus.current ? (
            <div>
              <p className="font-semibold text-ink">{data.syllabus.current.title}</p>
              <Meta className="text-sm text-ink-dim" items={[data.syllabus.current.book, data.syllabus.current.topic]} />
              {data.syllabus.current.position && data.syllabus.current.total && (
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-brand-bright"
                      style={{ width: `${(data.syllabus.current.position / data.syllabus.current.total) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-ink-dim">
                    Бүлэг {data.syllabus.current.position} / {data.syllabus.current.total}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-dim">Одоогийн бүлэг тодорхойгүй — хичээлийн сэдэвт бүлэг сонгох эсвэл шалгалт оноох үед гарна</p>
          )}
          {data.syllabus.recentLessons.length > 0 && (
            <ul className="mt-2 divide-y divide-line">
              {data.syllabus.recentLessons.slice(0, 3).map((l) => (
                <li key={l.id} className="flex items-center gap-2 py-1.5 text-sm">
                  <span className="w-20 shrink-0 tabular-nums text-ink-dim">{formatMnDate(l.date)}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{l.topic || "Сэдэв бичээгүй"}</span>
                  <span className="shrink-0 text-xs tabular-nums text-ink-dim">
                    {l.present}/{l.enrolled}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel icon={UserRound} title="Багш нар, хуваарь">
          {data.teachers.length ? (
            <ul className="space-y-1.5">
              {data.teachers.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-ink">{t.name}</span>
                  <Meta className="text-xs text-ink-dim" items={t.roles.map((r) => TEACHER_ROLE_LABEL[r] ?? r)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-dim">Багш оноогоогүй байна</p>
          )}
          {data.schedule.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Долоо хоногийн хуваарь">
              {data.schedule.map((sl, i) => (
                <li key={i} className="rounded-lg border border-line px-2 py-1 text-xs text-ink">
                  <span className="font-semibold">{WEEKDAY_SHORT[sl.weekday]}</span>{" "}
                  <span className="tabular-nums">
                    {minuteLabel(sl.startMinute)}–{minuteLabel(sl.endMinute)}
                  </span>
                  {sl.room && <span className="text-ink-dim"> {sl.room}</span>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          icon={Trophy}
          title="Шалгалтын байр"
          hint="Ангид оноосон шалгалтуудын дунджаар"
          action={data.exams.length > 0 ? <LinkButton onClick={() => onOpenMonth("exams")}>Шалгалт</LinkButton> : undefined}
        >
          {ranking.length ? (
            <ol className="space-y-1">
              {ranking.map((x, i) => (
                <li key={x.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-right font-semibold tabular-nums text-ink-dim">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-ink">{nameBy.get(x.id)}</span>
                  <span className="font-semibold tabular-nums text-ink">{x.exam.avg}%</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-ink-dim">
              {data.exams.length ? "Шалгалтын дүн хараахан оруулаагүй" : "Энэ ангид шалгалт оноогоогүй байна"}
            </p>
          )}
          {latest && (
            <p className="mt-3 text-xs text-ink-dim">
              Сүүлийн шалгалт: {latest.title}
              {latest.avg !== null ? ` — дундаж ${latest.avg}%` : ""}
            </p>
          )}
        </Panel>

        {data.payment && (
          <Panel icon={Wallet} title="Энэ сарын төлбөр" hint="Баталгаажсан төлбөрөөр. Бүртгэлгүй = энэ сард төлбөр бүртгэгдээгүй (импорт хийгдээгүй байж болно)">
            <PaymentBlock p={data.payment} onOpen={() => onOpenStudents("unpaid")} />
          </Panel>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  hint,
  value,
  tone,
  badge,
  onClick,
}: {
  icon: typeof Wallet;
  label: string;
  hint: string;
  value: number | null;
  tone?: string;
  badge?: ReactNode;
  onClick: () => void;
}) {
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg text-left text-sm hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand"
      >
        <Icon className={cn("h-4 w-4 shrink-0", tone ?? "text-brand-soft")} aria-hidden />
        <span className="min-w-0 flex-1 truncate text-ink">{label}</span>
        {badge}
        <span className={cn("font-display text-lg font-bold tabular-nums", tone ?? "text-ink")}>{value ?? "—"}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-ink-dim" aria-hidden />
      </button>
      <InfoHint>{hint}</InfoHint>
    </li>
  );
}

function PaymentBlock({ p, onOpen }: { p: NonNullable<ClassDashboard["payment"]>; onOpen: () => void }) {
  const total = p.PAID + p.PARTIAL + p.PENDING + p.NONE;
  const parts = (["PAID", "PARTIAL", "PENDING", "NONE"] as const).map((k) => ({ k, n: p[k] }));
  return (
    <div>
      <div className="flex h-2 overflow-hidden rounded-full bg-ink/10" aria-hidden>
        <span className="bg-success" style={{ width: `${total ? (p.PAID / total) * 100 : 0}%` }} />
        <span className="bg-error" style={{ width: `${total ? (p.PARTIAL / total) * 100 : 0}%` }} />
        <span className="bg-info" style={{ width: `${total ? (p.PENDING / total) * 100 : 0}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {parts.map(({ k, n }) => (
          <div key={k} className="min-w-0">
            <dt className="flex items-center gap-1 text-xs text-ink-dim">
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  k === "PAID" ? "bg-success" : k === "PARTIAL" ? "bg-error" : k === "PENDING" ? "bg-info" : "bg-ink/20",
                )}
                aria-hidden
              />
              {PAYMENT_META[k].label}
            </dt>
            <dd className="font-display text-xl font-bold tabular-nums text-ink">{n}</dd>
          </div>
        ))}
      </dl>
      {p.NONE + p.PARTIAL > 0 && (
        <LinkButton onClick={onOpen} className="mt-2">
          Төлөөгүй сурагчдыг харах
        </LinkButton>
      )}
    </div>
  );
}

export function Panel({
  icon: Icon,
  title,
  hint,
  action,
  children,
}: {
  icon: typeof Wallet;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-surface p-4" aria-label={title}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-brand-soft" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate font-bold text-ink">{title}</h2>
        {hint && <InfoHint>{hint}</InfoHint>}
        {action}
      </div>
      {children}
    </section>
  );
}

export function LinkButton({ onClick, children, className }: { onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand", className)}
    >
      {children}
    </button>
  );
}
