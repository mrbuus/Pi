"use client";

import { Pin } from "lucide-react";
import { useEffect, useState } from "react";
import ActivityHeatmap from "@/components/activity/ActivityHeatmap";
import DashboardGreeting from "@/components/DashboardGreeting";
import EveningMarking from "@/components/EveningMarking";
import HomeworkList from "@/components/homework/HomeworkList";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import { SkeletonLine } from "@/components/ui/Skeleton";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";

interface Stats {
  totalAttempts: number;
  weakestTags: { tag: string; type: string; attempts: number; successRate: number }[];
}
interface TestResult {
  test: { title: string };
  totalScore: number;
  maxScore: number;
}
interface AttendanceRow {
  date: string;
  status: string;
  classroom: { name: string };
}
interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: string;
}

type Status = "loading" | "ready" | "error";

/** Нэг API дуудлагыг ачаалж байгаа/бэлэн/алдаатай гэсэн 3 төлөвт хөрвүүлж,
 * дахин оролдох боломж өгнө — амжилтгүй дуудлага "хоосон дата"-с ялгагдана. */
function useSection<T>(path: string): {
  data: T | undefined;
  status: Status;
  error: string;
  reload: () => void;
} {
  const [data, setData] = useState<T>();
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    // Анхны төлөв аль хэдийн "loading" тул энд дахин synchronous setState
    // хийхгүй — зөвхөн амжилт/алдааны үр дүнг async callback-аас бичнэ.
    api<T>(path)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Алдаа гарлаа");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
    // path нь тогтмол утгуудаар дуудагддаг тул зөвхөн tick өөрчлөгдөхөд дахин ачаална.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  function reload() {
    // Дахин оролдоход товч дарах мөчид (effect биш) шууд "ачаалж байна" болгоно.
    setStatus("loading");
    setTick((t) => t + 1);
  }

  return { data, status, error, reload };
}

export default function StudentDashboard() {
  const statsQ = useSection<Stats>("/attempts/my-stats");
  const resultsQ = useSection<TestResult[]>("/tests/my-results");
  const attendanceQ = useSection<AttendanceRow[]>("/attendance/my");
  // Зөвхөн танхимын сурагчид төвийн зар буцаана (онлайнд хоосон)
  const announcementsQ = useSection<Announcement[]>("/announcements");

  const announcements = announcementsQ.data ?? [];
  const results = resultsQ.data ?? [];
  const attendance = attendanceQ.data ?? [];

  return (
    <div className="space-y-8">
      <DashboardGreeting />
      <h1 className="text-2xl font-extrabold">Миний самбар</h1>

      {/* Идэвхийн heatmap — хадгалуулах (retention) гол шинж чанар тул самбарын дээд хэсэгт */}
      <ActivityHeatmap />

      {/* Төвийн самбар — зөвхөн танхимын сурагчид */}
      {announcementsQ.status === "loading" && (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <LoadingState rows={3} label="Төвийн самбар" />
        </section>
      )}
      {announcementsQ.status === "error" && (
        <ErrorState message={announcementsQ.error} onRetry={announcementsQ.reload} />
      )}
      {announcementsQ.status === "ready" && announcements.length > 0 && (
        <AnnouncementsSection announcements={announcements} />
      )}

      <HomeworkList />

      {/* Оройн тэмдэглэгээ — token-гүй, багшийн оруулсан тестээс (EveningMarking) */}
      <EveningMarking />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Миний сул талууд</h2>
          {statsQ.status === "loading" && <LoadingState rows={4} label="Сул талууд" />}
          {statsQ.status === "error" && (
            <ErrorState message={statsQ.error} onRetry={statsQ.reload} />
          )}
          {statsQ.status === "ready" && !statsQ.data?.weakestTags.length && (
            <p className="text-sm text-ink-dim">Дата хуримтлагдаагүй байна</p>
          )}
          {statsQ.status === "ready" && (
            <WeakestTagsPanel weakestTags={statsQ.data?.weakestTags ?? []} />
          )}
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Шалгалтын дүн</h2>
          {resultsQ.status === "loading" && <LoadingState rows={3} label="Шалгалтын дүн" />}
          {resultsQ.status === "error" && (
            <ErrorState message={resultsQ.error} onRetry={resultsQ.reload} />
          )}
          {resultsQ.status === "ready" && results.length === 0 && (
            <p className="text-sm text-ink-dim">Дүн алга байна</p>
          )}
          {resultsQ.status === "ready" && results.length > 0 && (
            <TestResultsPanel results={results} />
          )}

          <h2 className="mt-6 mb-3 font-bold text-brand-soft">Сүүлийн ирц</h2>
          {attendanceQ.status === "loading" && <LoadingState rows={2} label="Ирц" />}
          {attendanceQ.status === "error" && (
            <ErrorState message={attendanceQ.error} onRetry={attendanceQ.reload} />
          )}
          {attendanceQ.status === "ready" && attendance.length === 0 && (
            <p className="text-sm text-ink-dim">Ирцийн мэдээлэл алга байна</p>
          )}
          {attendanceQ.status === "ready" && attendance.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attendance.slice(0, 10).map((a, i) => (
                <span
                  key={i}
                  className={`rounded-lg px-3 py-1 text-xs ${
                    a.status === "PRESENT"
                      ? "bg-success/15 text-success"
                      : a.status === "LATE"
                        ? "bg-warning/15 text-warning"
                        : "bg-error/15 text-error"
                  }`}
                >
                  <Meta items={[a.date.slice(0, 10), a.status === "PRESENT" ? "Ирсэн" : a.status === "LATE" ? "Хоцорсон" : "Тасалсан"]} />
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AnnouncementsSection({ announcements }: { announcements: Announcement[] }) {
  const [expanded, setExpanded] = useState(false);
  const maxVisible = 3;
  const visibleAnnouncements = expanded ? announcements : announcements.slice(0, maxVisible);
  const hasMore = announcements.length > maxVisible;

  return (
    <section className="rounded-2xl border border-brand-bright/30 bg-brand-bright/5 p-6">
      <h2 className="mb-4 flex items-center gap-2 font-bold text-brand-soft">
        <span className="inline-block h-2 w-2 rounded-full bg-accent-teal" />
        Төвийн самбар
      </h2>
      <div className="space-y-3">
        {visibleAnnouncements.map((a) => (
          <div
            key={a.id}
            className={`rounded-xl border p-4 ${
              a.pinned
                ? "border-warning/30 bg-warning/5"
                : "border-line bg-surface"
            }`}
          >
            <div className="flex items-center gap-2">
              {a.pinned && <Pin className="h-3.5 w-3.5 text-warning" aria-label="Зангиатай" />}
              <p className="font-semibold">{a.title}</p>
              <span className="ml-auto text-xs text-ink-dim">
                {a.createdAt.slice(0, 10)}
              </span>
            </div>
            <p className="mt-1.5 whitespace-pre-line text-sm text-ink-dim">
              {a.body}
            </p>
          </div>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="mt-3 w-full rounded-lg border border-line py-2 text-sm font-semibold text-ink-dim transition hover:border-brand hover:text-ink"
        >
          {expanded
            ? `Бага харуулах — ${announcements.length - maxVisible} нуугдсан`
            : `Бүгдийг харах — ${announcements.length}/${announcements.length}`}
        </button>
      )}
    </section>
  );
}

function WeakestTagsPanel({ weakestTags }: { weakestTags: Array<{ tag: string; type: string; attempts: number; successRate: number }> }) {
  const [expanded, setExpanded] = useState(false);
  const maxVisible = 5;
  const visibleTags = expanded ? weakestTags : weakestTags.slice(0, maxVisible);
  const hasMore = weakestTags.length > maxVisible;

  if (weakestTags.length === 0) {
    return <p className="text-sm text-ink-dim">Дата хуримтлагдаагүй байна</p>;
  }

  return (
    <div className="space-y-3">
      {visibleTags.map((t) => (
        <div key={t.tag}>
          <div className="flex justify-between text-sm">
            <span>{t.tag}</span>
            <span className="text-ink-dim">
              {t.successRate}% — {t.attempts} оролдлого
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-panel">
            <div
              className={`h-full rounded-full ${
                t.successRate < 50
                  ? "bg-error"
                  : t.successRate < 80
                    ? "bg-warning"
                    : "bg-success"
              }`}
              style={{ width: `${Math.max(t.successRate, 4)}%` }}
            />
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="mt-2 w-full rounded-lg border border-line py-2 text-xs font-semibold text-ink-dim transition hover:border-brand hover:text-ink"
        >
          {expanded
            ? `Бага харуулах — ${weakestTags.length - maxVisible} нуугдсан`
            : `${weakestTags.length} / ${weakestTags.length} харуулах`}
        </button>
      )}
    </div>
  );
}

function TestResultsPanel({ results }: { results: TestResult[] }) {
  const [expanded, setExpanded] = useState(false);
  const maxVisible = 4;
  const visibleResults = expanded ? results : results.slice(0, maxVisible);
  const hasMore = results.length > maxVisible;

  return (
    <div className="space-y-2">
      {visibleResults.map((r, i) => (
        <div
          key={i}
          className="flex justify-between rounded-lg border border-line px-4 py-2.5 text-sm"
        >
          <span>{r.test.title}</span>
          <span className="font-bold">
            {r.totalScore}/{r.maxScore}
          </span>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="mt-2 w-full rounded-lg border border-line py-2 text-xs font-semibold text-ink-dim transition hover:border-brand hover:text-ink"
        >
          {expanded
            ? `Бага харуулах — ${results.length - maxVisible} нуугдсан`
            : `Бүгдийг харах — ${results.length}/${results.length}`}
        </button>
      )}
    </div>
  );
}
