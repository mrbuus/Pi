# Google-ээр нэвтрэх ба Gmail холболт: тохируулах заавар

Хоёулаа **үнэгүй**. Код бэлэн болсон (PR #9). Эзэн Google Cloud-оос 2 түлхүүр аваад Render-т оруулахад л ажиллана.
Түлхүүр оруулаагүй үед «Google-ээр нэвтрэх» товч харагдахгүй, сайт хэвийн ажилласаар байна.

---

## А. Google-ээр нэвтрэх (≈10 минут)

### 1. Google Cloud төсөл үүсгэх
1. Safari дээр https://console.cloud.google.com нээж, Gmail хаягаараа нэвтэрнэ.
2. Дээд хэсгийн төслийн сонголт → **New Project** → нэр: `pimn` → **Create**.

### 2. Зөвшөөрлийн дэлгэц (OAuth consent screen)
1. Зүүн цэс → **APIs & Services → OAuth consent screen** (шинэ интерфэйст **Google Auth Platform → Branding**).
2. Талбаруудыг бөглөнө:
   - App name: `Pi.mn`
   - User support email: өөрийн Gmail
   - Audience: **External**
   - Developer contact: өөрийн Gmail
3. Scopes: `openid`, `email`, `profile`. Эдгээр нь үндсэн эрх тул Google-ийн хяналт шаардахгүй.
4. **Publish app** дарж «In production» төлөвт шилжүүлнэ. Ингэхгүй бол зөвхөн «test users» жагсаалтад нэмсэн хүмүүс нэвтэрч чадна.

### 3. Client ID үүсгэх
1. **APIs & Services → Credentials → Create credentials → OAuth client ID**.
2. Application type: **Web application**, Name: `pimn-web`.
3. **Authorized redirect URIs** хэсэгт хоёр хаяг нэмнэ:
   - `https://pimn-api.onrender.com/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback` (Mac дээр туршихад)
4. **Create** дарахад **Client ID** ба **Client secret** гарна. Хоёуланг нь хуулж авна.
   Энэ хоёрыг чатад **бүү** бичээрэй, шууд Render-т оруулна.

### 4. Render-т оруулах
dashboard.render.com → `pimn-api` → **Environment** → **Add Environment Variable**:

| Key | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | (3-р алхмын Client ID) |
| `GOOGLE_CLIENT_SECRET` | (3-р алхмын Client secret) |
| `GOOGLE_REDIRECT_URI` | `https://pimn-api.onrender.com/api/auth/google/callback` |

`WEB_ORIGIN` нь вэбийн хаяг (`https://web-one-pi-59.vercel.app`) хэвээр байх ёстой. Google нэвтрэлт амжилттай болсны дараа хэрэглэгчийг энэ хаяг руу буцаана.

**Save → Deploy** дарна. Шалгах:
```bash
curl -s https://pimn-api.onrender.com/api/auth/google/config
# {"enabled":true} гэж гарвал бэлэн
```

### 5. Хэрхэн ажилладаг вэ (хэрэглэгчид)
- **Холбох:** «Миний мэдээлэл» → **Google бүртгэл холбох** → Google-ээ сонгоно.
  Үүнээс хойш утас, нууц үг бичихгүйгээр **Google-ээр нэвтрэх** товчоор орно.
- **Автомат холболт:** хэрэглэгчийн Pi.mn дээрх имэйл нь Google-ийн баталгаажсан имэйлтэй яг таарвал эхний удаа автоматаар холбогдоно.
- **Шинэ бүртгэл үүсэхгүй.** Google-ээр зөвхөн аль хэдийн бүртгэлтэй хүн нэвтэрнэ. Сурагчийг төв өөрөө бүртгэдэг (нууц үг = утас) дүрэм хэвээр.
- Нэг хэрэглэгчид нэг Google бүртгэл. Нэг Google-ийг хоёр хүнд холбох боломжгүй.

### 6. Аюулгүй байдал (техникийн тэмдэглэл)
- Сервер талын OAuth 2.0 authorization code урсгал ашиглана. Client secret зөвхөн серверт хадгалагдана.
- `state` ба нэг удаагийн солилцооны код (60 сек) нь ӨС-д зөвхөн SHA-256 хэшээр хадгалагдана.
- JWT хэзээ ч URL-д орохгүй. Вэб нэг удаагийн кодыг POST хүсэлтээр JWT болгож солино.
- `id_token`-ийн `iss`, `aud`, `exp`, `email_verified` талбаруудыг шалгана.
- Хүснэгтүүд: `GoogleIdentity`, `GoogleOAuthState`, `GoogleLoginExchange`. Миграци `20260908_add_google_identity_auth` прод ӨС-д аль хэдийн хийгдсэн, репод одоо орсон.
- Endpoint-ууд: `GET /api/auth/google/{config,url,callback,status}`, `POST /api/auth/google/{link,exchange}`, `DELETE /api/auth/google/link`.

---

## Б. Gmail-ээр имэйл илгээх (нууц үг сэргээх код, мэдэгдэл)

Код аль хэдийн бэлэн (`api/src/notifications/email.service.ts`). Gmail App Password аваад Render-т оруулахад ажиллана.

1. https://myaccount.google.com/security → **2-Step Verification**-ийг асаана (App Password авахад заавал хэрэгтэй).
2. https://myaccount.google.com/apppasswords → нэр: `pimn` → **Create** → 16 тэмдэгттэй код гарна.
3. Render → `pimn-api` → Environment:

| Key | Value |
|---|---|
| `EMAIL_SMTP_HOST` | `smtp.gmail.com` |
| `EMAIL_SMTP_PORT` | `465` |
| `EMAIL_SMTP_USER` | таны Gmail хаяг |
| `EMAIL_SMTP_PASS` | 2-р алхмын 16 тэмдэгт (зайгүй) |
| `EMAIL_FROM` | `Шинэ Ирээдүйн Эзэд <таны Gmail хаяг>` |

Хязгаар: Gmail өдөрт ~500 имэйл илгээнэ. Одоогийн хэрэглээнд хангалттай.
