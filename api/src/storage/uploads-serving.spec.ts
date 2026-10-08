import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import express from 'express';
import request from 'supertest';

const directory = mkdtempSync(join(tmpdir(), '.uploads-hidden-'));
process.env.UPLOAD_DIR = directory;
// The controller resolves its upload root at import time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { UploadsController } = require('./uploads.controller');
const bytes = Buffer.from('synthetic file content');
function fixture() {
  const prisma = {
    storedFile: {
      findUnique: jest.fn(async () => ({ mime: 'image/png', bytes })),
    },
  };
  const controller = new UploadsController(prisma as any);
  const app = express();
  app.get('/files/:key', (req, res, next) => {
    controller
      .serve(req.params.key, res)
      .catch((error: { getStatus?: () => number }) => {
        if (res.headersSent) next(error);
        else res.status(error.getStatus?.() ?? 500).json({ failed: true });
      });
  });
  return { prisma, controller, app };
}
afterAll(() => rmSync(directory, { recursive: true, force: true }));
describe('authorized upload serving from hidden disk root', () => {
  it('serves actual disk bytes inside a hidden upload root with private headers', async () => {
    const { app, prisma } = fixture();
    writeFileSync(join(directory, 'disk.png'), bytes);
    const response = await request(app).get('/files/disk.png').expect(200);
    expect(response.body).toEqual(bytes);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(prisma.storedFile.findUnique).not.toHaveBeenCalled();
  });
  it('serves database bytes after local disk loss with identical private headers', async () => {
    const { app } = fixture();
    const response = await request(app).get('/files/database.png').expect(200);
    expect(response.body).toEqual(bytes);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.headers['referrer-policy']).toBe('no-referrer');
  });
  it('recovers a sendFile ENOENT race using durable database bytes', async () => {
    const { controller } = fixture();
    writeFileSync(join(directory, 'race.png'), bytes);
    const res = {
      headersSent: false,
      setHeader: jest.fn(),
      end: jest.fn(),
      sendFile: jest.fn((_path, _options, callback) =>
        callback(Object.assign(new Error('gone'), { code: 'ENOENT' })),
      ),
    };
    await controller.serve('race.png', res);
    expect(res.end).toHaveBeenCalledWith(bytes);
  });
  it('returns a genuine 404 if file vanishes and no database copy exists', async () => {
    const { controller, prisma } = fixture();
    prisma.storedFile.findUnique.mockResolvedValue(null as any);
    writeFileSync(join(directory, 'gone.png'), bytes);
    const res = {
      headersSent: false,
      setHeader: jest.fn(),
      end: jest.fn(),
      sendFile: jest.fn((_path, _options, callback) =>
        callback(Object.assign(new Error('gone'), { status: 404 })),
      ),
    };
    await expect(controller.serve('gone.png', res)).rejects.toMatchObject({
      status: 404,
    });
  });
});
