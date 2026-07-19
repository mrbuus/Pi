/*
 * 300x300 бүрэн импорт — DOCX→pandoc→LaTeX (import-200-v2.cjs/reimport-latex.cjs загвар).
 *
 * Онцлог:
 *  - Эх фолдер: "300x300 V2" байвал түүнийг, үгүй бол "300x300"-ыг ашиглана.
 *    (SSD2 холбогдоогүй үед локал ~/new future/300x300 сервэрлэнэ — V2 биш,
 *    файлын нэрсийн формат бага зэрэг өөр: "{Сэдэв}-{N} d.docx" эсвэл
 *    дугааргүй "{Сэдэв} d.docx" — цөөн сэдэв дээр ганцхан файлд Тест зөвхөн :1 байна.)
 *  - Хариуны түлхүүр ФАЙЛ ОЛДООГҮЙ тул зөв хариу мэдэгдэхгүй — CHOICE бодлого бүрийн
 *    correctAnswer = { manualReview: true, reason: 'ANSWER_KEY_MISSING' }, ProblemAnalysis
 *    status = REVIEW_REQUIRED, answerKeyStatus = MISSING. Багш дараа нь зөв хариуг
 *    гараар (эсвэл тусдаа хариу-DOCX олдвол дараагийн script-ээр) тэмдэглэнэ.
 *  - Chapter: ШИНЭЭР ҮҮСГЭХГҮЙ — зөвхөн Book code='300'-ийн 16 Chapter-той нэрээр
 *    (зураас↔зай ялгаагүй normalize) тааруулна. Таарахгүй файлыг skippedFiles-д бичнэ.
 *  - Test: import-metadata-skeleton.cjs-ийн ҮҮСГЭСЭН 57 мөрийг нэрээр
 *    (`${Chapter.title} ${testNumber}`) олж TestProblem холбоно. Тухайн нэртэй Test
 *    ОЛДООГҮЙ бол (эх фолдерийн файлын тоо skeleton-той таарахгүй зөрүүнээс болж)
 *    skeleton-ийн ensureTest-тэй ИЖИЛ конвенцоор (type DAILY, gradingMode MANUAL,
 *    groupKey=Chapter.title) шинээр үүсгэнэ — эс тэгвэл тухайн файлын агуулга
 *    хаана ч холбогдох "гэр"-гүй үлдэнэ.
 *  - Нэг DOCX файл = Тест:N-A БА Тест:N-B хоёулаа агуулна (өөр өөр Variant биш,
 *    НЭГ Test slot) → хоёр variant-ийн бодлогуудыг НЭГ Test-д дараалуулан (A эхэлж,
 *    дараа нь B) холбоно (schema-д "57 EXISTING Test" гэсэн нэг мөр таарна).
 *    Token-д variant хадгалагдах тул A/B давхцахгүй.
 *  - Statement/choices тэнцвэргүй {}-тэй (parse бүтэлгүй) бол Problem огт
 *    ҮҮСГЭХГҮЙ (бичихгүй) — зөвхөн audit тайланд "review" болгож бүртгэнэ.
 *  - Идемпотент: Problem.token-оор upsert; ProblemChoice-г бодлого бүрт цэвэрлээд
 *    дахин үүсгэнэ; TestProblem-г Test бүрт цэвэрлээд дахин үүсгэнэ.
 *
 * Ажиллуулах:
 *   node prisma/import-300x300-full.cjs --dry-run
 *   node prisma/import-300x300-full.cjs
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC_CANDIDATES = [
  '/Volumes/SSD2/future/300x300 V2',
  '/Volumes/SSD2/future/300x300',
  path.join(process.env.HOME, 'new future', '300x300 V2'),
  path.join(process.env.HOME, 'new future', '300x300'),
  path.join(process.env.HOME, 'Desktop', 'future', '300x300'),
];
const SRC_DIR = SRC_CANDIDATES.find((d) => fs.existsSync(d));
const BOOK_CODE = '300';
const TOKEN_PREFIX = '300';
const REPORT = path.join(__dirname, 'reports', '300x300-import.json');

const DRY = process.argv.includes('--dry-run') || process.argv.includes('--dry');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);

// ───────────────────────── LaTeX/текст цэвэрлэгээ (reimport-latex.cjs-тэй ижил) ─────────

function circledToNumber(ch) {
  const c = ch.codePointAt(0);
  if (c >= 0x2460 && c <= 0x2473) return c - 0x2460 + 1; // ①-⑳ (1-20)
  if (c >= 0x3251 && c <= 0x325f) return c - 0x3251 + 21; // ㉑-㉟ (21-35)
  if (c >= 0x32b1 && c <= 0x32bf) return c - 0x32b1 + 36; // ㊱-㊿ (36-50)
  return null;
}
const CIRCLED = /[①-⑳㉑-㉟㊱-㊿]/;

function unwrapMathbf(s) {
  let prev;
  do {
    prev = s;
    s = s.replace(/\\mathbf\{([^{}]*)\}/g, '$1');
  } while (s !== prev);
  return s;
}

function normalizeBraces(input) {
  let s = input;
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

function mathToMixed(blob) {
  let s = normalizeBraces(unwrapMathbf(blob).replace(/\\ /g, ' ').replace(/~/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return '';
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
      let m = p.math.replace(/^[.,;]+|[.,;]+$/g, '').trim();
      if (m === '') return '';
      if (/^[-+]?[\d.,\s]+$/.test(m)) return m;
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

// Нэг variant-ийн markdown-аас бодлогуудыг задлана (choices-той бол choices[] буцаана)
function parseProblems(sectionMd, audit) {
  const flat = unwrapMathbf(
    sectionMd
      .replace(/!\[\]\([^)]*\)\{[^}]*\}/g, '\n')
      .replace(/\$+/g, ' ')
      .replace(/\*\*/g, ' '),
  ).replace(/\\ /g, ' ');

  const marks = [];
  for (const m of flat.matchAll(new RegExp(CIRCLED.source, 'g'))) {
    marks.push({ n: circledToNumber(m[0]), at: m.index });
  }
  const problems = [];
  for (let i = 0; i < marks.length; i++) {
    const chunk = flat.slice(marks[i].at + 1, i + 1 < marks.length ? marks[i + 1].at : undefined);
    const number = marks[i].n;
    const body = chunk.replace(/^[\s.]+/, '');
    const markerRe = /\\left\(\s*([A-EА-Е])\s*\\right\)\s*\.?/g;
    const found = [...body.matchAll(markerRe)];
    if (found.length >= 2) {
      const statement = body.slice(0, found[0].index).replace(/^[.\s]+/, '');
      const choices = found.map((m, j) => {
        const from = m.index + m[0].length;
        const to = j + 1 < found.length ? found[j + 1].index : body.length;
        return mathToMixed(body.slice(from, to));
      });
      problems.push({ number, statement: mathToMixed(statement), choices });
    } else {
      problems.push({
        number,
        statement: mathToMixed(body.replace(/^[.\s]+/, '')),
        choices: null,
      });
    }
  }
  if (marks.length === 0) audit.push('Дугуйлсан дугаар олдсонгүй');
  return problems;
}

function runPandoc(file) {
  return execFileSync('pandoc', [file, '-t', 'markdown+tex_math_dollars', '--wrap=none'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).replace(/\*\*/g, '');
}

// Файл бүр Тест:N-A БА Тест:N-B хоёр variant агуулна гэж үзнэ. Заримдаа (цөөн
// файлд) "Тест:N-A" гэсэн толгой нь Word text-box дотор байрладаг тул pandoc
// огт уншдаггүй (мэдэгдэж буй pandoc хязгаарлалт — txbxContent-ийг алгасдаг).
// Ийм үед толгой олдохгүй тул ганц урсгал болгон бүх бодлогыг зарлаж, дугуйлсан
// дугаар ДАХИН ЭХЭЛСЭН (буурсан) цэгээр A/B хоёр variant-д хуваана (fallback).
// Дугуйлсан дугаар БУУРСАН цэг бүрээр (жиш ⑮ дараа ①) хэсгүүдэд хуваана —
// нэг variant-ийн доторх ХОЁРДАХЬ толгой (B) текст-бокс дотор байгаад
// pandoc-д алга болсон үед ашиглагдана (доор ерөнхий post-process болгож
// БҮХ variant дээр давхар хэрэглэнэ — зөвхөн бүрэн толгойгүй файлд ч биш).
function splitByReset(problems) {
  const chunks = [];
  let start = 0;
  for (let i = 0; i < problems.length - 1; i++) {
    if (problems[i + 1].number < problems[i].number) {
      chunks.push(problems.slice(start, i + 1));
      start = i + 1;
    }
  }
  chunks.push(problems.slice(start));
  return chunks.filter((c) => c.length);
}

function parseDocxToVariants(file, testNumber) {
  const md = runPandoc(file);
  const headerRe = /Тест\s*[:：]?\s*(\d+)\s*[-–—]\s*([ABАВ])/g;
  const headers = [...md.matchAll(headerRe)];
  const issues = [];
  let rawVariants = []; // {variant, problems} — толгой ХАРАГДСАН хэсгүүд (текст-бокс дундах B-г ялгаагүй байж болно)
  let usedHeaderSplit = false;

  if (headers.length > 0) {
    usedHeaderSplit = true;
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const variant = h[2] === 'А' ? 'A' : h[2] === 'В' ? 'B' : h[2];
      const secMd = md.slice(h.index, i + 1 < headers.length ? headers[i + 1].index : undefined);
      if (Number(h[1]) !== testNumber) {
        issues.push({ variant, issue: `Файлын дугаар ${testNumber} ≠ толгойн ${h[1]}` });
      }
      const audit = [];
      const problems = parseProblems(secMd, audit);
      for (const a of audit) issues.push({ variant, issue: a });
      rawVariants.push({ variant, problems });
    }
  } else {
    // Толгой ЕРӨНХИЙ олдоогүй (магадгүй text-box) — бүх баримтыг нэг урсгал
    // болгон уншина, дараах ерөнхий reset-split үе шатанд A/B-д хуваагдана.
    const audit = [];
    const flat = parseProblems(md, audit);
    for (const a of audit) issues.push({ variant: null, issue: `[толгойгүй] ${a}` });
    rawVariants.push({ variant: 'A', problems: flat });
    issues.push({ variant: null, issue: 'Толгой (Тест:N-A/B) огт олдоогүй (магадгүй text-box)' });
  }

  // Ерөнхий post-process: variant бүрийн дотор дугуйлсан дугаар дахин
  // эхэлсэн (буурсан) цэг байвал — энэ нь удаа B-ийн толгой мөн текст-бокс
  // дотор алдагдсаныг илтгэнэ — тул тэр цэгээр цааш хуваана.
  const usedLabels = new Set(rawVariants.map((v) => v.variant));
  const variants = [];
  for (const v of rawVariants) {
    const chunks = splitByReset(v.problems);
    if (chunks.length <= 1) {
      variants.push(v);
      continue;
    }
    issues.push({
      variant: v.variant,
      issue: `"${v.variant}" доторх дугуйлсан дугаар ${chunks.length} удаа дахин эхэлсэн (толгой text-box-д алдагдсан) — задалж таслав`,
    });
    let first = true;
    for (const chunk of chunks) {
      if (first) {
        variants.push({ variant: v.variant, problems: chunk });
        first = false;
        continue;
      }
      let label = ['A', 'B', 'C', 'D', 'E', 'F'].find((cand) => !usedLabels.has(cand));
      if (!label) label = `X${variants.length}`;
      usedLabels.add(label);
      variants.push({ variant: label, problems: chunk });
    }
  }

  return { variants, issues, fallback: !usedHeaderSplit };
}

// ───────────────────────── Файлын нэр → сэдэв/дугаар ─────────────────────────

// "Аналитик-геометр-1 d" → {topicRaw:"Аналитик-геометр", number:1}
// "Бином-задаргаа d" (дугааргүй) → {topicRaw:"Бином-задаргаа", number:1}
function parseFilename300(file) {
  const base = file.replace(/\.docx$/i, '').normalize('NFC').trim();
  const stripped = base.replace(/\s+d$/i, '');
  const m = stripped.match(/^(.+?)[-\s]+(\d+)$/u);
  if (m) return { topicRaw: m[1].trim(), number: Number(m[2]) };
  return { topicRaw: stripped, number: 1 };
}

function normalizeTopic(s) {
  return s
    .normalize('NFC')
    .replace(/[-\s]+/g, ' ')
    .trim()
    .toLowerCase();
}

// Кирилл→латин transliteration (import-200-v2.cjs-тэй ижил) — token slug-д хэрэглэнэ
const TRANSLIT = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'YO', Ж: 'J', З: 'Z', И: 'I',
  Й: 'I', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', Ө: 'O', П: 'P', Р: 'R', С: 'S',
  Т: 'T', У: 'U', Ү: 'U', Ф: 'F', Х: 'H', Ц: 'TS', Ч: 'CH', Ш: 'SH', Щ: 'SCH',
  Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'YU', Я: 'YA',
};
function slugify(title) {
  const upper = title.toLocaleUpperCase('mn');
  return [...upper]
    .map((ch) => (ch === ' ' ? '_' : TRANSLIT[ch] ?? ''))
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function listSourceFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(
      (f) =>
        f.toLowerCase().endsWith('.docx') &&
        !f.startsWith('~$') &&
        !f.startsWith('._') &&
        !f.includes('хариу'),
    )
    .map((f) => f.normalize('NFC'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

// ───────────────────────── Plan (DB-гүй, --dry-run дээр ч ажиллана) ─────────────────

function buildPlan(chapters) {
  // chapters: [{id, title}] — Book code=300-ийн 16 Chapter (DB-ээс уншсан)
  const chapterByNorm = new Map(chapters.map((c) => [normalizeTopic(c.title), c]));

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDir: SRC_DIR,
    dryRun: DRY,
    totals: {
      filesTotal: 0,
      filesProcessed: 0,
      filesSkipped: 0,
      problems: 0,
      choiceProblems: 0,
      openProblems: 0,
      problemChoices: 0,
      reviewRequired: 0, // амжилттай parse хийгдсэн ч хариу тодорхойгүй тул REVIEW (DB-д бичигдэнэ)
      parseFailedSkipped: 0, // statement тэнцвэргүй/хоосон тул огт бичигдээгүй
      testsMatchedExisting: 0,
      testsWillCreate: 0,
      fallbackHeaderSplit: 0,
    },
    skippedFiles: [],
    parseIssues: [],
    reviewRequired: [],
    perFile: [],
    samples: [],
  };

  if (!SRC_DIR) {
    report.skippedFiles.push({ file: null, reason: `Эх фолдер олдсонгүй: ${SRC_CANDIDATES.join(' | ')}` });
    return { files: [], report };
  }

  let files = listSourceFiles(SRC_DIR);
  if (ONLY) files = files.filter((f) => f.startsWith(ONLY));
  report.totals.filesTotal = files.length;

  const planFiles = [];
  for (const file of files) {
    const { topicRaw, number: testNumber } = parseFilename300(file);
    const chapter = chapterByNorm.get(normalizeTopic(topicRaw));
    if (!chapter) {
      report.skippedFiles.push({ file, reason: `Chapter тохирсонгүй: "${topicRaw}"` });
      report.totals.filesSkipped += 1;
      continue;
    }

    let variants, parseIssues;
    try {
      const result = parseDocxToVariants(path.join(SRC_DIR, file), testNumber);
      variants = result.variants;
      parseIssues = result.issues;
      if (result.fallback) report.totals.fallbackHeaderSplit = (report.totals.fallbackHeaderSplit ?? 0) + 1;
    } catch (e) {
      report.skippedFiles.push({ file, reason: `pandoc алдаа: ${e.message.slice(0, 150)}` });
      report.totals.filesSkipped += 1;
      continue;
    }
    for (const issue of parseIssues) report.parseIssues.push({ file, variant: issue.variant, issue: issue.issue });
    if (!variants.length) {
      report.skippedFiles.push({ file, reason: 'Бодлого огт задрахгүй байна (толгой ч, дугуйлсан дугаар ч олдсонгүй)' });
      report.totals.filesSkipped += 1;
      continue;
    }

    const testTitle = `${chapter.title} ${testNumber}`;
    const chapterSlug = slugify(chapter.title);
    const fileProblems = []; // variant дараалалтайгаар (A эхэлж дараа нь B)

    for (const sec of variants) {
      const parsed = sec.problems;

      for (const p of parsed) {
        const token = `${TOKEN_PREFIX}-${chapterSlug}-${String(testNumber).padStart(2, '0')}-${sec.variant}-${String(p.number).padStart(2, '0')}`;
        const okStatement = p.statement.length > 3 && isBalancedMixed(p.statement);
        const okChoices =
          Array.isArray(p.choices) &&
          p.choices.length === 5 &&
          p.choices.every((c) => c.length > 0 && isBalancedMixed(c));

        if (!okStatement) {
          report.totals.parseFailedSkipped += 1;
          report.reviewRequired.push({ token, file, variant: sec.variant, reason: 'statement хоосон/тэнцвэргүй (БИЧИГДЭЭГҮЙ)' });
          continue;
        }

        let format;
        let choices = null;
        let choiceRows = null;
        const audits = [];
        if (okChoices) {
          format = 'CHOICE';
          choices = p.choices;
          const labels = ['A', 'B', 'C', 'D', 'E'];
          choiceRows = labels.map((label, i) => ({
            label,
            text: p.choices[i],
            isCorrect: false,
            order: i + 1,
          }));
          audits.push('Хариуны түлхүүр байхгүй тул зөв хариу тодорхойгүй.');
        } else if (Array.isArray(p.choices) && p.choices.length) {
          format = 'OPEN';
          audits.push(`Сонголт бүрэн бус (${p.choices.length}) — гараар шалгах.`);
        } else {
          format = 'OPEN';
          audits.push('Сонголтын маркер олдсонгүй (нөхөх/задгай бодлого байж болзошгүй).');
        }

        report.totals.reviewRequired += 1;
        fileProblems.push({
          token,
          number: p.number,
          variant: sec.variant,
          format,
          statementText: p.statement,
          choices,
          choiceRows,
          correctAnswer: { manualReview: true, reason: 'ANSWER_KEY_MISSING' },
          audits,
          sourcePath: path.join(SRC_DIR, file),
        });
      }
    }

    // Нэг файлд ижил token (variant дотор ижил дугуйлсан дугаар давхцах) гарвал
    // TestProblem дээр unique constraint эвдэнэ — тул эхнийхийг нь үлдээж
    // давхардлыг арилгаад audit-д тэмдэглэнэ (эх DOCX-д алдаатай давхар дугаарлалт
    // байж болзошгүй тул диагностик болгож үлдээв).
    const seenTokens = new Set();
    const dedupedProblems = [];
    for (const p of fileProblems) {
      if (seenTokens.has(p.token)) {
        report.parseIssues.push({ file, variant: p.variant, issue: `Давхардсан дугаар/token (алгассан): ${p.token}` });
        continue;
      }
      seenTokens.add(p.token);
      dedupedProblems.push(p);
    }
    fileProblems.length = 0;
    fileProblems.push(...dedupedProblems);

    for (const p of fileProblems) {
      report.totals.problems += 1;
      if (p.format === 'CHOICE') {
        report.totals.choiceProblems += 1;
        report.totals.problemChoices += p.choiceRows.length;
      } else {
        report.totals.openProblems += 1;
      }
    }
    if (report.samples.length < 8) {
      const s = fileProblems.find((p) => p.format === 'CHOICE');
      if (s) report.samples.push({ token: s.token, testTitle, statement: s.statementText, choices: s.choices });
    }

    report.totals.filesProcessed += 1;
    report.perFile.push({
      file,
      chapter: chapter.title,
      testTitle,
      testNumber,
      variants: variants.map((s) => s.variant),
      problems: fileProblems.length,
    });

    planFiles.push({ file, chapter, testTitle, testNumber, chapterSlug, problems: fileProblems });
  }

  return { files: planFiles, report };
}

// ───────────────────────── DB импорт ─────────────────────────

async function upsertProblem(prisma, chapterId, adminId, p) {
  const problem = await prisma.problem.upsert({
    where: { token: p.token },
    update: {
      chapterId,
      number: p.number,
      format: p.format,
      statementText: p.statementText,
      choices: p.choices ?? undefined,
      correctAnswer: p.correctAnswer,
      points: 1,
    },
    create: {
      token: p.token,
      chapterId,
      number: p.number,
      format: p.format,
      statementText: p.statementText,
      choices: p.choices ?? undefined,
      correctAnswer: p.correctAnswer,
      points: 1,
      createdById: adminId,
    },
  });

  await prisma.problemChoice.deleteMany({ where: { problemId: problem.id } });
  if (p.choiceRows && p.choiceRows.length) {
    await prisma.problemChoice.createMany({
      data: p.choiceRows.map((cr) => ({
        problemId: problem.id,
        label: cr.label,
        text: cr.text,
        isCorrect: cr.isCorrect,
        order: cr.order,
      })),
    });
  }

  await prisma.problemAnalysis.upsert({
    where: { problemId: problem.id },
    update: {
      status: 'REVIEW_REQUIRED',
      answerKeyStatus: 'MISSING',
      confidence: 0.6,
      sourcePath: p.sourcePath,
      sourceVariant: p.variant,
      topic: p.chapterTitle,
      subtopic: p.chapterTitle,
      auditNotes: p.audits,
    },
    create: {
      problemId: problem.id,
      status: 'REVIEW_REQUIRED',
      answerKeyStatus: 'MISSING',
      confidence: 0.6,
      sourcePath: p.sourcePath,
      sourceVariant: p.variant,
      topic: p.chapterTitle,
      subtopic: p.chapterTitle,
      skills: [],
      methods: [],
      formulas: [],
      domainNotes: [],
      signRules: [],
      commonMistakes: [],
      auditNotes: p.audits,
    },
  });

  return problem;
}

async function importPlan(prisma, planFiles, adminId, report) {
  for (const pf of planFiles) {
    let test = await prisma.test.findFirst({ where: { chapterId: pf.chapter.id, title: pf.testTitle } });
    if (test) {
      report.totals.testsMatchedExisting += 1;
    } else {
      report.totals.testsWillCreate += 1;
      test = await prisma.test.create({
        data: {
          title: pf.testTitle,
          type: 'DAILY',
          gradingMode: 'MANUAL',
          chapterId: pf.chapter.id,
          groupKey: pf.chapter.title,
          createdById: adminId,
        },
      });
    }

    const dbProblems = [];
    for (const p of pf.problems) {
      const problem = await upsertProblem(prisma, pf.chapter.id, adminId, {
        ...p,
        chapterTitle: pf.chapter.title,
      });
      dbProblems.push(problem);
    }

    // Аюулгүйн нэмэлт хамгаалалт: ижил problem.id хоёр удаа орсон бол
    // (token dedupe хийгдсэн ч, prisma upsert-ийн буцаасан id давхцвал) эхнийхийг үлдээнэ
    const seenIds = new Set();
    const uniqueDbProblems = dbProblems.filter((p) => (seenIds.has(p.id) ? false : (seenIds.add(p.id), true)));

    await prisma.testProblem.deleteMany({ where: { testId: test.id } });
    if (uniqueDbProblems.length) {
      await prisma.testProblem.createMany({
        data: uniqueDbProblems.map((problem, index) => ({
          testId: test.id,
          problemId: problem.id,
          order: index + 1,
          points: 1,
        })),
      });
    }
  }
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
}

async function main() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    const book = await prisma.book.findUnique({ where: { code: BOOK_CODE } });
    if (!book) throw new Error(`Book code=${BOOK_CODE} олдсонгүй`);
    const chapters = await prisma.chapter.findMany({
      where: { bookId: book.id },
      select: { id: true, title: true },
    });

    const { files: planFiles, report } = buildPlan(chapters);

    if (DRY) {
      // Уншихад (write хийхгүйгээр) Test олдох эсэх — бодит ажиллуулахад хэдэн
      // мөр шинээр үүсэхийг урьдчилж харах (sanity check).
      for (const pf of planFiles) {
        const existing = await prisma.test.findFirst({ where: { chapterId: pf.chapter.id, title: pf.testTitle } });
        if (existing) report.totals.testsMatchedExisting += 1;
        else report.totals.testsWillCreate += 1;
      }
      writeReport(report);
      console.log('=== DRY RUN (DB рүү бичихгүй) ===');
      console.log(JSON.stringify(report.totals, null, 2));
      console.log('skippedFiles:', report.skippedFiles.length);
      console.log('parseIssues:', report.parseIssues.length);
      if (report.samples[0]) {
        console.log('\n--- ЖИШЭЭ ---');
        console.log(JSON.stringify(report.samples[0], null, 1));
      }
      console.log('\nТайлан:', REPORT);
      return;
    }

    const admin = await prisma.user.findUnique({ where: { phone: '70000001' } });
    if (!admin) throw new Error('Админ хэрэглэгч (70000001) олдсонгүй');

    await importPlan(prisma, planFiles, admin.id, report);

    writeReport(report);
    console.log('=== ИМПОРТ ДУУСЛАА ===');
    console.log(JSON.stringify(report.totals, null, 2));
    console.log('Тайлан:', REPORT);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
