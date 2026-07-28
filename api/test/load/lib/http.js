'use strict';
/**
 * Хөнгөн HTTP клиент — Node.js built-in `http`/`https`-ээр (fetch/undici-ийн
 * далд connection pool-ийн хязгаарлалтад орохгүйн тулд ӨӨРИЙН keep-alive
 * agent-тай, `maxSockets` өндөр тавьсан) — 1000 зэрэг виртуал сурагчийн
 * socket-ийг клиент тал өөрөө артефакт хэлбэрээр бөглөрүүлэхгүйн тулд.
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');

const AGENT_OPTS = { keepAlive: true, maxSockets: 4096, maxFreeSockets: 512 };
const httpAgent = new http.Agent(AGENT_OPTS);
const httpsAgent = new https.Agent(AGENT_OPTS);

function request(method, urlStr, { token, body, timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    let target;
    try {
      target = new URL(urlStr);
    } catch (e) {
      resolve({ ok: false, status: 0, ms: 0, error: `буруу URL: ${e.message}` });
      return;
    }
    const isHttps = target.protocol === 'https:';
    const lib = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;
    const payload = body !== undefined ? JSON.stringify(body) : undefined;
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload !== undefined) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const start = process.hrtime.bigint();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const req = lib.request(
      {
        method,
        hostname: target.hostname,
        port: target.port || (isHttps ? 443 : 80),
        path: `${target.pathname}${target.search}`,
        headers,
        agent,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const ms = Number(process.hrtime.bigint() - start) / 1e6;
          let json;
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            json = raw ? JSON.parse(raw) : undefined;
          } catch {
            json = undefined;
          }
          finish({ ok: res.statusCode < 400, status: res.statusCode, ms, json });
        });
      },
    );
    req.on('timeout', () => {
      req.destroy();
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      finish({ ok: false, status: 0, ms, error: 'timeout' });
    });
    req.on('error', (err) => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      finish({ ok: false, status: 0, ms, error: err.message });
    });
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { request, sleep };
