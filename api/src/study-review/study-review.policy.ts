import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { parseRational } from '../learning-lab/generator';
export const REVIEW_CAPS: Record<number, number> = { 10: 5, 30: 10, 60: 20 };
export const FLAGS = ['unsure', 'guessed', 'could-not', 'help'];
export function requestHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
export function requestId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException('Хүсэлтийн дугаар буруу.');
  return value.toLowerCase();
}
export function normalizeStart(body: {
  clientRequestId?: unknown;
  budgetMinutes?: unknown;
  chapterIds?: unknown;
}) {
  const clientRequestId = requestId(body?.clientRequestId);
  if (
    typeof body.budgetMinutes !== 'number' ||
    !REVIEW_CAPS[body.budgetMinutes]
  )
    throw new BadRequestException('10, 30 эсвэл 60 минут сонгоно уу.');
  if (
    !Array.isArray(body.chapterIds) ||
    body.chapterIds.length < 1 ||
    body.chapterIds.length > 5 ||
    !body.chapterIds.every(
      (id) => typeof id === 'string' && id.length > 0 && id.length <= 160,
    )
  )
    throw new BadRequestException('1–5 сэдэв сонгоно уу.');
  return {
    clientRequestId,
    budgetMinutes: body.budgetMinutes,
    chapterIds: [...new Set(body.chapterIds as string[])].sort(),
  };
}
export function normalizeResponse(body: {
  clientRequestId?: unknown;
  answer?: unknown;
  flags?: unknown;
  kind?: unknown;
}) {
  const clientRequestId = requestId(body?.clientRequestId);
  if (typeof body.answer !== 'string' || body.answer.length > 128)
    throw new BadRequestException('Хариулт буруу.');
  if (
    body.flags !== undefined &&
    (!Array.isArray(body.flags) ||
      body.flags.length > 4 ||
      !body.flags.every((f) => typeof f === 'string' && FLAGS.includes(f)))
  )
    throw new BadRequestException('Тэмдэглэгээ буруу.');
  const flags = [...new Set((body.flags ?? []) as string[])].sort();
  if (!body.answer.trim() && !flags.includes('could-not'))
    throw new BadRequestException(
      'Хариулт эсвэл бодож чадаагүй тэмдэглэгээ хэрэгтэй.',
    );
  if (body.kind !== 'FIRST' && body.kind !== 'CORRECTION')
    throw new BadRequestException('Хариултын төрөл буруу.');
  return {
    clientRequestId,
    answer: body.answer,
    flags,
    kind: body.kind,
  };
}

// Deterministic topic interleaving; the cap limits count and makes no pace claim.
export function selectReviewItems<T extends { id: string; chapterId: string }>(
  items: T[],
  chapterIds: string[],
  seed: number,
  cap: number,
): T[] {
  const pools = chapterIds.map((id) =>
    items
      .filter((p) => p.chapterId === id)
      .sort((a, b) =>
        requestHash([seed, a.id]).localeCompare(requestHash([seed, b.id])),
      ),
  );
  const result: T[] = [];
  while (result.length < cap && pools.some((p) => p.length)) {
    for (const pool of pools) {
      const next = pool.shift();
      if (next) result.push(next);
      if (result.length === cap) break;
    }
  }
  return result;
}

// No review may auto-grade a malformed/import placeholder key.
export function reviewEligible(p: {
  format: string;
  correctAnswer: unknown;
  choices: unknown;
  choiceOptions: { isCorrect: boolean; text: string; order: number }[];
}): boolean {
  const scalar = p.correctAnswer;
  if (p.format === 'FILL_NUMBER')
    return (
      (typeof scalar === 'string' || typeof scalar === 'number') &&
      (typeof scalar !== 'number' || Number.isFinite(scalar)) &&
      !!parseRational(String(scalar))
    );
  if (p.format !== 'CHOICE') return false;
  if (p.choiceOptions.length)
    return (
      p.choiceOptions.length >= 2 &&
      p.choiceOptions.length <= 10 &&
      p.choiceOptions.filter((o) => o.isCorrect).length === 1 &&
      p.choiceOptions.every(
        (o) =>
          typeof o.text === 'string' &&
          o.text.length > 0 &&
          o.text.length <= 4000 &&
          Number.isInteger(o.order),
      ) &&
      new Set(p.choiceOptions.map((o) => o.order)).size ===
        p.choiceOptions.length &&
      new Set(p.choiceOptions.map((o) => o.text.trim())).size ===
        p.choiceOptions.length
    );
  if (
    !Array.isArray(p.choices) ||
    p.choices.length < 2 ||
    p.choices.length > 10 ||
    !p.choices.every(
      (c) => typeof c === 'string' && c.length > 0 && c.length <= 4000,
    ) ||
    typeof scalar !== 'string'
  )
    return false;
  if (new Set(p.choices.map((c) => String(c).trim())).size !== p.choices.length)
    return false;
  const index = scalar.trim().toUpperCase().charCodeAt(0) - 65;
  return scalar.trim().length === 1 && index >= 0 && index < p.choices.length;
}

export function gradeReviewNumber(key: unknown, answer: string): boolean {
  if (typeof key !== 'string' && typeof key !== 'number') return false;
  const expected = parseRational(String(key)),
    given = parseRational(answer);
  return !!expected && !!given && expected.n * given.d === given.n * expected.d;
}
export function validReviewChoice(
  mode: 'TEXT' | 'LETTER' | null,
  count: number,
  answer: string,
): boolean {
  if (mode === 'TEXT') {
    const match = /^choice:(\d)$/.exec(answer);
    return !!match && Number(match[1]) < count;
  }
  if (mode === 'LETTER') {
    const token = answer.trim().toUpperCase();
    return /^[A-J]$/.test(token) && token.charCodeAt(0) - 65 < count;
  }
  return false;
}
