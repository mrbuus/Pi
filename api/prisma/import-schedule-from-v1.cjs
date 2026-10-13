/**
 * Хуучин Pi.mn (v1) → Pi.mn v2: ангийн хуваарь (ClassSchedule) шилжүүлэх.
 *
 *   node prisma/import-schedule-from-v1.cjs                 # dry-run, эх = локал pimn ӨС
 *   node prisma/import-schedule-from-v1.cjs --commit        # бичнэ
 *   node prisma/import-schedule-from-v1.cjs --from-json schedule.json [--commit]
 *       schedule.json = хуучин сайтын `GET /api/schedule` хариу (ADMIN-аар
 *       хөтөчөөс татсан массив). Тэнд багшийн утас байхгүй тул багшийг
 *       ОВОГ+НЭРЭЭР тулгана (давхардвал оноохгүй, тайланд гаргана).
 *
 * Орчин: OLD_DATABASE_URL (анхдагч `postgresql:///pimn`), DATABASE_URL (api/.env).
 *
 * Дүрэм:
 *  - Анги: НЭРЭЭР тулгана (id ялгаатай). Олдохгүй бол АЛГАСАЖ тайланд гаргана.
 *  - Багш: локал эхэд утсаар (User.phone), JSON эхэд нэрээр.
 *  - weekday-г ХӨРВҮҮЛЭХГҮЙ: хоёр ӨС хоёулаа JS дугаарлалт (0=Ням…6=Бямба).
 *    Монгол дугаарлалт (1=Даваа…7=Ням) зөвхөн schedule-plan.cjs-д байдаг.
 *  - Давхардал: (classroomId, weekday, startMinute, effectiveFrom) unique —
 *    байгаа мөрийг дахин бичихгүй (идемпотент), өөр утгатай бол ЗӨРҮҮ гэж
 *    тайлагнаад хөндөхгүй. Юу ч устгахгүй.
 *  - Timestamp-ууд UTC утгаараа (timestamp without tz) хуулна — now() ашиглахгүй.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const fs = require('fs');
const crypto = require('crypto');
const { Client } = require('pg');

const COMMIT = process.argv.includes('--commit');
const jsonIdx = process.argv.indexOf('--from-json');
const JSON_FILE = jsonIdx > -1 ? process.argv[jsonIdx + 1] : null;
const OLD_URL = process.env.OLD_DATABASE_URL || 'postgresql:///pimn';
const NEW_URL = process.env.DATABASE_URL;

const JS_DAY = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const cuidish = () => 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
const isoKey = (d) => (d ? new Date(d).toISOString() : null);

async function loadSource() {
  if (JSON_FILE) {
    const raw = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    const arr = Array.isArray(raw) ? raw : raw.data || raw.items;
    return {
      label: `JSON ${JSON_FILE}`,
      rows: arr.map((r) => ({
        oldId: r.id,
        className: norm(r.classroom?.name),
        weekday: r.weekday,
        startMinute: r.startMinute,
        endMinute: r.endMinute,
        room: r.room ?? null,
        subject: r.subject ?? null,
        effectiveFrom: r.effectiveFrom,
        effectiveTo: r.effectiveTo ?? null,
        createdAt: r.createdAt ?? null,
        teacherPhone: null,
        teacherName: r.teacher ? norm(`${r.teacher.lastName || ''} ${r.teacher.firstName || ''}`) : null,
      })),
      exceptions: [], // GET /api/schedule exceptions-ийг агуулдаггүй
    };
  }
  const old = new Client({ connectionString: OLD_URL });
  await old.connect();
  const { rows } = await old.query(`
    select s.id "oldId", c.name "className", s.weekday, s."startMinute", s."endMinute",
           s.room, s.subject::text subject, s."effectiveFrom", s."effectiveTo", s."createdAt",
           u.phone "teacherPhone",
           nullif(trim(coalesce(u."lastName",'')||' '||coalesce(u."firstName",'')),'') "teacherName"
      from "ClassSchedule" s
      join "Classroom" c on c.id = s."classroomId"
      left join "User" u on u.id = s."teacherId"
     order by c.name, s.weekday, s."startMinute", s."effectiveFrom"`);
  const ex = await old.query(`select * from "ScheduleException" order by date`);
  await old.end();
  return { label: `DB ${OLD_URL}`, rows: rows.map((r) => ({ ...r, className: norm(r.className) })), exceptions: ex.rows };
}

async function main() {
  if (!NEW_URL) throw new Error('DATABASE_URL алга (api/.env)');
  const src = await loadSource();
  const db = new Client({ connectionString: NEW_URL });
  await db.connect();

  const classrooms = (await db.query(`select id, name from "Classroom"`)).rows;
  const clsByName = new Map(classrooms.map((c) => [norm(c.name), c.id]));
  const users = (await db.query(`select id, phone, "firstName", "lastName" from "User"`)).rows;
  const userByPhone = new Map(users.filter((u) => u.phone).map((u) => [u.phone, u.id]));
  const nameCount = new Map();
  for (const u of users) {
    const k = norm(`${u.lastName || ''} ${u.firstName || ''}`);
    nameCount.set(k, (nameCount.get(k) || []).concat(u.id));
  }
  const existing = (await db.query(
    `select id, "classroomId", weekday, "startMinute", "endMinute", room, "teacherId", "effectiveFrom", "effectiveTo" from "ClassSchedule"`,
  )).rows;
  const exKey = (r) => `${r.classroomId}|${r.weekday}|${r.startMinute}|${isoKey(r.effectiveFrom)}`;
  const existingByKey = new Map(existing.map((r) => [exKey(r), r]));

  const unmappedClass = new Map();
  const unmappedTeacher = new Map();
  const toInsert = [];
  const conflicts = [];
  let alreadyPresent = 0;
  const idMap = new Map(); // old schedule id → v2 schedule id

  for (const r of src.rows) {
    if (!Number.isInteger(r.weekday) || r.weekday < 0 || r.weekday > 6) throw new Error(`weekday буруу: ${JSON.stringify(r)}`);
    const classroomId = clsByName.get(r.className);
    if (!classroomId) {
      unmappedClass.set(r.className, (unmappedClass.get(r.className) || 0) + 1);
      continue;
    }
    let teacherId = null;
    if (r.teacherPhone || r.teacherName) {
      if (r.teacherPhone && userByPhone.has(r.teacherPhone)) teacherId = userByPhone.get(r.teacherPhone);
      else if (!r.teacherPhone && r.teacherName && (nameCount.get(r.teacherName) || []).length === 1)
        teacherId = nameCount.get(r.teacherName)[0];
      else unmappedTeacher.set(`${r.teacherName || '?'} (${r.teacherPhone || 'утасгүй'})`, true);
    }
    const row = {
      id: cuidish(),
      classroomId,
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      teacherId,
      room: r.room,
      subject: r.subject,
      effectiveFrom: r.effectiveFrom,
      effectiveTo: r.effectiveTo,
      createdAt: r.createdAt || r.effectiveFrom,
      className: r.className,
    };
    const hit = existingByKey.get(exKey(row));
    if (hit) {
      alreadyPresent++;
      idMap.set(r.oldId, hit.id);
      if (hit.endMinute !== row.endMinute || (hit.room || null) !== (row.room || null) || isoKey(hit.effectiveTo) !== isoKey(row.effectiveTo))
        conflicts.push(`${row.className} ${JS_DAY[row.weekday]} ${fmt(row.startMinute)}: v2 room=${hit.room} to=${isoKey(hit.effectiveTo)} | v1 room=${row.room} to=${isoKey(row.effectiveTo)}`);
      continue;
    }
    idMap.set(r.oldId, row.id);
    toInsert.push(row);
  }

  // Exceptions — зөвхөн шилжүүлсэн хуваарьт хамаарах, ирээдүйн (эсвэл бүгд) мөрүүд
  const excToInsert = [];
  const existingExc = new Set(
    (await db.query(`select "scheduleId", date from "ScheduleException"`)).rows.map((e) => `${e.scheduleId}|${isoKey(e.date)}`),
  );
  for (const e of src.exceptions) {
    const sid = idMap.get(e.scheduleId);
    if (!sid) continue;
    if (existingExc.has(`${sid}|${isoKey(e.date)}`)) continue;
    excToInsert.push({ ...e, id: cuidish(), scheduleId: sid });
  }

  console.log(`Эх: ${src.label}`);
  console.log(`Эх мөр: ${src.rows.length} | шинээр бичих: ${toInsert.length} | аль хэдийн байгаа: ${alreadyPresent} | зөрүү: ${conflicts.length}`);
  console.log(`Exception: эх ${src.exceptions.length} | бичих ${excToInsert.length}`);
  if (unmappedClass.size) console.log('ТУЛГАГДААГҮЙ анги (v2-д нэрээр алга):', Object.fromEntries(unmappedClass));
  const srcClasses = new Set(src.rows.map((r) => r.className));
  const noSchedule = classrooms.map((c) => norm(c.name)).filter((n) => !srcClasses.has(n));
  if (noSchedule.length) console.log('v2 анги, эхэд хуваарьгүй:', noSchedule);
  if (unmappedTeacher.size) console.log('ТУЛГАГДААГҮЙ багш:', [...unmappedTeacher.keys()]);
  for (const c of conflicts) console.log('ЗӨРҮҮ:', c);
  const active = toInsert.filter((r) => !r.effectiveTo);
  const sample = active.slice(0, 5);
  for (const r of sample)
    console.log(`  ${r.className.padEnd(17)} ${JS_DAY[r.weekday].padEnd(7)} ${fmt(r.startMinute)}-${fmt(r.endMinute)} танхим ${r.room || '-'}`);

  if (!COMMIT) {
    console.log('\nDRY-RUN — юу ч бичээгүй. Бичихийн тулд --commit.');
    await db.end();
    return;
  }
  await db.query('begin');
  try {
    for (const r of toInsert) {
      await db.query(
        `insert into "ClassSchedule" (id,"classroomId",weekday,"startMinute","endMinute","teacherId",room,subject,"effectiveFrom","effectiveTo","createdAt")
         values ($1,$2,$3,$4,$5,$6,$7,$8::"Subject",$9,$10,$11)
         on conflict ("classroomId",weekday,"startMinute","effectiveFrom") do nothing`,
        [r.id, r.classroomId, r.weekday, r.startMinute, r.endMinute, r.teacherId, r.room, r.subject, r.effectiveFrom, r.effectiveTo, r.createdAt],
      );
    }
    for (const e of excToInsert) {
      await db.query(
        `insert into "ScheduleException" (id,"scheduleId",date,kind,"newDate","newStartMinute","newEndMinute","newRoom",note,"createdAt")
         values ($1,$2,$3,$4::"ScheduleExceptionKind",$5,$6,$7,$8,$9,$10)`,
        [e.id, e.scheduleId, e.date, e.kind, e.newDate, e.newStartMinute, e.newEndMinute, e.newRoom, e.note, e.createdAt],
      );
    }
    await db.query('commit');
    console.log(`\nCOMMIT: ${toInsert.length} хуваарь, ${excToInsert.length} exception бичлээ.`);
  } catch (err) {
    await db.query('rollback');
    throw err;
  }
  await db.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
