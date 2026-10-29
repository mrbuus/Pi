process.env.JWT_SECRET ??= 'test-secret';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_REGION = 'ap-east-1';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { deflateSync } from 'zlib';
import { S3Client } from '@aws-sdk/client-s3';
import {
  PDF_PROBE_BYTES,
  pdfPageCount,
  pdfPageCountFromRanges,
} from '../lesson-day/pdf-pages';
import {
  CLIENT_PAGES_MAX,
  HOMEWORK_MAX_BYTES,
  clampClientPages,
  finishDirectUpload,
  maxBytesFor,
  pdfPageCountOnDisk,
} from './file-store';

/**
 * Вэбийн `photosToPdf`-тэй ижил сан (`@cantoo/pdf-lib`) — api-д хамаарал нэмэхгүйн тулд
 * web/node_modules-оос авна. Олдохгүй орчинд (зөвхөн api суусан CI) pdf-lib тестүүд алгасагдана.
 */
interface PdfLib {
  PDFDocument: {
    create(): Promise<{
      embedJpg(b: Uint8Array): Promise<unknown>;
      addPage(size: [number, number]): {
        drawImage(
          img: unknown,
          o: { x: number; y: number; width: number; height: number },
        ): void;
      };
      save(o: { useObjectStreams: boolean }): Promise<Uint8Array>;
    }>;
  };
}
let pdfLib: PdfLib | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfLib = require(
    require.resolve('@cantoo/pdf-lib', {
      paths: [join(__dirname, '../../../web')],
    }),
  );
} catch {
  pdfLib = null;
}
const withPdfLib = pdfLib ? describe : describe.skip;

// 1×1 JPEG + дүүргэлт ≈ утасны 1600px дэвтрийн зураг (~300 КБ)
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);
function fakePhoto(bytes: number): Buffer {
  return Buffer.concat([
    TINY_JPEG.subarray(0, TINY_JPEG.length - 2),
    Buffer.alloc(bytes, 0x55),
    Buffer.from([0xff, 0xd9]),
  ]);
}

async function homeworkPdf(
  pages: number,
  useObjectStreams: boolean,
): Promise<Buffer> {
  const doc = await pdfLib!.PDFDocument.create();
  for (let i = 0; i < pages; i++) {
    const image = await doc.embedJpg(fakePhoto(300_000 + i));
    const page = doc.addPage([595, 842]);
    page.drawImage(image, { x: 0, y: 0, width: 595, height: 842 });
  }
  return Buffer.from(await doc.save({ useObjectStreams }));
}

const head = (b: Buffer) => b.subarray(0, PDF_PROBE_BYTES);
const tail = (b: Buffer) => b.subarray(Math.max(0, b.length - PDF_PROBE_BYTES));

withPdfLib(
  'PDF хуудас — эхний/сүүлийн 64 КБ (pdf-lib, photosToPdf-тэй ижил)',
  () => {
    for (const useObjectStreams of [true, false]) {
      it(`6 хуудас ≈ 1.8 МБ, useObjectStreams=${useObjectStreams}`, async () => {
        const pdf = await homeworkPdf(6, useObjectStreams);
        expect(pdf.length).toBeGreaterThan(1_500_000);
        expect(pdfPageCountFromRanges(head(pdf), tail(pdf))).toBe(6);
        expect(pdfPageCount(pdf)).toBe(6); // хуучин бүтэн уншилттай ижил
      });
    }
    it('1 хуудас (64 КБ-аас жижиг ч байж болно)', async () => {
      const pdf = await homeworkPdf(1, true);
      expect(pdfPageCountFromRanges(head(pdf), tail(pdf))).toBe(1);
    });
  },
);

describe('PDF хуудас — хэсэгчилсэн уншилтын онцгой тохиолдол', () => {
  it('сүүл хэсэг урсгалын дундаас эхэлсэн ч объектын урсгал дахь үндсийг олно', () => {
    const objStm = deflateSync(
      Buffer.from(
        '<< /Type /Pages /Kids [ 5 0 R 6 0 R ] /Count 4 >> << /Type /Pages /Parent 1 0 R /Count 2 >>',
      ),
    );
    const h = Buffer.from(
      '%PDF-1.7\n3 0 obj << /Length 999999 /Filter /DCTDecode >> stream\n\xff\xd8',
    );
    const t = Buffer.concat([
      Buffer.from(
        '\x01\x02 junk of a cut image\nendstream\nendobj\n9 0 obj << /Type /ObjStm /Filter /FlateDecode >>\nstream\n',
        'latin1',
      ),
      objStm,
      Buffer.from('\nendstream\nendobj\nstartxref\n123\n%%EOF'),
    ]);
    expect(pdfPageCountFromRanges(h, t)).toBe(4);
  });
  it('зөвхөн дунд зангилаа (/Parent-тэй) олдвол тоолохгүй — null', () => {
    const h = Buffer.from(
      '%PDF-1.7\n7 0 obj << /Type /Pages /Parent 1 0 R /Count 2 >> endobj',
    );
    expect(pdfPageCountFromRanges(h, null)).toBeNull();
  });
  it('PDF биш бол null', () => {
    expect(
      pdfPageCountFromRanges(Buffer.from('\xff\xd8\xff jpeg'), null),
    ).toBeNull();
  });
  it('хөтчийн мэдэгдсэн тоо хязгаартай', () => {
    expect(clampClientPages(6)).toBe(6);
    expect(clampClientPages('3')).toBe(3);
    expect(clampClientPages(999)).toBe(CLIENT_PAGES_MAX);
    expect(clampClientPages(0)).toBeNull();
    expect(clampClientPages(2.5)).toBeNull();
    expect(clampClientPages('x')).toBeNull();
    expect(clampClientPages(undefined)).toBeNull();
  });
  it('гэрийн даалгавар 12 МБ, бусад 25 МБ', () => {
    expect(maxBytesFor('homework')).toBe(HOMEWORK_MAX_BYTES);
    expect(HOMEWORK_MAX_BYTES).toBe(12 * 1024 * 1024);
    expect(maxBytesFor('theory')).toBe(25 * 1024 * 1024);
  });
  it('дискэн дээрх файл (хуучин multipart зам)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pdfdisk-'));
    const big = Buffer.concat([
      Buffer.from(
        '%PDF-1.7\n1 0 obj << /Type /Pages /Kids [] /Count 5 >> endobj\n',
      ),
      Buffer.alloc(3 * 1024 * 1024, 0x20),
      Buffer.from('%%EOF'),
    ]);
    writeFileSync(join(dir, 'a.pdf'), big);
    expect(pdfPageCountOnDisk(join(dir, 'a.pdf'), big.length)).toBe(5);
  });
});

/* ─────────── finishDirectUpload — S3-ийг дуурайна ─────────── */

interface Call {
  name: string;
  input: { Key?: string; Range?: string };
}

function mockS3(object: Buffer | null, declaredSize?: number) {
  const calls: Call[] = [];
  const size = declaredSize ?? object?.length ?? 0;
  jest.spyOn(S3Client.prototype, 'send').mockImplementation((async (cmd: {
    constructor: { name: string };
    input: Call['input'];
  }) => {
    const name = cmd.constructor.name;
    calls.push({ name, input: cmd.input });
    if (name === 'GetObjectCommand') {
      if (!object)
        throw Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey' });
      const range = cmd.input.Range;
      let from = 0;
      let to = size - 1;
      const a = range && /^bytes=(\d+)-(\d+)$/.exec(range);
      const b = range && /^bytes=-(\d+)$/.exec(range);
      if (a) {
        from = Number(a[1]);
        to = Math.min(Number(a[2]), size - 1);
      } else if (b) from = Math.max(0, size - Number(b[1]));
      const body = object.subarray(from, Math.min(to + 1, object.length));
      return {
        Body: { transformToByteArray: async () => new Uint8Array(body) },
        ...(range ? { ContentRange: `bytes ${from}-${to}/${size}` } : {}),
      };
    }
    return {};
  }) as never);
  return calls;
}

const okSig = (b: Buffer) =>
  b.subarray(0, 4).toString('latin1') === '%PDF' || b[0] === 0xff;

describe('finishDirectUpload — файлыг бүтэн уншихгүй', () => {
  afterEach(() => jest.restoreAllMocks());

  (pdfLib ? it : it.skip)(
    '6 хуудас PDF: зөвхөн 2 ranged GET, HEAD-гүй, бүтэн GET-гүй',
    async () => {
      const pdf = await homeworkPdf(6, true);
      const calls = mockS3(pdf);
      const out = await finishDirectUpload('k.pdf', 'application/pdf', okSig, {
        maxBytes: HOMEWORK_MAX_BYTES,
      });
      expect(out).toEqual({ size: pdf.length, pages: 6 });
      const gets = calls.filter((c) => c.name === 'GetObjectCommand');
      expect(gets.map((g) => g.input.Range)).toEqual([
        `bytes=0-${PDF_PROBE_BYTES - 1}`,
        `bytes=-${PDF_PROBE_BYTES}`,
      ]);
      expect(calls.some((c) => c.name === 'HeadObjectCommand')).toBe(false);
      expect(calls.map((c) => c.name)).toEqual([
        'GetObjectCommand',
        'GetObjectCommand',
        'CopyObjectCommand',
        'DeleteObjectCommand',
      ]);
    },
  );

  it('зураг: 16 байтын нэг GET', async () => {
    const jpg = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.alloc(500_000),
    ]);
    const calls = mockS3(jpg);
    const out = await finishDirectUpload('k.jpg', 'image/jpeg', okSig, {});
    expect(out).toEqual({ size: jpg.length, pages: null });
    expect(calls[0]).toMatchObject({
      name: 'GetObjectCommand',
      input: { Range: 'bytes=0-15' },
    });
    expect(calls.filter((c) => c.name === 'GetObjectCommand')).toHaveLength(1);
  });

  it('гэрийн даалгавар 12 МБ-аас их бол устгаад too-large (байтыг татахгүй)', async () => {
    const headOnly = Buffer.from('%PDF-1.7\n');
    const calls = mockS3(headOnly, 13 * 1024 * 1024);
    await expect(
      finishDirectUpload('k.pdf', 'application/pdf', okSig, {
        maxBytes: HOMEWORK_MAX_BYTES,
      }),
    ).rejects.toThrow('too-large');
    expect(calls.map((c) => c.name)).toEqual([
      'GetObjectCommand',
      'DeleteObjectCommand',
    ]);
  });

  it('задлагдахгүй том PDF → клиентийн тоонд ИТГЭХГҮЙ, бүтэн уншиж тоолно', async () => {
    // Хуудасны хязгаар (гэрийн даалгавар 6) клиентийн тоогоор тойрогдохгүй байх
    const weird = Buffer.concat([
      Buffer.from('%PDF-1.7\n'),
      Buffer.alloc(3 * 1024 * 1024, 0x20),
      Buffer.from('1 0 obj << /Type /Pages /Kids [] /Count 40 >> endobj\n'),
      Buffer.alloc(3 * 1024 * 1024, 0x20),
    ]);
    const calls = mockS3(weird);
    const out = await finishDirectUpload('k.pdf', 'application/pdf', okSig, {
      clientPages: 1,
    });
    expect(out.pages).toBe(40);
    // Бүтэн уншилт ч шалгасан хэмжээгээр Range-тэй (TOCTOU-аас хамгаална)
    expect(
      calls.some(
        (c) =>
          c.name === 'GetObjectCommand' &&
          c.input.Range === `bytes=0-${weird.length - 1}`,
      ),
    ).toBe(true);
  });

  it('задлагдахгүй жижиг PDF (≤2 МБ) бүтэн уншиж тоолно', async () => {
    const mid = Buffer.concat([
      Buffer.from('%PDF-1.7\n'),
      Buffer.alloc(200_000, 0x20),
      Buffer.from('1 0 obj << /Type /Pages /Kids [] /Count 3 >> endobj\n'),
      Buffer.alloc(200_000, 0x20),
    ]);
    mockS3(mid);
    const out = await finishDirectUpload('k.pdf', 'application/pdf', okSig, {
      clientPages: 9,
    });
    expect(out.pages).toBe(3);
  });

  it('буруу гарын үсэг → bad-signature, объектыг устгана', async () => {
    const calls = mockS3(Buffer.from('<html>not a pdf</html>'));
    await expect(
      finishDirectUpload('k.pdf', 'application/pdf', okSig),
    ).rejects.toThrow('bad-signature');
    expect(calls.at(-1)?.name).toBe('DeleteObjectCommand');
  });

  it('объект байхгүй → not-found', async () => {
    mockS3(null);
    await expect(
      finishDirectUpload('k.pdf', 'application/pdf', okSig),
    ).rejects.toThrow('not-found');
  });
});
