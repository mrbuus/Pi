import { expect, type Page } from '@playwright/test';
import { formulaSections, formulaSummaries, formulaDetail, seenFormulas } from './formula-fixtures';
export const student = { id: 'synthetic-student', firstName: 'Туршилт', lastName: 'Зохиомол', phone: '99000000' };
export const classroom = { id: 'synthetic-class', name: 'Туршилтын анги', type: 'CLASSROOM', grade: 12, _count: { enrollments: 1 } };
export const mistakeFixture = {
  id: 'mistake-1', problem: { id: 'problem-1', statementText: '$2+2$ хэд вэ?', choices: ['3', '4'], format: 'CHOICE', choiceMode: 'TEXT', imageKey: null },
  givenAnswer: '3', status: 'NEW', reason: null as string | null, note: null as string | null, testTitle: 'Туршилтын тест', formulas: [{ slug: 'square-of-sum', title: 'Нийлбэрийн квадрат', latex: '(a+b)^2=a^2+2ab+b^2' }],
};
export async function mockApi(page: Page, role = 'STUDENT', signedIn = true, mistakes: { emptyToday?: boolean; failPatch?: boolean; failRetryOnce?: boolean; structured?: boolean; paginated?: boolean } = {}) {
  const mistake = structuredClone(mistakeFixture);
  let retryFailed = false;
  const projectMistake = () => mistakes.structured ? { ...mistake, problem: { ...mistake.problem, format: 'FILL_NUMBER', choices: null, choiceMode: null, answerFields: ['a', 'bc'] } } : mistake;

  const calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
  const unexpected: string[] = [], errors: string[] = [];
  const formulas = { empty: false, emptySeen: false, extraCount: 0, printLong: false, listFailures: 0, sectionsFailures: 0, detailFailures: 0, editStatus: 200, seenFailures: 0, listDelayMs: 0, delayedStudent: '', requests: [] as string[] };
  const edited = new Map<string, Record<string, unknown>>();
  let attendance: string | null = null, homework: string | null = null;
  let users: unknown[] = [];
  let goals: { id: string; title: string; description: string }[] = [];
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
    if (method === 'PATCH' && path === '/formulas/synthetic-square-sum') {
      if (!['ADMIN', 'TEACHER_PLUS'].includes(role)) return reply({message: 'Forbidden'}, 403);
      if (formulas.editStatus !== 200) return reply({message: 'Synthetic edit error'}, formulas.editStatus);
      const current = edited.get('synthetic-square-sum') ?? formulaDetail('synthetic-square-sum')!;
      if (body.expectedUpdatedAt !== current.updatedAt) return reply({message: 'Stale edit'}, 409);
      const {expectedUpdatedAt: _version, ...patch} = body;
      const saved = {...current, ...patch, updatedAt: new Date(Date.parse(String(current.updatedAt)) + 1).toISOString()};
      edited.set('synthetic-square-sum', saved);
      return reply(saved);
    }
    if (method === 'GET' && (path === '/formulas'  || path.startsWith('/formulas/'))) {
      formulas.requests.push(path + url.search);
      if (path === '/formulas/sections') {
        if (formulas.sectionsFailures > 0) { formulas.sectionsFailures--; return reply({ message: 'Synthetic sections failure' }, 503); }
        return reply(formulas.empty ? [] : formulaSections);
      }
      if (path === '/formulas/my') {
        const studentId = url.searchParams.get('studentId') ?? student.id;
        if (studentId === formulas.delayedStudent) await new Promise(resolve => setTimeout(resolve, 800));
        if (formulas.seenFailures > 0 || studentId === 'forbidden-child') { formulas.seenFailures--; return reply({ message: 'Synthetic ownership failure' }, 403); }
        return reply(formulas.emptySeen ? { totalFormulas: 3, seenFormulas: 0, items: [] } : seenFormulas(studentId));
      }
      if (path === '/formulas') {
        if (formulas.listDelayMs) await new Promise(resolve => setTimeout(resolve, formulas.listDelayMs));
        if (formulas.listFailures > 0) { formulas.listFailures--; return reply({ message: 'Synthetic catalog failure' }, 503); }
        const rows = [...formulaSummaries, ...Array.from({ length: formulas.extraCount }, (_, i) => ({ ...formulaSummaries[0], id: `synthetic-more-${i}`, slug: `synthetic-more-${i}`, title: `Зохиомол томьёо ${i + 1}`, order: i + 10 }))];
        if (formulas.printLong) rows[0] = { ...rows[0], general: String.raw`\sum_{k=1}^{20}a_k=` + Array.from({ length: 20 }, (_, i) => `a_{${i + 1}}`).join('+') };
        return reply(formulas.empty ? [] : rows.filter(f => !url.searchParams.get('level') || f.level === url.searchParams.get('level')));
      }
      if (!/^\/formulas\/synthetic-(square-sum|cube-sum|linear|unknown)$/.test(path)) { unexpected.push(`${method} ${path}`); return reply({ message: 'Unknown formula contract' }, 501); }
      if (formulas.detailFailures > 0) { formulas.detailFailures--; return reply({ message: 'Synthetic detail failure' }, 503); }
      const slug = decodeURIComponent(path.slice('/formulas/'.length));
      const detail = edited.get(slug) ?? formulaDetail(slug);
      return detail ? reply(detail) : reply({ message: 'Synthetic formula not found' }, 404);
    }
    if (path === '') return reply({ status: 'ok' });
    if (path === '/auth/login') return body.password === '99000000'
      ? reply({ accessToken: 'synthetic-token-never-valid-on-server', role })
      : reply({ message: 'Нэвтрэх мэдээлэл буруу байна' }, 401);
    if (path === '/auth/google/config') return reply({ enabled: false });
    // App shell (2026-09-27): нууцлалын зөвшөөрлийн шалгалт (G17) ба мэдэгдлийн хонх (G27).
    if (path === '/consent/my') return reply({ termsAcceptedAt: '2026-09-01T00:00:00.000Z', privacyVersion: '2026-09-26-draft', guardianConsentAt: null, currentVersion: '2026-09-26-draft', needsConsent: false });
    if (path === '/notifications/my/unread-count') return reply({ count: 0 });
    if (path === '/auth/me') return reply({ ...student, role, studentProfile: { type: 'CLASSROOM', grade: 12 } });
    if (path === '/attempts/my-stats') return reply({ totalAttempts: 12, weakestTags: [] });
    if (path === '/readiness/my') return reply({ index: 62, low: 55, high: 70, dataPoints: 18, effectiveDataPoints: 12, coverage: 35, topics: [{ topic: 'TRIG', title: 'Тригонометр', mastery: 48, measured: true, weight: 0.065, attempts: 8, effectiveAttempts: 5, trend: 'UP' }, { topic: 'DERIV', title: 'Уламжлал', mastery: 72, measured: true, weight: 0.075, attempts: 10, effectiveAttempts: 7, trend: 'FLAT' }, { topic: 'ALG', title: 'Алгебрийн хувиргалт', mastery: 58, measured: true, weight: 0.07, attempts: 5, effectiveAttempts: 4, trend: 'DOWN' }], nextBestTopics: [{ topic: 'TRIG', title: 'Тригонометр', mastery: 48, measured: true, weight: 0.065, attempts: 8, effectiveAttempts: 5, trend: 'UP' }, { topic: 'DERIV', title: 'Уламжлал', mastery: 72, measured: true, weight: 0.075, attempts: 10, effectiveAttempts: 7, trend: 'FLAT' }, { topic: 'ALG', title: 'Алгебрийн хувиргалт', mastery: 58, measured: true, weight: 0.07, attempts: 5, effectiveAttempts: 4, trend: 'DOWN' }], weeklyHistory: Array.from({ length: 8 }, (_, i) => { const d = new Date(Date.UTC(2026, 7, 3 + i * 7)); return { week: d.toISOString().slice(0, 10), index: 50 + i, coverage: 35 }; }) });
    if (path === '/goals' && method === 'GET') return reply(goals);
    if (path === '/goals' && method === 'POST') { const goal = { id: 'synthetic-readiness-goal', title: String(body.title), description: String(body.description) }; goals = [goal]; return reply(goal); }
    if (path === '/goals/synthetic-readiness-goal' && method === 'PATCH') { goals = [{ id: 'synthetic-readiness-goal', title: String(body.title), description: String(body.description) }]; return reply(goals[0]); }
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
    if (path === '/mistakes/my') {
      if (mistakes.paginated && url.searchParams.has('cursor')) return reply({ counts: { NEW: 2, RETRYING: 0, MASTERED: 0 }, byTopic: [{ topic: 'Тоо', count: 2 }], items: [{ ...projectMistake(), id: 'mistake-2' }], nextCursor: null });
      const matches = !url.searchParams.has('status') || url.searchParams.get('status') === mistake.status;
      return reply({ counts: { NEW: mistake.status === 'NEW' ? 1 : 0, RETRYING: mistake.status === 'RETRYING' ? 1 : 0, MASTERED: 0 }, byTopic: [{ topic: 'Тоо', count: 1 }], items: matches ? [projectMistake()] : [], nextCursor: mistakes.paginated ? mistake.id : null });
    }
    if (path === '/mistakes/mistake-1' && method === 'PATCH') {
      if (mistakes.failPatch) return reply({ message: 'Хадгалж чадсангүй' }, 400);
      if ('reason' in body) mistake.reason = body.reason;
      if ('note' in body) mistake.note = body.note;
      return reply({ id: mistake.id, reason: mistake.reason, note: mistake.note });
    }
    if (path === '/mistakes/mistake-1/retry' && method === 'POST') {
      if (mistakes.failRetryOnce && !retryFailed) { retryFailed = true; return reply({ message: 'Дахин оролдоно уу' }, 409); }
      mistake.status = 'RETRYING';
      const correct = mistakes.structured ? body.answer?.a === '3' && body.answer?.bc === '24' : body.answer === 1;
      return reply({ correct, correctAnswer: mistakes.structured ? { a: '3', bc: '24' } : '4', status: 'RETRYING', nextRetryAt: '2026-09-29T16:00:00Z', solutionOutline: correct ? null : '$2+2=4$' });
    }
    if (path === '/mistakes/today') return reply(mistakes.emptyToday ? [] : [projectMistake()]);
    if (path === '/users') { if (method === 'POST') { const user = { id: 'synthetic-new-user', ...body, studentProfile: null, teacherProfile: null, ownedClassrooms: [], email: null, username: null }; users = [user]; return reply({ user }); } return reply(users); }
    if (path === '/parent/children') return reply([{ id: 'synthetic-link', verified: true, student: { ...student, studentProfile: { grade: 12, school: 'Туршилтын сургууль' }, classroom, attendances: [{ date: '2026-09-26', status: 'PRESENT', classroom }], dailyHomeworkMarks: [{ date: '2026-09-26', status: 'DONE', classroom }], testResults: [{ id: 'synthetic-result', totalScore: 8, maxScore: 10, source: 'ONLINE', createdAt: '2026-09-26', test: { title: 'Туршилтын дүн', type: 'EXAM' } }], payments: [], submissions: [] } }]);
    const emptyPaths = ['/announcements/manage', '/tests', '/books', '/classrooms/synthetic-class/test-sessions', '/tests/my-results', '/attendance/my', '/announcements', '/homework-marks/my', '/me/todo-marking', '/parent/links/pending', '/classrooms/unassigned-students', '/catalog/passes', '/payments', '/users/teachers', '/classrooms/synthetic-class/attendance/history'];
    if (emptyPaths.includes(path) || /^\/payments\/months\//.test(path)) return reply([]);
    unexpected.push(`${method} ${path}`);
    return reply({ message: `Unmocked endpoint: ${method} ${path}` }, 501);
  });
  return { calls, formulas, async verify() { expect(unexpected, 'Every backend call must have an explicit synthetic contract').toEqual([]); expect(errors, 'Browser runtime errors').toEqual([]); } };
}
