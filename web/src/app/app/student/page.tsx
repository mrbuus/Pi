"use client";

import { useCallback, useEffect, useState } from "react";
import EveningMarking from "@/components/EveningMarking";
import { api } from "@/lib/api";

const STATE_LABEL: Record<string, { text: string; cls: string }> = {
  NOT_DONE: { text: "Хийгээгүй", cls: "bg-white/10 text-ink-dim" },
  SUBMITTED: { text: "Илгээсэн", cls: "bg-amber-400/15 text-amber-300" },
  DONE_ONLINE: { text: "Хийсэн ✓", cls: "bg-teal-400/15 text-teal-300" },
  DONE_IN_CLASS: {
    text: "Ангид шалгуулсан ✓",
    cls: "bg-teal-400/15 text-teal-300",
  },
  RETURNED: { text: "Буцаагдсан — дахин илгээ", cls: "bg-red-400/15 text-red-300" },
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

export default function StudentDashboard() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [msg, setMsg] = useState("");
  const [noteByAssignment, setNoteByAssignment] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api<Assignment[]>("/assignments/my").then(setAssignments).catch(() => {});
    api<Stats>("/attempts/my-stats").then(setStats).catch(() => {});
    api<TestResult[]>("/tests/my-results").then(setResults).catch(() => {});
    api<AttendanceRow[]>("/attendance/my").then(setAttendance).catch(() => {});
    // Зөвхөн танхимын сурагчид төвийн зар буцаана (онлайнд хоосон)
    api<Announcement[]>("/announcements").then(setAnnouncements).catch(() => {});
  }, []);
  useEffect(load, [load]);

  async function submitAssignment(id: string) {
    try {
      await api(`/assignments/${id}/submit`, {
        method: "POST",
        body: { note: noteByAssignment[id] ?? "" },
      });
      load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Миний самбар</h1>
      {msg && (
        <div className="rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">
          {msg}
        </div>
      )}

      {/* Төвийн самбар — зөвхөн танхимын сурагчид */}
      {announcements.length > 0 && (
        <section className="rounded-2xl border border-brand-bright/30 bg-brand-bright/5 p-6">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-brand-soft">
            <span className="inline-block h-2 w-2 rounded-full bg-teal-400" />
            Төвийн самбар
          </h2>
          <div className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`rounded-xl border p-4 ${
                  a.pinned
                    ? "border-amber-400/30 bg-amber-400/5"
                    : "border-white/8 bg-[#0b142e]"
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

      <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Даалгаврууд</h2>
        {assignments.length === 0 && (
          <p className="text-sm text-ink-dim">Одоогоор даалгавар алга</p>
        )}
        <div className="space-y-3">
          {assignments.map((a) => {
            const st = STATE_LABEL[a.myStatus] ?? STATE_LABEL.NOT_DONE;
            const canSubmit = a.myStatus === "NOT_DONE" || a.myStatus === "RETURNED";
            return (
              <div key={a.id} className="rounded-xl border border-white/8 p-4">
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
                      value={noteByAssignment[a.id] ?? ""}
                      onChange={(e) =>
                        setNoteByAssignment((m) => ({ ...m, [a.id]: e.target.value }))
                      }
                      className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-brand-bright"
                    />
                    <button
                      onClick={() => submitAssignment(a.id)}
                      className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold"
                    >
                      Илгээх
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Оройн тэмдэглэгээ — token-гүй, багшийн оруулсан тестээс (EveningMarking) */}
      <EveningMarking />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Миний сул талууд</h2>
          {!stats?.weakestTags.length && (
            <p className="text-sm text-ink-dim">Дата хуримтлагдаагүй байна</p>
          )}
          <div className="space-y-3">
            {stats?.weakestTags.map((t) => (
              <div key={t.tag}>
                <div className="flex justify-between text-sm">
                  <span>{t.tag}</span>
                  <span className="text-ink-dim">
                    {t.successRate}% · {t.attempts} оролдлого
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full ${
                      t.successRate < 50
                        ? "bg-red-400"
                        : t.successRate < 80
                          ? "bg-amber-400"
                          : "bg-teal-400"
                    }`}
                    style={{ width: `${Math.max(t.successRate, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-6">
          <h2 className="mb-4 font-bold text-brand-soft">Шалгалтын дүн</h2>
          {results.length === 0 && (
            <p className="text-sm text-ink-dim">Дүн алга байна</p>
          )}
          <div className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className="flex justify-between rounded-lg border border-white/8 px-4 py-2.5 text-sm"
              >
                <span>{r.test.title}</span>
                <span className="font-bold">
                  {r.totalScore}/{r.maxScore}
                </span>
              </div>
            ))}
          </div>
          <h2 className="mt-6 mb-3 font-bold text-brand-soft">Сүүлийн ирц</h2>
          <div className="flex flex-wrap gap-2">
            {attendance.slice(0, 10).map((a, i) => (
              <span
                key={i}
                className={`rounded-lg px-3 py-1 text-xs ${
                  a.status === "PRESENT"
                    ? "bg-teal-400/15 text-teal-300"
                    : a.status === "LATE"
                      ? "bg-amber-400/15 text-amber-300"
                      : "bg-red-400/15 text-red-300"
                }`}
              >
                {a.date.slice(0, 10)} ·{" "}
                {a.status === "PRESENT" ? "Ирсэн" : a.status === "LATE" ? "Хоцорсон" : "Тасалсан"}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
