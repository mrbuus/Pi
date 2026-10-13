import { teacherDisplayNames } from './schedule.service';

describe('teacherDisplayNames — төвийн хүснэгтийн хэлбэр', () => {
  it('ганц нэртэйд зөвхөн нэр, давхардсанд овгийн үсэг', () => {
    const users = [
      { id: 'a', firstName: 'Анар', lastName: 'А.' },
      { id: 'b', firstName: 'Марал-Эрдэнэ', lastName: 'Б.' },
      { id: 'z', firstName: 'Марал-Эрдэнэ', lastName: 'З.' },
      { id: 'e', firstName: 'Эмүжин', lastName: 'Улаанбаатар' },
    ];
    const pool = [...users, { firstName: 'Эмүжин' }];
    const n = teacherDisplayNames(users, pool);
    expect(n.get('a')).toBe('Анар');
    expect(n.get('b')).toBe('Б. Марал-Эрдэнэ');
    expect(n.get('z')).toBe('З. Марал-Эрдэнэ');
    expect(n.get('e')).toBe('У. Эмүжин');
  });
});
