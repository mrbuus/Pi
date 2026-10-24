/* eslint-disable */
/**
 * Бодлогын агуулгын засвар (2026-10-24): `prisma/data/content-fix-1024/*.json`-ийн засваруудыг
 * шалгаж, ӨС-д хэрэглэнэ. Локал болон прод (EC2 → RDS) дээр ИЖИЛ байдлаар ажиллана.
 *
 *   node prisma/apply-content-fix.cjs                 # шалгалт + dry-run (ӨС-д юу ч бичихгүй)
 *   node prisma/apply-content-fix.cjs --only=a.json   # нэг файл
 *   node prisma/apply-content-fix.cjs --commit        # хэрэглэнэ
 *
 * Аюулгүй байдал (прод өгөгдлийн дүрэм):
 *   - Бодлого бүрийн одоогийн statementText нь JSON-ий `before.statementText`-тэй ЯГ таарахгүй бол
 *     алгасна (прод дээр багш зассан байж болно — дарж бичихгүй).
 *   - Юу ч устгахгүй: зөвхөн тухайн бодлогын текст, сонголт, хариу, зургийг шинэчилнэ; version +1.
 *   - Сонголтыг ProblemChoice мөр болгоно (хуучин JSON `choices` → null), бусад бодлого хөндөгдөхгүй.
 *
 * JSON бичлэг (массив):
 *   { token, source, before: { statementText },
 *     format: "CHOICE" | "FILL_NUMBER",
 *     statementText,
 *     image?: "fig/<token>.png" | null,         // бодлогын зураг (хавтсанд харьцангуй); null = хасна; байхгүй = хэвээр
 *     choices?: [{ text, image? }] × 5,         // CHOICE
 *     correct?: "A".."E",                        // CHOICE
 *     answer?: { a: "3", ... },                  // FILL_NUMBER (null = хэвээр)
 *     answerSource: "key" | "existing" | "solved", notes? }
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const katexPath = [path.join(__dirname, '..', 'node_modules', 'katex'), path.join(__dirname, '..', '..', 'web', 'node_modules', 'katex')].find((p) => fs.existsSync(p));
const katex = require(katexPath);
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient, Prisma } = require('../dist/src/generated/prisma/client');

const DIR = path.join(__dirname, 'data', 'content-fix-1024');
const COMMIT = process.argv.includes('--commit');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const L = ['A', 'B', 'C', 'D', 'E'];

const UNI = /[−×÷≤≥≠√∛π²³⁴⁰¹·∙•∠°∞∈∉⊂⊆∪∩→⇒⇔±∓≈∑∫△⊥∥′″⤇⦨]/u;
const MATH_ALNUM = /[\u{1D400}-\u{1D7FF}]/u;
const SLOT_RE = /\[([a-zA-Z]{1,8})\]|\\lbrack\s*([a-zA-Z]{1,8})\s*\\rbrack/g;

function checkText(text, where, errs, { allowEmpty = false } = {}) {
  if (typeof text !== 'string') return errs.push(`${where}: текст биш`);
  if (!text.trim() && !allowEmpty) errs.push(`${where}: хоосон`);
  if ((text.match(/\$/g) || []).length % 2) errs.push(`${where}: сондгой $`);
  if (/\\bullet|•/.test(text)) errs.push(`${where}: «•» хориотой — \\cdot`);
  if (/оноо\s*\//.test(text) || /\/\s*\d+\s*оноо/.test(text)) errs.push(`${where}: оноо бичиг`);
  if (MATH_ALNUM.test(text)) errs.push(`${where}: 𝑥 мэт тусгай үсэг`);
  if (/\(\s*[A-E𝐀-𝐄]\s*\)\s*\./u.test(text)) errs.push(`${where}: «(A).» сонголтын тэмдэг текстэд`);
  if (/ {3,}|\n[ \t]{2,}/.test(text)) errs.push(`${where}: илүү хоосон зай`);
  if (/\*\*|\\\*/.test(text)) errs.push(`${where}: markdown/«*\\*» үлдэгдэл`);
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    const outside = text.slice(last, m.index);
    if (UNI.test(outside)) errs.push(`${where}: юникод тэмдэг $ гадна «${outside.match(UNI)[0]}»`);
    const tex = m[1] !== undefined ? m[1] : m[2];
    try {
      katex.renderToString(tex, { throwOnError: true, strict: 'ignore', displayMode: m[1] !== undefined, maxSize: 20, maxExpand: 1000 });
    } catch (e) {
      errs.push(`${where}: KaTeX «${tex.slice(0, 50)}» — ${String(e.message).slice(0, 80)}`);
    }
    if (UNI.test(tex.replace(/\\text\{[^}]*\}/g, ''))) errs.push(`${where}: юникод тэмдэг томьёонд «${tex.match(UNI)[0]}»`);
    last = re.lastIndex;
  }
  if (UNI.test(text.slice(last))) errs.push(`${where}: юникод тэмдэг $ гадна «${text.slice(last).match(UNI)[0]}»`);
}

function slotLetters(statement) {
  const out = [];
  for (const m of String(statement).matchAll(SLOT_RE)) for (const ch of (m[1] || m[2])) if (!out.includes(ch)) out.push(ch);
  return out;
}

function validate(e, file) {
  const errs = [];
  const at = `${file}:${e.token}`;
  if (!e.token) errs.push(`${at}: token алга`);
  if (!e.before || typeof e.before.statementText !== 'string') errs.push(`${at}: before.statementText алга`);
  if (!['CHOICE', 'FILL_NUMBER'].includes(e.format)) errs.push(`${at}: format буруу`);
  checkText(e.statementText, `${at} statement`, errs);
  if (e.image) {
    const p = path.join(DIR, e.image);
    if (!fs.existsSync(p)) errs.push(`${at}: зураг алга ${e.image}`);
  }
  if (e.format === 'CHOICE') {
    if (!Array.isArray(e.choices) || e.choices.length !== 5) errs.push(`${at}: 5 сонголт биш`);
    else {
      e.choices.forEach((c, i) => {
        if (c.image && !fs.existsSync(path.join(DIR, c.image))) errs.push(`${at}: сонголтын зураг алга ${c.image}`);
        checkText(c.text, `${at} ${L[i]}`, errs, { allowEmpty: !!c.image });
      });
      const keys = e.choices.map((c) => (c.text || '').trim() + '|' + (c.image || ''));
      if (new Set(keys).size !== 5 && !e.allowDuplicateChoices) errs.push(`${at}: давхардсан сонголт (эх дээр бол allowDuplicateChoices: true)`);
    }
    if (!L.includes(e.correct)) errs.push(`${at}: correct A–E биш`);
  } else if (e.format === 'FILL_NUMBER') {
    const letters = slotLetters(e.statementText);
    if (!letters.length) errs.push(`${at}: нөхөх нүд ([a]) алга`);
    if (e.answer) {
      const keys = Object.keys(e.answer).join('').split('');
      const missing = letters.filter((l) => !keys.includes(l));
      const extra = keys.filter((l) => !letters.includes(l));
      if (missing.length || extra.length) errs.push(`${at}: нүд ↔ хариу зөрсөн (дутуу ${missing}, илүү ${extra})`);
      for (const [k, v] of Object.entries(e.answer)) if (!/^-?\d+$/.test(String(v)) || String(v).replace('-', '').length !== k.length) errs.push(`${at}: хариу ${k}=${v} цифр биш/урт буруу`);
    }
  }
  if (!['key', 'existing', 'solved'].includes(e.answerSource)) errs.push(`${at}: answerSource key|existing|solved`);
  return errs;
}

async function storeImage(tx, rel) {
  const bytes = fs.readFileSync(path.join(DIR, rel));
  const key = `fix1024-${crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 24)}.png`;
  await tx.storedFile.upsert({ where: { key }, update: {}, create: { key, bytes, size: bytes.length, mime: 'image/png', storage: 'db' } });
  return key;
}

(async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && (!ONLY || f === ONLY)).sort();
  const entries = [];
  let errs = [];
  for (const f of files) {
    let arr;
    try { arr = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch (e) { errs.push(`${f}: JSON алдаа ${e.message}`); continue; }
    for (const e of arr) { errs = errs.concat(validate(e, f)); entries.push({ ...e, _file: f }); }
  }
  const dup = entries.map((e) => e.token).filter((t, i, a) => a.indexOf(t) !== i);
  if (dup.length) errs.push(`давхардсан token: ${[...new Set(dup)]}`);
  console.log(`файл ${files.length}, бодлого ${entries.length}`);
  if (errs.length) { console.log(`\nШАЛГАЛТ: ${errs.length} алдаа\n` + errs.map((x) => '  - ' + x).join('\n')); process.exit(1); }
  console.log('Шалгалт: алдаагүй');

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  const rows = await prisma.problem.findMany({ where: { token: { in: entries.map((e) => e.token) } }, select: { id: true, token: true, statementText: true, imageKey: true } });
  const byTok = new Map(rows.map((r) => [r.token, r]));
  const ready = [], skipped = [];
  for (const e of entries) {
    const r = byTok.get(e.token);
    if (!r) { skipped.push(`${e.token}: ӨС-д алга`); continue; }
    if ((r.statementText ?? '') !== e.before.statementText) { skipped.push(`${e.token}: одоогийн текст өөрчлөгдсөн (прод дээр засварласан байж магадгүй) — алгасав`); continue; }
    ready.push({ e, r });
  }
  console.log(`хэрэглэхэд бэлэн ${ready.length}, алгассан ${skipped.length}`);
  skipped.forEach((s) => console.log('  ! ' + s));
  if (!COMMIT) { console.log('\nDRY-RUN — ӨС-д юу ч бичээгүй. --commit-оор хэрэглэнэ.'); await prisma.$disconnect(); return; }

  let n = 0;
  for (const { e, r } of ready) {
    await prisma.$transaction(async (tx) => {
      const data = { statementText: e.statementText, format: e.format, version: { increment: 1 } };
      if (e.image !== undefined) data.imageKey = e.image ? await storeImage(tx, e.image) : null;
      if (e.format === 'CHOICE') {
        const imgs = [];
        for (const c of e.choices) imgs.push(c.image ? await storeImage(tx, c.image) : null);
        data.choices = Prisma.DbNull;
        data.correctAnswer = e.choices[L.indexOf(e.correct)].text;
        await tx.problem.update({ where: { id: r.id }, data });
        await tx.problemChoice.deleteMany({ where: { problemId: r.id } });
        await tx.problemChoice.createMany({
          data: e.choices.map((c, i) => ({
            problemId: r.id, label: L[i], text: c.text, imageKey: imgs[i], isCorrect: L[i] === e.correct,
            mistakeType: L[i] === e.correct ? 'NONE' : 'OTHER', order: i + 1,
          })),
        });
      } else {
        if (e.answer) data.correctAnswer = e.answer;
        await tx.problem.update({ where: { id: r.id }, data });
      }
    });
    n++;
  }
  console.log(`\nCOMMIT: ${n} бодлого засагдлаа`);
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
