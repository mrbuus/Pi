import { BadRequestException } from '@nestjs/common';
import { parseDateOnly } from '../common/date';
export interface DismissalInput {
  approximateTime: string;
  lastLeftTime?: string | null;
  note?: string | null;
}
export function dismissalDate(value: string, now = new Date()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new BadRequestException('Өдрөө шалгана уу.');
  let date: Date;
  try {
    date = parseDateOnly(value);
  } catch {
    throw new BadRequestException('Өдрөө шалгана уу.');
  }
  if (
    date.getUTCFullYear() < 2000 ||
    date.getUTCFullYear() > now.getUTCFullYear() + 1
  )
    throw new BadRequestException('Өдрөө шалгана уу.');
  return date;
}
export function dismissalClock(date: string, time: unknown) {
  dismissalDate(date);
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new BadRequestException('Цагаа цаг:минут хэлбэрээр шалгана уу.');
  // Mongolia class timetable convention. Never interpret these clocks in server's OS timezone.
  return new Date(`${date}T${time}:00+08:00`);
}
export function dismissalValues(date: string, body: DismissalInput) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some(
      (key) => !['approximateTime', 'lastLeftTime', 'note'].includes(key),
    )
  )
    throw new BadRequestException('Мэдээллээ шалгана уу.');
  const approximateAt = dismissalClock(date, body.approximateTime);
  const lastLeftAt = body.lastLeftTime
    ? dismissalClock(date, body.lastLeftTime)
    : null;
  if (
    body.lastLeftTime !== undefined &&
    body.lastLeftTime !== null &&
    typeof body.lastLeftTime !== 'string'
  )
    throw new BadRequestException('Цагаа шалгана уу.');
  if (lastLeftAt && lastLeftAt < approximateAt)
    throw new BadRequestException(
      'Сүүлийн сурагчийн цаг ойролцоо тарах цагаас өмнө байна. Цагуудаа шалгана уу.',
    );
  if (
    body.note !== undefined &&
    body.note !== null &&
    (typeof body.note !== 'string' || body.note.length > 1000)
  )
    throw new BadRequestException('Тайлбар 1000 тэмдэгтээс бага байна.');
  return { approximateAt, lastLeftAt, note: body.note?.trim() || null };
}
