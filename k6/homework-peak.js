// Гэрийн даалгаврын оргил (22:00–23:00) — 500 VU, ~10 минут. ЗӨВХӨН локал QA хуулбар сан
// эсвэл private staging (target.js хамгаална). Ажиллуулах заавар: k6/README.md.
//
// VU бүр (нэг синтетик сурагч):
//   0–60с санамсаргүй хүлээгээд ирнэ → GET /homework/my → POST /homework/attempts
//   → PATCH autosave ~20с ±5с тутам → 2 удаа /check → /submit
//   → POST /uploads/presign (homework PDF) → (зөвхөн локал S3/minio үед) PUT + /uploads/complete
import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { safeTarget } from './target.js';

const target = safeTarget(__ENV.LOAD_TARGET, Boolean(__ENV.LOAD_TARGET));
const vus = Number(__ENV.LOAD_VUS || 500);
if (!Number.isInteger(vus) || vus < 1 || vus > 1000) throw new Error('LOAD_VUS must be 1..1000');
const autosaves = Number(__ENV.LOAD_AUTOSAVES || 24); // 24 × 20с ≈ 8 минут
if (!Number.isInteger(autosaves) || autosaves < 3 || autosaves > 60) throw new Error('LOAD_AUTOSAVES must be 3..60');
const thinkSec = Number(__ENV.LOAD_THINK_SEC || 20);
if (!(thinkSec >= 0 && thinkSec <= 60)) throw new Error('LOAD_THINK_SEC must be 0..60');
// presigned PUT зөвхөн loopback S3-тай нийцтэй (minio) хаяг руу — бодит S3 руу ачаалал илгээхгүй
const s3Local = __ENV.LOAD_S3_LOCAL === '1';

const fixtures = new SharedArray('synthetic homework students', () =>
  JSON.parse(open(__ENV.LOAD_FIXTURE || './homework-fixture.json')),
);
if (fixtures.length < vus) throw new Error('Need a distinct synthetic fixture/token for every VU');
const tokens = new Set();
for (const f of fixtures) {
  if (
    typeof f.token !== 'string' || !f.token || tokens.has(f.token) ||
    typeof f.testId !== 'string' || !/^lttest_/.test(f.testId) ||
    typeof f.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(f.date) ||
    typeof f.classroomId !== 'string' || !/^ltclass_/.test(f.classroomId)
  )
    throw new Error('Only distinct synthetic load-test fixtures are accepted (lttest_/ltclass_ ids)');
  tokens.add(f.token);
}

export const options = {
  scenarios: {
    homework: { executor: 'per-vu-iterations', vus, iterations: 1, maxDuration: '12m', gracefulStop: '30s' },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.005'],
    checks: ['rate>0.995'],
    'http_req_duration{phase:list}': ['p(95)<500'],
    'http_req_duration{phase:start}': ['p(95)<800'],
    'http_req_duration{phase:autosave}': ['p(95)<300'],
    'http_req_duration{phase:check}': ['p(95)<800'],
    'http_req_duration{phase:submit}': ['p(95)<800'],
    'http_req_duration{phase:presign}': ['p(95)<300'],
  },
  maxRedirects: 0,
  discardResponseBodies: true,
};

const jitter = (base, spread) => Math.max(0, base + (Math.random() * 2 - 1) * spread);

export default function () {
  const s = fixtures[__VU - 1];
  const params = (phase, body = false) => ({
    headers: { Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json' },
    tags: { phase, name: `homework_${phase}` },
    redirects: 0,
    timeout: '20s',
    ...(body ? { responseType: 'text' } : {}),
  });
  const ok = (res, phase) => {
    if (!check(res, { [`${phase} 2xx`]: (r) => r.status >= 200 && r.status < 300 }))
      fail(`Synthetic homework ${phase} failed (${res.status})`);
    return res;
  };

  sleep(Math.random() * 60); // ирэлтийг тараана (бүгд нэг секундэд биш)

  ok(http.get(`${target}/homework/my?days=14`, params('list')), 'list');
  const started = ok(
    http.post(`${target}/homework/attempts`, JSON.stringify({ testId: s.testId, date: s.date }), params('start', true)),
    'start',
  ).json();
  const attemptId = started && started.attemptId;
  if (typeof attemptId !== 'string') fail('start returned no attemptId');
  const ids = (started.problems || []).map((p) => p.id);
  if (!ids.length) fail('start returned no problems');
  const url = `${target}/homework/attempts/${encodeURIComponent(attemptId)}`;
  const answers = {};
  const labels = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 0; i < autosaves; i++) {
    answers[ids[i % ids.length]] = labels[(__VU + i) % labels.length];
    ok(http.patch(url, JSON.stringify({ answers }), params('autosave')), 'autosave');
    if (i === Math.floor(autosaves / 2) || i === autosaves - 2)
      ok(http.post(`${url}/check`, JSON.stringify({ answers }), params('check')), 'check');
    sleep(jitter(thinkSec, thinkSec / 4));
  }
  ok(http.post(`${url}/submit`, JSON.stringify({ answers }), params('submit')), 'submit');

  // Зургийн PDF (6 хуудас ≈ 1.8 МБ) — presign нь серверийн ачаалал; PUT нь S3 руу шууд
  const size = 1_800_000;
  const plan = ok(
    http.post(
      `${target}/uploads/presign`,
      JSON.stringify({ name: 'homework.pdf', mime: 'application/pdf', size, purpose: 'homework' }),
      params('presign', true),
    ),
    'presign',
  ).json();
  if (!plan || !plan.direct || !s3Local) return; // S3-гүй QA орчин: complete-ийг алгасна
  if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(plan.url)) fail('Refusing to PUT to non-loopback S3');
  const pdf = `%PDF-1.7\n1 0 obj << /Type /Pages /Kids [] /Count 6 >> endobj\n${' '.repeat(size - 64)}\n%%EOF`;
  ok(http.put(plan.url, pdf, { headers: plan.headers, tags: { phase: 'put', name: 'homework_put' }, redirects: 0 }), 'put');
  const done = ok(
    http.post(`${target}/uploads/complete`, JSON.stringify({ ticket: plan.ticket, pages: 6 }), params('complete', true)),
    'complete',
  ).json();
  ok(
    http.post(
      `${target}/homework/photos`,
      JSON.stringify({ classroomId: s.classroomId, date: s.date, fileKey: done.key, pages: 6 }),
      params('photo'),
    ),
    'photo',
  );
}
