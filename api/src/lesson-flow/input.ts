import { BadRequestException } from '@nestjs/common';
const invalid = () => new BadRequestException('Өдрийн мэдээллээ шалгана уу.');
function record(value: unknown, allowed: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((k) => !allowed.includes(k))
  )
    throw invalid();
  return value as Record<string, unknown>;
}
function text(value: unknown, max: number, empty = false): string {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (!empty && !value.trim())
  )
    throw invalid();
  return value;
}
function ids(value: unknown, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) throw invalid();
  return (value as unknown[]).map((v) => text(v, 200));
}
export interface PacketInput {
  chapterId: string;
  theoryBlockIds?: string[];
  testId?: string | null;
  makeupTestId?: string | null;
  homework?: {
    title: string;
    description: string;
    imageKeys?: string[];
    dueDate?: string;
  };
}
export function packetInput(raw: unknown): PacketInput {
  const b = record(raw, [
    'chapterId',
    'theoryBlockIds',
    'testId',
    'makeupTestId',
    'homework',
  ]);
  const result: PacketInput = { chapterId: text(b.chapterId, 200) };
  if (b.theoryBlockIds !== undefined)
    result.theoryBlockIds = ids(b.theoryBlockIds, 100);
  for (const k of ['testId', 'makeupTestId'] as const)
    if (b[k] !== undefined) result[k] = b[k] === null ? null : text(b[k], 200);
  if (b.homework !== undefined) {
    const h = record(b.homework, [
      'title',
      'description',
      'imageKeys',
      'dueDate',
    ]);
    result.homework = {
      title: text(h.title, 200),
      description: text(h.description, 10000, true),
    };
    if (h.imageKeys !== undefined)
      result.homework.imageKeys = ids(h.imageKeys, 10);
    if (h.dueDate !== undefined) result.homework.dueDate = text(h.dueDate, 10);
  }
  return result;
}
export function receiptInput(raw: unknown) {
  const b = record(raw, ['kind', 'imageKeys', 'clientRequestId']);
  const kind = text(b.kind, 20);
  if (!['THEORY', 'CLASS_TEST', 'HOMEWORK', 'MAKEUP'].includes(kind))
    throw invalid();
  const clientRequestId = text(b.clientRequestId, 100);
  if (!/^[-\w]{8,100}$/.test(clientRequestId)) throw invalid();
  return { kind, clientRequestId, imageKeys: ids(b.imageKeys, 10) };
}
export function turnInput(raw: unknown) {
  const b = record(raw, ['studentId', 'reason']);
  if (b.studentId === undefined) {
    if (b.reason !== undefined) throw invalid();
    return { studentId: undefined, reason: undefined };
  }
  return { studentId: text(b.studentId, 200), reason: text(b.reason, 500) };
}
