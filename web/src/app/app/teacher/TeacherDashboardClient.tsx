"use client";

import { useCallback, useEffect, useState } from "react";
import AnnouncementCompose from "@/components/AnnouncementCompose";
import ClassActivityHeatmap from "@/components/activity/ClassActivityHeatmap";
import ClassDidTest from "@/components/ClassDidTest";
import DashboardGreeting from "@/components/DashboardGreeting";
import AttentionSection, {
  type AttentionResponse,
} from "@/components/TeacherDashboard/AttentionSection";
import AttendanceSection from "@/components/TeacherDashboard/AttendanceSection";
import { ClassroomSelect } from "@/components/TeacherDashboard/ClassroomSelect";
import AssignmentsSection from "@/components/TeacherDashboard/AssignmentsSection";
import SummarySection from "@/components/TeacherDashboard/SummarySection";
import UnassignedStudentsSection from "@/components/TeacherDashboard/UnassignedStudentsSection";
import ParentRequestsSection from "@/components/TeacherDashboard/ParentRequestsSection";
import { api, getRole } from "@/lib/api";

// ============================================================================
// Type Definitions
// ============================================================================

interface Classroom {
  id: string;
  name: string;
  type: string;
  grade?: number;
  _count: { enrollments: number };
}
interface RosterRow {
  student: { id: string; firstName: string; lastName: string };
  status: string | null;
}

type TabKey = "home" | "attendance" | "homework";
const TAB_KEYS: TabKey[] = ["home", "attendance", "homework"];
const TAB_LABELS: Record<TabKey, string> = {
  home: "Нүүр",
  attendance: "Ирц",
  homework: "Даалгавар",
};
interface Summary {
  stats: {
    studentsTotal: number;
    studentsMarked: number;
    totalAttempts: number;
    byState: Record<string, number>;
    byChapter: Record<string, { total: number; failed: number }>;
  };
}
interface Unassigned {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  studentProfile?: { grade?: number };
}
interface ParentRequest {
  id: string;
  parent: { firstName: string; lastName: string; phone: string };
  student: {
    firstName: string;
    lastName: string;
    phone: string;
    studentProfile?: { grade?: number };
  };
}

function todayUBKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date());
}

/** API алдааг хэрэглэгчид харуулах эвтэй мессеж болгоно. */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/** Хэсэг бүрийн ачаалж буй / алдаатай / хоосон төлвийг ялгаж харуулна. */
function SectionStatus({
  loading,
  error,
  onRetry,
  empty,
  emptyText,
}: {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  empty: boolean;
  emptyText: string;
}) {
  if (loading) {
    return (
      <p className="animate-pulse text-sm text-ink-dim" role="status">
        Ачаалж байна…
      </p>
    );
  }
  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
        <span>⚠ {error}</span>
        <button
          onClick={onRetry}
          className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
        >
          Дахин ачаалах
        </button>
      </div>
    );
  }
  if (empty) {
    return <p className="text-sm text-ink-dim">{emptyText}</p>;
  }
  return null;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * Багшийн самбар (Teacher Dashboard)
 *
 * Гүйцэтгэл:
 * - Ирцийн хяналт
 * - Даалгавар үүсгэх, шалгах
 * - Статистик үзүүлэх
 * - Эцэг эхийн холболт батлах
 *
 * Mobile responsive - утас, компьютер хоёуланд төгс
 */
export default function TeacherDashboardClient() {
  // ========================================================================
  // State
  // ========================================================================
  const today = todayUBKey();
  const role = typeof window !== "undefined" ? getRole() : null;
  const canManage = role === "ADMIN" || role === "TEACHER_PLUS";

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [classroomsLoading, setClassroomsLoading] = useState(true);
  const [classroomsError, setClassroomsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>("");

  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, string>>({});
  // Сурагч тус бүрийн өдрийн тайлбар — API-д одоогоор талбар байхгүй тул зөвхөн
  // локал төлөвт хадгалагдана (AttendanceSection.tsx-ийн коммент, followUps-ийг үз)
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Sub-tab: ?tab=home|attendance|homework — refresh хийхэд сонгосон tab хадгалагдана
  const [tab, setTab] = useState<TabKey>("home");
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t && (TAB_KEYS as string[]).includes(t)) setTab(t as TabKey);
  }, []);
  const changeTab = useCallback((next: TabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState({}, "", url);
  }, []);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [attention, setAttention] = useState<AttentionResponse | null>(null);
  const [attentionLoading, setAttentionLoading] = useState(false);
  const [attentionError, setAttentionError] = useState<string | null>(null);

  const [unassigned, setUnassigned] = useState<Unassigned[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [unassignedError, setUnassignedError] = useState<string | null>(null);

  const [parentRequests, setParentRequests] = useState<ParentRequest[]>([]);
  const [parentRequestsLoading, setParentRequestsLoading] = useState(false);
  const [parentRequestsError, setParentRequestsError] = useState<string | null>(
    null,
  );

  const [msg, setMsg] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(
    null,
  );

  // ========================================================================
  // Effects
  // ========================================================================

  /**
   * Анги сонгох опцион авах
   */
  useEffect(() => {
    setClassroomsLoading(true);
    setClassroomsError(null);
    api<Classroom[]>("/classrooms")
      .then((cs) => {
        setClassrooms(cs);
        if (cs.length > 0) setSelected((s) => s || cs[0].id);
      })
      .catch((e) => setClassroomsError(errMsg(e)))
      .finally(() => setClassroomsLoading(false));
  }, []);

  /**
   * Сонгосон ангийн өгөгдлийг авах
   */
  const loadClass = useCallback(() => {
    // Зөвхөн админ - эцэг эхийн хүсэлт авах
    if (canManage) {
      setParentRequestsLoading(true);
      setParentRequestsError(null);
      api<ParentRequest[]>("/parent/links/pending")
        .then(setParentRequests)
        .catch((e) => setParentRequestsError(errMsg(e)))
        .finally(() => setParentRequestsLoading(false));

      setUnassignedLoading(true);
      setUnassignedError(null);
      api<Unassigned[]>("/classrooms/unassigned-students")
        .then(setUnassigned)
        .catch((e) => setUnassignedError(errMsg(e)))
        .finally(() => setUnassignedLoading(false));
    }

    if (!selected) return;

    // Өнөөдрийн ирцийн мэдээлэл авах
    setRosterLoading(true);
    setRosterError(null);
    api<RosterRow[]>(`/classrooms/${selected}/attendance?date=${today}`)
      .then((rows) => {
        setRoster(rows);
        setMarks(
          Object.fromEntries(
            rows.map((r) => [r.student.id, r.status ?? "PRESENT"]),
          ),
        );
        // Хуучин бичсэн тайлбаруудыг хадгална (өдрийн тайлбар зөвхөн локал
        // төлөвт байдаг тул loadClass() дахин дуудагдахад устахгүй байх ёстой)
        setNotes((prev) =>
          Object.fromEntries(
            rows.map((r) => [r.student.id, prev[r.student.id] ?? ""]),
          ),
        );
      })
      .catch((e) => setRosterError(errMsg(e)))
      .finally(() => setRosterLoading(false));

    // Дүгнэлтийн мэдээлэл авах
    setSummaryLoading(true);
    setSummaryError(null);
    api<Summary>(`/classrooms/${selected}/daily-summary?date=${today}`)
      .then(setSummary)
      .catch((e) => {
        setSummary(null);
        setSummaryError(errMsg(e));
      })
      .finally(() => setSummaryLoading(false));

    setAttentionLoading(true);
    setAttentionError(null);
    api<AttentionResponse>(`/classrooms/${selected}/attention?date=${today}`)
      .then(setAttention)
      .catch((e) => {
        setAttention(null);
        setAttentionError(errMsg(e));
      })
      .finally(() => setAttentionLoading(false));
  }, [selected, today, canManage]);
  useEffect(() => {
    loadClass();
  }, [loadClass]);

  // ========================================================================
  // Handlers
  // ========================================================================

  /**
   * Ирцийг хадгалах
   */
  async function saveAttendance() {
    try {
      // ⚠️ AttendanceSection-д `classroomId` дамжуулснаар тэр компонент
      // ирцийг ӨӨРӨӨ (сонгосон огноо, тайлбар, хоцролтын хугацаатайгаа)
      // бодитоор API руу хадгалдаг болсон. Энд ДАХИН POST хийвэл: (1)
      // өнөөдрийн огноогоор бичигдэх тул хуанлиар өмнөх өдөр засаж байсан
      // бол буруу огноонд бичигдэнэ, (2) note/lateRange алга болно (энэ
      // parent state-д тэдгээр талбар байхгүй) — өөрөөр хэлбэл сая
      // хадгалсан өгөгдлийг дарж бичих эрсдэлтэй. Тиймээс энд зөвхөн бусад
      // dashboard хэсгүүдийг (дүгнэлт/анхаарах жагсаалт) sync хийж,
      // амжилтын мессеж харуулна.
      setMsg({ kind: "success", text: "✓ Ирц хадгалагдлаа" });
      loadClass();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setTimeout(() => setMsg(null), 3000);
    }
  }

  /**
   * Сурагчийг ангид оруулах
   */
  async function enroll(studentId: string) {
    try {
      await api(`/classrooms/${selected}/enroll`, {
        method: "POST",
        body: { studentId },
      });
      loadClass();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  /**
   * Эцэг эхийн холболтыг батлах
   */
  async function verifyParentLink(id: string) {
    try {
      await api(`/parent/links/${id}/verify`, { method: "POST" });
      setMsg({ kind: "success", text: "✓ Эцэг эхийн холболт баталгаажлаа" });
      loadClass();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setTimeout(() => setMsg(null), 3000);
    }
  }

  /**
   * Эцэг эхийн холболтын хүсэлтийг цуцлах
   */
  async function rejectParentLink(id: string) {
    try {
      await api(`/parent/links/${id}/reject`, { method: "POST" });
      setMsg({ kind: "info", text: "Холболтын хүсэлт цуцлагдлаа" });
      loadClass();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setTimeout(() => setMsg(null), 3000);
    }
  }

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <DashboardGreeting />
        <h1 className="text-2xl font-extrabold">Багшийн самбар</h1>
      </div>

      {/* Анги сонгох — sub-tab бүрийн хамгийн дээд хэсэгт үргэлж харагдана,
          учир нь энэ блок tab-уудын АГААС ГАДНА (үргэлж render хийгддэг) байрлана */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 md:flex-row md:items-center md:gap-4 md:p-4">
        <span
          className="text-sm font-semibold text-ink-dim"
          id="classroom-select-label"
        >
          Анги
        </span>
        <ClassroomSelect
          id="classroom-select"
          label="Анги"
          labelledBy="classroom-select-label"
          value={selected}
          onChange={setSelected}
          disabled={classroomsLoading || classrooms.length === 0}
          placeholder="Анги сонгоно уу"
          options={classrooms.map((c) => ({
            id: c.id,
            name: c.name,
            meta: `${c._count.enrollments} сурагч`,
          }))}
        />

        {/* Status Message */}
        {msg && (
          <span
            role="status"
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.kind === "error"
                ? "bg-error/10 text-error"
                : msg.kind === "success"
                  ? "bg-success/10 text-success"
                  : "bg-info/10 text-info"
            }`}
          >
            {msg.kind === "error" ? "⚠ " : ""}
            {msg.text}
          </span>
        )}
      </div>

      {classroomsError && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          <span>⚠ Ангийн жагсаалт ачаалагдсангүй: {classroomsError}</span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}
      {!classroomsLoading && !classroomsError && classrooms.length === 0 && (
        <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-dim">
          Танд оноогдсон анги алга байна
        </p>
      )}

      {/* Sub-tabs: Нүүр / Ирц / Даалгавар */}
      <div
        role="tablist"
        aria-label="Багшийн самбарын хэсгүүд"
        className="flex gap-2 border-b border-line"
      >
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => changeTab(key)}
            className={`min-h-11 rounded-t-lg px-4 text-sm font-bold transition ${
              tab === key
                ? "border-b-2 border-brand-bright text-brand-soft"
                : "text-ink-dim hover:text-ink"
            }`}
          >
            {TAB_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Нүүр — жижиг хэсгүүд бүгд */}
      {tab === "home" && (
        <div className="space-y-6 md:space-y-8">
          {/* Ангийн идэвхийн heatmap — сонгосон ангийн нэгдсэн дүр зураг */}
          {selected && <ClassActivityHeatmap classroomId={selected} />}

          {/* Өнөөдөр хийсэн тест — сурагчдын оройн тэмдэглэгээг тэжээнэ */}
          {selected && <ClassDidTest classroomId={selected} />}

          {/* Summary + Management Sections (Grid) */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Summary Section */}
            <div className="md:col-span-2 lg:col-span-1">
              {summaryError ? (
                <section className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error md:p-6">
                  ⚠ Дүгнэлт ачаалагдсангүй: {summaryError}
                </section>
              ) : (
                <SummarySection summary={summaryLoading ? null : summary} />
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-1">
              {attentionError ? (
                <section className="rounded-2xl border border-error/30 bg-error/10 p-4 text-sm text-error md:p-6">
                  ⚠ Анхаарах жагсаалт ачаалагдсангүй: {attentionError}
                </section>
              ) : (
                <AttentionSection attention={attentionLoading ? null : attention} />
              )}
            </div>

            {/* Unassigned Students (Admin Only) */}
            {canManage && (
              <div>
                <SectionStatus
                  loading={unassignedLoading}
                  error={unassignedError}
                  onRetry={loadClass}
                  empty={false}
                  emptyText=""
                />
                {!unassignedLoading && !unassignedError && (
                  <UnassignedStudentsSection
                    unassigned={unassigned}
                    onEnroll={enroll}
                  />
                )}
              </div>
            )}

            {/* Parent Requests (Admin Only) */}
            {canManage && (
              <div>
                <SectionStatus
                  loading={parentRequestsLoading}
                  error={parentRequestsError}
                  onRetry={loadClass}
                  empty={false}
                  emptyText=""
                />
                {!parentRequestsLoading && !parentRequestsError && (
                  <ParentRequestsSection
                    parentRequests={parentRequests}
                    onVerify={verifyParentLink}
                    onReject={rejectParentLink}
                  />
                )}
              </div>
            )}
          </div>

          {/* Зар тавих — хамгийн доор (хэрэглэгчийн хүсэлтээр) */}
          <AnnouncementCompose />
        </div>
      )}

      {/* Ирц — бүтэн өргөнөөр (owner-ийн хүсэлт) */}
      {tab === "attendance" && (
        <section>
          <SectionStatus
            loading={rosterLoading}
            error={rosterError}
            onRetry={loadClass}
            empty={
              !rosterLoading && !rosterError && !!selected && roster.length === 0
            }
            emptyText="Энэ ангид сурагч алга байна"
          />
          {!rosterLoading && !rosterError && roster.length > 0 && (
            <AttendanceSection
              roster={roster}
              marks={marks}
              notes={notes}
              today={today}
              onMarkChange={(studentId, status) =>
                setMarks((m) => ({ ...m, [studentId]: status }))
              }
              onNoteChange={(studentId, note) =>
                setNotes((n) => ({ ...n, [studentId]: note }))
              }
              onSave={saveAttendance}
              // classroomId дамжуулснаар AttendanceSection "ухаалаг" горимд
              // орж: хуанли, тайлбарыг бодитоор API руу хадгалах, хэн
              // тэмдэглэснийг харуулах, хоцролтын хугацаа сонгох зэрэг бүгд
              // идэвхжинэ (доорх компонентын docstring-ийг үз).
              classroomId={selected}
            />
          )}
        </section>
      )}

      {/* Даалгавар — бүтэн өргөнөөр (owner-ийн хүсэлт): анги сонгогч дээрх
          толгойд аль хэдийн байгаа тул энд зөвхөн сонгосон ангийг дамжуулна. */}
      {tab === "homework" && (
        <section>
          {!selected ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-dim">
              Эхлээд анги сонгоно уу
            </p>
          ) : (
            <AssignmentsSection classroomId={selected} />
          )}
        </section>
      )}
    </div>
  );
}
