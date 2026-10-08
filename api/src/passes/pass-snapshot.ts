import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

export interface PassSnapshot {
  version: 1;
  durationDays: number;
  scope: {
    all?: boolean;
    chapterIds?: string[];
    bookIds?: string[];
    testIds?: string[];
  };
}
export function validatePassSnapshot(value: unknown): PassSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Эрхийн нөхцөл буруу байна');
  const snapshot = value as Record<string, unknown>;
  const days = snapshot.durationDays;
  if (
    snapshot.version !== 1 ||
    !Number.isSafeInteger(days) ||
    (days as number) <= 0 ||
    !Number.isFinite(
      new Date(Date.now() + (days as number) * 86400000).getTime(),
    )
  )
    throw new BadRequestException('Эрхийн хугацаа буруу байна');
  const raw = snapshot.scope;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new BadRequestException('Эрхийн хамрах хүрээ буруу байна');
  const scope: PassSnapshot['scope'] = {};
  for (const [key, val] of Object.entries(raw)) {
    if (key === 'all' && typeof val === 'boolean') scope.all = val;
    else if (
      ['chapterIds', 'bookIds', 'testIds'].includes(key) &&
      Array.isArray(val) &&
      val.length <= 5000 &&
      val.every(
        (id) => typeof id === 'string' && id.length > 0 && id.length <= 200,
      )
    )
      scope[key as 'testIds'] = [...new Set(val)];
    else throw new BadRequestException('Эрхийн хамрах хүрээ буруу байна');
  }
  return { version: 1, durationDays: days as number, scope };
}
export function snapshotPass(pass: {
  durationDays: number;
  scope: Prisma.JsonValue;
}): PassSnapshot {
  return validatePassSnapshot({
    version: 1,
    durationDays: pass.durationDays,
    scope: pass.scope,
  });
}
