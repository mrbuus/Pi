'use strict';
/**
 * Хэрэв зорилтот API (localhost) аль хэдийн ажиллаж байвал түүнийг ашиглана
 * (жишээ нь `npm run start:dev` дэвшилтэт цонхонд ажиллаж байгаа бол).
 * Үгүй бол `dist/src/main.js`-г (build хийсэн prod bundle — ts-node/watch
 * overhead-гүй, жинхэнэ prod ойролцоо гүйцэтгэлтэй) дэд процесс болгон
 * асааж, эрүүл мэнд шалгасны дараа буцаана. Бид өөрсдөө асаасан бол ажил
 * дуусаад унтраана; хэрэглэгчийн аль хэдийн ажиллуулсан серверийг ХЭЗЭЭ Ч
 * унтраахгүй.
 */
const { spawn } = require('child_process');
const path = require('path');
const { request } = require('./http');

async function probe(apiBase) {
  const r = await request('GET', apiBase, { timeoutMs: 1500 });
  return r.status !== 0;
}

async function waitForServer(apiBase, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await probe(apiBase)) return true;
    if (Date.now() > deadline) {
      throw new Error(`Сервер ${apiBase} дээр ${timeoutMs}ms дотор амилсангүй`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}

async function ensureServer({ apiBase }) {
  if (await probe(apiBase)) {
    console.log(`[server] ${apiBase} дээр сервер АЛЬ ХЭДИЙН ажиллаж байна — үүнийг ашиглана.`);
    return { started: false, proc: null };
  }

  const apiRoot = path.join(__dirname, '..', '..', '..');
  console.log('[server] localhost дээр сервер олдсонгүй — dist/src/main.js-г дэд процесс болгон асааж байна...');
  const proc = spawn('node', ['dist/src/main.js'], {
    cwd: apiRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let startupLog = '';
  proc.stdout.on('data', (c) => {
    startupLog += c.toString();
  });
  proc.stderr.on('data', (c) => {
    startupLog += c.toString();
  });
  proc.on('exit', (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`[server] дэд процесс ${code} кодтой гарлаа (signal=${signal}).\n${startupLog.slice(-2000)}`);
    }
  });

  try {
    await waitForServer(apiBase, 30000);
  } catch (e) {
    proc.kill('SIGTERM');
    throw new Error(`${e.message}\n--- сервэрийн лог (сүүлийн 2000 тэмдэгт) ---\n${startupLog.slice(-2000)}`);
  }
  console.log('[server] сервер бэлэн боллоо.');
  return { started: true, proc };
}

function stopServer(proc) {
  if (!proc) return;
  console.log('[server] бидний асаасан серверийг унтрааж байна...');
  proc.kill('SIGTERM');
}

module.exports = { ensureServer, stopServer };
