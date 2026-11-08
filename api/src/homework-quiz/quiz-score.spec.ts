import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as apiImpl from './quiz-score';

/**
 * Шалгалтын онооны өнгө, дундаж (эзэн 2026-11-08). Вэбийн хуулбар (web/src/lib/quizScore.ts)-ыг
 * ч ИЖИЛ хүснэгтээр шалгана — вэбд тест гүйгч байхгүй. Зөвхөн api суусан орчинд вэбийнхийг алгасна.
 */
const WEB_FILE = join(__dirname, '../../../web/src/lib/quizScore.ts');
const hasWeb = existsSync(WEB_FILE);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const impls: [string, typeof apiImpl][] = [['api', apiImpl], ...(hasWeb ? [['web', require(WEB_FILE)] as [string, typeof apiImpl]] : [])];

describe.each(impls)('quizScore (%s)', (_name, q) => {
  describe('quizTone — хил яг эзний хэлснээр', () => {
    it.each([
      // [оноо, бодлого, өнгө]
      [0, 10, 'error'],
      [4, 10, 'error'], // 40%
      [4.999, 10, 'error'], // 49,99%
      [5, 10, 'warning'], // 50%
      [7, 10, 'warning'], // 70%
      [7.999, 10, 'warning'], // 79,99%
      [8, 10, 'success'], // 80%
      [10, 10, 'success'], // 100%
      [4999, 10000, 'error'], // 49,99%
      [5000, 10000, 'warning'],
      [7999, 10000, 'warning'], // 79,99%
      [8000, 10000, 'success'],
      // 3 бодлого: 1/3 = 33% улаан, 2/3 = 66,7% улбар шар, 3/3 ногоон
      [1, 3, 'error'],
      [2, 3, 'warning'],
      [3, 3, 'success'],
      // 7 бодлого: 3/7 = 42,9 улаан; 4/7 = 57,1 улбар шар; 5/7 = 71,4 улбар шар; 6/7 = 85,7 ногоон
      [3, 7, 'error'],
      [4, 7, 'warning'],
      [5, 7, 'warning'],
      [6, 7, 'success'],
      // Хөвөгч тооны урхи: 0.1·3 гэх мэт биш, бүхэл тэнцэтгэл бишээр
      [1, 2, 'warning'], // яг 50%
      [4, 5, 'success'], // яг 80%
      [1, 1, 'success'],
      [0, 1, 'error'],
    ])('%p/%p → %p', (score, count, tone) => {
      expect(q.quizTone(score, count)).toBe(tone);
    });

    it('оноогүй эсвэл бодлогын тоо буруу бол өнгөгүй', () => {
      expect(q.quizTone(null, 10)).toBeNull();
      expect(q.quizTone(undefined, 10)).toBeNull();
      expect(q.quizTone(NaN, 10)).toBeNull();
      expect(q.quizTone(5, 0)).toBeNull();
      expect(q.quizTone(5, -3)).toBeNull();
    });

    it('бодлого 1..200, оноо 0..тоо бүх хослолд хувийн мужтай таарна', () => {
      for (let n = 1; n <= 200; n++) {
        for (let s = 0; s <= n; s++) {
          // Бүхэл тоогоор жишиг: 100·s/n < 50 ⇔ 100·s < 50·n
          const want = 100 * s < 50 * n ? 'error' : 100 * s < 80 * n ? 'warning' : 'success';
          expect(q.quizTone(s, n)).toBe(want);
        }
      }
    });
  });

  describe('percentTone', () => {
    it.each([
      [0, 'error'],
      [49.99, 'error'],
      [50, 'warning'],
      [79.99, 'warning'],
      [80, 'success'],
      [100, 'success'],
    ])('%p%% → %p', (pct, tone) => {
      expect(q.percentTone(pct)).toBe(tone);
    });
    it('null → өнгөгүй', () => {
      expect(q.percentTone(null)).toBeNull();
      expect(q.percentTone(NaN)).toBeNull();
    });
  });

  describe('quizAverage — зөвхөн оноотой сурагчаар', () => {
    it('хоосон сурагч тоонд орохгүй', () => {
      const a = q.quizAverage([8, null, 6, undefined], 10)!;
      expect(a.count).toBe(2);
      expect(a.pct).toBe(70);
      expect(a.tone).toBe('warning');
    });
    it('нэг ч оноогүй бол null', () => {
      expect(q.quizAverage([], 10)).toBeNull();
      expect(q.quizAverage([null, null], 10)).toBeNull();
      expect(q.quizAverage([5], 0)).toBeNull();
    });
    it('0 оноо тоонд орно (хоосонтой андуурахгүй)', () => {
      const a = q.quizAverage([0, 10], 10)!;
      expect(a.pct).toBe(50);
      expect(a.tone).toBe('warning');
    });
    it('хилийн дундаж: 79,99% улбар шар, 80% ногоон (бүхэл тоогоор)', () => {
      // 3 сурагч × 10 бодлого: 8+8+7 = 23/30 = 76,7% → улбар шар; 8+8+8 = 80% → ногоон
      expect(q.quizAverage([8, 8, 7], 10)!.tone).toBe('warning');
      expect(q.quizAverage([8, 8, 8], 10)!.tone).toBe('success');
      // 7999/10000 ба 8000/10000
      expect(q.quizAverage([7999], 10000)!.tone).toBe('warning');
      expect(q.quizAverage([4000, 4000], 10000)!.tone).toBe('error');
      expect(q.quizAverage([5000, 5000], 10000)!.tone).toBe('warning');
    });
  });

  describe('meanPercent — өөр өөр бодлогын тоотой өдрүүд', () => {
    it('өдөр бүр ижил жинтэй', () => {
      // 5/10 = 50, 9/10 = 90 → 70; 1/4 = 25 → (50+90+25)/3 = 55
      expect(q.meanPercent([{ score: 5, problemCount: 10 }, { score: 9, problemCount: 10 }])).toBe(70);
      expect(q.meanPercent([{ score: 5, problemCount: 10 }, { score: 9, problemCount: 10 }, { score: 1, problemCount: 4 }])).toBe(55);
    });
    it('хоосон бол null', () => {
      expect(q.meanPercent([])).toBeNull();
    });
  });

  describe('formatPercent — доош тайрна, өнгөтэй зөрөхгүй', () => {
    it.each([
      [0, '0%'],
      [49.99, '49%'],
      [50, '50%'],
      [79.99, '79%'],
      [80, '80%'],
      [100, '100%'],
      [(2 * 100) / 3, '66%'],
      [(7 * 100) / 10, '70%'],
    ])('%p → %p', (pct, text) => {
      expect(q.formatPercent(pct)).toBe(text);
    });
    it('бичсэн бүхэл хувь ба өнгө үргэлж нэг мужид', () => {
      for (let n = 1; n <= 60; n++)
        for (let s = 0; s <= n; s++) {
          const shown = Number(q.formatPercent((s * 100) / n).replace('%', ''));
          expect(q.percentTone(shown)).toBe(q.quizTone(s, n));
        }
    });
  });

  describe('parseScoreInput', () => {
    it('хоосон = цэвэрлэх', () => {
      expect(q.parseScoreInput('', 10)).toEqual({ ok: true, value: null });
      expect(q.parseScoreInput('   ', 10)).toEqual({ ok: true, value: null });
    });
    it('бүхэл 0..max', () => {
      expect(q.parseScoreInput('0', 10)).toEqual({ ok: true, value: 0 });
      expect(q.parseScoreInput('08', 10)).toEqual({ ok: true, value: 8 });
      expect(q.parseScoreInput(' 10 ', 10)).toEqual({ ok: true, value: 10 });
    });
    it.each(['11', '-1', '7.5', '7,5', 'abc', '1e1', '+3', '12345'])('%p — буруу', (t) => {
      expect(q.parseScoreInput(t, 10).ok).toBe(false);
    });
  });

  describe('parseProblemCount', () => {
    it.each([
      ['1', 1],
      ['10', 10],
      ['200', 200],
    ])('%p → %p', (t, n) => {
      expect(q.parseProblemCount(t)).toEqual({ ok: true, value: n });
    });
    it.each(['', '0', '201', '2.5', '-4', 'х'])('%p — буруу', (t) => {
      expect(q.parseProblemCount(t).ok).toBe(false);
    });
  });

  describe('quizCoveredDays — сарын «Тэмдэглээгүй»-г засах', () => {
    it('тэмдэглээгүй боловч шалгалтын оноотой өдөр л хасагдана', () => {
      const expected = ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-06'];
      // 11-02 тэмдэглэсэн + шалгалт (давхар хасахгүй), 11-04 зөвхөн шалгалт, 11-06 юу ч үгүй,
      // 11-09 шалгалт ч хүлээгдэж буй (expected-д алга) өдөр биш
      expect(q.quizCoveredDays(expected, ['2026-11-02'], ['2026-11-02', '2026-11-04', '2026-11-09'])).toBe(1);
    });
    it('шалгалтгүй бол 0', () => {
      expect(q.quizCoveredDays(['2026-11-02'], [], [])).toBe(0);
    });
  });
});

it('api ба вэбийн хуулбарын их бие ижил (нэгийг нь засаад нөгөөг мартвал унана)', () => {
  if (!hasWeb) return;
  const body = (s: string) => s.slice(s.indexOf('/** marks.tsx'));
  expect(body(readFileSync(join(__dirname, 'quiz-score.ts'), 'utf8'))).toBe(body(readFileSync(WEB_FILE, 'utf8')));
});
