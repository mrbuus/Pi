# Pi.mn — AWS дэд бүтэц

Албан хостинг: **AWS, Hong Kong (`ap-east-1`)** — 2026-10-23-ноос **вэб, API, ӨС, файл бүгд энд** (Vercel/Render/Supabase ашиглахаа больсон).

## Зорилтот бүтэц

```
Сурагч/багш ──► Next.js вэб (web/)
                    │
                    ▼
              EC2 (Linux) ── Nest.js API (api/)
               │        │
               ▼        ▼
     RDS PostgreSQL   S3 bucket (зураг, бичлэг)
```

- **EC2** — API ажиллана. S3 руу хандахдаа IAM **Role** ашиглана (кодонд түлхүүр хадгалахгүй)
- **RDS** — PostgreSQL, API-аас тусдаа. Эхэндээ single-AZ, дараа нь Multi-AZ
- **S3** — медиа файл. Олон хуулбартай тул өөрөө найдвартай
- Эхлэл: 1 EC2 + 1 RDS + S3. Тасралтгүй ажиллагаанд дараа нь 2+ EC2 + Load Balancer нэмнэ

## Account (2026-10-15 тохируулсан)

| Зүйл | Утга |
|---|---|
| Account нэр / alias | `Pi` / `pi-mn` |
| Нэвтрэх хаяг | https://pi-mn.signin.aws.amazon.com/console |
| Өдөр тутмын хэрэглэгч | `usukhbayar-admin` (AdministratorAccess, MFA) |
| Root | MFA асаалттай, access key **байхгүй** — зөвхөн онцгой үед |
| Region | `ap-east-1` Hong Kong — идэвхжүүлсэн. Бусад opt-in region хаалттай |
| Төлөвлөгөө | Free plan, $120 кредит, 2027-04-15 хүртэл. Прод нээхээс өмнө Paid руу шилжүүлнэ |
| Сануулга | Zero-spend budget — $0.01-ээс дээш зардалд имэйл |

## Дүрэм

1. Root-оор нэвтрэхгүй, root дээр access key үүсгэхгүй
2. Нөөц үүсгэхээс өмнө Console-ийн region **Hong Kong** эсэхийг шалга
3. `.pem`, access key, жинхэнэ `.env` энэ хавтсанд **орохгүй** — зөвхөн `*.example`
4. Шинэ хүнд эрх өгөхдөө тусдаа IAM хэрэглэгч + MFA

## Дараалал

1. ~~Account, MFA, region, budget, admin хэрэглэгч~~ ✓
2. v2 бодлогуудыг прод руу deploy (одоогийн Render/Vercel дээр)
3. Ирц, хуваарь
4. AWS руу шилжих: `s3/` → `rds/` → `ec2/` (API) → домэйн, HTTPS

Хавтас бүрийн (`ec2/`, `rds/`, `s3/`) заавар шилжилтийн үед энд нэмэгдэнэ.

## Холболтын төлөвлөгөө — AWS дээр юу үүсгэж, вэбд юу холбох

Домэйн: **pimath.mn**. Вэб → `pimath.mn`, API → `api.pimath.mn`. Бүх нөөц Hong Kong-д.

| # | AWS дээр үүсгэх | Нэр / хэмжээ | Вэбд холбох газар |
|---|---|---|---|
| 1 | **Security group** ×2 | `pimath-api-sg`: 80, 443 бүх хүнд, 22 зөвхөн эзний IP · `pimath-db-sg`: 5432 зөвхөн `pimath-api-sg`-ээс | — |
| 2 | **RDS PostgreSQL** | `pimath-db`, хамгийн жижиг класс, 20 GB, public access **үгүй**, автомат backup 7 хоног | `DATABASE_URL` (api/.env) |
| 3 | **EC2** (Ubuntu) | `pimath-api`, жижиг класс + **Elastic IP** | Node 22 + pm2 + nginx + certbot (HTTPS) |
| 4 | **IAM Role** | `pimath-ec2-role` → EC2-д оноох (S3 эрх) | Кодонд түлхүүр хэрэггүй |
| 5 | **S3 bucket** | `pimath-media`, public access хаалттай | Одоо файл дискэнд (`UPLOAD_DIR`) — S3 адаптер код **дараа** |
| 6 | **DNS** (Datacom, ns1-4.dns.mn) | `@`, `www`, `api` A → 18.167.227.21 (TTL 7200) | — |

**API-ийн env (EC2 дээр `api/.env`)** — одоо Render-д байгаатай ижил, утга нь өөрчлөгдөнө:

```
DATABASE_URL=postgresql://<user>:<нууц>@<rds-endpoint>:5432/pimath?sslmode=require
WEB_ORIGIN=https://pimath.mn
GOOGLE_REDIRECT_URI=https://api.pimath.mn/api/auth/google/callback
QPAY_CALLBACK_URL=https://api.pimath.mn/api/payments/qpay/callback
UPLOAD_DIR=/var/data/uploads
JWT_SECRET, RESET_TOKEN_SECRET, CRON_SECRET, GOOGLE_CLIENT_*, DB_POOL_*  ← Render-ээс хуулна
```

**Вэб (EC2 дээр, 2026-10-22):** `NEXT_PUBLIC_API_URL=/api` (нэг домэйн) — nginx `pimath.mn`: `/api/` → :3380, бусад → :3381 (pm2 `pimath-web`).

**Шилжих дараалал:** RDS → Supabase-ээс `pg_dump` / `pg_restore` → EC2 дээр API асааж `api.pimath.mn`-ээр шалгах → вэбийн `NEXT_PUBLIC_API_URL` солих → Google OAuth консолд шинэ redirect URI нэмэх → Render-ийг унтраах.

### Явц (2026-10-19)

- [x] `pimath-api-sg` — 80/443 бүгд, 22 зөвхөн эзний IP
- [x] `pimath-db-sg` — 5432 зөвхөн `pimath-api-sg`-ээс
- [x] RDS `pimath-db` (endpoint `pimath-db.cbe88akqib5a.ap-east-1.rds.amazonaws.com`) — PostgreSQL 18.3, db.t4g.micro, gp3 20 GB (autoscale), public **үгүй**, `ap-east-1a`, хэрэглэгч/сан `pimath`, backup 1 хоног (Free plan хязгаар; Paid-д 7 болгоно), deletion protection
- [x] EC2 `pimath-api` (i-055bbc10ab714d5c1) — Ubuntu 24.04 arm64, t4g.small, 20 GB gp3 encrypted, `ap-east-1a`, key `~/.ssh/pimath-key.pem`
- [x] Elastic IP `18.167.227.21` → `pimath-api`
- [x] Локал v2 өгөгдөл RDS-д (2026-10-19 02:02 dump: User 731, Problem 12816, migration 76). Нээлтийн дараа бүтэн restore ХОРИОТОЙ — SSH tunnel (15432) + скрипт эсвэл psql-ээр л засна
- [x] API EC2 дээр ажиллаж байна: ~/pimath (branch pi-mn-v2-test, deploy key github_deploy), api/.env (JWT шинээр), pm2 pimath-api + startup, nginx + HTTPS https://api.pimath.mn (certbot, 2027-01-16 хүртэл авто шинэчлэл), DNS Datacom дээр api A 18.167.227.21. Шинэчлэх: ssh pimath "cd ~/pimath && git pull && cd api && npm ci && npm run build && pm2 restart pimath-api"
- [x] DNS Datacom дээр (Cloudflare бүртгэл үүссэн ч ашиглаагүй, NS солиогүй): `@`, `www`, `api` A → 18.167.227.21
- [x] Вэб EC2 дээр: pm2 `pimath-web` (:3381, `NEXT_PUBLIC_API_URL=/api`), nginx `/etc/nginx/sites-available/pimath-web` (pimath.mn + www), certbot HTTPS (авто шинэчлэл), http → https
- [x] Google нэвтрэлт (2026-10-23): client «PieMath.mn», redirect `https://pimath.mn/api/auth/google/callback`, Publish = In production, `.env`-д GOOGLE_*
- [x] S3 (2026-10-23): доорх хэсэг; хуучин 1755 файл зөөгдсөн (`api/scripts/migrate-files-to-s3.cjs`)
- [ ] Албан нээлтийн өмнө: Paid plan → RDS Modify → Multi-AZ

Mac-аас RDS 18 руу `pg_dump`/`psql` ажиллуулахад `brew install postgresql@18` хэрэгтэй.

**Зардал (ойролцоо):** EC2 + RDS жижиг класс ≈ $40–50/сар → $120 кредит ≈ 2–3 сар. Free plan зарим том классыг хаадаг тул зөвхөн жижиг класс сонгоно.

## S3 — зураг, PDF (ПРОД ДЭЭР АСААЛТТАЙ 2026-10-23: bucket pimath-media, CORS, incoming-1day, pimath-ec2-role)

Код: `api/src/storage/file-store.ts`. `S3_BUCKET` тохируулаагүй бол хуучнаараа өгөгдлийн санд хадгална — тохируулмагц шинэ файл S3 руу.

**Урсгал (сервер файлын байт дамжуулахгүй):** утсан дээр зураг → PDF (`web/src/lib/photosToPdf.ts`, 10 хуудас ≈ 3 МБ) → `POST /uploads/presign` → хөтөч S3 руу шууд PUT → `POST /uploads/complete` (хэмжээ, magic bytes, PDF хуудас шалгана) → үзэхдээ `GET /files/:key` эрх шалгаад S3-ийн 5 минутын холбоос руу 302.

**Хадгалах хугацаа:** гэрийн даалгавар 7 хоног (`expiresAt`, өдөр бүр 03:30-д устгана), онолын зураг ба бусад байнга.

### AWS дээр хийх (Console, Hong Kong)

1. **S3 → Create bucket** `pimath-media`, Block all public access ✓, Versioning off, encryption SSE-S3
2. Bucket → **Permissions → CORS**:
   ```json
   [{"AllowedOrigins":["https://pimath.mn","https://www.pimath.mn","http://localhost:3381"],
     "AllowedMethods":["PUT","GET"],"AllowedHeaders":["content-type"],"MaxAgeSeconds":3600}]
   ```
3. Bucket → **Management → Lifecycle rule** `incoming-1day`: prefix `incoming/`, Expire current versions after 1 day (хаягдсан upload)
4. **IAM → Roles → Create** `pimath-ec2-role` (EC2), inline policy:
   ```json
   {"Version":"2012-10-17","Statement":[{"Effect":"Allow",
     "Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],
     "Resource":"arn:aws:s3:::pimath-media/*"}]}
   ```
5. **EC2 → pimath-api → Actions → Security → Modify IAM role** → `pimath-ec2-role`
6. Серверт: `api/.env`-д `S3_BUCKET=pimath-media` нэмээд `npx prisma migrate deploy && npm run build && pm2 restart pimath-api`

Хуучин файлууд (`storage = 'db'`) хэвээр ажиллана; дараа нь S3 руу зөөх скрипт бичнэ.

## Шинэчлэх (deploy)

Deploy бүрийн ӨМНӨ RDS нөөц (CLAUDE.md-ийн дүрэм):

```bash
ssh pimath 'cd ~/pimath/api && U=$(grep ^DATABASE_URL= .env | cut -d= -f2- | tr -d \" | sed "s/?.*//"); pg_dump "$U?sslmode=require" -Fc -f ~/backups/pre-$(date +%F-%H%M).dump'
```

Дараа нь код татаж, API + вэб барьж дахин асаана:

```bash
ssh pimath 'cd ~/pimath && git pull && export NODE_OPTIONS=--max-old-space-size=3072 && cd api && npm ci && npx prisma migrate deploy && npm run build && pm2 restart pimath-api && cd ../web && npm ci && NEXT_PUBLIC_API_URL=/api npm run build && pm2 restart pimath-web'
```

SSH «timed out» бол эзний IP солигдсон — EC2 → `pimath-api-sg` → SSH дүрмийн Source = **My IP**.

t4g.small (2 GB) дээр build санах ой хүрэлцэхгүй (heap out of memory) — `NODE_OPTIONS=--max-old-space-size=3072` заавал (2 GB swap ашиглана).

## Гэрийн даалгаврын оргил ачаалал (22:00–23:00) — тохиргооны санал (2026-10-29, хэрэгжүүлээгүй)

Нөхцөл: нэг EC2 t4g.small (2 GB, `pimath-api` + `pimath-web`), RDS t4g.micro, S3 presigned upload. Хэдэн зуун сурагч ≤6 хуудас (≤12 МБ) PDF илгээж, хариугаа автоматаар хадгална.

### Файл илгээх — API санах ой

- `POST /uploads/complete` PDF-ийг **бүтэн татахаа больсон**: эхний 64 КБ (`Range: bytes=0-65535`, нийт хэмжээ Content-Range-аас, тусдаа HEAD-гүй) + сүүлийн 64 КБ (`bytes=-65536`) уншиж хуудсыг тоолно. pdf-lib (`photosToPdf`) хуудасны модыг файлын эхэнд бичдэг. Олдохгүй бөгөөд ≤2 МБ бол бүтэн уншина; түүнээс том бол хөтчийн `pages` (1–50) ашиглана
- Нэг complete ≈ 128 КБ (өмнө нь бүтэн файл: 12 МБ PDF = 12 МБ Buffer + 24 МБ хүртэл latin1 string ≈ 36 МБ). 50 зэрэг complete: ~1.8 GB → ~6 МБ
- Зориулалтын хязгаар: `homework` 12 МБ, бусад 25 МБ (presign, complete, хуучин multipart гурвуулаа)
- `@Throttle` 30/мин хэрэглэгч бүрт: `POST /uploads`, `/uploads/presign`, `/uploads/complete`
- Хуучин `POST /uploads` (S3-гүй/presign бүтэлгүйтсэн үед): multer дискэнд урсгалаар бичнэ, S3 руу `createReadStream`-ээр илгээнэ (санах ойд бүтэн ачаалахгүй)

**nginx (`/etc/nginx/sites-available/pimath-web`, `api.pimath.mn`):** `client_max_body_size 26m;` байх ёстой — анхдагч 1m бол хуучин multipart зам 413 өгнө. presigned PUT S3 руу шууд очдог тул nginx-ээр дамжихгүй. Шалгах: `sudo nginx -T | grep client_max_body_size`. Мөн `client_body_buffer_size 128k;` (том body-г nginx дискэнд буферлэнэ).

### pm2 — санах ойн хязгаар (`infra/aws/ecosystem.config.cjs`)

| Процесс | `NODE_OPTIONS` | `max_memory_restart` |
|---|---|---|
| `pimath-api` | `--max-old-space-size=512` | 750M |
| `pimath-web` | `--max-old-space-size=448` | 650M |

Нийт ≈ 1.4 GB, OS/nginx-д ~500 МБ үлдэнэ. Нэг процесс хэтэрвэл pm2 зөвхөн түүнийг дахин асаана (OOM-killer хоёуланг нь унагахаас сэргийлнэ). Хэрэглэх заавар файлын толгойд. Build үед `NODE_OPTIONS=--max-old-space-size=3072` хэвээр.

### Prisma pool ↔ RDS t4g.micro

- RDS `max_connections` = `LEAST(DBInstanceClassMemory/9531392, 5000)` → 1 GiB класст ≈ **80** (бодит утга: `SHOW max_connections;`)
- API `DB_POOL_MAX` анхдагч **15** (`api/src/prisma/prisma.service.ts`) — нэг Node процесс, автосэйв ~10–20 мс → ~6 зэрэг холболт хангалттай, ×2.5 нөөц. 15 нь 80-аас хол доогуур: `prisma migrate deploy`, psql, мониторинг, нөөц `pg_dump`-д зай үлдэнэ
- pm2 cluster/2+ EC2 болговол: `instances × DB_POOL_MAX ≤ ~60` (жишээ нь 2 × 15, 4 × 12)
- Вэб (Next) өгөгдлийн санд шууд холбогддоггүй — зөвхөн API
- micro класст RAM бага тул pool-ыг томсгох нь хурд нэмэхгүй (CPU credit, shared_buffers хязгаартай). Удаашрал = индекс/query; `DB_STATEMENT_TIMEOUT_MS=10000` гацсан query-г таслана

### Ачааллын шалгалт

`k6/homework-peak.js` — 500 VU, 10 минут (`k6/README.md`). Зөвхөн локал QA хуулбар сан дээр; прод руу хэзээ ч.
