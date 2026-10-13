import {
  MAX_ROOMS_PER_USER,
  PRESENCE_TTL_MS,
  PresenceService,
} from './presence.service';
import { PRESENCE_KEY_RE } from './presence.dto';

const USERS: Record<string, Record<string, unknown>> = {
  u1: { firstName: 'Баасанжав', lastName: 'Болд', role: 'TEACHER' },
  u2: { firstName: 'Эмүжин', lastName: 'Улам', role: 'TEACHER_PLUS' },
  ext: {
    firstName: 'Гадны',
    lastName: 'Багш',
    role: 'TEACHER',
    externalTeacherProfile: { userId: 'ext' },
  },
  old: {
    firstName: 'Архив',
    lastName: 'Багш',
    role: 'TEACHER',
    archivedAt: new Date('2026-01-01'),
  },
};

function service() {
  const findUnique = jest.fn(({ where }: { where: { id: string } }) =>
    Promise.resolve(
      USERS[where.id]
        ? { archivedAt: null, externalTeacherProfile: null, ...USERS[where.id] }
        : null,
    ),
  );
  return {
    svc: new PresenceService({ user: { findUnique } } as never),
    findUnique,
  };
}

describe('PresenceService — «хэн засаж байна» (санах ойд, ӨС-д бичихгүй)', () => {
  it('бусдыг харуулна, өөрийгөө биш; нэр/эрхийг кэшлэнэ', async () => {
    const { svc, findUnique } = service();
    const t = 1_000_000;
    await svc.beat('u1', ['exam:t1'], false, t);
    const res = await svc.beat(
      'u2',
      ['exam:t1', 'problem:p1'],
      false,
      t + 1000,
    );
    expect(res.editors).toEqual({
      'exam:t1': [{ name: 'Б. Баасанжав', since: new Date(t).toISOString() }],
      'problem:p1': [],
    });
    await svc.beat('u1', ['exam:t1'], false, t + 45_000);
    expect(findUnique).toHaveBeenCalledTimes(2); // хэрэглэгч тутам нэг удаа
    // since — анх нээсэн мөч хэвээр
    expect(
      (await svc.beat('u2', ['exam:t1'], false, t + 46_000)).editors[
        'exam:t1'
      ][0].since,
    ).toBe(new Date(t).toISOString());
  });

  it('TTL өнгөрсөн эсвэл leave → жагсаалтаас гарна', async () => {
    const { svc } = service();
    const t = 2_000_000;
    await svc.beat('u1', ['grades:t1:c1'], false, t);
    expect(
      (await svc.beat('u2', ['grades:t1:c1'], false, t + PRESENCE_TTL_MS + 1))
        .editors['grades:t1:c1'],
    ).toEqual([]);
    await svc.beat('u1', ['grades:t1:c1'], false, t + PRESENCE_TTL_MS + 2);
    await svc.beat('u1', ['grades:t1:c1'], true, t + PRESENCE_TTL_MS + 3);
    expect(
      (await svc.beat('u2', ['grades:t1:c1'], false, t + PRESENCE_TTL_MS + 4))
        .editors['grades:t1:c1'],
    ).toEqual([]);
  });

  it('гадны багш, архивласан хэрэглэгч — 403 (төвийн багш л)', async () => {
    const { svc } = service();
    await expect(svc.beat('ext', ['exam:t1'])).rejects.toMatchObject({
      status: 403,
    });
    await expect(svc.beat('old', ['exam:t1'])).rejects.toMatchObject({
      status: 403,
    });
    await expect(svc.beat('nobody', ['exam:t1'])).rejects.toMatchObject({
      status: 403,
    });
  });

  it(`нэг хэрэглэгч ${MAX_ROOMS_PER_USER}-аас олон өрөөнд байхгүй — хамгийн хуучин нь гарна`, async () => {
    const { svc } = service();
    const t = 3_000_000;
    for (let i = 0; i <= MAX_ROOMS_PER_USER; i += 1)
      await svc.beat('u1', [`problem:p${i}`], false, t + i);
    const seen = await svc.beat(
      'u2',
      ['problem:p0', `problem:p${MAX_ROOMS_PER_USER}`],
      false,
      t + 100,
    );
    expect(seen.editors['problem:p0']).toEqual([]);
    expect(seen.editors[`problem:p${MAX_ROOMS_PER_USER}`]).toHaveLength(1);
  });

  it('түлхүүрийн хэлбэр', () => {
    for (const ok of [
      'exam:cmabc123',
      'problem:p_1',
      'grades:t1:c1',
      'test-edit:t-1',
    ])
      expect(PRESENCE_KEY_RE.test(ok)).toBe(true);
    for (const bad of [
      'user:u1',
      'exam:',
      'exam:a b',
      'grades:t1:c1:x',
      `exam:${'a'.repeat(41)}`,
    ])
      expect(PRESENCE_KEY_RE.test(bad)).toBe(false);
  });
});
