import { matchTransaction } from './matcher';

describe('matchTransaction', () => {
  describe('AUTO - бүх болзол сайн', () => {
    it('ЯГ 1 сурагч + expectedAmount + дүн таарна = AUTO', () => {
      const result = matchTransaction(
        { amount: 50000, description: 'Сурагч: 88112233' },
        [{ userId: 'alice', phone: '88112233', expectedAmount: 50000 }],
      );
      expect(result.decision).toBe('AUTO');
      expect(result.userId).toBe('alice');
      expect(result.candidates).toEqual(['alice']);
      expect(result.reason).toContain('таарсан');
    });

    it('дүн 0 байж болно (AUTO)', () => {
      const result = matchTransaction(
        { amount: 0, description: '99887766' },
        [{ userId: 'bob', phone: '99887766', expectedAmount: 0 }],
      );
      expect(result.decision).toBe('AUTO');
      expect(result.userId).toBe('bob');
    });

    it('том дүн AUTO болно', () => {
      const result = matchTransaction(
        { amount: 999999, description: '77123456' },
        [{ userId: 'charlie', phone: '77123456', expectedAmount: 999999 }],
      );
      expect(result.decision).toBe('AUTO');
      expect(result.userId).toBe('charlie');
    });
  });

  describe('SUGGEST - дүн зөрсөн', () => {
    it('утас таарсан ч дүн зөрсөн = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 50000, description: '88112233' },
        [{ userId: 'alice', phone: '88112233', expectedAmount: 60000 }],
      );
      expect(result.decision).toBe('SUGGEST');
      expect(result.candidates).toEqual(['alice']);
      expect(result.reason).toContain('төлбөр зөрсөн');
      expect(result.reason).toContain('50000');
      expect(result.reason).toContain('60000');
    });

    it('дүн бага = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 10000, description: '99887766' },
        [{ userId: 'bob', phone: '99887766', expectedAmount: 50000 }],
      );
      expect(result.decision).toBe('SUGGEST');
    });

    it('дүн их = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 100000, description: '77123456' },
        [{ userId: 'charlie', phone: '77123456', expectedAmount: 50000 }],
      );
      expect(result.decision).toBe('SUGGEST');
    });
  });

  describe('SUGGEST - expectedAmount дутуу', () => {
    it('expectedAmount байхгүй = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 50000, description: '88112233' },
        [{ userId: 'alice', phone: '88112233' }],
      );
      expect(result.decision).toBe('SUGGEST');
      expect(result.candidates).toEqual(['alice']);
      expect(result.reason).toContain('тодорхойгүй');
    });

    it('expectedAmount null = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 50000, description: '99887766' },
        [{ userId: 'bob', phone: '99887766', expectedAmount: null as any }],
      );
      expect(result.decision).toBe('SUGGEST');
    });

    it('expectedAmount undefined = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 50000, description: '77123456' },
        [
          { userId: 'charlie', phone: '77123456', expectedAmount: undefined },
        ],
      );
      expect(result.decision).toBe('SUGGEST');
    });
  });

  describe('SUGGEST - олон сурагч таарсан', () => {
    it('хоёр сурагч таарсан = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 50000, description: '88112233' },
        [
          { userId: 'alice', phone: '88112233', expectedAmount: 50000 },
          { userId: 'bob', phone: '88112233', expectedAmount: 50000 },
        ],
      );
      expect(result.decision).toBe('SUGGEST');
      expect(result.candidates.length).toBe(2);
      expect(result.candidates).toContain('alice');
      expect(result.candidates).toContain('bob');
      expect(result.reason).toContain('хоёр');
    });

    it('гурван сурагч таарсан = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 50000, description: '77123456' },
        [
          { userId: 'alice', phone: '77123456' },
          { userId: 'bob', phone: '77123456' },
          { userId: 'charlie', phone: '77123456' },
        ],
      );
      expect(result.decision).toBe('SUGGEST');
      expect(result.candidates.length).toBe(3);
      expect(result.reason).toContain('гурван');
    });

    it('олон сурагчид дүн адил байж болно', () => {
      const result = matchTransaction(
        { amount: 50000, description: '99887766' },
        [
          { userId: 'user1', phone: '99887766', expectedAmount: 50000 },
          { userId: 'user2', phone: '99887766', expectedAmount: 50000 },
        ],
      );
      expect(result.decision).toBe('SUGGEST');
    });
  });

  describe('NONE - ямар ч таараагүй', () => {
    it('ямар ч дугаар ялгасан байхгүй = NONE', () => {
      const result = matchTransaction(
        { amount: 50000, description: 'Сурагчийн нэр: Батаа Оюун' },
        [{ userId: 'alice', phone: '88112233', expectedAmount: 50000 }],
      );
      expect(result.decision).toBe('NONE');
      expect(result.candidates).toEqual([]);
      expect(result.reason).toContain('дугаар ялгасан');
    });

    it('утас таараагүй = NONE', () => {
      const result = matchTransaction(
        { amount: 50000, description: 'Төлбөр 55112233' },
        [{ userId: 'alice', phone: '88112233' }],
      );
      expect(result.decision).toBe('NONE');
      expect(result.reason).toContain('таараагүй');
    });

    it('сурагч утасгүй = NONE', () => {
      const result = matchTransaction(
        { amount: 50000, description: '88112233' },
        [{ userId: 'alice' }],
      );
      expect(result.decision).toBe('NONE');
    });

    it('хоосон сурагчдын жагсаалт = NONE', () => {
      const result = matchTransaction(
        { amount: 50000, description: '88112233' },
        [],
      );
      expect(result.decision).toBe('NONE');
      expect(result.candidates).toEqual([]);
    });
  });

  describe('префикс ба олон дугаар', () => {
    it('+976 префиксийг цэвэрлээд AUTO болно', () => {
      const result = matchTransaction(
        { amount: 50000, description: '+97688112233' },
        [{ userId: 'alice', phone: '88112233', expectedAmount: 50000 }],
      );
      expect(result.decision).toBe('AUTO');
      expect(result.userId).toBe('alice');
    });

    it('976 префикстэй AUTO болно', () => {
      const result = matchTransaction(
        { amount: 50000, description: '97699887766' },
        [{ userId: 'bob', phone: '99887766', expectedAmount: 50000 }],
      );
      expect(result.decision).toBe('AUTO');
      expect(result.userId).toBe('bob');
    });

    it('олон дугаарын нэгнээс таарсан = AUTO', () => {
      const result = matchTransaction(
        { amount: 50000, description: '99887766, 88112233' },
        [{ userId: 'alice', phone: '88112233', expectedAmount: 50000 }],
      );
      expect(result.decision).toBe('AUTO');
      expect(result.userId).toBe('alice');
    });

    it('олон дугаарын хоёр сурагчтай = SUGGEST', () => {
      const result = matchTransaction(
        { amount: 50000, description: '88112233, 99887766' },
        [
          { userId: 'alice', phone: '88112233' },
          { userId: 'bob', phone: '99887766' },
        ],
      );
      expect(result.decision).toBe('SUGGEST');
      expect(result.candidates.length).toBe(2);
    });
  });

  describe('бодит сценари', () => {
    it('идеал төлбөр холбоо', () => {
      const result = matchTransaction(
        {
          amount: 400000,
          description: 'Төлөлт ирсэн, дотор: 88112233',
        },
        [
          { userId: 'student1', phone: '77123456', expectedAmount: 300000 },
          { userId: 'student2', phone: '88112233', expectedAmount: 400000 },
          { userId: 'student3', phone: '99887766', expectedAmount: 500000 },
        ],
      );
      expect(result.decision).toBe('AUTO');
      expect(result.userId).toBe('student2');
      expect(result.reason).toContain('88112233');
    });

    it('өнөөдөр баруун утас, дүн зөрсөн', () => {
      const result = matchTransaction(
        { amount: 250000, description: 'Утас: 77123456' },
        [
          { userId: 'user1', phone: '77123456', expectedAmount: 300000 },
          { userId: 'user2', phone: '88112233', expectedAmount: 400000 },
        ],
      );
      expect(result.decision).toBe('SUGGEST');
      expect(result.reason).toContain('250000');
      expect(result.reason).toContain('300000');
    });

    it('олон төлөлтийн текст', () => {
      const result = matchTransaction(
        {
          amount: 500000,
          description:
            'Төлөлтийн жагсаалт: 77123456 (эхний), 88112233 (хоёр дахь)',
        },
        [
          { userId: 'student_a', phone: '77123456' },
          { userId: 'student_b', phone: '88112233', expectedAmount: 500000 },
        ],
      );
      expect(result.decision).toBe('SUGGEST');
      expect(result.candidates.length).toBe(2);
    });
  });
});
