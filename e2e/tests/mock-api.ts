import { expect, type Page } from '@playwright/test';
export const student = { id: 'synthetic-student', firstName: 'Туршилт', lastName: 'Зохиомол', phone: '99000000' };
export const classroom = { id: 'synthetic-class', name: 'Туршилтын анги', type: 'CLASSROOM', grade: 12, _count: { enrollments: 1 } };
export async function mockApi(page: Page, role = 'STUDENT', signedIn = true) {
  const calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
  const unexpected: string[] = [], errors: string[] = [];
  let attendance: string | null = null, homework: string | null = null;
  let users: unknown[] = [];
  let notificationPreferences = { userId: 'synthetic-parent', emailWeekly: true, emailReminders: true };
  page.on('pageerror', e => errors.push(e.message));
  if (signedIn) await page.addInitScript(role => {
    localStorage.setItem('pi_token', 'synthetic-token-never-valid-on-server');
    localStorage.setItem('pi_role', role);
  }, role);
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      if (url.origin === 'http://127.0.0.1:3370') return route.continue();
      unexpected.push(`External request blocked: ${url.origin}${url.pathname}`);
      return route.abort();
    }
    const path = url.pathname.slice(4), method = req.method();
    const headers = { 'access-control-allow-origin': 'http://127.0.0.1:3370', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'content-type': 'application/json' };
    const reply = (body: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(body) });
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const body = req.postData() ? req.postDataJSON() : {};
    calls.push({ path, method, body });
    if (path === '') return reply({ status: 'ok' });
    if (path === '/auth/login') return body.password === '99000000'
      ? reply({ accessToken: 'synthetic-token-never-valid-on-server', role })
      : reply({ message: 'Нэвтрэх мэдээлэл буруу байна' }, 401);
    if (path === '/auth/google/config') return reply({ enabled: false });
    // App shell (2026-09-27): нууцлалын зөвшөөрлийн шалгалт (G17) ба мэдэгдлийн хонх (G27).
    if (path === '/consent/my') return reply({ termsAcceptedAt: '2026-09-01T00:00:00.000Z', privacyVersion: '2026-09-26-draft', guardianConsentAt: null, currentVersion: '2026-09-26-draft', needsConsent: false });
    if (path === '/notifications/my/unread-count') return reply({ count: 0 });
    if (path === '/notifications/settings' && method === 'GET') return reply(notificationPreferences);
    if (path === '/notifications/settings' && method === 'PATCH') { notificationPreferences = { ...notificationPreferences, ...body }; return reply(notificationPreferences); }
    if (path.startsWith('/parents/weekly-report')) return reply({ student: { firstName: 'Туршилт', lastName: 'Зохиомол' }, week: { start: '2026-09-21', end: '2026-09-27' }, snapshotAt: '2026-09-27T12:00:00.000Z', attendance: { present: 4, absent: 1, excused: 0 }, testResultsComplete: true, testResultLimit: null, tests: [{ title: 'Туршилтын дүн', score: 8, maxScore: 10, createdAt: '2026-09-23T00:00:00.000Z' }], practiceCount: 6, homework: { assignments: { done: 2, notDone: 1, items: [{ title: 'Туршилтын даалгавар', done: true }] }, dailyMarks: { done: 1, partial: 0, notDone: 0, unmarked: 0 } }, topics: { best: { topic: 'Алгебр', rate: 0.9 }, weakest: { topic: 'Геометр', rate: 0.4 }, complete: true, sampleLimit: null }, nextWeekSchedule: [{ date: '2026-09-28', startMinute: 540, endMinute: 600, room: '2-р өрөө', classroom: 'Туршилтын анги' }] });
    if (path === '/auth/me') return reply({ ...student, role, studentProfile: { type: 'CLASSROOM', grade: 12 } });
    if (path === '/attempts/my-stats') return reply({ totalAttempts: 12, weakestTags: [] });
    if (path === '/activity/classroom/synthetic-class') return reply({ year: 2026, totalStudents: 1, days: [] });
    if (path === '/activity/me') return reply({ year: 2026, totalActiveDays: 0, days: [] });
    if (path === '/activity/streak') return reply({ currentStreak: 0, longestStreak: 0, totalActiveDays: 0 });
    if (path === '/tuition/paid-until/my') return reply({ paidUntil: '2026-10-20T00:00:00.000Z' });
    if (path.startsWith('/tuition/paid-until/')) return reply({ paidUntil: '2026-10-20T00:00:00.000Z' });
    if (path === '/payments/my') return reply([{ id: 'synthetic-payment', amount: 100, status: 'CONFIRMED', method: 'BANK_TRANSFER', forMonth: '2026-09', paidAt: '2026-09-01T00:00:00Z', createdAt: '2026-09-01T00:00:00Z' }]);
    if (path === '/classrooms') return reply([classroom]);
    if (path === '/classrooms/synthetic-class/attendance') {
      if (method === 'POST') { attendance = body.entries[0].status; return reply({ count: 1 }); }
      return reply([{ student, status: attendance }]);
    }
    if (path === '/classrooms/synthetic-class/homework-marks') return reply([{ student, status: homework, comment: null, updatedAt: null }]);
    if (path === '/classrooms/synthetic-class/homework-marks/synthetic-student' && method === 'PATCH') {
      homework = body.status; return reply({ status: homework, comment: body.comment ?? null, updatedAt: '2026-09-26T00:00:00Z' });
    }
    if (path === '/classrooms/synthetic-class/daily-summary') return reply({ stats: { studentsTotal: 1, studentsMarked: 0, totalAttempts: 0, byState: {}, byChapter: {} } });
    if (path === '/classrooms/synthetic-class/attention') return reply({ date: '2026-09-26', windowDays: 30, rows: [], totals: { flagged: 0, students: 1 } });
    if (path === '/tests/synthetic-exam') return reply({ id: 'synthetic-exam', title: 'Туршилтын шалгалт', problemCount: 1, totalPoints: 1, timeLimitMin: 60, gradingMode: 'AUTO', sessionStatus: null });
    if (path === '/tests/synthetic-exam/start') return reply({ session: { status: 'IN_PROGRESS', remainingSec: 3600, leaveCount: 0 }, problems: [{ id: 'synthetic-problem', format: 'CHOICE', statementText: '$1+1$ нийлбэрийг сонгоно уу.', points: 1, choiceMode: 'LETTER', choices: ['A', 'B', 'C'] }] });
    if (path === '/tests/synthetic-exam/session' && method === 'PATCH') return reply({ status: 'IN_PROGRESS', remainingSec: 3550, leaveCount: 0 });
    if (path === '/tests/synthetic-exam/submit') return reply({ result: { totalScore: 1, maxScore: 1 } });
    if (path === '/tests/synthetic-exam/review') return reply({ result: { totalScore: 1, maxScore: 1 }, leaveCount: 0, items: [{ n: 1, points: 1, chapterTitle: 'Тоо', statementText: '$1+1$', answered: true, correct: true, myAnswer: 'A' }] });
    if (path === '/users') { if (method === 'POST') { const user = { id: 'synthetic-new-user', ...body, studentProfile: null, teacherProfile: null, ownedClassrooms: [], email: null, username: null }; users = [user]; return reply({ user }); } return reply(users); }
    if (path === '/parent/children') return reply([{ id: 'synthetic-link', verified: true, student: { ...student, studentProfile: { grade: 12, school: 'Туршилтын сургууль' }, classroom, attendances: [{ date: '2026-09-26', status: 'PRESENT', classroom }], dailyHomeworkMarks: [{ date: '2026-09-26', status: 'DONE', classroom }], testResults: [{ id: 'synthetic-result', totalScore: 8, maxScore: 10, source: 'ONLINE', createdAt: '2026-09-26', test: { title: 'Туршилтын дүн', type: 'EXAM' } }], payments: [], submissions: [] } }]);
    const emptyPaths = ['/announcements/manage', '/tests', '/books', '/classrooms/synthetic-class/test-sessions', '/tests/my-results', '/attendance/my', '/announcements', '/homework-marks/my', '/me/todo-marking', '/parent/links/pending', '/classrooms/unassigned-students', '/catalog/passes', '/payments', '/users/teachers', '/classrooms/synthetic-class/attendance/history'];
    if (emptyPaths.includes(path) || /^\/payments\/months\//.test(path)) return reply([]);
    unexpected.push(`${method} ${path}`);
    return reply({ message: `Unmocked endpoint: ${method} ${path}` }, 501);
  });
  return { calls, async verify() { expect(unexpected, 'Every backend call must have an explicit synthetic contract').toEqual([]); expect(errors, 'Browser runtime errors').toEqual([]); } };
}
