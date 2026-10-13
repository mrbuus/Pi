/**
 * Багшийн ажлын өдрийн хүснэгт (СОНДГОЙ / ТЭГШ 7 хоног) → TeacherWorkDay.
 *
 *   node prisma/seed-teacher-roster.cjs                      # dry-run (юу ч бичихгүй)
 *   node prisma/seed-teacher-roster.cjs --commit             # бичнэ
 *   node prisma/seed-teacher-roster.cjs --xlsx=roster.xlsx --sheet=Sheet1 [--commit]
 *
 * Эх:
 *  - Анхдагч: эзний хүснэгтийн зурагнаас буулгасан СОНДГОЙ 7 хоног (доорх ODD).
 *    ТЭГШ 7 хоногийг зурагнаас найдвартай уншаагүй тул сондгойг ХУУЛЖ,
 *    note = «тэгш долоо хоног — эзэн шалгах» гэж тэмдэглэнэ.
 *  - --xlsx: эзний Excel файл (python3 + openpyxl). Толгой мөрөнд «СОНДГОЙ»
 *    гэсэн нүд, баруун талд нь ДАВАА..НЯМ багана; багшийн нэр эхний баганад
 *    (эсвэл «СОНДГОЙ» нүдний баганад); 1 = ажиллана. Мөн мөрөн дээр баруун
 *    талд «ТЭГШ» блок. Excel-ээс уншсан тэгш 7 хоногт тэмдэглэл тавихгүй.
 *
 * Дүрэм:
 *  - Гараг: хүснэгт МОНГОЛ (Да=Даваа … Ня=Ням) → ӨС JS (0=Ням … 6=Бямба).
 *  - parity: 1 = СОНДГОЙ, 2 = ТЭГШ. 1-р сондгой 7 хоног = 2026-08-31 (Даваа).
 *  - Багш: нэрээр (firstName); давхардсан нэрд овгийн эхний үсэг
 *    («Б.Марал-Эрдэнэ», «У.Эмүжин»). Олдохгүй бол АЛГАСАЖ тайланд гаргана.
 *  - Идемпотент: багш бүрийн тухайн parity-ийн мөрүүдийг бүхэлд нь сольно.
 *    parity=0 (7 хоног бүр) мөрийг хөндөхгүй, байвал анхааруулна.
 *  - TeacherRosterConfig мөр байхгүй бол үүсгэнэ: Сондгой/Тэгш горим,
 *    2026-08-31 .. 2026-12-31 (эзэн: хүснэгт оны эцэс хүртэл хүчинтэй).
 *    Байгаа бол хөндөхгүй (Багш+ засварласан байж болно).
 *  - sortOrder = хүснэгтийн мөрийн дугаар (1..N) — «Энэ өдөр ажиллах багш»-ийн эрэмбэ.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { Client } = require('pg');

const COMMIT = process.argv.includes('--commit');
const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const XLSX = arg('xlsx');
const SHEET = arg('sheet');

const EVEN_NOTE = 'тэгш долоо хоног — эзэн шалгах';
const JS_DAY = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];
// Монгол товчлол → JS weekday (0=Ням … 6=Бямба)
const MN_TO_JS = { да: 1, мя: 2, лх: 3, пү: 4, ба: 5, бя: 6, ня: 0 };
const cuidish = () => 'c' + crypto.randomBytes(12).toString('hex').slice(0, 24);
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

// Эзний зурагнаас буулгасан СОНДГОЙ 7 хоног (баганын нийлбэрээр шалгасан).
const ODD = [
  ['Баасанжав', 'Да Мя Лх Пү Ба Бя'],
  ['Дуламсүрэн', 'Да Мя Лх Пү Бя'],
  ['Баасансүрэн', 'Да Лх Пү Ба Ня'],
  ['Бадрал', 'Да Мя Пү Ба Бя'],
  ['Энхсайхан', 'Мя Лх Пү Ба Ня'],
  ['Ундаръяа', 'Да Ба Бя Ня'],
  ['Өсөхбаяр', 'Да Лх Ба'],
  ['Ганзаяа', 'Мя Лх Пү Ня'],
  ['Болортуяа', 'Мя Пү Бя'],
  ['Даариймаа', 'Да Мя Бя'],
  ['Заяа', 'Лх Ба Ня'],
  ['Амарбаясах', 'Мя Ня'],
  ['Анар', 'Лх Бя'],
  ['Баясгалан', 'Ба Бя Ня'],
  ['Б.Марал-Эрдэнэ', 'Да Бя'],
  ['З.Марал-Эрдэнэ', 'Мя Лх Ня'],
  ['Оюугүнж', 'Да Ба'],
  ['Сайнсанаа', 'Мя Лх Бя'],
  ['У.Эмүжин', 'Пү Ба Ня'],
  ['А.Эмүжин', 'Да Ба Бя'],
];

function dayToJs(label) {
  const key = norm(label).toLowerCase().slice(0, 2);
  if (!(key in MN_TO_JS)) throw new Error(`Танигдаагүй гараг: «${label}»`);
  return MN_TO_JS[key];
}

function builtIn() {
  const odd = ODD.map(([name, days], i) => ({
    name,
    order: i + 1,
    weekdays: days.split(/\s+/).map(dayToJs),
  }));
  // ТЭГШ: найдвартай буулгаагүй — сондгойг хуулж, тэмдэглэнэ.
  const even = odd.map((r) => ({ ...r, note: EVEN_NOTE }));
  return { odd, even, evenFromSource: false };
}

// openpyxl-ээр хуудсыг 2 хэмжээст массив болгож авна.
function readSheet(file, sheet) {
  const py = `
import json, sys, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], data_only=True)
ws = wb[sys.argv[2]] if sys.argv[2] else wb.active
print(json.dumps([[c for c in row] for row in ws.iter_rows(values_only=True)], default=str, ensure_ascii=False))
`;
  const out = execFileSync('python3', ['-c', py, file, sheet || ''], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return JSON.parse(out);
}

function parseBlock(rows, marker) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] || [];
    const c = row.findIndex((v) => norm(v).toUpperCase().includes(marker));
    if (c === -1) continue;
    // Толгой мөрөн дээрх гарагийн баганууд (marker-ийн баруун талд, 7 ширхэг)
    const cols = [];
    for (let k = c + 1; k < row.length && cols.length < 7; k++) {
      const label = norm(row[k]);
      if (!label) continue;
      cols.push({ col: k, weekday: dayToJs(label) });
    }
    if (cols.length !== 7) throw new Error(`«${marker}» блокийн гарагийн багана 7 биш (${cols.length})`);
    const out = [];
    for (let rr = r + 1; rr < rows.length; rr++) {
      const line = rows[rr] || [];
      const name = norm(line[c]) || norm(line[0]);
      if (!name) break;
      if (/^(нийт|дүн|бүгд|total)/i.test(name)) break;
      const weekdays = cols
        .filter(({ col }) => Number(String(line[col] ?? '').trim()) === 1)
        .map(({ weekday }) => weekday);
      out.push({ name, order: out.length + 1, weekdays });
    }
    return out;
  }
  return null;
}

function fromXlsx(file, sheet) {
  const rows = readSheet(file, sheet);
  const odd = parseBlock(rows, 'СОНДГОЙ');
  if (!odd) throw new Error('«СОНДГОЙ» толгой олдсонгүй');
  const even = parseBlock(rows, 'ТЭГШ');
  if (!even) {
    return { odd, even: odd.map((r) => ({ ...r, note: EVEN_NOTE })), evenFromSource: false };
  }
  return { odd, even, evenFromSource: true };
}

function matcher(users) {
  const byFirst = new Map();
  for (const u of users) {
    const k = norm(u.firstName).toLowerCase();
    byFirst.set(k, [...(byFirst.get(k) ?? []), u]);
  }
  return (label) => {
    const m = norm(label).match(/^([А-ЯЁӨҮ])\.\s*(.+)$/i);
    const initial = m ? m[1].toLowerCase() : null;
    const first = (m ? m[2] : label).trim().toLowerCase();
    const hits = byFirst.get(first) ?? [];
    if (initial) {
      const narrowed = hits.filter((u) => norm(u.lastName).toLowerCase().startsWith(initial));
      return narrowed.length === 1 ? { user: narrowed[0] } : { error: narrowed.length ? 'давхардсан' : 'олдсонгүй' };
    }
    if (hits.length === 1) return { user: hits[0] };
    return { error: hits.length ? 'давхардсан нэр — овгийн үсэг хэрэгтэй' : 'олдсонгүй' };
  };
}

async function main() {
  const src = XLSX ? fromXlsx(XLSX, SHEET) : builtIn();
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const { rows: users } = await db.query(
      `select id, "firstName", "lastName", role from "User"
        where role in ('TEACHER','TEACHER_PLUS','ADMIN') and "archivedAt" is null`,
    );
    const match = matcher(users);
    const plan = [];
    const skipped = [];
    for (const [parity, list] of [[1, src.odd], [2, src.even]]) {
      for (const r of list) {
        const hit = match(r.name);
        if (!hit.user) {
          skipped.push(`${parity === 1 ? 'СОНДГОЙ' : 'ТЭГШ'}: ${r.name} — ${hit.error}`);
          continue;
        }
        plan.push({ ...r, parity, user: hit.user });
      }
    }

    const ids = [...new Set(plan.map((p) => p.user.id))];
    const { rows: everyWeek } = await db.query(
      `select "teacherId", count(*)::int n from "TeacherWorkDay" where parity = 0 and "teacherId" = any($1) group by 1`,
      [ids],
    );

    console.log(`Эх: ${XLSX ? `${XLSX}${SHEET ? ` [${SHEET}]` : ''}` : 'зурагнаас буулгасан СОНДГОЙ'}`);
    console.log(`Горим: ${COMMIT ? 'БИЧНЭ (--commit)' : 'dry-run (юу ч бичихгүй)'}`);
    if (!src.evenFromSource) console.log(`АНХААР: ТЭГШ 7 хоног = СОНДГОЙ-ийн хуулбар, note «${EVEN_NOTE}»`);
    const total = { 1: 0, 2: 0 };
    const perDay = { 1: [0, 0, 0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0, 0, 0] };
    for (const p of plan) {
      total[p.parity] += p.weekdays.length;
      for (const w of p.weekdays) perDay[p.parity][w]++;
    }
    for (const parity of [1, 2]) {
      const label = parity === 1 ? 'СОНДГОЙ' : 'ТЭГШ';
      const teachers = plan.filter((p) => p.parity === parity).length;
      const cols = [1, 2, 3, 4, 5, 6, 0].map((w) => `${JS_DAY[w].slice(0, 2)} ${perDay[parity][w]}`).join(', ');
      console.log(`${label}: ${teachers} багш, ${total[parity]} мөр (${cols})`);
    }
    for (const p of plan.filter((x) => x.parity === 1)) {
      console.log(
        `  ${String(p.order).padStart(2)}. ${p.name.padEnd(16)} -> ${p.user.lastName} ${p.user.firstName} [${p.user.role}]: ${p.weekdays
          .map((w) => JS_DAY[w])
          .join(', ')}`,
      );
    }
    if (skipped.length) {
      console.log('АЛГАССАН:');
      for (const s of skipped) console.log(`  ${s}`);
    }
    if (everyWeek.length) console.log(`АНХААР: ${everyWeek.length} багшид parity=0 (7 хоног бүр) мөр бий — хөндсөнгүй.`);

    if (!COMMIT) return;
    await db.query('begin');
    let written = 0;
    for (const p of plan) {
      await db.query('delete from "TeacherWorkDay" where "teacherId" = $1 and parity = $2', [p.user.id, p.parity]);
      for (const w of [...new Set(p.weekdays)]) {
        await db.query(
          `insert into "TeacherWorkDay" (id, "teacherId", weekday, parity, "sortOrder", note) values ($1, $2, $3, $4, $5, $6)`,
          [cuidish(), p.user.id, w, p.parity, p.order, p.note ?? null],
        );
        written++;
      }
    }
    const cfg = await db.query(
      `insert into "TeacherRosterConfig" (id, mode, "validFrom", "validTo", "updatedAt")
       values ('default', 'ALTERNATING', '2026-08-31', '2026-12-31', now() at time zone 'UTC')
       on conflict (id) do nothing`,
    );
    await db.query('commit');
    console.log(cfg.rowCount ? 'Горим: Сондгой/Тэгш, 2026-08-31 .. 2026-12-31 (шинээр).' : 'Горимын тохиргоо өмнө нь байсан — хөндсөнгүй.');
    console.log(`Бичсэн: ${written} мөр.`);
  } catch (e) {
    await db.query('rollback').catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
