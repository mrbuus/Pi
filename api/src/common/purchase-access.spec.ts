import {
  canAccessChapter,
  canAccessVideoChapter,
  collectContentScope,
  collectPassScope,
  activePurchaseWhere,
} from './access';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
const chapter = { id: 'chapter', bookId: 'book', freePreview: false };
type Purchase = {
  grantedAt: Date | null;
  expiresAt: Date | null;
  productItem: { kind: 'BOOK' | 'TEST'; refId: string; includesVideo: boolean };
};
function fixture(purchases: Purchase[]) {
  type Where = {
    userId: string;
    grantedAt: { lte: Date };
    OR: unknown;
    productItem?: { kind: string; refId: string; includesVideo?: boolean };
  };
  const visible = (where: Where) =>
    purchases.filter(
      (p) =>
        !!p.grantedAt &&
        p.grantedAt <= where.grantedAt.lte &&
        (!p.expiresAt || p.expiresAt > where.grantedAt.lte) &&
        (!where.productItem ||
          (p.productItem.kind === where.productItem.kind &&
            p.productItem.refId === where.productItem.refId &&
            (where.productItem.includesVideo === undefined ||
              p.productItem.includesVideo ===
                where.productItem.includesVideo))),
    );
  return {
    userPass: { findMany: jest.fn().mockResolvedValue([]) },
    studentProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    purchase: {
      findFirst: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(visible(where)[0] ?? null),
      ),
      findMany: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(visible(where)),
      ),
    },
  };
}
describe('purchased content and media entitlement separation', () => {
  it.each([false, true])(
    'active BOOK includesVideo=%s grants theory/problems, media follows product flag',
    async (includesVideo) => {
      const db = fixture([
        {
          grantedAt: new Date(Date.now() - 1000),
          expiresAt: null,
          productItem: { kind: 'BOOK', refId: 'book', includesVideo },
        },
      ]);
      const prisma = db as unknown as PrismaService;
      expect(await canAccessChapter(prisma, 'buyer', Role.BUYER, chapter)).toBe(
        true,
      );
      expect(
        await canAccessVideoChapter(prisma, 'buyer', Role.BUYER, chapter),
      ).toBe(includesVideo);
      expect((await collectContentScope(prisma, 'buyer')).bookIds).toEqual([
        'book',
      ]);
    },
  );
  it.each(['expired', 'revoked', 'future'] as const)(
    '%s purchase denies direct and listing access for both products',
    async (state) => {
      const db = fixture([
        {
          grantedAt:
            state === 'revoked'
              ? null
              : new Date(Date.now() + (state === 'future' ? 60000 : -1000)),
          expiresAt: state === 'expired' ? new Date(Date.now() - 1000) : null,
          productItem: { kind: 'BOOK', refId: 'book', includesVideo: true },
        },
      ]);
      const prisma = db as unknown as PrismaService;
      expect(await canAccessChapter(prisma, 'buyer', Role.BUYER, chapter)).toBe(
        false,
      );
      expect(
        await canAccessVideoChapter(prisma, 'buyer', Role.BUYER, chapter),
      ).toBe(false);
      expect((await collectContentScope(prisma, 'buyer')).bookIds).toEqual([]);
    },
  );
  it('TEST purchase does not grant a BOOK chapter or video; content scope retains only test identity', async () => {
    const db = fixture([
      {
        grantedAt: new Date(Date.now() - 1000),
        expiresAt: null,
        productItem: { kind: 'TEST', refId: 'test', includesVideo: false },
      },
    ]);
    const prisma = db as unknown as PrismaService;
    expect(await canAccessChapter(prisma, 'buyer', Role.BUYER, chapter)).toBe(
      false,
    );
    expect(
      await canAccessVideoChapter(prisma, 'buyer', Role.BUYER, chapter),
    ).toBe(false);
    expect((await collectContentScope(prisma, 'buyer')).testIds).toEqual([
      'test',
    ]);
  });
  it('pass query requires started, active and unexpired, and never merges book purchase into pass-only scope', async () => {
    const db = fixture([
      {
        grantedAt: new Date(Date.now() - 1000),
        expiresAt: null,
        productItem: { kind: 'BOOK', refId: 'book', includesVideo: false },
      },
    ]);
    const prisma = db as unknown as PrismaService;
    expect((await collectPassScope(prisma, 'buyer')).bookIds).toEqual([]);
    const query = (db.userPass.findMany.mock.calls as unknown[][])[0][0] as {
      where: {
        startsAt: { lte: Date };
        expiresAt: { gt: Date };
        pass: { active: boolean };
      };
    };
    expect((query.where as any).OR).toEqual([
      { scopeSnapshot: { not: expect.anything() } },
      { pass: { active: true } },
    ]);
    expect(query.where.startsAt.lte).toBeInstanceOf(Date);
    expect(query.where.expiresAt.gt).toEqual(query.where.startsAt.lte);
  });
  it('malformed stored pass scope cannot turn string values into blanket grants', async () => {
    const db = fixture([]);
    db.userPass.findMany.mockResolvedValue([
      {
        pass: {
          scope: {
            all: 'true',
            bookIds: 'book',
            chapterIds: [1, null, 'chapter'],
          },
        },
      },
    ]);
    expect(
      await collectPassScope(db as unknown as PrismaService, 'buyer'),
    ).toEqual({
      all: false,
      bookIds: [],
      chapterIds: ['chapter'],
      testIds: [],
    });
  });
  it('purchase grant start includes current boundary and expiry is strictly later', () => {
    const now = new Date('2026-10-07T00:00:00Z');
    expect(activePurchaseWhere('buyer', now)).toEqual({
      userId: 'buyer',
      grantedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    });
  });
});
