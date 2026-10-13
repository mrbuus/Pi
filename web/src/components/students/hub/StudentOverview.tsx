"use client";

import {
  ArrowRightLeft,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  LogOut,
  MonitorSmartphone,
  Phone,
  School,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/kit/badge";
import { Button } from "@/components/ui/kit/button";
import { Meta, MetaTitle } from "@/components/ui/Meta";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { formatMnDate } from "@/lib/dateMn";
import { relativeTimeMn } from "@/lib/relativeTimeMn";
import {
  TUITION_PLAN_LABEL,
  fullName,
  money,
  type StudentDetailData,
  type StudentFocus,
  type StudentPaymentHistory,
} from "../types";
import StudentCompetencyCards from "@/components/classes/StudentCompetencyCards";
import { studyDurationLabel } from "./studyDuration";

/** GET /exams/classes/:classId/students/:id — зөвхөн хураангуйд хэрэгтэй талбарууд */
export interface ClassSummary {
  windowDays: number;
  exams: { testId: string; title: string; assignedAt: string; status: "DONE" | "ABSENT" | "PENDING"; percent: number | null }[];
  attendance: { present: number; late: number; absent: number; excused: number; rate: number | null };
}

type Loadable<T> = { status: "loading" | "ready" | "error"; data: T | null | undefined };

/**
 * Сурагчийн «хувийн хэрэг» — хуудасны дээд хэсэг. Утсан дээр нэг багана,
 * том дэлгэцэнд 2–3 багана. Мөнгөний мэдээлэл зөвхөн `canSeeMoney` үед.
 */
export default function StudentOverview({
  detail,
  canMove,
  onMove,
  canSeeMoney,
  payments,
  summary,
}: {
  detail: StudentDetailData;
  canMove: boolean;
  onMove: () => void;
  canSeeMoney: boolean;
  payments: Loadable<StudentPaymentHistory>;
  summary: Loadable<ClassSummary>;
}) {
  const p = detail.studentProfile;
  const classroom = detail.currentClassroom;
  const started = p?.joinedOn ?? null;
  const duration = started ? studyDurationLabel(started, p?.leftOn ?? new Date()) : null;
  const phones = [
    { label: "Аав", value: p?.fatherPhone },
    { label: "Ээж", value: p?.motherPhone },
  ].filter((x): x is { label: string; value: string } => !!x.value);

  const latestExam = summary.data?.exams.find((e) => e.status === "DONE" && e.percent !== null) ?? null;

  return (
    <section className="chunky p-4 md:p-6" aria-label="Сурагчийн хувийн хэрэг">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-ink md:text-2xl">{fullName(detail)}</h1>
          <Meta
            className="mt-1 text-sm text-ink-dim"
            items={[
              classroom?.name ?? <span key="nc">Ангигүй</span>,
              detail.studentCode && (
                <span key="code" className="font-mono text-xs">
                  {detail.studentCode}
                </span>
              ),
              p?.leftOn && (
                <Badge key="left" tone="warning">
                  Гарсан
                </Badge>
              ),
            ]}
          />
        </div>
        {canMove && (
          <Button size="sm" variant="outline" type="button" onClick={onMove} className="min-h-11">
            <ArrowRightLeft aria-hidden /> Анги солих
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        <Fact icon={School} label="Сургууль">
          <p className="font-semibold text-ink">{p?.school || "—"}</p>
          <Meta
            className="text-xs text-ink-dim"
            items={[p?.grade ? `${p.grade}-р анги` : null, p?.branch, p?.section && `Секц ${p.section}`]}
          />
        </Fact>

        <Fact icon={CalendarDays} label="Суралцаж буй">
          <p className="font-semibold text-ink">{duration ?? "—"}</p>
          <Meta
            className="text-xs text-ink-dim"
            items={[
              started ? `${formatMnDate(started)}-нээс` : "Эхэлсэн огноо оруулаагүй",
              p?.leftOn && `${formatMnDate(p.leftOn)} гарсан`,
              detail.createdAt && `Бүртгэсэн ${formatMnDate(detail.createdAt)}`,
            ]}
          />
        </Fact>

        {canSeeMoney && (
          <Fact icon={Wallet} label="Төлбөр">
            {payments.status === "loading" ? (
              <FactSkeleton />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">
                    {p?.tuitionPlan ? TUITION_PLAN_LABEL[p.tuitionPlan] : "Багц тодорхойгүй"}
                  </p>
                  <OutstandingBadge payments={payments.data ?? null} failed={payments.status === "error"} />
                </div>
                <Meta
                  className="text-xs text-ink-dim"
                  items={[
                    p?.tuitionAmount != null && money(p.tuitionAmount),
                    payments.data && payments.data.summary.totalPaid > 0 && `${money(payments.data.summary.totalPaid)} төлсөн`,
                    payments.data && payments.data.summary.outstanding > 0 && `${money(payments.data.summary.outstanding)} үлдсэн`,
                  ]}
                />
              </>
            )}
          </Fact>
        )}

        <Fact icon={CalendarCheck} label="Ирц">
          {!classroom ? (
            <p className="font-semibold text-ink-dim">—</p>
          ) : summary.status === "loading" ? (
            <FactSkeleton />
          ) : summary.data && summary.data.attendance.rate !== null ? (
            <>
              <p className="font-semibold text-ink">
                {summary.data.attendance.rate}%
                <span className="ml-1 text-xs font-normal text-ink-dim">сүүлийн {summary.data.windowDays} хоног</span>
              </p>
              <Meta
                className="text-xs text-ink-dim"
                items={[
                  summary.data.attendance.absent > 0 && `${summary.data.attendance.absent} тасалсан`,
                  summary.data.attendance.late > 0 && `${summary.data.attendance.late} хоцорсон`,
                ]}
              />
            </>
          ) : (
            <p className="text-sm text-ink-dim">Ирц бүртгэгдээгүй</p>
          )}
        </Fact>

        <Fact icon={ClipboardList} label="Сүүлийн шалгалт">
          {!classroom ? (
            <p className="font-semibold text-ink-dim">—</p>
          ) : summary.status === "loading" ? (
            <FactSkeleton />
          ) : latestExam ? (
            <>
              <p className="font-display text-xl font-bold tabular-nums text-ink">{latestExam.percent}%</p>
              <p className="truncate text-xs text-ink-dim">
                <MetaTitle>{latestExam.title}</MetaTitle>
              </p>
            </>
          ) : (
            <p className="text-sm text-ink-dim">Шалгалт өгөөгүй</p>
          )}
        </Fact>

        <Fact icon={MonitorSmartphone} label="Сайтад сүүлд орсон">
          <p className="font-semibold text-ink">
            {detail.lastSeenAt ? relativeTimeMn(detail.lastSeenAt) : "Ороогүй"}
          </p>
          {!detail.lastSeenAt && <p className="text-xs text-ink-dim">Бүртгүүлснээс хойш нэвтрээгүй</p>}
        </Fact>

        {detail.focus && <FocusFact focus={detail.focus} />}

        {phones.length > 0 && (
          <Fact icon={Phone} label="Эцэг эх" wide>
            <div className="grid grid-cols-2 gap-2">
              {phones.map((ph) => (
                <a
                  key={ph.label}
                  href={`tel:${ph.value}`}
                  aria-label={`${ph.label} руу залгах: ${ph.value}`}
                  className="flex min-h-11 min-w-0 flex-col justify-center rounded-xl border border-line px-2.5 py-1 transition hover:border-brand"
                >
                  <span className="text-[11px] leading-tight text-ink-dim">{ph.label}</span>
                  <span className="truncate text-sm font-semibold tabular-nums text-brand">{ph.value}</span>
                </a>
              ))}
            </div>
          </Fact>
        )}
      </div>

      <div className="mt-3">
        <StudentCompetencyCards studentId={detail.id} />
      </div>
    </section>
  );
}

/** Бодлого, шалгалт бодож байхдаа сайтаас гарсан тоо (таб солих, цонх орхих) */
function FocusFact({ focus }: { focus: StudentFocus }) {
  const { tests, practice } = focus;
  return (
    <Fact icon={LogOut} label="Бодож байхдаа гарсан">
      <p className={`font-semibold tabular-nums ${tests.leaves > 0 ? "text-error" : "text-ink"}`}>
        {tests.sessions > 0 ? `Шалгалтад ${tests.leaves} удаа` : "Онлайн шалгалт өгөөгүй"}
      </p>
      <Meta
        className="text-xs text-ink-dim"
        items={[
          tests.sessions > 0 && `${tests.sessionsWithLeaves}/${tests.sessions} шалгалтад`,
          practice.problems > 0 && `Бие даан бодохдоо ${practice.leaves} удаа (${practice.days} хоног)`,
        ]}
      />
      {tests.recent.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-ink-dim">
          {tests.recent.slice(0, 3).map((t) => (
            <li key={t.testId} className="flex min-w-0 items-baseline gap-1.5">
              <span className="min-w-0 truncate">
                <MetaTitle>{t.title}</MetaTitle>
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-error">{t.leaveCount} удаа</span>
            </li>
          ))}
        </ul>
      )}
    </Fact>
  );
}

function Fact({
  icon: Icon,
  label,
  wide = false,
  children,
}: {
  icon: LucideIcon;
  label: string;
  /** Утсан дээр бүтэн мөр эзэлнэ */
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`min-w-0 rounded-2xl border border-line bg-surface p-3 ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <p className="mb-1 flex items-center gap-1.5 text-xs text-ink-dim">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {label}
      </p>
      {children}
    </div>
  );
}

function FactSkeleton() {
  return (
    <div className="space-y-1.5 pt-0.5" aria-hidden>
      <SkeletonLine width="55%" height={16} />
      <SkeletonLine width="35%" height={10} />
    </div>
  );
}

function OutstandingBadge({ payments, failed }: { payments: StudentPaymentHistory | null; failed: boolean }) {
  if (failed || !payments) return null;
  const { expected, outstanding } = payments.summary;
  if (expected <= 0) return null;
  if (outstanding > 0) return <Badge tone="danger" className="whitespace-nowrap">Үлдэгдэлтэй</Badge>;
  return <Badge tone="success" className="whitespace-nowrap">Төлсөн</Badge>;
}
