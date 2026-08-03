"use client";

import { useEffect, useState } from "react";
import { api, getRole } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import PatternOverview from "./PatternOverview";
import StaffScheduleBuilder from "./StaffScheduleBuilder";
import UpcomingAgenda from "./UpcomingAgenda";
import WeeklyGrid from "./WeeklyGrid";
import {
  todayUBKey,
  type ClassroomLite,
  type ScheduleEntry,
  type ScheduleMeResponse,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

function todayWeekday(): number {
  return new Date(`${todayUBKey()}T00:00:00.000Z`).getUTCDay();
}

// ---------------------------------------------------------------------------

function StudentSchedule() {
  const [data, setData] = useState<ScheduleMeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ScheduleMeResponse>("/schedule/me")
      .then(setData)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState rows={3} />;
  if (error) return <ErrorState message={error} />;
  if (!data?.classroomId) {
    return (
      <div className="rounded-xl border border-line bg-panel p-6 text-sm text-ink-dim">
        Та одоогоор идэвхтэй ангид элсээгүй байгаа тул хуваарь харагдахгүй
        байна. Асуудалтай бол багштайгаа холбогдоно уу.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-bold text-brand-soft">
          Миний ангийн долоо хоногийн хуваарь
        </h2>
        <WeeklyGrid entries={data.entries} todayWeekday={todayWeekday()} />
      </section>
      <section>
        <h2 className="mb-3 font-bold text-brand-soft">Ойрын өдрүүд</h2>
        <UpcomingAgenda classroomId={data.classroomId} />
      </section>
    </div>
  );
}

function TeacherSchedule({ role }: { role: string }) {
  const [data, setData] = useState<ScheduleMeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ScheduleMeResponse>("/schedule/me")
      .then(setData)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState rows={3} />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8">
      {/* Багш+ -ийн хувьд зохион байгуулах хэсэг нь ӨДӨР ТУТМЫН ажил тул
          хамгийн дээр байрлана — өөрийн хичээлийн жагсаалт доогуур орно. */}
      {role === "TEACHER_PLUS" && <StaffScheduleBuilder role={role} />}
      {/* Энгийн багшид ерөнхий давтамжийг ХАРУУЛНА (засахгүй) — "бүх багш
          ерөнхийг нь харж болно" гэсэн эзний дүрэм. */}
      {role === "TEACHER" && (
        <section>
          <h2 className="mb-3 font-bold text-brand-soft">Ерөнхий хуваарь</h2>
          <PatternOverview readOnly />
        </section>
      )}
      <section>
        <h2 className="mb-3 font-bold text-brand-soft">Миний заадаг хичээлүүд</h2>
        {data && data.entries.length === 0 ? (
          <p className="text-sm text-ink-dim">
            Танд оноогдсон хуваарь одоогоор алга байна.
          </p>
        ) : (
          <WeeklyGrid entries={data?.entries ?? []} todayWeekday={todayWeekday()} />
        )}
      </section>
    </div>
  );
}

function AdminSchedule() {
  const [classrooms, setClassrooms] = useState<ClassroomLite[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ClassroomLite[]>("/classrooms")
      .then((rows) => {
        setClassrooms(rows);
        setSelected((prev) => prev || rows[0]?.id || "");
      })
      .catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    if (!selected) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<ScheduleEntry[]>(`/schedule/classroom/${selected}`)
      .then(setEntries)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="space-y-8">
      <StaffScheduleBuilder role="ADMIN" />
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-bold text-brand-soft">Ангийн долоо хоногийн хуваарь</h2>
          <label htmlFor="admin-sch-classroom" className="sr-only">
            Анги сонгох
          </label>
          <select
            id="admin-sch-classroom"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
          >
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {error && <ErrorState message={error} />}
        {!error && loading && <LoadingState rows={5} />}
        {!error && !loading && <WeeklyGrid entries={entries} todayWeekday={todayWeekday()} />}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function ScheduleClient() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(getRole());
  }, []);

  if (!role) return null;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-extrabold">Хичээлийн хуваарь</h1>
      {role === "STUDENT" && <StudentSchedule />}
      {(role === "TEACHER" || role === "TEACHER_PLUS") && (
        <TeacherSchedule role={role} />
      )}
      {role === "ADMIN" && <AdminSchedule />}
      {role === "PARENT" || role === "BUYER" ? (
        <p className="text-sm text-ink-dim">
          Энэ хэсэг танхимын сурагч, багш, удирдлагад зориулагдсан.
        </p>
      ) : null}
    </div>
  );
}
