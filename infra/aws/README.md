# Pi.mn — AWS дэд бүтэц

Албан хостинг: **AWS, Hong Kong (`ap-east-1`)**. Одоогийн прод (Vercel + Render + Supabase)-оос энд шилжинэ.

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
| 6 | **DNS** (домэйн бүртгэгч дээр) | `api` A-record → Elastic IP · `@` → Vercel | — |

**API-ийн env (EC2 дээр `api/.env`)** — одоо Render-д байгаатай ижил, утга нь өөрчлөгдөнө:

```
DATABASE_URL=postgresql://<user>:<нууц>@<rds-endpoint>:5432/pimath?sslmode=require
WEB_ORIGIN=https://pimath.mn
GOOGLE_REDIRECT_URI=https://api.pimath.mn/api/auth/google/callback
QPAY_CALLBACK_URL=https://api.pimath.mn/api/payments/qpay/callback
UPLOAD_DIR=/var/data/uploads
JWT_SECRET, RESET_TOKEN_SECRET, CRON_SECRET, GOOGLE_CLIENT_*, DB_POOL_*  ← Render-ээс хуулна
```

**Вэб (Vercel хэвээр):** `NEXT_PUBLIC_API_URL=https://api.pimath.mn/api`, Vercel-д `pimath.mn` домэйн нэмнэ.

**Шилжих дараалал:** RDS → Supabase-ээс `pg_dump` / `pg_restore` → EC2 дээр API асааж `api.pimath.mn`-ээр шалгах → вэбийн `NEXT_PUBLIC_API_URL` солих → Google OAuth консолд шинэ redirect URI нэмэх → Render-ийг унтраах.

**Зардал (ойролцоо):** EC2 + RDS жижиг класс ≈ $40–50/сар → $120 кредит ≈ 2–3 сар. Free plan зарим том классыг хаадаг тул зөвхөн жижиг класс сонгоно.
