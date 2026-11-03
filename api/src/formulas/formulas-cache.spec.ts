import { FormulasService } from './formulas.service';

describe('FormulasService кэш (docs/BACKEND-PERF.md)', () => {
  function setup() {
    const row = { id: 'f1', name: 'Синус', description: null, slug: 'sin', section: { slug: 'trig' }, sectionSlug: 'trig', order: 1, level: 1, grade: 10, topicSlugs: [], latex: 'x', general: 'x', widget: null };
    const prisma = {
      formula: { findMany: jest.fn().mockResolvedValue([row]) },
      formulaSection: { findMany: jest.fn().mockResolvedValue([{ slug: 'trig', _count: { formulas: 1 } }]) },
    };
    return { prisma, service: new FormulasService(prisma as never) };
  }

  it('жагсаалт, бүлгийг давтан асуухад ӨС-ийг дахин дуудахгүй; шүүлтүүр тус бүр тусдаа', async () => {
    const { prisma, service } = setup();
    const a = await service.list({});
    const b = await service.list({});
    expect(b).toEqual(a);
    await service.list({ section: 'trig' });
    expect(prisma.formula.findMany).toHaveBeenCalledTimes(2);
    await service.sections();
    await service.sections();
    expect(prisma.formulaSection.findMany).toHaveBeenCalledTimes(1);
  });
});
