// Танхимын давхар захиалга (2026-10-18): нэг танхимд, нэг гарагт, цаг нь
// давхцсан, хүчинтэй хугацаа нь огтлолцсон ӨӨР ангийн хуваарь байж болохгүй.
// «Онлайн» болон танхимгүй хуваарь хамаарахгүй. ЦЭВЭР логик — тесттэй.

const FAR_FUTURE = new Date('9999-12-31');

export interface RoomSlot {
  id?: string;
  classroomId: string;
  room: string | null;
  weekday: number;
  startMinute: number;
  endMinute: number;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export function roomCounts(room: string | null | undefined): room is string {
  return !!room && room.trim() !== '' && room.trim() !== 'Онлайн';
}

export function findRoomConflict<T extends RoomSlot>(
  candidate: RoomSlot,
  others: T[],
): T | undefined {
  if (!roomCounts(candidate.room)) return undefined;
  const end = candidate.effectiveTo ?? FAR_FUTURE;
  return others.find(
    (s) =>
      s.id !== candidate.id &&
      s.classroomId !== candidate.classroomId &&
      s.room === candidate.room &&
      s.weekday === candidate.weekday &&
      candidate.startMinute < s.endMinute &&
      s.startMinute < candidate.endMinute &&
      candidate.effectiveFrom <= (s.effectiveTo ?? FAR_FUTURE) &&
      s.effectiveFrom <= end,
  );
}

const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export function roomConflictMessage(
  room: string,
  other: { startMinute: number; endMinute: number },
  otherClass: string,
): string {
  return `${room} танхимд ${hhmm(other.startMinute)}–${hhmm(other.endMinute)} хугацаанд ${otherClass} анги хичээллэдэг тул давхцаж байна`;
}
