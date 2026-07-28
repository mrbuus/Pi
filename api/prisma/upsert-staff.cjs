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
 * НУУЦ ҮГ: шинэ бүртгэл бүрт санамсаргүй түр нууц үг үүсгээд НЭГ УДАА хэвлэнэ.
 *   seed.cjs шиг "нууц үг = утасны дугаар" гэсэн хэв маягийг ЗОРИУДААР ашиглаагүй:
 *   утасны дугаар нь олон нийтэд ил тул админ/багшийн бүртгэлд хэтэрхий сул.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { randomInt } = require('crypto');
const { readFileSync } = require('fs');
const { join } = require('path');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const COMMIT = process.argv.includes('--commit');
const ROSTER_PATH = join(__dirname, 'reports', 'staff-roster.json');

const VALID_ROLES = new Set(['ADMIN', 'TEACHER_PLUS', 'TEACHER']);
const TEACHER_ROLES = new Set(['TEACHER_PLUS', 'TEACHER']);

// Андуурч уншихад хялбар тэмдэгтүүдийг (0/O, 1/l/I) ЗОРИУД хассан цагаан толгой —
// түр нууц үгийг утсаар/биечлэн дамжуулахад алдаа гарахаас сэргийлнэ.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function tempPassword(len = 12) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

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
          `нэр зөрүүтэй (санд «${existing.lastName} ${existing.firstName}») — ХӨНДӨӨГҮЙ`,
        );
      }

      if (changes.length && COMMIT) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: s.role, teacherCode },
        });
      }
      updated.push({ ...s, changes });
      console.log(
        `  ↻ №${String(s.n).padStart(2)} ${s.lastName} ${s.firstName} — байна` +
          (changes.length ? ` · ${changes.join(', ')}` : ' · өөрчлөлтгүй'),
      );
      continue;
    }

    const password = tempPassword();
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
    console.log('🔑 ТҮР НУУЦ ҮГ — ЭНЭ НЭГ УДАА Л ХАРАГДАНА (сангаас гаргаж авах боломжгүй)');
    console.log(`${'─'.repeat(62)}`);
    for (const c of created) {
      console.log(`   ${c.lastName} ${c.firstName}`.padEnd(28) + `${c.phone}  →  ${c.password}`);
    }
    console.log(`${'─'.repeat(62)}`);
    console.log('   Эзэнд нь дамжуулаад, эхний нэвтрэлтийн дараа /profile-оос солиулна.');
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
