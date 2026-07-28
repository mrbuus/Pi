#!/usr/bin/env node
'use strict';
/**
 * ЖИНХЭНЭ ШАЛГАЛТЫН АЧААЛЛЫН ТЕСТ — 1000 сурагч зэрэг 100 минутын шалгалт
 * өгөх сценарийг ХЭМЖИНЭ (CLAUDE.md-ийн "PROVE IT" даалгавар).
 *
 *   1) N виртуал сурагч POST /tests/:id/start
 *   2) → давтан PATCH /tests/:id/session (autosave, шахсан хугацаанд)
 *   3) → POST /tests/:id/submit
 *
 * 🚨 SAFETY: ЗӨВХӨН localhost DB/API дээр ажиллана (lib/env.js-ийн
 * assertLocalhost — DATABASE_URL эсвэл зорилтот API localhost биш бол
 * ШУУД зогсоно). Prod/Render руу ЯМАР Ч НӨХЦӨЛД зааж болохгүй.
 *
 * Ашиглалт:
 *   npm run loadtest:exam
 *   LOADTEST_LEVELS=50,200,500 npm run loadtest:exam
 *   LOADTEST_KEEP_FIXTURE=1 npm run loadtest:exam   (debug — DB-г цэвэрлэхгүй)
 *
 * Бүх тохиргоо орчны хувьсагчаар (доорх DEFAULTS харна уу) — шинэ npm
 * dependency (autocannon/k6 гэх мэт) АВААГҮЙ: Node.js-ийн built-in
 * `http`/`crypto`-оор бичигдсэн (lib/http.js, lib/jwt.js) — package.json-д
 * ЗӨВХӨН нэг npm script нэмэгдэнэ.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const { loadConfig } = require('./lib/env');
const { createPrisma } = require('./lib/db');
const { ensureServer, stopServer } = require('./lib/server');
const { seed, cleanup } = require('./fixture');
const { runLevel } = require('./run-level');

const DEFAULTS = {
  levels: [50, 200, 500, 1000],
  saveCount: 8, // сурагч тутамд autosave тоо (шахсан — §-ийн тайлбар vuser.js-д)
  saveIntervalMs: 200, // autosave-ийн зай (жинхэнэ 1200ms debounce-оос шахсан)
  arriveSpreadMs: 3000, // "proctor эхлүүлье" бөөгнөрлийг энэ хугацаанд тарааж эхлүүлнэ
  settleMs: 1500, // түвшин хоорондын амралт (холболт chill down)
};

// ⚠️ `parseInt(env) || fallback` ХЭРЭГЛЭХГҮЙ — env-ээр ЗОРИУДААР `0` дамжуулбал
// (жишээ: LOADTEST_ARRIVE_SPREAD_MS=0 — синхрон burst тест) JS-ийн falsy
// дүрмээр `0 || fallback` = fallback болж, хэрэглэгчийн зорьсон 0 утга ЧИМЭЭГҮЙ
// үл хэрэгсэгдэнэ. Тодорхой "тохируулаагүй эсэх"-ийг шалгана.
function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function parseLevels(raw) {
  if (!raw) return DEFAULTS.levels;
  return raw
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

function ensureBuilt(apiRoot) {
  console.log('[build] `npm run build` ажиллуулж байна (одоогийн код Prisma клиент/dist-тэй тааруулах)...');
  execSync('npm run build', { cwd: apiRoot, stdio: 'inherit' });
}

function printLevelReport(result) {
  const p = (x) => `${x}ms`;
  console.log(
    `\n=== N=${result.level} (${result.studentsRun} сурагч ажиллав, ${result.studentsFailed} бүтэлгүйтэв) ===`,
  );
  console.log(
    `  wall=${result.wallMs}ms  нийт хүсэлт=${result.totalRequests}  req/s=${result.reqPerSec}  алдааны хувь=${(result.overallErrorRate * 100).toFixed(2)}%`,
  );
  for (const key of ['start', 'session', 'submit']) {
    const ph = result.phases[key];
    console.log(
      `  ${key.padEnd(8)} n=${String(ph.count).padStart(6)} err=${String(ph.errors).padStart(4)} ` +
        `p50=${p(ph.p50).padStart(8)} p95=${p(ph.p95).padStart(8)} p99=${p(ph.p99).padStart(8)} max=${p(ph.max).padStart(8)}`,
    );
    if (Object.keys(ph.statusCounts).length) {
      console.log(`             статус тоо: ${JSON.stringify(ph.statusCounts)}`);
    }
  }
}

async function main() {
  const config = loadConfig(); // 🚨 SAFETY GUARD энд ажиллана — localhost биш бол throw
  const apiRoot = path.join(__dirname, '..', '..');

  const levels = parseLevels(process.env.LOADTEST_LEVELS);
  const saveCount = envInt('LOADTEST_SAVE_COUNT', DEFAULTS.saveCount);
  const saveIntervalMs = envInt('LOADTEST_SAVE_INTERVAL_MS', DEFAULTS.saveIntervalMs);
  const arriveSpreadMsBase = envInt('LOADTEST_ARRIVE_SPREAD_MS', DEFAULTS.arriveSpreadMs);
  const keepFixture = !!process.env.LOADTEST_KEEP_FIXTURE;
  const skipBuild = !!process.env.LOADTEST_SKIP_BUILD;

  console.log('=== Ачааллын тест — 1000 сурагч 100 минутын шалгалт сценар ===');
  console.log(`Зорилтот API: ${config.apiBase}`);
  console.log(`DATABASE_URL host баталгаажлаа: localhost ✅`);
  console.log(`Түвшнүүд: ${levels.join(', ')}`);
  console.log(`Сурагч тутамд autosave: ${saveCount} × ${saveIntervalMs}ms зай`);

  if (!skipBuild) ensureBuilt(apiRoot);

  const { started, proc } = await ensureServer({ apiBase: config.apiBase });

  const prisma = createPrisma(config.databaseUrl);
  let manifest;
  const results = [];
  let abortedAt = null;

  try {
    manifest = await seed({ prisma, levels });

    for (const { level, testId } of manifest.levelTests) {
      // Илүү их сурагч → илүү урт ирэлтийн цонх (жинхэнэ "1000 сурагч 30-60с
      // дотор нэвтэрнэ" бөөгнөрлийг ойролцоолсон дүрэм — line
      const arriveSpreadMs = Math.round(arriveSpreadMsBase * Math.max(1, level / 200));
      console.log(`\n[level ${level}] эхэллээ — testId=${testId}, arriveSpread=${arriveSpreadMs}ms`);
      const result = await runLevel({
        apiBase: config.apiBase,
        jwtSecret: config.jwtSecret,
        level,
        testId,
        studentIds: manifest.studentIds,
        problemIds: manifest.problemIds,
        arriveSpreadMs,
        saveCount,
        saveIntervalMs,
      });
      results.push(result);
      printLevelReport(result);

      // Хэрэв энэ түвшинд ХАМГИЙН ИХ хэсэг нь бүтэлгүйтвэл (сервер унасан
      // байж болзошгүй) илүү өндөр түвшинд шилжихгүй — цаашид зөвхөн
      // алдааны цуврал л бичигдэнэ.
      if (result.overallErrorRate > 0.5) {
        abortedAt = level;
        console.error(
          `\n🚨 N=${level}-д алдааны хувь ${(result.overallErrorRate * 100).toFixed(1)}% — цаашдын түвшинд ШИЛЖИХГҮЙ (сервер эвдэрсэн байж магадгүй).`,
        );
        break;
      }

      await new Promise((r) => setTimeout(r, DEFAULTS.settleMs));
    }
  } finally {
    if (!keepFixture && manifest) {
      try {
        await cleanup({ prisma, manifest });
      } catch (e) {
        console.error(`🚨 CLEANUP АЛДАА — гараар шалгах шаардлагатай! manifest дор хадгалагдав. ${e.message}`);
        const failPath = path.join(os.tmpdir(), `pimn-loadtest-cleanup-failed-${manifest.runId}.json`);
        fs.writeFileSync(failPath, JSON.stringify(manifest, null, 2));
        console.error(`manifest бичигдлээ: ${failPath}`);
      }
    } else if (keepFixture && manifest) {
      const keepPath = path.join(os.tmpdir(), `pimn-loadtest-manifest-${manifest.runId}.json`);
      fs.writeFileSync(keepPath, JSON.stringify(manifest, null, 2));
      console.log(`[fixture] LOADTEST_KEEP_FIXTURE тавигдсан тул устгаагүй. manifest: ${keepPath}`);
    }
    await prisma.$disconnect();
    if (started) stopServer(proc);
  }

  const outPath = path.join(os.tmpdir(), `pimn-loadtest-results-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify({ config: { levels, saveCount, saveIntervalMs, arriveSpreadMsBase }, abortedAt, results }, null, 2));
  console.log(`\n=== ДҮГНЭЛТ ===`);
  console.log(`Бүрэн үр дүн (JSON): ${outPath}`);
  for (const r of results) {
    console.log(
      `N=${String(r.level).padStart(4)}  req/s=${String(r.reqPerSec).padStart(7)}  ` +
        `session p95=${String(r.phases.session.p95).padStart(6)}ms  session p99=${String(r.phases.session.p99).padStart(6)}ms  ` +
        `алдаа=${(r.overallErrorRate * 100).toFixed(2)}%`,
    );
  }
  if (abortedAt) {
    console.log(`\n⚠️  N=${abortedAt}-д зогссон (алдааны хувь >50%).`);
  }
}

main().catch((e) => {
  console.error('\n🚨 АЛДАА:', e.message);
  if (e.stack) console.error(e.stack);
  process.exit(1);
});
