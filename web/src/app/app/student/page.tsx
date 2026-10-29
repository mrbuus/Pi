"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CircleCheck,
  CircleDashed,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Megaphone,
  Pin,
} from "lucide-react";
import DashboardGreeting from "@/components/DashboardGreeting";
import EveningMarking from "@/components/EveningMarking";
import HomeworkList from "@/components/homework/HomeworkList";
import PaidUntilCard from "@/components/payments/PaidUntilCard";
import RoomBadge from "@/components/schedule/RoomBadge";
import { formatMinutes, todayUBKey, type DayExpansion, type ScheduleMeResponse } from "@/components/schedule/types";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { ApiError, api } from "@/lib/api";
import { formatMnDate } from "@/lib/dateMn";
import { cleanTitle } from "@/lib/studentTitle";

/* ============================================================================
 * Сурагчийн «Миний самбар» (эзэн 2026-10-29, SURAGCH-SHINECHLEL §1) — багшийн
 * самбарын стандартаар цөөн, давхардалгүй блок:
 *   мэндчилгээ + 4 хавтан → өнөөдрийн хичээл → өнөөдрийн гэрийн даалгавар →
 *   ангийн тест тэмдэглэх (байвал) → шалгалт → төвийн мэдэгдэл (байвал) → төлбөр.
 * Ирцийн жагсаалт, сул тал, шалгалтын дүнгийн жагсаалт, streak — хасагдсан
 * (дэлгэрэнгүй нь Хичээл, Шалгалт хэсэгт).
 * ========================================================================== */

interface TestResult {
  test: { id: string; title: string };
  totalScore: number;
  maxScore: number;
  createdAt?: string;
}
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
type HomeworkStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
interface HomeworkItem {
  testId: string;
  title: string;
  variantLabel: string | null;
  problemCount: number;
  status: HomeworkStatus;
  checksUsed: number;
  maxChecks: number;
  score: { correct: number; total: number } | null;
  late: boolean;
}
interface HomeworkDay {
  date: string;
  classroomId: string;
  classroomName: string;
  deadlineAt: string | null;
  items: HomeworkItem[];
}

type Status = "loading" | "ready" | "error" | "missing";

/** Нэг API дуудлагын ачаалж байгаа/бэлэн/алдаатай төлөв + дахин оролдох.
 * 404 = «missing» (API хараахан байхгүй) — алдаа гэж харуулахгүй. */
function useSection<T>(path: string | null) {
  const [data, setData] = useState<T>();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 404) {
          setStatus("missing");
          return;
        }
        setError(e instanceof Error ? e.message : "Алдаа гарлаа");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [path, tick]);

  function reload() {
    setStatus("loading");
    setTick((t) => t + 1);
  }

  return { data, status, error, reload };
}

const CARD = "rounded-xl border border-line bg-surface p-5 elev-1";

function CardHead({ icon: Icon, title, href, linkLabel }: { icon: typeof Clock; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-bold text-brand-soft">
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
        {title}
      </h2>
      {href && (
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-soft hover:underline">
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  // A student can belong to both class types; the profile is not an enrollment list.
  const classesQ = useSection<EnrolledClassroom[]>("/assignments/my-classrooms");
  const hasClassroom = !!classesQ.data?.some((c) => c.type === "IN_PERSON");
  const hasOnline = !!classesQ.data?.some((c) => c.type === "ONLINE");

  return (
    <div className="space-y-6">
      <DashboardGreeting />
      {/* Гарчиг дээд мөрөнд (layout) аль хэдийн харагддаг тул давхардуулахгүй. */}
      <h1 className="sr-only">Миний самбар</h1>

      {classesQ.status === "error" && <ErrorState message={classesQ.error} onRetry={classesQ.reload} />}

      <div className="grid gap-4 md:grid-cols-2">
        {hasClassroom && <TodayLessonCard />}
        {hasClassroom && <HomeworkTodayCard />}
        <TestsCard />
        <div className="space-y-2">
          <PaidUntilCard compact />
          <Link
            href="/app/student/payments"
            className="inline-flex min-h-11 items-center gap-1 px-1 text-sm font-semibold text-brand-soft hover:underline"
          >
            Төлбөрийн дэлгэрэнгүй
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Багш нар ангийн самбартаа ашигладаг өөрийн тэмдэглэгээ (SelfState) —
          тэмдэглэх тест байхгүй бол харагдахгүй */}
      {hasClassroom && <EveningMarking title="Өнөөдрийн ангийн тест — тэмдэглэх" hideWhenEmpty />}

      {/* Онлайн ангийн даалгавар (/assignments/my) — онлайн сурагчид л */}
      {hasOnline && <HomeworkList hideWhenEmpty />}

      <AnnouncementsCard />
    </div>
  );
}

/* ── Өнөөдрийн хичээл: /schedule/me → анги, /schedule/days → амралт, цаг, танхим ── */
function TodayLessonCard() {
  const meQ = useSection<ScheduleMeResponse>("/schedule/me");
  const classroomId = meQ.data?.classroomId ?? null;
  const today = todayUBKey();
  const daysQ = useSection<DayExpansion[]>(
    classroomId ? `/schedule/days?${new URLSearchParams({ from: today, to: today, classroomId }).toString()}` : null,
  );

  if ((meQ.status === "ready" || meQ.status === "missing") && !classroomId) return null;
  const loading = meQ.status === "loading" || (classroomId && daysQ.status === "loading");
  const day = daysQ.data?.find((d) => d.date.slice(0, 10) === today) ?? daysQ.data?.[0];

  return (
    <section className={CARD} aria-label="Өнөөдрийн хичээл">
      <CardHead icon={CalendarDays} title="Өнөөдрийн хичээл" href="/app/lesson-flow/my" linkLabel="Хичээл" />
      {loading && <LoadingState rows={2} label="Өнөөдрийн хичээл" />}
      {meQ.status === "error" && <ErrorState message={meQ.error} onRetry={meQ.reload} />}
      {daysQ.status === "error" && <ErrorState message={daysQ.error} onRetry={daysQ.reload} />}
      {!loading && daysQ.status === "ready" && (
        day?.holiday ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-dim">
            Өнөөдөр хичээлгүй — {day.holiday.title}
          </p>
        ) : !day || day.classes.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-dim">
            Өнөөдөр хичээлгүй
          </p>
        ) : (
          <ul className="space-y-2">
            {day.classes.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                <RoomBadge room={c.room} />
                <div className="min-w-0">
                  <p className="font-bold tabular-nums text-ink">
                    {formatMinutes(c.startMinute)}–{formatMinutes(c.endMinute)}
                  </p>
                  <p className="truncate text-sm text-ink-dim">
                    <Meta items={[c.classroomName, c.subject, c.teacherName]} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}

/* ── Өнөөдрийн гэрийн даалгавар: GET /homework/my?days=2 ── */
const HW_STATUS: Record<HomeworkStatus, { label: string; icon: typeof Clock; tone: string }> = {
  NOT_STARTED: { label: "Эхлээгүй", icon: CircleDashed, tone: "text-ink-dim" },
  IN_PROGRESS: { label: "Хийж байна", icon: Clock, tone: "text-info" },
  SUBMITTED: { label: "Илгээсэн", icon: CircleCheck, tone: "text-success" },
};

function HomeworkTodayCard() {
  const q = useSection<{ days: HomeworkDay[] }>("/homework/my?days=2");
  // Хамгийн сүүлийн өдрийн даалгавар (өнөөдөр эсвэл өчигдөр)
  const days = [...(q.data?.days ?? [])].filter((d) => d.items.length > 0).sort((a, b) => b.date.localeCompare(a.date));
  const latest = days[0];

  return (
    <section className={CARD} aria-label="Өнөөдрийн гэрийн даалгавар">
      <CardHead icon={ClipboardList} title="Өнөөдрийн гэрийн даалгавар" href="/app/homework" linkLabel="Даалгавар" />
      {q.status === "loading" && <LoadingState rows={2} label="Гэрийн даалгавар" />}
      {q.status === "error" && <ErrorState message={q.error} onRetry={q.reload} />}
      {(q.status === "missing" || (q.status === "ready" && !latest)) && (
        <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-dim">
          Одоогоор гэрийн даалгавар алга
        </p>
      )}
      {q.status === "ready" && latest && (
        <>
          <p className="mb-2 text-xs text-ink-dim">
            <Meta items={[formatMnDate(latest.date), latest.classroomName]} />
          </p>
          <ul className="space-y-2">
            {latest.items.map((it) => {
              const st = HW_STATUS[it.status];
              const Icon = st.icon;
              return (
                <li key={it.testId} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink">{cleanTitle(it.title, it.variantLabel)}</p>
                    <p className="text-xs text-ink-dim">
                      <Meta items={[`${it.problemCount} бодлого`, it.late ? "Хоцорсон" : null]} />
                    </p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 text-sm font-semibold ${st.tone}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {st.label}
                    {it.status === "SUBMITTED" && it.score && (
                      <span className="tabular-nums">{it.score.correct}/{it.score.total}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/app/homework"
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-on-brand hover:opacity-90"
          >
            Даалгавар хийх
          </Link>
        </>
      )}
    </section>
  );
}

/* ── Шалгалт: сүүлийн дүн + Шалгалт хэсэг рүү (жагсаалт тэнд) ── */
function TestsCard() {
  const q = useSection<TestResult[]>("/tests/my-results");
  const last = q.data?.[0];
  return (
    <section className={CARD} aria-label="Шалгалт">
      <CardHead icon={ClipboardCheck} title="Шалгалт" href="/app/tests" linkLabel="Бүгд" />
      {q.status === "loading" && <LoadingState rows={1} label="Шалгалт" />}
      {q.status === "error" && <ErrorState message={q.error} onRetry={q.reload} />}
      {(q.status === "missing" || (q.status === "ready" && !last)) && (
        <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-ink-dim">
          Одоогоор дүн алга — шалгалтаа өгөөд энд харна
        </p>
      )}
      {q.status === "ready" && last && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-ink-dim">Сүүлийн дүн</p>
            <p className="truncate font-semibold text-ink">{cleanTitle(last.test.title, null, last.test.title)}</p>
          </div>
          <span className="shrink-0 font-display text-xl font-bold tabular-nums text-ink">
            {last.totalScore}/{last.maxScore}
          </span>
        </div>
      )}
    </section>
  );
}

/* ── Төвийн мэдэгдэл — хоосон бол огт харагдахгүй ── */
function AnnouncementsCard() {
  const q = useSection<Announcement[]>("/announcements");
  const [expanded, setExpanded] = useState(false);
  if (q.status === "error") return <ErrorState message={q.error} onRetry={q.reload} />;
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
              {a.pinned && <Pin className="h-3.5 w-3.5 text-brand-soft" aria-label="Зангиатай" />}
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
