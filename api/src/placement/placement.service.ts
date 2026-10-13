import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UPLOAD_DIR } from '../storage/uploads.controller';
import {
  DEFAULT_PLACEMENT_TEST,
  PLACEMENT_TESTS,
  PlacementAnswers,
  PlacementProblem,
  PlacementTest,
  gradePlacement,
  parseProblems,
  publicTest,
} from './placement-tests';
import type { ReviewPlacementDto, StartPlacementDto, UpdatePlacementTestDto } from './placement.dto';

/** Хугацаа дууссанаас хойш сүлжээ удаашралд өгөх нэмэлт хугацаа */
export const GRACE_MS = 3 * 60_000;
export const MAX_PHOTOS_PER_PROBLEM = 3;
export const MAX_PHOTOS_TOTAL = 25;

const hash = (s: string) => createHash('sha256').update(s).digest('hex');

/** Зураг мөн эсэхийг агуулгаар нь (magic bytes) шалгана — нэр/mimetype хуурч болно */
export function isImageBytes(buf: Buffer): 'jpg' | 'png' | 'webp' | 'heic' | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString('ascii') === 'PNG') return 'png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp' && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(buf.subarray(8, 12).toString('ascii'))) return 'heic';
  return null;
}

/** Зөвхөн тестэд байгаа бодлогын дугаар, богино утга үлдэнэ */
export function sanitizeAnswers(t: PlacementTest, raw: unknown): PlacementAnswers {
  const out: PlacementAnswers = {};
  if (!raw || typeof raw !== 'object') return out;
  const src = raw as Record<string, unknown>;
  for (const p of t.problems) {
    const v = src[String(p.n)];
    if (p.kind === 'choice' && typeof v === 'string' && /^[A-E]$/.test(v)) out[String(p.n)] = v;
    if (p.kind === 'boxes' && v && typeof v === 'object') {
      const boxes: Record<string, string> = {};
      for (const b of p.boxes ?? []) {
        const s = String((v as Record<string, unknown>)[b.key] ?? '').replace(/[^0-9-]/g, '').slice(0, b.digits + 1);
        if (s) boxes[b.key] = s;
      }
      if (Object.keys(boxes).length) out[String(p.n)] = boxes;
    }
  }
  return out;
}

type Attempt = Prisma.PlacementAttemptGetPayload<object>;

@Injectable()
export class PlacementService {
  constructor(private prisma: PrismaService) {}

  /** Идэвхтэй тест — ӨС-д байхгүй бол анхны агуулгаар (эзний PDF) үүсгэнэ */
  async test(key = DEFAULT_PLACEMENT_TEST): Promise<PlacementTest> {
    let row = await this.prisma.placementTestConfig.findUnique({ where: { key } });
    if (!row) {
      const seed = PLACEMENT_TESTS[key];
      if (!seed) throw new NotFoundException('Шалгалт олдсонгүй');
      row = await this.prisma.placementTestConfig.upsert({
        where: { key },
        update: {},
        create: { key, title: seed.title, minutes: seed.minutes, instructions: seed.instructions, problems: seed.problems as unknown as Prisma.InputJsonValue },
      });
    }
    return { key: row.key, title: row.title, minutes: row.minutes, instructions: row.instructions ?? '', problems: row.problems as unknown as PlacementProblem[] };
  }

  /** Хүүхдийн бодсон хувилбар (эхлэх үеийн хуулбар) */
  private async testOf(a: Attempt): Promise<PlacementTest> {
    return (a.testSnapshot as unknown as PlacementTest | null) ?? this.test(a.testKey);
  }

  async publicTest() {
    return publicTest(await this.test());
  }

  async adminTest() {
    return this.test();
  }

  async updateTest(dto: UpdatePlacementTestDto, editorId: string) {
    const problems = parseProblems(dto.problems);
    if (typeof problems === 'string') throw new BadRequestException(problems);
    await this.test(); // анхны мөр байгаа эсэхийг баталгаажуулна
    await this.prisma.placementTestConfig.update({
      where: { key: DEFAULT_PLACEMENT_TEST },
      data: {
        title: dto.title,
        minutes: dto.minutes,
        instructions: dto.instructions ?? '',
        problems: problems as unknown as Prisma.InputJsonValue,
        updatedById: editorId,
      },
    });
    return this.test();
  }

  async start(dto: StartPlacementDto) {
    const t = await this.test();
    const secret = randomBytes(24).toString('base64url');
    const now = Date.now();
    const a = await this.prisma.placementAttempt.create({
      data: {
        secretHash: hash(secret),
        testKey: t.key,
        testSnapshot: t as unknown as Prisma.InputJsonValue,
        name: dto.name,
        phone: dto.phone,
        grade: dto.grade,
        school: dto.school || null,
        parentPhone: dto.parentPhone || null,
        startedAt: new Date(now),
        deadlineAt: new Date(now + t.minutes * 60_000),
      },
    });
    return { id: a.id, secret, deadlineAt: a.deadlineAt, test: publicTest(t) };
  }

  /** Зочны эрх: нууц түлхүүр таарах ёстой */
  private async owned(id: string, secret: string): Promise<Attempt> {
    const a = await this.prisma.placementAttempt.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Шалгалт олдсонгүй');
    const x = Buffer.from(a.secretHash), y = Buffer.from(hash(secret));
    if (x.length !== y.length || !timingSafeEqual(x, y)) throw new ForbiddenException('Шалгалтын эрх таарахгүй байна');
    return a;
  }

  private open(a: Attempt) {
    if (a.submittedAt) throw new GoneException('Шалгалт аль хэдийн илгээгдсэн');
    if (Date.now() > a.deadlineAt.getTime() + GRACE_MS) throw new GoneException('Шалгалтын хугацаа дууссан');
  }

  async resume(id: string, secret: string) {
    const a = await this.owned(id, secret);
    return {
      id: a.id,
      deadlineAt: a.deadlineAt,
      submittedAt: a.submittedAt,
      answers: a.answers,
      photos: a.photos,
      test: publicTest(await this.testOf(a)),
    };
  }

  async save(id: string, secret: string, answers: unknown) {
    const a = await this.owned(id, secret);
    this.open(a);
    const clean = sanitizeAnswers(await this.testOf(a), answers);
    await this.prisma.placementAttempt.update({ where: { id }, data: { answers: clean } });
    return { ok: true };
  }

  async addPhoto(id: string, secret: string, problem: number, file?: Express.Multer.File) {
    const a = await this.owned(id, secret);
    this.open(a);
    if (!(await this.testOf(a)).problems.some((p) => p.n === problem)) throw new BadRequestException('Ийм бодлого алга');
    if (!file?.buffer?.length) throw new BadRequestException('Зураг ирсэнгүй');
    const ext = isImageBytes(file.buffer);
    if (!ext) throw new BadRequestException('Зөвхөн зураг (jpg, png, webp, heic) илгээнэ үү');
    const photos = { ...(a.photos as Record<string, string[]>) };
    const list = photos[String(problem)] ?? [];
    if (list.length >= MAX_PHOTOS_PER_PROBLEM) throw new BadRequestException(`Нэг бодлогод ${MAX_PHOTOS_PER_PROBLEM} хүртэл зураг`);
    if (a.photoKeys.length >= MAX_PHOTOS_TOTAL) throw new BadRequestException('Зургийн тоо хэтэрлээ');
    const key = `${randomUUID()}.${ext}`;
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    try {
      // ӨС = эх сурвалж (Render-ийн диск түр зуурынх), диск = кэш
      await this.prisma.storedFile.create({ data: { key, mime, size: file.size, bytes: new Uint8Array(file.buffer), ownerId: null } });
    } catch {
      throw new ServiceUnavailableException('Зураг хадгалахад алдаа гарлаа. Дахин оролдоно уу.');
    }
    try { writeFileSync(join(UPLOAD_DIR, key), file.buffer); } catch { /* ӨС-д байгаа тул хангалттай */ }
    photos[String(problem)] = [...list, key];
    await this.prisma.placementAttempt.update({
      where: { id },
      data: { photos, photoKeys: { push: key } },
    });
    return { key, photos };
  }

  async removePhoto(id: string, secret: string, key: string) {
    const a = await this.owned(id, secret);
    this.open(a);
    if (!a.photoKeys.includes(key)) throw new NotFoundException('Зураг олдсонгүй');
    const photos: Record<string, string[]> = {};
    for (const [n, keys] of Object.entries(a.photos as Record<string, string[]>)) {
      const rest = keys.filter((k) => k !== key);
      if (rest.length) photos[n] = rest;
    }
    await this.prisma.placementAttempt.update({
      where: { id },
      data: { photos, photoKeys: a.photoKeys.filter((k) => k !== key) },
    });
    await this.prisma.storedFile.delete({ where: { key } }).catch(() => undefined);
    return { photos };
  }

  private async finalize(a: Attempt, answers: PlacementAnswers, auto: boolean) {
    const g = gradePlacement(await this.testOf(a), answers);
    return this.prisma.placementAttempt.update({
      where: { id: a.id },
      data: { answers, autoScore: g.score, maxScore: g.max, submittedAt: new Date(), autoSubmitted: auto },
    });
  }

  async submit(id: string, secret: string, answers: unknown, auto = false) {
    const a = await this.owned(id, secret);
    this.open(a);
    const late = Date.now() > a.deadlineAt.getTime();
    const done = await this.finalize(a, sanitizeAnswers(await this.testOf(a), answers), auto || late);
    return { ok: true, submittedAt: done.submittedAt };
  }

  /** Хүүхэд хөтчөө хаасан бол хугацаа дуусахад хадгалсан хариугаар нь дуусгана */
  private async closeExpired() {
    const stale = await this.prisma.placementAttempt.findMany({
      where: { submittedAt: null, deadlineAt: { lt: new Date(Date.now() - GRACE_MS) } },
      take: 200,
    });
    for (const a of stale) await this.finalize(a, a.answers as PlacementAnswers, true);
  }

  async list() {
    await this.closeExpired();
    const rows = await this.prisma.placementAttempt.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true, name: true, phone: true, grade: true, school: true, parentPhone: true,
        autoScore: true, maxScore: true, photoKeys: true, startedAt: true, submittedAt: true,
        autoSubmitted: true, status: true, level: true, createdAt: true,
      },
    });
    return rows.map(({ photoKeys, ...r }) => ({ ...r, photoCount: photoKeys.length }));
  }

  async detail(id: string) {
    await this.closeExpired();
    const a = await this.prisma.placementAttempt.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Шалгалт олдсонгүй');
    const t = await this.testOf(a);
    const g = gradePlacement(t, a.answers as PlacementAnswers);
    const photos = a.photos as Record<string, string[]>;
    const { secretHash: _s, testSnapshot: _t, ...rest } = a;
    return {
      ...rest,
      title: t.title,
      minutes: t.minutes,
      problems: t.problems.map((p) => ({
        ...p,
        given: (a.answers as PlacementAnswers)[String(p.n)] ?? null,
        correct: g.perProblem[String(p.n)],
        photos: photos[String(p.n)] ?? [],
      })),
    };
  }

  async review(id: string, dto: ReviewPlacementDto, reviewerId: string) {
    const a = await this.prisma.placementAttempt.findUnique({ where: { id }, select: { id: true } });
    if (!a) throw new NotFoundException('Шалгалт олдсонгүй');
    return this.prisma.placementAttempt.update({
      where: { id },
      data: {
        status: dto.status,
        level: dto.level,
        teacherNote: dto.teacherNote,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
      },
      select: { id: true, status: true, level: true, teacherNote: true, reviewedAt: true },
    });
  }
}
