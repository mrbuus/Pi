import { attachmentHeader, sourcePdfFileName, sourcePdfKey } from './source-pdf';

describe('test source PDF download name', () => {
  const prismaWith = (chapter: unknown) =>
    ({ chapter: { findUnique: jest.fn(async () => chapter) } }) as never;

  it('names the file after the book and test, not the storage key', async () => {
    const prisma = prismaWith({ title: 'Тоо тоолол · Тест 2', book: { title: '100x100', code: '100V3' } });
    await expect(sourcePdfFileName(prisma, sourcePdfKey('c1'))).resolves.toBe('100x100 V3 - Тоо тоолол - Тест 2.pdf');
  });

  it('does not repeat the book name already in the test title', async () => {
    const prisma = prismaWith({ title: '1000 бодлого · Сорил 7-A', book: { title: '1000 Бодлого', code: '1000' } });
    await expect(sourcePdfFileName(prisma, sourcePdfKey('c1'))).resolves.toBe('1000 бодлого - Сорил 7-A.pdf');
  });

  it('ignores ordinary uploads', async () => {
    await expect(sourcePdfFileName(prismaWith(null), 'abc.pdf')).resolves.toBeNull();
  });

  it('sends a UTF-8 attachment header with an ASCII fallback', () => {
    expect(attachmentHeader('Тест 1.pdf')).toBe(
      `attachment; filename="____ 1.pdf"; filename*=UTF-8''${encodeURIComponent('Тест 1.pdf')}`,
    );
  });
});
