import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import type { Formula } from '../generated/prisma/client';
import type { ReviewResult } from './review-scheduler';

export type ExerciseMode = 'flashcard' | 'blank' | 'truefalse' | 'match';
export type Quiz = {
  type: 'blank' | 'truefalse';
  prompt: string;
  answer: string;
  distractors?: string[];
  why?: string;
};
export interface Challenge {
  userId: string;
  slug: string;
  version: string;
  mode: ExerciseMode;
  nonce: string;
  expiresAt: number;
  quizIndex?: number;
  groupId?: string;
  matches?: { id: string; version: string }[];
}
export function formulaVersion(formula: Formula): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        formula.id,
        formula.updatedAt,
        formula.name,
        formula.latex,
        formula.general,
        formula.quiz,
      ]),
    )
    .digest('hex');
}
export function quizzes(formula: Formula): Quiz[] {
  if (!Array.isArray(formula.quiz)) return [];
  return formula.quiz as unknown as Quiz[];
}
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function interleave<T extends { sectionSlug: string | null }>(
  rows: T[],
): T[] {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = row.sectionSlug ?? '';
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  const result: T[] = [];
  while (groups.size)
    for (const [key, group] of groups) {
      result.push(group.shift()!);
      if (!group.length) groups.delete(key);
    }
  return result;
}

/** Signed identity contains no answer. Option IDs are keyed separately, so
 * matching formula IDs in the identity cannot reveal a choice's association. */
export class ReviewExercises {
  constructor(private readonly secret: string) {}
  private digest(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('base64url');
  }
  optionId(scope: string, value: string) {
    return this.digest(`option:${scope}:${value}`);
  }
  sign(challenge: Challenge) {
    const payload = Buffer.from(JSON.stringify(challenge)).toString(
      'base64url',
    );
    return `${payload}.${this.digest(`exercise:${payload}`)}`;
  }
  read(token: string, userId: string, slug: string, now: Date): Challenge {
    try {
      const [payload, signature, extra] = token.split('.');
      const expected = Buffer.from(this.digest(`exercise:${payload}`));
      const supplied = Buffer.from(signature ?? '');
      if (
        extra ||
        expected.length !== supplied.length ||
        !timingSafeEqual(expected, supplied)
      )
        throw new Error();
      const value = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      ) as Challenge;
      if (
        value.userId !== userId ||
        value.slug !== slug ||
        !['flashcard', 'blank', 'truefalse', 'match'].includes(value.mode) ||
        typeof value.nonce !== 'string' ||
        !Number.isFinite(value.expiresAt)
      )
        throw new Error();
      if (value.expiresAt < now.getTime())
        throw new ConflictException(
          'Дасгалын хугацаа дууссан. Шинэ сесс эхлүүлнэ үү.',
        );
      return value;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new BadRequestException('Дасгалын мэдээлэл хүчингүй байна.');
    }
  }
  create(
    userId: string,
    formula: Formula,
    mode: ExerciseMode,
    now: Date,
    quizIndex?: number,
    group?: { id: string; formulas: Formula[] },
  ) {
    const challenge: Challenge = {
      userId,
      slug: formula.slug!,
      version: formulaVersion(formula),
      mode,
      nonce: randomUUID(),
      expiresAt: now.getTime() + 86_400_000,
      ...(quizIndex === undefined ? {} : { quizIndex }),
      ...(group
        ? {
            groupId: group.id,
            matches: group.formulas.map((row) => ({
              id: row.id,
              version: formulaVersion(row),
            })),
          }
        : {}),
    };
    const quiz =
      quizIndex === undefined ? undefined : quizzes(formula)[quizIndex];
    let options: { id: string; text: string }[] = [];
    if (mode === 'blank' && quiz)
      options = shuffle([
        quiz.answer,
        ...(quiz.distractors ?? []).slice(0, 3),
      ]).map((text) => ({ id: this.optionId(challenge.nonce, text), text }));
    if (mode === 'truefalse')
      options = [
        { id: 'true', text: 'Үнэн' },
        { id: 'false', text: 'Худал' },
      ];
    if (mode === 'match' && group)
      options = group.formulas.map((row) => ({
        id: this.optionId(group.id, row.id),
        text: row.latex!,
      }));
    return {
      challenge,
      exercise: {
        mode,
        token: this.sign(challenge),
        ...(group ? { groupId: group.id } : {}),
        prompt: quiz?.prompt ?? null,
        options,
      },
    };
  }
  grade(
    challenge: Challenge,
    formula: Formula,
    answer?: string,
    result?: ReviewResult,
  ) {
    if (formulaVersion(formula) !== challenge.version)
      throw new ConflictException(
        'Томьёо шинэчлэгдсэн. Шинэ сесс эхлүүлнэ үү.',
      );
    if (challenge.mode === 'flashcard') {
      if (!result || answer !== undefined)
        throw new BadRequestException('Флэш картыг өөрөө үнэлнэ үү.');
      return { result, feedback: null, source: 'SELF_ASSESSMENT' as const };
    }
    if (answer === undefined)
      throw new BadRequestException('Хариулт сонгоно уу.');
    const quiz =
      challenge.quizIndex === undefined
        ? undefined
        : quizzes(formula)[challenge.quizIndex];
    if (challenge.mode !== 'match' && (!quiz || quiz.type !== challenge.mode))
      throw new BadRequestException('Дасгалын төрөл зөрсөн байна.');
    let correct: boolean;
    if (challenge.mode === 'match') {
      const candidates = challenge.matches ?? [];
      if (
        !challenge.groupId ||
        !candidates.some((row) => row.id === formula.id) ||
        !candidates.some(
          (row) => this.optionId(challenge.groupId!, row.id) === answer,
        )
      )
        throw new BadRequestException('Хосын сонголт хүчингүй байна.');
      correct = answer === this.optionId(challenge.groupId, formula.id);
    } else if (challenge.mode === 'blank') {
      const choices = [quiz!.answer, ...(quiz!.distractors ?? []).slice(0, 3)];
      if (
        !choices.some(
          (choice) => this.optionId(challenge.nonce, choice) === answer,
        )
      )
        throw new BadRequestException('Сонголт хүчингүй байна.');
      correct = answer === this.optionId(challenge.nonce, quiz!.answer);
    } else {
      if (!['true', 'false'].includes(answer))
        throw new BadRequestException('Үнэн эсвэл худал сонгоно уу.');
      correct = answer === quiz!.answer;
    }
    // A forged client result never changes objective grading.
    return {
      result: correct ? ('GOOD' as const) : ('AGAIN' as const),
      source: 'SERVER_GRADED' as const,
      feedback: {
        correct,
        answer: challenge.mode === 'match' ? formula.latex : quiz!.answer,
        why: quiz?.why ?? null,
        latex: formula.latex,
        general: formula.general,
      },
    };
  }
}
