import { shortName, withPlus } from './revision-snapshot';

/** Эзний хатуу дүрэм: Багш+ хүний нэрийн ард үргэлж «+» (давхар биш). */
describe('withPlus — Багш+ нэрийн «+»', () => {
  it('Багш+-д нэмнэ, давхар нэмэхгүй', () => {
    expect(withPlus('Овог Болортуяа', 'TEACHER_PLUS')).toBe('Овог Болортуяа+');
    expect(withPlus('Овог Болортуяа+', 'TEACHER_PLUS')).toBe('Овог Болортуяа+');
    expect(withPlus(withPlus('Б', 'TEACHER_PLUS'), 'TEACHER_PLUS')).toBe('Б+');
  });
  it('Багш, Админд нэмэхгүй', () => {
    expect(withPlus('Овог Эмүжин', 'TEACHER')).toBe('Овог Эмүжин');
    expect(withPlus('Овог Нэр', 'ADMIN')).toBe('Овог Нэр');
  });
  it('shortName (presence, тэмдэглэл) role-оор «+»', () => {
    expect(shortName({ firstName: 'Болортуяа', lastName: 'Бат', role: 'TEACHER_PLUS' })).toBe('Б. Болортуяа+');
  });
});
