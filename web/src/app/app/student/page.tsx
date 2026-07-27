"use client";

import { useCallback, useEffect, useState } from "react";
import ActivityHeatmap from "@/components/activity/ActivityHeatmap";
import DashboardGreeting from "@/components/DashboardGreeting";
import EveningMarking from "@/components/EveningMarking";
import { api } from "@/lib/api";

const STATE_LABEL: Record<string, { text: string; cls: string }> = {
  NOT_DONE: { text: "Хийгээгүй", cls: "bg-panel text-ink-dim" },
  SUBMITTED: { text: "Илгээсэн", cls: "bg-warning/15 text-warning" },
  DONE_ONLINE: { text: "Хийсэн ✓", cls: "bg-success/15 text-success" },
  DONE_IN_CLASS: {
    text: "Ангид шалгуулсан ✓",
    cls: "bg-success/15 text-success",
  },
  RETURNED: { text: "Буцаагдсан — дахин илгээ", cls: "bg-error/15 text-error" },
};

interface Assignment {
  id: string;
  title: string;
  description?: string;
  myStatus: string;
  classroom: { name: string };
}
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

function SectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
      <span>{message}</span>
      <button
        onClick={onRetry}
        className="shrink-0 rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
      >
        Дахин оролдох
      </button>
    </div>
  );
}

function SectionLoading({ label }: { label: string }) {
  return (
    <p className="animate-pulse text-sm text-ink-dim" role="status">
      {label} ачаалж байна…
    </p>
  );
}

export default function StudentDashboard() {
  const assignmentsQ = useSection<Assignment[]>("/assignments/my");
  const statsQ = useSection<Stats>("/attempts/my-stats");
  const resultsQ = useSection<TestResult[]>("/tests/my-results");
  const attendanceQ = useSection<AttendanceRow[]>("/attendance/my");
  // Зөвхөн танхимын сурагчид төвийн зар буцаана (онлайнд хоосон)
  const announcementsQ = useSection<Announcement[]>("/announcements");

  const [msg, setMsg] = useState("");
  const [noteByAssignment, setNoteByAssignment] = useState<Record<string, string>>({});

  const reloadAssignments = assignmentsQ.reload;
  const submitAssignment = useCallback(
    async (id: string) => {
      try {
        await api(`/assignments/${id}/submit`, {
          method: "POST",
          body: { note: noteByAssignment[id] ?? "" },
        });
        reloadAssignments();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Алдаа");
      }
    },
    [noteByAssignment, reloadAssignments],
  );

  const announcements = announcementsQ.data ?? [];
  const assignments = assignmentsQ.data ?? [];
  const results = resultsQ.data ?? [];
  const attendance = attendanceQ.data ?? [];

  return (
    <div className="space-y-8">
      <DashboardGreeting />
      <h1 className="text-2xl font-extrabold">Миний самбар</h1>
      {msg && (
        <div className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm text-error">
          {msg}
        </div>
      )}

      {/* Идэвхийн heatmap — хадгалуулах (retention) гол шинж чанар тул самбарын дээд хэсэгт */}
      <ActivityHeatmap />

      {/* Төвийн самбар — зөвхөн танхимын сурагчид */}
      {announcementsQ.status === "loading" && (
        <section className="rounded-2xl border border-line bg-panel p-6">
          <SectionLoading label="Төвийн самбар" />
        </section>
      )}
      {announcementsQ.status === "error" && (
        <SectionError message={announcementsQ.error} onRetry={announcementsQ.reload} />
      )}
      {announcementsQ.status === "ready" && announcements.length > 0 && (
        <section className="rounded-2xl border border-brand-bright/30 bg-brand-bright/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-brand-soft">
            <span className="inline-block h-2 w-2 rounded-full bg-accent-teal" />
            Төвийн самбар
          </h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 ${
                  a.pinned
                    ? "border-warning/30 bg-warning/5"
                    : "border-line bg-surface"
                }`}
              >
                <div className="flex items-center gap-2">
                  {a.pinned && <span title="Зангиатай">📌</span>}
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
        </section>
      )}

      <section className="rounded-2xl border border-line bg-panel p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Даалгаврууд</h2>
        {assignmentsQ.status === "loading" && <SectionLoading label="Даалгаврууд" />}
        {assignmentsQ.status === "error" && (
          <SectionError message={assignmentsQ.error} onRetry={assignmentsQ.reload} />
        )}
        {assignmentsQ.status === "ready" && assignments.length === 0 && (
          <p className="text-sm text-ink-dim">Одоогоор даалгавар алга</p>
        )}
        {assignmentsQ.status === "ready" && assignments.length > 0 && (
          <div className="space-y-3">
            {assignments.map((a) => {
              const st = STATE_LABEL[a.myStatus] ?? STATE_LABEL.NOT_DONE;
              const canSubmit = a.myStatus === "NOT_DONE" || a.myStatus === "RETURNED";
              return (
                <div key={a.id} className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-semibold">{a.title}</p>
                    <span className={`rounded-full px-3 py-0.5 text-xs ${st.cls}`}>
                      {st.text}
                    </span>
                  </div>
                  {a.description && (
                    <p className="mt-1 text-sm text-ink-dim">{a.description}</p>
                  )}
                  {canSubmit && (
                    <div className="mt-3 flex gap-2">
                      <input
                        placeholder="Тайлбар (заавал биш)"
                        aria-label="Даалгаврын тайлбар"
                        value={noteByAssignment[a.id] ?? ""}
                        onChange={(e) =>
                          setNoteByAssignment((m) => ({ ...m, [a.id]: e.target.value }))
                        }
                        className="flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-bright"
                      />
                      <button
                        onClick={() => submitAssignment(a.id)}
                        className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand"
                      >
                        Илгээх
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Оройн тэмдэглэгээ — token-гүй, багшийн оруулсан тестээс (EveningMarking) */}
      <EveningMarking />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Миний сул талууд</h2>
          {statsQ.status === "loading" && <SectionLoading label="Сул талууд" />}
          {statsQ.status === "error" && (
            <SectionError message={statsQ.error} onRetry={statsQ.reload} />
          )}
          {statsQ.status === "ready" && !statsQ.data?.weakestTags.length && (
            <p className="text-sm text-ink-dim">Дата хуримтлагдаагүй байна</p>
          )}
          {statsQ.status === "ready" && (
            <div className="space-y-3">
              {statsQ.data?.weakestTags.map((t) => (
                <div key={t.tag}>
                  <div className="flex justify-between text-sm">
                    <span>{t.tag}</span>
                    <span className="text-ink-dim">
                      {t.successRate}% · {t.attempts} оролдлого
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
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Шалгалтын дүн</h2>
          {resultsQ.status === "loading" && <SectionLoading label="Шалгалтын дүн" />}
          {resultsQ.status === "error" && (
            <SectionError message={resultsQ.error} onRetry={resultsQ.reload} />
          )}
          {resultsQ.status === "ready" && results.length === 0 && (
            <p className="text-sm text-ink-dim">Дүн алга байна</p>
          )}
          {resultsQ.status === "ready" && results.length > 0 && (
            <div className="space-y-2">
              {results.map((r, i) => (
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
            </div>
          )}

          <h2 className="mt-6 mb-3 font-bold text-brand-soft">Сүүлийн ирц</h2>
          {attendanceQ.status === "loading" && <SectionLoading label="Ирц" />}
          {attendanceQ.status === "error" && (
            <SectionError message={attendanceQ.error} onRetry={attendanceQ.reload} />
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
                  {a.date.slice(0, 10)} ·{" "}
                  {a.status === "PRESENT" ? "Ирсэн" : a.status === "LATE" ? "Хоцорсон" : "Тасалсан"}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
