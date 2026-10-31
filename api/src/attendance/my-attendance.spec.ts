import { AttendanceService } from './attendance.service';

/** GET /attendance/my — сурагчид lateRange очно, note ХЭЗЭЭ Ч үгүй (СУРАГЧ V2, 2026-10-31) */
describe('AttendanceService.myAttendance', () => {
  it('зөвхөн өөрийн мөр; lateRange сонгоно, note сонгохгүй', async () => {
    const findMany = jest.fn(async () => []);
    const svc = new AttendanceService({ attendance: { findMany } } as never, {} as never, {} as never);
    await svc.myAttendance('s1', '2026-10-01', '2026-10-31');
    const args = (findMany.mock.calls[0] as unknown[])[0] as {
      where: Record<string, unknown>;
      select: Record<string, unknown>;
    };
    expect(args.where.studentId).toBe('s1');
    expect(args.select).toMatchObject({ date: true, status: true, lateRange: true });
    expect(args.select).not.toHaveProperty('note');
  });
});
