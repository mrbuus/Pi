/**
 * Бүтэн жилийн давтагдах хичээлийн хуваарийг өгөгдлийн санд суулгана
 * (эзний 2026-07-30-ны заавраар).
 *
 * ЯАГААД СКРИПТЭЭР ВЭ: 77 мөр хуваарийг вэбээс гараар оруулах нь 77 удаагийн
 * маягт бөглөлт — алдаа гарах магадлал өндөр. Энэ скрипт нь ГАНЦ эх сурвалжаас
 * (доорх PLAN) бүгдийг үүсгэж, дараа нь хүн шалгах боломжтой хэвлэлт гаргана.
 *
 * АЖИЛЛУУЛАХ:
 *   node prisma/seed-year-schedule.cjs              # хуурай — юу ч бичихгүй
 *   node prisma/seed-year-schedule.cjs --commit     # бодитоор бичнэ
 *   DATABASE_URL="<render>" node ... --commit       # продакшн
 *
 * ДҮРЭМ:
 *  - Гарагийн дугаарлалт МОНГОЛ: 1=Даваа … 6=Бямба, 7=Ням.
 *    Өгөгдлийн санд JS конвенцоор хадгалагдана (0=Ням … 6=Бямба) — доорх
 *    mnDayToJs() хөрвүүлнэ. Энэ хоёрыг андуурвал бүх хуваарь нэг өдрөөр
 *    гулсана, тиймээс тусад нь функц болгож тодорхой болгов.
 *  - Хичээлийн үргэлжлэх хугацаа БҮГД 120 минут (эзний шийдвэр). Дараа нь
 *    Багш+ вэбээс тус бүрчлэн засна.
 *  - Танхимыг ЭНД оноохгүй — эзэн танхимын жагсаалтыг л өгсөн, аль анги аль
 *    танхимд орохыг өдөр бүрээр нь өгөөгүй. Багш+ вэбээс сонгоно.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const COMMIT = process.argv.includes('--commit');

/** Хуваарь хэрэгжиж эхлэх огноо. Өнөөдрөөс — шууд харагдана. */
const EFFECTIVE_FROM = new Date('2026-07-30T00:00:00.000Z');
/** Бүх хичээл 120 минут (эзний шийдвэр 2026-07-30) */
const DURATION_MIN = 120;

/** "15:00" → 900 (шөнө дундаас хойшх минут) */
function hhmm(value) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Монгол гарагийн дугаар (1=Даваа…7=Ням) → JS/Prisma (0=Ням…6=Бямба).
 * 7 (Ням) → 0, бусад нь хэвээр.
 */
function mnDayToJs(mnDay) {
  if (mnDay < 1 || mnDay > 7) throw new Error(`Гарагийн дугаар буруу: ${mnDay}`);
  return mnDay === 7 ? 0 : mnDay;
}

// ---------------------------------------------------------------------------
// 1. АНГИЙН ЗАСВАР — нэр солих ба шинээр үүсгэх
// ---------------------------------------------------------------------------

const RENAMES = [
  { from: '13-3 (Зүүн 4)', to: '13-2 (Зүүн 4)' },
  // 9-2 → 10-2: сурагчид 10-р анги руу дэвшсэн тул grade-ийг мөн засна.
  { from: '9-2 (Зүүн 4)', to: '10-2 (Зүүн 4)', grade: 10 },
];

const NEW_CLASSROOMS = [
  { name: '12-6 (Баруун 4)', grade: 12 },
  { name: '12-7 (Баруун 4)', grade: 12 },
  { name: '12-8 (Баруун 4)', grade: 12 },
  { name: '12-9 (Баруун 4)', grade: 12 },
  { name: '12-10 (Баруун 4)', grade: 12 },
  { name: '12-11 (Баруун 4)', grade: 12 },
  { name: '12-12 (Баруун 4)', grade: 12 },
  // Нийгмийн ухааны бүлэг — ангийн түвшингүй тул grade: null
  { name: 'НИЙГЭМ (Зүүн 4)', grade: null },
];

// ---------------------------------------------------------------------------
// 2. ХУВААРИЙН ТӨЛӨВЛӨГӨӨ
//
// slots: [{ days: [монгол гарагийн дугаарууд], start: "HH:MM" }]
// ---------------------------------------------------------------------------

const PLAN = [
  // ===== БАРУУН 4 — сондгой өдрийн ангиуд =====
  {
    classes: ['12-1 (Баруун 4)', '12-3 (Баруун 4)', '12-5 (Баруун 4)'],
    note: 'Сондгой өдөр + Бямба, 4 удаа',
    slots: [
      { days: [1, 3, 5], start: '15:00' },
      { days: [6], start: '10:00' },
    ],
  },
  {
    classes: ['9-1 (Баруун 4)', '11-1 (Баруун 4)'],
    note: 'Сондгой өдөр, 3 удаа',
    slots: [{ days: [1, 3, 5], start: '15:00' }],
  },
  {
    classes: ['12-7 (Баруун 4)', '12-9 (Баруун 4)', '12-11 (Баруун 4)'],
    note: 'ОРОЙН сондгой өдөр + Бямба, 4 удаа',
    slots: [
      { days: [1, 3, 5], start: '17:30' },
      { days: [6], start: '16:00' },
    ],
  },

  // ===== БАРУУН 4 — тэгш өдрийн ангиуд =====
  {
    classes: ['12-2 (Баруун 4)', '12-4 (Баруун 4)', '12-6 (Баруун 4)'],
    note: 'Тэгш өдөр + Бямба + Ням, 4 удаа',
    slots: [
      { days: [2, 4], start: '15:00' },
      { days: [6], start: '13:00' },
      { days: [7], start: '10:00' },
    ],
  },
  {
    classes: ['10-1 (Баруун 4)', '11-2 (Баруун 4)'],
    note: 'Тэгш өдөр + Бямба, 3 удаа',
    slots: [
      { days: [2, 4], start: '15:00' },
      { days: [6], start: '10:00' },
    ],
  },
  {
    classes: ['12-8 (Баруун 4)', '12-10 (Баруун 4)', '12-12 (Баруун 4)'],
    note: 'ОРОЙН тэгш өдөр + Бямба + Ням, 4 удаа',
    slots: [
      { days: [2, 4], start: '17:30' },
      { days: [6], start: '16:00' },
      { days: [7], start: '13:00' },
    ],
  },

  // ===== ЗҮҮН 4 =====
  {
    classes: ['13-1 (Зүүн 4)'],
    note: 'Сондгой өдөр + Бямба, 4 удаа',
    slots: [
      { days: [1, 3, 5], start: '15:00' },
      { days: [6], start: '10:00' },
    ],
  },
  {
    classes: ['11-3 (Зүүн 4)'],
    note: 'Сондгой өдөр, 3 удаа',
    slots: [{ days: [1, 3, 5], start: '15:00' }],
  },
  {
    classes: ['13-2 (Зүүн 4)'],
    note: 'Тэгш өдөр + хагас сайн + бүтэн сайн, 4 удаа',
    slots: [
      { days: [2, 4], start: '15:00' },
      { days: [6], start: '13:00' },
      { days: [7], start: '10:00' },
    ],
  },
  {
    classes: ['10-2 (Зүүн 4)'],
    note: 'Тэгш өдөр + Бямба, 3 удаа',
    slots: [
      { days: [2, 4], start: '15:00' },
      { days: [6], start: '13:00' },
    ],
  },
  {
    classes: ['НИЙГЭМ (Зүүн 4)'],
    note: 'Нийгмийн ухаан — 2,4,6 өдөр орой',
    slots: [{ days: [2, 4, 6], start: '17:30' }],
  },
];

const MN_DAY_NAME = ['', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

function fmt(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  // ---- Хуваарийн мөрүүдийг санах ойд бүрдүүлж, ЭХЛЭЭД шалгана ----
  const rows = [];
  for (const group of PLAN) {
    for (const className of group.classes) {
      for (const slot of group.slots) {
        for (const mnDay of slot.days) {
          const startMinute = hhmm(slot.start);
          rows.push({
            className,
            mnDay,
            weekday: mnDayToJs(mnDay),
            startMinute,
            endMinute: startMinute + DURATION_MIN,
          });
        }
      }
    }
  }

  // Дотоод давхцлын шалгалт: нэг анги нэг гарагт хоёр удаа орох ёсгүй.
  // Энэ нь PLAN дээрх хүний алдааг ӨГӨГДЛИЙН САНД ХҮРЭХЭЭС ӨМНӨ барина.
  const seen = new Map();
  for (const r of rows) {
    const key = `${r.className}|${r.weekday}`;
    if (seen.has(key)) {
      throw new Error(
        `PLAN дотор давхцал: ${r.className} — ${MN_DAY_NAME[r.mnDay]} гарагт хоёр удаа`,
      );
    }
    seen.set(key, r);
  }

  console.log(`\nТӨЛӨВЛӨГӨӨ: ${rows.length} мөр, ${new Set(rows.map((r) => r.className)).size} анги\n`);

  // ---- Ангиудыг шалгах ----
  const existing = await prisma.classroom.findMany({
    select: { id: true, name: true, grade: true },
  });
  const byName = new Map(existing.map((c) => [c.name, c]));

  console.log('АНГИЙН ЗАСВАР:');
  for (const r of RENAMES) {
    const found = byName.get(r.from);
    console.log(
      `  ${found ? '↻' : '⚠ олдсонгүй'} ${r.from} → ${r.to}${r.grade ? ` (анги ${r.grade})` : ''}`,
    );
  }
  for (const c of NEW_CLASSROOMS) {
    console.log(`  ${byName.has(c.name) ? '= аль хэдийн бий' : '+ шинээр'} ${c.name}`);
  }

  // Нэр солисны ДАРААХ байдлаар анги байгаа эсэхийг шалгана
  const willExist = new Set(existing.map((c) => c.name));
  for (const r of RENAMES) {
    if (willExist.delete(r.from)) willExist.add(r.to);
  }
  for (const c of NEW_CLASSROOMS) willExist.add(c.name);

  const missing = [...new Set(rows.map((r) => r.className))].filter(
    (n) => !willExist.has(n),
  );
  if (missing.length) {
    throw new Error(`Дараах анги олдохгүй байна:\n  ${missing.join('\n  ')}`);
  }

  console.log('\nХУВААРЬ:');
  for (const group of PLAN) {
    const times = group.slots
      .map((s) => `${s.days.map((d) => MN_DAY_NAME[d]).join('/')} ${s.start}`)
      .join(' — ');
    const count = group.slots.reduce((n, s) => n + s.days.length, 0);
    console.log(`  ${group.classes.join(', ')}`);
    console.log(`    ${times}  →  ${count} удаа/долоо хоног  (${group.note})`);
  }

  if (!COMMIT) {
    console.log('\n⚠️  ХУУРАЙ АЖИЛЛАГАА — юу ч бичээгүй. --commit-той дахин ажиллуулна.\n');
    await prisma.$disconnect();
    return;
  }

  // ---- Бодит бичилт: БҮГД нэг транзакцад ----
  // Хагас дутуу хуваарь үлдэхээс сэргийлнэ: аль нэг мөр амжилтгүй бол
  // бүхэлдээ буцна.
  await prisma.$transaction(async (tx) => {
    for (const r of RENAMES) {
      const found = await tx.classroom.findFirst({ where: { name: r.from } });
      if (!found) continue;
      await tx.classroom.update({
        where: { id: found.id },
        data: { name: r.to, ...(r.grade !== undefined ? { grade: r.grade } : {}) },
      });
    }

    for (const c of NEW_CLASSROOMS) {
      const found = await tx.classroom.findFirst({ where: { name: c.name } });
      if (found) continue;
      await tx.classroom.create({
        data: { name: c.name, type: 'IN_PERSON', grade: c.grade },
      });
    }

    const all = await tx.classroom.findMany({ select: { id: true, name: true } });
    const idByName = new Map(all.map((c) => [c.name, c.id]));

    for (const r of rows) {
      const classroomId = idByName.get(r.className);
      if (!classroomId) throw new Error(`Анги олдсонгүй: ${r.className}`);

      // Идемпотент: ижил анги+гараг+эхлэх цаг аль хэдийн байвал алгасна.
      // Скриптийг хоёр удаа ажиллуулахад давхардал үүсгэхгүй.
      const dup = await tx.classSchedule.findFirst({
        where: { classroomId, weekday: r.weekday, startMinute: r.startMinute },
      });
      if (dup) continue;

      await tx.classSchedule.create({
        data: {
          classroomId,
          weekday: r.weekday,
          startMinute: r.startMinute,
          endMinute: r.endMinute,
          effectiveFrom: EFFECTIVE_FROM,
          effectiveTo: null,
        },
      });
    }
  });

  const total = await prisma.classSchedule.count();
  console.log(`\n✓ Бичигдлээ. Өгөгдлийн сан дахь нийт хуваарийн мөр: ${total}\n`);

  // ---- Хүн шалгах хэвлэлт: гараг тус бүрээр ----
  const saved = await prisma.classSchedule.findMany({
    include: { classroom: { select: { name: true } } },
    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
  });
  const order = [1, 2, 3, 4, 5, 6, 0];
  const jsName = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
  for (const wd of order) {
    const day = saved.filter((s) => s.weekday === wd);
    if (!day.length) continue;
    console.log(`${jsName[wd]} (${day.length}):`);
    for (const s of day) {
      console.log(
        `   ${fmt(s.startMinute)}–${fmt(s.endMinute)}  ${s.classroom.name}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('\n❌', e.message, '\n');
  process.exit(1);
});
