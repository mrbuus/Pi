import { calculateSmsSegments, analyzeMessageCharacters } from './sms-segments';

describe('SMS Segments', () => {
  describe('calculateSmsSegments', () => {
    it('хоосон мессеж 0 хэсэг', () => {
      expect(calculateSmsSegments('')).toBe(0);
    });

    it('GSM-7 160 тэмдэгт 1 хэсэг', () => {
      const msg = 'A'.repeat(160);
      expect(calculateSmsSegments(msg)).toBe(1);
    });

    it('GSM-7 161 тэмдэгт 2 хэсэг (overflow)', () => {
      const msg = 'A'.repeat(161);
      expect(calculateSmsSegments(msg)).toBe(2);
    });

    it('Монгол кирилл 70 тэмдэгт 1 хэсэг', () => {
      const msg = 'А'.repeat(70);
      expect(calculateSmsSegments(msg)).toBe(1);
    });

    it('Монгол кирилл 71 тэмдэгт 2 хэсэг', () => {
      const msg = 'А'.repeat(71);
      expect(calculateSmsSegments(msg)).toBe(2);
    });

    it('Холимог кирилл + латин → кирилл сонго (70 т/х)', () => {
      // "Привет123" = 9 ш, 1 хэсэг
      const msg = 'Привет123'; // 9 тэмдэгт кирилл + цифр
      expect(calculateSmsSegments(msg)).toBe(1);

      // 70 кирилл + 10 латин = 80 тэмдэгт, UCS-2 сонго → 70 х/с
      const mixed = 'А'.repeat(70) + 'B'.repeat(10);
      expect(calculateSmsSegments(mixed)).toBe(2); // 80 тэмдэгт / 70 = 1.14... → 2
    });

    it('Шинэ мөр \\n нь 1 тэмдэгт', () => {
      const msg = 'Hello\nWorld';
      expect(calculateSmsSegments(msg)).toBe(1); // 11 / 160 = 1
    });

    it('Англи цэлгээлт, цэг, таслал', () => {
      const msg = 'Hello, World! How are you?';
      expect(calculateSmsSegments(msg)).toBe(1); // 27 / 160 = 1
    });

    it('Бодит монгол хэллэг', () => {
      // "Шинэ Ирээдүйн Эзэд: нууц үг сэргээх код 123456"
      const msg = 'Шинэ Ирээдүйн Эзэд: нууц үг сэргээх код 123456';
      const segments = calculateSmsSegments(msg);
      // 45 тэмдэгт, UCS-2 70 т/х → 1 хэсэг
      expect(segments).toBe(1);
    });

    it('Урт монгол мессеж', () => {
      // 140 кирилл тэмдэгт
      const msg = 'А'.repeat(140);
      // 140 / 70 = 2 хэсэг
      expect(calculateSmsSegments(msg)).toBe(2);
    });
  });

  describe('analyzeMessageCharacters', () => {
    it('GSM-7 цэвэр англи', () => {
      const analysis = analyzeMessageCharacters('Hello');
      // Бүх тэмдэгт GSM7
      expect(analysis).toContain('GSM7');
    });

    it('Монгол кирилл', () => {
      const analysis = analyzeMessageCharacters('Привет');
      expect(analysis).toContain('Cyrillic');
    });

    it('Холимог', () => {
      const analysis = analyzeMessageCharacters('Hello Привет');
      expect(analysis).toContain('GSM7');
      expect(analysis).toContain('Cyrillic');
    });
  });
});
