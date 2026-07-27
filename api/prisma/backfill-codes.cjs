/* ============================================================================
 * backfill-codes.cjs — Хуучин хэрэглэгчдэд студент/багшийн код (SIE-...) олгох.
 *
 * Зорилго: User.studentCode/teacherCode багана нэмэгдсэн ч урьд бүртгэгдсэн
 * мөрүүдэд хоосон байсныг нэг удаа бөглөнө. Логик нь src/common/codes.ts-тэй
 * ЯГ ИЖИЛ (хамгийн сүүлийн кодоос +1, count() ашиглахгүй — устгасан мөр
 * давхцал үүсгэхгүй).
 *
 * Идемпотент: аль хэдийн studentCode/teacherCode-той мөрийг алгасна, тул
 * дахин ажиллуулахад шинээр юу ч оноохгүй.
 *
 * Ажиллуулах:  node prisma/backfill-codes.cjs
 * ========================================================================== */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Одоогоор User/StudentProfile дээр хичээл ялгах талбар байхгүй тул бэкфиллд
// ч 'B' (аль аль/тодорхойгүй) ашиглана — src/common/codes.ts-ийн анхдагчтай адил.
const STUDENT_SUBJECT = 'B';

async function nextSequence(field, prefix) {
  const where = { [field]: { startsWith: prefix } };
  const last = await prisma.user.findFirst({
    where,
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  });
  return last?.[field] ? parseInt(last[field].slice(prefix.length), 10) + 1 : 1;
}

async function backfillStudents() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT', studentCode: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (students.length === 0) {
    console.log('  • Кодгүй сурагч алга — алгасав');
    return;
  }

  // Бүртгүүлсэн жилээр нь бүлэглэж, жил тус бүрдээ дараалалыг тасралтгүй үргэлжлүүлнэ
  const byYear = new Map();
  for (const s of students) {
    const year = s.createdAt.getFullYear() % 100;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(s);
  }

  for (const [year, rows] of byYear) {
    const yearStr = String(year).padStart(2, '0');
    const prefix = `SIE-${yearStr}-${STUDENT_SUBJECT}-`;
    let seq = await nextSequence('studentCode', prefix);
    for (const row of rows) {
      const studentCode = `${prefix}${String(seq).padStart(4, '0')}`;
      await prisma.user.update({ where: { id: row.id }, data: { studentCode } });
      console.log(`  • ${row.id} → ${studentCode}`);
      seq += 1;
    }
  }
}

async function backfillTeachers() {
  const teachers = await prisma.user.findMany({
    where: { role: { in: ['TEACHER', 'TEACHER_PLUS'] }, teacherCode: null },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
  if (teachers.length === 0) {
    console.log('  • Кодгүй багш алга — алгасав');
    return;
  }

  const prefix = 'SIE-T-';
  let seq = await nextSequence('teacherCode', prefix);
  for (const row of teachers) {
    const teacherCode = `${prefix}${String(seq).padStart(4, '0')}`;
    await prisma.user.update({ where: { id: row.id }, data: { teacherCode } });
    console.log(`  • ${row.id} → ${teacherCode}`);
    seq += 1;
  }
}

async function main() {
  console.log('Сурагчдад код олгож байна…');
  await backfillStudents();
  console.log('Багш нарт код олгож байна…');
  await backfillTeachers();
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
