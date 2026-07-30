import { SplitOutOfRangeError, planSplit } from './split-series';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('planSplit', () => {
  describe('REPLACE_ALL — салгах шаардлагагүй', () => {
    it('заасан огноо цувралын эхлэлтэй тэнцүү бол бүхэлд нь солино', () => {
      const plan = planSplit(
        { effectiveFrom: d('2026-09-01'), effectiveTo: null },
        d('2026-09-01'),
      );
      expect(plan).toEqual({ kind: 'REPLACE_ALL' });
    });

    it('заасан огноо цувралын эхлэлээс өмнө бол бүхэлд нь солино', () => {
      const plan = planSplit(
        { effectiveFrom: d('2026-09-01'), effectiveTo: null },
        d('2026-08-15'),
      );
      expect(plan).toEqual({ kind: 'REPLACE_ALL' });
    });
  });

  describe('SPLIT — цувралыг хоёр хуваах', () => {
    it('хуучин мөр заасан огнооны ӨМНӨХ өдөр дуусна', () => {
      const plan = planSplit(
        { effectiveFrom: d('2026-09-01'), effectiveTo: null },
        d('2026-10-05'),
      );
      expect(plan).toEqual({
        kind: 'SPLIT',
        oldEffectiveTo: d('2026-10-04'),
        newEffectiveFrom: d('2026-10-05'),
        newEffectiveTo: null,
      });
    });

    it('шинэ мөр хуучин цувралын төгсгөлийг өвлөнө', () => {
      const plan = planSplit(
        { effectiveFrom: d('2026-09-01'), effectiveTo: d('2027-06-01') },
        d('2026-12-01'),
      );
      expect(plan).toEqual({
        kind: 'SPLIT',
        oldEffectiveTo: d('2026-11-30'),
        newEffectiveFrom: d('2026-12-01'),
        newEffectiveTo: d('2027-06-01'),
      });
    });

    it('сарын эхний өдөр дээр салгахад өмнөх сарын сүүлийн өдөр гарна', () => {
      const plan = planSplit(
        { effectiveFrom: d('2026-01-05'), effectiveTo: null },
        d('2026-03-01'),
      );
      expect(plan).toMatchObject({ oldEffectiveTo: d('2026-02-28') });
    });

    it('өндөр жилийн 3-р сарын 1-нд салгахад 2-р сарын 29 гарна', () => {
      // 2028 бол өндөр жил — энгийн "өдөр хасах" логик энд амархан алддаг.
      const plan = planSplit(
        { effectiveFrom: d('2028-01-05'), effectiveTo: null },
        d('2028-03-01'),
      );
      expect(plan).toMatchObject({ oldEffectiveTo: d('2028-02-29') });
    });

    it('оны эхэнд салгахад өмнөх оны 12 сарын 31 гарна', () => {
      const plan = planSplit(
        { effectiveFrom: d('2026-09-01'), effectiveTo: null },
        d('2027-01-01'),
      );
      expect(plan).toMatchObject({ oldEffectiveTo: d('2026-12-31') });
    });

    it('цувралын эхлэлээс яг нэг өдрийн дараа салгаж болно', () => {
      const plan = planSplit(
        { effectiveFrom: d('2026-09-01'), effectiveTo: null },
        d('2026-09-02'),
      );
      expect(plan).toEqual({
        kind: 'SPLIT',
        oldEffectiveTo: d('2026-09-01'),
        newEffectiveFrom: d('2026-09-02'),
        newEffectiveTo: null,
      });
    });
  });

  describe('алдаа', () => {
    it('цувралын төгсгөлөөс хойш салгахыг татгалзана', () => {
      expect(() =>
        planSplit(
          { effectiveFrom: d('2026-09-01'), effectiveTo: d('2026-12-31') },
          d('2027-01-01'),
        ),
      ).toThrow(SplitOutOfRangeError);
    });

    it('яг төгсгөлийн өдөр дээр салгаж болно (хилийн утга)', () => {
      expect(() =>
        planSplit(
          { effectiveFrom: d('2026-09-01'), effectiveTo: d('2026-12-31') },
          d('2026-12-31'),
        ),
      ).not.toThrow();
    });
  });
});
