import { mkdtempSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// UPLOAD_DIR модуль импортлох үед уншигддаг тул эхлээд тохируулна.
const dir = mkdtempSync(join(tmpdir(), 'uploads-'));
process.env.UPLOAD_DIR = dir;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { UploadsController } = require('./uploads.controller');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);

function mockRes() {
  const res: any = { headers: {} as Record<string, string> };
  res.setHeader = (k: string, v: string) => (res.headers[k] = v);
  res.end = jest.fn();
  res.sendFile = jest.fn();
  return res;
}

describe('UploadsController — ӨС-д давхар хадгалах (G05)', () => {
  it('upload нь файлыг ӨС-д бичнэ', async () => {
    const prisma = { storedFile: { create: jest.fn(async () => ({})) } };
    const c = new UploadsController(prisma as any);
    writeFileSync(join(dir, 'a.png'), PNG);
    const out = await c.upload({ filename: 'a.png', size: PNG.length, mimetype: 'image/png' } as any);
    expect(out.key).toBe('a.png');
    expect(prisma.storedFile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ key: 'a.png', mime: 'image/png', bytes: PNG }),
    });
  });

  it('ӨС-д бичиж чадахгүй бол дискнээс устгаж 503', async () => {
    const prisma = { storedFile: { create: jest.fn(async () => { throw new Error('db down'); }) } };
    const c = new UploadsController(prisma as any);
    writeFileSync(join(dir, 'b.png'), PNG);
    await expect(c.upload({ filename: 'b.png', size: PNG.length, mimetype: 'image/png' } as any)).rejects.toThrow();
    expect(existsSync(join(dir, 'b.png'))).toBe(false);
  });

  it('диск дээр алга бол ӨС-ээс сэргээж, дискэнд кэшлэнэ', async () => {
    const prisma = { storedFile: { findUnique: jest.fn(async () => ({ key: 'c.png', mime: 'image/png', bytes: PNG })) } };
    const c = new UploadsController(prisma as any);
    const res = mockRes();
    await c.serve('c.png', res);
    expect(res.end).toHaveBeenCalled();
    expect(res.headers['Content-Type']).toBe('image/png');
    expect(readFileSync(join(dir, 'c.png'))).toEqual(PNG);
  });

  it('хаана ч байхгүй бол 404', async () => {
    const prisma = { storedFile: { findUnique: jest.fn(async () => null) } };
    const c = new UploadsController(prisma as any);
    await expect(c.serve('none.png', mockRes())).rejects.toThrow('Файл олдсонгүй');
  });
});
