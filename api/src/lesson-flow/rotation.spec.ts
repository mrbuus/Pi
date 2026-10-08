import { choosePhotoTurn, homeworkPrefill } from './rotation';
describe('attendance-aware photo rotation', () => {
  it('never chooses absent/excused/unknown pupils and prioritizes missed then least recent', () => {
    expect(
      choosePhotoTurn(
        [
          { id: 'absent', attendance: 'ABSENT', missedTurn: true },
          { id: 'unknown', attendance: 'UNKNOWN' },
          { id: 'recent', attendance: 'LATE', lastChosenDay: '2026-10-06' },
          { id: 'old', attendance: 'PRESENT', lastChosenDay: '2026-09-01' },
          { id: 'catchup', attendance: 'PRESENT', missedTurn: true },
        ],
        2,
      ).map((x) => x.studentId),
    ).toEqual(['catchup', 'old']);
  });
  it('stable ties, no duplicate pupils, empty attendance yields no fictional assignment', () => {
    const pupils = [
      { id: 'b', attendance: 'PRESENT' as const },
      { id: 'a', attendance: 'PRESENT' as const },
      { id: 'a', attendance: 'PRESENT' as const },
    ];
    expect(choosePhotoTurn(pupils)).toEqual(
      choosePhotoTurn([...pupils].reverse()),
    );
    expect(choosePhotoTurn(pupils).length).toBe(2);
    expect(choosePhotoTurn([])).toEqual([]);
  });
  it('rejects unbounded count and produces editable source-grounded homework', () => {
    expect(() => choosePhotoTurn([], 99)).toThrow();
    expect(homeworkPrefill('Алгебр', 'Тест A').description).toContain('Тест A');
  });
});
