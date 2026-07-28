#!/usr/bin/env node
/**
 * import-sample-with-parents.cjs
 *
 * Бодит бүртгэлээс ЖИЖИГ ТҮҮВЭР (ангиас N сурагч) + ТЭДНИЙ ЭЦЭГ ЭХИЙГ импортлоно.
 * Зорилго: production дээр санамсаргүй тестийн бүртгэлийн оронд бодит өгөгдөлтэй,
 * гэхдээ хяналттай хэмжээний туршилтын багц үүсгэх.
 *
 * ХЭРЭГЛЭЭ:
 *   node prisma/import-sample-with-parents.cjs                      # ангиудыг жагсаана
 *   node prisma/import-sample-with-parents.cjs --classes=12-2,11-2,10-1
 *   node prisma/import-sample-with-parents.cjs --classes=... --commit
 *
 * ЯАГААД import-students.cjs-ийг ЗАСААГҮЙ ВЭ:
 *   Тэр 891 мөрийн скрипт нь Excel задлах, ангийн бүлэг үүсгэх, давхцал шалгах,
 *   төлбөр/салбар тайлах логикоо аль хэдийн батлагдсан байдлаар агуулдаг.
 *   buildImportPlan/commitImportPlan-ыг экспортолдог тул ДАХИН АШИГЛАЖ,
 *   зөвхөн төлөвлөгөөг ШҮҮЖ өгөв. Ингэснээр импортын гол логик салаалахгүй.
 *
 * ⚠️ ЭЦЭГ ЭХИЙН БҮРТГЭЛ — import-students.cjs-ийн ШИЙДВЭРИЙГ ЗОРИУД ӨӨРЧИЛСӨН:
 *   Тэр скрипт "хүний зөвшөөрөлгүйгээр таамгийн нууц үгтэй эцэг эхийн бүртгэл
 *   нээхгүй" гэсэн зарчмаар ParentLink үүсгэдэггүй. Энд сургалтын төвийн
 *   ЭЗЭН ШУУД ХҮССЭН тул үүсгэнэ — гэхдээ нууц үг нь ТААМАГЛАШГҮЙ санамсаргүй
 *   утга бөгөөд нэг удаа хэвлэгдэнэ (утасны дугаарыг нууц үг болгохгүй).
 *
 * ⚠️ ЭЦЭГ ЭХИЙН НЭР ЭХ ӨГӨГДӨЛД БАЙХГҮЙ:
 *   Excel-д зөвхөн "аав"/"ээж" гэсэн УТАСНЫ багана байна, нэр байхгүй. Тиймээс
 *   нэрийг сурагчийн ОВГООС үүсгэнэ (жишээ: «Дэвшил Ээж»). Энэ нь ТҮР ШОШГО —
 *   ажилтан UI-аас бодит нэрээр солино.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
const { randomInt } = require('crypto');
const { buildImportPlan, commitImportPlan } = require('./import-students.cjs');

const DEFAULT_SOURCE = '/Users/mr.buus/Downloads/БҮРТГЭЛ-2027-1.xlsx';

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const argValue = (p) => {
  const f = args.find((a) => a.startsWith(p));
  return f ? f.slice(p.length) : undefined;
};

const COMMIT = has('--commit');
const SOURCE = argValue('--source=') ?? DEFAULT_SOURCE;
const PER_CLASS = Number.parseInt(argValue('--per-class=') ?? '10', 10);
const CLASSES = (argValue('--classes=') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function tempPassword(len = 12) {
  let out = '';
  for (let i = 0; i < len; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/**
 * ТОГТМОЛ ҮРТЭЙ (seeded) холилт — Math.random() ЗОРИУД АШИГЛААГҮЙ.
 * Шалтгаан: скриптийг дахин ажиллуулбал ӨӨР 10 сурагч сонгогдож, өмнөх 30
 * дээр нэмэгдэн 60, 90 болж өсөх байсан (commitImportPlan нь давхцлыг утсаар
 * шалгадаг тул давхардахгүй ч ШИНЭ сурагч нэмэгдэнэ). Тогтмол үртэй бол
 * дахин ажиллуулахад ЯГ ижил 30 сурагч гарч, үйлдэл идемпотент болно.
 */
function seededShuffle(list, seed) {
  const out = [...list];
  let s = seed >>> 0;
  const next = () => {
    // xorshift32 — жижиг, тогтвортой, гадаад пакет шаардахгүй
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 0x100000000;
  };
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function main() {
  const plan = buildImportPlan(SOURCE);

  // Ангийн бүлгүүдийг эцэг эхийн утасны хамралттай нь хамт харуулна.
  const bySection = new Map();
  for (const s of plan.plannedStudents) {
    if (!s.section) continue;
    if (!bySection.has(s.section)) bySection.set(s.section, []);
    bySection.get(s.section).push(s);
  }

  if (!CLASSES.length) {
    console.log('\nБоломжит ангийн бүлгүүд (--classes=... -д ашиглана):\n');
    const rows = [...bySection.entries()]
      .map(([section, list]) => ({
        section,
        total: list.length,
        withParent: list.filter((s) => s.fatherPhone || s.motherPhone).length,
      }))
      .sort((a, b) => b.withParent - a.withParent);
    for (const r of rows) {
      console.log(
        `  ${r.section.padEnd(8)} нийт ${String(r.total).padStart(3)} · эцэг эхийн утастай ${String(r.withParent).padStart(3)}`,
      );
    }
    console.log('\nЖишээ:  node prisma/import-sample-with-parents.cjs --classes=12-2,11-2,10-1\n');
    return;
  }

  // --- Түүвэр сонгох ---
  const picked = [];
  for (const section of CLASSES) {
    const pool = (bySection.get(section) ?? []).filter(
      (s) => s.fatherPhone || s.motherPhone,
    );
    if (!pool.length) throw new Error(`"${section}" анги олдсонгүй (эсвэл эцэг эхийн утасгүй)`);
    // Үр нь ангийн нэрээс гарна → анги бүр өөр дараалалтай, гэхдээ ТОГТМОЛ.
    const seed = [...section].reduce((a, c) => a + c.charCodeAt(0) * 131, 7);
    const chosen = seededShuffle(pool, seed).slice(0, PER_CLASS);
    if (chosen.length < PER_CLASS) {
      console.log(`  ⚠️ ${section}: зөвхөн ${chosen.length} сурагч байна (${PER_CLASS} хүссэн)`);
    }
    picked.push(...chosen);
    console.log(`  ✓ ${section.padEnd(8)} → ${chosen.length} сурагч (${pool.length}-аас)`);
  }

  const pickedKeys = new Set(picked.map((s) => s.key));
  const filteredPlan = {
    report: plan.report,
    plannedStudents: plan.plannedStudents.filter((s) => pickedKeys.has(s.key)),
    classroomsPlan: plan.classroomsPlan.filter((c) => CLASSES.includes(c.section)),
  };

  // --- Эцэг эхийг төлөвлөх (сурагч тутам НЭГ) ---
  // Ээжийн утсыг эхэлж авна (бүртгэлд ээжийн дугаар илүү бүрэн бөглөгддөг),
  // байхгүй бол ааваас. Ах дүү нар нэг дугаар хуваалцвал НЭГ эцэг эх үүсээд
  // хоёуланд нь холбогдоно (User.phone нь unique).
  const parentByPhone = new Map();
  for (const s of picked) {
    const isMother = Boolean(s.motherPhone);
    const phone = s.motherPhone ?? s.fatherPhone;
    if (!parentByPhone.has(phone)) {
      parentByPhone.set(phone, {
        phone,
        lastName: s.lastName,
        firstName: isMother ? 'Ээж' : 'Аав',
        children: [],
      });
    }
    parentByPhone.get(phone).children.push(s);
  }
  const parents = [...parentByPhone.values()];
  const shared = parents.filter((p) => p.children.length > 1);

  console.log(`\n${COMMIT ? '🟢 БОДИТ БИЧИЛТ' : '🔍 ХУУРАЙ АЖИЛЛАГАА (юу ч бичихгүй)'}`);
  console.log(`   сурагч ${picked.length} · эцэг эх ${parents.length} · нийт ${picked.length + parents.length} хэрэглэгч`);
  console.log(`   ангийн бүлэг: ${filteredPlan.classroomsPlan.map((c) => c.displayName).join(', ')}`);
  if (shared.length) {
    console.log(`   ℹ️ ${shared.length} эцэг эх олон хүүхэдтэй (ах дүү) — тиймээс эцэг эхийн тоо сурагчийнхаас цөөн:`);
    for (const p of shared) {
      console.log(`      ${p.lastName} ${p.firstName} → ${p.children.map((c) => c.firstName).join(', ')}`);
    }
  }

  if (!COMMIT) {
    console.log('\nБодитоор бичих:  ... --commit\n');
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const stats = await commitImportPlan({ prisma, plan: filteredPlan });
    console.log('\n=== Сурагчийн импорт ===');
    console.log(JSON.stringify(stats, null, 2));

    // --- Эцэг эхийн бүртгэл + ParentLink ---
    const createdParents = [];
    let linksCreated = 0;
    let parentsReused = 0;

    // ⚠️ НУУЦ ҮГИЙГ ҮҮССЭН ДАРААХ НЬ ШУУД ХЭВЛЭНЭ, төгсгөлд НЭГ дор биш.
    // Шалтгаан: алсын (Oregon) DB рүү 30 эцэг эх үүсгэхэд ~2 минут болдог тул
    // процесс тасарвал төгсгөлийн хэвлэлт хүрэлгүй үлдэж, аль хэдийн үүссэн
    // бүртгэлийн нууц үг БУЦААЖ АВАХ БОЛОМЖГҮЙ алдагдана (санд зөвхөн hash).
    // Мөрөөр хэвлэвэл ямар ч мөчид тасарсан ч хэвлэгдсэн нь гарт үлдэнэ.
    console.log(`\n🔑 ЭЦЭГ ЭХИЙН ТҮР НУУЦ ҮГ (үүсэх бүрд шууд хэвлэнэ):`);
    console.log('─'.repeat(64));

    for (const p of parents) {
      let parentUser = await prisma.user.findUnique({ where: { phone: p.phone } });
      if (!parentUser) {
        const password = tempPassword();
        parentUser = await prisma.user.create({
          data: {
            phone: p.phone,
            firstName: p.firstName,
            lastName: p.lastName,
            role: 'PARENT',
            passwordHash: await bcrypt.hash(password, 10),
          },
        });
        createdParents.push({ ...p, password });
        console.log(`   ${(p.lastName + ' ' + p.firstName).padEnd(26)}${p.phone}  →  ${password}`);
      } else {
        parentsReused += 1;
      }

      for (const child of p.children) {
        const studentUser = child.studentPhone
          ? await prisma.user.findUnique({ where: { phone: child.studentPhone } })
          : await prisma.user.findFirst({
              where: { firstName: child.firstName, lastName: child.lastName, role: 'STUDENT' },
            });
        if (!studentUser) {
          console.log(`  ⚠️ сурагч олдсонгүй: ${child.lastName} ${child.firstName}`);
          continue;
        }
        // upsert — дахин ажиллуулахад давхар холбоос үүсэхгүй (@@unique).
        await prisma.parentLink.upsert({
          where: { parentId_studentId: { parentId: parentUser.id, studentId: studentUser.id } },
          update: {},
          create: { parentId: parentUser.id, studentId: studentUser.id },
        });
        linksCreated += 1;
      }
    }

    console.log('─'.repeat(64));
    console.log('\n=== Эцэг эх ===');
    console.log(`  шинэ ${createdParents.length} · аль хэдийн байсан ${parentsReused} · холбоос ${linksCreated}`);
    if (parentsReused) {
      console.log(
        `  ℹ️ ${parentsReused} эцэг эх аль хэдийн байсан тул нууц үг нь ДАХИН харагдахгүй\n` +
          '     (санд зөвхөн hash хадгалагддаг). Мартсан бол админаас шинэчилнэ.',
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('\n❌', e.message);
  process.exitCode = 1;
});
