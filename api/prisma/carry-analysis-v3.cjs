#!/usr/bin/env node
/**
 * 100x100 шинэ хэвлэл рүү `ProblemAnalysis`-ийг АГУУЛГААР зөөх.
 *
 * ⚠️ ЯАГААД TOKEN-ООР ЗӨӨЖ БОЛОХГҮЙ ВЭ
 * Token загвар нь `100V2-<СЭДЭВ>-<ТЕСТ>-<ХУВИЛБАР>-<ДУГААР>` — сүүлийн хэсэг нь
 * бодлогын БАЙРЛАЛ. Шинэ хэвлэлээс нэг бодлого хасагдвал түүнээс хойшхи бүх
 * дугаар нэгээр шилжинэ. 2026-08-26-нд баталсан жишээ (Модультай тэгшитгэл,
 * Тест 1-A): хуучин №05 `|x+4|+2=1` хасагдсан тул 06→05, 07→06 болсон.
 * Token-оор зөөвөл `ABSEQ-01-A-05`-ийн задлан огт өөр бодлогод очно. Агуулгаар
 * тулгасан шалгалтаар ийм шилжилт 186 бодлогод илэрсэн.
 *
 * ТИЙМЭЭС: тулгалт нь бодлогын МАТЕМАТИК ГАРЫН ҮСЭГ дээр хийгдэнэ —
 * `$...$` доторх LaTeX-ээс зай, `\left/\right`, хаалт зэргийг нормчилж
 * үлдээсэн тэмдэгтийн мөр. Монгол бичвэрийг ЗОРИУДААР оролцуулаагүй: 2026-08-26-ны
 * задлалт монгол үг дээр алдаа гаргасан (ном «тэгшитгэлийг бод» атал задлалт
 * «тэнцэтгэлийн бод» уншсан) тул текстээр тулгавал зөв хос бүтэлгүйтэнэ.
 *
 * ХЭРЭГЛЭЭ
 *   node prisma/carry-analysis-v3.cjs              # dry-run (ӨӨРЧЛӨЛТГҮЙ)
 *   node prisma/carry-analysis-v3.cjs --apply      # бодитоор бичнэ
 *   node prisma/carry-analysis-v3.cjs --apply --include-renumbered
 *
 * Анхдагчаар ЗӨВХӨН математик нь яг ижил (score = 1.0) хосыг зөөнө. Дугаар
 * шилжсэн хосыг оруулах бол `--include-renumbered` — гэхдээ эдгээрийг багш
 * нүдээр баталгаажуулсны дараа хийхийг зөвлөнө.
 */

require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const APPLY = process.argv.includes('--apply');
const INCLUDE_RENUMBERED = process.argv.includes('--include-renumbered');
const EXTRACT = path.join(__dirname, '../../docs/100x100-v3/all-problems.jsonl');

const SLUG = {
  'Тоо тоолол': 'TOO',
  'Рациональ тэгшитгэл': 'RATEQ',
  'Рациональ тэнцэтгэл биш': 'RATINEQ',
  'Модультай тэгшитгэл': 'ABSEQ',
  'Модультай тэнцэтгэл биш': 'ABSINEQ',
  'Иррациональ тэгшитгэл': 'IRREQ',
  'Иррациональ тэнцэтгэл биш': 'IRRINEQ',
  'Илтгэгч тэгшитгэл': 'EXPEQ',
  'Илтгэгч тэнцэтгэл биш': 'EXPINEQ',
  'Логарифм илэрхийлэл': 'LOGEXP',
  'Логарифм тэгшитгэл': 'LOGEQ',
  'Логарифм тэнцэтгэл биш': 'LOGINEQ',
};

/**
 * Бодлогын математик гарын үсэг.
 *
 * `\bullet` → `\cdot` нормчлол ЗААВАЛ энд байх ёстой: 2026-08-26-нд DB-ийн 874
 * бодлогыг `\cdot` болгож зассан ч, өмнөх экспорт эсвэл өөр эх сурвалж `\bullet`
 * агуулсан хэвээр байж болно. Нормчлохгүй бол ижил бодлого хоёр өөр гарын
 * үсэгтэй болж, хос олдохгүй.
 */
function signature(text) {
  const inline = (String(text || '').match(/\$([^$]*)\$/g) || [])
    .map((s) => s.slice(1, -1))
    .join('');
  return inline
    .replace(/\\bullet/g, '\\cdot')
    .replace(/\\left|\\right|\\,|\\;|\\!|\\ /g, '')
    .replace(/[{}\s]+/g, '');
}

function testKeyFromToken(token) {
  const p = token.split('-'); // 100V2 SLUG TT V NN
  return p.length === 5 ? `${p[1]}-${p[2]}-${p[3]}` : null;
}

async function main() {
  if (!fs.existsSync(EXTRACT)) {
    console.error(`Задлалтын файл олдсонгүй: ${EXTRACT}`);
    process.exit(1);
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  // ---- Хуучин хэвлэлийн бодлого + задлан ----
  const { rows: oldRows } = await db.query(`
    SELECT p.id, p.token, p."statementText", (pa."problemId" IS NOT NULL) AS has_analysis
    FROM "Problem" p
    JOIN "Chapter" c ON c.id = p."chapterId"
    JOIN "Book" b    ON b.id = c."bookId" AND b.title = '100x100'
    LEFT JOIN "ProblemAnalysis" pa ON pa."problemId" = p.id
    WHERE p."deletedAt" IS NULL
  `);

  const oldByTest = new Map();
  for (const r of oldRows) {
    const k = testKeyFromToken(r.token);
    if (!k) continue;
    if (!oldByTest.has(k)) oldByTest.set(k, []);
    oldByTest.get(k).push({ ...r, sig: signature(r.statementText) });
  }

  // ---- Шинэ хэвлэлийн задлалт ----
  const newByTest = new Map();
  for (const line of fs.readFileSync(EXTRACT, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    const m = /^(\d+)\s*-\s*([ABАВ])$/.exec(String(r.test || '').trim());
    const slug = SLUG[r.topic];
    if (!m || !slug) continue;
    const variant = m[2].replace('А', 'A').replace('В', 'B');
    const k = `${slug}-${String(m[1]).padStart(2, '0')}-${variant}`;
    if (!newByTest.has(k)) newByTest.set(k, []);
    newByTest.get(k).push({ ...r, sig: signature(r.statement) });
  }

  // ---- Тулгалт: ХОЁР ШАТТАЙ ----
  // 2026-08-26-нд илэрсэн: шинэ хэвлэлд зөвхөн бодлогын дугаар биш, ТЕСТИЙН
  // дугаар ч шилжсэн. Жишээ нь `RATEQ Тест 6` бүхэлдээ `Тест 5` болсон (15
  // бодлого хамт нүүсэн), `EXPEQ Тест 4` → `Тест 3`. Хэрэв зөвхөн ижил тест
  // дотор хайвал ийм бүтэн тестийн шилжилт «хасагдсан» мэт харагдаж, 200 гаруй
  // бодлогын задлан шалтгаангүй хаягдана.
  //
  // Тиймээс: (1) эхлээд ижил тест дотор, (2) дараа нь ижил СЭДЭВ доторх бүх
  // тестээс хайна. Сэдвээс гадуур хайхгүй — өөр сэдэвт ижил гарын үсэгтэй
  // бодлого таарвал энэ нь санамсаргүй давхцал байх магадлал өндөр.
  const exact = [];
  const renumbered = [];
  const movedTest = [];
  const unmatched = [];

  const topicOf = (k) => k.split('-')[0];
  const takenGlobal = new Map(); // testKey -> Set(index)
  const take = (k, i) => {
    if (!takenGlobal.has(k)) takenGlobal.set(k, new Set());
    takenGlobal.get(k).add(i);
  };
  const isTaken = (k, i) => takenGlobal.get(k)?.has(i) ?? false;

  // (1) ижил тест дотор
  const leftovers = [];
  for (const [k, olds] of oldByTest) {
    const news = newByTest.get(k) || [];
    for (const o of olds) {
      const i = news.findIndex((n, idx) => !isTaken(k, idx) && n.sig && n.sig === o.sig);
      if (i === -1) {
        leftovers.push(o);
        continue;
      }
      take(k, i);
      const pair = { old: o, next: news[i], testKey: k };
      const oldNum = parseInt(o.token.split('-')[4], 10);
      (oldNum === news[i].num ? exact : renumbered).push(pair);
    }
  }

  // (2) ижил сэдэв доторх бусад тестээс
  for (const o of leftovers) {
    const topic = topicOf(testKeyFromToken(o.token));
    let found = null;
    for (const [k, news] of newByTest) {
      if (topicOf(k) !== topic) continue;
      const i = news.findIndex((n, idx) => !isTaken(k, idx) && n.sig && n.sig === o.sig);
      if (i !== -1) {
        take(k, i);
        found = { old: o, next: news[i], testKey: k, fromTest: testKeyFromToken(o.token) };
        break;
      }
    }
    if (found) movedTest.push(found);
    else unmatched.push(o);
  }

  const withAnalysis = (p) => p.old.has_analysis;
  const carryExact = exact.filter(withAnalysis);
  const carryRenum = renumbered.filter(withAnalysis);
  const carryMoved = movedTest.filter(withAnalysis);
  const selected = INCLUDE_RENUMBERED
    ? [...carryExact, ...carryRenum, ...carryMoved]
    : carryExact;

  console.log('═══ АГУУЛГААР ТУЛГАХ ҮР ДҮН ═══');
  console.log(`  Хуучин бодлого (100x100):        ${oldRows.length}`);
  console.log(`  Задлалтын бодлого:               ${[...newByTest.values()].reduce((n, v) => n + v.length, 0)}`);
  console.log(`  ✅ Математик ЯГ ИЖИЛ, дугаар ижил: ${exact.length}  (задлантай: ${carryExact.length})`);
  console.log(`  🔶 Математик ижил, ДУГААР шилжсэн: ${renumbered.length}  (задлантай: ${carryRenum.length})`);
  console.log(`  🔄 ӨӨР ТЕСТ рүү бүхэлдээ нүүсэн:   ${movedTest.length}  (задлантай: ${carryMoved.length})`);
  console.log(`  ❌ Шинэ номд олдоогүй:            ${unmatched.length}`);
  console.log(`\n  Зөөх гэж сонгосон: ${selected.length}${INCLUDE_RENUMBERED ? ' (шилжсэнийг оруулсан)' : ' (зөвхөн яг ижил)'}`);

  // ---- Зөөх төлөвлөгөөг үргэлж файлд бичнэ ----
  const planPath = path.join(__dirname, '../../docs/100x100-v3/carry-plan.json');
  fs.writeFileSync(
    planPath,
    JSON.stringify(
      {
        generatedFrom: EXTRACT,
        mode: INCLUDE_RENUMBERED ? 'exact+renumbered' : 'exact-only',
        exact: exact.map((p) => ({
          old_token: p.old.token,
          old_id: p.old.id,
          new_test: p.testKey,
          new_num: p.next.num,
          new_page: p.next.page,
          has_analysis: p.old.has_analysis,
        })),
        movedTest: movedTest.map((p) => ({
          old_token: p.old.token,
          old_id: p.old.id,
          from_test: p.fromTest,
          new_test: p.testKey,
          new_num: p.next.num,
          new_page: p.next.page,
          has_analysis: p.old.has_analysis,
        })),
        renumbered: renumbered.map((p) => ({
          old_token: p.old.token,
          old_id: p.old.id,
          old_num: parseInt(p.old.token.split('-')[4], 10),
          new_test: p.testKey,
          new_num: p.next.num,
          new_page: p.next.page,
          has_analysis: p.old.has_analysis,
        })),
        unmatched: unmatched.map((o) => ({ token: o.token, text: (o.statementText || '').slice(0, 120) })),
      },
      null,
      1,
    ),
    'utf8',
  );
  console.log(`\n  📄 Төлөвлөгөө: ${planPath}`);

  if (!APPLY) {
    console.log('\n  DRY-RUN — өгөгдлийн санд ЮУ Ч бичсэнгүй.');
    console.log('  Бодитоор ажиллуулах: node prisma/carry-analysis-v3.cjs --apply');
    await db.end();
    return;
  }

  // ---- Бодит зөөлт ----
  // Шинэ хэвлэлийн бодлого DB-д ОРСОН байх ёстой. Ороогүй бол энд зогсоно —
  // чимээгүй "0 мөр шинэчлэв" гэж дуусах нь дуусгасан мэт харагдаад бодит
  // байдалд юу ч хийгээгүй байдаг тул хамгийн аюултай төгсгөл.
  const { rows: probe } = await db.query(
    `SELECT COUNT(*)::int AS n FROM "Problem" WHERE token LIKE '100V3-%' AND "deletedAt" IS NULL`,
  );
  if (probe[0].n === 0) {
    console.error('\n  ⛔ ЗОГСЛОО: шинэ хэвлэлийн бодлого (100V3-*) DB-д алга.');
    console.error('     Задланг зөөх ГАЗАР байхгүй. Эхлээд шинэ хэвлэлийг импортло,');
    console.error('     дараа нь энэ скриптийг --apply-тэй дахин ажиллуул.');
    await db.end();
    process.exit(2);
  }

  let moved = 0;
  let skipped = 0;
  await db.query('BEGIN');
  try {
    for (const p of selected) {
      const newToken = `100V3-${p.testKey}-${String(p.next.num).padStart(2, '0')}`;
      const { rows: tgt } = await db.query(
        `SELECT id FROM "Problem" WHERE token = $1 AND "deletedAt" IS NULL`,
        [newToken],
      );
      if (!tgt.length) {
        skipped++;
        continue;
      }
      await db.query(
        `INSERT INTO "ProblemAnalysis" (
           "problemId", status, "answerKeyStatus", confidence, "sourcePath", "sourceVariant",
           topic, subtopic, skills, methods, formulas, "domainNotes", "signRules",
           "commonMistakes", "solutionOutline", "auditNotes", "createdAt", "updatedAt"
         )
         SELECT $2, status, "answerKeyStatus", confidence, "sourcePath", "sourceVariant",
                topic, subtopic, skills, methods, formulas, "domainNotes", "signRules",
                "commonMistakes", "solutionOutline",
                array_append("auditNotes", 'carried from ' || $3 || ' by content match 2026-08-26'),
                "createdAt", now()
         FROM "ProblemAnalysis" WHERE "problemId" = $1
         ON CONFLICT ("problemId") DO NOTHING`,
        [p.old.id, tgt[0].id, p.old.token],
      );
      moved++;
    }
    await db.query('COMMIT');
    console.log(`\n  ✅ Зөөсөн: ${moved}   Байрлал олдоогүй тул алгассан: ${skipped}`);
  } catch (e) {
    await db.query('ROLLBACK');
    console.error('\n  ⛔ Алдаа — бүх өөрчлөлтийг буцаалаа:', e.message);
    process.exitCode = 1;
  }

  await db.end();
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
