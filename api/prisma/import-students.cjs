#!/usr/bin/env node
/**
 * Сурагчийн бодит бүртгэлийг Excel-ээс (БҮРТГЭЛ-2027-1.xlsx) уншиж платформ руу
 * оруулах скрипт.
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

const DEFAULT_SOURCE = '/Users/mr.buus/Downloads/БҮРТГЭЛ-2027-1.xlsx';
const DEFAULT_REPORT = path.join(__dirname, 'reports', 'student-import.json');

// Тухайн 3 хуудас л энэ скриптийн хамрах хүрээ (359 идэвхтэй сурагчтай таарна).
// "зуны анги"/"ГАРСАН"/"Sheet1"/"Цалингийн хүснэгт" хуудсуудыг ЗОРИУДААР
// оруулаагүй (доор sheetsSkippedEntirely-д тодорхой тэмдэглэнэ).
const SHEET_CONFIGS = [
  { name: '12-р анги', expectedGrades: [12] },
  { name: '11-р анги', expectedGrades: [11] },
  { name: '9,10-р анги', expectedGrades: [9, 10] },
];
const OUT_OF_SCOPE_SHEETS = [
  {
    name: 'зуны анги',
    reason:
      'Зуны ангийн сурагчид (57) энэ импортын зорилтот бүлэг биш — тусад нь шийдвэрлэнэ.',
  },
  {
    name: 'ГАРСАН',
    reason: 'Аль хэдийн гарсан сурагчид (12) — идэвхтэй бүртгэлд орохгүй.',
  },
  { name: 'Sheet1', reason: 'Ирцийн хуудас, сурагчийн бүртгэл биш.' },
  {
    name: 'Цалингийн хүснэгт',
    reason: 'Ажилтны цалингийн хүснэгт, сурагчийн бүртгэлтэй хамааралгүй.',
  },
];

// Багана индекс (0-based), header мөр (row 1) баталгаажуулсан бүтэц дээр үндэслэв.
// АНХААРАХ: 3 хуудасны бодит эх файлыг openpyxl-ээр шууд шалгаж баталгаажуулав
// (header мөр 9,10,12 индекст headerless боловч ДАТА агуулдаг):
//   9  (COL9_UNKNOWN)   : '1'..'5'/'өд'/'өг' гэх мэт богино кодууд — утга
//                         тодорхойгүй (гэр бүлийн хүүхдийн дугаар? ээлж?),
//                         ямар ч DB баганад ТААМАГЛАЖ ХОЛБОХГҮЙ.
//   10 (JOINED_RAW)     : "6/8"/"07/20" маягийн САР/ӨДӨР (жилгүй) — энэ бол
//                         сурагч элссэн огноо тул StudentProfile.joinedOn-д
//                         холбоно (доор parseJoinedOn харна уу).
//   12 (STATUS)         : "Шинэ"/"Хуучин" — сурагч шинэ элссэн үү, үргэлжилж
//                         байгаа хуучин сурагч уу. Үүнд зориулсан тусгай багана
//                         schema-д байхгүй тул guardianNote-д тодорхой
//                         шошготойгоор хадгална (доор normalizeEnrollmentStatusNote).
//   13 (NOTE_OR_BRANCH) : header нь "нэмэлт тайлбар" ("Баруун 4"/"Зүүн 4" эсвэл
//                         төлбөртэй холбоотой чөлөөт тэмдэглэл хоёул холилдож
//                         бичигдсэн багана) — доор normalizeNoteOrBranch хоёр
//                         замд ялгана.
const COL = {
  NO: 0, // №
  LAST: 1, // Овог
  FIRST: 2, // нэр
  ANGI: 3, // анги (сурагчийн БОДИТ анги — сурагчийн жагсаалт баталгаажуулна)
  STUDENT_PHONE: 4, // өөр
  FATHER_PHONE: 5, // аав
  MOTHER_PHONE: 6, // ээж
  SCHOOL: 7, // сургууль
  SECTION: 8, // с.т анги (ж: 12-1)
  COL9_UNKNOWN: 9, // утга тодорхойгүй — таамаглахгүй, DB-д холбохгүй
  JOINED_RAW: 10, // элссэн огноо (сар/өдөр, жилгүй)
  TUITION: 11, // төлбөр
  STATUS: 12, // "Шинэ" / "Хуучин"
  BRANCH: 13, // нэрлэгдээгүй толгойтой боловч "Баруун 4"/"Зүүн 4" утга ЭСВЭЛ чөлөөт тайлбар агуулдаг багана
};

const VALID_SECTION_RE = /^(9|10|11|12|13)-\d+$/;
const ANGI_RE = /^(\d{1,2})-р\s*анги$/u;
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
    for row in ws.iter_rows(min_row=1, max_col=14):
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

// ---------- Мөр бүрийг шалгаж, "planned" эсвэл "skipped" болгох ----------

function buildImportPlan(sourcePath) {
  const sheetNames = SHEET_CONFIGS.map((s) => s.name);
  const workbook = readWorkbookViaPython(sourcePath, sheetNames);

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
      phoneConflicts: 0,
    },
    sectionCapacityWarnings: [],
    skippedRows: [],
    tuitionIssues: [], // TEXT_NUMERIC / NOTE дэлгэрэнгүй — staff-д харагдана
    plannedStudents: [],
  };

  const seenKeys = new Map(); // key -> plannedStudent (давхардал илрүүлэхэд)
  const phoneOwner = new Map(); // studentPhone -> key (зөрчил илрүүлэхэд)
  const classroomGroups = new Map(); // "grade|section" -> { grade, section, students:[], branchVotes:Map }

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

    // row index 0 = header (validate биш, зөвхөн алгасана)
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
      const angiGrade = angiMatch ? Number(angiMatch[1]) : null;
      if (!angiGrade) {
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

      const sectionRaw = cellValue(row, COL.SECTION);
      const sectionText = normText(sectionRaw);
      const sectionValid = VALID_SECTION_RE.test(sectionText);
      if (!sectionValid) {
        // ЗАЛРУУЛГА: секц хоосон эсвэл 'ЗУН'/'орой'/'хүлээх' гэх мэт бодит
        // секц биш утгатай. Сурагч оршдог — зүгээр бүлэгт хуваарилагдаагүй.
        // Платформд "хуваарилагдаагүй сурагч" гэсэн ойлголт байдаг
        // (TeacherDashboard/UnassignedStudentsSection.tsx) — тийш нь оруулна.
        // Enrollment үүсгэхгүй, багш дараа нь ангид хуваарилна.
        fixes.push(`UNASSIGNED(с.т анги='${sectionText || '(хоосон)'}')`);
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

      const guardianNote = normalizeEnrollmentStatusNote(cellValue(row, COL.STATUS));
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

// ---------- studentCode/username: src/common/codes.ts-ийн логикийг дахин ашиглав ----------
// (CJS скрипт TS-ийг шууд require хийж чадахгүй тул алгоритмыг ЯГ ХУУЛСАН.
//  Эх сурвалж: api/src/common/codes.ts — generateStudentCode, resolveUniqueUsername.
//  Хэрэв codes.ts өөрчлөгдвөл ЭНД Ч мөн адил шинэчлэх ёстой.)
async function generateStudentCodeCjs(prisma, { enrolmentYear, subject = 'B' } = {}) {
  const year = (enrolmentYear ?? new Date().getFullYear()) % 100;
  const yearStr = String(year).padStart(2, '0');
  const prefix = `SIE-${yearStr}-${subject}-`;
  const last = await prisma.user.findFirst({
    where: { studentCode: { startsWith: prefix } },
    orderBy: { studentCode: 'desc' },
    select: { studentCode: true },
  });
  let seq = last?.studentCode ? parseInt(last.studentCode.slice(prefix.length), 10) + 1 : 1;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `${prefix}${String(seq).padStart(4, '0')}`;
    const exists = await prisma.user.findUnique({ where: { studentCode: candidate }, select: { id: true } });
    if (!exists) return candidate;
    seq += 1;
  }
  throw new Error('Сурагчийн код үүсгэх боломжгүй байна — дахин оролдоно уу');
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
    const studentCode = await generateStudentCodeCjs(prisma, {});

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
    console.log(`  ${c.grade}-р анги · ${c.displayName}: ${c.studentCount} сурагч`);
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
