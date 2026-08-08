/* ============================================================================
 * Endpoint smoke test — БҮХ бүртгэгдсэн маршрутыг эрхийн түвшин бүрээр дуудаж
 * ГЭНЭТИЙН алдаа (500, унасан холболт) байгаа эсэхийг олно.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ:
 * Unit тест нь функцийг тусад нь шалгадаг ч «модуль бүртгэгдээгүй», «guard
 * буруу», «DTO байхгүй тул body задлахад унана», «Prisma-гийн харьцаа буруу»
 * гэх мэт алдаа зөвхөн БОДИТ HTTP дуудлагад л илэрдэг. Энэ файл яг түүнийг
 * барина.
 *
 * ЮУГ АЛДАА ГЭЖ ҮЗЭХ ВЭ:
 *   • 5xx           — үргэлж алдаа (серверийн дотоод унал)
 *   • нэвтрээгүй үед 200 — хамгаалалтгүй үлдсэн маршрут (АЮУЛГҮЙ БАЙДЛЫН цоорхой)
 * Хүлээгдэх хариу: 200/201 (эрхтэй), 400 (валидаци), 401/403 (эрх), 404 (алга).
 *
 * Ажиллуулах:  npm run smoke          (build + маршрут шинэчлэх + шалгах)
 *              node test/smoke/endpoints.mjs [--base http://localhost:3000]
 * Урьдчилсан нөхцөл: API асаалттай, ӨС-д тест хэрэглэгчид байгаа.
 * ========================================================================== */

/**
 * ЗОРИУДААР нээлттэй маршрутууд — нэвтрээгүй хүнд 200 буцаах нь ЗӨВ.
 *
 * Шинэ маршрут энэ жагсаалтад ОРОХГҮЙГЭЭР нээлттэй болвол шалгалт анхааруулна.
 * Жагсаалтад нэмэхийн өмнө «яагаад нээлттэй байх ёстой вэ» гэдгээ бод.
 */
const INTENTIONALLY_PUBLIC = new Map([
  ['GET /api', 'үндсэн health/танилцуулга'],
  ['GET /api/books', 'нүүр хуудсанд номын жагсаалт харуулна'],
  ['GET /api/chapters', 'үнэгүй урьдчилан үзэх бүлгүүд'],
  ['GET /api/catalog/passes', 'үнийн санал — бүртгүүлэхээс өмнө харна'],
  ['GET /api/enrollment-windows', 'элсэлтийн хугацаа — нийтэд ил'],
  ['GET /api/store/products', 'дэлгүүрийн бараа — бүртгүүлэхээс өмнө харна'],
  [
    'POST /api/gateways/qpay/callback',
    'QPay сервер дуудна (JWT явуулахгүй). Body-д итгэдэггүй — invoice id-гаар ' +
      'QPay руу буцаж /v2/payment/check дуудаж баталгаажуулдаг тул хуурамч ' +
      'callback ашиггүй (gateways.controller.ts-ийн тайлбарыг үз).',
  ],
]);

const args = process.argv.slice(2);
const BASE = valueOf("--base") ?? "http://localhost:3000";
const ONLY = valueOf("--only"); // жишээ: --only /api/sms
const VERBOSE = args.includes("--verbose");

function valueOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Замын параметрт тавих ойлгомжтой ХУУРАМЧ утга — жинхэнэ мөр устгахгүй */
const FAKE_ID = "smoketest0000000000000000";

/**
 * Бичих үйлдлийг ХООСОН биетэй дуудна: зорилго нь өгөгдөл үүсгэх биш,
 * «валидацигүй тул унана уу?» гэдгийг шалгах. Хоосон биеттэй бүх бичих
 * маршрут 400 (эсвэл 401/403) буцаах ёстой — 500 бол алдаа.
 */
const WRITE_BODY = {};

async function login(identifier, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(`login ${identifier} → ${res.status}`);
  const json = await res.json();
  return json.accessToken;
}

function fillParams(path) {
  return path.replace(/:[A-Za-z0-9_]+/g, FAKE_ID);
}

async function call(method, path, token) {
  const url = BASE + fillParams(path);
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const init = { method, headers };
  if (method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify(WRITE_BODY);
  }

  const started = Date.now();
  try {
    const res = await fetch(url, init, { signal: AbortSignal.timeout(20_000) });
    let snippet = "";
    if (res.status >= 500 || VERBOSE) {
      snippet = (await res.text()).slice(0, 300);
    }
    return { status: res.status, ms: Date.now() - started, snippet };
  } catch (err) {
    return { status: 0, ms: Date.now() - started, snippet: String(err) };
  }
}

async function main() {
  const routesRaw = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("./routes.txt", import.meta.url), "utf8"),
  );
  let routes = routesRaw
    .trim()
    .split("\n")
    .map((line) => {
      const [method, ...rest] = line.trim().split(/\s+/);
      return { method, path: rest.join(" ") };
    })
    .filter((r) => r.method && r.path);

  if (ONLY) routes = routes.filter((r) => r.path.startsWith(ONLY));

  // Нэвтрэлтийн маршрутыг алгасна — эдгээрийг дуудвал rate limit-д цохиулж,
  // үлдсэн бүх шалгалт 429 болж хуурамч «алдаа» болно.
  const SKIP = new Set([
    "POST /api/auth/login",
    "POST /api/auth/register",
    "POST /api/auth/forgot-password",
    "POST /api/auth/reset-password",
  ]);
  routes = routes.filter((r) => !SKIP.has(`${r.method} ${r.path}`));

  console.log(`Суурь: ${BASE}`);
  console.log(`Маршрут: ${routes.length}\n`);

  const actors = {
    anon: null,
    student: await login(process.env.SMOKE_STUDENT ?? "80601209", process.env.SMOKE_STUDENT ?? "80601209"),
    teacher: await login(process.env.SMOKE_TEACHER ?? "95655938", process.env.SMOKE_TEACHER ?? "95655938"),
    admin: await login(process.env.SMOKE_ADMIN ?? "99294266", process.env.SMOKE_ADMIN ?? "99294266"),
  };
  console.log("Нэвтрэлт: student, teacher, admin — бэлэн\n");

  const serverErrors = [];
  const unprotected = [];
  const slow = [];
  let checked = 0;

  for (const route of routes) {
    for (const [actor, token] of Object.entries(actors)) {
      const r = await call(route.method, route.path, token);
      checked++;

      if (r.status >= 500 || r.status === 0) {
        serverErrors.push({ ...route, actor, ...r });
      }
      // Нэвтрээгүй хүн амжилттай хариу авбал маршрут хамгаалалтгүй —
      // зориудаар нээлттэй гэж бүртгэгдээгүй бол л анхааруулна.
      const key = `${route.method} ${route.path}`;
      if (
        actor === "anon" &&
        (r.status === 200 || r.status === 201) &&
        !INTENTIONALLY_PUBLIC.has(key)
      ) {
        unprotected.push({ ...route, status: r.status });
      }
      if (r.ms > 3000) slow.push({ ...route, actor, ms: r.ms });
    }
  }

  console.log(`Шалгасан дуудлага: ${checked}\n`);

  report("🔴 СЕРВЕРИЙН АЛДАА (5xx / холболт тасарсан)", serverErrors, (e) =>
    `${e.method} ${e.path}  [${e.actor}] → ${e.status}\n     ${e.snippet.replace(/\n/g, " ").slice(0, 200)}`,
  );
  report(
    "🟠 ХАМГААЛАЛТГҮЙ (нэвтрээгүй хүнд 200 буцаав — жагсаалтад бүртгэгдээгүй)",
    unprotected,
    (e) => `${e.method} ${e.path} → ${e.status}`,
  );
  report("🟡 УДААН (>3с)", slow, (e) => `${e.method} ${e.path} [${e.actor}] ${e.ms}ms`);

  const failed = serverErrors.length > 0;
  console.log(failed ? "\nҮР ДҮН: АЛДААТАЙ" : "\nҮР ДҮН: серверийн алдаагүй");
  process.exit(failed ? 1 : 0);
}

function report(title, items, format) {
  console.log(`${title}: ${items.length}`);
  for (const item of items) console.log(`   ${format(item)}`);
  console.log("");
}

main().catch((err) => {
  console.error("Smoke test өөрөө унав:", err);
  process.exit(2);
});
