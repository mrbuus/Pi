# Pi.mn — Google authorization тохиргоо

Энэ нь эхний хувилбарын **Google account холбох + Google-ээр нэвтрэх**
тохиргоо. Calendar, Drive, Meet-ийн зөвшөөрөл, token энэ шатанд байхгүй.

## Эзэмшигч account

Google Cloud Console-д сургалтын төвийн зориулалтаар шинээр нээсэн Gmail
account-аар нэвтэрнэ. Энэ account нь OAuth project-ийн эзэн болно; сурагч,
багш нар энэ Gmail-ээр заавал орохгүй, өөрсдийн Google account-аа Pi.mn
account-тайгаа холбодог.

Эзэмшигч Gmail account-д recovery phone, 2-Step Verification тохируулна.

## Google Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/)-д нэвтэрч шинэ
   project үүсгэнэ: `Pi.mn`.
2. **APIs & Services → OAuth consent screen** дээр External сонгоно. App нэр
   `Pi.mn`, support email болон developer contact email-ийг сургалтын төвийн
   Gmail-ээр тохируулна.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
4. Application type: **Web application**.
5. Authorized JavaScript origins:
   - `http://localhost:3001`
   - production Vercel вебийн домэйн (жишээ: `https://web-one-pi-59.vercel.app`)
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/google/callback`
   - `https://pimn-api.onrender.com/api/auth/google/callback`
7. Үүссэн `Client ID`, `Client secret`-ийг хуулна. Secret-ийг Google Cloud
   Console-оос дахин бүтнээр нь харах боломжгүй байж болох тул password manager
   эсвэл Render-ийн secret env-д шууд хадгална.

## Environment variables

Local `api/.env` болон Render API service-ийн environment variables дээр:

```dotenv
GOOGLE_OAUTH_CLIENT_ID="...apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="..."
GOOGLE_OAUTH_REDIRECT_URI="https://pimn-api.onrender.com/api/auth/google/callback"
WEB_ORIGIN="https://web-one-pi-59.vercel.app"
```

Local туршилтад `GOOGLE_OAUTH_REDIRECT_URI` болон `WEB_ORIGIN`-ийг localhost
утгаар солино. OAuth client-ийн callback URL болон environment-ийн URL нь яг
ижил байх ёстой.

## Хэрэглэгчийн урсгал

1. Одоо байгаа хэрэглэгч утас + нууц үгээр Pi.mn-д орно.
2. **Миний мэдээлэл → Google account холбох** дарж өөрийн Google account-аа
   батална.
3. Дараагийн удаа login page-ийн **Google-ээр нэвтрэх** товчоор шууд яг тэр
   Pi.mn profile руу орно.

Имэйл хаяг адил байлаа ч систем account-ийг автоматаар нэгтгэхгүй. Google-ийн
тогтвортой `sub` identity-г л холбоно. Google callback URL-д Pi.mn JWT
гаргахгүй; 90 секундийн, нэг удаа ашиглах кодоор веб JWT-ээ API-с солино.

## Production шалгалт

1. Profile дээр Google account холбоно.
2. Logout хийнэ.
3. Login page дээр Google-ээр нэвтэрч ижил role/home page руу орж байгааг
   шалгана.
4. Өөр Google account-аар орж үзэхэд “Pi.mn бүртгэлтэй холбогдоогүй” гэсэн
   тайлбар гарах ёстой.
5. Нэг Google account-ыг хоёр Pi.mn account-д холбох оролдлого conflict
   өгөх ёстой.
