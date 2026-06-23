"use client";

import { useCallback, useEffect, useState } from "react";
import AnnouncementCompose from "@/components/AnnouncementCompose";
import ClassDidTest from "@/components/ClassDidTest";
import AttendanceSection from "@/components/TeacherDashboard/AttendanceSection";
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
interface Assignment {
  id: string;
  title: string;
  type: string;
  createdAt: string;
}
interface SubmissionRow {
  student: { id: string; firstName: string; lastName: string };
  state: string;
  note: string | null;
}
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
export default function TeacherDashboard() {
  // ========================================================================
  // State
  // ========================================================================
  const today = new Date().toISOString().slice(0, 10);
  const role = typeof window !== "undefined" ? getRole() : null;
  const canManage = role === "ADMIN" || role === "TEACHER_PLUS";

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [openAssignment, setOpenAssignment] = useState<string>("");
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [unassigned, setUnassigned] = useState<Unassigned[]>([]);
  const [parentRequests, setParentRequests] = useState<ParentRequest[]>([]);
  const [colorTags, setColorTags] = useState<
    Record<string, { color: string; note: string | null }>
  >({});
  const [newTitle, setNewTitle] = useState("");
  const [msg, setMsg] = useState("");

  // ========================================================================
  // Effects
  // ========================================================================

  /**
   * Анги сонгох опцион авах
   */
  useEffect(() => {
    api<Classroom[]>("/classrooms").then((cs) => {
      setClassrooms(cs);
      if (cs.length > 0) setSelected((s) => s || cs[0].id);
    });
  }, []);

  /**
   * Сонгосон ангийн өгөгдлийг авах
   */
  const loadClass = useCallback(() => {
    // Зөвхөн админ - эцэг эхийн хүсэлт авах
    if (canManage) {
      api<ParentRequest[]>("/parent/links/pending")
        .then(setParentRequests)
        .catch(() => {});
    }

    if (!selected) return;

    // Өнөөдрийн ирцийн мэдээлэл авах
    api<RosterRow[]>(`/classrooms/${selected}/attendance?date=${today}`).then(
      (rows) => {
        setRoster(rows);
        setMarks(
          Object.fromEntries(
            rows.map((r) => [r.student.id, r.status ?? "PRESENT"]),
          ),
        );
      },
    );

    // Оюутны өнгийн шошго авах
    api<{ studentId: string; color: string; note: string | null }[]>(
      `/classrooms/${selected}/color-tags`,
    )
      .then((tags) => {
        const map: Record<string, { color: string; note: string | null }> = {};
        tags.forEach((t) => (map[t.studentId] = { color: t.color, note: t.note }));
        setColorTags(map);
      })
      .catch(() => {});

    // Даалгаврыг авах
    api<Assignment[]>(`/classrooms/${selected}/assignments`).then(
      setAssignments,
    );

    // Дүгнэлтийн мэдээлэл авах
    api<Summary>(`/classrooms/${selected}/daily-summary?date=${today}`)
      .then(setSummary)
      .catch(() => setSummary(null));

    // Зөвхөн админ - ангид ороогүй сурагч авах
    if (canManage) {
      api<Unassigned[]>("/classrooms/unassigned-students").then(setUnassigned);
    }
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
      await api(`/classrooms/${selected}/attendance`, {
        method: "POST",
        body: {
          date: today,
          entries: roster.map((r) => ({
            studentId: r.student.id,
            status: marks[r.student.id],
          })),
        },
      });
      setMsg("✓ Ирц хадгалагдлаа");
      loadClass();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Алдаа");
    }
  }

  /**
   * Шинэ даалгавар үүсгэх
   */
  async function createAssignment() {
    if (!newTitle.trim()) return;
    await api(`/classrooms/${selected}/assignments`, {
      method: "POST",
      body: { title: newTitle, type: "DAILY" },
    });
    setNewTitle("");
    loadClass();
  }

  /**
   * Даалгаврын илгээлтүүдийг авах
   */
  async function openRoster(assignmentId: string) {
    setOpenAssignment(assignmentId);
    setSubmissions(await api(`/assignments/${assignmentId}/submissions`));
  }

  /**
   * Даалгаврын илгээлтийг үнэлэх
   */
  async function review(studentId: string, action: string) {
    await api(`/assignments/${openAssignment}/review`, {
      method: "POST",
      body: { studentId, action },
    });
    setSubmissions(await api(`/assignments/${openAssignment}/submissions`));
  }

  /**
   * Сурагчийг ангид оруулах
   */
  async function enroll(studentId: string) {
    await api(`/classrooms/${selected}/enroll`, {
      method: "POST",
      body: { studentId },
    });
    loadClass();
  }

  /**
   * Эцэг эхийн холболтыг батлах
   */
  async function verifyParentLink(id: string) {
    await api(`/parent/links/${id}/verify`, { method: "POST" });
    setMsg("✓ Эцэг эхийн холболт баталгаажлаа");
    setTimeout(() => setMsg(""), 3000);
    loadClass();
  }

  /**
   * Эцэг эхийн холболтын хүсэлтийг цуцлах
   */
  async function rejectParentLink(id: string) {
    await api(`/parent/links/${id}/reject`, { method: "POST" });
    setMsg("Холболтын хүсэлт цуцлагдлаа");
    setTimeout(() => setMsg(""), 3000);
    loadClass();
  }

  // ========================================================================
  // Render
  // ========================================================================

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header + Classroom Selector */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <h1 className="text-2xl font-extrabold">Багшийн самбар</h1>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#0b142e] px-3 py-2 text-sm focus:border-brand-bright"
        >
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c._count.enrollments} сурагч)
            </option>
          ))}
        </select>

        {/* Status Message */}
        {msg && (
          <span className="rounded-lg bg-teal-400/10 px-3 py-2 text-sm text-teal-300">
            {msg}
          </span>
        )}
      </div>

      {/* Ирц — багшийн өдөр тутмын гол үйлдэл (хамгийн дээр) */}
      <AttendanceSection
        roster={roster}
        marks={marks}
        colorTags={colorTags}
        today={today}
        onMarkChange={(studentId, status) =>
          setMarks((m) => ({ ...m, [studentId]: status }))
        }
        onSave={saveAttendance}
        onColorTagUpdate={loadClass}
      />

      {/* Өнөөдөр хийсэн тест — сурагчдын оройн тэмдэглэгээг тэжээнэ */}
      {selected && <ClassDidTest classroomId={selected} />}

      {/* Assignments Section */}
      <AssignmentsSection
        assignments={assignments}
        submissions={submissions}
        openAssignmentId={openAssignment}
        newTitle={newTitle}
        onNewTitleChange={setNewTitle}
        onCreate={createAssignment}
        onOpen={openRoster}
        onReview={review}
      />

      {/* Summary + Management Sections (Grid) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Summary Section */}
        <div className="md:col-span-2 lg:col-span-1">
          <SummarySection summary={summary} />
        </div>

        {/* Unassigned Students (Admin Only) */}
        {canManage && (
          <UnassignedStudentsSection
            unassigned={unassigned}
            onEnroll={enroll}
          />
        )}

        {/* Parent Requests (Admin Only) */}
        {canManage && (
          <ParentRequestsSection
            parentRequests={parentRequests}
            onVerify={verifyParentLink}
            onReject={rejectParentLink}
          />
        )}
      </div>

      {/* Зар тавих — хамгийн доор (хэрэглэгчийн хүсэлтээр) */}
      <AnnouncementCompose />
    </div>
  );
}
