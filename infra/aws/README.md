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
