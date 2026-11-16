import { Role } from '../generated/prisma/enums';
import { guardTuitionFields } from './tuition-guard';

describe('guardTuitionFields: дүн, тохирсон дүнг Админ ба Багш+ өөрчилнө', () => {
  it.each([Role.ADMIN, Role.TEACHER_PLUS])('%s-ийн илгээсэн утга хэвээр (тавих, арилгах аль аль нь)', (role) => {
    const set = { tuitionPlan: 'FULL_YEAR', tuitionAmount: 2_250_000, tuitionAgreed: 2_250_000 };
    expect(guardTuitionFields(set, role)).toBe(set);
    const clear = { tuitionAgreed: null, tuitionAmount: 3_000_000 };
    expect(guardTuitionFields(clear, role)).toEqual(clear);
  });

  it('бусад role (Багш, шинэ role) хөнгөлөлт тавихгүй, дүн хоослохгүй', () => {
    const dto = { tuitionPlan: 'FULL_YEAR', tuitionAmount: null, tuitionAgreed: null, joinedOn: '2026-09-01' };
    const safe = guardTuitionFields(dto, Role.TEACHER);
    expect(safe).toEqual({ tuitionPlan: 'FULL_YEAR', joinedOn: '2026-09-01' });
    expect(dto.tuitionAgreed).toBeNull();
    expect(guardTuitionFields({ tuitionAmount: 350_000, tuitionAgreed: 900_000 }, Role.TEACHER)).toEqual({ tuitionAmount: 350_000 });
  });
});
