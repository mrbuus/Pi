import { VideosService } from './videos.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
import { canAccessVideoChapter } from '../common/access';
jest.mock('../common/access', () => ({
  ...jest.requireActual('../common/access'),
  canAccessVideoChapter: jest.fn(),
  TEACHER_ROLES: ['ADMIN', 'TEACHER_PLUS', 'TEACHER'],
}));
const access = jest.mocked(canAccessVideoChapter);
describe('video mapping, ownership and disclosure', () => {
  const video = {
    id: 'v',
    title: 'Solution',
    chapterId: 'c',
    problemId: 'p',
    createdById: 'owner',
    s3Key: 'https://youtu.be/AbCdEfGhI_1',
    duration: null,
    createdAt: new Date(),
    deletedAt: null,
  };
  let db: {
    user: { findUnique: jest.Mock };
    chapter: { findUnique: jest.Mock };
    problem: { findUnique: jest.Mock };
    video: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      findMany: jest.Mock;
    };
    auditLog: { create: jest.Mock };
    learningEvent: { create: jest.Mock };
    $executeRaw: jest.Mock;
    $transaction: jest.Mock;
  };
  let service: VideosService;
  beforeEach(() => {
    db = {
      user: { findUnique: jest.fn(({ where }) => ({ role: where.id === 'admin' ? Role.ADMIN : where.id === 'curator' ? Role.TEACHER_PLUS : ['pupil', 'buyer'].includes(where.id) ? Role.STUDENT : Role.TEACHER, archivedAt: null, externalTeacherProfile: null })) },
      chapter: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c', deletedAt: null }),
      },
      problem: {
        findUnique: jest.fn().mockResolvedValue({
          chapterId: 'c',
          deletedAt: null,
          chapter: {
            id: 'c',
            freePreview: true,
            bookId: null,
            deletedAt: null,
          },
        }),
      },
      video: {
        findUnique: jest.fn().mockResolvedValue(video),
        create: jest.fn().mockResolvedValue(video),
        update: jest.fn().mockResolvedValue(video),
        findMany: jest.fn().mockResolvedValue([video]),
      },
      auditLog: { create: jest.fn() },
      learningEvent: { create: jest.fn() },
      $executeRaw: jest.fn(),
      $transaction: jest.fn(),
    };
    db.$transaction.mockImplementation((callback: (tx: typeof db) => unknown) =>
      callback(db),
    );
    service = new VideosService(db as unknown as PrismaService);
    access.mockResolvedValue(true);
  });
  it('rejects teacher mapping and edits of other or legacy ownerless video', async () => {
    await expect(
      service.create(
        { title: 'x', url: video.s3Key, chapterId: 'c', problemId: 'p' },
        'owner',
        Role.TEACHER,
      ),
    ).rejects.toThrow();
    await expect(
      service.update('v', { title: 'x' }, 'other', Role.TEACHER),
    ).rejects.toThrow();
    db.video.findUnique.mockResolvedValue({ ...video, createdById: null });
    await expect(
      service.update('v', { title: 'x' }, 'owner', Role.TEACHER),
    ).rejects.toThrow();
    expect(db.video.update).not.toHaveBeenCalled();
  });
  it('allows own chapter video metadata edits, and plus detach with atomic audit', async () => {
    await service.update(
      'v',
      { title: 'Own correction' },
      'owner',
      Role.TEACHER,
    );
    expect(db.auditLog.create).toHaveBeenCalled();
    await service.update(
      'v',
      { problemId: null },
      'curator',
      Role.TEACHER_PLUS,
    );
    expect(db.video.update).toHaveBeenLastCalledWith({
      where: { id: 'v' },
      data: { chapterId: 'c', problemId: null },
    });
  });
  it('rejects cross-chapter attachment or chapter move retaining incompatible mapping', async () => {
    db.problem.findUnique.mockResolvedValue({
      chapterId: 'other',
      deletedAt: null,
    });
    await expect(
      service.update('v', { chapterId: 'other' }, 'curator', Role.TEACHER_PLUS),
    ).resolves.toBeDefined();
    await expect(
      service.update(
        'v',
        { problemId: 'different' },
        'curator',
        Role.TEACHER_PLUS,
      ),
    ).rejects.toThrow();
  });
  it('metadata list exposes neither key nor media, deliberate open records assistance', async () => {
    expect(await service.listByProblem('p', 'pupil', Role.STUDENT)).toEqual([
      {
        id: 'v',
        title: 'Solution',
        duration: null,
        chapterId: 'c',
        problemId: 'p',
      },
    ]);
    expect(db.learningEvent.create).not.toHaveBeenCalled();
    const opened = await service.openProblemVideo(
      'v',
      'p',
      'pupil',
      Role.STUDENT,
    );
    expect(opened.media?.kind).toBe('YOUTUBE');
    const recorded = (
      db.learningEvent.create.mock.calls as unknown[][]
    )[0][0] as { data: { userId: string; type: string; problemId: string } };
    expect(recorded.data).toMatchObject({
      userId: 'pupil',
      type: 'HINT_USED',
      problemId: 'p',
    });
  });
  it('denies unentitled buyer before querying solution videos', async () => {
    access.mockResolvedValue(false);
    await expect(
      service.listByProblem('p', 'buyer', Role.BUYER),
    ).rejects.toThrow();
    expect(db.video.findMany).not.toHaveBeenCalled();
  });
  it('soft deletes inside the audit transaction and prevents teacher deletion', async () => {
    await expect(service.remove('v', 'owner', Role.TEACHER)).rejects.toThrow();
    await service.remove('v', 'admin', Role.ADMIN);
    const deletion = (db.video.update.mock.calls as unknown[][])[0][0] as {
      where: { id: string };
      data: { deletedAt: Date };
    };
    expect(deletion.where).toEqual({ id: 'v' });
    expect(deletion.data.deletedAt).toBeInstanceOf(Date);
    expect(db.auditLog.create).toHaveBeenCalled();
  });
});
