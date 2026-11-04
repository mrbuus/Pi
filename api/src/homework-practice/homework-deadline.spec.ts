import { deadlineClosed, ubAt } from './homework-deadline';

describe('Гэрийн даалгаврын хугацаа — туслах функц', () => {
  it('ubAt: УБ-ын огноо + 24 цаг → UTC', () => {
    expect(ubAt('2026-11-05', '21:00').toISOString()).toBe('2026-11-05T13:00:00.000Z');
    expect(ubAt('2026-11-05', '00:00').toISOString()).toBe('2026-11-04T16:00:00.000Z');
  });

  it('deadlineClosed: зөвхөн «хаагдана» + хугацаа өнгөрсөн үед', () => {
    const dueAt = new Date('2026-11-05T13:00:00Z');
    const after = dueAt.getTime() + 1;
    expect(deadlineClosed(null, after)).toBe(false);
    expect(deadlineClosed({ dueAt, allowLate: true }, after)).toBe(false);
    expect(deadlineClosed({ dueAt, allowLate: false }, dueAt.getTime() - 1)).toBe(false);
    expect(deadlineClosed({ dueAt, allowLate: false }, after)).toBe(true);
  });
});
