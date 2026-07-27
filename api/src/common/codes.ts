import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Ямар ч дараалал/код давхцахгүй болтол хэдэн удаа дахин оролдох дээд хязгаар.
// (resolveUniqueUsername-тай адил зарчим — practice-д давхцал ховор тул зөвхөн
// зэрэгцээ хүсэлтээс болж давхцах магадлалыг нөхнө.)
const MAX_RETRIES = 50;

// Хичээлийн үсэг: M = математик, N = нийгэм, B = аль аль/тодорхойгүй.
export type StudentCodeSubject = 'M' | 'N' | 'B';

export interface GenerateStudentCodeOpts {
  // Элссэн жил (жишээ нь 2026). Заагаагүй бол өнөөдрийн жил.
  enrolmentYear?: number;
  // Заагаагүй бол 'B' (аль аль/тодорхойгүй) — одоогоор User/StudentProfile дээр
  // хичээл ялгах талбар байхгүй тул дуудагч тал тодорхой заагаагүй л бол ингэнэ.
  subject?: StudentCodeSubject;
}

// Сурагчийн код: SIE-<2 оронтой элссэн жил>-<хичээлийн үсэг>-<4 оронтой дараалал>
// Жишээ: SIE-26-M-0142
//
// Дарааллыг тухайн жил/хичээлийн ХАМГИЙН СҮҮЛИЙН кодоос гаргана (count() биш —
// устгасан мөр байвал count() давхцал үүсгэнэ). resolveUsername-ийн зарчмаар
// candidate чөлөөтэй болтол findUnique-ээр шалгаж дараалалыг ахиулна.
export async function generateStudentCode(
  prisma: PrismaService,
  opts: GenerateStudentCodeOpts = {},
): Promise<string> {
  const year = (opts.enrolmentYear ?? new Date().getFullYear()) % 100;
  const yearStr = String(year).padStart(2, '0');
  const subject = opts.subject ?? 'B';
  const prefix = `SIE-${yearStr}-${subject}-`;

  const last = await prisma.user.findFirst({
    where: { studentCode: { startsWith: prefix } },
    orderBy: { studentCode: 'desc' },
    select: { studentCode: true },
  });
  let seq = last?.studentCode
    ? parseInt(last.studentCode.slice(prefix.length), 10) + 1
    : 1;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const candidate = `${prefix}${String(seq).padStart(4, '0')}`;
    const exists = await prisma.user.findUnique({
      where: { studentCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    seq += 1;
  }
  throw new BadRequestException(
    'Сурагчийн код үүсгэх боломжгүй байна — дахин оролдоно уу',
  );
}

// Багшийн код: SIE-T-<4 оронтой дараалал>. Жишээ: SIE-T-0007
export async function generateTeacherCode(
  prisma: PrismaService,
): Promise<string> {
  const prefix = 'SIE-T-';

  const last = await prisma.user.findFirst({
    where: { teacherCode: { startsWith: prefix } },
    orderBy: { teacherCode: 'desc' },
    select: { teacherCode: true },
  });
  let seq = last?.teacherCode
    ? parseInt(last.teacherCode.slice(prefix.length), 10) + 1
    : 1;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const candidate = `${prefix}${String(seq).padStart(4, '0')}`;
    const exists = await prisma.user.findUnique({
      where: { teacherCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
    seq += 1;
  }
  throw new BadRequestException(
    'Багшийн код үүсгэх боломжгүй байна — дахин оролдоно уу',
  );
}

// Овог нэрээс эсвэл өгсөн nickname-ээс давхцалгүй username гаргана.
// auth.service (public register) болон users.service (админ үүсгэлт) хоёулаа
// үүнийг л дуудна — тусдаа хуулбар логик хэрэггүй.
export async function resolveUniqueUsername(
  prisma: PrismaService,
  firstName: string,
  lastName: string,
  desired?: string,
): Promise<string> {
  const base = (desired ?? `${lastName}.${firstName}`)
    .trim()
    .replace(/\s+/g, '');
  let candidate = base;
  let n = 1;
  // Давхцвал ард нь тоо нэмж давтахгүй болгоно
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}
