#!/usr/bin/env node
/**
 * Сурагчийн бодит бүртгэлийг Excel-ээс (БҮРТГЭЛ-2027-1 (2).xlsx) уншиж платформ
 * руу оруулах скрипт.
 *
 * ФАЙЛЫН БҮТЭЦ (2026-09-26, ~700 сурагч):
 *  - Импортлох хуудас: «12-р анги», «11-р анги», «9,10-р анги» (LAYOUT_MAIN) ба
 *    «Нийгэм» (LAYOUT_SOCIAL — с.т анги баганагүй). Header-ийг assertLayout шалгана.
 *  - «Код» хуудас: 12-р ангийн сурагчийн 7 оронтой код (2027001…2027486).
 *  - Нэг утас хоёр хуудсанд (математик + нийгэм), нэр ижил → нэг сурагч, 2 хичээл.
 *
 * ЭЗНИЙ ШИЙДВЭР (2026-09-26): Excel-ийн 7 оронтой кодыг ХАДГАЛНА — системийн
 *  B27… формат руу ШИЛЖҮҮЛЭХГҮЙ (backfill-new-codes.cjs-ийг прод дээр бүү ажиллуул).
 *  Код: «Код» хуудаснаас утсаар → нэрээр → үлдсэнд 2027487-оос үргэлжлүүлнэ.
 *  --commit үед байгаа сурагчийн кодыг Excel-ийнхээр СОЛИНО; DB-д өөр хүнд
 *  эзэмшигдсэн Excel код → codeConflicts (дарж бичихгүй).
 *
 * ЗААВАЛ УНШИХ:
 *  - Анхдагчаар ЗӨВХӨН --dry-run горимд ажиллана (DATA ХАДГАЛАХГҮЙ). --commit
 *    дамжуулсан үед л бодит бичилт хийнэ. Санамсаргүй давхар ажиллуулснаас
 *    бодит бүртгэлтэй хүүхдийн бүртгэл давхардахаас сэргийлнэ.
 *  - ИДЕМПОТЕНТ: --commit-ийг дахин ажиллуулахад ижил сурагчийг дахин
 *    үүсгэхгүй (утсаар, эсвэл нэр+овгоор давхцлыг шалгана) — ХАРИН аль
 *    хэдийн байгаа сурагчийн StudentProfile-ийг ЭНРИЧ (upsert) хийнэ, учир
 *    нь энэ скриптийн 2 дахь давхар зорилго нь өмнө нь type/grade/school-оос
 *    цааш алдагдсан талбаруудыг (доор) НӨХӨЖ бичих явдал.
 *
 * xlsx/exceljs НОДЫН ПАКЕТ БАЙХГҮЙ ТАЛААР:
 *  api/package.json-д ЗӨВХӨН нэг npm script нэмэхийг зөвшөөрсөн тул шинэ
 *  dependency (xlsx/exceljs) нэмэх боломжгүй. Оронд нь "баримтжуулсан
 *  урьдчилсан алхам" сонголтыг ашиглав: энэ машин дээр аль хэдийн суусан
 *  python3 + openpyxl (`python3 -c "import openpyxl"` OK шалгасан) ашиглан
 *  workbook-ийг уншина (readWorkbookViaPython). python3/openpyxl байхгүй орчинд
 *  ажиллуулбал доор тодорхой алдааны мессежтэйгээр зогсоно — coerce хийхгүй.
 *
 * ТӨЛБӨР, САЛБАР, АЛБАН ЭЦЭГ ЭХИЙН УТАС — ОДОО DB-Д ХАДГАЛАГДДАГ:
 *  Өмнөх давхар ажиллагаанд (359 сурагч импортлогдсон үед) StudentProfile-д
 *  эдгээр талбар байгаагүй тул алгаслагдаж зөвхөн report-д тэмдэглэгдэж
 *  байсан. Энэ wave-д өөр agent StudentProfile-д fatherPhone/motherPhone/
 *  guardianNote/branch/section/tuitionAmount/tuitionPlan/tuitionNote/
 *  joinedOn/leftOn баганууд нэмсэн тул ЭНЭ скрипт эдгээрийг:
 *   - шинэ сурагч үүсгэх үед create-ээр,
 *   - аль хэдийн байгаа сурагчийн хувьд studentProfile.upsert-ийн update-ээр
 *  бичдэг болгов (commitImportPlan-ийн enrichmentData харна уу). Классрумын
 *  нэрэнд салбарыг шингээх хуучин "12-1 (Баруун 4)" хандлагыг ХЭВЭЭР үлдээв
 *  (branch багана нэмэгдсэн ч Classroom.name-ийг өөрчлөх нь энэ скриптийн
 *  хамрах хүрээнээс гадуур, учир нь классрум аль хэдийн үүссэн).
 *
 * ЭЦЭГ ЭХИЙН УТАС БА ParentLink ТАЛААР (Шийдвэр — comment-оор тайлбарлав):
 *  Даалгаварт "ParentLink records ONLY where a parent phone exists" болон
 *  "Do NOT auto-create parent User accounts" гэсэн хоёр заалт зэрэг өгөгдсөн.
 *  Гэвч prisma/schema.prisma-ийн ParentLink.parentId бол ХООСОН БИШ, бодит
 *  User мөр рүү заасан заавал холбоос (FK) тул үнэн хэрэгтээ эцэг эх User
 *  байхгүйгээр ParentLink үүсгэх боломжгүй (schema зөрчинө). Иймд аюулгүй
 *  байдлыг эрхэмлэж БИД ParentLink ОГТ ҮҮСГЭХГҮЙ (magadgүй нууц үгтэй эцэг
 *  эхийн бүртгэл зохиомлоор үүсгэхээс зайлсхийх зарчмыг дагав). Аав/ээжийн
 *  утсыг ОДОО StudentProfile.fatherPhone/motherPhone-д ХАДГАЛНА (дээрх wave-ийн
 *  шинэ баганууд) — гэхдээ ParentLink/эцэг эхийн User бүртгэл ХЭВЭЭР ҮҮСГЭХГҮЙ,
 *  ажилтан үүнийг үзээд эцэг эхийг өөрсдөөр нь бодит бүртгэл нээлгэхийг
 *  урина (invite), таамгаар нууц үг зохиохгүй.
 *
 * StudentProfile.grade vs Classroom.grade:
 *  "13-1"/"13-3" гэдэг нь бодит 13-р анги биш — 12-р ангийн сурагчдын нэг
 *  бүлгийн ДОТООД ДУГААРЛАЛТ (I багана: с.т анги). Хэрэв Classroom.grade-д
 *  дугаарыг шууд хадгалахад (13) асуудалгүй (зөвхөн ангийн бүлгийн шошго),
 *  харин StudentProfile.grade нь агуулгын эрх/шүүлтэд ашиглагддаг бодит
 *  анги тул ЗААВАЛ анги баганаас гаргасан бодит утга (12/11/10/9) байна.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_SOURCE = '/Users/mr.buus/Downloads/БҮРТГЭЛ-2027-1 (2).xlsx';
const DEFAULT_REPORT = path.join(__dirname, 'reports', 'student-import.json');

// ---------- Хуудас ба баганын бүтэц ----------
// 2026-09-26: эзний шинэ бүртгэл (БҮРТГЭЛ-2027-1 (2).xlsx) — өмнөхөөс ялгаа:
//  - Үндсэн 3 хуудасны баганууд НЭГ байрлал ЗҮҮН тийш шилжсэн (хуучин 9-р
//    «утга тодорхойгүй» багана алга болсон). Хуучин индексээр уншвал төлбөрийг
//    огноо, салбарыг «Шинэ/Хуучин» гэж андуурна → header-ийг ЗААВАЛ шалгана.
//  - 13-р баганад багшийн үнэлгээ «муу / дунд / сайн» нэмэгдсэн.
//  - «Нийгэм» хуудас нэмэгдсэн (с.т анги багана байхгүй → бүх багана дахин 1 зүүн).
//  - «Код» хуудас: сурагч бүрийн 7 оронтой код (2027001…). ЭЗНИЙ ШИЙДВЭР:
//    Excel-ийн кодыг ХАДГАЛНА (системийн B27… форматаар солихгүй).
const LAYOUT_MAIN = {
  NO: 0, LAST: 1, FIRST: 2, ANGI: 3, STUDENT_PHONE: 4, FATHER_PHONE: 5, MOTHER_PHONE: 6,
  SCHOOL: 7, SECTION: 8, JOINED_RAW: 9, TUITION: 10, STATUS: 11, BRANCH: 12, LEVEL: 13,
  headerCheck: { 10: /^төлбөр$/i, 12: /нэмэлт тайлбар/i },
};
const LAYOUT_SOCIAL = {
  NO: 0, LAST: 1, FIRST: 2, ANGI: 3, STUDENT_PHONE: 4, FATHER_PHONE: 5, MOTHER_PHONE: 6,
  SCHOOL: 7, SECTION: null, JOINED_RAW: 8, TUITION: 9, STATUS: 10, BRANCH: 11, LEVEL: null,
  headerCheck: { 9: /^төлбөр$/i, 11: /нэмэлт тайлбар/i },
};
const SHEET_CONFIGS = [
  { name: '12-р анги', expectedGrades: [12], layout: LAYOUT_MAIN, subject: 'Математик' },
  { name: '11-р анги', expectedGrades: [11], layout: LAYOUT_MAIN, subject: 'Математик' },
  { name: '9,10-р анги', expectedGrades: [9, 10], layout: LAYOUT_MAIN, subject: 'Математик' },
  { name: 'Нийгэм', expectedGrades: [12], layout: LAYOUT_SOCIAL, subject: 'Нийгэм' },
];
// Кодын хуудас: сурагч импортлохгүй, зөвхөн утас/нэрээр код хайх лавлах.
const CODE_SHEET = { name: 'Код', LAST: 1, FIRST: 2, STUDENT_PHONE: 4, CODE: 13, headerCheck: { 13: /^код$/i } };
const CODE_RE = /^\d{7}$/;
const OUT_OF_SCOPE_SHEETS = [
  { name: 'Код', reason: 'Сурагчийн 7 оронтой кодын лавлах — импортлохгүй, код хайхад ашиглана.' },
  {
    name: 'ГАРСАН',
    reason:
      'Гарсан сурагчид — идэвхтэй бүртгэлд орохгүй. Ирсэн/гарсан огноо, буцаах төлбөр, данс ' +
      'агуулдаг тул дараа нь буцаалтын модульд (G06) ашиглаж болно.',
  },
  { name: 'Sheet2', reason: 'Хичээлийн хуваарь (цаг, анги, онол, багш), сурагчийн бүртгэл биш.' },
  {
    name: 'Цалингийн хүснэгт',
    reason: 'Ажилтны цалингийн хүснэгт, сурагчийн бүртгэлтэй хамааралгүй.',
  },
];
const LEVEL_RE = /^(муу|дунд|сайн)$/i;

const VALID_SECTION_RE = /^(9|10|11|12|13)-\d+$/;
// «12-р анни» гэх мэт бичгийн алдааг зөвшөөрнө (ан… гэж эхэлбэл анги)
const ANGI_RE = /^(\d{1,2})-р\s*ан/u;
const BRANCH_RE = /баруун|зүүн/i;
const PHONE_RE = /^\d{8}$/;
const NUMERIC_TEXT_RE = /^[\d.,\s]+$/;

// Бүртгэлийн огнооны багана (COL.JOINED_RAW) ЗӨВХӨН сар/өдөр агуулдаг, жил
// орхигдсон. Жилийг ХАРААС ТААМАГЛАХГҮЙ БИШ, гэхдээ баримтжуулсан үндэслэлтэй
// тогтооно: эх файлын нэр "БҮРТГЭЛ-2027-1" нь 2026-2027 хичээлийн жилийн
// бүртгэл бөгөөд огдоонуудын хүрээ (6–9 сар) яг тэр хичээлийн жил эхлэхийн
// (9-р сар) өмнөх зуны элсэлтийн үетэй давхцана — өөрөөр хэлбэл 2026 он.
// Хэрэв ирээдүйд өөр элсэлтийн бүртгэлд ашиглах бол энэ утгыг шинэчлэх ёстой.
const REGISTRATION_YEAR = 2026;

// ---------- Excel уншилт (python3 + openpyxl-ээр, нэмэлт npm dependency-гүй) ----------

const PYTHON_READ_SCRIPT = `
import json, sys, warnings
warnings.filterwarnings("ignore")
import openpyxl

path = sys.argv[1]
sheet_names = sys.argv[2:]
wb = openpyxl.load_workbook(path, data_only=True, read_only=True)

out = {}
for name in sheet_names:
    if name not in wb.sheetnames:
        out[name] = None
        continue
    ws = wb[name]
    rows = []
    for row in ws.iter_rows(min_row=1, max_col=16):
        cells = []
        for cell in row:
            value = getattr(cell, "value", None)
            dtype = getattr(cell, "data_type", None)
            cells.append([value, dtype])
        rows.append(cells)
    out[name] = rows

print(json.dumps(out, default=str, ensure_ascii=False))
`;

function readWorkbookViaPython(sourcePath, sheetNames) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Эх Excel файл олдсонгүй: ${sourcePath}`);
  }
  let stdout;
  try {
    stdout = execFileSync(
      'python3',
      ['-c', PYTHON_READ_SCRIPT, sourcePath, ...sheetNames],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
    );
  } catch (error) {
    throw new Error(
      'Excel уншиж чадсангүй — python3 + openpyxl шаардлагатай ("документчлагдсан урьдчилсан алхам", ' +
        'учир нь api/package.json-д зөвхөн нэг npm script нэмэхийг зөвшөөрсөн тул xlsx/exceljs дараа ' +
        `суулгах боломжгүй байсан). Дэлгэрэнгүй: ${error.message}`,
    );
  }
  return JSON.parse(stdout);
}

// ---------- Туслах функцууд ----------

function normText(value) {
  if (value === null || value === undefined) return '';
  return String(value).normalize('NFC').replace(/\s+/g, ' ').trim();
}

function normKey(value) {
  return normText(value).toLowerCase();
}

function normalizePhone(rawValue) {
  if (rawValue === null || rawValue === undefined) return { value: null, raw: rawValue };
  const digits = String(rawValue).trim();
  if (PHONE_RE.test(digits)) return { value: digits, raw: rawValue };
  return { value: null, raw: rawValue };
}

function maskPhone(phone) {
  if (!phone) return null;
  const s = String(phone);
  return s.length >= 4 ? `${s.slice(0, 4)}****` : '****';
}

function normalizeBranch(rawValue) {
  const text = normText(rawValue);
  if (!text) return null;
  if (!BRANCH_RE.test(text)) return null;
  return /баруун/i.test(text) ? 'Баруун 4' : 'Зүүн 4';
}

// COL.BRANCH баганад "Баруун 4"/"Зүүн 4" эсвэл чөлөөт тэмдэглэл (ж: "50к
// шилжүүлнэ", "Намар нэг мөсөн үлдсэнийг Бүтнээр нь хийе") аль аль нь
// байж болно (баталгаажуулсан: header "нэмэлт тайлбар", мержсэн cell биш,
// зүгээр л нэг баганад хоёр төрлийн мэдээлэл холилдож бичигдсэн). Салбарын
// нэр танигдвал branch болгож, үгүй бол чөлөөт тэмдэглэлийг tuitionNote руу
// нийлүүлнэ (ихэнх нь төлбөртэй холбоотой агуулгатай тул).
function normalizeNoteOrBranch(rawValue) {
  const text = normText(rawValue);
  if (!text) return { branch: null, extraNote: null };
  if (BRANCH_RE.test(text)) {
    return { branch: /баруун/i.test(text) ? 'Баруун 4' : 'Зүүн 4', extraNote: null };
  }
  return { branch: null, extraNote: text };
}

// "Шинэ"/"Хуучин" (COL.STATUS) — сурагчийн элсэлтийн төлөв. Үүнд зориулсан
// тусгай StudentProfile багана байхгүй тул guardianNote-д ЭХ УТГЫГ
// АЛДАГДУУЛАЛГҮЙ, тодорхой шошготойгоор хадгална (таамаглаж өөр утга зохиохгүй).
function normalizeEnrollmentStatusNote(rawValue) {
  const text = normText(rawValue);
  if (!text) return null;
  if (/^шинэ$/i.test(text)) return 'Элссэн төлөв (эх бүртгэлээс): Шинэ сурагч';
  if (/^хуучин$/i.test(text)) return 'Элссэн төлөв (эх бүртгэлээс): Хуучин сурагч';
  return `Элссэн төлөв (эх бүртгэлээс): ${text}`;
}

// COL.JOINED_RAW: "6/8", "07/20" гэх мэт сар/өдөр (жилгүй). REGISTRATION_YEAR-ийг
// (дээр тайлбарласан) ашиглан ISO огноо (YYYY-MM-DD) болгоно. Танихгүй формат
// эсвэл хүчингүй сар/өдөр бол ТААМАГЛАХГҮЙ — null.
function parseJoinedOn(rawValue) {
  const text = normText(rawValue);
  if (!text) return { value: null, raw: null };
  const match = text.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return { value: null, raw: text };
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return { value: null, raw: text };
  const iso = `${REGISTRATION_YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { value: iso, raw: text };
}

// COL.TUITION-ийн "raw" утгаас бодит тоон дүнг гаргаж авна.
//  - NUMERIC: Excel-д тоон нүд ('n' data_type) — шууд тоо.
//  - TEXT_NUMERIC: "350.000"/"300,000" маягийн текст — цэг/таслалыг зайлуулж
//    бүхэл тоо болгоно ("350.000" → 350000).
//  - EMPTY/NOTE: дүн тодорхойгүй → null (tuitionNote-оор дамжина).
function parseTuitionAmount(tuition) {
  if (tuition.status === 'NUMERIC') {
    const n = Math.round(Number(tuition.raw));
    return Number.isFinite(n) ? n : null;
  }
  if (tuition.status === 'TEXT_NUMERIC') {
    const digits = String(tuition.raw).replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : null;
  }
  return null;
}

// Даалгаварт баримтжуулсан бодит үнийн дүн → төлбөрийн төлөвлөгөө (web/src/lib/orgInfo.ts,
// TUITION мөрдлөгөтэй яг тохирно):
//   2,500,000 эсвэл 2,000,000 → FULL_YEAR
//   3,000,000 эсвэл 2,500,000 → INSTALLMENT
//   350,000 эсвэл 300,000     → MONTHLY
//   бусад/хоосон              → UNKNOWN
// 2,500,000 ХОЁР ТАЛДАА (12-р ангийн FULL_YEAR ба 9-11-р ангийн INSTALLMENT)
// давхцдаг цорын ганц дүн тул ЗӨВХӨН үүнийг сурагчийн БОДИТ ангиар
// (StudentProfile.grade — COL.ANGI-ээс гарсан утга, section-ийн шошгоос БИШ)
// ялгана: grade===12 → FULL_YEAR, grade∈{9,10,11} → INSTALLMENT, бусад
// тохиолдолд ЗААВАЛ таамаглахгүй тул UNKNOWN.
function mapTuitionAmountToPlan(amount, grade) {
  if (amount == null) return 'UNKNOWN';
  switch (amount) {
    case 2_000_000:
      return 'FULL_YEAR';
    case 3_000_000:
      return 'INSTALLMENT';
    case 350_000:
    case 300_000:
      return 'MONTHLY';
    case 2_500_000:
      if (grade === 12) return 'FULL_YEAR';
      if (grade === 9 || grade === 10 || grade === 11) return 'INSTALLMENT';
      return 'UNKNOWN';
    default:
      return 'UNKNOWN';
  }
}

function classifyTuition(cell) {
  const [value, dtype] = cell ?? [null, null];
  if (value === null || value === undefined || value === '') {
    return { status: 'EMPTY', raw: null };
  }
  if (dtype === 'n' || typeof value === 'number') {
    return { status: 'NUMERIC', raw: value };
  }
  const text = String(value).trim();
  if (NUMERIC_TEXT_RE.test(text)) {
    return { status: 'TEXT_NUMERIC', raw: value };
  }
  return { status: 'NOTE', raw: value };
}

function cellValue(row, idx) {
  const cell = row[idx];
  return cell ? cell[0] : null;
}
function cellPair(row, idx) {
  return row[idx] ?? [null, null];
}

// Header мөрийг хүлээгдэж буй бүтэцтэй тулгана — багана шилжсэн бол ЗОГСОНО.
function assertLayout(sheetName, headerRow, headerCheck) {
  for (const [idx, re] of Object.entries(headerCheck)) {
    const text = normText(headerRow?.[Number(idx)]?.[0]);
    if (!re.test(text)) {
      throw new Error(
        `«${sheetName}» хуудасны ${Number(idx) + 1}-р баганын гарчиг «${text}» байна, ` +
          `хүлээгдэж буй: ${re}. Excel-ийн баганын бүтэц өөрчлөгдсөн байж магадгүй — ` +
          'LAYOUT_* тохиргоог шалгаж засна уу (таамаглаж уншихгүй).',
      );
    }
  }
}

// «Код» хуудаснаас утас → код, овог|нэр → код лавлах үүсгэнэ.
function buildCodeLookup(rows, report) {
  const byPhone = new Map();
  const byName = new Map();
  const nameCount = new Map();
  let maxCode = 0;
  if (!rows) {
    report.codeSheet = { found: false };
    return { byPhone, byName, maxCode };
  }
  assertLayout(CODE_SHEET.name, rows[0], CODE_SHEET.headerCheck);
  let total = 0;
  let invalid = 0;
  let duplicatePhones = 0;
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const last = normText(cellValue(row, CODE_SHEET.LAST));
    const first = normText(cellValue(row, CODE_SHEET.FIRST));
    if (!last && !first) continue;
    const code = normText(cellValue(row, CODE_SHEET.CODE));
    if (!CODE_RE.test(code)) {
      invalid += 1;
      continue;
    }
    total += 1;
    maxCode = Math.max(maxCode, Number(code));
    const phone = normalizePhone(cellValue(row, CODE_SHEET.STUDENT_PHONE)).value;
    // Нэг утас хэд хэдэн мөрөнд (давхар мөр эсвэл ах дүү) — бүгдийг хадгална.
    if (phone) {
      if (!byPhone.has(phone)) byPhone.set(phone, []);
      else duplicatePhones += 1;
      byPhone.get(phone).push({ code, first: normKey(first) });
    }
    const nk = `${normKey(last)}|${normKey(first)}`;
    nameCount.set(nk, (nameCount.get(nk) ?? 0) + 1);
    byName.set(nk, code);
  }
  // Ижил нэртэй хоёр сурагч бол нэрээр тааруулахгүй (буруу хүнд код өгөхгүй).
  for (const [nk, n] of nameCount) if (n > 1) byName.delete(nk);
  report.codeSheet = { found: true, codes: total, invalidRows: invalid, duplicatePhones, maxCode };
  return { byPhone, byName, maxCode };
}

// ---------- Мөр бүрийг шалгаж, "planned" эсвэл "skipped" болгох ----------

function buildImportPlan(sourcePath) {
  const sheetNames = SHEET_CONFIGS.map((s) => s.name);
  const workbook = readWorkbookViaPython(sourcePath, [...sheetNames, CODE_SHEET.name]);

  const report = {
    meta: {
      source: sourcePath,
      generatedAt: new Date().toISOString(),
    },
    sheetsProcessed: sheetNames,
    sheetsSkippedEntirely: OUT_OF_SCOPE_SHEETS,
    totals: {
      rowsSeen: 0,
      planned: 0,
      skipped: 0,
      skippedByReason: {},
      tuition: { EMPTY: 0, NUMERIC: 0, TEXT_NUMERIC: 0, NOTE: 0 },
      tuitionPlan: { FULL_YEAR: 0, INSTALLMENT: 0, MONTHLY: 0, UNKNOWN: 0 },
      branch: { valid: 0, missingOrGarbage: 0 },
      joinedOnParsed: 0,
      joinedOnUnparseable: 0,
      duplicateInSource: 0,
      mergedAcrossSheets: 0,
      phoneConflicts: 0,
      level: { муу: 0, дунд: 0, сайн: 0 },
      codes: { fromExcelByPhone: 0, fromExcelByName: 0, generated: 0 },
    },
    sectionCapacityWarnings: [],
    skippedRows: [],
    tuitionIssues: [], // TEXT_NUMERIC / NOTE дэлгэрэнгүй — staff-д харагдана
    plannedStudents: [],
  };

  const seenKeys = new Map(); // key -> plannedStudent (давхардал илрүүлэхэд)
  const phoneOwner = new Map(); // studentPhone -> key (зөрчил илрүүлэхэд)
  const classroomGroups = new Map(); // "grade|section" -> { grade, section, students:[], branchVotes:Map }
  const plannedByPhone = new Map(); // studentPhone -> planned (хуудас хоорондын нэгтгэлд)
  const codeLookup = buildCodeLookup(workbook[CODE_SHEET.name], report);
  const usedCodes = new Set();
  const codeCandidates = []; // { planned, phone } — Excel-ийн (зөрчилтэй ч) утсаар код хайна

  for (const config of SHEET_CONFIGS) {
    const rows = workbook[config.name];
    if (!rows) {
      report.skippedRows.push({
        sheet: config.name,
        row: null,
        reasons: ['SHEET_NOT_FOUND'],
      });
      continue;
    }

    const COL = config.layout;
    assertLayout(config.name, rows[0], COL.headerCheck);
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const rowNum = i + 1; // 1-based Excel мөрийн дугаар
      const lastNameRaw = cellValue(row, COL.LAST);
      const firstNameRaw = cellValue(row, COL.FIRST);
      const lastName = normText(lastNameRaw);
      const firstName = normText(firstNameRaw);

      if (!lastName && !firstName) continue; // бүрэн хоосон мөр — сурагч биш

      report.totals.rowsSeen += 1;
      // reasons  = ХАТУУ зөрчил → мөрийг импортлохгүй (сурагчийг сэргээх
      //            боломжгүй, таамаглахаас татгалзана)
      // fixes    = ЗАЛРУУЛГА → сурагч бодитой оршдог, зөвхөн эх файлын
      //            бичилт эмх замбараагүй. Импортлоод залруулгыг тэмдэглэнэ.
      // ЯАГААД ЭНЭ ЯЛГАА ЧУХАЛ ВЭ: бүх зөрчлийг алгасвал 359-аас 52 бодит
      // сурагч (14%) системд ОРОХГҮЙ үлдэнэ. Тэд ангид сууж, төлбөр төлж
      // байгаа хүмүүс — Excel-ийн бичилтийн алдааны улмаас алга болох ёсгүй.
      const reasons = [];
      const fixes = [];

      if (!lastName || !firstName) {
        reasons.push('NAME_INCOMPLETE');
      }

      // Анги баганыг тухайн хуудасны хүлээгдэж буй ангитай тулгана (13 + 4
      // мөрийн мэдэгдэж буй зөрүүг ЕРӨНХИЙ дүрмээр барина — зөвхөн тэр
      // тоонуудыг hardcode хийхгүй, ямар ч ижил төрлийн зөрүүг илрүүлнэ).
      const angiRaw = cellValue(row, COL.ANGI);
      const angiText = normText(angiRaw);
      const angiMatch = angiText.match(ANGI_RE);
      let angiGrade = angiMatch ? Number(angiMatch[1]) : null;
      if (!angiGrade && /^төгссөн$/i.test(angiText) && config.expectedGrades.length === 1) {
        // ЗАЛРУУЛГА: сургуулиа төгссөн ч ЭЕШ-д дахин бэлдэж буй сурагч — хуудасны
        // ганц анги (12) руу оруулна (контентын эрх 12-р ангийнхтай ижил).
        angiGrade = config.expectedGrades[0];
        fixes.push(`GRADUATE(анги='${angiText}' → ${angiGrade}-р анги, хуудас=${config.name})`);
      } else if (!angiGrade) {
        // Анги огт уншигдахгүй бол сурагчийг ямар ангид оруулахаа мэдэхгүй
        // — энэ бол жинхэнэ хатуу зөрчил.
        reasons.push('GRADE_COLUMN_UNPARSEABLE');
      } else if (!config.expectedGrades.includes(angiGrade)) {
        // ЗАЛРУУЛГА: сурагч "12-р анги" хуудсанд бичигдсэн ч 'анги' багана
        // нь 11 гэж хэлж байна. `анги` БАГАНА нь хуудасны нэрээс илүү
        // найдвартай (хуудас бол зөвхөн эмхэтгэлийн арга). Баганы утгыг
        // ашиглана — доорх `const grade = angiGrade` аль хэдийн үүнийг хийдэг.
        fixes.push(
          `GRADE_FROM_COLUMN(хуудас=${config.name}, анги='${angiText}' → ${angiGrade}-р анги)`,
        );
      }

      const sectionRaw = COL.SECTION === null ? null : cellValue(row, COL.SECTION);
      const sectionText = normText(sectionRaw);
      const sectionValid = VALID_SECTION_RE.test(sectionText);
      if (!sectionValid) {
        // ЗАЛРУУЛГА: секц хоосон эсвэл 'ЗУН'/'орой'/'хүлээх' гэх мэт бодит
        // секц биш утгатай. Сурагч оршдог — зүгээр бүлэгт хуваарилагдаагүй.
        // Платформд "хуваарилагдаагүй сурагч" гэсэн ойлголт байдаг
        // (TeacherDashboard/UnassignedStudentsSection.tsx) — тийш нь оруулна.
        // Enrollment үүсгэхгүй, багш дараа нь ангид хуваарилна.
        fixes.push(
          COL.SECTION === null
            ? `UNASSIGNED(${config.name} хуудсанд с.т анги багана байхгүй)`
            : `UNASSIGNED(с.т анги='${sectionText || '(хоосон)'}')`,
        );
      }

      const studentPhoneNorm = normalizePhone(cellValue(row, COL.STUDENT_PHONE));
      const fatherPhoneNorm = normalizePhone(cellValue(row, COL.FATHER_PHONE));
      const motherPhoneNorm = normalizePhone(cellValue(row, COL.MOTHER_PHONE));
      const tuition = classifyTuition(cellPair(row, COL.TUITION));
      const branchRaw = cellValue(row, COL.BRANCH);
      const { branch: branchNormalized, extraNote } = normalizeNoteOrBranch(branchRaw);

      report.totals.tuition[tuition.status] += 1;
      if (tuition.status === 'TEXT_NUMERIC' || tuition.status === 'NOTE') {
        report.tuitionIssues.push({
          sheet: config.name,
          row: rowNum,
          lastName,
          firstName,
          status: tuition.status,
          raw: tuition.raw,
        });
      }
      if (branchNormalized) report.totals.branch.valid += 1;
      else report.totals.branch.missingOrGarbage += 1;

      // Нэг сурагч хоёр хуудсанд (ж: математик + нийгэм) → нэг хүн, хичээлийг нэмнэ.
      // Статистик (төлбөр/үнэлгээ/огноо) тоологдохоос ӨМНӨ шалгана — давхар тоолохгүй.
      // Хатуу зөрчлөөс (ж: анги хоосон) ӨМНӨ — хүн нь өөр хуудсанд аль хэдийн бүрэн бичигдсэн.
      const samePhonePlanned = studentPhoneNorm.value ? plannedByPhone.get(studentPhoneNorm.value) : null;
      if (
        samePhonePlanned &&
        samePhonePlanned.sheet !== config.name &&
        normKey(samePhonePlanned.firstName) === normKey(firstName)
      ) {
        report.totals.mergedAcrossSheets += 1;
        if (!samePhonePlanned.subjects.includes(config.subject)) {
          samePhonePlanned.subjects.push(config.subject);
          samePhonePlanned.guardianNote = `${samePhonePlanned.guardianNote ?? ''} | Нэмэлт хичээл: ${config.subject}`.replace(/^ \| /, '');
        }
        continue;
      }

      // ХАТУУ дүрэм зөрчсөн бол (нэр/анги/анги-хуудас тохирол/section) —
      // ТААМАГЛАЛГҮЙгээр АЛГАСНА (guess хийхгүй).
      if (reasons.length > 0) {
        report.totals.skipped += 1;
        for (const r of reasons) {
          const bucket = r.split('(')[0];
          report.totals.skippedByReason[bucket] = (report.totals.skippedByReason[bucket] ?? 0) + 1;
        }
        report.skippedRows.push({
          sheet: config.name,
          row: rowNum,
          lastName,
          firstName,
          reasons,
        });
        continue;
      }

      const grade = angiGrade;
      const school = normText(cellValue(row, COL.SCHOOL)) || null;
      // Секц хүчингүй бол ангийн бүлэг үүсгэхгүй — сурагч "хуваарилагдаагүй"
      // төлөвт орж, багш дараа нь гараар ангид оруулна.
      const section = sectionValid ? sectionText : null;
      const classroomGrade = sectionValid ? Number(sectionText.split('-')[0]) : null;

      // Төлбөрийн дүн/төлөвлөгөө — grade тодорхойлогдсоны ДАРАА тооцно
      // (2,500,000 давхцлыг ялгахад grade шаардлагатай тул).
      const tuitionAmount = parseTuitionAmount(tuition);
      const tuitionPlan = mapTuitionAmountToPlan(tuitionAmount, grade);
      const tuitionNoteParts = [];
      if (tuition.status === 'NOTE') tuitionNoteParts.push(normText(tuition.raw));
      if (extraNote) tuitionNoteParts.push(extraNote);
      const tuitionNote = tuitionNoteParts.length ? tuitionNoteParts.join(' | ') : null;

      const levelText = COL.LEVEL === null ? '' : normText(cellValue(row, COL.LEVEL)).toLowerCase();
      const level = LEVEL_RE.test(levelText) ? levelText : null;
      if (level) report.totals.level[level] += 1;
      const guardianNote =
        [
          normalizeEnrollmentStatusNote(cellValue(row, COL.STATUS)),
          `Хичээл (эх бүртгэлээс): ${config.subject}`,
          level ? `Багшийн үнэлгээ (эх бүртгэлээс): ${level}` : null,
        ]
          .filter(Boolean)
          .join(' | ') || null;
      const joinedOnParsed = parseJoinedOn(cellValue(row, COL.JOINED_RAW));

      report.totals.tuitionPlan[tuitionPlan] = (report.totals.tuitionPlan[tuitionPlan] ?? 0) + 1;
      if (joinedOnParsed.value) report.totals.joinedOnParsed += 1;
      else if (joinedOnParsed.raw) report.totals.joinedOnUnparseable += 1;

      const key = `${normKey(lastName)}|${normKey(firstName)}|${
        studentPhoneNorm.value ?? `NOPHONE-${config.name}-${rowNum}`
      }`;

      if (seenKeys.has(key)) {
        report.totals.duplicateInSource += 1;
        report.skippedRows.push({
          sheet: config.name,
          row: rowNum,
          lastName,
          firstName,
          reasons: ['DUPLICATE_IN_SOURCE (өмнөх ижил мөртэй давхцав)'],
        });
        continue;
      }
      seenKeys.set(key, true);

      // Утасны зөрчил: өөр сурагч аль хэдийн ижил утас ашигласан бол
      // хожуулж орж ирснийг null болгоно (Login-ий давхцал зөвшөөрөгдөхгүй,
      // User.phone @unique) — таамаглаж шинэ дугаар зохиохгүй.
      let effectivePhone = studentPhoneNorm.value;
      let phoneConflict = false;
      if (effectivePhone) {
        if (phoneOwner.has(effectivePhone) && phoneOwner.get(effectivePhone) !== key) {
          phoneConflict = true;
          report.totals.phoneConflicts += 1;
          effectivePhone = null;
        } else {
          phoneOwner.set(effectivePhone, key);
        }
      }

      const planned = {
        sheet: config.name,
        subjects: [config.subject],
        studentCode: null,
        codeSource: null,
        level,
        row: rowNum,
        key,
        lastName,
        firstName,
        grade,
        school,
        section,
        classroomGrade,
        unassigned: !sectionValid,
        fixes,
        studentPhone: effectivePhone,
        studentPhoneMasked: maskPhone(effectivePhone),
        studentPhoneConflict: phoneConflict,
        studentPhoneRawIfConflict: phoneConflict ? maskPhone(studentPhoneNorm.value) : undefined,
        fatherPhone: fatherPhoneNorm.value,
        fatherPhoneMasked: maskPhone(fatherPhoneNorm.value),
        fatherPhoneRawInvalid:
          fatherPhoneNorm.value === null && fatherPhoneNorm.raw ? String(fatherPhoneNorm.raw) : null,
        motherPhone: motherPhoneNorm.value,
        motherPhoneMasked: maskPhone(motherPhoneNorm.value),
        motherPhoneRawInvalid:
          motherPhoneNorm.value === null && motherPhoneNorm.raw ? String(motherPhoneNorm.raw) : null,
        tuition,
        tuitionAmount,
        tuitionPlan,
        tuitionNote,
        branchRaw: branchRaw === null || branchRaw === undefined ? null : String(branchRaw),
        branchNormalized,
        guardianNote,
        joinedOn: joinedOnParsed.value,
        joinedOnRawUnparseable: joinedOnParsed.value ? null : joinedOnParsed.raw,
      };

      report.totals.planned += 1;
      report.plannedStudents.push(planned);
      codeCandidates.push({ planned, phone: studentPhoneNorm.value });
      if (effectivePhone) plannedByPhone.set(effectivePhone, planned);

      // Хуваарилагдаагүй сурагчид ангийн бүлэг үүсгэхгүй — User + StudentProfile
      // л үүснэ, Enrollment үүсэхгүй. Багш "хуваарилагдаагүй сурагчид"
      // жагсаалтаас нь ангид оруулна.
      if (section === null) {
        report.totals.unassigned = (report.totals.unassigned ?? 0) + 1;
      } else {
        const classroomKey = `${classroomGrade}|${section}`;
        if (!classroomGroups.has(classroomKey)) {
          classroomGroups.set(classroomKey, {
            grade: classroomGrade,
            section,
            students: [],
            branchVotes: new Map(),
          });
        }
        const group = classroomGroups.get(classroomKey);
        group.students.push(planned);
        if (branchNormalized) {
          group.branchVotes.set(branchNormalized, (group.branchVotes.get(branchNormalized) ?? 0) + 1);
        }
      }
    }
  }

  // Код олгох — 3 ДАМЖЛАГА (эзний шийдвэр: Excel-ийн код хүчинтэй):
  //  1) «Код» хуудастай УТСААР (нэг утсанд хэд хэдэн код бол нэр таарсныг, эс
  //     бөгөөс эхнийхийг), 2) овог|нэрээр (зөвхөн давхардалгүй нэр), 3) үлдсэнд
  //  Excel-ийн дарааллыг үргэлжлүүлж шинэ код (2027486 → 2027487…).
  // Дамжлагаар хийх нь нэрээр таарсан мөр жинхэнэ эзний (утсаар) кодыг
  // «булааж» авахаас сэргийлнэ. --commit үед DB-д давхцвал resolveStudentCodeCjs шийднэ.
  // 1a) утас + нэр хоёул таарсан; 1b) утсанд ганц код байгаа бол нэр зөрсөн ч (нэрийн бичилт).
  for (const requireName of [true, false]) {
    for (const { planned: p, phone } of codeCandidates) {
      const entries = !p.studentCode && phone ? codeLookup.byPhone.get(phone) : null;
      if (!entries) continue;
      const free = entries.filter((e) => !usedCodes.has(e.code));
      const pick = requireName
        ? free.find((e) => e.first === normKey(p.firstName))
        : entries.length === 1 ? free[0] : null;
      if (!pick) continue;
      p.studentCode = pick.code;
      p.codeSource = 'EXCEL_PHONE';
      usedCodes.add(pick.code);
      report.totals.codes.fromExcelByPhone += 1;
    }
  }
  for (const { planned: p } of codeCandidates) {
    if (p.studentCode) continue;
    const code = codeLookup.byName.get(`${normKey(p.lastName)}|${normKey(p.firstName)}`);
    if (!code || usedCodes.has(code)) continue;
    p.studentCode = code;
    p.codeSource = 'EXCEL_NAME';
    usedCodes.add(code);
    report.totals.codes.fromExcelByName += 1;
  }
  let nextCode = Math.max(codeLookup.maxCode, 2027000) + 1;
  for (const p of report.plannedStudents) {
    if (p.studentCode) continue;
    while (usedCodes.has(String(nextCode))) nextCode += 1;
    p.studentCode = String(nextCode);
    p.codeSource = 'GENERATED';
    usedCodes.add(p.studentCode);
    report.totals.codes.generated += 1;
    nextCode += 1;
  }

  // Ангийн бүлэг бүрийн нэрэнд (боломжтой бол) давамгайлсан салбарыг хавсаргана.
  const classroomsPlan = [];
  for (const group of classroomGroups.values()) {
    let branchConsensus = null;
    let bestCount = 0;
    for (const [branch, count] of group.branchVotes) {
      if (count > bestCount) {
        bestCount = count;
        branchConsensus = branch;
      }
    }
    const displayName = branchConsensus ? `${group.section} (${branchConsensus})` : group.section;
    classroomsPlan.push({
      grade: group.grade,
      section: group.section,
      displayName,
      branchConsensus,
      studentCount: group.students.length,
    });
    // 9-1 33/32 гэх мэт мэдэгдэж буй хүчин чадлын асуудлыг ерөнхий дүрмээр
    // илрүүлнэ: KNOWN_SECTION_CAPACITY-д баримтжуулсан хязгаараас давсан эсэх.
    const known = KNOWN_SECTION_CAPACITY[group.section];
    if (known && group.students.length > known) {
      report.sectionCapacityWarnings.push({
        section: group.section,
        capacity: known,
        actual: group.students.length,
      });
    }
  }
  classroomsPlan.sort((a, b) => a.grade - b.grade || a.section.localeCompare(b.section));
  report.classrooms = classroomsPlan;

  return { report, plannedStudents: report.plannedStudents, classroomsPlan };
}

// Даалгаварт баримтжуулсан МЭДЭГДЭЖ БУЙ хязгаар (schema-д capacity талбар
// байхгүй тул зөвхөн report-д анхааруулах зорилготой, DB-д хадгалахгүй).
const KNOWN_SECTION_CAPACITY = {
  '9-1': 32,
};

// ---------- studentCode: Excel-ийн 7 оронтой код (эзний шийдвэр 2026-09-26) ----------
// Төлөвлөгөөнд өгсөн код DB-д ӨӨР хүнд эзэмшигдсэн бол дараагийн чөлөөт 7
// оронтой кодыг авна (урьдчилсан кодын хувьд). Excel-ээс ирсэн кодыг хэзээ ч
// дураараа өөрчлөхгүй — зөрчилтэйг тайланд гаргаж, ажилтан шийднэ.
async function resolveStudentCodeCjs(prisma, planned, ownerUserId) {
  const taken = async (code) => {
    const u = await prisma.user.findUnique({ where: { studentCode: code }, select: { id: true } });
    return u && u.id !== ownerUserId;
  };
  if (!(await taken(planned.studentCode))) return { code: planned.studentCode, conflict: false };
  if (planned.codeSource !== 'GENERATED') return { code: null, conflict: true };
  let n = Number(planned.studentCode) + 1;
  for (let attempt = 0; attempt < 500; attempt += 1, n += 1) {
    if (!(await taken(String(n)))) return { code: String(n), conflict: false };
  }
  throw new Error('Чөлөөт сурагчийн код олдсонгүй');
}

async function resolveUniqueUsernameCjs(prisma, firstName, lastName) {
  const base = `${lastName}.${firstName}`.trim().replace(/\s+/g, '');
  let candidate = base;
  let n = 1;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}${n}`;
  }
  return candidate;
}

// ---------- --commit: бодит бичилт (энэ даалгаварт ажиллуулахгүй, гэхдээ бүрэн бичив) ----------

async function commitImportPlan({ prisma, plan, createdById }) {
  const stats = {
    classroomsCreated: 0,
    classroomsReused: 0,
    usersCreated: 0,
    usersSkippedExisting: 0,
    enrollmentsCreated: 0,
    profilesEnriched: 0, // одоо байгаа сурагчийн StudentProfile-д шинэ талбарууд (утас/салбар/төлбөр/...) бичигдсэн тоо
    codesSet: 0, // Excel-ийн код тавьсан/шинэчилсэн
    codeConflicts: [], // Excel-ийн код DB-д өөр хүнд байгаа — гараар шийдэх
  };
  const classroomIdByKey = new Map();

  for (const c of plan.classroomsPlan) {
    const key = `${c.grade}|${c.section}`;
    let classroom = await prisma.classroom.findFirst({
      where: { grade: c.grade, name: c.displayName, archived: false },
    });
    if (!classroom) {
      classroom = await prisma.classroom.create({
        data: { name: c.displayName, type: 'IN_PERSON', grade: c.grade },
      });
      stats.classroomsCreated += 1;
    } else {
      stats.classroomsReused += 1;
    }
    classroomIdByKey.set(key, classroom.id);
  }

  for (const s of plan.plannedStudents) {
    // Идэмпотент шалгалт: утастай бол утсаар (unique), утасгүй бол нэр+овгоор
    // (сул баталгаа — comment: утасгүй тохиолдолд 100% давхцлын баталгаа
    // өгөхгүй, учир нь User model-д "эх мөрийн дугаар" гэсэн key талбар байхгүй).
    let existing = null;
    if (s.studentPhone) {
      existing = await prisma.user.findUnique({ where: { phone: s.studentPhone } });
    } else {
      existing = await prisma.user.findFirst({
        where: { firstName: s.firstName, lastName: s.lastName, role: 'STUDENT', phone: null },
      });
    }

    // Excel-ийн бүртгэлээс шинээр гаргаж авсан мэдээлэл — StudentProfile-ийн
    // шинэ баганууд руу (create үед ЭСВЭЛ update үед) адилхан бичигдэнэ.
    // leftOn-г ЗОРИУДААР ОРХИСОН: энэ скрипт зөвхөн идэвхтэй сурагчийн
    // хуудсуудыг уншдаг (ГАРСАН хуудас хамрах хүрээнээс гадуур), тул эх
    // мэдээлэл огт байхгүй — байгаа утгыг ТААМАГЛАЖ null болгож дарахгүй.
    const enrichmentData = {
      fatherPhone: s.fatherPhone,
      motherPhone: s.motherPhone,
      guardianNote: s.guardianNote,
      branch: s.branchNormalized,
      section: s.section,
      tuitionAmount: s.tuitionAmount,
      tuitionPlan: s.tuitionPlan,
      tuitionNote: s.tuitionNote,
      joinedOn: s.joinedOn ? new Date(s.joinedOn) : null,
    };

    if (existing) {
      stats.usersSkippedExisting += 1;
      // Урьдчилсан (GENERATED) код нь аль хэдийн 7 оронтой кодтой сурагчийнхыг
      // дарахгүй — дахин ажиллуулахад код «гүйхээс» сэргийлнэ.
      const keepExisting = s.codeSource === 'GENERATED' && CODE_RE.test(existing.studentCode ?? '');
      if (!keepExisting && existing.studentCode !== s.studentCode) {
        const { code, conflict } = await resolveStudentCodeCjs(prisma, s, existing.id);
        if (conflict) {
          stats.codeConflicts.push({ sheet: s.sheet, row: s.row, code: s.studentCode });
        } else if (code && code !== existing.studentCode) {
          await prisma.user.update({ where: { id: existing.id }, data: { studentCode: code } });
          stats.codesSet += 1;
        }
      }
      // ИДЭМПОТЕНТ БАЙДАЛ: energyprofile.update — ижил эх мөрөөр дахин
      // ажиллуулахад яг ижил утгыг дахин бичнэ (давхардал/хуримтлал үүсэхгүй),
      // Prisma upsert ашиглан хэрэв (ямар нэг шалтгаанаар) StudentProfile
      // мөр байхгүй бол ЗАВСАРГҮЙ үүсгэнэ.
      await prisma.studentProfile.upsert({
        where: { userId: existing.id },
        update: enrichmentData,
        create: {
          userId: existing.id,
          type: 'CLASSROOM',
          grade: s.grade,
          school: s.school,
          activatedAt: new Date(),
          activationCode: null,
          ...enrichmentData,
        },
      });
      stats.profilesEnriched += 1;

      const classroomId = classroomIdByKey.get(`${s.classroomGrade}|${s.section}`);
      if (classroomId) {
        const existingEnrollment = await prisma.enrollment.findFirst({
          where: { studentId: existing.id, classroomId, leftAt: null },
        });
        if (!existingEnrollment) {
          await prisma.enrollment.create({ data: { studentId: existing.id, classroomId } });
          stats.enrollmentsCreated += 1;
        }
      }
      continue;
    }

    const username = await resolveUniqueUsernameCjs(prisma, s.firstName, s.lastName);
    const resolved = await resolveStudentCodeCjs(prisma, s, null);
    if (resolved.conflict) stats.codeConflicts.push({ sheet: s.sheet, row: s.row, code: s.studentCode });
    const studentCode = resolved.code; // зөрчилтэй бол null — ажилтан дараа тавина
    if (studentCode) stats.codesSet += 1;

    // Нууц үг: утастай бол auth.service.ts-ийн register()-ийн анхны нууц
    // үгтэй ижил зарчмаар утсыг өөрийг нь ашиглана (dto.password ?? dto.phone —
    // ижил аюулгүй байдлын түвшин, апп-д аль хэдийн зөвшөөрөгдсөн загвар).
    // Утасгүй бол ТААМАГЛАХГҮЙ crypto-random нууц үг өгч, ажилтан дараа нь
    // reset хийхийг шаардана (report-д тэмдэглэнэ).
    const bcrypt = require('bcryptjs');
    const rawPassword = s.studentPhone ?? require('crypto').randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        phone: s.studentPhone,
        username,
        studentCode,
        firstName: s.firstName,
        lastName: s.lastName,
        passwordHash,
        role: 'STUDENT',
        studentProfile: {
          create: {
            type: 'CLASSROOM',
            grade: s.grade,
            school: s.school,
            activatedAt: new Date(),
            activationCode: null,
            ...enrichmentData,
          },
        },
      },
    });
    stats.usersCreated += 1;

    const classroomId = classroomIdByKey.get(`${s.classroomGrade}|${s.section}`);
    if (classroomId) {
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: user.id, classroomId, leftAt: null },
      });
      if (!existingEnrollment) {
        await prisma.enrollment.create({ data: { studentId: user.id, classroomId } });
        stats.enrollmentsCreated += 1;
      }
    }
  }

  return stats;
}

// ---------- CLI ----------

function writeReport(report, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function printSummary(report) {
  console.log('=== Сурагчийн бүртгэлийн импорт — хураангуй ===');
  console.log('Хуудсууд:', report.sheetsProcessed.join(', '));
  console.log('Хамрахгүй хуудсууд:', report.sheetsSkippedEntirely.map((s) => s.name).join(', '));
  console.log('Нийт харсан мөр:', report.totals.rowsSeen);
  console.log('Импортлох боломжтой (planned):', report.totals.planned);
  console.log('Алгассан (skipped):', report.totals.skipped, JSON.stringify(report.totals.skippedByReason));
  console.log('Давхцал (эх файл дотор):', report.totals.duplicateInSource);
  console.log('Утасны зөрчил (phone conflicts):', report.totals.phoneConflicts);
  console.log('Хуудас хооронд нэгтгэсэн (нэг хүн, 2 хичээл):', report.totals.mergedAcrossSheets);
  console.log('Код:', JSON.stringify(report.totals.codes), 'Кодын хуудас:', JSON.stringify(report.codeSheet));
  console.log('Багшийн үнэлгээ:', JSON.stringify(report.totals.level));
  console.log('Төлбөр (эх баганы төрөл):', JSON.stringify(report.totals.tuition));
  console.log('Төлбөрийн төлөвлөгөө (tuitionPlan):', JSON.stringify(report.totals.tuitionPlan));
  console.log('Салбар (branch):', JSON.stringify(report.totals.branch));
  console.log(
    'Элссэн огноо (joinedOn):',
    `parsed=${report.totals.joinedOnParsed}`,
    `unparseable=${report.totals.joinedOnUnparseable}`,
  );
  if (report.sectionCapacityWarnings.length) {
    console.log('Хүчин чадлын анхаарал:', JSON.stringify(report.sectionCapacityWarnings));
  }
  console.log('Ангийн бүлгүүд (Classroom):', report.classrooms.length);
  for (const c of report.classrooms) {
    console.log(`  ${c.grade}-р анги — ${c.displayName}: ${c.studentCount} сурагч`);
  }
  console.log(
    '\n⚠️  PII анхааруулга: report файлд аав/ээж/сурагчийн БҮРЭН утасны дугаар орсон байж болно ' +
      '(даалгаврын шаардлагын дагуу). Энэ файлыг GIT-т commit хийхгүй байхыг анхаарна уу.',
  );
}

async function runCli() {
  const args = process.argv.slice(2);
  const has = (flag) => args.includes(flag);
  const argValue = (prefix) => {
    const found = args.find((a) => a.startsWith(prefix));
    return found ? found.slice(prefix.length) : undefined;
  };

  const sourcePath = argValue('--source=') ?? DEFAULT_SOURCE;
  const reportPath = argValue('--report=') ?? DEFAULT_REPORT;
  const commit = has('--commit');

  const plan = buildImportPlan(sourcePath);
  writeReport(plan.report, reportPath);
  printSummary(plan.report);
  console.log(`\nТайлан бичигдлээ: ${reportPath}`);

  if (!commit) {
    console.log('\n(--dry-run горим — DB-д ЯМАР Ч БИЧИЛТ ХИЙГДСЭНГҮЙ. Бичихийн тулд --commit дамжуулна уу.)');
    return;
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const stats = await commitImportPlan({ prisma, plan });
    console.log('\n=== --commit гүйцэтгэлийн үр дүн ===');
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { buildImportPlan, commitImportPlan };

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
