/**
 * Хуваарийг ПРОДАКШН руу API-ААР ДАМЖУУЛЖ суулгана.
 *
 * ЯАГААД API-аар вэ: Render-ийн өгөгдлийн сангийн нууц үг байхгүй байсан ч
 * админаар нэвтэрсэн бол шаардлагатай бүх үйлдэл (анги үүсгэх/нэр солих,
 * хуваарь үүсгэх, танхим оноох) аль хэдийн эрхийн шалгалттай маршрутаар
 * нээлттэй. Тиймээс DB-ийн эрхийн оронд ЭРХТЭЙ ХЭРЭГЛЭГЧИЙН эрхийг ашиглана
 * — аудит бүртгэлд ч зөв тусна.
 *
 * АЖИЛЛУУЛАХ:
 *   node prisma/seed-prod-via-api.cjs                          # хуурай
 *   node prisma/seed-prod-via-api.cjs --commit                 # бичнэ
 *   API_URL=... ADMIN_PHONE=... ADMIN_PASSWORD=... node ... --commit
 *
 * Идемпотент: аль хэдийн байгаа анги/хуваарийг давхардуулахгүй.
 */
const {
  EFFECTIVE_FROM,
  RENAMES,
  NEW_CLASSROOMS,
  PLAN,
  DURATION_MIN,
  JS_DAY_NAME,
  hhmm,
  fmt,
  mnDayToJs,
  buildRows,
  planRoomAssignments,
} = require('./schedule-plan.cjs');

const COMMIT = process.argv.includes('--commit');
const API = (process.env.API_URL || 'https://pimn-api.onrender.com/api').replace(/\/$/, '');
const ADMIN_PHONE = process.env.ADMIN_PHONE || '99294266';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ADMIN_PHONE;

let token = null;

async function call(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    // Render-ийн үнэгүй багц унтсан байвал эхний хүсэлт удаан сэрдэг.
    signal: AbortSignal.timeout(90_000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(`${method} ${path} → ${res.status}: ${msg ?? String(data).slice(0, 200)}`);
  }
  return data;
}

async function main() {
  console.log(`\nAPI: ${API}`);
  console.log(COMMIT ? '⚠️  БОДИТ БИЧИЛТ\n' : 'ХУУРАЙ АЖИЛЛАГАА — юу ч бичихгүй\n');

  // ---- 1. Нэвтрэх ----
  const auth = await call('/auth/login', {
    method: 'POST',
    body: { identifier: ADMIN_PHONE, password: ADMIN_PASSWORD },
  });
  token = auth.accessToken;
  if (auth.role !== 'ADMIN') {
    throw new Error(`Админ биш эрхээр нэвтэрлээ: ${auth.role}`);
  }
  console.log(`✓ Нэвтэрлээ (${auth.role})`);

  // ---- 2. Одоогийн анги ----
  let classrooms = await call('/classrooms');
  const byName = new Map(classrooms.map((c) => [c.name, c]));
  console.log(`✓ Одоогийн анги: ${classrooms.length}`);

  // ---- 3. Нэр солих ----
  for (const r of RENAMES) {
    const found = byName.get(r.from);
    if (!found) {
      console.log(`  = ${r.from} олдсонгүй (аль хэдийн солигдсон бол хэвийн)`);
      continue;
    }
    console.log(`  ↻ ${r.from} → ${r.to}${r.grade ? ` (анги ${r.grade})` : ''}`);
    if (COMMIT) {
      await call(`/classrooms/${found.id}`, {
        method: 'PATCH',
        body: { name: r.to, ...(r.grade !== undefined ? { grade: r.grade } : {}) },
      });
    }
  }

  // ---- 4. Шинэ анги ----
  for (const c of NEW_CLASSROOMS) {
    if (byName.has(c.name)) {
      console.log(`  = ${c.name} аль хэдийн бий`);
      continue;
    }
    console.log(`  + ${c.name}`);
    if (COMMIT) {
      await call('/classrooms', {
        method: 'POST',
        body: {
          name: c.name,
          type: 'IN_PERSON',
          ...(c.grade != null ? { grade: c.grade } : {}),
        },
      });
    }
  }

  if (!COMMIT) {
    const rows = buildRows();
    console.log(`\nҮүсгэх хуваарь: ${rows.length} мөр`);
    for (const g of PLAN) {
      const times = g.slots
        .map((s) => `${s.days.join(',')}-р өдөр ${s.start}`)
        .join(' — ');
      console.log(`  ${g.classes.join(', ')}\n    ${times}`);
    }
    console.log('\n--commit-той дахин ажиллуулна.\n');
    return;
  }

  // ---- 5. Хуваарь үүсгэх ----
  classrooms = await call('/classrooms');
  const idByName = new Map(classrooms.map((c) => [c.name, c.id]));
  const existing = await call('/schedule');
  // Аль хэдийн байгаа (анги, гараг, эхлэх цаг) — давхардуулахгүй
  const have = new Set(
    existing.map((s) => `${s.classroomId}|${s.weekday}|${s.startMinute}`),
  );

  let created = 0;
  let skipped = 0;
  for (const group of PLAN) {
    for (const className of group.classes) {
      const classroomId = idByName.get(className);
      if (!classroomId) throw new Error(`Анги олдсонгүй: ${className}`);
      for (const slot of group.slots) {
        const startMinute = hhmm(slot.start);
        // Энэ slot-оос ЗӨВХӨН дутуу гарагуудыг үүсгэнэ (идемпотент)
        const weekdays = slot.days
          .map(mnDayToJs)
          .filter((wd) => !have.has(`${classroomId}|${wd}|${startMinute}`));
        skipped += slot.days.length - weekdays.length;
        if (weekdays.length === 0) continue;
        await call('/schedule/bulk', {
          method: 'POST',
          body: {
            classroomId,
            weekdays,
            startMinute,
            endMinute: startMinute + DURATION_MIN,
            effectiveFrom: EFFECTIVE_FROM,
          },
        });
        created += weekdays.length;
        for (const wd of weekdays) have.add(`${classroomId}|${wd}|${startMinute}`);
      }
    }
  }
  console.log(`\n✓ Хуваарь: ${created} шинэ мөр, ${skipped} аль хэдийн байсан`);

  // ---- 6. Танхим оноох ----
  const all = await call('/schedule');
  const forPlanner = all.map((s) => ({
    id: s.id,
    weekday: s.weekday,
    startMinute: s.startMinute,
    room: s.room,
    className: s.classroom.name,
  }));
  const assignments = planRoomAssignments(forPlanner);
  for (const a of assignments) {
    await call(`/schedule/${a.id}`, { method: 'PATCH', body: { room: a.room } });
  }
  console.log(`✓ Танхим: ${assignments.length} мөрд шинээр оноолоо`);

  // ---- 7. Эцсийн байдал ----
  const final = await call('/schedule');
  const noRoom = final.filter((s) => !s.room).length;
  console.log(`\nНийт хуваарийн мөр: ${final.length} | танхимгүй: ${noRoom}`);

  const byDay = new Map();
  for (const s of final) {
    if (!byDay.has(s.weekday)) byDay.set(s.weekday, []);
    byDay.get(s.weekday).push(s);
  }
  for (const wd of [1, 2, 3, 4, 5, 6, 0]) {
    const day = byDay.get(wd);
    if (!day) continue;
    console.log(`\n${JS_DAY_NAME[wd]} (${day.length}):`);
    for (const s of day.sort(
      (a, b) => a.startMinute - b.startMinute || (a.room ?? '').localeCompare(b.room ?? ''),
    )) {
      console.log(
        `   ${fmt(s.startMinute)}–${fmt(s.endMinute)}  ${(s.room ?? '—').padEnd(7)} ${s.classroom.name}`,
      );
    }
  }
  console.log('');
}

main().catch((e) => {
  console.error('\n❌', e.message, '\n');
  process.exit(1);
});
