/**
 * Танхимгүй (room=null) хуваарийн мөр бүрд салбарт нь харгалзах танхим оноож
 * өгнө (эзний зөвшөөрөл: "одоогоор random-оор хуваарилж болно", 2026-07-31).
 *
 * "Random" гэхдээ ДАВХЦАЛГҮЙ: нэг (гараг, эхлэх цаг)-т нэг танхимд зөвхөн
 * нэг анги. Слот бүрд ангиудыг нэрээр нь эрэмбэлж, танхимыг жагсаалтын
 * дарааллаар олгоно — скриптийг дахин ажиллуулахад үр дүн ижил (тогтвортой).
 *
 * 405 нь хамгийн ЖИЖИГ танхим тул олголтын хамгийн сүүлд л ашиглагдана.
 *
 *   node prisma/assign-rooms.cjs            # хуурай
 *   node prisma/assign-rooms.cjs --commit   # бичих
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const COMMIT = process.argv.includes('--commit');

// Эрэмбэ = олголтын дараалал. 405 (хамгийн жижиг) баруун талын СҮҮЛД.
const WEST_ROOMS = ['501', '502', '503', '504', '404', '403', '405'];
const EAST_ROOMS = ['301', '302'];
// Зүүн 4-ийн тогтмол дуршил (эзний хүснэгтээс: 301=13-1, 302=13-3→13-2).
const EAST_PREFERRED = { '13-1': '301', '13-2': '302' };

const JS_DAY = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const fmt = (m) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  const rows = await prisma.classSchedule.findMany({
    include: { classroom: { select: { name: true } } },
    orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
  });

  // Слот = гараг + эхлэх цаг + салбар. Ижил слотод байгаа ангиуд нэг дор
  // хичээллэдэг тул тэдгээрт өөр өөр танхим ногдох ёстой.
  const slots = new Map();
  for (const r of rows) {
    const east = r.classroom.name.includes('Зүүн');
    const key = `${r.weekday}|${r.startMinute}|${east ? 'E' : 'W'}`;
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key).push(r);
  }

  const updates = [];
  for (const [key, group] of slots) {
    const east = key.endsWith('E');
    const pool = east ? EAST_ROOMS : WEST_ROOMS;
    // Аль хэдийн танхимтай мөрийн танхим эзлэгдсэнд тооцогдоно.
    const taken = new Set(group.map((r) => r.room).filter(Boolean));
    // Тогтмол дуршилтай анги (13-1→301 г.м.) ЭХЭЛЖ танхимаа авна — эс бөгөөс
    // эрэмбээр нь түрүүлсэн өөр анги дуршлын танхимыг булааж, тогтмол байдал
    // алдагдана.
    const sorted = [...group].sort((a, b) => {
      const pa = EAST_PREFERRED[a.classroom.name.split(' ')[0]] ? 0 : 1;
      const pb = EAST_PREFERRED[b.classroom.name.split(' ')[0]] ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.classroom.name.localeCompare(b.classroom.name, 'mn');
    });
    for (const r of sorted) {
      if (r.room) continue; // гараар оноосныг хөндөхгүй
      // Зүүн талд тогтмол дуршилтай анги эхэлж өөрийн танхимаа авна.
      const short = r.classroom.name.split(' ')[0];
      const preferred = east ? EAST_PREFERRED[short] : undefined;
      const room =
        preferred && !taken.has(preferred)
          ? preferred
          : pool.find((p) => !taken.has(p));
      if (!room) {
        console.log(`  ⚠ Танхим хүрсэнгүй: ${r.classroom.name} ${key}`);
        continue;
      }
      taken.add(room);
      updates.push({ id: r.id, room, r });
    }
  }

  console.log(`\nОноох мөр: ${updates.length} / нийт ${rows.length}\n`);
  const byDay = {};
  for (const u of updates) (byDay[u.r.weekday] ||= []).push(u);
  for (const wd of [1, 2, 3, 4, 5, 6, 0]) {
    if (!byDay[wd]) continue;
    console.log(`${JS_DAY[wd]}:`);
    for (const u of byDay[wd].sort((a, b) => a.r.startMinute - b.r.startMinute)) {
      console.log(`  ${fmt(u.r.startMinute)}  ${u.room.padEnd(6)} ← ${u.r.classroom.name}`);
    }
  }

  if (!COMMIT) {
    console.log('\n⚠️  ХУУРАЙ — юу ч бичээгүй. --commit-той дахин ажиллуулна.\n');
    await prisma.$disconnect();
    return;
  }

  await prisma.$transaction(
    updates.map((u) =>
      prisma.classSchedule.update({ where: { id: u.id }, data: { room: u.room } }),
    ),
  );
  console.log(`\n✓ ${updates.length} мөрд танхим оноогдлоо.\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('\n❌', e.message, '\n');
  process.exit(1);
});
