import { ConflictException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { Formula } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FormulaReviewService } from './formula-review.service';
import { ReviewDueQueryDto, SubmitReviewDto } from './formula-review.dto';
import {
  ReviewExercises,
  interleave,
  formulaVersion,
} from './formula-review.exercises';

const now = new Date('2026-09-27T16:00:00Z');
const secret = 'synthetic-review-test-key';
const formula = (id = 'f1', sectionSlug = 'numbers-algebra') =>
  ({
    id,
    slug: id,
    name: `Formula ${id}`,
    sectionSlug,
    latex: `${id}=1`,
    general: `${id}=1`,
    level: 'CORE',
    updatedAt: new Date('2026-09-01'),
    quiz: [
      {
        type: 'blank',
        prompt: '1+1=\\square',
        answer: '2',
        distractors: ['0', '1', '3'],
      },
      {
        type: 'truefalse',
        prompt: '2+2=5',
        answer: 'false',
        why: '$2+2=4$.',
      },
    ],
  }) as unknown as Formula;
const exercises = new ReviewExercises(secret);
function fixture() {
  const attempts = new Map<
    string,
    { fingerprint: string; response: unknown }
  >();
  const prisma = {
    formula: {
      findUnique: jest.fn().mockResolvedValue(formula()),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    formulaReview: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
    },
    formulaReviewDay: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    formulaReviewAttempt: {
      findUnique: jest.fn(
        async ({ where }) =>
          attempts.get(where.userId_exerciseId.exerciseId) ?? null,
      ),
      create: jest.fn(async ({ data }) => {
        attempts.set(data.exerciseId, data);
        return data;
      }),
    },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation((callback) => callback(prisma));
  const service = new FormulaReviewService(
    prisma as unknown as PrismaService,
    { getOrThrow: () => secret } as unknown as ConfigService,
  );
  return { prisma, service };
}

describe('formula review DTOs', () => {
  it.each([0, -1, 51, 1.5, 'bad'])('rejects limit %s', async (limit) => {
    expect(
      await validate(plainToInstance(ReviewDueQueryDto, { limit })),
    ).not.toHaveLength(0);
  });
  it('accepts bounded numeric query and validates every write field', async () => {
    expect(
      await validate(plainToInstance(ReviewDueQueryDto, { limit: '10' })),
    ).toHaveLength(0);
    expect(
      await validate(
        plainToInstance(SubmitReviewDto, {
          exerciseToken: 'token',
          answer: 'choice',
        }),
      ),
    ).toHaveLength(0);
    for (const payload of [
      { result: 'CORRECT' },
      { exerciseToken: '' },
      { answer: 2 },
      { answer: 'x'.repeat(1001) },
    ])
      expect(
        await validate(plainToInstance(SubmitReviewDto, payload)),
      ).not.toHaveLength(0);
  });
  it('strips a forged user identity', async () => {
    const dto = await new ValidationPipe({
      transform: true,
      whitelist: true,
    }).transform(
      { result: 'GOOD', userId: 'victim' },
      { type: 'body', metatype: SubmitReviewDto },
    );
    expect(dto).toEqual({ result: 'GOOD' });
  });
});

describe('signed review exercises', () => {
  it('does not serialize solutions, why, or an answer index before grading', () => {
    const { exercise } = exercises.create('u1', formula(), 'blank', now, 0);
    expect(exercise.options).toHaveLength(4);
    expect(exercise).not.toHaveProperty('answer');
    const payload = JSON.parse(
      Buffer.from(exercise.token.split('.')[0], 'base64url').toString(),
    );
    expect(payload).not.toHaveProperty('answer');
    expect(payload).not.toHaveProperty('correctIndex');
    expect(new Set(exercise.options.map((option) => option.id)).size).toBe(4);
  });
  it('rejects token tampering, another user/formula, expiry, and revised quiz versions', () => {
    const { exercise, challenge } = exercises.create(
      'u1',
      formula(),
      'blank',
      now,
      0,
    );
    expect(() =>
      exercises.read(`${exercise.token}x`, 'u1', 'f1', now),
    ).toThrow();
    expect(() => exercises.read(exercise.token, 'u2', 'f1', now)).toThrow();
    expect(() => exercises.read(exercise.token, 'u1', 'f2', now)).toThrow();
    expect(() =>
      exercises.read(
        exercise.token,
        'u1',
        'f1',
        new Date(now.getTime() + 86_400_001),
      ),
    ).toThrow(ConflictException);
    expect(() =>
      exercises.grade(challenge, { ...formula(), quiz: [] }, '2'),
    ).toThrow(ConflictException);
  });
  it('grades canonical answers even when client claims EASY', () => {
    const { exercise, challenge } = exercises.create(
      'u1',
      formula(),
      'blank',
      now,
      0,
    );
    const wrong = exercise.options.find((option) => option.text === '1')!;
    expect(
      exercises.grade(challenge, formula(), wrong.id, 'EASY'),
    ).toMatchObject({
      result: 'AGAIN',
      feedback: { correct: false, answer: '2' },
    });
    expect(() => exercises.grade(challenge, formula(), 'invented')).toThrow();
    const correct = exercise.options.find((option) => option.text === '2')!;
    expect(
      exercises.grade(challenge, formula(), correct.id, 'AGAIN'),
    ).toMatchObject({ result: 'GOOD', feedback: { correct: true } });
  });
  it('grades true/false and reveals its explanation only after answer', () => {
    const { exercise, challenge } = exercises.create(
      'u1',
      formula(),
      'truefalse',
      now,
      1,
    );
    expect(JSON.stringify(exercise)).not.toContain('$2+2=4$');
    expect(exercises.grade(challenge, formula(), 'false')).toMatchObject({
      result: 'GOOD',
      feedback: { why: '$2+2=4$.' },
    });
    expect(() => exercises.grade(challenge, formula(), 'false-ish')).toThrow();
  });
  it('binds matching options without exposing choice associations in identity', () => {
    const formulas = ['f1', 'f2', 'f3', 'f4'].map((id) => formula(id));
    const { challenge, exercise } = exercises.create(
      'u1',
      formulas[0],
      'match',
      now,
      undefined,
      { id: 'g1', formulas },
    );
    expect(
      exercises.grade(challenge, formulas[0], exercise.options[1].id, 'EASY')
        .result,
    ).toBe('AGAIN');
    expect(
      exercises.grade(challenge, formulas[0], exercise.options[0].id).result,
    ).toBe('GOOD');
    expect(() => exercises.grade(challenge, formulas[0], 'f1')).toThrow();
  });
  it('labels flashcards as self-assessment', () => {
    const { challenge } = exercises.create('u1', formula(), 'flashcard', now);
    expect(exercises.grade(challenge, formula(), undefined, 'HARD')).toEqual({
      result: 'HARD',
      feedback: null,
      source: 'SELF_ASSESSMENT',
    });
    expect(() => exercises.grade(challenge, formula())).toThrow();
  });
  it('interleaves groups without duplicates', () => {
    expect(
      interleave([
        formula('a1', 'a'),
        formula('a2', 'a'),
        formula('b1', 'b'),
        formula('c1', 'c'),
      ]).map((row) => row.id),
    ).toEqual(['a1', 'b1', 'c1', 'a2']);
    expect(interleave([])).toEqual([]);
    expect(formulaVersion(formula())).not.toBe(
      formulaVersion({ ...formula(), name: 'Edited' }),
    );
  });
});

describe('formula review service', () => {
  it('prioritizes due, then seen, then unseen CORE and hides objective solutions', async () => {
    const { prisma, service } = fixture();
    const due = formula('due');
    prisma.formulaReview.findMany.mockResolvedValue([
      { formula: due, formulaId: due.id, box: 2, dueAt: now },
    ]);
    prisma.formula.findMany
      .mockResolvedValueOnce([formula('seen')])
      .mockResolvedValueOnce(
        Array.from({ length: 8 }, (_, i) => formula(`core${i}`)),
      );
    const result = await service.due('u1', 10, now);
    expect(result.cards.map((row) => row.slug).slice(0, 2)).toEqual([
      'due',
      'seen',
    ]);
    expect(result.cards.map((row) => row.exercise.mode)).toEqual([
      'flashcard',
      'blank',
      'truefalse',
      'match',
      'match',
      'match',
      'match',
      'flashcard',
      'blank',
      'truefalse',
    ]);
    for (const card of result.cards.filter(
      (row) => row.exercise.mode !== 'flashcard',
    )) {
      expect(card.latex).toBeNull();
      expect(card.general).toBeNull();
      for (const quiz of card.quiz) {
        expect(quiz).not.toHaveProperty('answer');
        expect(quiz).not.toHaveProperty('why');
      }
    }
    expect(prisma.formulaReview.count.mock.calls[0][0].where.userId).toBe('u1');
  });
  it('records a graded answer once and returns the same receipt for retry', async () => {
    const { prisma, service } = fixture();
    const { exercise } = exercises.create('u1', formula(), 'blank', now, 0);
    const dto = {
      exerciseToken: exercise.token,
      answer: exercise.options.find((option) => option.text === '1')!.id,
      result: 'EASY' as const,
    };
    const first = await service.submit('u1', 'f1', dto, now);
    expect(first).toMatchObject({
      result: 'AGAIN',
      box: 1,
      dueAt: '2026-09-28T16:00:00.000Z',
      feedback: { correct: false },
    });
    expect(await service.submit('u1', 'f1', dto, now)).toEqual(first);
    expect(prisma.formulaReview.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.formulaReviewDay.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: 'u1', day: new Date('2026-09-28'), count: 1 },
      }),
    );
    await expect(
      service.submit(
        'u1',
        'f1',
        {
          ...dto,
          answer: exercise.options.find((option) => option.text === '2')!.id,
        },
        now,
      ),
    ).rejects.toThrow(ConflictException);
  });
  it('rejects another user, missing formula, missing exercise, and changed match group', async () => {
    const { prisma, service } = fixture();
    const { exercise } = exercises.create('u1', formula(), 'blank', now, 0);
    await expect(
      service.submit(
        'u2',
        'f1',
        { exerciseToken: exercise.token, answer: '2' },
        now,
      ),
    ).rejects.toThrow();
    await expect(service.submit('u1', 'f1', {}, now)).rejects.toThrow();
    const group = exercises.create('u1', formula(), 'match', now, undefined, {
      id: 'group',
      formulas: ['f1', 'f2', 'f3', 'f4'].map((id) => formula(id)),
    });
    await expect(
      service.submit(
        'u1',
        'f1',
        {
          exerciseToken: group.exercise.token,
          answer: group.exercise.options[0].id,
        },
        now,
      ),
    ).rejects.toThrow(ConflictException);
    prisma.formula.findUnique.mockResolvedValue(null);
    await expect(
      service.submit('u1', 'missing', { result: 'GOOD' }, now),
    ).rejects.toThrow();
    expect(prisma.formulaReview.upsert).not.toHaveBeenCalled();
  });
  it('keeps the original result-only self-assessment contract', async () => {
    const { service } = fixture();
    expect(
      await service.submit('u1', 'f1', { result: 'GOOD' }, now),
    ).toMatchObject({ source: 'SELF_ASSESSMENT', feedback: null, box: 0 });
  });
  it('retries a serialization collision without double-counting', async () => {
    const { prisma, service } = fixture();
    prisma.$transaction.mockRejectedValueOnce({ code: 'P2034' });
    await service.submit('u1', 'f1', { result: 'GOOD' }, now);
    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(prisma.formulaReviewDay.upsert).toHaveBeenCalledTimes(1);
  });
  it('rejects content edited between grading and the transaction snapshot', async () => {
    const { prisma, service } = fixture();
    prisma.formula.findUnique
      .mockResolvedValueOnce(formula())
      .mockResolvedValueOnce({ ...formula(), quiz: [] });
    await expect(
      service.submit('u1', 'f1', { result: 'GOOD' }, now),
    ).rejects.toThrow(ConflictException);
    expect(prisma.formulaReview.upsert).not.toHaveBeenCalled();
  });

  it('computes personal UB daily statistics', async () => {
    const { prisma, service } = fixture();
    prisma.formulaReview.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(5);
    prisma.formula.count.mockResolvedValue(12);
    prisma.formulaReviewDay.findMany.mockResolvedValue([
      { day: new Date('2026-09-28'), count: 3 },
      { day: new Date('2026-09-27'), count: 2 },
    ]);
    expect(await service.stats('u1', now)).toEqual({
      mastered: 2,
      learning: 3,
      new: 12,
      reviewedToday: 3,
      streakDays: 2,
    });
    expect(prisma.formulaReviewDay.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });
});
