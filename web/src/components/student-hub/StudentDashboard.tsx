"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Camera,
  ClipboardList,
  History,
  Megaphone,
  MessageSquareText,
  NotebookPen,
  Pin,
  type LucideIcon,
} from "lucide-react";
import DashboardGreeting from "@/components/DashboardGreeting";
import EveningMarking from "@/components/EveningMarking";
import HomeworkList from "@/components/homework/HomeworkList";
import PaidUntilCard from "@/components/payments/PaidUntilCard";
import RoomBadge from "@/components/schedule/RoomBadge";
import {
  ATTENDANCE_MARKS,
  ATTENDANCE_ORDER,
  HOMEWORK_MARKS,
  HOMEWORK_ORDER,
  TONE_TEXT,
  type MarkMeta,
} from "@/components/attendance/marks";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { formatMnDate } from "@/lib/dateMn";
import { DayRow } from "./LessonDays";
import { HomeworkMark } from "./Marks";
import { currentMonth, dayHref, dayShort, loadMonth, timeRange, todayKey, useApi, useMonthDays } from "./lib";
import type { HubOverview } from "./types";

/* ============================================================================
 * Сурагчийн «Миний самбар» (SURAGCH-V2-GEREE, 2026-10-31) — нэг харцаар:
 *   өнөөдрийн хичээл + түргэн үйлдэл → ирц, даалгаврын хувь (бүх хугацаа) →
 *   багшийн сүүлийн тэмдэглэгээ → сүүлийн хичээлийн өдрүүд → ангийн тест тэмдэглэх
 *   (байвал) → онлайн даалгавар (онлайн сурагчид) → төлбөр → төвийн мэдэгдэл (байвал).
 * Дэлгэрэнгүй бүгд «Хичээл» (/app/my-class) хэсэгт — энд давхардуулахгүй.
 * ========================================================================== */

interface EnrolledClassroom {
  id: string;
  name: string;
  type: "IN_PERSON" | "ONLINE";
}
interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

const CARD = "rounded-xl border border-line bg-surface p-4 elev-1 sm:p-5";

function CardHead({ icon: Icon, title, href, linkLabel }: { icon: LucideIcon; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-bold text-brand-soft">
        <Icon className="size-5 shrink-0" aria-hidden />
        {title}
      </h2>
      {href && (
        <Link href={href} className="-mr-1 inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-brand-soft hover:underline">
          {linkLabel}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const overview = useApi<HubOverview>("/student-hub/overview");
  const classes = useApi<EnrolledClassroom[]>("/assignments/my-classrooms");
  const ov = overview.data;
  const inClass = !!ov && ov.classrooms.length > 0;
  const hasOnline = !!classes.data?.some((c) => c.type === "ONLINE");

  return (
    <div className="space-y-4">
      <DashboardGreeting />
      <h1 className="sr-only">Миний самбар</h1>

      {overview.status === "error" && <ErrorState message={overview.error} onRetry={overview.reload} />}
      {overview.status === "loading" && <DashboardSkeleton />}

      {ov && inClass && (
        <>
          <TodayCard today={ov.today} />
          <div className="grid grid-cols-2 gap-3">
            <RateTile
              title="Ирц"
              icon={CalendarCheck}
              href="/app/my-class?tab=attendance"
              rate={ov.attendance.rate}
              total={ov.attendance.total}
              items={ATTENDANCE_ORDER.map((s) => ({ key: s, mark: ATTENDANCE_MARKS[s], value: ov.attendance[s] }))}
            />
            <RateTile
              title="Даалгавар"
              icon={NotebookPen}
              href="/app/my-class"
              rate={ov.homework.rate}
              total={ov.homework.total}
              items={HOMEWORK_ORDER.map((s) => ({ key: s, mark: HOMEWORK_MARKS[s], value: ov.homework[s] }))}
            />
          </div>
          {ov.latestMark && <LatestMarkCard mark={ov.latestMark} />}
          <RecentDays />
          <EveningMarking title="Ангийн тестээ тэмдэглэх" hideWhenEmpty collapsible />
        </>
      )}

      {ov && !inClass && !hasOnline && classes.status !== "loading" && (
        <EmptyState icon={CalendarDays} title="Танхимын ангид элсээгүй байна" hint="Ангид элссэний дараа хичээл, ирц, даалгавар энд харагдана" />
      )}

      {hasOnline && <HomeworkList hideWhenEmpty />}

      <div className="space-y-1">
        <PaidUntilCard compact />
        <Link
          href="/app/student/payments"
          className="inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-brand-soft hover:underline"
        >
          Төлбөрийн дэлгэрэнгүй
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>

      <AnnouncementsCard />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-4">
      <div className="skeleton h-36 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
      <div className="skeleton h-48 rounded-xl" />
    </div>
  );
}

/* ── Өнөөдрийн хичээл + түргэн үйлдэл ── */
function TodayCard({ today }: { today: HubOverview["today"] }) {
  const date = todayKey();
  return (
    <section className={CARD} aria-labelledby="today-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="today-title" className="flex items-center gap-2 font-bold text-brand-soft">
          <CalendarDays className="size-5 shrink-0" aria-hidden />
          Өнөөдөр
        </h2>
        <span className="text-xs text-ink-dim">{formatMnDate(date, { month: "long", day: "numeric", weekday: "long" })}</span>
      </div>

      {today ? (
        <Link
          href={dayHref({ date, classroomId: today.classroomId })}
          className="row-interactive -mx-2 flex items-center gap-3 rounded-lg px-2 py-2"
        >
          <RoomBadge room={today.room} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block font-bold tabular-nums text-ink">{timeRange(today.startMinute, today.endMinute)}</span>
            <span className="cyrillic-tight block truncate text-sm text-ink-dim">
              <Meta items={[today.topic, today.classroomName]} />
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
        </Link>
      ) : (
        <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-dim">Өнөөдөр хичээлгүй</p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={today ? `/app/theory?date=${date}` : "/app/theory"}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-3 text-sm font-bold text-on-brand hover:opacity-90"
        >
          <Camera className="size-4 shrink-0" aria-hidden />
          <span className="cyrillic-tight truncate">{today ? "Онол илгээх" : "Онолын зураг"}</span>
        </Link>
        <Link
          href="/app/homework"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-bold text-ink hover:bg-ink/5"
        >
          <ClipboardList className="size-4 shrink-0" aria-hidden />
          <span className="cyrillic-tight truncate">Даалгавар</span>
        </Link>
      </div>
    </section>
  );
}

/* ── Ирц / даалгаврын хувь (бүх хугацаа, тоотой) ── */
function RateTile({
  title,
  icon: Icon,
  href,
  rate,
  total,
  items,
}: {
  title: string;
  icon: LucideIcon;
  href: string;
  rate: number;
  total: number;
  items: { key: string; mark: MarkMeta; value: number }[];
}) {
  const shown = items.filter((i, idx) => idx === 0 || i.value > 0);
  return (
    <Link href={href} className={cn(CARD, "surface-interactive flex min-w-0 flex-col gap-2")}>
      <span className="flex items-center gap-1.5 text-xs font-bold text-ink-dim">
        <Icon className="size-4 shrink-0" aria-hidden />
        {title}
      </span>
      {total === 0 ? (
        <span className="text-sm text-ink-dim">Тэмдэглэгээ алга</span>
      ) : (
        <>
          <span className="font-display text-3xl font-bold leading-none tabular-nums text-ink">
            {rate}
            <span className="text-lg text-ink-dim">%</span>
          </span>
          <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-ink/10">
            <span className="block h-full rounded-full bg-brand-bright" style={{ width: `${Math.max(0, Math.min(100, rate))}%` }} />
          </span>
          <ul className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
            {shown.map(({ key, mark, value }) => {
              const MarkIcon = mark.icon;
              return (
                <li key={key} title={`${mark.label} ${value}`} className="inline-flex items-center gap-0.5 tabular-nums">
                  <MarkIcon className={cn("size-3.5", TONE_TEXT[mark.tone])} aria-hidden />
                  <span className="sr-only">{mark.label}</span>
                  <b className="font-bold text-ink">{value}</b>
                </li>
              );
            })}
          </ul>
          <span className="text-[11px] text-ink-dim tabular-nums">{total} хичээлээс</span>
        </>
      )}
    </Link>
  );
}

/* ── Багшийн сүүлийн тэмдэглэгээ ── */
function LatestMarkCard({ mark }: { mark: NonNullable<HubOverview["latestMark"]> }) {
  return (
    <section className={CARD} aria-labelledby="latest-mark">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="latest-mark" className="flex items-center gap-2 font-bold text-brand-soft">
          <MessageSquareText className="size-5 shrink-0" aria-hidden />
          Багшийн тэмдэглэгээ
        </h2>
        <span className="text-xs text-ink-dim">{dayShort(mark.date)}</span>
      </div>
      <HomeworkMark status={mark.status} />
      {mark.comment && (
        <p className="mt-2 whitespace-pre-line rounded-lg border-l-[3px] border-brand-bright bg-panel px-3 py-2 text-sm text-ink">
          {mark.comment}
        </p>
      )}
    </section>
  );
}

/* ── Сүүлийн хичээлийн өдрүүд (5 хүртэл) ── */
function RecentDays() {
  const router = useRouter();
  const cur = useMonthDays(currentMonth());
  const curDays = cur?.data?.days ?? [];
  const prevKey = cur?.data && curDays.length < 5 ? cur.data.prevMonth : null;
  const prev = useMonthDays(prevKey);
  const days = [...curDays, ...(prevKey ? prev?.data?.days ?? [] : [])].slice(0, 5);
  const loading = !cur || (cur.status === "loading" && !cur.data) || (!!prevKey && (!prev || (prev.status === "loading" && !prev.data)));
  const today = todayKey();

  return (
    <section className={CARD} aria-label="Сүүлийн хичээлүүд">
      <CardHead icon={History} title="Сүүлийн хичээлүүд" href="/app/my-class" linkLabel="Бүгд" />
      {cur?.status === "error" && !cur.data ? (
        <ErrorState message={cur.error ?? "Мэдээлэл ачаалагдсангүй"} onRetry={() => loadMonth(currentMonth(), true)} />
      ) : loading ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-dim">Хичээлийн өдөр хараахан алга</p>
      ) : (
        <ul className="-mx-4 divide-y divide-line border-y border-line sm:-mx-5">
          {days.map((d) => (
            <li key={`${d.date}-${d.classroomId}`}>
              <DayRow day={d} today={today} onOpen={(day) => router.push(dayHref(day))} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Төвийн мэдэгдэл — хоосон бол огт харагдахгүй ── */
function AnnouncementsCard() {
  const q = useApi<Announcement[]>("/announcements");
  const [expanded, setExpanded] = useState(false);
  if (q.status === "error") return q.code === 404 ? null : <ErrorState message={q.error} onRetry={q.reload} />;
  const list = q.data ?? [];
  if (q.status !== "ready" || list.length === 0) return null;
  const maxVisible = 3;
  const visible = expanded ? list : list.slice(0, maxVisible);

  return (
    <section className={CARD} aria-label="Төвийн мэдэгдэл">
      <CardHead icon={Megaphone} title="Төвийн мэдэгдэл" />
      <div className="space-y-3">
        {visible.map((a) => (
          <div key={a.id} className="rounded-lg border border-line p-4">
            <div className="flex items-center gap-2">
              {a.pinned && <Pin className="size-3.5 text-brand-soft" aria-label="Зангиатай" />}
              <p className="font-semibold">{a.title}</p>
              <span className="ml-auto shrink-0 text-xs text-ink-dim">{formatMnDate(a.createdAt)}</span>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-sm text-ink-dim">{a.body}</p>
          </div>
        ))}
      </div>
      {list.length > maxVisible && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="mt-3 min-h-11 w-full rounded-lg border border-line text-sm font-semibold text-ink-dim transition hover:text-ink"
        >
          {expanded ? "Бага харуулах" : `Бүгдийг харах (${list.length})`}
        </button>
      )}
    </section>
  );
}
