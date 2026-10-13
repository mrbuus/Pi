// Өдрийн хуваарь нийтлэх үеийн мэдэгдлийн ЦЭВЭР логик (ӨС-гүй, тесттэй).
// Багшид — зөвхөн өөрийн (ахлах/туслах эсвэл хуваарийн) хичээлүүд;
// сурагчид — зөвхөн өөрийн ангийн хичээл. Багшийн тайлбар энд ОРОХГҮЙ.

export interface PublishEntry {
  scheduleId: string;
  classroomId: string;
  classroomName: string;
  teacherId: string | null;
  startMinute: number;
  endMinute: number;
  room: string | null;
  topic: string | null;
  leadTeacher: { id: string } | null;
  assistantTeacher: { id: string } | null;
}

const MONTH_DAY = (date: string) => {
  const [, m, d] = date.split('-').map(Number);
  return `${m}-р сарын ${d}`;
};
const WEEKDAY = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const hhmm = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const shortClass = (name: string) => name.replace(/\s*\([^)]*\)\s*$/, '');

export function publishTitle(date: string, again: boolean): string {
  const wd = WEEKDAY[new Date(`${date}T00:00:00.000Z`).getUTCDay()];
  return again
    ? `${MONTH_DAY(date)} (${wd})-ны хуваарь өөрчлөгдлөө`
    : `${MONTH_DAY(date)} (${wd})-ны хуваарь`;
}

function line(e: PublishEntry, role?: 'туслах') {
  return [
    `${hhmm(e.startMinute)}–${hhmm(e.endMinute)}`,
    e.room ? `${e.room} танхим` : null,
    shortClass(e.classroomName),
    e.topic,
    role ? 'туслах багш' : null,
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Хүлээн авагч бүрийн мессежийн бие. Түлхүүр = userId.
 * Багш: өдрийн оноолт байвал түүгээр, үгүй бол хуваарийн багш (teacherId).
 */
export function buildPublishBodies(
  entries: PublishEntry[],
  studentsByClass: Map<string, string[]>,
): Map<string, string> {
  const sorted = [...entries].sort((a, b) => a.startMinute - b.startMinute);
  const teacherLines = new Map<string, string[]>();
  const push = (id: string, text: string) =>
    teacherLines.set(id, [...(teacherLines.get(id) ?? []), text]);
  for (const e of sorted) {
    const staffed = e.leadTeacher || e.assistantTeacher;
    if (staffed) {
      if (e.leadTeacher) push(e.leadTeacher.id, line(e));
      if (e.assistantTeacher) push(e.assistantTeacher.id, line(e, 'туслах'));
    } else if (e.teacherId) {
      push(e.teacherId, line(e));
    }
  }
  const bodies = new Map<string, string>();
  for (const [id, lines] of teacherLines) bodies.set(id, lines.join('\n'));
  const classLines = new Map<string, string[]>();
  for (const e of sorted)
    classLines.set(e.classroomId, [...(classLines.get(e.classroomId) ?? []), line(e)]);
  for (const [classroomId, lines] of classLines)
    for (const studentId of studentsByClass.get(classroomId) ?? [])
      if (!bodies.has(studentId)) bodies.set(studentId, lines.join('\n'));
  return bodies;
}
