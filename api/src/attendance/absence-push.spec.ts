import { AttendanceService } from './attendance.service';
import { todayUB, dateKey } from '../common/date';

describe('attendance: newly absent -> parent notification', () => {
  function build(before: { status: string } | null, notifyImpl?: jest.Mock) {
    const today = dateKey(todayUB());
    const tx = {
      attendance: {
        findMany: jest.fn().mockResolvedValue(before ? [{ id: 'a0', studentId: 's1', ...before }] : []),
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id: 'a1', ...create })),
      },
    };
    const prisma = {
      enrollment: { findMany: jest.fn().mockResolvedValue([{ studentId: 's1' }]) },
      $transaction: jest.fn((fn) => fn(tx)),
      parentLink: {
        findMany: jest.fn().mockResolvedValue([
          { parentId: 'p1', student: { firstName: 'Бат', lastName: 'Дорж' } },
        ]),
      },
    };
    const notifications = { notify: notifyImpl ?? jest.fn().mockResolvedValue(undefined) };
    const svc = new AttendanceService(prisma as never, {} as never, { record: jest.fn(), recordMany: jest.fn() } as never, notifications as never);
    jest.spyOn(svc as never, 'assertClassAccess').mockResolvedValue(undefined as never);
    jest.spyOn(svc as never, 'attendanceRows').mockResolvedValue([] as never);
    return { svc, prisma, notifications, today };
  }
  const flush = () => new Promise((r) => setImmediate(r));

  it('notifies verified parents once with a push when a student becomes ABSENT today', async () => {
    const { svc, prisma, notifications, today } = build(null);
    await svc.mark('c1', { date: today, entries: [{ studentId: 's1', status: 'ABSENT' }] } as never, 't1', 'TEACHER' as never);
    await flush();
    expect(prisma.parentLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: { in: ['s1'] }, verifiedAt: { not: null } } }),
    );
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    const [ids, n] = notifications.notify.mock.calls[0];
    expect(ids).toEqual(['p1']);
    expect(n.push).toBeDefined();
    expect(n.push.body).not.toMatch(/Бат|Дорж/);
  });

  it('does not re-notify when already ABSENT, or for non-absent statuses', async () => {
    const a = build({ status: 'ABSENT' });
    await a.svc.mark('c1', { date: a.today, entries: [{ studentId: 's1', status: 'ABSENT' }] } as never, 't1', 'TEACHER' as never);
    const b = build(null);
    await b.svc.mark('c1', { date: b.today, entries: [{ studentId: 's1', status: 'PRESENT' }] } as never, 't1', 'TEACHER' as never);
    await flush();
    expect(a.notifications.notify).not.toHaveBeenCalled();
    expect(b.notifications.notify).not.toHaveBeenCalled();
  });

  it('does not notify for back-dated marking', async () => {
    const { svc, notifications } = build(null);
    await svc.mark('c1', { date: '2020-01-06', entries: [{ studentId: 's1', status: 'ABSENT' }] } as never, 't1', 'TEACHER' as never);
    await flush();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('notification failure never fails the attendance request', async () => {
    const { svc, today } = build(null, jest.fn().mockRejectedValue(new Error('boom')));
    await expect(
      svc.mark('c1', { date: today, entries: [{ studentId: 's1', status: 'ABSENT' }] } as never, 't1', 'TEACHER' as never),
    ).resolves.toMatchObject({ marked: 1 });
    await flush();
  });
});
