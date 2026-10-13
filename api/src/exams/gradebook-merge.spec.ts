import { mergeGradebookRow } from './gradebook-merge';

describe('mergeGradebookRow — дүн шивэх торны нүдний нэгтгэл', () => {
  it('base-гүй (Excel импорт) — мөрийг бүхэлд нь солино', () => {
    expect(
      mergeGradebookRow({ wrong: ['b', 'a', 'a'], absent: false }, undefined, {
        wrong: ['x'],
        absent: false,
      }),
    ).toEqual({
      wrong: ['a', 'b'],
      absent: false,
      merged: false,
    });
  });

  it('хоёр багш нэг сурагчийн өөр бодлогыг: хоёулангийнх нь 0 үлдэнэ', () => {
    // Багш 1: 1–20-р бодлогоос 3-ыг 0; тэр хооронд багш 2: 25-ыг 0 болгож хадгалсан
    const out = mergeGradebookRow(
      { wrong: ['3'], absent: false },
      { wrong: [], absent: false },
      { wrong: ['25'], absent: false },
    );
    expect(out).toEqual({ wrong: ['25', '3'], absent: false, merged: true });
  });

  it('энэ багшийн арилгасан 0 л арилна', () => {
    const out = mergeGradebookRow(
      { wrong: ['2'], absent: false },
      { wrong: ['1', '2'], absent: false },
      { wrong: ['1', '2', '9'], absent: false },
    );
    expect(out.wrong).toEqual(['2', '9']);
  });

  it('бусад өөрчлөөгүй бол merged=false', () => {
    const out = mergeGradebookRow(
      { wrong: ['1'], absent: false },
      { wrong: [], absent: false },
      { wrong: [], absent: false },
    );
    expect(out).toEqual({ wrong: ['1'], absent: false, merged: false });
  });

  it('ирээгүй: энэ багш тэмдэглэвэл ирээгүй; нүд шивсэн бол ирсэн; эс бөгөөс одоогийнх', () => {
    expect(
      mergeGradebookRow(
        { wrong: [], absent: true },
        { wrong: [], absent: false },
        { wrong: ['5'], absent: false },
      ),
    ).toEqual({
      wrong: [],
      absent: true,
      merged: true,
    });
    expect(
      mergeGradebookRow(
        { wrong: ['1'], absent: false },
        { wrong: [], absent: false },
        { wrong: [], absent: true },
      ).absent,
    ).toBe(false);
    expect(
      mergeGradebookRow(
        { wrong: [], absent: false },
        { wrong: [], absent: false },
        { wrong: [], absent: true },
      ),
    ).toEqual({
      wrong: [],
      absent: true,
      merged: true,
    });
  });
});
