import { dominantChapters } from './readiness.service';

describe('dominantChapters (бэлэн байдлын сэдэв → бүлэг)', () => {
  const at = (d: string) => new Date(`${d}T00:00:00Z`);
  it('хамгийн олон бодсон бүлэг; тэнцвэл сүүлд бодсон', () => {
    const map = dominantChapters([
      { topic: 'TRIG', chapterId: 'a', at: at('2026-10-01') },
      { topic: 'TRIG', chapterId: 'b', at: at('2026-10-02') },
      { topic: 'TRIG', chapterId: 'b', at: at('2026-10-03') },
      { topic: 'LOGEQ', chapterId: 'x', at: at('2026-10-01') },
      { topic: 'LOGEQ', chapterId: 'y', at: at('2026-10-05') },
    ]);
    expect(map.get('TRIG')).toBe('b');
    expect(map.get('LOGEQ')).toBe('y');
    expect(map.has('FUNC')).toBe(false);
  });
});
