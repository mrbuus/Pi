#!/usr/bin/env node
/**
 * Эзний «2027 оны төлбөрийн мэдээлэл-2.xlsx»-ээс 2026–2027 оны сургалтын
 * төлбөрийг ЛОКАЛ ӨС-д оруулна.
 *
 *   node prisma/import-payments-2027.cjs              # dry-run (анхдагч) — ӨС-д БИЧИХГҮЙ
 *   node prisma/import-payments-2027.cjs --commit     # бичнэ
 *   --source=<xlsx>  --report=<json>  --today=YYYY-MM-DD
 *
 * ХУУДАС БА УТГА (2026-10-13 шинжилгээ):
 *  - «Суудал баталгаажуулалт» — ЭЗЭН ЖАГСААЛТ (~724 мөр). Мөчлөгийн багана
 *    14-өөс 3-аар: «6-7 сар» … «05-06сар» (Төлсөн дүн / Хугацаа / Баримт).
 *    Хугацаа = «09/07-10/07» (мөчлөг), «бүтэн» (бүтэн жил), «хагас».
 *    Дүнгийн нүдэнд текст («ярьсан», «9/1 өмнө») = төлбөрийн тэмдэглэл.
 *  - «Бүтэн жил» — бүтэн жилийн урьдчилгаа + үлдэгдлийн задаргаа (огноотой).
 *    Нийлбэр нь эзэн жагсаалтын дүнтэй таарвал 2 гүйлгээ болгож задална.
 *    Үлдэгдлийн нүдэнд ОГНОО байвал = үлдэгдэл төлөх өдөр (амлалт).
 *  - «Сар бүр» — эзэн жагсаалтын хуучин хуулбар; зөвхөн тэнд байхгүй сурагчид.
 *  - «Нийгэм» — Нийгмийн анги (бүтэн 1.5 сая, суудал 300 мянга).
 *  - «Шийт29» — «10.7 ноос өмнө», «10.1 нд» маягийн амлалт → тэмдэглэл.
 *  - «Илүү төлөлт» — илүү төлөлт/буцаах дүн → тэмдэглэл (дансны дугаарыг
 *    ОРУУЛАХГҮЙ — хувийн мэдээлэл).
 *  - «гарсан» — гарсан сурагчид: зөвхөн огноотой мөрөнд StudentProfile.leftOn
 *    (хоосон бол) тавина; ангиас ГАРГАХГҮЙ (тайланд жагсаана).
 *  - «Шийт30» — зөвхөн нэр + анги, төлбөрийн өгөгдөлгүй → алгасна.
 *
 * ТААРУУЛАХ: сурагчийн утас → овог+нэр (давхардалгүй бол) → эцэг/эхийн утас +
 * нэр. Олон нэр дэвшигч → зөрчил (алгасна, тайланд).
 *
 * ИДЕМПОТЕНТ: гүйлгээ бүр тогтмол clientRequestId-тэй (sha256 → UUID хэлбэр),
 * Payment(userId, clientRequestId) unique тул дахин ажиллуулахад давхардахгүй.
 * Тэмдэглэл ижил биетэй бол алгасна.
 *
 * БАГЦ: Excel-ийн «Хэлбэр» + мөчлөгийн «бүтэн/хагас» → tuitionPlan/Amount.
 * ӨС-ийн утгаас ялгаатай бол Excel ЯЛНА (төлбөрийн бодит эх сурвалж) —
 * өмнөх утга тайланд (planChanges) хадгалагдана. joinedOn зөвхөн хоосон бол.
 *
 * ⚠️ PII: тайлан (reports/payment-import.json) нэр, утас, дүн агуулна —
 *    .gitignore-д бий. Git-т ХЭЗЭЭ Ч бүү оруул.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const DEFAULT_SOURCE = '/Users/mr.buus/Downloads/2027 оны төлбөрийн мэдээлэл-2.xlsx';
const DEFAULT_REPORT = path.join(__dirname, 'reports', 'payment-import.json');
const IMPORT_TAG = 'Excel 2027';

const SHEET = {
  MAIN: 'Суудал баталгаажуулалт',
  FULL: 'Бүтэн жил',
  MONTHLY: 'Сар бүр',
  SOCIAL: 'Нийгэм',
  PROMISE: 'Шийт29',
  OVERPAID: 'Илүү төлөлт',
  LEFT: 'гарсан',
};

// Эзэн жагсаалт ба «Сар бүр»: 0 №, 1 овог, 2 нэр, 3 анги, 4 утас, 5 аав, 6 ээж,
// 7 сургууль, 8 с.т анги, 9 шинэ/хуучин, 10 эхэлсэн, 11 урьдчилгаа, 12 салбар, 13 хэлбэр
const MAIN_CYCLES = ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
  '2027-01', '2027-02', '2027-03', '2027-04', '2027-05'].map((month, i) => ({ month, col: 14 + i * 3 }));
// «Нийгэм»: 0 №, 1 овог, 2 нэр, 3 анги, 4 утас, 5 аав, 6 ээж, 7 сургууль, 8 эхэлсэн, 9 урьдчилгаа, 10 хэлбэр
const SOCIAL_CYCLES = [{ month: '2026-09', col: 11 }, { month: '2026-10', col: 14 }];

const PYTHON = `
import json, sys, datetime, openpyxl
wb = openpyxl.load_workbook(sys.argv[1], data_only=True, read_only=True)
out = {}
for name in sys.argv[2:]:
    if name not in wb.sheetnames:
        out[name] = None
        continue
    rows = []
    for r in wb[name].iter_rows(values_only=True):
        cells = []
        for v in r[:60]:
            if isinstance(v, datetime.datetime): v = v.strftime('%Y-%m-%d')
            elif isinstance(v, float) and v.is_integer(): v = int(v)
            cells.append(v)
        rows.append(cells)
    out[name] = rows
print(json.dumps(out, ensure_ascii=False, default=str))
`;

function readWorkbook(source) {
  if (!fs.existsSync(source)) throw new Error(`Excel олдсонгүй: ${source}`);
  const stdout = execFileSync('python3', ['-c', PYTHON, source, ...Object.values(SHEET)], {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}

// ---------- туслах ----------
const normText = (v) => (v == null ? '' : String(v).normalize('NFC').replace(/\s+/g, ' ').trim());
const normKey = (v) => normText(v).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
function phone8(v) {
  if (v == null) return null;
  const s = String(v).replace(/\.0$/, '').replace(/\D/g, '');
  return /^\d{8}$/.test(s) ? s : null;
}
const pad2 = (n) => String(n).padStart(2, '0');
// Сар/өдөр → хичээлийн жилийн он (6–12 сар = 2026, 1–5 сар = 2027)
const yearFor = (month) => (month >= 6 ? 2026 : 2027);
function mdToIso(m, d, yearHint) {
  const month = Number(m);
  const day = Number(d);
  if (!(month >= 1 && month <= 12 && day >= 1 && day <= 31)) return null;
  return `${yearHint ?? yearFor(month)}-${pad2(month)}-${pad2(day)}`;
}

/** «Баримт» нүд: огноо эсвэл «04/14, 04/17», «2026-08-16, 09/30» → огноонууд. */
function receiptDates(v, today) {
  if (v == null || v === '') return [];
  if (isIso(v)) return v <= today ? [v] : [];
  const s = String(v);
  const out = [];
  for (const m of s.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) out.push(`${m[1]}-${m[2]}-${m[3]}`);
  const stripped = s.replace(/\d{4}-\d{2}-\d{2}/g, ' ');
  // Баримтын огноо өнгөрсөнд: 2026 он (4-р сарын урьдчилгаа ч 2026)
  for (const m of stripped.matchAll(/(\d{1,2})\/(\d{1,2})/g)) {
    const iso = mdToIso(m[1], m[2], 2026);
    if (iso) out.push(iso);
  }
  return out.filter((d) => d <= today).sort();
}

/** «Хугацаа» нүд → мөчлөгийн эхлэх сар эсвэл бүтэн/хагас. */
function parsePeriod(v) {
  const s = normText(v).toLowerCase();
  if (!s) return { kind: null };
  if (/бүтэн/.test(s)) return { kind: 'FULL' };
  if (/хагас/.test(s)) return { kind: 'HALF' };
  const m = s.match(/(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})/);
  if (m) return { kind: 'MONTH', month: `${yearFor(Number(m[1]))}-${pad2(Number(m[1]))}`, text: s };
  return { kind: 'TEXT', text: normText(v) };
}

/** «10.7 ноос өмнө», «9/1 өмнө», «12.20 үлд», «10.01 нд» → амласан өдөр. */
function parsePromise(text) {
  const s = normText(text);
  if (!s || /дууссан/i.test(s)) return null;
  const m = s.match(/(\d{1,2})\s*[./]\s*(\d{1,2})/);
  return m ? mdToIso(m[1], m[2]) : null;
}

/** Тогтмол UUID (v4 хэлбэр) — idempotency түлхүүр. */
function stableUuid(...parts) {
  const h = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  const v = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-${v}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function hasData(row, upto = 14) {
  return row && row.slice(0, upto).some((v) => v !== null && v !== '');
}

// ---------- ӨС-ийн сурагчид ----------
async function loadStudents(client) {
  const { rows } = await client.query(`
    SELECT u.id, u."firstName", u."lastName", u.phone, u."studentCode",
           sp.grade, sp."fatherPhone", sp."motherPhone", sp."tuitionPlan"::text AS plan,
           sp."tuitionAmount", to_char(sp."joinedOn", 'YYYY-MM-DD') AS "joinedOn",
           to_char(sp."leftOn", 'YYYY-MM-DD') AS "leftOn",
           c.name AS "classroomName"
    FROM "User" u
    JOIN "StudentProfile" sp ON sp."userId" = u.id
    LEFT JOIN LATERAL (
      SELECT cl.name FROM "Enrollment" e JOIN "Classroom" cl ON cl.id = e."classroomId"
      WHERE e."studentId" = u.id AND e."leftAt" IS NULL ORDER BY e."joinedAt" DESC LIMIT 1
    ) c ON true
    WHERE u.role = 'STUDENT' AND u."archivedAt" IS NULL`);
  const byPhone = new Map();
  const byName = new Map();
  const byParent = new Map();
  const add = (map, key, s) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    if (!map.get(key).includes(s)) map.get(key).push(s);
  };
  for (const s of rows) {
    add(byPhone, phone8(s.phone), s);
    add(byName, `${normKey(s.lastName)}|${normKey(s.firstName)}`, s);
    add(byParent, phone8(s.fatherPhone), s);
    add(byParent, phone8(s.motherPhone), s);
  }
  return { all: rows, byPhone, byName, byParent };
}

function matchStudent(db, { last, first, phone, father, mother }) {
  const p = phone8(phone);
  const nameKey = `${normKey(last)}|${normKey(first)}`;
  const firstKey = normKey(first);
  if (p) {
    const hits = db.byPhone.get(p) ?? [];
    if (hits.length === 1) return { student: hits[0], by: 'phone' };
    if (hits.length > 1) {
      const named = hits.filter((s) => normKey(s.firstName) === firstKey);
      if (named.length === 1) return { student: named[0], by: 'phone+name' };
    }
  }
  const named = db.byName.get(nameKey) ?? [];
  if (named.length === 1) return { student: named[0], by: 'name' };
  if (named.length > 1) return { conflict: `Ижил нэртэй ${named.length} сурагч` };
  for (const pp of [phone8(father), phone8(mother)]) {
    const hits = (db.byParent.get(pp) ?? []).filter((s) => normKey(s.firstName) === firstKey);
    if (hits.length === 1) return { student: hits[0], by: 'parent-phone+name' };
  }
  return null;
}

// ---------- төлөвлөгөө ----------
function buildPlan(book, db, today) {
  const report = {
    generatedAt: new Date().toISOString(),
    source: null,
    today,
    sheets: {},
    matchedBy: {},
    unmatched: [],
    conflicts: [],
    payments: { count: 0, amount: 0, byKind: {}, byMonth: {} },
    notes: 0,
    planChanges: [],
    planUnchanged: 0,
    joinedOnSet: 0,
    leftOnSet: [],
    leftButActive: [],
    fullYearSplit: { split: 0, keptMain: [] },
    dualCourse: [],
    skippedCells: [],
    overpaid: [],
    students: 0,
  };
  const perStudent = new Map(); // userId → { student, payments[], notes[], plan }
  const bucket = (s) => {
    if (!perStudent.has(s.id))
      perStudent.set(s.id, { student: s, payments: [], notes: [], plan: null, planAmount: null, start: null, sources: new Set() });
    return perStudent.get(s.id);
  };
  const resolve = (sheet, row, idx, cols) => {
    const who = {
      last: row[cols.last], first: row[cols.first], phone: row[cols.phone],
      father: row[cols.father], mother: row[cols.mother],
    };
    const label = `${normText(who.last)} ${normText(who.first)}`.trim();
    if (!label) {
      report.blankRows = (report.blankRows ?? 0) + 1; // зөвхөн № — сурагч биш
      return null;
    }
    const m = matchStudent(db, who);
    if (!m) {
      report.unmatched.push({ sheet, row: idx + 1, name: label, phone: phone8(who.phone) });
      return null;
    }
    if (m.conflict) {
      report.conflicts.push({ sheet, row: idx + 1, name: label, reason: m.conflict });
      return null;
    }
    report.matchedBy[m.by] = (report.matchedBy[m.by] ?? 0) + 1;
    return m.student;
  };
  const addNote = (b, body, promisedOn, sheet) => {
    const text = `${IMPORT_TAG} (${sheet}): ${body}`.slice(0, 4000);
    if (!b.notes.some((n) => n.body === text)) b.notes.push({ body: text, promisedOn });
  };

  // 1) Эзэн жагсаалт + «Сар бүр» (зөвхөн эзэнд байхгүй сурагч) + «Нийгэм»
  const SHEET_LABEL = { main: 'Суудал баталгаажуулалт', monthly: 'Сар бүр', social: 'Нийгэм' };
  const monthLabel = (m) => `${Number(m.slice(5, 7))}-р сарын төлбөр`;
  const cyclesOf = (row, cycles, b, sheet, rowIdx) => {
    const where = SHEET_LABEL[sheet] ?? sheet;
    for (const { month, col } of cycles) {
      const amount = row[col];
      const period = parsePeriod(row[col + 1]);
      const receipts = receiptDates(row[col + 2], today);
      if (isNum(amount) && amount > 0) {
        const kind = period.kind === 'FULL' ? 'FULL' : period.kind === 'HALF' ? 'HALF' : 'MONTH';
        b.payments.push({
          key: `${sheet}|${month}`,
          amount: Math.round(amount),
          kind,
          forMonth: period.kind === 'MONTH' ? period.month : month,
          paidOn: receipts.length ? receipts[receipts.length - 1] : null,
          receipts,
          label: kind === 'FULL' ? 'бүтэн жил' : kind === 'HALF' ? 'хагас жил' : `${monthLabel(period.kind === 'MONTH' ? period.month : month)}${period.text ? ` (${period.text})` : ''}`,
        });
        if (period.kind === 'TEXT') {
          const promised = parsePromise(period.text);
          addNote(b, `${monthLabel(month)} — ${period.text}`, promised, where);
        }
      } else if (amount != null && String(amount).trim() !== '') {
        const text = normText(amount);
        if (/^бүтэн$/i.test(text)) continue; // «бүтэн жил хамарсан» тэмдэг, гүйлгээ биш
        addNote(b, `${monthLabel(month)} — ${text}`, parsePromise(text), where);
      } else if (period.kind === 'TEXT') {
        addNote(b, `${monthLabel(month)} — ${period.text}`, parsePromise(period.text), where);
      } else if (period.kind === 'HALF') {
        addNote(b, `${monthLabel(month)} — хагас`, null, where);
      }
      // Дүнтэй атлаа баримтын огноо уншигдаагүй → paidAt хоосон, тайланд
      if (isNum(amount) && amount > 0 && row[col + 2] != null && receipts.length === 0)
        report.skippedCells.push({ sheet, row: rowIdx + 1, month, receipt: normText(row[col + 2]) });
    }
  };
  const planFromForm = (form) => {
    const f = normText(form).toLowerCase().replace(/^c/, 'с'); // латин c → кирилл с
    if (/^бүтэн$/.test(f)) return 'FULL_YEAR';
    if (/^хагас$/.test(f)) return 'INSTALLMENT';
    if (/^(сар бүр|суудал)$/.test(f)) return 'MONTHLY';
    return null;
  };

  const mainRows = book[SHEET.MAIN] ?? [];
  const mainIds = new Set();
  report.sheets[SHEET.MAIN] = 0;
  mainRows.forEach((row, i) => {
    if (i < 2 || !hasData(row)) return;
    report.sheets[SHEET.MAIN]++;
    const s = resolve(SHEET.MAIN, row, i, { last: 1, first: 2, phone: 4, father: 5, mother: 6 });
    if (!s) return;
    if (mainIds.has(s.id)) {
      report.conflicts.push({ sheet: SHEET.MAIN, row: i + 1, name: `${s.lastName} ${s.firstName}`, reason: 'Эзэн жагсаалтад давхар мөр — алгасав' });
      return;
    }
    mainIds.add(s.id);
    const b = bucket(s);
    b.sources.add('main');
    b.form = row[13];
    b.plan = planFromForm(row[13]);
    if (!b.plan && normText(row[13])) {
      const t = normText(row[13]);
      if (/ярьсан|өмнө|\d+\/\d+/.test(t)) addNote(b, `Хэлбэр — ${t}`, parsePromise(t), SHEET.MAIN);
      else report.skippedCells.push({ sheet: SHEET.MAIN, row: i + 1, form: t });
    }
    if (isIso(row[10])) b.start = row[10];
    cyclesOf(row, MAIN_CYCLES, b, 'main', i);
  });

  const monthlyRows = book[SHEET.MONTHLY] ?? [];
  report.sheets[SHEET.MONTHLY] = 0;
  monthlyRows.forEach((row, i) => {
    if (i < 2 || !hasData(row)) return;
    report.sheets[SHEET.MONTHLY]++;
    const s = resolve(SHEET.MONTHLY, row, i, { last: 1, first: 2, phone: 4, father: 5, mother: 6 });
    if (!s || mainIds.has(s.id)) return; // эзэн жагсаалт илүү шинэ
    const b = bucket(s);
    b.sources.add('monthly');
    b.plan = b.plan ?? planFromForm(row[13]) ?? 'MONTHLY';
    if (isIso(row[10])) b.start = b.start ?? row[10];
    cyclesOf(row, MAIN_CYCLES, b, 'monthly', i);
  });

  const socialRows = book[SHEET.SOCIAL] ?? [];
  report.sheets[SHEET.SOCIAL] = 0;
  socialRows.forEach((row, i) => {
    if (i < 2 || !hasData(row, 11)) return;
    report.sheets[SHEET.SOCIAL]++;
    const s = resolve(SHEET.SOCIAL, row, i, { last: 1, first: 2, phone: 4, father: 5, mother: 6 });
    if (!s) return;
    const inSocialClass = /нийгэм/i.test(s.classroomName ?? '');
    if (perStudent.has(s.id) || !inSocialClass) {
      // Нэг сурагч хоёр хичээлд: ӨС-д нэг багц, нэг ангитай тул нийгмийн
      // төлбөрийг холихгүй — эзэн шийднэ.
      const amounts = SOCIAL_CYCLES.map(({ col }) => row[col]).filter(isNum);
      report.dualCourse.push({ name: `${s.lastName} ${s.firstName}`, classroom: s.classroomName, socialAmounts: amounts });
      return;
    }
    const b = bucket(s);
    b.sources.add('social');
    b.plan = planFromForm(row[10]);
    if (isIso(row[8])) b.start = row[8];
    cyclesOf(row, SOCIAL_CYCLES, b, 'social', i);
  });

  // 2) «Бүтэн жил» — задаргаа
  const fullRows = book[SHEET.FULL] ?? [];
  report.sheets[SHEET.FULL] = 0;
  fullRows.forEach((row, i) => {
    if (i < 2 || !hasData(row)) return;
    report.sheets[SHEET.FULL]++;
    const s = resolve(SHEET.FULL, row, i, { last: 1, first: 2, phone: 4, father: 5, mother: 6 });
    if (!s) return;
    const b = perStudent.get(s.id);
    if (!b) {
      report.unmatched.push({ sheet: SHEET.FULL, row: i + 1, name: `${s.lastName} ${s.firstName}`, reason: 'Эзэн жагсаалтад байхгүй — алгасав' });
      return;
    }
    if (b.plan !== 'INSTALLMENT') b.plan = 'FULL_YEAR';
    const dep = isNum(row[9]) ? row[9] : null;
    const bal = isNum(row[11]) ? row[11] : null;
    const depDates = receiptDates(row[10], today);
    const balDates = receiptDates(row[12], today);
    if (isIso(row[11]) && !bal) {
      // Үлдэгдлийн нүдэнд огноо = үлдэгдэл төлөх өдөр
      addNote(b, `бүтэн жилийн үлдэгдэл төлөх өдөр ${row[11]}`, row[11], 'Бүтэн жил');
    }
    const fulls = b.payments.filter((p) => p.kind === 'FULL' || p.kind === 'HALF');
    const target = fulls.length === 1 ? fulls[0] : null;
    if (target && dep && bal && dep + bal === target.amount) {
      b.payments = b.payments.filter((p) => p !== target);
      b.payments.push(
        { ...target, key: `${target.key}|dep`, amount: dep, paidOn: depDates.at(-1) ?? target.paidOn, label: `${target.label} — урьдчилгаа` },
        { ...target, key: `${target.key}|bal`, amount: bal, paidOn: balDates.at(-1) ?? target.paidOn, label: `${target.label} — үлдэгдэл` },
      );
      report.fullYearSplit.split++;
    } else if (target && dep === target.amount && depDates.length) {
      target.paidOn = depDates.at(-1);
    } else if (target || dep || bal) {
      report.fullYearSplit.keptMain.push({
        name: `${s.lastName} ${s.firstName}`,
        main: fulls.map((p) => p.amount),
        deposit: row[9] ?? null,
        balance: row[11] ?? null,
        total: row[13] ?? null,
      });
    }
  });

  // 3) Амлалт («Шийт29») ба илүү төлөлт
  const promiseRows = book[SHEET.PROMISE] ?? [];
  report.sheets[SHEET.PROMISE] = 0;
  promiseRows.forEach((row, i) => {
    if (!hasData(row, 8) || !normText(row[7])) return;
    report.sheets[SHEET.PROMISE]++;
    const s = resolve(SHEET.PROMISE, row, i, { last: 0, first: 1, phone: 3, father: 4, mother: 5 });
    if (!s) return;
    const b = bucket(s);
    addNote(b, normText(row[7]), parsePromise(row[7]), 'Шийт29');
  });
  const overRows = book[SHEET.OVERPAID] ?? [];
  report.sheets[SHEET.OVERPAID] = 0;
  overRows.forEach((row, i) => {
    if (i < 1 || !hasData(row, 12) || !isNum(row[10])) return;
    report.sheets[SHEET.OVERPAID]++;
    const s = resolve(SHEET.OVERPAID, row, i, { last: 1, first: 2, phone: 4, father: 5, mother: 6 });
    if (!s) return;
    const b = bucket(s);
    const refund = isNum(row[11]) ? row[11] : null;
    const when = isIso(row[14]) ? `, огноо ${row[14]}` : '';
    addNote(b, `нийт ${row[10].toLocaleString('en-US')}₮ төлсөн${refund ? `, буцаах ${refund.toLocaleString('en-US')}₮` : ''}${when}`, null, 'Илүү төлөлт');
    report.overpaid.push({ name: `${s.lastName} ${s.firstName}`, paid: row[10], refund, date: row[14] ?? null });
  });

  // 4) Гарсан сурагчид
  const leftRows = book[SHEET.LEFT] ?? [];
  report.sheets[SHEET.LEFT] = 0;
  leftRows.forEach((row, i) => {
    if (i < 1 || !hasData(row, 12)) return;
    report.sheets[SHEET.LEFT]++;
    const s = resolve(SHEET.LEFT, row, i, { last: 1, first: 2, phone: 4, father: 5, mother: 6 });
    if (!s) return;
    const leftOn = isIso(row[11]) && isIso(row[10]) ? row[11] : null; // «Ирсэн»/«Гарсан» огноотой хэлбэр
    const entry = { name: `${s.lastName} ${s.firstName}`, classroom: s.classroomName, leftOn, inPayments: perStudent.has(s.id) };
    if (s.classroomName) report.leftButActive.push(entry);
    if (leftOn && !s.leftOn && !perStudent.get(s.id)?.payments.some((p) => p.forMonth > leftOn.slice(0, 7))) {
      bucket(s).leftOn = leftOn;
      report.leftOnSet.push(entry);
    }
  });

  // 5) Багц ба дүн
  for (const b of perStudent.values()) {
    const s = b.student;
    const hasFull = b.payments.some((p) => p.kind === 'FULL');
    const hasHalf = b.payments.some((p) => p.kind === 'HALF');
    let plan = b.plan;
    if (plan !== 'INSTALLMENT' && hasFull) plan = 'FULL_YEAR';
    if (!plan && hasHalf) plan = 'INSTALLMENT';
    if (!plan && b.payments.length) plan = 'MONTHLY';
    let amount = null;
    if (plan === 'FULL_YEAR') {
      const sum = b.payments.filter((p) => p.kind === 'FULL').reduce((t, p) => t + p.amount, 0);
      amount = sum >= 800000 ? sum : null;
    } else if (plan === 'MONTHLY') {
      const counts = new Map();
      for (const p of b.payments)
        if (p.kind === 'MONTH' && p.amount >= 100000 && p.amount < 800000 && p.forMonth >= '2026-09')
          counts.set(p.amount, (counts.get(p.amount) ?? 0) + 1);
      amount = [...counts.entries()].sort((a, z) => z[1] - a[1] || z[0] - a[0])[0]?.[0] ?? null;
    }
    b.resolvedPlan = plan;
    b.resolvedAmount = amount;
    if (plan && (plan !== s.plan || (amount != null && amount !== s.tuitionAmount))) {
      report.planChanges.push({
        name: `${s.lastName} ${s.firstName}`,
        before: { plan: s.plan, amount: s.tuitionAmount },
        after: { plan, amount: amount ?? s.tuitionAmount },
      });
    } else if (plan) report.planUnchanged++;
    if (!s.joinedOn && b.start) report.joinedOnSet++;
    for (const p of b.payments) {
      report.payments.count++;
      report.payments.amount += p.amount;
      report.payments.byKind[p.kind] = (report.payments.byKind[p.kind] ?? 0) + 1;
      report.payments.byMonth[p.forMonth] = (report.payments.byMonth[p.forMonth] ?? 0) + p.amount;
    }
    report.notes += b.notes.length;
  }
  report.students = perStudent.size;
  return { perStudent, report };
}

// ---------- бичих ----------
async function commitPlan(client, perStudent, actorId, notedAt) {
  const stats = { paymentsInserted: 0, paymentsExisting: 0, notesInserted: 0, notesExisting: 0, profilesUpdated: 0 };
  await client.query('BEGIN');
  try {
    for (const b of perStudent.values()) {
      const s = b.student;
      for (const p of b.payments) {
        const reqId = stableUuid('import-payments-2027', s.id, p.key);
        const paidAt = p.paidOn ? `${p.paidOn}T04:00:00Z` : null; // УБ 12:00
        const desc = `${IMPORT_TAG}: ${p.label}${p.receipts.length > 1 ? ` — ${p.receipts.length} гүйлгээ` : ''}`;
        const r = await client.query(
          `INSERT INTO "Payment" (id, "userId", amount, method, status, description, "forMonth", "paidAt",
             "confirmedById", "clientRequestId", "createdAt")
           VALUES ($1, $2, $3, 'BANK_TRANSFER', 'CONFIRMED', $4, $5, $6, $7, $8, now())
           ON CONFLICT ("userId", "clientRequestId") DO NOTHING`,
          [`imp${crypto.randomBytes(11).toString('hex')}`, s.id, p.amount, desc, p.forMonth, paidAt, actorId, reqId],
        );
        if (r.rowCount) stats.paymentsInserted++;
        else stats.paymentsExisting++;
      }
      for (const n of b.notes) {
        const dup = await client.query(
          `SELECT 1 FROM "StudentNote" WHERE "studentId" = $1 AND type = 'PAYMENT' AND body = $2 LIMIT 1`,
          [s.id, n.body],
        );
        if (dup.rowCount) {
          stats.notesExisting++;
          continue;
        }
        await client.query(
          `INSERT INTO "StudentNote" (id, "studentId", type, body, "createdById", "createdAt", "updatedAt", "promisedOn")
           VALUES ($1, $2, 'PAYMENT', $3, $4, $6, now(), $5)`,
          [`imn${crypto.randomBytes(11).toString('hex')}`, s.id, n.body, actorId, n.promisedOn, notedAt],
        );
        stats.notesInserted++;
      }
      const sets = [];
      const vals = [s.id];
      if (b.resolvedPlan && b.resolvedPlan !== s.plan) {
        vals.push(b.resolvedPlan);
        sets.push(`"tuitionPlan" = $${vals.length}::"TuitionPlan"`);
      }
      if (b.resolvedAmount != null && b.resolvedAmount !== s.tuitionAmount) {
        vals.push(b.resolvedAmount);
        sets.push(`"tuitionAmount" = $${vals.length}`);
      }
      if (!s.joinedOn && b.start) {
        vals.push(b.start);
        sets.push(`"joinedOn" = $${vals.length}::date`);
      }
      if (!s.leftOn && b.leftOn) {
        vals.push(b.leftOn);
        sets.push(`"leftOn" = $${vals.length}::date`);
      }
      if (sets.length) {
        await client.query(`UPDATE "StudentProfile" SET ${sets.join(', ')} WHERE "userId" = $1`, vals);
        stats.profilesUpdated++;
      }
    }
    await client.query(
      `INSERT INTO "AuditLog" (id, "actorId", "actorRole", action, entity, "entityId", after, reason, at)
       VALUES ($1, $2, 'ADMIN', 'IMPORT', 'Payment', 'import-payments-2027', $3, $4, now())`,
      [`ima${crypto.randomBytes(11).toString('hex')}`, actorId, JSON.stringify(stats), 'Excel 2027 төлбөрийн импорт'],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
  return stats;
}

function printSummary(r) {
  const mnt = (n) => `${Math.round(n).toLocaleString('en-US')}₮`;
  console.log('=== Төлбөрийн импорт (2027) ===');
  console.log('Хуудас (мөр):', JSON.stringify(r.sheets));
  console.log('Тааруулсан арга:', JSON.stringify(r.matchedBy));
  console.log(`Сурагч: ${r.students}`);
  console.log(`Гүйлгээ: ${r.payments.count} (${mnt(r.payments.amount)}) — ${JSON.stringify(r.payments.byKind)}`);
  console.log('Сараар:', Object.entries(r.payments.byMonth).sort().map(([m, a]) => `${m}: ${mnt(a)}`).join(', '));
  console.log(`Тэмдэглэл: ${r.notes}`);
  console.log(`Багц өөрчлөх: ${r.planChanges.length}, өөрчлөлтгүй: ${r.planUnchanged}, joinedOn тавих: ${r.joinedOnSet}`);
  console.log(`Бүтэн жил задалсан: ${r.fullYearSplit.split}, эзэн дүнгээр үлдээсэн: ${r.fullYearSplit.keptMain.length}`);
  console.log(`Тааруулж чадаагүй: ${r.unmatched.length}, зөрчил: ${r.conflicts.length}, хоёр хичээлтэй: ${r.dualCourse.length}`);
  console.log(`Гарсан (Excel) ч ангид идэвхтэй: ${r.leftButActive.length}, leftOn тавих: ${r.leftOnSet.length}`);
  console.log(`Алгассан нүд: ${r.skippedCells.length}`);
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (p) => args.find((a) => a.startsWith(p))?.slice(p.length);
  const source = arg('--source=') ?? DEFAULT_SOURCE;
  const reportPath = arg('--report=') ?? DEFAULT_REPORT;
  const commit = args.includes('--commit');
  const today = arg('--today=') ?? new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const book = readWorkbook(source);
    const db = await loadStudents(client);
    const { perStudent, report } = buildPlan(book, db, today);
    report.source = path.basename(source);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    printSummary(report);
    console.log(`\nТайлан: ${reportPath} (PII — git-д оруулахгүй)`);
    if (!commit) {
      console.log('\n(dry-run — ӨС-д юу ч бичээгүй. Бичихийн тулд --commit)');
      return;
    }
    const admin = await client.query(
      `SELECT id FROM "User" WHERE role = 'ADMIN' AND "archivedAt" IS NULL ORDER BY "createdAt" LIMIT 1`,
    );
    if (!admin.rowCount) throw new Error('Идэвхтэй ADMIN хэрэглэгч олдсонгүй');
    // Импортын тэмдэглэлийн огноо = Excel файлын хадгалсан өдөр (амлалт
    // «тасарсан» эсэхийг тэр өдрөөс хойшхи төлбөрөөр шалгана).
    const notedAt = new Date(fs.statSync(source).mtime.getTime() + 8 * 3600_000).toISOString().slice(0, 10) + 'T04:00:00Z';
    const stats = await commitPlan(client, perStudent, admin.rows[0].id, notedAt);
    console.log('\n=== --commit ===');
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await client.end();
  }
}

module.exports = { readWorkbook, loadStudents, buildPlan, parsePeriod, parsePromise, receiptDates, stableUuid, matchStudent };

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
