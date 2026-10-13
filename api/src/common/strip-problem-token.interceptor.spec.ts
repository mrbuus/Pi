import { lastValueFrom, of } from 'rxjs';
import {
  StripProblemTokenInterceptor,
  stripProblemTokens,
} from './strip-problem-token.interceptor';

const payload = {
  items: [
    { id: 'p1', token: '1000-S10A-01', statementText: 'x', format: 'CHOICE' },
    { attempt: 1, problem: { token: '100-23-05', chapter: { title: 'Б' } } },
  ],
  timeline: [{ kind: 'ATTEMPT', problemToken: '100-23-05', chapterTitle: 'Б' }],
  todo: { problems: [{ index: 1, problemId: 'p', token: 'T-1' }] },
  // өөр утгатай токенууд хөндөгдөхгүй
  exercise: { mode: 'match', token: 'signed.challenge', prompt: null, options: [] },
  calendar: { token: 'abc123' },
  createdAt: new Date('2026-10-08T00:00:00Z'),
};

function run(role: string | undefined, body: unknown) {
  const ctx = {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => ({ user: role ? { role } : undefined }) }),
  };
  return lastValueFrom(
    new StripProblemTokenInterceptor().intercept(ctx as never, { handle: () => of(body) }),
  );
}

describe('Бодлогын код (token) сурагчид очихгүй', () => {
  it.each(['STUDENT', 'PARENT', 'BUYER', undefined])('%s: бүх бодлогын код хасагдана', async (role) => {
    const out = (await run(role, payload)) as typeof payload;
    const json = JSON.stringify(out);
    expect(json).not.toContain('1000-S10A-01');
    expect(json).not.toContain('100-23-05');
    expect(json).not.toContain('T-1');
    expect(json).not.toContain('problemToken');
    expect(out.exercise.token).toBe('signed.challenge');
    expect(out.calendar.token).toBe('abc123');
    expect(out.createdAt).toBeInstanceOf(Date);
    expect(out.items[0]).toMatchObject({ id: 'p1', statementText: 'x' });
  });

  it.each(['ADMIN', 'TEACHER_PLUS', 'TEACHER'])('%s: ажилтанд хэвээр', async (role) => {
    expect(await run(role, payload)).toBe(payload);
  });

  it('эх объектыг өөрчлөхгүй (кэштэй хариу эвдрэхгүй)', () => {
    const copy = JSON.parse(JSON.stringify(payload));
    stripProblemTokens(payload);
    expect(JSON.parse(JSON.stringify(payload))).toEqual(copy);
  });
});
