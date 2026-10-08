# Night-1 smoke ба эрхийн шалгалт

Зөвхөн тусгаарласан, зохиомол өгөгдөлтэй **localhost** орчинд ажиллуулна. Энэ багц production тест, бизнесийн бүрэн E2E, ачааллын тестийг орлохгүй.

## Хамаарал ба хатуу горим

`night1-contracts.json` нь G22, G23, G12, G36, G24, G27, G39, G25, G26, G17, G33-ийн HTTP гэрээ болон зургаан role-ийн матриц. Үндсэн салбараас тусдаа PR үүсгэсэн тул бусад PR ороогүй үед `access-control.spec.ts` дотор дутуу маршрутууд ил харагдах `skip` болно. Бүх хамаарлыг нэгтгэсний дараа **заавал**:

```sh
NIGHT1_COMPLETE=1 npx jest src/auth/access-control.spec.ts --runInBand
```

Хатуу горим нь дутуу маршрут, буруу HTTP арга/зам, JWT/Roles guard байхгүй, зургаан role-ийн аль нэг зөрүүг унагана. Ownership, transaction, audit, хүсэлтийн DTO болон амжилттай бичилтүүдийг тус тусын service/controller тестүүд шалгана.

## HTTP smoke

1. Тусгаарласан PostgreSQL сан үүсгэж migration deploy хийнэ. Зөвхөн зохиомол зургаан role-ийн хэрэглэгч үүсгэнэ. Жинхэнэ `.env`, SMTP, SMS, төлбөрийн түлхүүр бүү ашигла.
2. API-г localhost дээр ажиллуулна. `DATABASE_URL`-ийг заавал ил өгнө; route dump нь `.env`-ээс сан сонгохыг зөвшөөрөхгүй.
3. Эдгээр зохиомол хэрэглэгчийн богино настай JWT-г тухайн API-ийн test secret-ээр үүсгэж `SMOKE_STUDENT_TOKEN`, `SMOKE_TEACHER_TOKEN`, `SMOKE_TEACHER_PLUS_TOKEN`, `SMOKE_ADMIN_TOKEN`, `SMOKE_PARENT_TOKEN`, `SMOKE_BUYER_TOKEN` env-д өгнө. Скрипт default утас/нууц үг ашиглахгүй, нэвтрэх хүсэлт хийхгүй, токен/response body хэвлэхгүй.

```sh
# api/ хавтсаас; доорх сан нь зөвхөн жишээ localhost сан.
export SMOKE_SYNTHETIC=1
export DATABASE_URL='postgresql://synthetic:synthetic@127.0.0.1:3367/night1_smoke'
export DOTENV_CONFIG_PATH=/dev/null
# JWT_SECRET болон зургаан SMOKE_*_TOKEN-ийг локал test fixture-ээс өгнө.
npm run smoke:routes
node test/smoke/endpoints.mjs --base http://127.0.0.1:3366 --night1-complete
```

`routes.txt`-ийг үүсгэх нь Nest модулиудыг ачаалдаг. Зөвхөн хуурамч өгөгдлийн сан, үйлчилгээний түлхүүргүй орчин ашиглах шаардлагатай. Гаралтын файлд зөвхөн арга/зам байна. Генерацлагдсан жагсаалт, токен болон fixture-ийг commit хийхгүй.

GET маршрутуудад anonymous ба зургаан role-ийг шалгана. Бичих үйлдлүүдэд зөвхөн гэрээнд тодорхойлсон **хориглосон role/anonymous** хүсэлт явуулна; эрхтэй хэрэглэгчийн бичилт, дурын POST, SMS илгээх, төлбөр үүсгэхийг огт дуудахгүй. Хуанлийн token URL-д query token-гүй үед 404 шаардана. Зөв token/эзэмшлийн хязгаарыг G39 service тест шалгана.

500, сүлжээний алдаа, 3xx redirect, 429, хориглосон role-д 403-аас өөр хариу, anonymous private маршрут нээгдэх нь алдаа болно. Эрхтэй хэрэглэгчийн endpoint бүр заавал 200 байх ёстой гэж үзэхгүй: зориудын байхгүй resource ID нь 400/404/ownership 403 буцааж болно. Ийм smoke амжилттай гарлаа ч бизнесийн бүх урсгал ажиллаж байгааг нотлохгүй.

```sh
node --test test/smoke/endpoints.test.mjs
```

Энэ жижиг тест нь production хаяг/өгөгдлийн сан, redirect, timeout, буруу credential, зөвшөөрөгдсөн бичилтээс хамгаалах логикийг батална. Хатуу горимд `--only`-гоор шүүвэл бусад гэрээ дутуу тул унах нь зориудын үйлдэл.
