/*
 * LaTeX дахин импорт (Шийдвэр 1) — DOCX→pandoc→LaTeX.
 *
 * PDF-ээс текст хуулахад илтгэгч/бутархай устдаг байсныг DOCX-ийн OMML
 * томьёогоор бүрэн сэргээнэ. Бодлого бүрийг token-оор нь тулгаж:
 *   - statementText → текст + $LaTeX$ холимог
 *   - choices → жинхэнэ утгууд (placeholder ["A".."E"]-г солино)
 * correctAnswer-т ХҮРЭХГҮЙ: сонголтууд A–E дарааллаараа хадгалагдах тул
 * үсэг↔индекс харгалзаа хэвээр. Парс бүтэлгүй бодлого REVIEW_REQUIRED болно.
 *
 * Ажиллуулах:  node prisma/reimport-latex.cjs [--dry] [--file=Илтгэгч-тэгшитгэл-1]
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// Үндсэн эх: гадаад SSD; салчихсан үед локал хуулбараар ажиллана (агуулга ижил)
const SRC_CANDIDATES = [
  '/Volumes/SSD2/future/100x100 V2',
  path.join(process.env.HOME, 'new future', '100x100 V2'),
];
const SRC_DIR = SRC_CANDIDATES.find((d) => fs.existsSync(d));
if (!SRC_DIR) {
  console.error('Эх фолдер олдсонгүй:', SRC_CANDIDATES.join(' | '));
  process.exit(1);
}
const REPORT = path.join(__dirname, 'reports', 'latex-reimport.json');
const DRY = process.argv.includes('--dry');
const ONLY = (process.argv.find((a) => a.startsWith('--file=')) || '').slice(7);

// import-100x100-v2.cjs-тэй ЯГ ижил slug map — token-ууд таарах ёстой.
// Богино угтварууд ХАМГИЙН СҮҮЛД — урт нь түрүүлж таарах ёстой.
const TOPICS = [
  { filePrefix: 'Тоо-тоолол', slug: 'TOO' },
  { filePrefix: 'Модультай-тэгшитгэл', slug: 'ABSEQ' },
  { filePrefix: 'Модультай-тэнцэтгэл-биш', slug: 'ABSINEQ' },
  { filePrefix: 'Иррациональ-тэгшитгэл', slug: 'IRREQ' },
  { filePrefix: 'Иррациональ-тэнцэтгэл-биш', slug: 'IRRINEQ' },
  { filePrefix: 'Илтгэгч-тэгшитгэл', slug: 'EXPEQ' },
  { filePrefix: 'Илтгэгч-тэнцэтгэл-биш', slug: 'EXPINEQ' },
  { filePrefix: 'Логарифм-илэрхийлэл', slug: 'LOGEXP' },
  { filePrefix: 'Логарифм-тэгшитгэл', slug: 'LOGEQ' },
  { filePrefix: 'Логарифм-тэнцэтгэл-биш', slug: 'LOGINEQ' },
  { filePrefix: 'Тэгшитгэл', slug: 'RATEQ' },
  { filePrefix: 'Тэнцэтгэл-биш', slug: 'RATINEQ' },
];

// ①..㊿ дугуйлсан тоог энгийн тоо болгох
function circledToNumber(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0x2460 && c <= 0x2473) return c - 0x2460 + 1; // ①-⑳ (1-20)
  if (c >= 0x3251 && c <= 0x325f) return c - 0x3251 + 21; // ㉑-㉟ (21-35)
  if (c >= 0x32b1 && c <= 0x32bf) return c - 0x32b1 + 36; // ㊱-㊿ (36-50)
  return null;
}
const CIRCLED = /[①-⑳㉑-㉟㊱-㊿]/;

// \mathbf{...} боодлыг тайлна (загварын bold — утгын ялгаагүй)
function unwrapMathbf(s) {
  let prev;
  do {
    prev = s;
    s = s.replace(/\\mathbf\{([^{}]*)\}/g, '$1');
  } while (s !== prev);
  return s;
}

// Хаалтын эмх цэгц: (1) тэнцвэргүй {,}-г устгана (chunk хэрчилтийн үлдэгдэл),
// (2) кирилл текст АГУУЛСАН бүлгийн хаалтыг уусгана — OMML заримдаа бүтэн
// өгүүлбэрийг {...} дотор боодог тул кирилл үгээр таслахад баланс алдагддаг байсан.
function normalizeBraces(input) {
  let s = input;
  // 1. Тэнцвэргүй хаалтуудыг олж устгана
  const drop = new Set();
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') stack.push(i);
    else if (s[i] === '}') {
      if (stack.length) stack.pop();
      else drop.add(i);
    }
  }
  for (const i of stack) drop.add(i);
  if (drop.size) s = [...s].filter((_, i) => !drop.has(i)).join('');
  // 2. Кирилл агуулсан бүлгүүдийг (дотроос гадагш) уусгана
  let changed = true;
  while (changed) {
    changed = false;
    const st = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '{') st.push(i);
      else if (s[i] === '}') {
        const o = st.pop();
        if (o === undefined) continue;
        const inner = s.slice(o + 1, i);
        if (/[Ѐ-ӿ]/.test(inner)) {
          s = s.slice(0, o) + ' ' + inner + ' ' + s.slice(i + 1);
          changed = true;
          break;
        }
      }
    }
  }
  return s;
}

// Эцсийн шалгалт: $ тоо тэгш, { } тэнцвэртэй байх ёстой — үгүй бол REVIEW
function isBalancedMixed(str) {
  if ((str.match(/\$/g) ?? []).length % 2 !== 0) return false;
  let depth = 0;
  for (const c of str) {
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}

// LaTeX blob доторх монгол үг/өгүүлбэрийг текст болгож салгана:
// "2^{x} = 8 тэгшитгэлийг бод." → "$2^{x} = 8$ тэгшитгэлийг бод."
function mathToMixed(blob) {
  let s = normalizeBraces(
    unwrapMathbf(blob).replace(/\\ /g, ' ').replace(/~/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
  // Кирилл үсэг агуулсан үгийн урсгалыг (дагалдах цэг таслалтай нь) текст гэж үзнэ
  const re = /[Ѐ-ӿ][Ѐ-ӿ‐-― ,.!?;:-]*/g;
  const parts = [];
  let last = 0;
  for (const m of s.matchAll(re)) {
    const math = s.slice(last, m.index).trim();
    if (math) parts.push({ math });
    parts.push({ text: m[0].trim() });
    last = m.index + m[0].length;
  }
  const tail = s.slice(last).trim();
  if (tail) parts.push({ math: tail });

  return parts
    .map((p) => {
      if (p.text !== undefined) return p.text;
      // Зөвхөн тоо/цэг бол LaTeX шаардлагагүй — энгийн текстээр
      let m = p.math.replace(/^[.,;]+|[.,;]+$/g, '').trim();
      if (m === '') return '';
      if (/^[-+]?[\d.,\s]+$/.test(m)) return m;
      // Word-д энгийн текстээр бичигдсэн функцын нэрийг LaTeX команд болгоно
      // (log→\log): KaTeX босоо, зөв зайтай рендерлэнэ. Урт нэр түрүүлж таарна.
      m = m.replace(
        /(^|[^\\a-zA-Z])(arcsin|arccos|arctan|arctg|arcctg|sinh|cosh|sin|cos|tan|ctg|tg|cot|log|lg|ln|min|max)(?![a-zA-Z])/g,
        '$1\\$2',
      );
      return `$${m}$`;
    })
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();
}

// Нэг тестийн (нэг хувилбарын) markdown хэсгээс бодлогуудыг задлана
function parseProblems(sectionMd, audit) {
  // image1.png = бодлого хоорондын зураас; бусад зураг = жинхэнэ дүрс
  const hasFigure = /media\/image(?!1\.png)/.test(sectionMd);
  // \mathbf боодлыг ЭХЛЭЭД бүтэн текст дээр тайлна — дугуйлсан тоогоор хэрчихэд
  // тэнцвэргүй хаалт үлдэхээс сэргийлнэ
  const flat = unwrapMathbf(
    sectionMd
      .replace(/!\[\]\([^)]*\)\{[^}]*\}/g, '\n')
      // $$ болон ДАН $ хоёуланг нь устгана — pandoc богино томьёог inline
      // $...$-ээр гаргадаг тул дан $ үлдвэл давхар боолт үүсч баланс алдагдана
      .replace(/\$+/g, ' ')
      .replace(/\*\*/g, ' '),
  ).replace(/\\ /g, ' '); // `\ ` (LaTeX зай) → энгийн зай: маркер таарахад саад болдог

  const marks = [];
  for (const m of flat.matchAll(new RegExp(CIRCLED.source, 'g'))) {
    marks.push({ n: circledToNumber(m[0]), at: m.index });
  }
  const problems = [];
  for (let i = 0; i < marks.length; i++) {
    const chunk = flat.slice(marks[i].at + 1, i + 1 < marks.length ? marks[i + 1].at : undefined);
    const number = marks[i].n;
    // Дугаарын араас үлдсэн "." болон `\ ` зайг цэвэрлэнэ
    // Зөвхөн цэг/зай хасна — backslash хасвал `\frac` мэт командын эхийг иддэг!
    const body = chunk.replace(/^[\s.]+/, '');
    // Сонголтын маркерууд: \left( A \right). хэлбэр (unwrap-ийн дараа)
    const markerRe = /\\left\(\s*([A-EА-Е])\s*\\right\)\s*\.?/g;
    const found = [...body.matchAll(markerRe)];
    if (found.length >= 2) {
      const statement = body.slice(0, found[0].index).replace(/^[.\s]+/, '');
      const choices = found.map((m, j) => {
        const from = m.index + m[0].length;
        const to = j + 1 < found.length ? found[j + 1].index : body.length;
        return mathToMixed(body.slice(from, to));
      });
      problems.push({ number, statement: mathToMixed(statement), choices, hasFigure });
    } else {
      // Сонголтгүй (нөхөх/задгай) — зөвхөн бодлогын текст
      problems.push({
        number,
        statement: mathToMixed(body.replace(/^[.\s]+/, '')),
        choices: null,
        hasFigure,
      });
    }
  }
  if (marks.length === 0) audit.push('Дугуйлсан дугаар олдсонгүй');
  return problems;
}

// Нэг DOCX = хэд хэдэн тест-хувилбар (Тест:1-A, Тест:1-B …)
function parseDocx(file) {
  // ** (bold) тэмдэглэгээг эхэлж арилгана — зарим файлд "Тест:1**-**A" гэж
  // толгойн дундуур орсон байдаг тул header regex таарахгүй болгодог
  const md = execFileSync('pandoc', [file, '-t', 'markdown+tex_math_dollars', '--wrap=none'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).replace(/\*\*/g, '');
  const headerRe = /Тест\s*[:：]?\s*(\d+)\s*[-–—]\s*([ABАВ])/g;
  const headers = [...md.matchAll(headerRe)];
  const sections = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const variant = h[2] === 'А' ? 'A' : h[2] === 'В' ? 'B' : h[2]; // кирилл → латин
    sections.push({
      testNumber: Number(h[1]),
      variant,
      md: md.slice(h.index, i + 1 < headers.length ? headers[i + 1].index : undefined),
    });
  }
  return sections;
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const files = fs
    .readdirSync(SRC_DIR)
    // ._* = macOS AppleDouble (гадаад дискний хиймэл файл), ~$* = Word-ийн түр файл
    .filter(
      (f) =>
        f.endsWith('.docx') &&
        !f.startsWith('~$') &&
        !f.startsWith('._') &&
        !f.includes('хариу'),
    )
    .filter((f) => !ONLY || f.startsWith(ONLY))
    .sort();

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDir: SRC_DIR,
    dryRun: DRY,
    files: files.length,
    updatedChoices: 0,
    updatedStatementOnly: 0,
    notFoundInDb: [],
    parseIssues: [],
    reviewRequired: [],
    samples: [],
  };

  for (const file of files) {
    // Файлын нэрээс сэдэв + тестийн дугаар (хамгийн урт угтвар түрүүлж таарна).
    // macOS файлын нэрийг NFD-ээр хадгалдаг тул NFC болгож тулгана (й, ё…)
    const base = file.replace(/\.docx$/, '').normalize('NFC');
    const topic = TOPICS.find((t) => base.startsWith(t.filePrefix));
    const numMatch = base.match(/(\d+)\s*$/);
    if (!topic || !numMatch) {
      report.parseIssues.push({ file, issue: 'Сэдэв/дугаар танигдсангүй' });
      continue;
    }
    const testNumber = Number(numMatch[1]);

    let sections;
    try {
      sections = parseDocx(path.join(SRC_DIR, file));
    } catch (e) {
      report.parseIssues.push({ file, issue: `pandoc алдаа: ${e.message.slice(0, 120)}` });
      continue;
    }
    if (sections.length === 0) {
      report.parseIssues.push({ file, issue: 'Тестийн толгой (Тест:N-A/B) олдсонгүй' });
      continue;
    }

    for (const sec of sections) {
      if (sec.testNumber !== testNumber) {
        report.parseIssues.push({
          file,
          issue: `Файлын дугаар ${testNumber} ≠ толгойн ${sec.testNumber}`,
        });
      }
      const audit = [];
      const problems = parseProblems(sec.md, audit);
      for (const issue of audit) report.parseIssues.push({ file, variant: sec.variant, issue });

      for (const p of problems) {
        const token = `100V2-${topic.slug}-${String(testNumber).padStart(2, '0')}-${sec.variant}-${String(p.number).padStart(2, '0')}`;
        const existing = await prisma.problem.findUnique({
          where: { token },
          select: { id: true, format: true },
        });
        if (!existing) {
          report.notFoundInDb.push(token);
          continue;
        }

        const okChoices =
          p.choices &&
          p.choices.length === 5 &&
          p.choices.every((c) => c.length > 0 && isBalancedMixed(c));
        const okStatement = p.statement.length > 3 && isBalancedMixed(p.statement);

        if (report.samples.length < 6 && okChoices) {
          report.samples.push({ token, statement: p.statement, choices: p.choices });
        }

        if (!okStatement || (existing.format === 'CHOICE' && !okChoices)) {
          report.reviewRequired.push({
            token,
            reason: !okStatement ? 'statement хоосон' : `сонголт ${p.choices?.length ?? 0}`,
          });
          if (!DRY) {
            await prisma.problemAnalysis.updateMany({
              where: { problemId: existing.id },
              data: { status: 'REVIEW_REQUIRED' },
            });
          }
          continue;
        }

        if (!DRY) {
          await prisma.problem.update({
            where: { id: existing.id },
            data: {
              statementText: p.statement,
              ...(existing.format === 'CHOICE' && okChoices ? { choices: p.choices } : {}),
            },
          });
        }
        if (existing.format === 'CHOICE' && okChoices) report.updatedChoices += 1;
        else report.updatedStatementOnly += 1;
      }
    }
  }

  // Нэршил цэвэрлэгээ (Шийдвэр 5): "100x100 V2 · " угтвар, "-A/-B" төгсгөлийг
  // Test.title-аас хасна (variantLabel тусдаа хадгалагддаг)
  if (!DRY && !ONLY) {
    const cleaned = await prisma.$executeRawUnsafe(`
      UPDATE "Test" SET
        title = regexp_replace(regexp_replace(title, '^100x100 V2 · ', ''), '-[AB]$', ''),
        "groupKey" = regexp_replace("groupKey", '^100x100 V2 · ', '')
      WHERE title LIKE '100x100 V2 ·%'`);
    report.testsRenamed = cleaned;
  }

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        files: report.files,
        updatedChoices: report.updatedChoices,
        updatedStatementOnly: report.updatedStatementOnly,
        notFound: report.notFoundInDb.length,
        review: report.reviewRequired.length,
        issues: report.parseIssues.length,
        testsRenamed: report.testsRenamed ?? 0,
      },
      null,
      2,
    ),
  );
  if (report.samples[0]) {
    console.log('\n--- ЖИШЭЭ ---');
    console.log(report.samples[0].statement);
    console.log(JSON.stringify(report.samples[0].choices, null, 1));
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
