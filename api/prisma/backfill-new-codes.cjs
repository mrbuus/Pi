/* ============================================================================
 * backfill-new-codes.cjs — БҮХ хуучин (SIE-) болон кодгүй хэрэглэгчид шинэ
 * форматын код олгоно: [Үсэг][ЖЖ][АА][ДДДД], жишээ B26120001.
 *
 * Дүрэм (эзний спец 2026-08-08):
 *   Үсэг: салбар «Баруун 4»→B, «Зүүн 4»→Z, бусад/онлайн→O; багш→A
 *   ЖЖ:   бүртгүүлсэн оны сүүлийн 2 орон (УБ цагаар, User.createdAt)
 *   АА:   анги (байхгүй бол 12); багшид үргэлж 12
 *   ДДДД: тухайн жилийн дараалал — бүртгүүлсэн (createdAt) дарааллаар.
 *         Сурагчид (B/Z/O) нэг тоолуур, багш (A) тусдаа — runtime
 *         src/common/codes.ts-тэй ЯГ ижил семантик.
 *
 * Хуучин кодыг StudentCodeLegacy хүснэгтэд хадгална (мөрдлөг алдагдахгүй).
 * Идемпотент: аль хэдийн шинэ форматтай (^[BZOA]\d{7}$) кодыг алгасна.
 *
 * Ажиллуулах:  node prisma/backfill-new-codes.cjs           (dry-run)
 *              node prisma/backfill-new-codes.cjs --apply   (бичнэ)
 * ========================================================================== */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const apply = process.argv.includes('--apply');
const NEW_FORMAT = /^[BZOA]\d{7}$/;

function yearUB(date) {
  const y = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' })
    .format(date)
    .slice(0, 4);
  return String(parseInt(y, 10) % 100).padStart(2, '0');
}

function letterOf(user) {
  if (user.role !== 'STUDENT') return 'A';
  const branch = user.studentProfile?.branch;
  if (branch === 'Баруун 4') return 'B';
  if (branch === 'Зүүн 4') return 'Z';
  return 'O';
}

function gradeOf(user) {
  if (user.role !== 'STUDENT') return '12';
  const g = user.studentProfile?.grade;
  return String(g && g >= 1 && g <= 99 ? g : 12).padStart(2, '0');
}

async function main() {
  console.log(`Горим: ${apply ? 'APPLY — өгөгдөл бичигдэнэ' : 'DRY-RUN (--apply гэвэл бичнэ)'}\n`);

  const users = await prisma.user.findMany({
    where: { role: { in: ['STUDENT', 'TEACHER', 'TEACHER_PLUS'] } },
    include: { studentProfile: true },
    orderBy: { createdAt: 'asc' },
  });

  // Тоолуур: жил бүрд сурагч (B/Z/O нэгдсэн) ба багш (A) тусдаа.
  // ӨС-д аль хэдийн байгаа шинэ форматын кодоор эхлүүлнэ (дахин ажиллуулахад
  // үргэлжлүүлэн тоолно — давхцал үүсгэхгүй).
  const counters = new Map(); // түлхүүр: "S26" эсвэл "T26" → хамгийн их seq
  for (const u of users) {
    for (const code of [u.studentCode, u.teacherCode]) {
      if (code && NEW_FORMAT.test(code)) {
        const key = (code[0] === 'A' ? 'T' : 'S') + code.slice(1, 3);
        const seq = parseInt(code.slice(5), 10);
        if (seq > (counters.get(key) ?? 0)) counters.set(key, seq);
      }
    }
  }

  const plan = [];
  for (const u of users) {
    const isTeacher = u.role !== 'STUDENT';
    const current = isTeacher ? u.teacherCode : u.studentCode;
    if (current && NEW_FORMAT.test(current)) continue; // аль хэдийн шинэ

    const yy = yearUB(u.createdAt);
    const key = (isTeacher ? 'T' : 'S') + yy;
    let seq = (counters.get(key) ?? 0) + 1;
    let grade = gradeOf(u);
    // 9999 давбал АА-г +1 (эзний дүрэм). Бодитоор хүрэхгүй ч хамгаална.
    if (seq > 9999) {
      grade = String(parseInt(grade, 10) + 1).padStart(2, '0');
      seq = 1;
    }
    counters.set(key, seq);

    const code = `${letterOf(u)}${yy}${grade}${String(seq).padStart(4, '0')}`;
    plan.push({ user: u, isTeacher, oldCode: current ?? null, code });
  }

  for (const p of plan.slice(0, 15)) {
    const name = `${p.user.lastName ?? ''} ${p.user.firstName ?? ''}`.trim();
    console.log(`  ${p.oldCode ?? '(кодгүй)'} -> ${p.code}  ${name}`);
  }
  if (plan.length > 15) console.log(`  ... нийт ${plan.length} мөр`);
  console.log(`\nШинэчлэх: ${plan.length} хэрэглэгч (${plan.filter((p) => !p.isTeacher).length} сурагч, ${plan.filter((p) => p.isTeacher).length} багш)`);

  if (!apply) {
    console.log('\nDRY-RUN — юу ч бичигдээгүй.');
    return;
  }

  let done = 0;
  for (const p of plan) {
    await prisma.$transaction([
      // Хуучин кодыг архивт (байсан бол) — давтан ажиллуулахад анхны кодоо хадгална
      ...(p.oldCode
        ? [
            prisma.studentCodeLegacy.upsert({
              where: { userId: p.user.id },
              create: { userId: p.user.id, oldCode: p.oldCode },
              update: {}, // анхны хуучин кодыг дарж бичихгүй
            }),
          ]
        : []),
      prisma.user.update({
        where: { id: p.user.id },
        data: p.isTeacher ? { teacherCode: p.code } : { studentCode: p.code },
      }),
    ]);
    done += 1;
    if (done % 50 === 0) console.log(`  ... ${done}/${plan.length}`);
  }
  console.log(`\nБичигдлээ: ${done} хэрэглэгч.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
