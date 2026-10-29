# G31: шалгалтын ачааллын шалгалт

Энэ PR хэмжилтийн үр дүн амлахгүй. 2000 VU, тус бүр нэг удаа start, 20 тусдаа бодлогын autosave, submit. 0.2 секундийн бодох хугацаа нь шахсан синтетик ачаалал; жинхэнэ 100 минутын шалгалт/хөдөлгөөнт сүлжээ/5000 сурагчийг батлахгүй.

Зорилт: хүсэлт ба phase бүрийн p95 <500ms, HTTP алдаа <0.5%, check амжилт >99.5%. Threshold унавал k6 exit code амжилтгүй. Redirect дагахгүй. VU бүр ялгаатай synthetic token/test fixture ашиглана. Бодит нэр/утас/токен хэрэглэхгүй.

## Ажиллуулах (эзний тусгаарласан локал орчин)

1. Локал PostgreSQL дээр шинэ test database, additive migrations, синтетик JWT_SECRET тохируул. Production `.env` хуулж болохгүй.
2. `cd api && npm run build && node test/load/prepare-k6.cjs` (default 2000 сурагч). Энэ команд зөвхөн loopback DB/API зөвшөөрнө; файл нь gitignore-д, mode 0600.
3. API-г тухайн DB/JWT-тэй асаа. `LOAD_FIXTURE=/absolute/path/api/test/load/.synthetic-k6/fixture.json k6 run k6/exam.js`-ийг repo root-оос ажиллуул. k6 binary тусдаа шаардлагатай; энэ PR автоматаар суулгахгүй. `LOAD_VUS=1` бол эхний smoke, дараа нь 2000.
4. JSON үр дүн хэрэгтэй бол `--summary-export k6/results-local.json`. Token/response body нийтлэхгүй. Доорх STATUS загварт зөвхөн нийлбэр хэмжилт бич.
5. `cd api && node test/load/prepare-k6.cjs --clean` — үүсгэсэн synthetic мөрүүдийг цэвэрлэнэ. Хуучин серверийг унтраахгүй. Fixture үүсгэх явц тасалдсан бол тусгаарласан test database-аа шинээр үүсгэ.

`LOAD_TARGET` өгөөгүй үед `http://127.0.0.1:3000/api`. Өгсөн үед зөвхөн loopback эсвэл literal RFC1918 private IPv4 staging. Pi.mn, Render, Vercel болон бусад public domain/IP бүрийг fail-closed хориглоно; public staging-д энэ script зориуд ажиллахгүй. Node runner `npm run loadtest:exam` мөн loopback-only хэвээр; default levels 50/200/500/1000/2000, 20 autosave; босго давахгүй бол exit 2.

## Кодын шалгалт

`node --test k6/contract.test.cjs` нь HTTP дуудлагагүйгээр target guard, 20 өөр бодлого, fail-fast, 2000 VU тохиргоо, threshold-ийг шалгана. `node --test api/test/load/acceptance.test.cjs` нь Node runner-ийн зорилтот босгыг шалгана. Энэ нь бодит 2000-VU хэмжилт биш.

Эх сурвалж: [k6 per-VU iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/per-vu-iterations/), [thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/).

## Гэрийн даалгаврын оргил — `k6/homework-peak.js` (2026-10-29)

500 VU, нэг аялал/VU, ~10 минут: 0–60с тарсан ирэлт → `GET /homework/my` → `POST /homework/attempts` → `PATCH` autosave 20с ±5с тутам (анхдагч 24 удаа) → 2 удаа `/check` → `/submit` → `POST /uploads/presign` (homework PDF, 1.8 МБ). `complete` + `POST /homework/photos` нь зөвхөн `LOAD_S3_LOCAL=1` ба presigned URL loopback (minio) үед — бодит S3 руу PUT хийхгүй.

Босго: нийт p95 <500ms, autosave/presign p95 <300ms, start/check/submit p95 <800ms, алдаа <0.5%.

**Ажиллуулах — зөвхөн локал QA ХУУЛБАР сан дээр** (жинхэнэ `pimn_v2` 127.0.0.1:5544 дээр БИШ, прод БИШ):

1. `createdb pimn_qa_load` → `pg_restore` хуучин dump-аас эсвэл хоосон схем + `prisma migrate deploy` (`DATABASE_URL` нь ЗӨВХӨН энэ хуулбар руу)
2. Хуулбар дээр синтетик анги `ltclass_*`, тест `lttest_*` (B хувилбар), 500 сурагч үүсгэж, тухайн өдөр ангид нээгдсэн байдлаар тохируулна; сурагч бүрийн JWT-г хуулбарын тусдаа `JWT_SECRET`-ээр
3. `k6/homework-fixture.json` (commit хийхгүй, mode 0600): `[{ "token", "testId": "lttest_…", "date": "YYYY-MM-DD", "classroomId": "ltclass_…" }, …]` — VU бүрт ялгаатай token
4. API-г хуулбарын `DATABASE_URL`/`JWT_SECRET`-ээр асаагаад repo root-оос:
   ```bash
   LOAD_VUS=1 LOAD_THINK_SEC=1 LOAD_FIXTURE=$PWD/k6/homework-fixture.json k6 run k6/homework-peak.js   # smoke
   LOAD_FIXTURE=$PWD/k6/homework-fixture.json k6 run --summary-export k6/results-homework.json k6/homework-peak.js
   ```
5. Дууссаны дараа хуулбар санг `dropdb pimn_qa_load`

Оффлайн шалгалт: `node --test k6/homework-peak.test.cjs` (HTTP дуудлагагүй — аялал, guard, S3 хамгаалалт).
