/**
 * Танхимыг АНГИЙН ХЭМЖЭЭГЭЭР дахин хуваарилах (эзний дүрэм, 2026-10-08):
 * нэг цагт (гараг + эхлэх цаг + салбар) хамт ордог ангиудаас хамгийн олон
 * хүүхэдтэйг нь хамгийн том танхимд (501 = 42 суудал) оноож, дараагийнхыг
 * дараагийн том танхимд гэх мэт.
 *
 * Тогтмол дуршил хэвээр: 13-1 → 301, 13-2 → 302 (эзний хүснэгт, assign-rooms.cjs).
 * Багтаамж: web/src/components/schedule/types.ts ROOMS-тэй ИЖИЛ байх ёстой.
 *
 *   node prisma/assign-rooms-by-size.cjs            # хуурай (юу ч бичихгүй)
 *   node prisma/assign-rooms-by-size.cjs --commit   # бичих
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const COMMIT = process.argv.includes('--commit');
const CAPACITY = { 501: 42, 502: 32, 503: 32, 504: 24, 403: 32, 404: 24, 405: 12, 301: 28, 302: 32 };
// 405 (12 суудал) — зөвхөн нөхөх хүүхдэд, байнгын хуваарьт ОРУУЛАХГҮЙ (эзэн 2026-10-08)
const WEST_ROOMS = ['501', '502', '503', '504', '404', '403'];
const EAST_ROOMS = ['301', '302'];
const EAST_PREFERRED = { '13-1': '301', '13-2': '302', 'НИЙГЭМ': '301' }; // Нийгэм = 28 суудалтай 301 (эзэн 2026-10-08)
const JS_DAY = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const bySize = (rooms) => [...rooms].sort((a, b) => CAPACITY[b] - CAPACITY[a]);

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const rows = await prisma.classSchedule.findMany({
    where: { OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date() } }] },
    include: {
      classroom: {
        select: { name: true, _count: { select: { enrollments: { where: { leftAt: null } } } } },
      },
    },
  });

  const slots = new Map();
  for (const r of rows) {
    if (r.room === 'Онлайн') continue;
    const east = r.classroom.name.includes('Зүүн');
    const key = `${r.weekday}|${r.startMinute}|${east ? 'E' : 'W'}`;
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key).push(r);
  }

  const updates = [];
  let overBefore = 0;
  let overAfter = 0;
  const stillOver = [];
  for (const [key, group] of slots) {
    const east = key.endsWith('E');
    const free = bySize(east ? EAST_ROOMS : WEST_ROOMS);
    const assigned = new Map();
    // 1) Тогтмол дуршилтай ангиуд эхэлж
    for (const r of group) {
      const pref = EAST_PREFERRED[r.classroom.name.split(' ')[0]];
      if (pref && free.includes(pref)) {
        assigned.set(r.id, pref);
        free.splice(free.indexOf(pref), 1);
      }
    }
    // 2) Үлдсэнийг хүүхдийн тоогоор (их → бага) хамгийн том сул танхимд
    const rest = group
      .filter((r) => !assigned.has(r.id))
      .sort((a, b) => b.classroom._count.enrollments - a.classroom._count.enrollments || a.classroom.name.localeCompare(b.classroom.name));
    for (const r of rest) assigned.set(r.id, free.shift() ?? null);

    for (const r of group) {
      const n = r.classroom._count.enrollments;
      const room = assigned.get(r.id);
      overBefore += Math.max(0, n - (CAPACITY[r.room] ?? Infinity));
      overAfter += Math.max(0, n - (CAPACITY[room] ?? Infinity));
      if (room && n > CAPACITY[room])
        stillOver.push(`${JS_DAY[r.weekday]} ${fmt(r.startMinute)} ${r.classroom.name.split(' ')[0]} (${n}) → ${room} (${CAPACITY[room]})`);
      if (!room) stillOver.push(`${JS_DAY[r.weekday]} ${fmt(r.startMinute)} ${r.classroom.name} — танхим хүрэлцэхгүй`);
      if (room && room !== r.room) updates.push({ id: r.id, from: r.room, to: room, label: `${JS_DAY[r.weekday]} ${fmt(r.startMinute)} ${r.classroom.name.split(' ')[0]} (${n})` });
    }
  }

  for (const u of updates) console.log(`  ${u.label}: ${u.from ?? '—'} → ${u.to}`);
  console.log(`\nСолих мөр: ${updates.length} / ${rows.length}`);
  console.log(`Суудлаас хэтэрсэн хүүхэд (нийлбэр): өмнө ${overBefore} → дараа ${overAfter}`);
  if (stillOver.length) console.log(`Хэтэрсэн хэвээр (${stillOver.length}):\n  ` + stillOver.join('\n  '));

  if (COMMIT && updates.length) {
    await prisma.$transaction(updates.map((u) => prisma.classSchedule.update({ where: { id: u.id }, data: { room: u.to } })));
    console.log(`\nCOMMIT: ${updates.length} мөр шинэчлэгдлээ.`);
  } else if (!COMMIT) {
    console.log('\nХУУРАЙ — бичихийн тулд --commit');
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
