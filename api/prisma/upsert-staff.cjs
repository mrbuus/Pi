/**
 * upsert-staff.cjs — Ажилтны (админ/багш) бүртгэлийг жагсаалтаас үүсгэх/шинэчлэх.
 *
 * ХЭРЭГЛЭЭ:
 *   node prisma/upsert-staff.cjs                 # ХУУРАЙ АЖИЛЛАГАА (юу ч бичихгүй)
 *   node prisma/upsert-staff.cjs --commit        # бодитоор бичнэ
 *   DATABASE_URL="<render>" node prisma/upsert-staff.cjs --commit   # production
 *
 * ЖАГСААЛТ: prisma/reports/staff-roster.json (git-д ОРДОГГҮЙ — хувийн мэдээлэлтэй).
 *   role: null бол тухайн мөрийг АЛГАСНА — эрх нь тодорхойгүй гэсэн үг.
 *
 * ИДЕМПОТЕНТ:
 *   • Утас нь таарсан хэрэглэгч байвал зөвхөн ЭРХ/НЭРийг шинэчилнэ.
 *   • НУУЦ ҮГИЙГ ХЭЗЭЭ Ч ДАРЖ БИЧИХГҮЙ — дахин ажиллуулахад хүн нэвтэрч
 *     чадахгүй болох эрсдэлгүй. Зөвхөн ШИНЭ хэрэглэгчид нууц үг үүснэ.
 *
 * НУУЦ ҮГ: эзний шийдвэрээр (2026-07-29) ЯМАГТ = утасны дугаар — seed.cjs-тэй
 *   адилхан хэв маягтай нэгтгэв. Санамсаргүй/"чанартай" түр нууц үг үүсгэдэггүй
 *   болсон тул шинэ хэрэглэгч бүртгэгдмэгц утасныхаа дугаараар шууд нэвтэрч чадна.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { readFileSync } = require('fs');
const { join } = require('path');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const COMMIT = process.argv.includes('--commit');
// Анхдагчаар БАЙГАА хэрэглэгчийн нэрийг хөнддөггүй (доорх тайлбарыг үз).
// Жагсаалт дахь нэрсийг ХҮН БИЕЧЛЭН баталсан үед л энэ тугийг өгнө.
const UPDATE_NAMES = process.argv.includes('--update-names');
const ROSTER_PATH = join(__dirname, 'reports', 'staff-roster.json');

const VALID_ROLES = new Set(['ADMIN', 'TEACHER_PLUS', 'TEACHER']);
const TEACHER_ROLES = new Set(['TEACHER_PLUS', 'TEACHER']);

/** Дараагийн SIE-T-#### дугаарыг сангийн ХАМГИЙН ТОМ утгаас үргэлжлүүлнэ. */
async function nextTeacherSeq() {
  const rows = await prisma.user.findMany({
    where: { teacherCode: { startsWith: 'SIE-T-' } },
    select: { teacherCode: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = Number.parseInt(String(r.teacherCode).slice('SIE-T-'.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max + 1;
}

async function main() {
  const roster = JSON.parse(readFileSync(ROSTER_PATH, 'utf8'));
  const staff = roster.staff ?? [];

  const pending = staff.filter((s) => !s.role);
  const ready = staff.filter((s) => s.role);

  for (const s of ready) {
    if (!VALID_ROLES.has(s.role)) {
      throw new Error(`№${s.n} "${s.firstName}" — буруу эрх: ${s.role}`);
    }
    if (!/^\d{8}$/.test(String(s.phone ?? ''))) {
      throw new Error(`№${s.n} "${s.firstName}" — утас 8 оронтой байх ёстой`);
    }
  }

  console.log(`\n${COMMIT ? '🟢 БОДИТ БИЧИЛТ' : '🔍 ХУУРАЙ АЖИЛЛАГАА (юу ч бичихгүй)'}`);
  console.log(`   жагсаалт: ${staff.length} мөр · эрхтэй: ${ready.length} · хүлээгдэж буй: ${pending.length}\n`);

  let seq = await nextTeacherSeq();
  const created = [];
  const updated = [];

  for (const s of ready) {
    const existing = await prisma.user.findUnique({ where: { phone: s.phone } });

    if (existing) {
      // ⚠️ БАЙГАА хэрэглэгчийн НЭР/ОВГИЙГ ЗОРИУД ХӨНДӨХГҮЙ.
      // Жагсаалт дахь овог нь утасны сангийн шошгоос ТААМАГЛАСАН утга (монгол
      // нэрэнд овог/нэрийн дараалал тодорхойгүй) тул сангийн бодит нэрийг
      // дарж бичвэл жинхэнэ хүний нэрийг эвдэх эрсдэлтэй. Зөвхөн ЭРХ болон
      // дутуу БАГШИЙН КОДЫГ л залруулна. Нэрийг UI-аас гараар засна.
      const changes = [];
      if (existing.role !== s.role) changes.push(`эрх ${existing.role}→${s.role}`);

      let teacherCode = existing.teacherCode;
      if (!teacherCode && TEACHER_ROLES.has(s.role)) {
        teacherCode = `SIE-T-${String(seq).padStart(4, '0')}`;
        seq += 1;
        changes.push(`код ${teacherCode}`);
      }

      const nameDiffers =
        existing.firstName !== s.firstName || existing.lastName !== s.lastName;
      if (nameDiffers) {
        changes.push(
          UPDATE_NAMES
            ? `нэр «${existing.lastName} ${existing.firstName}» → «${s.lastName} ${s.firstName}»`
            : `нэр зөрүүтэй (санд «${existing.lastName} ${existing.firstName}») — ХӨНДӨӨГҮЙ`,
        );
      }

      if (changes.length && COMMIT) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: s.role,
            teacherCode,
            ...(UPDATE_NAMES && nameDiffers
              ? { firstName: s.firstName, lastName: s.lastName }
              : {}),
          },
        });
      }
      updated.push({ ...s, changes });
      console.log(
        `  ↻ №${String(s.n).padStart(2)} ${s.lastName} ${s.firstName} — байна` +
          (changes.length ? ` · ${changes.join(', ')}` : ' · өөрчлөлтгүй'),
      );
      continue;
    }

    // Анхны нууц үг ЯМАГТ = утасны дугаар (эзний шийдвэр — доорх файлын толгой хэсгийг үз).
    const password = s.phone;
    const teacherCode = TEACHER_ROLES.has(s.role)
      ? `SIE-T-${String(seq).padStart(4, '0')}`
      : null;
    if (teacherCode) seq += 1;

    if (COMMIT) {
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          phone: s.phone,
          firstName: s.firstName,
          lastName: s.lastName,
          role: s.role,
          passwordHash,
          teacherCode,
          // Одоогоор ХЭЗЭЭ Ч true болгохгүй — "нэвтрэхэд заавал нууц үг солиулах"
          // урсгал идэвхжээгүй (schema-ийн @default(false)-той адил). Идэвхжүүлэхэд
          // зөвхөн үүнийг true болгоход л хангалттай.
          mustChangePassword: false,
        },
      });
      if (TEACHER_ROLES.has(s.role)) {
        await prisma.teacherProfile.create({
          data: {
            userId: user.id,
            canManageStudents: s.role === 'TEACHER_PLUS',
          },
        });
      }
    }
    created.push({ ...s, password, teacherCode });
    console.log(
      `  + №${String(s.n).padStart(2)} ${s.lastName} ${s.firstName} — ШИНЭ · ${s.role}` +
        (teacherCode ? ` · ${teacherCode}` : ''),
    );
  }

  if (pending.length) {
    console.log(`\n⏸  Эрх тодорхойгүй тул алгассан (${pending.length}):`);
    for (const s of pending) {
      console.log(`     №${String(s.n).padStart(2)} ${s.lastName} ${s.firstName} (${s.contact})`);
    }
  }

  if (created.length) {
    console.log(`\n${'─'.repeat(62)}`);
    console.log('🔑 НУУЦ ҮГ = УТАСНЫ ДУГААР (prisma/reports/credentials.txt-д бас бий)');
    console.log(`${'─'.repeat(62)}`);
    for (const c of created) {
      console.log(`   ${c.lastName} ${c.firstName}`.padEnd(28) + `${c.phone}  →  ${c.password}`);
    }
    console.log(`${'─'.repeat(62)}`);
    console.log('   Эзэнд нь дамжуулна. /profile-оос хүсвэл өөрчилж болно (одоогоор албадаагүй).');
    if (!COMMIT) console.log('   ⚠️ ХУУРАЙ АЖИЛЛАГАА — эдгээр нууц үг хадгалагдаагүй. --commit-той дахин ажиллуулна.');
  }

  console.log(`\nДҮН: шинэ ${created.length} · шинэчилсэн ${updated.length} · алгассан ${pending.length}`);
  if (!COMMIT) console.log('Бодитоор бичих:  node prisma/upsert-staff.cjs --commit\n');
}

main()
  .catch((e) => {
    console.error('\n❌', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
