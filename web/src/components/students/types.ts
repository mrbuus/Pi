// Сурагчийн жагсаалт/дэлгэрэнгүй хуудсуудын хуваалцсан хэлбэрүүд + туслах функцууд.
// Backend-тэй тохирсон эсэхийг өөрчлөхийн өмнө users.service.ts (getUserDetail,
// listUsers, updateProfile), payments.service.ts (studentHistory, outstanding),
// notes.service.ts, classrooms.service.ts (unassignedStudents, list)-той тулгаж
// шалгаарай.

export type TuitionPlanValue = "FULL_YEAR" | "INSTALLMENT" | "MONTHLY" | "UNKNOWN";

// Ганц сурагчийн StudentProfile — talbar бүр optional, учир нь жагсаалтын
// endpoint (GET /users?role=STUDENT) дэлгэрэнгүй хуудасны (GET /users/:id)
// адил бүрэн select буцаах эсэх нь баталгаагүй (энэ багц зэрэгцээ хөгжиж байна).
export interface StudentProfileLite {
  type?: "CLASSROOM" | "ONLINE";
  grade?: number | null;
  school?: string | null;
  branch?: string | null;
  section?: string | null;
  tuitionPlan?: TuitionPlanValue | null;
  tuitionAmount?: number | null;
  tuitionNote?: string | null;
  fatherPhone?: string | null;
  motherPhone?: string | null;
  guardianNote?: string | null;
  activatedAt?: string | null;
  joinedOn?: string | null;
  leftOn?: string | null;
}

export interface ClassroomLite {
  id: string;
  name: string;
  grade?: number | null;
}

// Жагсаалтын нэг мөр (GET /users?role=STUDENT)
export interface StudentListItem {
  id: string;
  studentCode?: string | null;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  role: string;
  studentProfile?: StudentProfileLite | null;
  currentClassroom?: ClassroomLite | null;
}

// Дэлгэрэнгүй хуудас (GET /users/:id → users.service.getUserDetail)
export interface StudentDetailData {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  role: string;
  avatarUrl?: string | null;
  studentCode?: string | null;
  createdAt?: string;
  studentProfile: StudentProfileLite | null;
  currentClassroom: ClassroomLite | null;
  counts: {
    assignmentsCompleted: number;
    testResults: number;
    attendanceRecords: number;
    attempts: number;
  };
}

export interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED" | "REVERSED";
  description?: string | null;
  forMonth?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

// GET /payments/student/:id (payments.service.studentHistory)
export interface StudentPaymentHistory {
  student: { id: string; firstName: string; lastName: string; phone?: string | null };
  tuitionPlan: TuitionPlanValue | null;
  tuitionNote?: string | null;
  summary: { expected: number; totalPaid: number; outstanding: number };
  payments: PaymentRow[];
}

// StudentNote (notes.service — prisma model шууд буцаана)
export type StudentNoteType = "GENERAL" | "PAYMENT";

export interface StudentNote {
  id: string;
  studentId: string;
  type: StudentNoteType;
  body: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolvedById?: string | null;
}

export function fullName(s: { firstName: string; lastName: string }): string {
  return `${s.lastName} ${s.firstName}`.trim();
}

export function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

export function money(amount: number): string {
  return `${amount.toLocaleString("en-US")}₮`;
}

// Сурагчийн код: SIE-<2 оронтой жил>-<хичээлийн үсэг M/N/B>-<дугаар>
// (api/src/common/codes.ts generateStudentCode-той тохирно) — "subject"
// шүүлтүүрийг backend дээр тусдаа талбар нэмэлгүйгээр энэ кодоос гаргана.
export function subjectFromCode(code?: string | null): "M" | "N" | "B" | null {
  if (!code) return null;
  const m = /^SIE-\d{2}-([MNB])-\d+$/.exec(code);
  return (m?.[1] as "M" | "N" | "B") ?? null;
}

export const SUBJECT_LABEL: Record<"M" | "N" | "B", string> = {
  M: "Математик",
  N: "Нийгэм судлал",
  B: "Аль аль",
};

export const TUITION_PLAN_LABEL: Record<TuitionPlanValue, string> = {
  FULL_YEAR: "Бүтэн жил",
  INSTALLMENT: "Хуваан төлөх",
  MONTHLY: "Сар бүр",
  UNKNOWN: "Тодорхойгүй",
};

export function isoDateInput(value?: string | null): string {
  return value ? value.slice(0, 10) : "";
}

/** Одоогийн эрхээр эцэг эхийн утас, төлбөрийн бүрэн эрх харагдах эсэх (SPEC — эрхийн матриц). */
export function canSeeGuardianPhones(role: string | null): boolean {
  return role === "ADMIN" || role === "TEACHER_PLUS";
}

/** Сурагчийн профайл засах (нэр/утас/анги/төлбөрийн багц…) эрхтэй эсэх. */
export function canEditProfile(role: string | null): boolean {
  return role === "ADMIN" || role === "TEACHER_PLUS";
}
