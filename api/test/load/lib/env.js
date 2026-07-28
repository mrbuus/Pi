'use strict';
/**
 * Ачааллын тестийн ТӨВ АЮУЛГҮЙ БАЙДЛЫН ХАШАА.
 *
 * 🚨 ЭНЭ ФАЙЛ ЗӨВХӨН localhost DB/API-г зөвшөөрнө. DATABASE_URL эсвэл
 * зорилтот API host нь localhost/127.0.0.1/::1 биш бол ШУУД throw хийж
 * бүх ачааллын тестийг зогсооно — Render/production руу санамсаргүй ачаалал
 * илгээхээс хамгаална (CLAUDE.md-ийн "SAFETY" шаардлага).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const DEFAULT_API_BASE = 'http://localhost:3000/api';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function assertLocalhost(urlStr, label) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error(`🚨 SAFETY GUARD: ${label} буруу URL байна: ${urlStr}`);
  }
  if (!LOCAL_HOSTS.has(parsed.hostname)) {
    throw new Error(
      `🚨 SAFETY GUARD: ${label} нь localhost биш байна (host="${parsed.hostname}"). ` +
        'Ачааллын тест ЗӨВХӨН орон нутгийн dev DB/сервер дээр ажиллана — ' +
        'Render/production руу заавал зааж болохгүй тул ЗОГСООВ.',
    );
  }
}

function loadConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL орчны хувьсагч тохируулаагүй байна (.env шалгана уу)');
  }
  assertLocalhost(databaseUrl, 'DATABASE_URL');

  const apiBase = process.env.LOADTEST_API_BASE || DEFAULT_API_BASE;
  assertLocalhost(apiBase, 'LOADTEST_API_BASE (зорилтот API)');

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET орчны хувьсагч тохируулаагүй байна (.env шалгана уу)');
  }

  return { databaseUrl, apiBase, jwtSecret };
}

module.exports = { loadConfig, assertLocalhost, DEFAULT_API_BASE };
