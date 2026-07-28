#!/usr/bin/env node
/**
 * Туршилтын өгөгдөл: анги/бүлэг (section) бүрээс эхний 2 сурагчийг бодит
 * Excel бүртгэлээс (БҮРТГЭЛ-2027-1.xlsx) сонгож, платформ дээр жижиг,
 * тодорхой "туршилтын" багц болгон оруулна — ажилтан аппликейшн дээр
 * жинхэнэ өгөгдлөөр (хоосон биш) явж үзэхэд зориулав.
 *
 * ЭНЭ СКРИПТ import-students.cjs-ийг ШИНЭЭР ДАХИН БИЧЭЭГҮЙ — экспортолсон
 * buildImportPlan/commitImportPlan-г ШУУД ДАХИН АШИГЛАДАГ (parsing, багана
 * зураглал, код үүсгэлт, идэмпотент шалгалт бүгд яг ижил):
 *  - buildImportPlan(sourcePath) → бүх боломжит сурагчийн "төлөвлөгөө" (planned
 *    list) гаргана (DB рүү ХАНДАХГҮЙ, зөвхөн Excel унших).
 *  - Тэндээс section (с.т анги, ж: "12-1") тус бүрээр ЭХНИЙ 2 хүчинтэй
 *    сурагчийг шүүж авна (13 section ≈ 26 сурагч).
 *  - Шүүсэн sub-plan-аа commitImportPlan({ prisma, plan })-д ЯГ АДИЛХАН
 *    дамжуулна → User/StudentProfile/Enrollment яг import-students.cjs-тэй
 *    ИЖИЛ логикоор (ижил studentCode/username үүсгэлт, ижил идэмпотент
 *    "утсаар эсвэл нэр+овгоор давхцал шалгах" дүрэм) үүснэ.
 *
 * ИДЭМПОТЕНТ: commitImportPlan дотор давхцал шалгагдана (утас эсвэл нэр+овог)
 * тул дахин ажиллуулахад сурагч ДАВХАРДАХГҮЙ (зөвхөн StudentProfile enrich
 * хийгдэнэ). Доор нэмж бичдэг Attempt/Attendance ажиглалт мөн idempotent:
 *  - Attendance: (classroomId, studentId, date) @@unique тул upsert ашиглана.
 *  - Attempt: DB схемд unique constraint байхгүй тул "энэ сурагчид ӨНӨӨДӨР
 *    (occurredOn) EVENING_SELF_REPORT эх сурвалжтай Attempt аль хэдийн
 *    байгаа эсэх"-ийг манайхаа шалгаад байгаа бол дахин үүсгэхгүй.
 *
 * ⚠️ ОНОО/ҮР ДҮН ТААМАГЛАХГҮЙ: Attempt мөрүүдэд autoCorrect/selfState-ийг
 * ЗОРИУДААР null үлдээнэ (зөвхөн "сурагч бодлоготой харьцсан" гэдгийг
 * тэмдэглэнэ, "зөв бодсон"/"алдсан" гэсэн ТААМАГЛАЛТ үр дүн бичихгүй) — эдгээр
 * нь бодит шалгалтын дүн/амжилт гэж андуурагдахаас сэргийлнэ.
 *
 * ⚠️ АНХДАГЧААР --dry-run (ЯМАР Ч БИЧИЛТ ХИЙГДЭХГҮЙ). --commit дамжуулсан
 * үед л DB рүү бичнэ.
 *
 * 🔒 PII: stdout дээр утасны дугаарыг МАСКЛАНА (8810****). report файл
 * (api/prisma/reports/seed-test-students.json) мөн ЗӨВХӨН масклагдсан утас
 * агуулна (import-students.cjs-ийн report-оос ялгаатай нь — тэр нь бүрэн
 * утас хадгалдаг тул тусад нь .gitignore-д онцгойлон бичигдсэн байдаг).
 * ГЭХДЭЭ: энэ шинэ report файлын нэр (seed-test-students.json) одоогийн
 * root .gitignore-д ТУСГАЙЛАН орсонгүй (зөвхөн student-import.json л
 * ялгаатай эрхтэй) — .gitignore нь энэ агентын хариуцах файлын жагсаалтад
 * ороогүй тул ЭНЭ скриптээс өөрчлөөгүй болно. Иймд report-ыг зориудаар
 * "маск хийсэн" болгосон нь яг энэ цоорхойг нөхөх зорилготой (ил гарсан ч
 * бодит утас алдагдахгүй). Ажлын тайланд энэ зөрүүг тодорхой тэмдэглэнэ.
 */

const fs = require('fs');
const path = require('path');
const { buildImportPlan, commitImportPlan } = require('./import-students.cjs');

const DEFAULT_SOURCE = '/Users/mr.buus/Downloads/БҮРТГЭЛ-2027-1.xlsx';
const DEFAULT_REPORT = path.join(__dirname, 'reports', 'seed-test-students.json');
const STUDENTS_PER_SECTION = 2;

// ---------- туслах: маскласан утас (import-students.cjs-ийн maskPhone-той ижил дүрэм) ----------
function maskPhone(phone) {
  if (!phone) return null;
  const s = String(phone);
  return s.length >= 4 ? `${s.slice(0, 4)}****` : '****';
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// ---------- section (с.т анги) тус бүрээс эхний N хүчинтэй сурагчийг шүүх ----------
// plan.plannedStudents аль хэдийн эх Excel-ийн МӨРИЙН дараалалтай (хуудсаар,
// дараа нь мөрөөр) ирдэг тул "эхний N" гэдэг нь Excel дэх бодит эрэмбэ мөн.
// Хуваарилагдаагүй (section === null) сурагчийг ЗОРИУДААР АЛГАСНА — даалгавар
// "анги бүрээс" гэж тодорхой хэлсэн тул ямар ч ангид хамааралгүй сурагчийг
// суралцахуйн дэлгэц дээр туршихад тохиромжгүй.
function selectTestStudents(plan) {
  const bySection = new Map(); // section -> plannedStudent[]
  for (const s of plan.plannedStudents) {
    if (!s.section) continue;
    if (!bySection.has(s.section)) bySection.set(s.section, []);
    const bucket = bySection.get(s.section);
    if (bucket.length < STUDENTS_PER_SECTION) bucket.push(s);
  }
  return bySection;
}

function buildReport({ sourcePath, plan, bySection, selectedStudents }) {
  const sections = [...bySection.entries()]
    .map(([section, students]) => ({
      section,
      grade: students[0]?.grade ?? null,
      pickedCount: students.length,
      students: students.map((s) => ({
        lastName: s.lastName,
        firstName: s.firstName,
        grade: s.grade,
        school: s.school,
        section: s.section,
        studentPhoneMasked: maskPhone(s.studentPhone),
        fatherPhoneMasked: maskPhone(s.fatherPhone),
        motherPhoneMasked: maskPhone(s.motherPhone),
      })),
    }))
    .sort((a, b) => a.section.localeCompare(b.section));

  return {
    meta: {
      source: sourcePath,
      generatedAt: new Date().toISOString(),
      note: 'Бүх утасны дугаар МАСКЛАГДСАН (жинхэнэ утас ЭНД ХАДГАЛАГДААГҮЙ).',
    },
    totals: {
      sourceRowsSeen: plan.report.totals.rowsSeen,
      sourcePlanned: plan.report.totals.planned,
      sectionsAvailable: plan.report.classrooms.length,
      sectionsPicked: bySection.size,
      studentsPicked: selectedStudents.length,
      perSectionTarget: STUDENTS_PER_SECTION,
    },
    sections,
  };
}

function printSummary(report) {
  console.log('=== Туршилтын сурагч seed — хураангуй (dry-run/commit хамаагүй) ===');
  console.log('Эх файл дахь мөр (нийт):', report.totals.sourceRowsSeen);
  console.log('Импортлох боломжтой (planned, бүх section):', report.totals.sourcePlanned);
  console.log('Section (анги/бүлэг) нийт олдсон:', report.totals.sectionsAvailable);
  console.log('Section сонгосон (>=1 сурагчтай):', report.totals.sectionsPicked);
  console.log('Туршилтын сурагч сонгосон нийт:', report.totals.studentsPicked);
  console.log('');
  for (const sec of report.sections) {
    console.log(
      `  ${sec.section} (${sec.grade}-р анги): ${sec.pickedCount} сурагч сонгосон`,
    );
    for (const st of sec.students) {
      console.log(
        `    - ${st.lastName} ${st.firstName} | утас=${st.studentPhoneMasked ?? '—'} | сургууль=${st.school ?? '—'}`,
      );
    }
  }
}

function writeReport(report, outputPath) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

// ---------- --commit: сонгосон сурагчдад бага зэрэг "туршилтын" идэвх нэмэх ----------
// (Attempt хэдэн мөр + өнөөдрийн Attendance) — дэлгэц хоосон харагдахгүйн тулд.
// prisma.attempt/attendance-г ЗӨВХӨН энд ашигладаг, import-students.cjs-д
// байхгүй тул давхардал биш.
async function seedActivityForStudents({ prisma, selectedStudents }) {
  const stats = {
    studentsMatched: 0,
    studentsUnmatched: 0,
    attendanceUpserted: 0,
    attemptsCreated: 0,
    attemptsSkippedAlreadySeededToday: 0,
    problemsAvailable: 0,
    markedById: null,
  };

  const today = new Date(todayIso());

  // Attempt-д зориулж бодит (ТААМАГЛААГҮЙ, оруулаагүй) 1-2 бодлого олно —
  // шинэ бодлого ЗОХИОХГҮЙ, зөвхөн байгаа сангаас сонгоно.
  const problems = await prisma.problem.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
  stats.problemsAvailable = problems.length;

  // Attendance.markedById-д зориулж жинхэнэ ажилтны (ADMIN/TEACHER_PLUS/TEACHER)
  // хэрэглэгч хайна — schema-д markedById ямар ч FK constraint-гүй ч гэсэн
  // ТААМАГ ID зохиохгүй, бодит хэрэглэгч ашиглана.
  const staffUser = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'TEACHER_PLUS', 'TEACHER'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  for (const s of selectedStudents) {
    // commitImportPlan-тэй ЯГ АДИЛХАН идэмпотент лавлагаа (утас эсвэл нэр+овог).
    let user = null;
    if (s.studentPhone) {
      user = await prisma.user.findUnique({ where: { phone: s.studentPhone } });
    } else {
      user = await prisma.user.findFirst({
        where: { firstName: s.firstName, lastName: s.lastName, role: 'STUDENT', phone: null },
      });
    }
    if (!user) {
      stats.studentsUnmatched += 1;
      continue;
    }
    stats.studentsMatched += 1;

    const enrollment = await prisma.enrollment.findFirst({
      where: { studentId: user.id, leftAt: null },
      orderBy: { joinedAt: 'desc' },
    });
    const classroomId = enrollment?.classroomId ?? null;

    // Attendance — өнөөдрийн мөр (unique [classroomId, studentId, date] тул upsert).
    if (classroomId) {
      const markedById = staffUser?.id ?? user.id; // fallback: staff байхгүй бол зөвшөөрөгдөх (FK-гүй), тайланд тэмдэглэнэ
      stats.markedById = staffUser?.id ?? 'FALLBACK_STUDENT_ID (ADMIN/TEACHER олдсонгүй)';
      await prisma.attendance.upsert({
        where: { classroomId_studentId_date: { classroomId, studentId: user.id, date: today } },
        update: {},
        create: {
          classroomId,
          studentId: user.id,
          date: today,
          status: 'PRESENT',
          markedById,
        },
      });
      stats.attendanceUpserted += 1;
    }

    // Attempt — ӨНӨӨДӨР энэ сурагчид EVENING_SELF_REPORT эх сурвалжтай Attempt
    // аль хэдийн байгаа эсэхийг шалгаж, байхгүй бол л 1-2 мөр нэмнэ (idempotent).
    if (problems.length > 0) {
      const already = await prisma.attempt.count({
        where: { studentId: user.id, occurredOn: today, source: 'EVENING_SELF_REPORT' },
      });
      if (already > 0) {
        stats.attemptsSkippedAlreadySeededToday += 1;
      } else {
        for (let i = 0; i < Math.min(2, problems.length); i += 1) {
          const problem = problems[i % problems.length];
          await prisma.attempt.create({
            data: {
              studentId: user.id,
              problemId: problem.id,
              source: 'EVENING_SELF_REPORT',
              occurredOn: today,
              // autoCorrect/selfState ЗОРИУДААР null — "зөв/буруу" гэсэн
              // ТААМАГЛАЛТ дүн бичихгүй (жинхэнэ шалгалтын үр дүн гэж
              // андуурагдахаас сэргийлнэ), зөвхөн харьцсан гэдгийг тэмдэглэнэ.
              autoCorrect: null,
              selfState: null,
              timeSpentSec: 60 + i * 30,
              classroomId,
            },
          });
          stats.attemptsCreated += 1;
        }
      }
    }
  }

  return stats;
}

// ---------- CLI ----------

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
  const bySection = selectTestStudents(plan);
  const selectedStudents = [...bySection.values()].flat();
  const selectedSections = new Set(bySection.keys());
  const subPlan = {
    classroomsPlan: plan.classroomsPlan.filter((c) => selectedSections.has(c.section)),
    plannedStudents: selectedStudents,
  };

  const report = buildReport({ sourcePath, plan, bySection, selectedStudents });
  writeReport(report, reportPath);
  printSummary(report);
  console.log(`\nТайлан бичигдлээ: ${reportPath}`);
  console.log(
    '\n⚠️  .gitignore анхаарал: энэ report файл (seed-test-students.json) нь root .gitignore-д ' +
      'тусгайлан ороогүй (зөвхөн student-import.json тусгай эрхтэй). ГЭХДЭЭ утасны дугаар бүгд ' +
      'МАСКЛАГДСАН тул git-т орсон ч бодит утас алдагдахгүй. Хатуу дүрмээр .gitignore файлд хамааралгүй ' +
      'тул энэ скриптээс ЗАСВАРЛААГҮЙ — эзэмшигч/бусад agent api/prisma/reports/-г бүхэлд нь эсвэл энэ ' +
      'файлыг тусгайлан .gitignore-д нэмэхийг зөвлөж байна.',
  );

  if (!commit) {
    console.log('\n(--dry-run горим — DB-д ЯМАР Ч БИЧИЛТ ХИЙГДСЭНГҮЙ. Бичихийн тулд --commit дамжуулна уу.)');
    return;
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const studentStats = await commitImportPlan({ prisma, plan: subPlan });
    console.log('\n=== --commit: сурагч/анги үүсгэлтийн үр дүн ===');
    console.log(JSON.stringify(studentStats, null, 2));

    const activityStats = await seedActivityForStudents({ prisma, selectedStudents });
    console.log('\n=== --commit: идэвх (Attempt/Attendance) seed үр дүн ===');
    console.log(JSON.stringify(activityStats, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { selectTestStudents, buildReport, seedActivityForStudents };

if (require.main === module) {
  runCli().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
