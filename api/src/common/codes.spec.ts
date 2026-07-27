import { BadRequestException } from '@nestjs/common';
import {
  generateStudentCode,
  generateTeacherCode,
  resolveUniqueUsername,
} from './codes';

// PrismaService-ийг гараар дуурайлган хийсэн stub — mocking сан ашиглахгүй,
// амьд DB ч хэрэггүй.
interface FakeUser {
  id: string;
  studentCode?: string;
  teacherCode?: string;
  username?: string;
}

function makeCodePrisma(users: FakeUser[]) {
  return {
    user: {
      findFirst: async ({ where }: any) => {
        const field: 'studentCode' | 'teacherCode' = where.studentCode
          ? 'studentCode'
          : 'teacherCode';
        const prefix: string = where[field].startsWith;
        const matches = users
          .map((u) => u[field])
          .filter((v): v is string => !!v && v.startsWith(prefix))
          .sort();
        if (matches.length === 0) return null;
        return { [field]: matches[matches.length - 1] };
      },
      findUnique: async ({ where }: any) => {
        if (where.studentCode !== undefined) {
          const found = users.find((u) => u.studentCode === where.studentCode);
          return found ? { id: found.id } : null;
        }
        if (where.teacherCode !== undefined) {
          const found = users.find((u) => u.teacherCode === where.teacherCode);
          return found ? { id: found.id } : null;
        }
        return null;
      },
    },
  } as any;
}

function makeUsernamePrisma(existingUsernames: string[]) {
  return {
    user: {
      findUnique: async ({ where }: any) =>
        existingUsernames.includes(where.username) ? { id: 'x' } : null,
    },
  } as any;
}

describe('generateStudentCode', () => {
  it('SIE-<жил>-<хичээл>-<дараалал> форматтай код үүсгэнэ (M/N/B)', async () => {
    const prisma = makeCodePrisma([]);
    expect(
      await generateStudentCode(prisma, { enrolmentYear: 2026, subject: 'M' }),
    ).toBe('SIE-26-M-0001');
    expect(
      await generateStudentCode(prisma, { enrolmentYear: 2026, subject: 'N' }),
    ).toBe('SIE-26-N-0001');
    expect(
      await generateStudentCode(prisma, { enrolmentYear: 2026, subject: 'B' }),
    ).toBe('SIE-26-B-0001');
  });

  it('subject заагаагүй бол B (тодорхойгүй) ашиглана', async () => {
    const prisma = makeCodePrisma([]);
    expect(await generateStudentCode(prisma, { enrolmentYear: 2026 })).toBe(
      'SIE-26-B-0001',
    );
  });

  it('enrolmentYear заагаагүй бол өнөөдрийн жилийн сүүлийн 2 оронг ашиглана', async () => {
    const prisma = makeCodePrisma([]);
    const expectedYear = String(new Date().getFullYear() % 100).padStart(2, '0');
    const code = await generateStudentCode(prisma, { subject: 'M' });
    expect(code).toBe(`SIE-${expectedYear}-M-0001`);
  });

  it('дараалал одоогийн ХАМГИЙН ИХ кодоос үргэлжилнэ, count() биш', async () => {
    // 0002-0004 устсан гэж бод — findFirst зөвхөн 0001, 0005-ыг харна.
    const prisma = makeCodePrisma([
      { id: '1', studentCode: 'SIE-26-M-0001' },
      { id: '2', studentCode: 'SIE-26-M-0005' },
    ]);
    const code = await generateStudentCode(prisma, {
      enrolmentYear: 2026,
      subject: 'M',
    });
    // count-based логик бол 3 (2 мөр + 1) гарах байсан; зөв нь 0006.
    expect(code).toBe('SIE-26-M-0006');
  });

  it('өөр жил/хичээлийн кодтой холилдохгүй — тус тусдаа дарааллаар эхэлнэ', async () => {
    const prisma = makeCodePrisma([{ id: '1', studentCode: 'SIE-25-M-0099' }]);
    const code = await generateStudentCode(prisma, {
      enrolmentYear: 2026,
      subject: 'M',
    });
    expect(code).toBe('SIE-26-M-0001');
  });

  it('давхцал гарвал дараагийн дугаараар дахин оролдож, эцэст нь чөлөөтэй дугаар олно', async () => {
    let attempts = 0;
    const prisma = {
      user: {
        findFirst: async () => null,
        findUnique: async ({ where }: any) => {
          attempts += 1;
          // 0001, 0002 нь зэрэгцээ хүсэлтээр аль хэдийн авагдсан гэж симуляц хийв.
          if (
            where.studentCode === 'SIE-26-M-0001' ||
            where.studentCode === 'SIE-26-M-0002'
          ) {
            return { id: 'taken' };
          }
          return null;
        },
      },
    } as any;
    const code = await generateStudentCode(prisma, {
      enrolmentYear: 2026,
      subject: 'M',
    });
    expect(code).toBe('SIE-26-M-0003');
    expect(attempts).toBe(3);
  });

  it('MAX_RETRIES давхцал дараалан гарвал мөчлөгөөс гараад BadRequestException шидэнэ', async () => {
    const prisma = {
      user: {
        findFirst: async () => null,
        findUnique: async () => ({ id: 'always-taken' }),
      },
    } as any;
    await expect(
      generateStudentCode(prisma, { enrolmentYear: 2026, subject: 'M' }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('generateTeacherCode', () => {
  it('SIE-T-<4 оронтой дараалал> формат үүсгэнэ', async () => {
    const prisma = makeCodePrisma([]);
    expect(await generateTeacherCode(prisma)).toBe('SIE-T-0001');
  });

  it('дараалал одоогийн ХАМГИЙН ИХ кодоос үргэлжилнэ', async () => {
    const prisma = makeCodePrisma([{ id: '1', teacherCode: 'SIE-T-0006' }]);
    expect(await generateTeacherCode(prisma)).toBe('SIE-T-0007');
  });

  it('давхцал үргэлжлэхэд эцэст нь BadRequestException шидэнэ', async () => {
    const prisma = {
      user: {
        findFirst: async () => null,
        findUnique: async () => ({ id: 'always-taken' }),
      },
    } as any;
    await expect(generateTeacherCode(prisma)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('resolveUniqueUsername', () => {
  it('давхцалгүй бол Овог.Нэр хэлбэрээр шууд буцаана', async () => {
    const prisma = makeUsernamePrisma([]);
    expect(await resolveUniqueUsername(prisma, 'Bat', 'Dorj')).toBe(
      'Dorj.Bat',
    );
  });

  it('давхцвал ард нь дараалсан тоо нэмж давтахгүй нэр олно', async () => {
    const prisma = makeUsernamePrisma(['Dorj.Bat', 'Dorj.Bat2']);
    expect(await resolveUniqueUsername(prisma, 'Bat', 'Dorj')).toBe(
      'Dorj.Bat3',
    );
  });

  it('desired өгсөн бол суурь нэрээр нь ашиглана', async () => {
    const prisma = makeUsernamePrisma([]);
    expect(
      await resolveUniqueUsername(prisma, 'Bat', 'Dorj', 'custom_nick'),
    ).toBe('custom_nick');
  });

  it('desired давхцвал энэ ч бас дугаарлана', async () => {
    const prisma = makeUsernamePrisma(['custom_nick']);
    expect(
      await resolveUniqueUsername(prisma, 'Bat', 'Dorj', 'custom_nick'),
    ).toBe('custom_nick2');
  });

  it('зайг арилгаж, орчны зайг таслана', async () => {
    const prisma = makeUsernamePrisma([]);
    expect(
      await resolveUniqueUsername(prisma, 'Bat', 'Dorj', '  spaced name  '),
    ).toBe('spacedname');
  });
});
