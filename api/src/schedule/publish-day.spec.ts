import { buildPublishBodies, publishTitle, PublishEntry } from './publish-day';

const e = (o: Partial<PublishEntry>): PublishEntry => ({
  scheduleId: 's',
  classroomId: 'c1',
  classroomName: '12-3 (Баруун 4)',
  teacherId: null,
  startMinute: 900,
  endMinute: 1020,
  room: '501',
  topic: 'Урвуу функц',
  leadTeacher: null,
  assistantTeacher: null,
  ...o,
});

describe('publish-day — хэнд юу очих', () => {
  it('гарчиг: анхны ба дахин нийтлэл', () => {
    expect(publishTitle('2026-10-12', false)).toBe('10-р сарын 12 (Даваа)-ны хуваарь');
    expect(publishTitle('2026-10-12', true)).toContain('өөрчлөгдлөө');
  });

  it('ахлах/туслах багшид өөрийн хичээл, сурагчид өөрийн анги', () => {
    const bodies = buildPublishBodies(
      [
        e({ scheduleId: 'a', leadTeacher: { id: 'lead' }, assistantTeacher: { id: 'asst' } }),
        e({ scheduleId: 'b', classroomId: 'c2', classroomName: '12-4 (Баруун 4)', room: '502', topic: null, teacherId: 'sched' }),
      ],
      new Map([
        ['c1', ['st1', 'st2']],
        ['c2', ['st3']],
      ]),
    );
    expect(bodies.get('lead')).toBe('15:00–17:00, 501 танхим, 12-3, Урвуу функц');
    expect(bodies.get('asst')).toContain('туслах багш');
    expect(bodies.get('sched')).toBe('15:00–17:00, 502 танхим, 12-4');
    expect(bodies.get('st1')).toBe(bodies.get('st2'));
    expect(bodies.get('st3')).not.toContain('12-3');
    expect(bodies.size).toBe(6);
  });

  it('өдрийн оноолттой бол хуваарийн багшид очихгүй', () => {
    const bodies = buildPublishBodies(
      [e({ teacherId: 'sched', leadTeacher: { id: 'other' } })],
      new Map(),
    );
    expect(bodies.has('sched')).toBe(false);
    expect(bodies.has('other')).toBe(true);
  });
});
