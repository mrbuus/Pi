import { expect, type Page } from "@playwright/test";
import { mockApi, student, classroom } from "./mock-api";
import type { AuditRole } from "./a11y-routes";

// Additional read-only contracts for the route inventory. Keep these separate
// from feature journeys: unlisted requests still fail the existing strict mock.
const storeProduct = {
  id: "synthetic-product",
  kind: "TEST",
  refId: "synthetic-exam",
  title: "Зохиомол шалгалт",
  price: 100,
  active: true,
  purchaseCount: 1,
};
const at = "2026-09-27T08:00:00.000Z";
const chapter = {
  id: "synthetic-chapter",
  title: "Зохиомол алгебр",
  order: 1,
  subject: "MATH",
  topic: { id: "synthetic-topic", name: "Алгебр", slug: "ALG" },
  bookId: "synthetic-book",
  book: { id: "synthetic-book", title: "Зохиомол ном", code: "SYNTHETIC" },
  _count: { problems: 1, videos: 0, theoryBlocks: 1 },
};
const book = {
  id: "synthetic-book",
  code: "SYNTHETIC",
  title: "Зохиомол ном",
  description: "Хүртээмжийн шалгалтын зохиомол агуулга",
  subject: "MATH",
  chapters: [chapter],
  _count: { chapters: 1 },
};
const problem = {
  id: "synthetic-problem",
  token: "SYN-1",
  n: 1,
  number: 1,
  order: 1,
  format: "CHOICE",
  statementText: "$1+1$ нийлбэрийг сонгоно уу.",
  points: 1,
  choices: ["1", "2", "3", "4"],
  choiceMode: "TEXT",
  imageKey: null,
  chapterId: chapter.id,
};
const exam = {
  id: "synthetic-exam",
  title: "Туршилтын шалгалт",
  type: "CUSTOM",
  subject: "MATH",
  problemCount: 1,
  totalPoints: 1,
  timeLimitMin: 60,
  chapterId: chapter.id,
  groupKey: null,
  variantLabel: null,
  pdfKey: null,
  price: 100,
  problems: [{ problemId: problem.id, order: 1, points: 1, problem }],
  access: [{ classroomId: classroom.id }],
  gradingMode: "AUTO",
  sessionStatus: null,
  createdById: student.id,
  createdAt: at,
  chapter,
  assignedStudents: [],
  classroomId: classroom.id,
};
const studentDetail = {
  ...student,
  role: "STUDENT",
  username: "synthetic-student",
  email: null,
  avatarUrl: null,
  studentCode: "SIE-26-M-0001",
  createdAt: at,
  archivedAt: null,
  studentProfile: {
    type: "CLASSROOM",
    grade: 12,
    school: "Зохиомол сургууль",
    tuitionPlan: "MONTHLY",
    tuitionAmount: 100,
    joinedOn: "2026-09-01",
    leftOn: null,
  },
  currentClassroom: classroom,
  counts: {
    assignmentsCompleted: 1,
    testResults: 1,
    attendanceRecords: 1,
    attempts: 1,
  },
};
const teacher = {
  id: student.id,
  firstName: student.firstName,
  lastName: student.lastName,
  role: "TEACHER",
  teacherProfile: { verifiedAt: at },
};
const group = {
  id: "synthetic-group",
  name: "Зохиомол бүлэг",
  description: "Хүртээмжийн тест",
  teacherId: student.id,
  teacher,
  owner: teacher,
  joinCode: "SYNTEST",
  createdAt: at,
  memberCount: 1,
  members: [
    {
      id: "synthetic-member",
      student: studentDetail,
      studentId: student.id,
      joinedAt: at,
      testResults: [],
    },
  ],
  _count: { members: 1 },
  tests: [exam],
};
const range = { from: "2026-09-01", to: "2026-09-27", days: 27 };
const overview = {
  range,
  dau: 1,
  wau: 1,
  mau: 1,
  avgSessionMs: 60000,
  totalActiveStudents: 1,
  totalProblemsAttempted: 1,
  eventStreamAgeDays: 30,
  lowConfidence: false,
};
const payment = {
  id: "synthetic-payment",
  amount: 100,
  status: "CONFIRMED",
  method: "BANK_TRANSFER",
  forMonth: "2026-09",
  createdAt: at,
  paidAt: at,
};
const days = {
  year: 2026,
  totalActiveDays: 1,
  days: [
    {
      date: "2026-09-27",
      count: 1,
      level: 1,
      isHoliday: false,
      isClassDay: true,
    },
  ],
};
const streak = { currentStreak: 1, longestStreak: 1, totalActiveDays: 1 };
const readRecords: Record<string, unknown> = {
  "/auth/google/status": { enabled: false, linked: false, identity: null },
  "/me/passes": [
    {
      id: "synthetic-user-pass",
      expiresAt: "2026-10-20",
      pass: { name: "Зохиомол эрх", durationDays: 30 },
    },
  ],
  "/passes": [
    {
      id: "synthetic-pass",
      name: "Зохиомол эрх",
      durationDays: 30,
      scope: { all: true },
      price: 100,
      active: true,
      holdersCount: 1,
    },
  ],
  "/reconcile/transactions": { items: [], total: 0 },
  "/books": [book],
  "/books/synthetic-book": book,
  "/books/synthetic-book/chapters": [chapter],
  "/chapters": [chapter],
  "/chapters/synthetic-chapter": chapter,
  "/chapters/synthetic-chapter/problems": [problem],
  "/problems": [problem],
  "/topics": [chapter.topic],
  "/videos": [],
  "/tests": [exam],
  "/tests/synthetic-exam": exam,
  "/teacher-groups/my-groups": [group],
  "/teacher-groups/synthetic-group": group,
  "/tasks/staff-directory": [teacher],
  "/tasks": [],
  "/goals": [
    {
      id: "synthetic-goal",
      studentId: student.id,
      title: "Зохиомол зорилго",
      description: "Синтетик зорилго",
      status: "IN_PROGRESS",
      targetDate: "2026-10-01",
      subject: "MATH",
      createdAt: at,
      updatedAt: at,
    },
  ],
  "/recommend/next": [
    {
      problemId: problem.id,
      topicId: chapter.topic.id,
      score: 1,
      reason: "RIGHT_LEVEL",
    },
  ],
  "/users": [studentDetail],
  "/users/teachers": [teacher],
  "/users/synthetic-student": studentDetail,
  "/users/search": [studentDetail],
  "/classrooms/synthetic-class": {
    ...classroom,
    teacherId: student.id,
    teacher,
    enrollments: [
      {
        id: "synthetic-enrollment",
        student: studentDetail,
        studentId: student.id,
        joinedOn: "2026-09-01",
        leftOn: null,
      },
    ],
    archivedAt: null,
    subject: "MATH",
  },
  "/classrooms/synthetic-class/students": [studentDetail],
  "/students/synthetic-student/notes": [],
  "/students/synthetic-student/attendance": [
    "PRESENT",
    "LATE",
    "ABSENT",
    "EXCUSED",
  ].map((status, index) => ({
    date: `2026-09-${24 + index}`,
    status,
    note: null,
    lateRange: null,
    classroom,
  })),
  "/students/synthetic-student/homework-marks": [
    {
      date: "2026-09-27",
      status: "DONE",
      comment: null,
      updatedAt: at,
      classroom,
    },
  ],
  "/payments/student/synthetic-student": {
    student,
    tuitionPlan: "MONTHLY",
    summary: { expected: 100, totalPaid: 100, outstanding: 0 },
    payments: [payment],
  },
  "/payments/outstanding": [],
  "/activity/student/synthetic-student": days,
  "/activity/student/synthetic-student/streak": streak,
  "/progress/online-students": {
    page: 1,
    pageSize: 200,
    total: 1,
    items: [
      {
        studentId: student.id,
        studentCode: "SIE-26-M-0001",
        name: "Зохиомол Туршилт",
        grade: 12,
        activePass: { name: "Зохиомол эрх", expiresAt: "2026-10-20" },
        lastActiveAt: at,
        problemsAttempted: { last7d: 1, last30d: 1 },
        successRate: 100,
        testsTaken: 1,
        engagement: "ACTIVE",
      },
    ],
  },
  "/progress/student/synthetic-student": {
    student: {
      id: student.id,
      name: "Зохиомол Туршилт",
      studentCode: "SIE-26-M-0001",
      grade: 12,
      school: "Зохиомол сургууль",
    },
    activePass: null,
    passHistory: [],
    streak,
    dailyActivity: days,
    chapters: [
      {
        chapterId: chapter.id,
        title: chapter.title,
        theoryRead: true,
        videosWatched: 0,
        problemsAttempted: 1,
        problemsCorrect: 1,
        successRate: 100,
      },
    ],
    weakestTopics: [],
    tests: [
      {
        testId: exam.id,
        title: exam.title,
        type: "CUSTOM",
        totalScore: 1,
        maxScore: 1,
        createdAt: at,
      },
    ],
  },
  "/progress/student/synthetic-student/timeline": { items: [] },
  "/analytics/overview": overview,
  "/analytics/engagement": {
    range,
    eventStreamAgeDays: 30,
    lowConfidence: false,
    days: [{ date: "2026-09-27", activeStudents: 1 }],
  },
  "/analytics/classrooms": {
    range,
    classrooms: [
      {
        classroomId: classroom.id,
        classroomName: classroom.name,
        enrolled: 1,
        active: 1,
        participationRate: 1,
        avgProblemsPerActiveStudent: 1,
      },
    ],
  },
  "/analytics/topics": {
    range,
    minSample: 10,
    topics: [
      {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        bookTitle: book.title,
        totalAttempts: 1,
        successRate: 1,
        lowSample: true,
      },
    ],
  },
  "/analytics/at-risk": { windowDays: 30, generatedAt: at, students: [] },
  "/audit": { page: 1, pageSize: 30, total: 0, items: [] },
  "/calendar": [],
  "/schedule": [],
  "/schedule/teachers": [teacher],
  "/schedule/classroom/synthetic-class": [],
  "/schedule/me": { classroomId: classroom.id, entries: [] },
  "/schedule/days": [],
  "/schedule/teacher-workdays": { workDays: [], exceptions: [] },
  "/notifications/my/unread-count": { count: 1 },
  "/notifications/my": {
    notifications: [
      {
        id: "synthetic-notification",
        kind: "ANNOUNCEMENT",
        title: "Зохиомол мэдэгдэл",
        body: "Давтлагаа үргэлжлүүлээрэй.",
        link: "/app/tests",
        readAt: null,
        createdAt: at,
      },
    ],
    nextCursor: null,
  },
  "/teacher-groups/unverified": [],
  "/teacher-groups/verified": [],
  "/enrollment-windows": [
    { subject: "MATH", status: "OPEN", availability: "BOTH", note: null },
    {
      subject: "SOCIAL_STUDIES",
      status: "CLOSED",
      availability: "BOTH",
      note: null,
    },
    { subject: "SAT", status: "COMING_SOON", availability: "BOTH", note: null },
  ],
  "/leads": [],
  "/sms/status": {
    configured: false,
    provider: null,
    thisMonthCount: 0,
    thisMonthSegments: 0,
  },
  "/sms/templates": [],
  "/sms/messages": { messages: [], total: 0 },
  "/store/products": [storeProduct],
  "/store/my-purchases": [],
  "/store/admin/products": [storeProduct],
  "/store/admin/purchases": [],
  "/store/admin/revenue": {
    totalPurchases: 0,
    totalRevenue: 0,
    confirmedRevenue: 0,
    pendingRevenue: 0,
  },
  "/tuition/refunds": { refunds: [], total: 0 },
  "/tuition/refund/synthetic-refund": {
    id: "synthetic-refund",
    studentId: student.id,
    classroomId: classroom.id,
    leftOn: "2026-09-27",
    totalLessonDays: 10,
    attendedLessonDays: 5,
    dailyRate: 10,
    owed: 50,
    totalPaid: 100,
    refundAmount: 50,
    shortfall: 0,
    status: "DRAFT",
    warnings: [],
    note: null,
    createdAt: at,
    updatedAt: at,
    student,
    classroom,
    createdBy: teacher,
  },
  "/teacher-hours": {
    month: "2026-09",
    teachers: [
      {
        teacherId: teacher.id,
        teacherName: "Зохиомол багш",
        lessons: 1,
        minutes: 60,
        sessions: [
          {
            date: "2026-09-27",
            classroomName: classroom.name,
            startMinute: 540,
            endMinute: 600,
          },
        ],
      },
    ],
  },
  "/teacher-hours/me": {
    month: "2026-09",
    teachers: [
      {
        teacherId: teacher.id,
        teacherName: "Зохиомол багш",
        lessons: 1,
        minutes: 60,
        sessions: [
          {
            date: "2026-09-27",
            classroomName: classroom.name,
            startMinute: 540,
            endMinute: 600,
          },
        ],
      },
    ],
  },
  "/finance/report": {
    period: "2026-09",
    income: { trainingFees: 100, exams: 0, books: 0, other: 0 },
    totalIncome: 100,
    expenses: {
      salary: 0,
      rent: 0,
      utilities: 0,
      marketing: 0,
      materials: 0,
      equipment: 0,
      other: 0,
    },
    totalExpenses: 0,
    netProfit: 100,
    previousNetProfit: null,
    profitChange: null,
    targetIncome: null,
    collectionRate: null,
  },
  "/finance/expenses": [],
  "/insights/topic-mastery": [
    {
      studentId: student.id,
      studentName: "Зохиомол сурагч",
      topicMasteries: [
        {
          topicId: chapter.topic.id,
          topicName: chapter.topic.name,
          problemCount: 1,
          correctCount: 1,
          masteryRate: 1,
        },
      ],
    },
  ],
  "/videos/chapters": [chapter],
  "/tests/synthetic-exam/edit-info": {
    mode: "FULL",
    reason: "Зохиомол ноорог",
  },
  "/tests/synthetic-exam/results": [],
  "/lessons/chapters": [
    {
      id: chapter.id,
      title: chapter.title,
      order: 1,
      book: chapter.book,
      theoryCount: 1,
      videoCount: 0,
      theoriesRead: 0,
      videosWatched: 0,
      completed: false,
    },
  ],
  "/lessons/synthetic-chapter": {
    chapter: {
      id: chapter.id,
      title: chapter.title,
      order: 1,
      book: chapter.book,
    },
    theories: [
      {
        id: "synthetic-theory",
        title: "Зохиомол онол",
        content: "Нийлбэрийг бодно: $1+1=2$.",
        imageKeys: [],
        order: 1,
      },
    ],
    videos: [],
    problemCount: 1,
    tests: [],
    progress: { theoryRead: [], videosWatched: [], problemsAttempted: 0 },
  },
  "/catalog/preview/books": [book],
  "/catalog/preview/chapters/synthetic-chapter": {
    ...chapter,
    problems: [problem],
  },
};
export async function a11yMock(
  page: Page,
  role: AuditRole,
  signedIn = role !== "PUBLIC",
) {
  // Keep relative date labels and monthly contracts reproducible; timers still run.
  await page.clock.setFixedTime(new Date("2026-09-27T04:00:00.000Z"));
  const base = await mockApi(
    page,
    role === "PUBLIC" ? "STUDENT" : role,
    signedIn,
  );
  const calls: { path: string; method: string; body: unknown }[] = [];
  const denied: string[] = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      path = url.pathname.slice(4),
      method = request.method();
    if (method === "OPTIONS") return route.fallback();
    if (method === "POST" && path === "/events")
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ accepted: 1 }),
      });
    if (method !== "GET") return route.fallback();
    // Users list/teachers and reconcile transaction reads require ADMIN.
    if (
      ["/users", "/users/teachers", "/reconcile/transactions"].includes(path) &&
      role !== "ADMIN"
    ) {
      denied.push(path);
      return route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          statusCode: 403,
          message: "Forbidden resource",
          error: "Forbidden",
        }),
      });
    }
    let record: unknown;
    if (path === "/auth/me")
      record = {
        ...studentDetail,
        role: role === "PUBLIC" ? "STUDENT" : role,
        studentProfile:
          role === "STUDENT" || role === "BUYER"
            ? studentDetail.studentProfile
            : null,
        teacherProfile: role.startsWith("TEACHER")
          ? teacher.teacherProfile
          : null,
      };
    else record = readRecords[path];
    if (record === undefined) return route.fallback();
    calls.push({
      path,
      method,
      body: request.postData() ? request.postDataJSON() : {},
    });
    return route.fulfill({
      status: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "http://127.0.0.1:3370",
      },
      body: JSON.stringify(record),
    });
  });
  return {
    calls: base.calls,
    additionalCalls: calls,
    async verify(expectedDenied: string[] = []) {
      expect(
        [...new Set(denied)].sort(),
        "Unexpected forbidden API calls prevent a successful page audit",
      ).toEqual([...expectedDenied].sort());
      await base.verify();
      expect(await page.locator("body").innerText()).not.toContain(
        "Unmocked endpoint:",
      );
    },
  };
}
