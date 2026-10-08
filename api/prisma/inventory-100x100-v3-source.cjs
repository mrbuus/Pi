#!/usr/bin/env node
/*
 * "Математикийн тестүүд 1-р дэвтэр" эх файлын read-only аудит.
 *
 * Энэ скрипт ӨС рүү ХЭЗЭЭ Ч холбогдохгүй, source файлыг өөрчлөхгүй. Эхний
 * import-ийн QA хаалга нь энэ manifest: яг аль DOCX, PDF, хариуны файл,
 * checksum, OMML, зураг байсныг дараа нь дахин батална.
 *
 * Ашиглах нь:
 *   node prisma/inventory-100x100-v3-source.cjs
 *   node prisma/inventory-100x100-v3-source.cjs --source /path --out /tmp/manifest.json
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_SOURCE = '/Users/mr.buus/Desktop/Books/100x100 V3';
const DEFAULT_OUT = path.join(__dirname, '../../docs/100x100-v3/source-manifest.json');

function option(name, fallback) {
  const at = process.argv.indexOf(name);
  return at >= 0 && process.argv[at + 1] ? process.argv[at + 1] : fallback;
}

function sha256(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function command(commandName, args) {
  const child = spawnSync(commandName, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (child.error || child.status !== 0) return null;
  return child.stdout;
}

function count(text, needle) {
  if (!text) return null;
  return text.split(needle).length - 1;
}

function inspectDocx(file) {
  const documentXml = command('unzip', ['-p', file, 'word/document.xml']);
  const listing = command('unzip', ['-Z1', file]);
  return {
    ommlEquations: count(documentXml, '<m:oMath'),
    ommlParagraphs: count(documentXml, '<m:oMathPara'),
    drawings: count(documentXml, '<w:drawing'),
    embeddedMedia: listing ? listing.split('\n').filter((entry) => entry.startsWith('word/media/')).length : null,
  };
}

function inspectPdf(file) {
  const info = command('pdfinfo', [file]);
  const pages = info?.match(/^Pages:\s+(\d+)$/m)?.[1];
  return { pages: pages ? Number(pages) : null };
}

function fileRecord(dir, name) {
  const file = path.join(dir, name);
  const stat = fs.statSync(file);
  const extension = path.extname(name).toLowerCase();
  const stem = name.slice(0, -extension.length);
  return {
    name,
    stem,
    extension,
    bytes: stat.size,
    sha256: sha256(file),
    ...(extension === '.docx' ? inspectDocx(file) : {}),
    ...(extension === '.pdf' ? inspectPdf(file) : {}),
  };
}

function isTemporaryWordLock(record) {
  return record?.extension === '.docx' && record.name.startsWith('~$');
}

function isAnswerKey(record) {
  // Файлын нэрийн кирилл "й" нь composed/decomposed хоёр хэлбэрээр ирж
  // болдог тул бүтэн үгээр regex тулгахгүй. Тогтвортой suffix нь хангалттай.
  return record?.extension === '.pdf' && /-хариу-[AB]\.pdf$/iu.test(record.name.normalize('NFC'));
}

function main() {
  const source = path.resolve(option('--source', DEFAULT_SOURCE));
  const out = path.resolve(option('--out', DEFAULT_OUT));
  if (!fs.existsSync(source) || !fs.statSync(source).isDirectory()) {
    throw new Error(`Source folder олдсонгүй: ${source}`);
  }

  const names = fs
    .readdirSync(source)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => ['.docx', '.pdf'].includes(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'mn'));
  const files = names.map((name) => fileRecord(source, name));
  const byStem = new Map();
  for (const record of files) {
    if (!byStem.has(record.stem)) byStem.set(record.stem, []);
    byStem.get(record.stem).push(record);
  }

  const pairs = [...byStem.entries()].map(([stem, members]) => ({
    stem,
    docx: members.find((item) => item.extension === '.docx')?.name ?? null,
    pdf: members.find((item) => item.extension === '.pdf')?.name ?? null,
    status: members.some((item) => item.extension === '.docx') && members.some((item) => item.extension === '.pdf')
      ? 'PAIRED'
      : 'MISSING_COMPANION',
  }));
  const answerKeys = files.filter(isAnswerKey);
  const tempWordLocks = files.filter(isTemporaryWordLock);
  const contentDocx = files.filter((item) => item.extension === '.docx' && !isTemporaryWordLock(item));
  const testPdfs = files.filter((item) => item.extension === '.pdf' && !isAnswerKey(item));
  const contentPairStatuses = pairs.filter((pair) => {
    const docx = files.find((item) => item.name === pair.docx);
    const pdf = files.find((item) => item.name === pair.pdf);
    return !isTemporaryWordLock(docx ?? {}) && !isAnswerKey(pdf ?? {});
  });

  const manifest = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceDirectory: source,
    policy: 'READ_ONLY_SOURCE_AUDIT_NO_DATABASE_WRITE',
    summary: {
      files: files.length,
      contentDocx: contentDocx.length,
      testPdfs: testPdfs.length,
      pairedTests: contentPairStatuses.filter((item) => item.status === 'PAIRED').length,
      missingVisualReference: contentPairStatuses.filter((item) => item.docx && !item.pdf).length,
      unpairedPdf: contentPairStatuses.filter((item) => item.pdf && !item.docx).length,
      answerKeys: answerKeys.length,
      temporaryWordLocks: tempWordLocks.length,
      totalOmmlEquations: files.reduce((sum, item) => sum + (item.ommlEquations ?? 0), 0),
      totalDrawings: files.reduce((sum, item) => sum + (item.drawings ?? 0), 0),
      totalEmbeddedMedia: files.reduce((sum, item) => sum + (item.embeddedMedia ?? 0), 0),
    },
    files,
    pairs,
  };

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Manifest: ${out}`);
  console.log(JSON.stringify(manifest.summary, null, 2));
  if (manifest.summary.missingVisualReference || manifest.summary.unpairedPdf || manifest.summary.temporaryWordLocks) {
    console.log('\n⚠️ Import эхлэхээс өмнө missing visual reference, unpaired PDF, temporary Word lock файлуудыг шалгана.');
  }
}

main();
