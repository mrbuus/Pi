export interface RotationPupil {
  id: string;
  attendance: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'UNKNOWN';
  lastChosenDay?: string;
  missedTurn?: boolean;
}
/** Only present/late pupils can capture class photos. Unknown attendance is never assumed present. */
export function choosePhotoTurn(pupils: RotationPupil[], count = 2) {
  if (!Number.isInteger(count) || count < 1 || count > 10)
    throw new Error('count must be 1..10');
  const unique = new Map(pupils.map((p) => [p.id, p]));
  return [...unique.values()]
    .filter((p) => p.attendance === 'PRESENT' || p.attendance === 'LATE')
    .sort(
      (a, b) =>
        Number(!!b.missedTurn) - Number(!!a.missedTurn) ||
        (a.lastChosenDay ?? '').localeCompare(b.lastChosenDay ?? '') ||
        a.id.localeCompare(b.id),
    )
    .slice(0, count)
    .map((p) => ({
      studentId: p.id,
      reason: p.missedTurn
        ? 'MISSED_TURN'
        : p.lastChosenDay
          ? 'LEAST_RECENT'
          : 'NO_RECORDED_TURN',
    }));
}
export function homeworkPrefill(chapterTitle: string, testTitle?: string) {
  return {
    title: `${chapterTitle} — гэрийн даалгавар`,
    description: [
      `Онол: ${chapterTitle}`,
      testTitle ? `Ангид хийсэн тест: ${testTitle}` : '',
      'Багш бодлого, хугацаа болон зураг хавсралтаа шалгаж тохируулна.',
    ]
      .filter(Boolean)
      .join('\n'),
  };
}
