# 10 000 хэрэглэгч хүртэл тогтвортой ажиллах судалгаа (2026-11-14)

Хамрах хүрээ: `api/` (NestJS + Prisma 7 + PostgreSQL), `web/` (Next.js 16.4.3), `piemath_app/` (Flutter),
`infra/aws/`, `k6/`, `ops/`. Репогийн HEAD `a0ca3a3a`. Прод сервер, прод сан, pimath.mn руу ХАНДААГҮЙ,
ачааллын тест АЖИЛЛУУЛААГҮЙ. Үнэ нь AWS Price List-ийн ap-east-1 файлаас (нийтлэгдсэн 2026-11-11),
сарыг 730 цагаар, on-demand, НӨАТ-гүй тооцов.

Тэмдэглэгээ: **[код]** — репогоос шалгасан, **[баримт]** — репогийн баримтад бичсэн (прод дээр
дахин шалгаагүй), **[эх]** — гадны эх сурвалж, **[таамаг]** — тооцооны таамаглал, хэмжиж батлах ёстой.

---

## 0. Товч дүгнэлт

1. Одоогийн бүтэц (1× EC2 t4g.small дээр API + вэб + build, RDS db.t4g.micro single-AZ) нь ганц цэгийн доголдолтой; аль нэг нь унавал бүх систем зогсоно.
2. ХАМГИЙН ЯАРАЛТАЙ: AWS данс Free plan дээр байгаа бол кредит дуусахад данс түр хаагдана [эх] — Paid руу шилжсэн эсэхийг эзэн өнөөдөр шалгах.
3. Код ерөнхийдөө сайн бэлтгэлтэй (pool 15, statement_timeout, 503 буулгалт, jitter-тэй heartbeat, presigned upload, submit-ийн уралдааны хамгаалалт) [код].
4. Гол сул тал: прод сервер дээр build, хяналт/анхааруулга байхгүй, нөөц 1 хоног, бүх cron API процесс дотор, санах ойн rate limit, k6 хэзээ ч ажиллаагүй.
5. 10 000 бүртгэлтэйд оргил үед ~1 000 зэрэг идэвхтэй, ~110–230 хүсэлт/с [таамаг]; муу өдөр ~560 хүсэлт/с; бүгд нэг дор бол ~1 000+ хүсэлт/с.
6. (А) Одоо: Paid plan, нөөц 7–14 хоног + S3 руу хуулбар, build-ийг CI руу, EC2 → t4g.medium, хяналт, 6 жижиг кодын засвар — сард ~$65–100.
7. (Б) 2 000–3 000 идэвхтэй: ALB + 2 EC2 (2 AZ), RDS t4g.medium Multi-AZ, Valkey, CloudFront Pro — сард ~$350–400.
8. (В) 10 000: ECS Fargate (API автомат тэлэлттэй, вэб, тусдаа worker + BullMQ), RDS m8g.large Multi-AZ, CloudFront Business (WAF орсон) — сард ~$830–1 000.
9. Kubernetes, микросервис, олон region, read replica, өөрөө ажиллуулдаг PgBouncer-ийг ХИЙХГҮЙ — энэ хэмжээнд зардал, эрсдэл нэмэхээс өөр ашиггүй.
10. Шат бүрийг шөнийн 0–1 цагт, прод биш хуулбар сан дээр k6-ийн тодорхой сценари, босгоор (p95, алдааны хувь) хүлээн авна (§4, §5).

---

## 1. Одоогийн байдал ба сул тал

### 1.1 Бүтэц (баримтаас)

```
Хэрэглэгч ──HTTPS──► EC2 t4g.small (2 vCPU, 2 GB + 2 GB swap), ap-east-1a, Elastic IP
                     nginx ─┬─ /api/* → pm2 pimath-api (:3380, Nest, 1 процесс)
                            └─ бусад → pm2 pimath-web (:3381, next start)
                     + энэ машин дээрээ git pull, npm ci, build (NODE_OPTIONS=3072, swap ашиглана)
                     + ~/backups/*.dump (deploy бүрийн өмнөх pg_dump)
                          │
                          ▼
                     RDS db.t4g.micro (2 vCPU, 1 GiB), PostgreSQL 18.3, single-AZ, gp3 20 GB
                     S3 pimath-media (presigned PUT/GET), FCM, Gmail SMTP, Google Sheets
DNS: Datacom (ns*.dns.mn), A → 18.167.227.21, TTL 7200
```

Эх: `infra/aws/README.md:82-91`, `:130-141`. `STATUS.md` §1, §4 нь Render/Vercel/Supabase гэж
хуучирсан — дэд бүтцийн үнэн эх нь `infra/aws/README.md`.

Одоогийн сарын зардал [тооцоо]: EC2 $16.94 + EBS 20 GB $2.11 + IPv4 $3.65 + RDS $20.44 + RDS диск $3.00
+ S3/гарах урсгал ≈ **$47 + урсгал** (README-ийн «$40–50»-тэй таарна).

### 1.2 Сайн байгаа зүйлс [код]

| Зүйл | Хаана |
|---|---|
| Pool 15, connect timeout 5с, `statement_timeout` 10с, idle 30с | `api/src/prisma/prisma.service.ts:35-49` |
| ӨС-ийн түр алдаа → 503 (500 биш) | `api/src/common/prisma-exception.filter.ts`, `BACKEND-PERF.md` §6 |
| Хүсэлтийн timeout 60с, SIGTERM-д 25с зөөлөн унтралт | `api/src/main.ts:46-49`, `:76-99` |
| Хэрэглэгчээр (IP биш) rate limit 300/мин | `api/src/app.module.ts:103-131` |
| Шалгалтын heartbeat 20с ±20% jitter | `web/src/app/app/tests/[id]/page.tsx:108-112` |
| Аппын retry: full-jitter, зөвхөн GET/idempotent | `piemath_app/lib/core/network/api_client.dart:39-52` |
| Submit-ийн давхардлын хамгаалалт, алдааны дэвтэр араар | `BACKEND-PERF.md` §1–2 |
| Файл серверээр дамжихгүй: presigned PUT → S3, complete нь 128 KB л уншина | `infra/aws/README.md:101`, `:149-150` |
| Хэрэглээний бүртгэл 5с тутам нэг `createMany` | `api/src/usage/usage.service.ts:14-30` |
| Шийтийн синк, имэйлийн ажлууд ӨС-ийн түгжээтэй | `sheet-sync.service.ts:142-150`, `jobs/jobs.service.ts:48-58` |
| Аппын офлайн кэш, ETag/304, SWR | `piemath_app/docs/PERF-OFFLINE.md` |
| `health/live`, `health/ready` (ӨС шалгана) | `api/src/health.controller.ts:11-24` |

### 1.3 Сул тал, эрсдэл

Ач холбогдлоор (Ө = өндөр, Д = дунд, Б = бага).

| # | Эрсдэл | Нотолгоо | Зэрэг |
|---|---|---|---|
| R1 | AWS данс Free plan: кредит дуусах эсвэл 6 сар болоход данс түр хаагдаж, 90 хоногт шилжихгүй бол бүх өгөгдөл устна [эх]. Кредит $120, зардал ~$47/сар → 2026-10-19-нөөс ~2.5 сар | `infra/aws/README.md:31`, `:91` («Paid руу шилжүүлнэ» — тэмдэглэгээгүй) | **Ө** (шалгах) |
| R2 | Ганц EC2: API, вэб, nginx, build, нөөц нэг машин дээр. Машин эсвэл AZ унавал бүх зүйл зогсоно | `infra/aws/README.md:83-88` | Ө |
| R3 | RDS single-AZ, автомат нөөц **1 хоног** (Free plan) | `infra/aws/README.md:82` | Ө |
| R4 | Deploy бүрийн `pg_dump` нь яг тэр EC2 дээр (`~/backups`) — машин алдагдвал нөөц хамт алдагдана; сэргээлтийн дадлага хийгээгүй | `infra/aws/README.md:130` | Ө |
| R5 | Build прод сервер дээр: 2 GB RAM-д `max-old-space-size=3072` + swap → build-ийн үеэр API удааширна, OOM эрсдэл; deploy ~5 мин, pm2 restart-д 1–3с тасалдал | `infra/aws/README.md:136-141`, memory `pi-mn-deploy` | Ө |
| R6 | pm2-ийн санах ойн хязгаарын тохиргоо серверт хэрэгжээгүй | `infra/aws/ecosystem.config.cjs:1` | Д |
| R7 | Хяналт, анхааруулга байхгүй: Sentry/CloudWatch agent/uptime шалгалт олдсонгүй; удаан query-ийн лог анхдагчаар унтраалттай | `grep` хоосон; `prisma.service.ts:56` | Ө |
| R8 | Ачааллын тест хэзээ ч ажиллаагүй — бодит чадвар тодорхойгүй | `STATUS.md:123-140`, `:1139`, `:1146` | Ө |
| R9 | Бүх cron API процесс дотор: шийтийн синк 5 мин тутам, алдааны дэвтэр 5 мин тутам, **23:30-д өдрийн дүгнэлт (оргил цагт)**, **Ням 20:00-д эцэг эхийн 7 хоногийн имэйл (оргил цагт)**, 03:30 файл устгал. Олон процесс болбол түгжээгүй хоёр нь давхар ажиллана | `sheet-sync.service.ts:111`, `mistake-collector.service.ts:207`, `attempts/summary.cron.ts:12`, `jobs/jobs.service.ts:41-47`, `storage/file-retention.service.ts:19` | Д |
| R10 | Rate limit, нэвтрэлтийн IP цонх, кэш, хэрэглээний буфер — бүгд процессын санах ойд. 2+ процесс болбол хязгаар үржигдэж, кэш зөрнө | `app.module.ts:103-112` (storage тодорхойлоогүй), `auth/login-attempts.ts:119`, `common/ttl-cache.ts`, `usage.service.ts:24` | Д |
| R11 | Нэвтрэлт: нэг IP-аас минутад нийт 60. Төвийн Wi-Fi (нэг гадаад IP)-аар 100 хүүхэд хичээлийн эхэнд нэвтэрвэл ~40 нь 429 авна | `auth/auth.controller.ts:47-57`, `login-attempts.ts:119` | Д |
| R12 | `trust proxy = 1` (nginx нэг давхарга). CloudFront/ALB нэмбэл бодит IP алдагдаж, бүх нэвтрээгүй хүсэлт нэг IP шиг тоологдоно | `api/src/main.ts:23` | Д (Б/В шатанд Ө) |
| R13 | `GET /users` — 5 000 хүртэл мөрийг анги, эцэг эхийн утас зэрэг relation-тэй нэг хариунд; Багш эрх ч дуудна. 10 000 сурагчид 5 000-аар тасарч, хариу MB-аар хэмжигдэнэ | `users/users.controller.ts:99-123`, `users/users.service.ts:829-882` | Д |
| R14 | Ангийн самбарын жагсаалт: Админд бүх анги, бүх сурагч, бүх `testResult`-ийг `IN (…10 000 id)`-аар нэг хүсэлтэд; кэшгүй | `class-dashboard/class-dashboard.service.ts:252-346` | Д |
| R15 | Шалгалтын autosave бүрд тестийн 40 бодлого + хариуг ӨС-ээс дахин уншина (тест эхэлсний дараа өөрчлөгддөггүй өгөгдөл) | `tests/tests.service.ts:1202-1220` | Д |
| R16 | Нэвтэрсэн хүсэлт бүр: JWT-г 2 удаа шалгана (throttler + passport) + 1 ӨС query (`user.findUnique`) | `app.module.ts:119-124`, `auth/jwt.strategy.ts:37-45` | Б |
| R17 | Push: токен бүрд дараалсан `fetch`, 429/5xx-д давталтгүй, API процесс дотор | `devices/push-sender.ts:73-102`, `notification-center.service.ts:84-85` | Д |
| R18 | Статик файлыг Next өөрөө үйлчилж, CDN байхгүй («лого л өдөрт ~50MB») | `web/next.config.ts:22-27` | Д |
| R19 | `/files/:key` → `no-store` + 302 presign: дахин үзэх бүрд API + S3 GET + S3-ийн гарах урсгал | `storage/uploads.controller.ts:414-433` | Б |
| R20 | `UiEvent`, `AuditLog`, `Attempt` хязгааргүй өснө (устгахгүй дүрэм). 10 000 хэрэглэгчид `UiEvent` жилд хэдэн арван сая мөр [таамаг] | `schema.prisma` (`UiEvent @@index([createdAt])`), memory `pi-mn-usage-tracking` | Д |
| R21 | RDS 1 GiB RAM: `shared_buffers` ~¼ → 10 000 сурагчийн `Attempt` (жилд ~60 сая мөр [таамаг]) санах ойд багтахгүй | `infra/aws/README.md:166-172` | Д (В шатанд Ө) |
| R22 | bcryptjs (цэвэр JS), cost 10 — нэвтрэлтийн давалгаанд CPU иднэ | `auth/auth.service.ts:290` | Б |
| R23 | Серверийн хатууруулах скрипт (TLS 1.2+, логт `?token` бичихгүй) ажиллаагүй | `ops/harden-server-2026-11-05.sh:1-2`, memory `pi-mn-security-audit` | Д |
| R24 | DNS TTL 7200, apex `pimath.mn` нь A бичлэг — ALB/CloudFront руу шилжихэд ALIAS эсвэл CNAME flattening хэрэгтэй | `infra/aws/README.md:61` | Д (Б шатанд) |
| R25 | EC2, RDS хоёулаа T ангилал: 20% суурь хүчин чадал, кредитээр давна; Unlimited горимд илүү хэрэглээ $0.04/vCPU-цаг [эх] | `infra/aws/README.md:82-83` | Д |

Индекс: халуун замын query бүр индекс ашиглана гэж 120 query-г `EXPLAIN`-аар шалгасан [баримт,
`BACKEND-PERF.md` §Индекс]. Нэмэлтээр анзаарсан: `TestAccess` нь `@@id([testId, classroomId])` тул
`classroomId IN (…)` (R14) нь индексийн эхний багана биш — хүснэгт жижиг бол асуудалгүй, хэмжих (§5).

---

## 2. Ачааллын загвар

### 2.1 Таамаглал (бүгд [таамаг] — §5-ын M1, M2-оор батална)

| # | Таамаглал | Утга |
|---|---|---|
| Т1 | Бүртгэлтэй | 10 000 (≈9 000 сурагч, ≈800 эцэг эх, ≈200 ажилтан) |
| Т2 | Хичээлтэй өдрийн идэвхтэй хэрэглэгч (DAU) | бүртгэлтэйн 50% = 5 000 |
| Т3 | Оргил цаг (20–22) | DAU-ийн 35% = 1 750 өвөрмөц; сүүлийн 60с-д идэвхтэй ≈ 1 000 |
| Т4 | Муу өдөр (шалгалтын үе, push-ийн дараа) | зэрэг идэвхтэй 2 500 |
| Т5 | Нэг идэвхтэй хэрэглэгчийн хүсэлт/с | үзэж буй 0.15 (30с тутам хуудас × 4–5 дуудлага); шалгалт өгч буй 0.08 (heartbeat 20с + autosave); гэрийн даалгавар 0.05 (heartbeat 45с, `HomeworkSolve.tsx:49`); багшийн самбар 0.10 (15с poll, `useBoard.ts:26`) |
| Т6 | Холимог (оргил) | 50% үзэж буй, 40% бодож буй, 10% ажилтан |
| Т7 | Минутын доторх бөөгнөрөл | дунджаас ×2 |
| Т8 | EC2 → RDS нэг round trip | 0.5–1 мс (`BACKEND-PERF.md` §Хэмжилтийн арга) |

### 2.2 Тооцоо

| Сценари | Зэрэг идэвхтэй | Дундаж хүсэлт/с | Оргил минут | Тайлбар |
|---|---|---|---|---|
| Одоо (~700 сурагч) | ~70–100 | ~10–15 | ~20–30 | Т1–Т7-г 7%-иар; одоо ажиллаж байгаатай нийцнэ |
| Ердийн оргил (10 000) | 1 000 | 1 000×(0.5×0.15+0.4×0.07+0.1×0.10) ≈ **113** | **~230** | |
| Муу өдөр | 2 500 | ≈ **280** | **~560** | |
| Бүгд нэг дор (онцгой) | 10 000 | ≈ **1 000** (шалгалт давамгайлсан холимог) | 1 500+ | нээлттэй улсын сорил гэх мэт; тусгай бэлтгэлтэй (§4 В+) |

**Холболтын хэрэгцээ (Little-ийн хууль):** зэрэг ӨС холболт ≈ хүсэлт/с × нэг хүсэлтийн ӨС-д
зарцуулах хугацаа. 560 хүсэлт/с × 0.05с ≈ **28 холболт** — нэг процессын pool 15 хүрэлцэхгүй;
2–3 процесс × 10–15 хэрэгтэй. RDS t4g.micro-ийн `max_connections` ≈ 80 [баримт], m8g.large-ийнх
томьёогоор ≈ 8 GiB / 9 531 392 ≈ 900 [эх].

### 2.3 Хамгийн муу тохиолдлууд

| Үйл явдал | Тооцоо [таамаг] | Юу эхэлж хязгаарлах вэ |
|---|---|---|
| 500 сурагч шалгалтын хугацаа дуусахад 10с дотор submit | 50 submit/с × 24 query = 1 200 query/с хүсэлтэд; араар 500 × 313 = 156 500 query (алдааны дэвтэр) нэг процесст дараалан ≈ 2–3 мин | pool (15), ӨС CPU (t4g.micro), араар ажил pool-оос холболт эзэлнэ |
| 1 000 сурагч 60с дотор шалгалт эхлүүлэх | 17 start/с × 18 query ≈ 300 query/с + тестийн агуулга | Test мөрийн `FOR SHARE` түгжээ (`tests.service.ts:1035`, `:1415`) — олон зэрэг SHARE нь multixact үүсгэнэ, хэмжих |
| 10 000 хүнд push, дараа нь давалгаа | Илгээлт дараалсан: токен тутам ~50–150 мс [таамаг] → 10 000 токен ≈ 8–25 мин (өөрөө тархаана). Хэрэв зэрэг илгээвэл 30% нь 2 минутад нээж 3 000 × 5 дуудлага / 120с ≈ **+125 хүсэлт/с** | Апп нээх үеийн 5 дуудлага (`auth/me`, hub overview, days, unread-count, мэдэгдэл) |
| Хичээлийн эхэнд нэг Wi-Fi-аас 100 нэвтрэлт | IP цонх 60/мин → ~40 нь 429; bcrypt 100 × ~0.1с CPU [таамаг] | R11 |
| Deploy оргил цагт | build CPU/swap + pm2 restart | R5 — 18–24-т deploy хийхгүй дүрэм бий |
| 23:30-ийн дүгнэлт, Ням 20:00-ийн имэйл | оргил ачаалал дээр нэмэгдэнэ | R9 |

---

## 3. Сонголтууд

Үнэ: ap-east-1, on-demand, сар = 730 цаг. Эх: AWS Price List (§Эх сурвалж [1]).

### 3.1 Тооцоонд ашигласан нэгж үнэ

| Нөөц | Нэгж үнэ | Сард |
|---|---|---|
| EC2 t4g.small / medium / large | $0.0232 / $0.0464 / $0.0928 цаг | $16.94 / $33.87 / $67.74 |
| EC2 c7g.large / m7g.large | $0.0910 / $0.1122 цаг | $66.43 / $81.91 |
| EC2 1 жил, урьдчилгаагүй: t4g.medium / c7g.large | $0.0292 / $0.0608 цаг | $21.32 / $44.38 |
| EBS gp3 | $0.1056 GB-сар | 30 GB = $3.17 |
| Нийтийн IPv4 | $0.005 цаг | $3.65 тус бүр |
| RDS PostgreSQL single-AZ: t4g.micro / small / medium / large | $0.028 / $0.056 / $0.111 / $0.222 цаг | $20.44 / $40.88 / $81.03 / $162.06 |
| RDS Multi-AZ: t4g.micro / small / medium / large | ×2 | $40.88 / $81.76 / $162.06 / $324.85 |
| RDS m8g.large single / Multi-AZ | $0.258 / $0.516 цаг | $188.34 / $376.68 |
| RDS m8g.large Multi-AZ, 1 жил урьдчилгаагүй | $0.3457 цаг | $252.36 |
| RDS gp3 диск single / Multi-AZ | $0.15 / $0.30 GB-сар | 50 GB = $7.5 / $15 |
| RDS Proxy | $0.022 vCPU-цаг, доод тал нь 2 vCPU [1][7] | ≈ $32.12 |
| ElastiCache Valkey t4g.micro / small | $0.0216 / $0.0416 цаг | $15.77 / $30.37 |
| Fargate ARM | $0.04449 vCPU-цаг, $0.00487 GB-цаг | 1 vCPU+2 GB = $39.59; 0.5+1 GB = $19.80 |
| ALB | $0.0277 цаг + $0.0088 LCU-цаг | ~$20.22 + LCU |
| NAT gateway | $0.065 цаг + $0.065 GB | ≥ $47 — ХЭРЭГЛЭХГҮЙ |
| Интернэт рүү гарах урсгал (EC2/ALB/S3) | эхний 10 TB $0.12 GB (бүх данс 100 GB/сар үнэгүй) | 1 TB ≈ $120 |
| CloudFront pay-go (Ази) | $0.12 GB + $0.012 / 10 000 HTTPS хүсэлт | |
| CloudFront flat: Free / Pro / Business | $0 / $15 / $200 сард [2][3] | хүсэлт 1 сая / 10 сая / 125 сая; урсгал 100 GB / 50 TB / 50 TB; WAF, DDoS орсон, давсан төлбөргүй |
| WAF (ALB дээр тусад нь) | $5 web ACL + дүрэм тус бүр + $0.60 сая хүсэлт | |
| CloudWatch | лог $0.80 GB, метрик $0.30, alarm $0.10 | |
| S3 Standard | $0.025 GB-сар | |

### 3.2 Сонголтуудын харьцуулалт

| Сонголт | Юу өгөх | Нэмэлт зардал/сар | Нарийн төвөгтэй байдал | Шийдвэр |
|---|---|---|---|---|
| Нэг машиныг томсгох (t4g.small → medium/large, эсвэл c7g.large) | RAM 2→4–8 GB, build/процесс багтана | +$17 / +$51 / +$49 | Бага (stop/start 2–5 мин) | **А** |
| API ба вэбийг тусдаа машинд | Next-ийн санах ой API-д нөлөөлөхгүй | +$17–34 | Бага | В-д Fargate-аар шийдэгдэнэ |
| ALB + 2 EC2 (2 AZ), тогтмол тоо | Машин/AZ унахад ажиллана, зогсолтгүй deploy | ALB ~$35 + EC2 $34–68 + IPv4 | Дунд (хуваалцсан төлөв, cron-ийн нэг эзэн) | **Б** |
| EC2 Auto Scaling Group | Автомат тэлэлт | Б-ийнхтэй ижил | Дунд-өндөр (AMI/bootstrap, CodeDeploy) | Fargate-аас ашиггүй |
| ECS Fargate (API, вэб, worker) | Автомат тэлэлт, rolling deploy, серверийн OS засваргүй | API task $39.6, вэб/worker $19.8 | Дунд (Docker, ECR, task definition) | **В** |
| EKS / Kubernetes | — | control plane ~$73 + node | Өндөр | **Хийхгүй** |
| RDS ангийг томсгох | RAM, CPU кредитгүй (m8g) | t4g.small +$20 … m8g.large +$168 | Бага (өөрчлөх үед тасалдал) | А (хэмжээд), Б, В |
| RDS Multi-AZ | AZ/машин унахад автомат failover | ×2 | Бага | **Б** |
| RDS Proxy | Холболтын шуурга, failover-ийг зөөлрүүлнэ | ≈ $32 | Бага-дунд | Шаардлагагүй (В-д ч холболт ≤ 100) |
| PgBouncer (өөрөө) | Холболт олшруулна | $0 + ажиллагаа | Дунд; Prisma 7 + adapter-pg-д transaction горим, prepared statement-ийн анхааруулга [11] | **Хийхгүй** |
| Read replica | Тайланг салгана | +100% ӨС | Дунд (уншилтын хоцрогдол) | Хэмжилтээр шаардлагатай болохоос нааш хийхгүй |
| Redis/Valkey (ElastiCache) | Хуваалцсан rate limit [9], кэш, BullMQ дараалал | $15.8 (micro) – $61 (2× small) | Бага-дунд | Б (micro), В (2× small) |
| Тусдаа worker + BullMQ | Cron, push, имэйл, алдааны дэвтэр API-аас салж, давталт/хурдны хязгаартай [10] | $19.8 | Дунд | **В** (Б-д env flag-аар нэг эзэн) |
| CloudFront (статик + медиа) | Статикийг ирмэгээс, S3-ийн гарах урсгалыг бууруулна | Pro $15 | Бага | **А/Б** |
| CloudFront бүх урсгалд + WAF/DDoS | Халдлагын хамгаалалт, гарах урсгал багцад | Business $200 | Дунд (кэшийн дүрэм, IP толгой) | **В** |
| Cloudflare (UB-д PoP бий [12]) | Монголоос TLS ойрхон, үнэгүй/хямд DDoS | $0–25 гэж таамаглав (шалгах) | Дунд; гуравдагч тал TLS-ийг задална; AWS-ийн гарах урсгал хэвээр төлнө | Эзний шийдвэр (§6) |
| CI-д build, artifact-аар deploy | Прод дээр build алга, буцаах хялбар | $0 (GitHub Actions) | Бага-дунд | **А** |
| Blue/green (ALB target group) | Зогсолтгүй, шууд буцаах | Хоёр дахь машины хугацаа | Дунд | Б (rolling), В (ECS) |
| Хяналт: CloudWatch alarm + agent + uptime | Унахаас өмнө мэдэх | $3–30 | Бага | **А** |
| Sentry (алдааны мөр) | Стек мөр, хувилбараар | $0 (5 000 алдаа) – ~$29 [13] | Бага | Эзний шийдвэр (хүүхдийн нууцлал, `SECURITY.md` §4) |
| RDS PITR 7–35 хоног + өөр region-д snapshot | Сэргээх цэг, region-ы гамшиг | ӨС-ийн хэмжээ хүртэл үнэгүй; хуулбар ~$2–5 | Бага | **А** |
| Олон region идэвхтэй-идэвхтэй | — | ×2+ | Өндөр | **Хийхгүй** |

### 3.3 Next.js-ийг хаана байрлуулах

- Вэб нь `NEXT_PUBLIC_API_URL=/api`-аар хөтөч талаас API дууддаг [баримт]; Next сервер ӨС рүү
  холбогддоггүй (`infra/aws/README.md:171`). Тиймээс вэб хөнгөн, API-аас тусдаа тэлэгдэж болно.
- А: одоогийн машин дээр, гэхдээ build-ийг CI-д, `output: 'standalone'`-оор (зөвхөн хэрэгтэй файл).
- Б: хоёр EC2 тус бүр дээр API + вэб. `deploymentId`-г тохируулбал rolling deploy-ийн үеэр хуучин
  хөтөч шинэ сервертэй таарахгүй бол бүтэн хуудас дахин ачаална [8].
- В: тусдаа Fargate service (2 task). Next-ийн кэш процесс тутамд тусдаа [8] — одоо ISR/серверийн
  кэш бараг ашигладаггүй бол асуудалгүй (§5 M14).
- Бүрэн статик экспорт (`output: 'export'`, S3+CloudFront) нь хамгийн хямд боловч middleware,
  серверийн маршрут ашигладаг эсэхээс хамаарна — хэмжилтгүйгээр санал болгохгүй (§5 M14).

---

## 4. Шаталсан зөвлөмж

### Шат А — одоо, бараг зардалгүй (хугацаа ~1–2 долоо хоног)

Зорилтот бүтэц:

```
Хэрэглэгч ─► [CloudFront Pro: /_next/static, /home, /amjilt, лого] ─┐
          └──────────────────────────── /api, хуудас ──────────────────┴─► EC2 t4g.medium (4 GB)
                                                                           nginx → pm2: api ×2 (cluster), web ×1
                                                                           cron зөвхөн api #0 дээр
                                                                           build ХИЙХГҮЙ (CI-ээс artifact)
                                                                        ─► RDS t4g.micro→(хэмжээд) t4g.small, PITR 7–14 хоног
GitHub Actions: test + build → artifact (S3) ;  pg_dump → S3 (versioning) ;  CloudWatch alarm → имэйл
```

Алхам (эхний 3 нь өгөгдлийг хамгаална — хамгийн түрүүнд):

1. **AWS данс Paid plan эсэхийг шалгах** (R1). Free бол Billing → Upgrade. Зогсолтгүй, кредит хадгалагдана [6].
2. RDS автомат нөөцийг 7–14 хоног болгох (1→7 өөрчлөлт нь зогсолтгүй), deletion protection хэвээр.
   7 хоног тутам snapshot-ыг Tokyo (`ap-northeast-1`) руу хуулах.
3. Deploy-ийн `pg_dump`-ийг EC2-ээс S3 (versioning асаалттай, тусдаа bucket, устгах эрхгүй IAM) руу
   илгээх. Сард нэг удаа **сэргээлтийн дадлага**: snapshot → түр RDS → мөрийн тоо, төлбөрийн нийлбэр
   шалгах → устгах (RTO-г хэмжинэ).
4. Build-ийг CI руу: `ci.yml` аль хэдийн api/web-ийг шалгаж, web-ийг build хийдэг. Үүн дээр arm64
   artifact (api `dist` + prod `node_modules`, web standalone) үүсгэж S3-т тавина. Сервер artifact-ыг
   татаж шинэ хавтсанд задлаад symlink солиод `pm2 reload` (зогсолтгүй) хийнэ; буцаах = хуучин symlink.
   `prisma migrate deploy` зөвхөн нэмэх (expand) миграцитай хэвээр.
5. EC2 t4g.small → **t4g.medium** (+$17/сар; stop/start 2–5 мин, шөнийн 0–1 цагт, Elastic IP хэвээр).
   Unlimited горимыг шалгах (R25).
6. `infra/aws/ecosystem.config.cjs`-ийг хэрэгжүүлэх, API-г `instances: 2, exec_mode: 'cluster'` [15],
   `DB_POOL_MAX=10` (2 × 10 = 20 ≤ 80). Үүний **өмнө** кодын засвар К1 заавал.
7. Хяналт: CloudWatch agent (санах ой, диск, swap), alarm: EC2 CPU > 70% 10 мин, `CPUCreditBalance`
   буурах, RDS CPU > 70%, `FreeableMemory` < 150 MB, `DatabaseConnections` > 60, `FreeStorageSpace`
   < 5 GB, `/api/health/ready` гаднаас 1 минут тутам (Route 53 health check эсвэл үнэгүй uptime
   үйлчилгээ — хувийн мэдээлэлгүй URL). Прод `.env`-д `DB_SLOW_QUERY_MS=500`. RDS Database Insights
   (Standard, 7 хоног) асаах. pm2 restart тоо, event loop delay-г логт.
8. `ops/harden-server-2026-11-05.sh`-ийг (эзний зөвшөөрлөөр) ажиллуулах; nginx лог форматад
   `$request_time $upstream_response_time` нэмэх (бодит p95-ийг логоос гаргана, §5 M1).
9. CloudFront Pro-г зөвхөн статик (`/_next/static/*` — 1 жил immutable, `/home/*`, `/amjilt/*`)-д.
   API ба хуудас одоохондоо шууд (R12-ийг хөндөхгүй).

Кодын засвар (жижиг, тус бүр тестээр):

| # | Засвар | Файл | Шалтгаан |
|---|---|---|---|
| К1 | Cron-ийг зөвхөн нэг процесс ажиллуулах (`RUN_CRONS=1` эсвэл `NODE_APP_INSTANCE==='0'`); түгжээгүй cron-д (`retryPending`, `nightly`, `purgeExpired`) ӨС-ийн advisory lock эсвэл `JobRun` түгжээ | `mistake-collector.service.ts:207`, `summary.cron.ts:12`, `file-retention.service.ts:19` | R9, R10 |
| К2 | Autosave-д тестийн бодлогын жагсаалтыг `TtlCache`-д (тест засагдахад цэвэрлэх, засах нь эхэлсний дараа хязгаарлагдсан) | `tests/tests.service.ts:1202-1214` | R15 |
| К3 | `GET /users`-д хуудаслалт/хайлт (`take`, `cursor`, `q`), Багшид зөвхөн хэрэгтэй талбар | `users/users.service.ts:829-882` | R13 |
| К4 | Ангийн самбарын жагсаалтыг хэрэглэгч тутам 60с кэш (single-flight), эсвэл шөнийн snapshot хүснэгт | `class-dashboard.service.ts:252` | R14 |
| К5 | Push: дараалсан хэвээр, гэхдээ зэрэг 10–20, 429/5xx-д jitter-тэй exponential backoff [5], илгээлтийн хугацааг логт | `devices/push-sender.ts:73-102` | R17 |
| К6 | Нэвтрэлтийн IP цонхыг төвийн мэдэгдэж буй гадаад IP-д өргөх (эсвэл бүртгэл тутмын хязгаарт найдах) | `auth/login-attempts.ts:119` | R11 |

Эзний шийдвэрээр (§6): 23:30-ийн дүгнэлт, Ням 20:00-ийн имэйлийг оргилоос гаргах.

Зардал: ~$47 одоо + $17 (EC2) + $15 (CloudFront Pro) + ~$3–5 (хяналт, S3 нөөц)
= **~$80/сар**; RDS-ийг t4g.small болговол +$20 → **~$100**. Кодын засвар, CI нь мөнгөгүй.

Хүлээн авах шалгуур (шөнийн 0–1, прод snapshot-оос сэргээсэн ТҮР хуулбар сан + түр EC2 ижил
VPC-д; k6 скриптийн хамгаалалт хувийн IPv4-ийг зөвшөөрдөг, `k6/target.js`):

| Сценари | Ачаалал | Босго |
|---|---|---|
| S1 Оройн холимог | `ramping-arrival-rate` 0→150 хүсэлт/с 5 мин, 30 мин барих [14] (үзэх 50%, autosave 40%, самбар 10%) | бүх p95 < 400 мс, бичилт p95 < 800 мс, алдаа < 0.5% |
| S2 Шалгалт (`k6/exam.js`) | 500 VU: start → 20 autosave → submit | phase бүр p95 < 500 мс, давхар `Attempt` 0, `P2024`/503 = 0, алдааны дэвтэр 10 мин дотор цугласан |
| S3 Гэрийн даалгавар (`k6/homework-peak.js`) | 500 VU, 10 мин | скриптийн босго (p95 < 500, autosave < 300, алдаа < 0.5%) |
| S4 Нэвтрэлт | нэг IP-аас 120 өөр бүртгэл 2 минутад | хууль ёсны оролдлогод 429 = 0 |
| Нөөц | тест бүрийн үеэр | EC2 CPU < 70%, swap 0, RDS CPU < 60%, кредит тогтвортой |

### Шат Б — ~2 000–3 000 зэрэг идэвхтэй хүртэл

Зорилтот бүтэц:

```
                 ┌── CloudFront Pro (статик, медиа /files → S3 OAC) ──┐
Хэрэглэгч ─► DNS (Route 53 эсвэл Cloudflare, apex ALIAS) ────────────┤
                 └──────────────► ALB (ap-east-1a, 1b) ◄─────────────┘
                                  ├─► EC2 #1 t4g.medium (1a): nginx, api ×2, web ×1, cron ЭЗЭН
                                  └─► EC2 #2 t4g.medium (1b): nginx, api ×2, web ×1
                                          │            │
                        Valkey t4g.micro ◄┘            └─► RDS t4g.medium Multi-AZ (1a ↔ 1b)
                        (rate limit, кэш)                  PITR 14 хоног, Tokyo руу snapshot
```

Алхам (өгөгдөл алдахгүй, зогсолт бага):

1. DNS-ийн TTL-ийг 7200 → 300 болгох (шилжихээс 2+ хоногийн өмнө). Apex-д ALIAS хэрэгтэй тул DNS-ийг
   Route 53 (бүсийн $0.50/сар + query) эсвэл Cloudflare руу зөөх — эзний шийдвэр (§6).
2. RDS → Multi-AZ болгох (шөнө; зогсолтгүй, синк хийх үед удааширна). Дараа нь анги t4g.medium
   (standby дээр өөрчлөөд failover — богино тасалдал, шөнө). Failover-ийн бодит хугацааг энд хэмжинэ.
3. Valkey t4g.micro: throttler-ийг Redis storage руу [9], нэвтрэлтийн IP цонх, `unread-count`
   кэшийг Redis руу; Redis унавал санах ойн хувилбар руу буцах (fail-open, rate limit-ийн хувьд).
4. `trust proxy`-г шинэ давхаргын тоогоор тохируулах (ALB + nginx = 2; CloudFront нэмбэл 3) эсвэл
   `X-Forwarded-For`-ыг итгэмжлэгдсэн хүрээгээр (R12). Шилжихээс өмнө туршилтаар батлах.
5. ALB үүсгэж эхлээд одоогийн EC2-г target болгоно → DNS-ийг ALB руу. Дараа нь EC2-ийн AMI-аас #2-ыг
   1b-д асааж target-д нэмнэ. Health check = `/api/health/ready`.
6. Deploy = rolling: #2-ыг target-аас гаргах (deregistration delay 30с) → artifact → нэмэх → #1. Next-д
   `deploymentId`. Хоёр хувилбар зэрэг ажиллах тул миграци ҮРГЭЛЖ нэмэх (expand → contract).
7. Cron: зөвхөн #1 (`RUN_CRONS=1`). #1 унавал cron түр зогсоно (ӨС-ийн ажлууд pending үлдэж, дараа
   нь нөхөгдөнө) — хүлээн зөвшөөрөх эрсдэл.
8. EC2-ийн SG: 80/443 зөвхөн ALB-ийн SG-ээс; 22 хэвээр эзний IP. NAT ашиглахгүй (public subnet + SG).

Зардал (сард): EC2 2× $67.74 + EBS $6.34 + ALB ~$33 + IPv4 4× $14.60 + RDS Multi-AZ $162.06 +
диск 50 GB $15 + Valkey $15.77 + CloudFront Pro $15 + CloudWatch ~$16 + S3 нөөц ~$3 + гарах урсгал
~$30 = **~$380**. RDS-ийг single-AZ үлдээвэл ~$290 (зөвлөхгүй — шалгалтын үеэр ӨС унах эрсдэл).

Хүлээн авах шалгуур:

| Сценари | Ачаалал | Босго |
|---|---|---|
| S1 холимог | 0→400 хүсэлт/с, 60 мин | GET p95 < 400 мс, бичилт p95 < 800 мс, алдаа < 0.5% |
| S2 шалгалт | 1 000 VU, submit 30с цонхонд | submit p95 < 1с, давхардал 0, алдаа < 0.5% |
| F1 машин унах | S1-ийн дундуур EC2 #1-ийг зогсоох | 5xx < 1% нь ≤ 30с, дараа нь хэвийн; хадгалагдсан хариу алдагдахгүй |
| F2 ӨС failover | S1-ийн дундуур RDS «reboot with failover» | сэргэлт ≤ 2 мин (хэмжих), 503-ыг клиент давтаж хадгалсан, `Attempt` алдагдахгүй |
| F3 deploy | S1-ийн дундуур rolling deploy | 5xx = 0 |

### Шат В — 10 000 хүртэл

Зорилтот бүтэц:

```
Хэрэглэгч ─► CloudFront Business (WAF, DDoS, бүх урсгал; /api кэшгүй, /_next/static 1 жил, медиа OAC)
               └─► ALB (2 AZ)
                    ├─► ECS Fargate «api»   2–6 task (1 vCPU, 2 GB), CPU 50% / RequestCountPerTarget-ээр тэлнэ
                    └─► ECS Fargate «web»   2 task (0.5 vCPU, 1 GB)
               ECS Fargate «worker» 1 task: бүх cron + BullMQ (push, имэйл, алдааны дэвтэр, шийт, дүгнэлт)
                    │                         │
     Valkey 2× t4g.small (primary + replica, noeviction)   RDS m8g.large Multi-AZ (8 GiB), PITR 14–35 хоног
                                                            Tokyo руу 7 хоног тутам snapshot
```

Алхам:

1. Docker image (arm64) CI-д, ECR-т. Эхлээд «worker»-ийг гаргаж EC2-ийн `RUN_CRONS`-ийг унтраах —
   ажлууд BullMQ-д: push-ийг 20–50/с хязгаартай [10], FCM-ийн :00/:15/:30/:45-аас зайлсхийх [5];
   алдааны дэвтэр submit-ээс дараалалд орно (API-ийн pool-оос салж).
2. «api», «web» service-ийг ижил ALB-д шинэ target group-ээр нэмж, ALB-ийн жинтэй дамжуулалтаар
   10% → 50% → 100% (тус бүр 1 өдөр хянах). EC2-ийг 1 долоо хоног нөөцөд үлдээгээд унтраах.
3. RDS → m8g.large (Multi-AZ-д standby-аас эхлэх тул тасалдал богино, шөнө). `UiEvent`/`AuditLog`
   хуучин сарыг S3 руу архивлах эсвэл сараар partition (эзний шийдвэр — устгахгүй, §6).
4. CloudFront-ийг бүх урсгалд: `/api/*` — кэшгүй, бүх толгой/cookie дамжуулна; IP-г
   `CloudFront-Viewer-Address`-аас. ALB-ийг зөвхөн CloudFront-ийн prefix list-ээс нээх.
5. Хуваарьт шалгалт, push-ийн өмнө ECS scheduled scaling (жишээ: 19:30-д api min 4).
6. 1–3 сар тогтвортой ажилласны дараа RDS-д 1 жилийн RI, Fargate-д Compute Savings Plan (эзний шийдвэр).

Зардал (сард, on-demand): api дунджаар 3.5 task $138.6 + web $39.6 + worker $19.8 + IPv4 9× $32.9 +
ALB ~$52 + RDS m8g.large Multi-AZ $376.68 + диск 100 GB $30 + Valkey 2× $60.7 + CloudFront Business
$200 + CloudWatch ~$31 + S3 медиа/нөөц ~$10 + ECR ~$1 = **~$990**. RDS-ийн RI (−$124) + Savings Plan
(~−$40) → **~$830**. Гарах урсгалын таамаг: 5 000 DAU × 10 MB/өдөр ≈ 1.5 TB/сар — CloudFront-ийн
багцад орно (ALB → CloudFront урсгал үнэгүй [2]); CloudFront-гүй бол ~$180 нэмэгдэнэ.

Хямд хувилбар: Fargate-ийн оронд 3× c7g.large EC2 (ASG-гүй, rolling скрипт) + RDS t4g.large Multi-AZ
+ CloudFront Pro → ~$650, гэхдээ автомат тэлэлтгүй, ӨС-д CPU кредит хэвээр.

**В+ (10 000 нэг дор, онцгой өдөр):** үйл явдлын өмнө api 8–10 task, RDS m8g.xlarge (урьдчилан нэг
өдөр), шалгалтын эхлэл/дуусгалтыг 1–3 минутаар шатлах, submit-д клиент талын jitter 0–20с, дүгнэлтийг
дараалалд. Fargate цагаар тооцогдох тул нэг өдрийн нэмэлт ~$10–30 [таамаг].

Хүлээн авах шалгуур (ачаалал үүсгэгч: ижил region-д c7g.xlarge, k6-ийн 2 000 VU хязгаарыг
`exam.js`-д өргөх; үүсгэгчийн CPU < 70%):

| Сценари | Ачаалал | Босго |
|---|---|---|
| S1 холимог | 0→1 000 хүсэлт/с 10 мин, 60 мин барих | GET p95 < 500 мс, autosave p95 < 300 мс, алдаа < 0.1% |
| S5 push-ийн давалгаа | 1 мин дотор ×3 (3 000 хүсэлт/с хүртэл) | алдаа < 1%, scale-out ≤ 5 мин, дараа нь p95 хэвийн |
| S2 шалгалт | 3 000–5 000 VU, submit 60с цонхонд | submit p95 < 1с, давхардал 0, дарааллын хоцрогдол < 5 мин |
| S6 push fanout | 10 000 токен (FCM-ийн dry-run/тест төсөл) | ≤ 10 мин, API p95-д нөлөөгүй |
| F1–F3 | Б-тэй ижил + 1 worker task унах | ажлууд давтан, нэг удаа л гүйцэтгэгдэнэ |

### Юуг ХИЙХГҮЙ байх, яагаад

| Хийхгүй | Шалтгаан |
|---|---|
| Kubernetes (EKS эсвэл өөрөө) | Нэг хөгжүүлэгч + агентуудад control plane (~$73/сар), node, сүлжээ, сертификат, шинэчлэлт — Fargate ижил үр дүнг өгнө |
| Микросервис | Одоогийн модульчлагдсан монолит (87 модуль, нэг транзакцийн ӨС) нь ирц, төлбөр, шалгалтын нэг транзакцид тохирно; салгавал хуваарилагдсан транзакц, сүлжээний алдаа нэмэгдэнэ |
| Олон region идэвхтэй-идэвхтэй | Зардал ×2+, өгөгдлийн зөрчил; snapshot-ыг Tokyo руу хуулах нь region-ы гамшгийг хангалттай хамарна |
| Read replica (одоохондоо) | Ачаалал уншилтаас хэтэрсэн гэдгийг хэмжилт харуулаагүй; эхлээд кэш, query |
| Өөрөө ажиллуулдаг PgBouncer, Redis, Postgres EC2 дээр | Ажиллагааны ачаалал, нөөцлөлт өөр дээрээ; managed хувилбар хямд |
| Aurora, DynamoDB, Lambda руу дахин бичих | Одоогийн Prisma/Postgres код бүхэлдээ өөрчлөгдөнө; энэ хэмжээнд ашиг алга |
| Хувийн өгөгдлийг CDN-д кэшлэх | `/api/*` хариу хэрэглэгч тутам; кэшийн алдаа = бусдын мэдээлэл задрах |
| Pool-ыг дур мэдэн томсгох | micro ӨС-д RAM/CPU хязгаартай; удаашрал = query (`infra/aws/README.md:172`) |
| Прод сан дээр ачааллын тест | Эзний дүрэм; snapshot-оос сэргээсэн түр хуулбар л |

---

## 5. Хэмжих жагсаалт

Прод-д хүрэх зүйлийг (M1–M13) зөвхөн эзний зөвшөөрлөөр, уншилтаар, ажлын бус цагт.

| # | Юу | Хэрхэн | Юунд хэрэгтэй |
|---|---|---|---|
| M1 | Бодит оргил хүсэлт/с, p95, 5xx | nginx логт `$request_time`-тэй 1 долоо хоног; цагаар бүлэглэх | §2-ын Т5–Т7 |
| M2 | Бүртгэлтэй → DAU → оргил цагийн зэрэг идэвхтэй харьцаа | `User.lastSeenAt`, `UiEvent`-ээс цагаар өвөрмөц хэрэглэгч | Т2–Т4 |
| M3 | Данс Free/Paid, үлдсэн кредит, RDS backup retention | Billing, RDS console | R1, R3 |
| M4 | EC2 CPU, `CPUCreditBalance`, `CPUSurplusCreditsCharged`, санах ой, swap, pm2 restart | CloudWatch + agent, `pm2 ls` | R5, R25 |
| M5 | RDS CPU, `FreeableMemory`, `DatabaseConnections`, IOPS, `ReadLatency`, кэшийн хувь, `SHOW max_connections` | CloudWatch, Database Insights | R21 |
| M6 | Хамгийн их хугацаа идсэн query | `pg_stat_statements` (параметр group-д идэвхжүүлэх), `DB_SLOW_QUERY_MS=500` | К2–К4 |
| M7 | Хүснэгтийн хэмжээ, өдрийн өсөлт (`UiEvent`, `AuditLog`, `Attempt`, `Notification`, `TestAttemptSession`) | `pg_total_relation_size`, 7 хоногийн зөрүү | R20 |
| M8 | API-ийн event loop delay | `perf_hooks.monitorEventLoopDelay` логт | процесс тоо |
| M9 | Гарах урсгал (EC2, S3), S3 GET тоо, статикийн эзлэх хувь | Cost Explorer, nginx лог | CloudFront-ийн ашиг |
| M10 | FCM илгээлтийн хугацаа токен тутам, токентой хэрэглэгчийн хувь | К5-ын лог | §2.3 push |
| M11 | Хичээлийн эхэнд нэг IP-аас минутад хэдэн нэвтрэлт | nginx лог `/api/auth/login` IP-аар | R11, К6 |
| M12 | Монголын утасны сүлжээ (Юнител, Мобиком, Скайтел, Жи-Мобайл)-нээс HK ба Cloudflare UB хүртэлх RTT, TLS хугацаа | эзэн утаснаас `curl -w` | CDN шийдвэр |
| M13 | Сэргээлтийн хугацаа (RTO), сэргээсэн өгөгдлийн бүрэн байдал | snapshot → түр RDS, мөрийн тоо, төлбөрийн нийлбэр | R4 |
| M14 | Next-ийн серверийн кэш/ISR, middleware ашиглалт; статик экспорт боломжтой эсэх | `web/` кодыг шалгах, `next build` гаралт | §3.3 |
| M15 | Олон зэрэг `FOR SHARE` (Test мөр) нь multixact үүсгэж удаашруулах эсэх | S2 үеэр `pg_stat_activity` wait event | §2.3 |
| M16 | k6 S1–S6 (прод биш хуулбар дээр) | §4-ийн хүснэгтүүд | шат бүрийн хүлээн авалт |

---

## 6. Эзний шийдвэр хүлээж буй зүйлс

1. **Яаралтай:** AWS данс Paid plan мөн эсэх; биш бол өнөөдөр шилжүүлэх (R1).
2. Шат бүрийн сарын төсөв: А ~$80–100, Б ~$380, В ~$830–1 000. Хэзээ Б руу шилжих (санал: M2-оор зэрэг идэвхтэй 600+ болох эсвэл анхны том сорилын өмнө).
3. DNS-ийг Datacom-оос Route 53 эсвэл Cloudflare руу зөөх (ALB/CloudFront-д apex ALIAS хэрэгтэй).
4. CDN: CloudFront (бүгд AWS дотор, гарах урсгал багцад) эсвэл Cloudflare (UB-д PoP, хямд, гуравдагч тал TLS-ийг задална, AWS-ийн гарах урсгал хэвээр) — M12-ын дараа.
5. Гуравдагч талын алдааны хяналт (Sentry) ашиглах эсэх — `SECURITY.md` §4-ийн дагуу хувийн мэдээлэлгүй, user id-г hash.
6. `UiEvent`, `AuditLog`-ийн хуучин өгөгдлийг S3 руу архивлах (устгахгүй) эсвэл сараар partition.
7. 23:30-ийн өдрийн дүгнэлт, Ням 20:00-ийн эцэг эхийн имэйлийг оргилоос (жишээ: 02:00, Ням 10:00) гаргах эсэх (SPEC §18-ийн «23:00 хаагдаад 23:30» дүрэмтэй холбоотой).
8. Шөнийн 0–1 цагийн ачааллын тест: snapshot-оос түр сан + түр EC2 (нэг удаад ~$2–5) зөвшөөрөх, давтамж.
9. Төвийн Wi-Fi-ийн нэвтрэлтийн хязгаар (К6): төвийн гадаад IP-г итгэмжлэх эсэх.
10. Шалгалтын бодлого: хугацаа дуусах үеийн grace, том сорилын эхлэлийг шатлах, нэг дор хамгийн их хэдэн сурагч.
11. 1 жилийн RI/Savings Plan (В-д ~$160/сар хэмнэнэ) — бүтэц 1–3 сар тогтвортой болсны дараа.
12. Багшид бүх сурагчийн жагсаалт (утастай) нэг дор очих дүрэм хэвээр; хуудаслалтаар (К3) өгөх нь дүрмийг өөрчлөхгүй — баталгаа.

---

## Эх сурвалж

1. AWS Price List Bulk API, ap-east-1 (нийтлэгдсэн 2026-11-11): [EC2](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/ap-east-1/index.csv), [RDS](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/ap-east-1/index.csv), [ElastiCache](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonElastiCache/current/ap-east-1/index.csv), [ELB](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSELB/current/ap-east-1/index.csv), [ECS/Fargate](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonECS/current/ap-east-1/index.csv), [WAF](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/awswaf/current/ap-east-1/index.csv), [CloudWatch](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudWatch/current/ap-east-1/index.csv), [S3](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonS3/current/ap-east-1/index.csv), [VPC](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonVPC/current/ap-east-1/index.csv), [Data Transfer](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AWSDataTransfer/current/ap-east-1/index.csv), [CloudFront](https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonCloudFront/current/index.csv)
2. [CloudFront flat-rate pricing plans — Developer Guide](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/flat-rate-pricing-plan.html)
3. [Amazon CloudFront pricing](https://aws.amazon.com/cloudfront/pricing/)
4. [FCM Throttling and Quotas](https://firebase.google.com/docs/cloud-messaging/throttling-and-quotas)
5. [Best practices when sending FCM messages at scale](https://firebase.google.com/docs/cloud-messaging/scale-fcm)
6. [AWS Free Tier FAQs](https://aws.amazon.com/free/faqs/)
7. [Amazon RDS Proxy pricing](https://aws.amazon.com/rds/proxy/pricing/)
8. [Next.js — Self-hosting](https://nextjs.org/docs/app/guides/self-hosting), [deploymentId](https://nextjs.org/docs/app/api-reference/config/next-config-js/deploymentId)
9. [@nest-lab/throttler-storage-redis](https://www.npmjs.com/package/@nest-lab/throttler-storage-redis)
10. [BullMQ — Rate limiting](https://docs.bullmq.io/guide/rate-limiting), [Going to production](https://docs.bullmq.io/guide/going-to-production)
11. [Prisma — Configure Prisma Client with PgBouncer](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
12. [Cloudflare — Ulaanbaatar, Mongolia](https://blog.cloudflare.com/mongolia/)
13. Sentry-ийн үнэ (хоёрдогч эх, албан хуудсаар шалгах): [Activepieces 2026](https://www.activepieces.com/blog/sentry-pricing-2026-developer-team-business-plans), [sentry.io/pricing](https://sentry.io/pricing/)
14. [k6 — ramping-arrival-rate](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/ramping-arrival-rate/), [per-vu-iterations](https://grafana.com/docs/k6/latest/using-k6/scenarios/executors/per-vu-iterations/), [thresholds](https://grafana.com/docs/k6/latest/using-k6/thresholds/)
15. [PM2 — Cluster mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
16. [Amazon EC2 T4g](https://aws.amazon.com/ec2/instance-types/t4/), [Burstable performance — key concepts](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-credits-baseline-concepts.html)
17. [RDS for PostgreSQL max_connections (Prescriptive Guidance)](https://docs.aws.amazon.com/prescriptive-guidance/latest/tuning-postgresql-parameters/max-connections.html)
18. [Amazon RDS Multi-AZ](https://aws.amazon.com/rds/features/multi-az/), [Introduction to backups (RDS)](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html)
19. Репогийн дотоод: `piemath_app/docs/BACKEND-PERF.md`, `infra/aws/README.md`, `infra/aws/ecosystem.config.cjs`, `k6/README.md`, `docs/INFRASTRUCTURE-5000-PLAN.md` (Google Cloud-д зориулсан, хуучирсан боловч SLO, failure rehearsal хэсэг хүчинтэй)
