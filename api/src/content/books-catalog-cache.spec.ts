import { BooksCatalogService } from './books-catalog.service';

describe('BooksCatalogService кэш (docs/BACKEND-PERF.md)', () => {
  it('нийтийн каталогийг 60 секунд дотор дахин тоолохгүй; алга ном кэшлэгдэхгүй', async () => {
    const prisma = {
      book: { findMany: jest.fn().mockResolvedValue([]) },
      chapter: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const svc = new BooksCatalogService(prisma as never);
    expect(await svc.listBooks()).toEqual([]);
    expect(await svc.listBooks()).toEqual([]);
    expect(prisma.book.findMany).toHaveBeenCalledTimes(1);
    await expect(svc.bookDetail('NOPE')).rejects.toThrow();
    await expect(svc.bookDetail('NOPE')).rejects.toThrow();
    expect(prisma.book.findMany).toHaveBeenCalledTimes(3);
  });
});
