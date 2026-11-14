import { Role } from '../generated/prisma/enums';
import { guardTuitionFields } from './tuition-guard';

describe('guardTuitionFields: тохирсон дүнг зөвхөн Админ өөрчилнө', () => {
  it('Админы илгээсэн утга хэвээр (тавих, арилгах аль аль нь)', () => {
    const set = { tuitionPlan: 'FULL_YEAR', tuitionAmount: 2_500_000, tuitionAgreed: 2_500_000 };
    expect(guardTuitionFields(set, Role.ADMIN)).toBe(set);
    const clear = { tuitionAgreed: null, tuitionAmount: 3_000_000 };
    expect(guardTuitionFields(clear, Role.ADMIN)).toEqual(clear);
  });

  it('Багш+ багц засахад Админы хөнгөлөлт арилахгүй, дүн хоосрохгүй', () => {
    // Вэбийн багцын цонх Багш+-д (үнэ харагдахгүй) яг үүнийг илгээдэг байсан
    const dto = { tuitionPlan: 'FULL_YEAR', tuitionAmount: null, tuitionAgreed: null, joinedOn: '2026-09-01' };
    const safe = guardTuitionFields(dto, Role.TEACHER_PLUS);
    expect(safe).toEqual({ tuitionPlan: 'FULL_YEAR', joinedOn: '2026-09-01' });
    expect('tuitionAgreed' in safe).toBe(false);
    expect('tuitionAmount' in safe).toBe(false);
    // эх объект өөрчлөгдөхгүй
    expect(dto.tuitionAgreed).toBeNull();
  });

  it('Багш+ хөнгөлөлт тавьж чадахгүй ч тодорхой дүн оруулах эрх хэвээр', () => {
    const safe = guardTuitionFields({ tuitionAmount: 350_000, tuitionAgreed: 900_000 }, Role.TEACHER_PLUS);
    expect(safe).toEqual({ tuitionAmount: 350_000 });
  });

  it('бусад role (Багш, шинэ role) мөн адил', () => {
    expect(guardTuitionFields({ tuitionAgreed: null }, Role.TEACHER)).toEqual({});
  });
});
