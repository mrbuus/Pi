import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Вэбийн хуанлийн хайрцаг → тэр өдрийн мөр (web/src/components/students/calendar/dayPick.ts).
 * Вэбд тест гүйгч байхгүй тул энд шалгана; зөвхөн api суусан орчинд алгасна.
 */
const WEB_FILE = join(__dirname, '../../../web/src/components/students/calendar/dayPick.ts');
const hasWeb = existsSync(WEB_FILE);
const d = hasWeb ? describe : describe.skip;

type Day = { date: string; own: boolean; classroomName: string; id: string };

d('pickLessonDay', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { pickLessonDay } = (hasWeb ? require(WEB_FILE) : {}) as {
    pickLessonDay: (days: Day[], date: string, other: string | null) => Day | null;
  };
  const days: Day[] = [
    { id: 'a', date: '2026-11-03', own: true, classroomName: 'A1 анги' },
    { id: 'b', date: '2026-11-05', own: false, classroomName: 'B2 анги' },
    { id: 'c', date: '2026-11-05', own: true, classroomName: 'A1 анги' },
    { id: 'e', date: '2026-11-07', own: false, classroomName: 'C3 анги' },
  ];

  it('огноо байхгүй бол null', () => {
    expect(pickLessonDay(days, '2026-11-04', null)).toBeNull();
    expect(pickLessonDay([], '2026-11-04', 'B2 анги')).toBeNull();
  });
  it('ганц мөр — тэр', () => {
    expect(pickLessonDay(days, '2026-11-03', null)?.id).toBe('a');
  });
  it('хоёр мөр — өөр анги заагаагүй бол өөрийн анги', () => {
    expect(pickLessonDay(days, '2026-11-05', null)?.id).toBe('c');
  });
  it('өөр ангид тэмдэглэсэн — нэрээр нь', () => {
    expect(pickLessonDay(days, '2026-11-05', 'B2 анги')?.id).toBe('b');
  });
  it('өөр анги нэр таарахгүй — өөрийн бус мөр', () => {
    expect(pickLessonDay(days, '2026-11-05', 'Z9 анги')?.id).toBe('b');
  });
  it('өөрийн мөргүй өдөр — байгаа мөр', () => {
    expect(pickLessonDay(days, '2026-11-07', null)?.id).toBe('e');
  });
});
