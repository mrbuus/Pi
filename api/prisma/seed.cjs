// Хөгжүүлэлтийн орчны эхлэлийн өгөгдөл. Ажиллуулах: npm run build && node prisma/seed.cjs
// Idempotent — дахин ажиллуулахад давхардахгүй.
require('dotenv').config();
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { seed100x100V2Content } = require('./import-100x100-v2.cjs');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function upsertUser({ phone, firstName, lastName, role }) {
  const passwordHash = await bcrypt.hash(phone, 10);
  return prisma.user.upsert({
    where: { phone },
    update: { role },
    create: { phone, firstName, lastName, role, passwordHash },
  });
}

async function upsertBook({ code, title, coverKey }) {
  return prisma.book.upsert({
    where: { code },
    update: { title, coverKey },
    create: { code, title, coverKey },
  });
}

async function upsertChapter({ bookId, title, order, grade, freePreview }) {
  const existing = await prisma.chapter.findFirst({
    where: { bookId, title },
  });
  if (existing) {
    return prisma.chapter.update({
      where: { id: existing.id },
      data: { order, grade, freePreview },
    });
  }
  return prisma.chapter.create({
    data: { bookId, title, order, grade, freePreview },
  });
}

async function ensureTag(type, name) {
  return prisma.tag.upsert({
    where: { type_name: { type, name } },
    update: {},
    create: { type, name },
  });
}

async function setProblemTags(problemId, tags) {
  for (const tagInput of tags) {
    const tag = await ensureTag(tagInput.type, tagInput.name);
    await prisma.problemTag.upsert({
      where: { problemId_tagId: { problemId, tagId: tag.id } },
      update: {},
      create: { problemId, tagId: tag.id },
    });
  }
}

async function setProblemFormulas(problemId, formulas) {
  for (const name of formulas) {
    const formula = await prisma.formula.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.problemFormula.upsert({
      where: { problemId_formulaId: { problemId, formulaId: formula.id } },
      update: {},
      create: { problemId, formulaId: formula.id },
    });
  }
}

async function upsertProblem({
  token,
  chapterId,
  number,
  format,
  statementText,
  choices,
  correctAnswer,
  points,
  createdById,
  tags = [],
  formulas = [],
}) {
  const problem = await prisma.problem.upsert({
    where: { token },
    update: {
      chapterId,
      number,
      format,
      statementText,
      choices: choices ?? null,
      correctAnswer,
      points,
    },
    create: {
      token,
      chapterId,
      number,
      format,
      statementText,
      choices: choices ?? null,
      correctAnswer,
      points,
      createdById,
    },
  });
  await setProblemTags(problem.id, tags);
  await setProblemFormulas(problem.id, formulas);
  return problem;
}

async function upsertTest({
  title,
  type,
  gradingMode = 'AUTO',
  chapterId,
  timeLimitMin,
  pdfKey,
  groupKey,
  variantLabel,
  createdById,
  problems,
  classroomIds,
}) {
  const existing = await prisma.test.findFirst({
    where: { title, groupKey: groupKey ?? null, variantLabel: variantLabel ?? null },
  });
  const data = {
    title,
    type,
    gradingMode,
    chapterId,
    timeLimitMin,
    pdfKey,
    groupKey,
    variantLabel,
    createdById,
  };
  const test = existing
    ? await prisma.test.update({ where: { id: existing.id }, data })
    : await prisma.test.create({ data });

  await prisma.testProblem.deleteMany({ where: { testId: test.id } });
  if (problems.length) {
    await prisma.testProblem.createMany({
      data: problems.map((problem, index) => ({
        testId: test.id,
        problemId: problem.id,
        order: index + 1,
        points: problem.points ?? 1,
      })),
    });
  }

  await prisma.testAccess.deleteMany({ where: { testId: test.id } });
  if (classroomIds.length) {
    await prisma.testAccess.createMany({
      data: classroomIds.map((classroomId) => ({
        testId: test.id,
        classroomId,
      })),
      skipDuplicates: true,
    });
  }

  return test;
}

const FUTURE = '/Users/mr.buus/Desktop/future';
const PDFTOTEXT = '/opt/homebrew/bin/pdftotext';

function readPdfText(filePath) {
  if (!fs.existsSync(filePath) || !fs.existsSync(PDFTOTEXT)) return '';
  try {
    return execFileSync(PDFTOTEXT, ['-layout', filePath, '-'], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (error) {
    console.warn(`PDF уншиж чадсангүй: ${filePath}`, error.message);
    return '';
  }
}

function cleanText(text) {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const CIRCLED = {
  '①': 1,
  '②': 2,
  '③': 3,
  '④': 4,
  '⑤': 5,
  '⑥': 6,
  '⑦': 7,
  '⑧': 8,
  '⑨': 9,
  '⑩': 10,
  '⑪': 11,
  '⑫': 12,
  '⑬': 13,
  '⑭': 14,
  '⑮': 15,
  '⑯': 16,
  '⑰': 17,
  '⑱': 18,
  '⑲': 19,
  '⑳': 20,
};

function between(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return '';
  const afterStart = text.slice(start);
  const end = afterStart.indexOf(endNeedle);
  return end < 0 ? afterStart : afterStart.slice(0, end);
}

function splitCircledQuestions(section, expectedCount) {
  const markerRe = /([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳])\./g;
  const markers = [];
  let match;
  while ((match = markerRe.exec(section))) {
    const number = CIRCLED[match[1]];
    if (number && number <= expectedCount) {
      markers.push({ number, index: match.index, marker: match[0] });
    }
  }
  return markers.map((m, i) => {
    const next = markers[i + 1]?.index ?? section.length;
    const raw = section.slice(m.index + m.marker.length, next);
    return { number: m.number, text: cleanText(raw) };
  });
}

const BOLD_DIGITS = {
  '𝟎': '0',
  '𝟏': '1',
  '𝟐': '2',
  '𝟑': '3',
  '𝟒': '4',
  '𝟓': '5',
  '𝟔': '6',
  '𝟕': '7',
  '𝟖': '8',
  '𝟗': '9',
};

function boldToNumber(value) {
  return parseInt(
    Array.from(value)
      .map((char) => BOLD_DIGITS[char] ?? '')
      .join(''),
    10,
  );
}

function splitBoldQuestions(section, min, max) {
  const markerRe = /([𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗]{1,2})\./gu;
  const markers = [];
  let match;
  while ((match = markerRe.exec(section))) {
    const number = boldToNumber(match[1]);
    if (number >= min && number <= max) {
      markers.push({ number, index: match.index, marker: match[0] });
    }
  }
  const seen = new Set();
  return markers
    .map((m, i) => {
      const next = markers[i + 1]?.index ?? section.length;
      return {
        number: m.number,
        text: cleanText(section.slice(m.index + m.marker.length, next)),
      };
    })
    .filter((item) => {
      if (seen.has(item.number)) return false;
      seen.add(item.number);
      return true;
    })
    .sort((a, b) => a.number - b.number);
}

function split1000FillQuestions(text) {
  const section = text.includes('Хоёрдугаар хэсэг')
    ? text.slice(text.indexOf('Хоёрдугаар хэсэг'))
    : '';
  const markerRe = /𝐈𝐈\.\s*([𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗])\.?/gu;
  const markers = [];
  let match;
  while ((match = markerRe.exec(section))) {
    const number = boldToNumber(match[1]);
    if (number >= 1 && number <= 4) {
      markers.push({ number, index: match.index, marker: match[0] });
    }
  }
  const seen = new Set();
  return markers
    .map((m, i) => {
      const next = markers[i + 1]?.index ?? section.length;
      return {
        number: m.number,
        text: cleanText(section.slice(m.index + m.marker.length, next)),
      };
    })
    .filter((item) => {
      if (seen.has(item.number)) return false;
      seen.add(item.number);
      return true;
    })
    .sort((a, b) => a.number - b.number);
}

function choicePointsFor1000(number) {
  if (number <= 12) return 1;
  if (number <= 28) return 2;
  return 3;
}

async function seedFutureContent({ adminId, classroomIds }) {
  const book1000 = await upsertBook({
    code: '1000',
    title: '1000 бодлого · ЭЕШ сорил',
  });
  const book200 = await upsertBook({
    code: '200V2',
    title: '200x200 V2 бодлогын сан',
  });

  const ch1000 = await upsertChapter({
    bookId: book1000.id,
    title: '1000 бодлого · Сорил 1-A',
    order: 1,
    grade: 12,
    freePreview: true,
  });
  const chIntegral = await upsertChapter({
    bookId: book200.id,
    title: 'Интеграл · Тест 1-A',
    order: 1,
    grade: 12,
    freePreview: true,
  });
  const chTrig = await upsertChapter({
    bookId: book200.id,
    title: 'Тригонометр тэгшитгэл · Тест 1-A',
    order: 2,
    grade: 12,
    freePreview: false,
  });

  const integralPath = `${FUTURE}/200x200 V2/Интеграл-1-OK.pdf`;
  const trigPath = `${FUTURE}/200x200 V2/Тригонометр-тэгшитгэл-1.pdf`;
  const thousandPath = `${FUTURE}/Явцын шалгалт/1000 бодлого Сорил-1A.pdf`;

  const integralText = readPdfText(integralPath);
  const trigText = readPdfText(trigPath);
  const thousandText = readPdfText(thousandPath);

  const integralAnswers = [
    'C',
    'E',
    'A',
    'D',
    'C',
    'B',
    'A',
    'D',
    'C',
    'A',
    'E',
    'C',
    'D',
    'C',
    'E',
  ];
  const trigAnswers = [
    'E',
    'D',
    'E',
    'C',
    'B',
    'E',
    'C',
    'A',
    'D',
    'A',
    'A',
    'B',
    'D',
    'B',
    'C',
    'A',
    'C',
    'A',
  ];

  const integralQuestions = splitCircledQuestions(
    between(integralText, 'Тест:1-A', 'Тест:1-B'),
    15,
  );
  const trigQuestions = splitCircledQuestions(
    between(trigText, 'Тест:1-A', 'Тест:1-B'),
    18,
  );
  const thousandChoice = splitBoldQuestions(
    thousandText.split('Хоёрдугаар хэсэг')[0] ?? thousandText,
    1,
    36,
  );
  const thousandFill = split1000FillQuestions(thousandText);

  const choices = ['A', 'B', 'C', 'D', 'E'];

  const integralProblems = [];
  for (const q of integralQuestions) {
    integralProblems.push(
      await upsertProblem({
        token: `200V2-INT1-${String(q.number).padStart(2, '0')}`,
        chapterId: chIntegral.id,
        number: q.number,
        format: 'CHOICE',
        statementText: q.text,
        choices,
        correctAnswer: integralAnswers[q.number - 1],
        points: 1,
        createdById: adminId,
        tags: [
          { type: 'SUBTOPIC', name: 'Интеграл' },
          { type: 'QUESTION_FORM', name: 'Эх функц олох' },
        ],
        formulas: ['Эх функцийн үндсэн дүрэм'],
      }),
    );
  }

  const trigProblems = [];
  for (const q of trigQuestions) {
    trigProblems.push(
      await upsertProblem({
        token: `200V2-TRIGEQ1-${String(q.number).padStart(2, '0')}`,
        chapterId: chTrig.id,
        number: q.number,
        format: 'CHOICE',
        statementText: q.text,
        choices,
        correctAnswer: trigAnswers[q.number - 1],
        points: 1,
        createdById: adminId,
        tags: [
          { type: 'SUBTOPIC', name: 'Тригонометр тэгшитгэл' },
          { type: 'METHOD', name: 'Ерөнхий шийд бичих' },
        ],
        formulas: ['sin x тэгшитгэлийн ерөнхий шийд'],
      }),
    );
  }

  const thousandProblems = [];
  for (const q of thousandChoice) {
    thousandProblems.push(
      await upsertProblem({
        token: `1000-S1A-${String(q.number).padStart(2, '0')}`,
        chapterId: ch1000.id,
        number: q.number,
        format: 'CHOICE',
        statementText: q.text,
        choices,
        correctAnswer: { manualReview: true },
        points: choicePointsFor1000(q.number),
        createdById: adminId,
        tags: [{ type: 'SUBTOPIC', name: '1000 бодлого сорил' }],
      }),
    );
  }
  for (const q of thousandFill) {
    const order = 36 + q.number;
    thousandProblems.push(
      await upsertProblem({
        token: `1000-S1A-II-${q.number}`,
        chapterId: ch1000.id,
        number: order,
        format: 'FILL_NUMBER',
        statementText: q.text,
        correctAnswer: { manualReview: true },
        points: 7,
        createdById: adminId,
        tags: [
          { type: 'SUBTOPIC', name: '1000 бодлого сорил' },
          { type: 'QUESTION_FORM', name: 'Нөхөх даалгавар' },
        ],
      }),
    );
  }

  await upsertTest({
    title: '200x200 V2 · Интеграл 1-A',
    type: 'CHAPTER_EXAM',
    gradingMode: 'AUTO',
    chapterId: chIntegral.id,
    timeLimitMin: 50,
    pdfKey: `future:${integralPath}`,
    groupKey: '200x200 V2 · Интеграл 1',
    variantLabel: 'A',
    createdById: adminId,
    problems: integralProblems,
    classroomIds,
  });

  await upsertTest({
    title: '200x200 V2 · Тригонометр тэгшитгэл 1-A',
    type: 'CHAPTER_EXAM',
    gradingMode: 'AUTO',
    chapterId: chTrig.id,
    timeLimitMin: 60,
    pdfKey: `future:${trigPath}`,
    groupKey: '200x200 V2 · Тригонометр тэгшитгэл 1',
    variantLabel: 'A',
    createdById: adminId,
    problems: trigProblems,
    classroomIds,
  });

  await upsertTest({
    title: '1000 бодлого · Сорил 1-A',
    type: 'EESH_MOCK',
    gradingMode: 'MANUAL',
    chapterId: ch1000.id,
    timeLimitMin: 100,
    pdfKey: `future:${thousandPath}`,
    groupKey: '1000 бодлого · Сорил 1',
    variantLabel: 'A',
    createdById: adminId,
    problems: thousandProblems,
    classroomIds,
  });

  console.log(
    `Future import: Интеграл ${integralProblems.length}, Тригонометр ${trigProblems.length}, 1000 сорил ${thousandProblems.length} бодлого.`,
  );
}

async function main() {
  const admin = await upsertUser({
    phone: '70000001',
    firstName: 'Админ',
    lastName: 'Удирдагч',
    role: 'ADMIN',
  });

  const teacher = await upsertUser({
    phone: '80000001',
    firstName: 'Туяа',
    lastName: 'Багш',
    role: 'TEACHER',
  });
  await prisma.teacherProfile.upsert({
    where: { userId: teacher.id },
    update: {},
    create: { userId: teacher.id, canManageStudents: false },
  });

  const teacherPlus = await upsertUser({
    phone: '80000002',
    firstName: 'Болд',
    lastName: 'Багш+',
    role: 'TEACHER_PLUS',
  });
  await prisma.teacherProfile.upsert({
    where: { userId: teacherPlus.id },
    update: { canManageStudents: true },
    create: { userId: teacherPlus.id, canManageStudents: true },
  });

  const student = await upsertUser({
    phone: '88112233',
    firstName: 'Сараа',
    lastName: 'Болд',
    role: 'STUDENT',
  });
  await prisma.studentProfile.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      type: 'CLASSROOM',
      grade: 12,
      activatedAt: new Date(),
      activationCode: 'seed',
    },
  });

  const onlineStudent = await upsertUser({
    phone: '88223344',
    firstName: 'Номин',
    lastName: 'Онлайн',
    role: 'STUDENT',
  });
  await prisma.studentProfile.upsert({
    where: { userId: onlineStudent.id },
    update: { type: 'ONLINE', grade: 12 },
    create: {
      userId: onlineStudent.id,
      type: 'ONLINE',
      grade: 12,
      activatedAt: new Date(),
      activationCode: 'online',
    },
  });

  await upsertUser({
    phone: '99112233',
    firstName: 'Бат',
    lastName: 'Дорж',
    role: 'BUYER',
  });

  let classroom = await prisma.classroom.findFirst({
    where: { name: 'Ахлах-12А' },
  });
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        name: 'Ахлах-12А',
        type: 'IN_PERSON',
        grade: 12,
        teacherId: teacher.id,
      },
    });
  }

  const active = await prisma.enrollment.findFirst({
    where: { studentId: student.id, leftAt: null },
  });
  if (!active) {
    await prisma.enrollment.create({
      data: { studentId: student.id, classroomId: classroom.id },
    });
  }

  let onlineClassroom = await prisma.classroom.findFirst({
    where: { name: 'Онлайн ЭЕШ' },
  });
  if (!onlineClassroom) {
    onlineClassroom = await prisma.classroom.create({
      data: {
        name: 'Онлайн ЭЕШ',
        type: 'ONLINE',
        grade: 12,
      },
    });
  }

  const activeOnline = await prisma.enrollment.findFirst({
    where: { studentId: onlineStudent.id, leftAt: null },
  });
  if (!activeOnline) {
    await prisma.enrollment.create({
      data: { studentId: onlineStudent.id, classroomId: onlineClassroom.id },
    });
  }

  await prisma.announcement.upsert({
    where: { id: 'seed-all-students-announcement' },
    update: {
      title: 'ЭЕШ сорилын demo тестүүд орлоо',
      body: '200x200 V2 Интеграл 1-A, Тригонометр тэгшитгэл 1-A болон 1000 бодлого Сорил 1-A тестүүдийг шалгалтын хэсгээс үзээрэй.',
      audience: 'ALL_STUDENTS',
      pinned: true,
      createdById: admin.id,
    },
    create: {
      id: 'seed-all-students-announcement',
      title: 'ЭЕШ сорилын demo тестүүд орлоо',
      body: '200x200 V2 Интеграл 1-A, Тригонометр тэгшитгэл 1-A болон 1000 бодлого Сорил 1-A тестүүдийг шалгалтын хэсгээс үзээрэй.',
      audience: 'ALL_STUDENTS',
      pinned: true,
      createdById: admin.id,
    },
  });

  await seedFutureContent({
    adminId: admin.id,
    classroomIds: [classroom.id, onlineClassroom.id],
  });

  await seed100x100V2Content({
    prisma,
    adminId: admin.id,
    classroomIds: [classroom.id, onlineClassroom.id],
  });

  console.log('Seed дууслаа: админ 70000001, багш 80000001, багш+ 80000002,');
  console.log('сурагч 88112233 (Ахлах-12А), онлайн сурагч 88223344, худалдан авагч 99112233');
  console.log('Бүх нууц үг = утасны дугаар');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    return prisma.$disconnect().then(() => process.exit(1));
  });
