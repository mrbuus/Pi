/**
 * Хуваарийн ЦОРЫН ГАНЦ эх сурвалж — эзний 2026-07-30/31-ний заавар.
 *
 * Хоёр скрипт үүнийг хуваалцана:
 *   seed-year-schedule.cjs   — өгөгдлийн санд ШУУД бичнэ (локал)
 *   seed-prod-via-api.cjs    — API-аар дамжуулж бичнэ (продакшн, DB нууц үггүй)
 *
 * Яагаад тусад нь гаргасан бэ: хоёр скрипт тус тусдаа хуваарийн жагсаалттай
 * байвал нэгийг нь засаад нөгөөг мартах нь цаг хугацааны асуудал. Тэгвэл
 * локал ба продакшн чимээгүй зөрнө — оношлоход хамгийн хэцүү төрлийн алдаа.
 */

/** Хичээлийн үргэлжлэх хугацаа — бүх анги 120 минут (эзний шийдвэр) */
const DURATION_MIN = 120;

/** Хуваарь хэрэгжиж эхлэх огноо */
const EFFECTIVE_FROM = '2026-07-30';

/** Нэр солих: [хуучин] → [шинэ] */
const RENAMES = [
  { from: '13-3 (Зүүн 4)', to: '13-2 (Зүүн 4)' },
  // Сурагчид 10-р анги руу дэвшсэн тул grade-ийг мөн засна.
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
  // Нийгмийн ухааны бүлэг — ангийн түвшингүй
  { name: 'НИЙГЭМ (Зүүн 4)', grade: null },
];

/**
 * slots: [{ days: [МОНГОЛ гарагийн дугаар 1=Даваа…7=Ням], start: "HH:MM" }]
 */
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

// Танхимын олголтын дараалал. 405 нь хамгийн ЖИЖИГ тул баруунд СҮҮЛД.
const WEST_ROOMS = ['501', '502', '503', '504', '404', '403', '405'];
const EAST_ROOMS = ['301', '302'];
/** Зүүн 4-ийн тогтмол дуршил (эзний хүснэгтээс) */
const EAST_PREFERRED = { '13-1': '301', '13-2': '302' };

const MN_DAY_NAME = ['', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
const JS_DAY_NAME = ['Ням', 'Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба'];

/** "15:00" → 900 */
function hhmm(value) {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** 540 → "09:00" */
function fmt(m) {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Монгол гараг (1=Даваа…7=Ням) → JS/Prisma (0=Ням…6=Бямба).
 * Энэ хоёрыг андуурвал БҮХ хуваарь нэг өдрөөр гулсана.
 */
function mnDayToJs(mnDay) {
  if (mnDay < 1 || mnDay > 7) throw new Error(`Гарагийн дугаар буруу: ${mnDay}`);
  return mnDay === 7 ? 0 : mnDay;
}

/** PLAN-ыг хавтгай мөр болгож, дотоод давхцлыг шалгана */
function buildRows() {
  const rows = [];
  for (const group of PLAN) {
    for (const className of group.classes) {
      for (const slot of group.slots) {
        const startMinute = hhmm(slot.start);
        for (const mnDay of slot.days) {
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
  const seen = new Set();
  for (const r of rows) {
    const key = `${r.className}|${r.weekday}`;
    if (seen.has(key)) {
      throw new Error(
        `PLAN дотор давхцал: ${r.className} — ${MN_DAY_NAME[r.mnDay]} гарагт хоёр удаа`,
      );
    }
    seen.add(key);
  }
  return rows;
}

/**
 * Танхимгүй мөрүүдэд танхим оноох — ДАВХЦАЛГҮЙ, ТОГТВОРТОЙ.
 *
 * Слот = (гараг, эхлэх цаг, салбар). Нэг слотод нэг танхимд зөвхөн нэг анги.
 * Ангиудыг нэрээр эрэмбэлж, дуршилтайг нь эхэлж байрлуулаад үлдсэнд нь
 * жагсаалтын дарааллаар олгоно — дахин ажиллуулахад үр дүн ижил.
 *
 * @param rows [{ id, weekday, startMinute, room, className }]
 * @returns [{ id, room, className, weekday, startMinute }] — зөвхөн шинээр оноосон
 */
function planRoomAssignments(rows) {
  const slots = new Map();
  for (const r of rows) {
    const east = r.className.includes('Зүүн');
    const key = `${r.weekday}|${r.startMinute}|${east ? 'E' : 'W'}`;
    if (!slots.has(key)) slots.set(key, []);
    slots.get(key).push(r);
  }

  const out = [];
  for (const [key, group] of slots) {
    const east = key.endsWith('E');
    const pool = east ? EAST_ROOMS : WEST_ROOMS;
    const taken = new Set(group.map((r) => r.room).filter(Boolean));

    const shortName = (n) => n.replace(/\s*\([^)]*\)\s*$/, '');
    const sorted = [...group].sort((a, b) => {
      const pa = EAST_PREFERRED[shortName(a.className)] ? 0 : 1;
      const pb = EAST_PREFERRED[shortName(b.className)] ? 0 : 1;
      return pa - pb || a.className.localeCompare(b.className);
    });

    for (const r of sorted) {
      if (r.room) continue;
      const pref = EAST_PREFERRED[shortName(r.className)];
      const room =
        pref && !taken.has(pref) ? pref : pool.find((x) => !taken.has(x));
      if (!room) continue; // танхим дуссан — хоосон үлдээнэ
      taken.add(room);
      out.push({ ...r, room });
    }
  }
  return out;
}

module.exports = {
  DURATION_MIN,
  EFFECTIVE_FROM,
  RENAMES,
  NEW_CLASSROOMS,
  PLAN,
  WEST_ROOMS,
  EAST_ROOMS,
  EAST_PREFERRED,
  MN_DAY_NAME,
  JS_DAY_NAME,
  hhmm,
  fmt,
  mnDayToJs,
  buildRows,
  planRoomAssignments,
};
