import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Зэрэгцээ давхцлын дээд хязгаар: одоогийн кодоос +1, +2, ... дахин оролдоно.
const MAX_RETRIES = 50;

/**
 * Сурагчийн код үүсгэхэд шаардлагатай опцион.
 *
 * Параметрүүд:
 * - branch: "Баруун 4" | "Зүүн 4" | null (онлайн / бүртгэлгүй → "O")
 * - grade: 1–12 (байхгүй бол 12 ашигла)
 * - registeredAt: Эзэмшлийн огноо. Заагаагүй бол одоо (UB цаг)
 */
export interface GenerateStudentCodeOpts {
  branch?: string | null;
  grade?: number | null;
  registeredAt?: Date;
}

/**
 * Багшийн код үүсгэхэд шаардлагатай опцион.
 *
 * Параметр:
 * - registeredAt: Эзэмшлийн огноо. Заагаагүй бол одоо (UB цаг)
 */
export interface GenerateTeacherCodeOpts {
  registeredAt?: Date;
}

/**
 * UB-ийн цагаар одоогийн жилийн сүүлийн 2 оронг авна.
 */
function getCurrentYearInUB(): number {
  const ub = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
  }).formatToParts(new Date());
  const year = ub.find((p) => p.type === 'year')?.value;
  if (!year) throw new Error('Жилийг авч чадсангүй');
  return parseInt(year, 10) % 100;
}

/**
 * Өгөгдсөн огнооны жилийн сүүлийн 2 оронг авна (UB цагаар).
 */
function getYearFromDateInUB(date: Date): number {
  const ub = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ulaanbaatar',
  }).formatToParts(date);
  const year = ub.find((p) => p.type === 'year')?.value;
  if (!year) throw new Error('Жилийг авч чадсангүй');
  return parseInt(year, 10) % 100;
}

/**
 * Сурагчийн салаа кодыг авна: "Баруун 4" → "B", "Зүүн 4" → "Z", бусад → "O"
 */
function getBranchCode(branch?: string | null): string {
  if (branch === 'Баруун 4') return 'B';
  if (branch === 'Зүүн 4') return 'Z';
  return 'O';
}

/**
 * Сурагчийн код үүсгэнэ: [Branch][YY][Grade][Seq]
 * Жишээ: B27120001 = Баруун 4, 2027, 12-р анги, 0001 дараалал
 *
 * Алгоритм:
 * 1. Салааны үсэг + жил + ангийн дугаар авна
 * 2. Тухайн жилийн глобал дараалал олно (бүх салаа/ангийг нэгтгэсэн)
 * 3. 9999 давбал ангийн дугаарыг +1 болгоно (flow overflow)
 * 4. Зэрэгцээ давхцлын төлөө retry
 */
export async function generateStudentCode(
  prisma: PrismaService,
  opts: GenerateStudentCodeOpts = {},
): Promise<string> {
  const branch = opts.branch ?? null;
  const grade = opts.grade ?? 12;
  const registeredAt = opts.registeredAt ?? new Date();

  const year = getYearFromDateInUB(registeredAt);
  const yearStr = String(year).padStart(2, '0');
  const branchCode = getBranchCode(branch);

  // Хүргүүлэх анги (хэтэрүүлбэл дараагийн ангид шилжинэ)
  let currentGrade = grade;
  let nextSeqToTry: number | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    // Тухайн жилийн глобал дараалал (бүх салаа/ангийн нэгдэл)
    // B27, Z27, O27 кодуудаас хамгийн сүүлийнхийг хай
    const codesForYear = await prisma.user.findMany({
      where: {
        OR: [
          { studentCode: { startsWith: `B${yearStr}` } },
          { studentCode: { startsWith: `Z${yearStr}` } },
          { studentCode: { startsWith: `O${yearStr}` } },
        ],
      },
      select: { studentCode: true },
      orderBy: { studentCode: 'desc' },
      take: 1000, // Сүүлийн 1000 кодыг авна
    });

    // Тухайн жилийн хамгийн том дарааллыг авна
    // Формат: [Branch:1][YY:2][Grade:2][Seq:4] = 9 characters
    let maxSeq = 0;
    for (const user of codesForYear) {
      if (user.studentCode && user.studentCode.length === 9) {
        // Кодын сүүлийн 4 цифр нь дараалал
        const seqStr = user.studentCode.slice(-4);
        const seq = parseInt(seqStr, 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    // Нэг дахь оролдлогод maxSeq+1-ээс эхэл, дараах оролдлогод өмнөхөөс үргэлжүүлэл
    if (nextSeqToTry === null) {
      nextSeqToTry = maxSeq + 1;
    }
    let seq = nextSeqToTry;

    // Дараалал 9999-ээс хэтэрвэл дараагийн ангид шилжүүлэх
    if (seq > 9999) {
      currentGrade += 1;
      seq = 1;
    }

    const gradeStr = String(currentGrade).padStart(2, '0');
    const seqStr = String(seq).padStart(4, '0');
    const candidate = `${branchCode}${yearStr}${gradeStr}${seqStr}`;

    // Энэ кодыг мэдээ байгаа эсэх шалгана
    const exists = await prisma.user.findUnique({
      where: { studentCode: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;
    // Давхцлаа → дараагийн дараалал оролдоно
    seq += 1;
    if (seq > 9999) {
      currentGrade += 1;
      seq = 1;
    }
    nextSeqToTry = seq;
  }

  throw new BadRequestException(
    'Сурагчийн код үүсгэх боломжгүй байна — дахин оролдоно уу',
  );
}

/**
 * Багшийн код үүсгэнэ: A[YY][Grade=12][Seq]
 * Жишээ: A27120001 = 2027, ангийн дугаар үргэлж 12, 0001 дараалал
 *
 * Алгоритм:
 * 1. "A" + жил + "12" + тухайн жилийн дараалал
 * 2. Зэрэгцээ давхцлын төлөө retry
 */
export async function generateTeacherCode(
  prisma: PrismaService,
  opts: GenerateTeacherCodeOpts = {},
): Promise<string> {
  const registeredAt = opts.registeredAt ?? new Date();
  const year = getYearFromDateInUB(registeredAt);
  const yearStr = String(year).padStart(2, '0');
  const gradeStr = '12'; // Багшид үргэлж 12
  let nextSeqToTry: number | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    // Тухайн жилийн глобал дараалал
    const codesForYear = await prisma.user.findMany({
      where: {
        teacherCode: { startsWith: `A${yearStr}` },
      },
      select: { teacherCode: true },
      orderBy: { teacherCode: 'desc' },
      take: 1000,
    });

    // Нэг дахь оролдлогод 1-ээс эхэл, дараах оролдлогод өмнөхөөс үргэлжүүлэл
    if (nextSeqToTry === null) {
      let seq = 1;
      // Формат: [A:1][YY:2][Grade=12:2][Seq:4] = 9 characters
      for (const user of codesForYear) {
        if (user.teacherCode && user.teacherCode.length === 9) {
          const seqStr = user.teacherCode.slice(-4);
          const teacherSeq = parseInt(seqStr, 10);
          if (teacherSeq >= seq) seq = teacherSeq + 1;
        }
      }
      nextSeqToTry = seq;
    }
    let seq = nextSeqToTry;

    // 9999 давбал алдаа (багш буцана гүйтгэл биш)
    if (seq > 9999) {
      throw new BadRequestException(
        'Багшийн код үүсгэх боломжгүй байна — тухайн жилийн дараалал дүүрсэн',
      );
    }

    const seqStr = String(seq).padStart(4, '0');
    const candidate = `A${yearStr}${gradeStr}${seqStr}`;

    const exists = await prisma.user.findUnique({
      where: { teacherCode: candidate },
      select: { id: true },
    });

    if (!exists) return candidate;
    // Давхцлаа → дараагийн дараалал оролдоно
    seq += 1;
    if (seq > 9999) {
      throw new BadRequestException(
        'Багшийн код үүсгэх боломжгүй байна — тухайн жилийн дараалал дүүрсэн',
      );
    }
    nextSeqToTry = seq;
  }

  throw new BadRequestException(
    'Багшийн код үүсгэх боломжгүй байна — дахин оролдоно уу',
  );
}

/**
 * Овог нэрээс давхцалгүй username гаргана.
 * Өмнөх нь auth.service болон users.service хоёулаа нэгэн адил функц байсан —
 * одоо нэг л функц дуудна.
 */
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
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}
