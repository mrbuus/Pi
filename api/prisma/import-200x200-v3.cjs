/*
 * 200x200 V3 импорт — import-200-v2.cjs-ийн хуулбар, V3 эх (эзний шийдвэр 2026-10-13:
 * «үргэлж V3-ийг ашиглана»). V2-оос ялгаа:
 *  - Эх: ~/Desktop/Books/200x200 V3. Хариу A, B тусдаа файл (200x200-ХАРИУ-A.docx, -В .docx).
 *  - Файлын нэр «Интеграл-1.tulgah.docx» (дагавартай), «Дифференциал-хурд-хурдатгал.docx» (дугааргүй).
 *  - Шинэ ном code=200V3 (V2 ном устахгүй; --hide-v2 бол archived).
 *  - Зураг: HTTP upload биш, StoredFile-д шууд (100x100 V3-тэй ижил).
 *  - График сонголт (A–E нэг өргөн зурагт): split-choice-image.py-оор сонголт бүрээр таслаж
 *    ProblemChoice.imageKey болгоно.
 *
 * ── Доорх нь V2-ийн тайлбар ──
 * 200x200 V2 импорт — DOCX→pandoc→LaTeX (import-100x100-v2.cjs + reimport-latex.cjs загвар).
 *
 * Ялгаа:
 *  - Эх фолдер: 200x200 V2 (99 docx). Хариуны түлхүүр: "200x200-тестийн-хариу-A,B.docx".
 *  - Хариуны түлхүүр нь ХҮСНЭГТ форматтай ба pandoc дунд мөрийг гээдэг (data-loss!),
 *    тул DOCX-ийн word/document.xml-ийг ШУУД задалж бүх нүдийг зөв уншина.
 *  - token/sourceLabel угтвар "200V2". Book code="200" (аль хэдийн бий).
 *  - Файл бүр = нэг Chapter (ж: "Интеграл · Тест 1"). A ба B хувилбарын бодлого нэг бүлэгт.
 *  - Бодлого бүр → Problem + (CHOICE бол) ProblemChoice (label A..E, isCorrect тугтай, LaTeX-тэй).
 *  - Тест бүр variant (A/B) → Test + TestProblem + TestAccess (grade-12 бүлгүүдэд).
 *  - Зурагтай бодлого: pandoc --extract-media-ээр embedded зургийг гаргаж авч,
 *    PIL-ээр (python3) "хоосон тор/цаас" маягийн чимэглэл зургийг ялган хаяж,
 *    жинхэнэ зургийг sips-ээр жижигрүүлж админ JWT-ээр /api/uploads руу upload хийж
 *    Problem.imageKey-д хадгална.
 *  - Идемпотент: Problem.token-оор upsert; ProblemChoice-г бүлэг бүрт цэвэрлээд дахин үүсгэнэ;
 *    Test-ийг {title,groupKey,variantLabel}-аар upsert.
 *  - ЗӨВХӨН нэмнэ — юу ч устгахгүй, бусад номд хүрэхгүй.
 *
 * Ажиллуулах:
 *   node prisma/import-200-v2.cjs --dry [--limit=30] [--only=Интеграл]
 *   node prisma/import-200-v2.cjs        [--limit=30] [--no-images]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SRC_CANDIDATES = [
  path.join(process.env.HOME, 'Desktop', 'Books', '200x200 V3'),
  '/Volumes/SSD2/future/200x200 V3',
];
const SRC_DIR = SRC_CANDIDATES.find((d) => fs.existsSync(d));
if (!SRC_DIR) {
  console.error('Эх фолдер олдсонгүй:', SRC_CANDIDATES.join(' | '));
  process.exit(1);
}
// A ба B тусдаа файл — хоёуланг нь уншиж нэгтгэнэ («В» нь кирилл, ард нь зай)
const ANSWER_FILES = ['200x200-ХАРИУ-A.docx', '200x200-ХАРИУ-В .docx'];
const BOOK_CODE = '200V3';
const BOOK_TITLE = '200x200';
const SOURCE_LABEL = '200x200 V3';
const TOKEN_PREFIX = '200V3';
const REPORT = path.join(__dirname, 'reports', '200x200-v3-import.json');
const HIDE_V2 = process.argv.includes('--hide-v2');
const API_BASE = process.env.PI_API_BASE || 'http://localhost:3000/api';
const ADMIN_IDENTIFIER = process.env.PI_ADMIN_ID || '70000001';
const ADMIN_PASSWORD = process.env.PI_ADMIN_PW || '70000001';

const DRY = process.argv.includes('--dry');
const NO_IMAGES = process.argv.includes('--no-images');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity;
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7) : null;

// ───────────────────────── LaTeX/текст цэвэрлэгээ (reimport-latex.cjs-ээс) ─────────────────────────

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
  // V3 засвар (a): «\{ \}» нь бүлэглэх хаалт биш — тоолохгүй (үгүй бол «\left\ » үлддэг)
  const esc = (i) => i > 0 && s[i - 1] === '\\';
  for (let i = 0; i < s.length; i++) {
    if (esc(i)) continue;
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
      if (i > 0 && s[i - 1] === '\\') continue;
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

/**
 * V3: $…$ хэсэг бүрийг KaTeX-д тохируулж засна (100x100 V3 REPORT.md-ийн c–h):
 *  c. \left/\right хос тэнцүү биш (сонголтын хил дээр тасарсан) → хэмжээний тушаалыг хасна
 *  d. «\leqx», «\bulletC» → «\leq x»
 *  e. төгсгөлийн ганц «\», markdown-ийн «\*»
 *  f. «Амжилт хүсье!»   g. «⤇» → \Rightarrow
 */
function repairLatexSegment(m) {
  let t = m;
  t = t.replace(/\\\*/g, '').replace(/\s*\*+\s*$/, '');
  t = t.replace(/⤇/g, '\\Rightarrow ');
  t = t.replace(/\\(leq|geq|neq|cdot|bullet|times|div|pm|mp|infty|cup|cap|in|to|Rightarrow|Leftrightarrow)(?=[A-Za-z0-9])/g, '\\$1 ');
  const lefts = (t.match(/\\left(?![a-zA-Z])/g) || []).length;
  const rights = (t.match(/\\right(?![a-zA-Z])/g) || []).length;
  const firstLeft = t.search(/\\left(?![a-zA-Z])/);
  const firstRight = t.search(/\\right(?![a-zA-Z])/);
  if (lefts !== rights || (firstRight >= 0 && (firstLeft < 0 || firstRight < firstLeft))) {
    t = t
      .replace(/\\(left|right)\s*\.(?![0-9])/g, '')
      .replace(/\\left\s*\\\s(?=\\begin)/g, '\\{')
      .replace(/\\(left|right)(?![a-zA-Z])\s*/g, '');
  }
  t = t.replace(/\\left\\\s+(?=\\begin\{array\})/g, '\\left\\{ ');
  t = t.replace(/\s*\\\s*$/, '').trim();
  return t;
}

function repairMixed(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/Амжилт хүсье!?/g, '')
    .replace(/\$([^$]+)\$/g, (_, m) => {
      const fixed = repairLatexSegment(m);
      return fixed ? `$${fixed}$` : '';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function isBalancedMixed(str) {
  if ((str.match(/\$/g) ?? []).length % 2 !== 0) return false;
  let depth = 0;
  // «\{ \}» (их хаалт) бүлэглэх хаалт биш
  const plain = str.replace(/\\[{}]/g, '');
  for (const c of plain) {
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
      // V3 засвар (b): «\right.»-ийн цэгийг хасахгүй
      let m = p.math.replace(/^[.,;]+/, '').replace(/(?<!\\right)[.,;]+$/, '').trim();
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

// ───────────────────────── Зургийн ялгах (жинхэнэ график vs хоосон тор/чимэглэл) ─────────────────

// image1.png = "бодлого хоорондын зураас" гэсэн 100x100-ийн таамаг ЭНД БУРУУ байж болно
// (зарим "Квадрат-функцийн-график" бодлогод image1.png яг ЖИНХЭНЭ график сонголтууд байдаг).
// Тиймээс индексээр биш, бодит пиксел агуулгаар (хар пикселийн эзлэх хувь) ялгана: PIL-ээр
// саарал болгоод <120 утгатай (бараан) пикселийн хувийг тооцно. Хоосон тор ≈ 0.0000,
// жинхэнэ зураг (муруй/тоо/тэмдэглэгээтэй) ≈ 0.02-0.05+.
// V3: нимгэн шугамтай график (y=2 г.м.) ~0.003 — хоосон тор яг 0 тул босгыг бууруулав
const DARK_THRESHOLD = 0.001;
const PY_CLASSIFY = `
import sys, json
try:
    from PIL import Image
    import numpy as np
except Exception as e:
    print(json.dumps({"__error__": str(e)}))
    sys.exit(0)
out = {}
for p in sys.argv[1:]:
    try:
        im = Image.open(p)
        w, h = im.size
        arr = np.array(im.convert('L'))
        out[p] = [float((arr < 120).sum()) / arr.size if arr.size else 0.0, w, h]
    except Exception as e:
        out[p] = -1.0
print(json.dumps(out))
`;

const imageClassifyCache = new Map(); // absPath -> darkFrac (-1 = алдаатай)

function classifyImages(paths) {
  const need = paths.filter((p) => !imageClassifyCache.has(p));
  if (need.length) {
    try {
      const out = execFileSync('python3', ['-c', PY_CLASSIFY, ...need], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      const parsed = JSON.parse(out);
      if (parsed.__error__) throw new Error(parsed.__error__);
      for (const p of need) imageClassifyCache.set(p, parsed[p] ?? -1);
    } catch (e) {
      for (const p of need) imageClassifyCache.set(p, [-1, 0, 0]);
    }
  }
  return new Map(paths.map((p) => [p, imageClassifyCache.get(p)]));
}

function isRealFigure(info) {
  return Array.isArray(info) && info[0] >= DARK_THRESHOLD;
}

// A–E таван график нэг хэвтээ зурагт (өргөн/өндөр ≥ 3.5)
function isChoiceStrip(info) {
  return Array.isArray(info) && info[2] > 0 && info[1] / info[2] >= 3.5;
}

const CHOICE_IMG_DIR = path.join(__dirname, 'data', '200x200-v3', 'choice-images');
const LABELS5 = ['A', 'B', 'C', 'D', 'E'];

/** Өргөн зургийг split-choice-image.py-оор 5 болгоно → файлын замууд (амжилтгүй бол null). */
function splitStrip(absPath, token) {
  fs.mkdirSync(CHOICE_IMG_DIR, { recursive: true });
  const prefix = path.join(CHOICE_IMG_DIR, token);
  try {
    execFileSync('python3', [path.join(__dirname, 'split-choice-image.py'), absPath, prefix], { stdio: 'pipe' });
  } catch {
    return null;
  }
  const files = LABELS5.map((L) => `${prefix}-${L}.png`);
  return files.every((f) => fs.existsSync(f)) ? files : null;
}

/**
 * Тусдаа 5 зургийг эх PDF дээрх байрлалаар (pdf-image-order.py) эрэмбэлээд сонголтын
 * хавтас руу хуулна. Docx-ийн анкертай зургийн дараалал найдваргүй (A–E холилдоно).
 */
function copyChoiceImages(paths, token, pdfPath, audits) {
  fs.mkdirSync(CHOICE_IMG_DIR, { recursive: true });
  let ordered = paths;
  if (pdfPath && fs.existsSync(pdfPath)) {
    try {
      const out = JSON.parse(
        execFileSync('python3', [path.join(__dirname, 'pdf-image-order.py'), pdfPath, ...paths], {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        }),
      );
      if (out.order && out.maxDist <= 20) ordered = out.order.map((i) => paths[i]);
      else audits.push(`Сонголтын зургийн дарааллыг PDF-ээр баталж чадсангүй (${out.error ?? `зай ${out.maxDist}`}).`);
    } catch (e) {
      audits.push('Сонголтын зургийн дарааллыг PDF-ээр шалгаж чадсангүй.');
    }
  } else {
    audits.push('Эх PDF олдсонгүй — сонголтын зургийн дараалал docx-ийнхаар.');
  }
  return ordered.map((src, i) => {
    const dst = path.join(CHOICE_IMG_DIR, `${token}-${LABELS5[i]}.png`);
    execFileSync('python3', ['-c', 'import sys;from PIL import Image;Image.open(sys.argv[1]).convert("RGB").save(sys.argv[2])', src, dst]);
    return dst;
  });
}

// ───────────────────────── Зураг resize + upload (админ JWT) ─────────────────────────

let cachedToken = null;
async function ensureLogin() {
  if (cachedToken) return cachedToken;
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: ADMIN_IDENTIFIER, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login амжилтгүй: ${res.status} ${await res.text()}`);
  const json = await res.json();
  cachedToken = json.accessToken;
  return cachedToken;
}

function resizeImageInPlace(absPath) {
  try {
    execFileSync('sips', ['-Z', '500', absPath], { stdio: 'pipe' });
  } catch {
    // resize бүтэлгүйтвэл эх зургаараа upload хийх нь илүү дээр (алдагдуулахгүй)
  }
}

async function uploadImage(absPath) {
  const token = await ensureLogin();
  resizeImageInPlace(absPath);
  const buf = fs.readFileSync(absPath);
  const blob = new Blob([buf], { type: 'image/png' });
  const form = new FormData();
  form.append('file', blob, path.basename(absPath));
  const res = await fetch(`${API_BASE}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`upload амжилтгүй: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.key;
}

const uploadCache = new Map(); // absPath -> key (нэг зургийг олон бодлого ашиглавал давхар upload хийхгүй)
async function uploadImageCached(absPath) {
  if (uploadCache.has(absPath)) return uploadCache.get(absPath);
  const key = await uploadImage(absPath);
  uploadCache.set(absPath, key);
  return key;
}

// ───────────────────────── Бодлого задлах (dугуйлсан дугаар + зураг холбоос хадгалж) ────────────

function parseProblems(sectionMd, audit) {
  // Зургийн холбоосыг УСТГАХААС ӨМНӨ байрлал(index)-той нь хамт хадгална
  const rawImageRefs = [];
  for (const m of sectionMd.matchAll(/!\[\]\(([^)]*)\)\{[^}]*\}/g)) {
    rawImageRefs.push({ at: m.index, path: m[1] });
  }
  const flat = unwrapMathbf(
    sectionMd
      .replace(/!\[\]\([^)]*\)\{[^}]*\}/g, '\n')
      .replace(/\$+/g, ' ')
      .replace(/\*\*/g, ' '),
  ).replace(/\\ /g, ' ');

  // Учир нь дээрх .replace() эх indexуудыг өөрчилдөг тул зургийн байрлалыг ЭХ
  // (сорилтгүй) markdown дээр circled markers-тэй ХАМТ тооцох ёстой — тиймээс
  // markers-ийг мөн эх sectionMd дээр шууд олно (flatten хийхээс өмнөх текст дэх байрлал).
  const rawMarks = [];
  for (const m of sectionMd.matchAll(new RegExp(CIRCLED.source, 'g'))) {
    rawMarks.push({ n: circledToNumber(m[0]), at: m.index });
  }

  const marks = [];
  for (const m of flat.matchAll(new RegExp(CIRCLED.source, 'g'))) {
    marks.push({ n: circledToNumber(m[0]), at: m.index });
  }
  // Эх DOCX-д цөөн тохиолдолд дугуйлсан дугаар ДАВХАРДАХ (ж: ...④⑤⑤⑦...) эсвэл
  // буурах алдаа гардаг (бичгийн алдаа) — ийм үед энэ нь token давхардал,
  // DB-ийн unique constraint зөрчил үүсгэдэг тул байрлал дараалалд тулгуурлан
  // өөрөө засна (өмнөх дугаараас +1) бөгөөд аудитад тэмдэглэнэ.
  for (let i = 1; i < marks.length; i++) {
    if (typeof marks[i].n === 'number' && typeof marks[i - 1].n === 'number' && marks[i].n <= marks[i - 1].n) {
      audit.push(
        `Дугуйлсан дугаар дараалал алдаатай (эх файлд ${marks[i].n} давхардсан/буурсан) — ${marks[i - 1].n + 1} болгож автоматаар засав.`,
      );
      marks[i].n = marks[i - 1].n + 1;
    }
  }
  const problems = [];
  for (let i = 0; i < marks.length; i++) {
    const chunk = flat.slice(marks[i].at + 1, i + 1 < marks.length ? marks[i + 1].at : undefined);
    const number = marks[i].n;
    const body = chunk.replace(/^[\s.]+/, '');
    const markerRe = /\\left\(\s*([A-EА-Е])\s*\\right\)\s*\.?/g;
    const found = [...body.matchAll(markerRe)];

    // Энэ бодлогын (rawMarks index i) хамрах хүрээ дэх зургийн холбоосууд
    const rawStart = rawMarks[i]?.at ?? 0;
    const rawEnd = i + 1 < rawMarks.length ? rawMarks[i + 1].at : sectionMd.length;
    const imageRefsInChunk = rawImageRefs
      .filter((r) => r.at >= rawStart && r.at < rawEnd)
      .map((r) => r.path);

    if (found.length >= 2) {
      const statement = body.slice(0, found[0].index).replace(/^[.\s]+/, '');
      const choices = found.map((m, j) => {
        const from = m.index + m[0].length;
        const to = j + 1 < found.length ? found[j + 1].index : body.length;
        return mathToMixed(body.slice(from, to));
      });
      problems.push({
        number,
        statement: repairMixed(mathToMixed(statement)),
        choices: choices.map(repairMixed),
        imageRefs: imageRefsInChunk,
      });
    } else {
      problems.push({
        number,
        statement: repairMixed(mathToMixed(body.replace(/^[.\s]+/, ''))),
        choices: null,
        imageRefs: imageRefsInChunk,
      });
    }
  }
  if (marks.length === 0) audit.push('Дугуйлсан дугаар олдсонгүй');
  return problems;
}

function parseDocxSections(file, mediaDir) {
  // V3: text box-ыг задлаж (docx-unwrap-textboxes.py) — үгүй бол pandoc зурагтай
  // бодлогын дугаар (③) ба графикийг хаяж, хоёр бодлого нэг болж нийлдэг.
  fs.mkdirSync(mediaDir, { recursive: true });
  const unwrapped = path.join(mediaDir, 'unwrapped.docx');
  execFileSync('python3', [path.join(__dirname, 'docx-unwrap-textboxes.py'), file, unwrapped], { stdio: 'pipe' });
  const md = execFileSync(
    'pandoc',
    [unwrapped, '-t', 'markdown+tex_math_dollars', '--wrap=none', `--extract-media=${mediaDir}`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
    .replace(/\*\*/g, '')
    // «Тайлбар байхгүй.» г.м. alt-тай зургийг ![](…) болгоно (доорх regex-үүд хоосон alt хүлээдэг)
    .replace(/!\[[^\]]*\]\(/g, '![](')
    // Зураг дугаарын ӨМНӨ нэг мөрөнд байвал (анкертай зураг) — дугаарын араас шилжүүлнэ
    .replace(/((?:!\[\]\([^)\n]*\)\{[^}\n]*\}[ \t]*)+)(\$\\mathbf\{[①-⑳㉑-㉟㊱-㊿][^$\n]*\$)/gu, '$2 $1');
  const headerRe = /Тест\s*[:：]?\s*(\d+)\s*[-–—]\s*([ABАВ])/g;
  const headers = [...md.matchAll(headerRe)];
  const sections = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const variant = h[2] === 'А' ? 'A' : h[2] === 'В' ? 'B' : h[2];
    const secMd = md.slice(h.index, i + 1 < headers.length ? headers[i + 1].index : undefined);
    const timeMatch = secMd.slice(0, 200).match(/Хугацаа\s*(\d+)\s*минут/u);
    sections.push({
      testNumber: Number(h[1]),
      variant,
      md: secMd,
      timeLimitMin: timeMatch ? Number(timeMatch[1]) : null,
    });
  }
  return sections;
}

// ───────────────────────── Хариуны түлхүүр (DOCX XML шууд) ─────────────────────────
// pandoc хүснэгтийн дунд мөрийг гээдэг тул document.xml-ийг өөрөө задлана.

function decodeXml(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

const LETTER_MAP = { А: 'A', В: 'B', С: 'C', Е: 'E' }; // кирилл→латин lookalike
function normLetter(c) {
  return LETTER_MAP[c] || c.toUpperCase();
}

const TOPIC_RE = /^[А-ЯЁӨҮ][А-ЯЁӨҮ \-,]+$/u;

function parseAnswerKey(docxPath) {
  const xml = execFileSync('unzip', ['-p', docxPath, 'word/document.xml'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  // document order-оор бүх <w:p> (толгой + хүснэгтийн нүд) → текст
  const paras = [...xml.matchAll(/<w:p\b[^>]*>(.*?)<\/w:p>/gs)]
    .map((m) => {
      const t = [...m[1].matchAll(/<w:t[^>]*>(.*?)<\/w:t>/gs)]
        .map((x) => decodeXml(x[1]))
        .join('');
      return t.replace(/\s+/g, ' ').trim().normalize('NFC');
    })
    .filter(Boolean);

  const key = new Map(); // "TOPIC|test|variant" → Map(qnum → {type:'choice',letter} | {type:'fill',map})
  let topic = null;
  let test = null;
  let variant = null;
  let fillQ = null;

  const getBucket = () => {
    const k = `${topic}|${test}|${variant}`;
    if (!key.has(k)) key.set(k, new Map());
    return key.get(k);
  };

  for (const p of paras) {
    if (p === 'ХАРИУ') continue;

    const th = p.match(/^Тест\s*(\d+)\s*[-–—]\s*([ABАВ])$/u);
    if (th) {
      test = Number(th[1]);
      variant = th[2] === 'А' ? 'A' : th[2] === 'В' ? 'B' : th[2];
      fillQ = null;
      continue;
    }

    if (!/\d/.test(p) && TOPIC_RE.test(p)) {
      topic = p;
      test = null;
      variant = null;
      fillQ = null;
      continue;
    }

    if (!(topic && test && variant)) continue;

    const ch = p.match(/^(\d+)\s*\.\s*([A-EА-Е])$/u);
    if (ch) {
      getBucket().set(Number(ch[1]), { type: 'choice', letter: normLetter(ch[2]) });
      fillQ = null;
      continue;
    }

    const fq = p.match(/^(\d+)\s*\.$/);
    if (fq) {
      fillQ = Number(fq[1]);
      const b = getBucket();
      if (!b.has(fillQ)) b.set(fillQ, { type: 'fill', map: {} });
      continue;
    }

    const fv = p.match(/^([a-eA-Eа-е])\s*\.\s*(-?\d+|\(\s*-\s*\))$/u);
    if (fv && fillQ) {
      const e = getBucket().get(fillQ);
      if (e && e.type === 'fill') {
        e.map[fv[1].toLowerCase()] = /^\(/.test(fv[2]) ? null : Number(fv[2]);
      }
      continue;
    }
  }
  return key;
}

// ───────────────────────── Файлын нэр → сэдэв/тест/slug ─────────────────────────

const TRANSLIT = {
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'YO', Ж: 'J', З: 'Z', И: 'I',
  Й: 'I', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', Ө: 'O', П: 'P', Р: 'R', С: 'S',
  Т: 'T', У: 'U', Ү: 'U', Ф: 'F', Х: 'H', Ц: 'TS', Ч: 'CH', Ш: 'SH', Щ: 'SCH',
  Ъ: '', Ы: 'Y', Ь: '', Э: 'E', Ю: 'YU', Я: 'YA',
};
function slugify(upperTopic) {
  return [...upperTopic]
    .map((ch) => (ch === ' ' ? '_' : TRANSLIT[ch] ?? ''))
    .join('')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// "Интеграл-13 OK" → { topicDisplay:"Интеграл", topicUpper:"ИНТЕГРАЛ", testNumber:13 }
function parseFilename(file) {
  // «Интеграл-1.tulgah», «Уламжлалын хэрэглээ-4.mash sain tulgah» → эхний цэгээс өмнөх хэсэг
  const base = file.replace(/\.docx$/i, '').normalize('NFC').trim().split('.')[0].trim();
  if (base === 'Дифференциал-хурд-хурдатгал') {
    return { topicDisplay: 'Хурд хурдатгал', topicUpper: 'ХУРД ХУРДАТГАЛ', testNumber: 1, slug: 'HURD_HURDATGAL' };
  }
  const m = base.match(/^(.+?)[-\s](\d+)(?:[-\s].*)?$/u);
  if (!m) return null;
  const topicRaw = m[1].trim();
  const topicDisplay = topicRaw.replace(/[-\s]+/g, ' ').trim();
  const topicUpper = topicDisplay.toLocaleUpperCase('mn');
  return { topicDisplay, topicUpper, testNumber: Number(m[2]), slug: slugify(topicUpper) };
}

// 200x200-тестийн-хариу дэх сэдвийн гарчиг заримдаа файлын нэрнээс гаргасан
// topicUpper-тэй яг таарахгүй байж болно (жиш: "ФУНКЦИЙН ҮЕ" vs файл "Функцийн-үе").
// Тиймээс normalize хийж (Ё/Е, Ү/Ы зэрэг variant үсгийг үл тооцож) fallback харьцуулалт хийнэ.
function normTopicKey(s) {
  return s
    .toLocaleUpperCase('mn')
    .replace(/[ЁЕ]/g, 'Е')
    .replace(/[-,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Заримдаа файлын нэрнээс гаргасан topicUpper нь хариуны түлхүүрийн сэдэвтэй
// зөвхөн Ё/Е зэрэг үсгийн зөрөөгүй, харин ИЛҮҮ ҮГТЭЙ (ж: "ФУНКЦИЙН" угтвартай)
// эсвэл үг дараалал өөр байдаг. normTopicKey-ийн fallback үүнийг барихгүй тул
// 99 файлыг бодитоор шалгаж баталгаажуулсан ЯГ ТОХИРОЛ (bijection) энд бий:
// файлын нэрнээс гарсан topicUpper → хариуны түлхүүр дэх бодит TOPIC мөр.
const TOPIC_ALIAS = {
  'ТОДОРХОЙЛОГДОХ МУЖ': 'ФУНКЦИЙН ТОДОРХОЙЛОГДОХ МУЖ',
  'ТРИГОНОМЕТР УРВУУ ФУНКЦ': 'ТРИГОНОМЕТР ФУНКЦИЙН УРВУУ ФУНКЦ',
  'ТЭГШ СОНДГОЙ ФУНКЦ': 'ФУНКЦИЙН ТЭГШ, СОНДГОЙ',
  УЛАМЖЛАЛ: 'ФУНКЦИЙН УЛАМЖЛАЛ',
  'УЛАМЖЛАЛЫН ХЭРЭГЛЭЭ': 'ФУНКЦИЙН УЛАМЖЛАЛЫН ХЭРЭГЛЭЭ',
  'УТГЫН МУЖ': 'ФУНКЦИЙН УТГЫН МУЖ',
  'ТРИГОНОМЕТР ФУНКЦИЙН ГРАФИК': 'ТРИГОНОМЕТР ФУНКЦИЙН ГРАФИК',
};

// ───────────────────────── Plan бүтээх ─────────────────────────

function listTestFiles() {
  return fs
    .readdirSync(SRC_DIR)
    .filter(
      (f) =>
        f.toLowerCase().endsWith('.docx') &&
        !f.startsWith('~$') &&
        !f.startsWith('._') &&
        !f.toLowerCase().includes('хариу'),
    )
    .map((f) => f.normalize('NFC'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
}

function buildPlan() {
  const answerPaths = ANSWER_FILES.map((f) => path.join(SRC_DIR, f));
  const missingKey = answerPaths.filter((p) => !fs.existsSync(p));
  if (missingKey.length) {
    console.error('Хариуны түлхүүр DOCX олдсонгүй:', missingKey.join(' | '));
    process.exit(1);
  }
  const answerFile = answerPaths.join(' + ');
  const answers = new Map();
  for (const p of answerPaths) for (const [k, v] of parseAnswerKey(p)) answers.set(k, v);
  // topicUpper (normTopicKey) → жинхэнэ answer-key-ийн TOPIC мөр (fallback тааруулахад)
  const answerTopicByNorm = new Map();
  for (const k of answers.keys()) {
    const [t] = k.split('|');
    answerTopicByNorm.set(normTopicKey(t), t);
  }

  let files = listTestFiles();
  if (ONLY) files = files.filter((f) => f.startsWith(ONLY));
  files = files.slice(0, LIMIT);

  const report = {
    generatedAt: new Date().toISOString(),
    sourceDir: SRC_DIR,
    answerFile,
    dryRun: DRY,
    imagesEnabled: !NO_IMAGES,
    limit: LIMIT === Infinity ? null : LIMIT,
    only: ONLY,
    processedFiles: [],
    skippedFiles: [],
    totals: {
      chapters: 0,
      problems: 0,
      choiceProblems: 0,
      fillProblems: 0,
      openProblems: 0,
      problemChoices: 0,
      choicesWithLatex: 0,
      answerVerified: 0,
      answerMissing: 0,
      reviewRequired: 0,
      imagesDetected: 0,
      imagesDecorativeSkipped: 0,
      graphicalChoiceOverrides: 0,
    },
    parseIssues: [],
    samples: [],
    openSamples: [],
    missingAnswers: [],
    reviewByFile: {},
  };

  const chapters = [];
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pi200-media-'));

  for (let idx = 0; idx < files.length; idx++) {
    const file = files[idx];
    const meta = parseFilename(file);
    if (!meta) {
      report.skippedFiles.push({ file, reason: 'нэрнээс сэдэв/дугаар танигдсангүй' });
      continue;
    }

    const mediaDir = path.join(workRoot, String(idx));
    let sections;
    try {
      sections = parseDocxSections(path.join(SRC_DIR, file), mediaDir);
    } catch (e) {
      report.skippedFiles.push({ file, reason: `pandoc алдаа: ${e.message.slice(0, 100)}` });
      continue;
    }
    if (!sections.length) {
      report.parseIssues.push({ file, issue: 'Тест:N-A/B толгой олдсонгүй' });
      // Толгойгүй бол (ж: бүх сонголт зурган дотор, дугуйлсан дугаар нь ч
      // текст биш зураг байдаг файлууд) бодлого гаргаж авах боломжгүй тул
      // ХООСОН бүлэг (0 бодлоготой Chapter) үүсгэхгүйгээр алгасна — гараар
      // орж үзэх шаардлагатай гэдгийг report.skippedFiles-д тэмдэглэнэ.
      report.skippedFiles.push({
        file,
        reason: 'Тест:N-A/B толгой олдсонгүй тул бодлого задлах боломжгүй (гараар импорт хийх)',
      });
      continue;
    }

    // Энэ файлын бүх зургийг нэг дор ангилна (batch)
    const allRefs = unique(
      sections.flatMap((sec) => [...sec.md.matchAll(/!\[\]\(([^)]*)\)\{[^}]*\}/g)].map((m) => m[1])),
    );
    const classified = classifyImages(allRefs);

    // answerTopicUpper — файлын нэрнээс гарсан topicUpper key answer-key-д шууд байхгүй бол
    // эхлээд ХАТУУ ALIAS-аар (ж: "УЛАМЖЛАЛ" → "ФУНКЦИЙН УЛАМЖЛАЛ"), дараа нь normalized
    // fallback-аар олно (ж: "ФУНКЦИЙН ҮЕ" ≠ "ФУНКЦИЙН-ҮЕ" зэрэг зөрөө)
    const normKey = normTopicKey(meta.topicUpper);
    const answerTopicUpper =
      TOPIC_ALIAS[meta.topicUpper] ?? answerTopicByNorm.get(normKey) ?? meta.topicUpper;

    const chapterTitle = `${meta.topicDisplay} — Тест ${meta.testNumber}`;
    const problems = [];
    const variantMeta = [];

    for (const sec of sections) {
      const audit = [];
      const parsed = parseProblems(sec.md, audit);
      for (const issue of audit) report.parseIssues.push({ file, variant: sec.variant, issue });

      const ansBucket =
        answers.get(`${answerTopicUpper}|${meta.testNumber}|${sec.variant}`) || new Map();

      const variantProblems = [];
      for (const p of parsed) {
        const token = `${TOKEN_PREFIX}-${meta.slug}-${String(meta.testNumber).padStart(2, '0')}-${sec.variant}-${String(p.number).padStart(2, '0')}`;
        const ans = ansBucket.get(p.number);

        // Ихэнх бодлого 5 сонголттой (A-E), гэвч зарим сэдэв (ж: "тэгш, сондгой
        // функц") ЖИНХЭНЭ 4 сонголттой (A-D) байдаг эх сурвалжтай — тиймээс
        // 5-аар биш, 2-5 хооронд хэдэн ч сонголттой байсан хүлээн зөвшөөрнө.
        const okChoices =
          Array.isArray(p.choices) &&
          p.choices.length >= 2 &&
          p.choices.length <= 5 &&
          p.choices.every((c) => c.length > 0 && isBalancedMixed(c));
        const okStatement = p.statement.length > 2 && isBalancedMixed(p.statement);

        // Зургийн холбоосуудаас "хоосон тор/чимэглэл" биш ЖИНХЭНЭ зургийг олно
        const realImagePaths = p.imageRefs.filter((ref) => isRealFigure(classified.get(ref)));
        if (process.env.DEBUG_TOKEN && token.includes(process.env.DEBUG_TOKEN)) console.error(token, JSON.stringify({ refs: p.imageRefs.map((r) => [path.basename(r), classified.get(r)]), ans, choices: p.choices }));
        if (p.imageRefs.length) report.totals.imagesDetected += 1;
        report.totals.imagesDecorativeSkipped += p.imageRefs.length - realImagePaths.length;
        // График сонголт: өргөн зураг (5 график) эсвэл тусдаа 5 зураг — бодлогын зураг биш
        const stripPath = realImagePaths.find((ref) => isChoiceStrip(classified.get(ref))) ?? null;
        const figurePaths = realImagePaths.filter((ref) => ref !== stripPath);
        let imageCandidate = figurePaths[0] ?? null;

        let format;
        let choices = null;
        let correctAnswer;
        let choiceRows = null;
        let answerKeyStatus;
        const audits = [];
        let graphicalChoice = false;

        if (okChoices) {
          format = 'CHOICE';
          choices = p.choices;
          // Текст сонголттой бол өргөн зураг ч бодлогын зураг (тоон шулуун г.м.)
          imageCandidate = realImagePaths[0] ?? null;
          const labels = ['A', 'B', 'C', 'D', 'E'].slice(0, p.choices.length);
          const ansLetterInRange = ans && ans.type === 'choice' && labels.includes(ans.letter);
          if (ansLetterInRange) {
            correctAnswer = ans.letter;
            answerKeyStatus = 'VERIFIED';
          } else if (ans && ans.type === 'choice') {
            // Хариуны түлхүүрийн үсэг энэ бодлогын сонголтын хүрээнээс (ж: 4
            // сонголттой асуултад "E") гарсан бол — датаг найдваргүй тул
            // ГАРААР шалгуулна (буруу correct utгыг бичихгүй).
            correctAnswer = { manualReview: true, reason: 'ANSWER_LETTER_OUT_OF_RANGE' };
            answerKeyStatus = 'MISSING';
            audits.push(
              `Хариуны түлхүүрийн үсэг (${ans.letter}) энэ бодлогын ${p.choices.length} сонголтын хүрээнээс гарсан.`,
            );
          } else {
            correctAnswer = { manualReview: true, reason: 'ANSWER_KEY_MISSING' };
            answerKeyStatus = 'MISSING';
            audits.push('Хариуны түлхүүрт энэ бодлогын үсэг олдсонгүй.');
          }
          choiceRows = labels.map((label, i) => ({
            label,
            text: p.choices[i],
            isCorrect: ansLetterInRange ? label === ans.letter : false,
            order: i + 1,
          }));
        } else if (ans && ans.type === 'fill') {
          format = 'FILL_NUMBER';
          correctAnswer = { fill: ans.map };
          answerKeyStatus = 'VERIFIED';
          if (!okStatement) audits.push('FILL бодлогын statement парс эргэлзээтэй.');
        } else if (ans && ans.type === 'choice' && figurePaths.length > 5) {
          // 5-аас олон зураг — аль нь сонголт болохыг найдвартай таних боломжгүй (өөр
          // бодлогын зураг холилдсон байж болно) → гараар
          format = 'OPEN';
          correctAnswer = { manualReview: true, reason: 'CHOICE_IMAGES_AMBIGUOUS' };
          answerKeyStatus = 'VERIFIED';
          audits.push(`График сонголт: ${figurePaths.length} зураг (5 хүлээсэн) — гараар засах.`);
        } else if (ans && ans.type === 'choice' && (stripPath || figurePaths.length === 5)) {
          // Сонголт бүр зураг: өргөн зургийг таслах, эсвэл сүүлийн 5 зураг = A–E
          let files = null;
          let figure = null;
          if (figurePaths.length === 5) {
            files = copyChoiceImages(figurePaths, token, path.join(SRC_DIR, file.replace(/\.docx$/i, '.pdf')), audits);
          } else {
            files = splitStrip(stripPath, token);
            figure = figurePaths[0] ?? null;
          }
          if (!files) {
            format = 'OPEN';
            correctAnswer = { manualReview: true, reason: 'CHOICE_IMAGE_SPLIT_FAILED' };
            answerKeyStatus = 'VERIFIED';
            audits.push('График сонголтыг таслаж чадсангүй — гараар.');
          } else {
            format = 'CHOICE';
            graphicalChoice = true;
            imageCandidate = figure;
            choices = null;
            correctAnswer = '';
            answerKeyStatus = 'VERIFIED';
            audits.push('График сонголт: сонголт бүр тусдаа зураг (нүдээр шалгах).');
            choiceRows = LABELS5.map((label, i) => ({
              label,
              text: '',
              imageFile: files[i],
              isCorrect: label === ans.letter,
              order: i + 1,
            }));
            report.totals.graphicalChoiceOverrides += 1;
          }
        } else if (imageCandidate && ans && ans.type === 'choice') {
          // Текст choice markers олдоогүй ч ЗУРАГТАЙ бөгөөд хариуны түлхүүрт
          // ганц үсэг баталгаатай байвал — энэ бол "график сонголт" (A-E сонголт
          // бүр зурган дотор байгаа, жиш: квадрат функцийн график таних асуулт).
          format = 'CHOICE';
          graphicalChoice = true;
          choices = ['A', 'B', 'C', 'D', 'E'];
          correctAnswer = ans.letter;
          answerKeyStatus = 'VERIFIED';
          audits.push('График сонголттой бодлого: A-E сонголт бүр зурган дотор.');
          const labels = ['A', 'B', 'C', 'D', 'E'];
          choiceRows = labels.map((label, i) => ({
            label,
            text: label,
            isCorrect: label === ans.letter,
            order: i + 1,
          }));
          report.totals.graphicalChoiceOverrides += 1;
        } else {
          // Сонголт бүрэн бус эсвэл задгай — гараар шалгуулна
          format = 'OPEN';
          correctAnswer = { manualReview: true, reason: 'PARSE_OR_FORMAT_UNCERTAIN' };
          answerKeyStatus = ans ? 'VERIFIED' : 'MISSING';
          if (Array.isArray(p.choices)) {
            audits.push(`Сонголт бүрэн бус (${p.choices ? p.choices.length : 0}), эсвэл LaTeX баланс алдаатай.`);
          } else {
            audits.push('Сонголтын маркер олдсонгүй (нөхөх/задгай бодлого байж болзошгүй).');
          }
        }

        if (!okStatement) audits.push('Statement богино эсвэл LaTeX баланс алдаатай.');

        const needsReview = format === 'OPEN' || answerKeyStatus === 'MISSING' || !okStatement;

        variantProblems.push({
          token,
          number: p.number,
          variant: sec.variant,
          format,
          statementText: p.statement,
          choices,
          correctAnswer,
          choiceRows,
          imageCandidate,
          graphicalChoice,
          answerKeyStatus,
          status: needsReview ? 'REVIEW_REQUIRED' : 'AUTO_DRAFT',
          topicUpper: meta.topicUpper,
          topicDisplay: meta.topicDisplay,
          sourcePath: path.join(SRC_DIR, file),
          audits,
        });
      }
      problems.push(...variantProblems);
      variantMeta.push({
        variant: sec.variant,
        timeLimitMin: sec.timeLimitMin ?? 45,
        problems: variantProblems,
      });
    }

    // тайлангийн тоо
    for (const p of problems) {
      report.totals.problems += 1;
      if (p.format === 'CHOICE') report.totals.choiceProblems += 1;
      else if (p.format === 'FILL_NUMBER') report.totals.fillProblems += 1;
      else report.totals.openProblems += 1;
      if (p.answerKeyStatus === 'VERIFIED') report.totals.answerVerified += 1;
      else report.totals.answerMissing += 1;
      if (p.status === 'REVIEW_REQUIRED') {
        report.totals.reviewRequired += 1;
        report.reviewByFile[file] = (report.reviewByFile[file] || 0) + 1;
      }
      if (p.format === 'OPEN' && report.openSamples.length < 30) {
        report.openSamples.push({ token: p.token, statement: p.statementText.slice(0, 120), audits: p.audits });
      }
      if (p.answerKeyStatus === 'MISSING' && report.missingAnswers.length < 30) {
        report.missingAnswers.push({ token: p.token, format: p.format });
      }
      if (p.choiceRows) {
        for (const cr of p.choiceRows) {
          report.totals.problemChoices += 1;
          if (/\$[^$]+\$/.test(cr.text)) report.totals.choicesWithLatex += 1;
        }
      }
    }

    // V3: сэдвийн дараалал = хариуны түлхүүрийн дараалал (бүлэг бүр «Сэдэв · Тест N»)
    const topicOrder = [...new Set([...answers.keys()].map((k) => k.split('|')[0]))].indexOf(answerTopicUpper);
    chapters.push({
      order: (topicOrder < 0 ? 99 : topicOrder + 1) * 100 + meta.testNumber,
      topicTitle: meta.topicDisplay,
      topicOrder: topicOrder < 0 ? 99 : topicOrder + 1,
      title: chapterTitle,
      file,
      meta,
      problems,
      variantMeta,
      sourcePath: path.join(SRC_DIR, file),
    });
    report.totals.chapters += 1;
    report.processedFiles.push({
      order: idx + 1,
      file,
      chapterTitle,
      variants: [...new Set(sections.map((s) => s.variant))],
      problems: problems.length,
    });

    if (!report._seenTopics) report._seenTopics = new Set();
    if (!report._seenTopics.has(meta.topicUpper)) {
      const firstTwo = problems.filter((p) => p.format === 'CHOICE' && p.answerKeyStatus === 'VERIFIED').slice(0, 2);
      for (const s of firstTwo) {
        report.samples.push({
          token: s.token,
          topic: meta.topicUpper,
          statement: s.statementText,
          choices: s.choices,
          correct: s.correctAnswer,
          hasImage: !!s.imageCandidate,
        });
      }
      if (firstTwo.length) report._seenTopics.add(meta.topicUpper);
    }
  }

  return { chapters, report, workRoot };
}

function unique(arr) {
  return [...new Set(arr)];
}

// ───────────────────────── DB импорт ─────────────────────────

async function upsertChapter(prisma, { bookId, title, order }) {
  const existing = await prisma.chapter.findFirst({ where: { bookId, title } });
  if (existing) {
    return prisma.chapter.update({
      where: { id: existing.id },
      data: { order, grade: 12 },
    });
  }
  return prisma.chapter.create({
    data: { bookId, title, order, grade: 12, freePreview: false },
  });
}

// V3: зургийг StoredFile-д шууд (HTTP upload биш) — key нь агуулгын hash (идемпотент)
const storedKeyCache = new Map();
async function storeImage(prisma, absPath) {
  if (storedKeyCache.has(absPath)) return storedKeyCache.get(absPath);
  // PNG болгож, том зургийг 900px хүртэл багасгана (график уншигдахуйц)
  const tmp = path.join(os.tmpdir(), `pi200v3-${process.pid}-${storedKeyCache.size}.png`);
  execFileSync('python3', [
    '-c',
    'import sys;from PIL import Image\nim=Image.open(sys.argv[1])\nif im.mode in ("RGBA","LA","P"):\n  im=im.convert("RGBA");bg=Image.new("RGB",im.size,(255,255,255));bg.paste(im,mask=im.split()[3]);im=bg\nim=im.convert("RGB");im.thumbnail((900,900));im.save(sys.argv[2],optimize=True)',
    absPath,
    tmp,
  ]);
  const bytes = fs.readFileSync(tmp);
  fs.rmSync(tmp, { force: true });
  const key = `200v3-${require('crypto').createHash('sha1').update(bytes).digest('hex').slice(0, 20)}.png`;
  await prisma.storedFile.upsert({
    where: { key },
    update: { bytes, size: bytes.length, mime: 'image/png' },
    create: { key, bytes, size: bytes.length, mime: 'image/png' },
  });
  storedKeyCache.set(absPath, key);
  return key;
}

async function resolveImageKey(prisma, p, report) {
  if (NO_IMAGES || !p.imageCandidate) return null;
  try {
    return await storeImage(prisma, p.imageCandidate);
  } catch (e) {
    p.audits.push(`Зураг хадгалж чадсангүй: ${e.message.slice(0, 150)}`);
    p.status = 'REVIEW_REQUIRED';
    report.imageUploadFailures = (report.imageUploadFailures || 0) + 1;
    return null;
  }
}

async function upsertProblem(prisma, chapterId, adminId, p, report) {
  const imageKey = await resolveImageKey(prisma, p, report);
  // График сонголтын зургууд
  for (const cr of p.choiceRows ?? []) {
    cr.imageKey = cr.imageFile ? await storeImage(prisma, cr.imageFile) : null;
  }

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
      imageKey,
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
      imageKey,
    },
  });

  // ProblemChoice-г цэвэрлээд дахин үүсгэнэ (идемпотент)
  await prisma.problemChoice.deleteMany({ where: { problemId: problem.id } });
  if (p.choiceRows && p.choiceRows.length) {
    await prisma.problemChoice.createMany({
      data: p.choiceRows.map((cr) => ({
        problemId: problem.id,
        label: cr.label,
        text: cr.text,
        imageKey: cr.imageKey ?? null,
        isCorrect: cr.isCorrect,
        mistakeType: cr.isCorrect ? 'NONE' : 'OTHER',
        order: cr.order,
      })),
    });
  }

  // ProblemAnalysis — review track хийхэд (минимал)
  await prisma.problemAnalysis.upsert({
    where: { problemId: problem.id },
    update: {
      status: p.status,
      answerKeyStatus: p.answerKeyStatus,
      confidence: p.status === 'REVIEW_REQUIRED' ? 0.6 : 0.9,
      sourcePath: p.sourcePath,
      sourceVariant: p.variant,
      topic: p.topicUpper,
      subtopic: p.topicDisplay,
      formulas: [],
      auditNotes: p.audits,
    },
    create: {
      problemId: problem.id,
      status: p.status,
      answerKeyStatus: p.answerKeyStatus,
      confidence: p.status === 'REVIEW_REQUIRED' ? 0.6 : 0.9,
      sourcePath: p.sourcePath,
      sourceVariant: p.variant,
      topic: p.topicUpper,
      subtopic: p.topicDisplay,
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

async function upsertTest(prisma, { chapterId, testTitle, groupKey, variant, timeLimitMin, pdfKey, problems, createdById, classroomIds }) {
  const existing = await prisma.test.findFirst({
    where: { groupKey, variantLabel: variant },
  });
  const manual = problems.some((p) => p.format === 'OPEN' || p.status === 'REVIEW_REQUIRED');
  const data = {
    title: testTitle,
    type: 'CHAPTER_EXAM',
    gradingMode: manual ? 'MANUAL' : 'AUTO',
    chapterId,
    timeLimitMin,
    pdfKey,
    groupKey,
    variantLabel: variant,
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
        problemId: problem.dbId,
        order: index + 1,
        points: 1,
      })),
    });
  }

  if (classroomIds.length) {
    await prisma.testAccess.deleteMany({ where: { testId: test.id } });
    await prisma.testAccess.createMany({
      data: classroomIds.map((classroomId) => ({ testId: test.id, classroomId })),
      skipDuplicates: true,
    });
  }

  return test;
}

async function importPlan(prisma, plan, adminId, report, classroomIds) {
  // V3: тусдаа ном (V2-ийн ном/тест/дүнд хүрэхгүй)
  const book = await prisma.book.upsert({
    where: { code: BOOK_CODE },
    update: { title: BOOK_TITLE, sourceLabel: SOURCE_LABEL, archived: false, deletedAt: null },
    create: { code: BOOK_CODE, title: BOOK_TITLE, sourceLabel: SOURCE_LABEL },
  });

  let importedProblems = 0;
  let importedChoices = 0;
  let testsUpserted = 0;
  for (const ch of plan.chapters) {
    // Номын сан «Сэдэв · Тест N»-ийг « · »-ээр сэдэв болгон бүлэглэдэг (library/page.tsx splitChapterTitle)
    const chapter = await upsertChapter(prisma, {
      bookId: book.id,
      title: `${ch.topicTitle} · Тест ${ch.meta.testNumber}`,
      order: ch.order,
    });

    // бодлогуудыг эхлээд бүгдийг upsert хийж dbId-г нь variant бүрт мэдэгдэнэ
    const byToken = new Map();
    for (const p of ch.problems) {
      const problem = await upsertProblem(prisma, chapter.id, adminId, p, report);
      byToken.set(p.token, problem.id);
      importedProblems += 1;
      if (p.choiceRows) importedChoices += p.choiceRows.length;
    }

    for (const vm of ch.variantMeta) {
      const testTitle = `${ch.meta.topicDisplay} ${ch.meta.testNumber}`;
      // «200V3 …» — V2-ийн ижил нэртэй тестийг ДАРЖ бичихгүй
      const groupKey = `${TOKEN_PREFIX} ${testTitle}`;
      const problemsWithIds = vm.problems.map((p) => ({ ...p, dbId: byToken.get(p.token) }));
      await upsertTest(prisma, {
        chapterId: chapter.id,
        testTitle,
        groupKey,
        variant: vm.variant,
        timeLimitMin: vm.timeLimitMin,
        pdfKey: `future:${ch.sourcePath}`,
        problems: problemsWithIds,
        createdById: adminId,
        classroomIds,
      });
      testsUpserted += 1;
    }
  }
  return { bookId: book.id, importedProblems, importedChoices, testsUpserted };
}

// ───────────────────────── CLI ─────────────────────────

async function main() {
  const { chapters, report, workRoot } = buildPlan();
  delete report._seenTopics;

  if (DRY) {
    fs.mkdirSync(path.dirname(REPORT), { recursive: true });
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
    // Бодлого бүрийн төлөвлөгөө — нүдээр шалгах (зураг/сонголт/аудит)
    const planOut = path.join(__dirname, 'data', '200x200-v3', 'plan-200x200-v3.json');
    fs.mkdirSync(path.dirname(planOut), { recursive: true });
    fs.writeFileSync(
      planOut,
      JSON.stringify(
        chapters.flatMap((ch) =>
          ch.problems.map((p) => ({
            token: p.token,
            chapter: ch.title,
            format: p.format,
            statement: p.statementText,
            choices: p.choices,
            choiceRows: p.choiceRows,
            correctAnswer: p.correctAnswer,
            image: p.imageCandidate,
            graphical: p.graphicalChoice,
            status: p.status,
            audits: p.audits,
          })),
        ),
        null,
        1,
      ),
    );
    console.log('=== DRY RUN (DB/сүлжээнд хүрээгүй) ===');
    console.log(JSON.stringify(report.totals, null, 2));
    console.log('Боловсруулсан файл:', report.processedFiles.length);
    console.log('parseIssues:', report.parseIssues.length);
    if (report.samples[0]) {
      console.log('\n--- ЖИШЭЭ ---');
      console.log('token:', report.samples[0].token, 'correct:', JSON.stringify(report.samples[0].correct));
      console.log('statement:', report.samples[0].statement);
      console.log('choices:', JSON.stringify(report.samples[0].choices, null, 1));
      console.log('hasImage:', report.samples[0].hasImage);
    }
    console.log('\nТайлан:', REPORT);
    if (!process.env.KEEP_MEDIA) fs.rmSync(workRoot, { recursive: true, force: true });
    else console.log('media:', workRoot);
    return;
  }

  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const admin =
      (await prisma.user.findUnique({ where: { phone: '70000001' } })) ||
      (await prisma.user.findFirst({ where: { role: 'ADMIN' } }));
    if (!admin) throw new Error('ADMIN хэрэглэгч олдсонгүй');

    // V3: ангид автоматаар оноохгүй (100x100 V3-тэй ижил) — багш өөрөө онооно
    const classroomIds = [];

    const result = await importPlan(prisma, { chapters }, admin.id, report, classroomIds);
    // Өмнөх ажиллуулалтаас үлдсэн (тест бүрт нэг) хоосон бүлгийг цэвэрлэнэ — зөвхөн энэ номынх
    const emptied = await prisma.chapter.deleteMany({
      where: {
        bookId: result.bookId,
        problems: { none: {} },
        tests: { none: {} },
        theories: { none: {} },
        lessonPackets: { none: {} },
        videos: { none: {} },
      },
    });
    if (emptied.count) console.log(`Хоосон бүлэг устгав: ${emptied.count}`);
    if (HIDE_V2) {
      // V2 номыг нуух (УСТГАХГҮЙ) — эзэн «үргэлж V3» гэсэн
      const v2 = await prisma.book.updateMany({ where: { code: '200', archived: false }, data: { archived: true } });
      result.hiddenV2 = v2.count;
      console.log(`V2 ном нуугдлаа: ${v2.count}. Буцаах: UPDATE "Book" SET archived=false WHERE code='200';`);
    }
    report.dbResult = result;
    fs.mkdirSync(path.dirname(REPORT), { recursive: true });
    fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

    console.log('=== ИМПОРТ ДУУСЛАА ===');
    console.log(JSON.stringify(report.totals, null, 2));
    console.log('DB:', JSON.stringify(result));
    console.log('Зураг upload амжилтгүй:', report.imageUploadFailures || 0);
    console.log('Тайлан:', REPORT);
  } finally {
    await prisma.$disconnect();
    fs.rmSync(workRoot, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
