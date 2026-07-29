# CI (`ci.yml`)

Энэ workflow нь `push` болон `pull_request` бүр дээр автоматаар ажиллаж,
код мержлэгдэхээс өмнө **type error, unit test, build алдаа**-г олж
илрүүлдэг. Өмнө нь энэ репод ийм шалгалт огт байгаагүй.

> **Lint алхам түр байхгүй:** `eslint` асаахад `api`-д 300 гаруй, `web`-д
> 150 гаруй (ихэнхдээ prettier форматын/react-hooks) алдаа гардаг —
> энэ CI cleanup-той шууд холбоогүй, хуучин tech debt. Тиймээс lint алхмыг
> яг одоо оруулбал CI эхний push дээрээ л унах тул `ci.yml`-д тайлбар
> comment-той хамт орхигдуулсан. Debt-г цэвэрлэсний дараа буцааж нэмнэ.

## Юу ажилладаг вэ

`api` болон `web` бие даасан төслүүд тул хоёр **job зэрэг (parallel)**
ажиллана — нэгнийх нь удаан/эвдрэлтэй байх нь нөгөөг блоклохгүй.

### `api` job
1. Node 22.23.1 суулгана (`api/.nvmrc`-ээс уншина)
2. `npm ci` — lockfile-ийн дагуу яг адилхан dependency суулгана
3. `npx prisma generate` — Prisma client үүсгэнэ (жинхэнэ DB рүү холбогдохгүй,
   `prisma.config.ts`-д зөвхөн `DATABASE_URL` орчны хувьсагч байхыг шаарддаг
   тул CI-д хуурамч (dummy) утга өгсөн)
4. `npx tsc --noEmit` — TypeScript compile хийхгүйгээр зөвхөн төрлийн алдаа шалгана
5. `npx jest src/tests/grading.spec.ts` — **зөвхөн** энэ файлыг ажиллуулна

   > Яагаад бүх test биш вэ? `src/tests/grading.spec.ts` нь `grading.ts`-ийн
   > цэвэр функцүүдийг (DB, network хэрэггүй) шалгадаг. Харин
   > `api/test/app.e2e-spec.ts` (e2e) болон `app.controller.spec.ts` нь Nest-ийн
   > бүх модулийг (`AppModule`) ачаалдаг тул ирээдүйд бодит Postgres
   > шаардах магадлалтай. CI-д Postgres service container нэмэх нь
   > (1) удаашрал нэмнэ, (2) migration/seed-тэй холбоотой шалтгаангүй унах
   > эрсдэлтэй — ийм CI-г баг сар өнгөрөхөд идэвхгүй болгодог. Тиймээс DB
   > шаардлагагүй нь батлагдсан цорын ганц spec-ийг л ажиллуулж байна.
   > DB ашигладаг тест нэмэгдвэл тусад нь Postgres service container-той
   > job үүсгэх хэрэгтэй.

### `web` job
1. Node 22.23.1 суулгана (`web/.nvmrc`-ээс уншина)
2. `npm ci`
3. `npx tsc --noEmit` — төрлийн алдаа шалгана
4. `npx next build` — production build амжилттай хийгдэж байгаа эсэхийг шалгана

npm-ийн cache-ийг `actions/setup-node`-ийн `cache: npm` +
`cache-dependency-path`-аар хийдэг тул хоёр дэд сангийн (`api/`, `web/`)
lockfile тус бүрийг зөв ялгаж кэшилнэ.

## Deploy job яагаад байхгүй вэ

Render (`api`) болон Vercel (`web`) аль хэдийн репозиторыг чагнаж автоматаар
deploy хийдэг. Энд дахин deploy job нэмбэл нэг push дээр хоёр deploy зэрэг
(давхар) ажиллах эрсдэлтэй тул зориудаар оруулаагүй болно.

## Алдаа гарвал яаж унших вэ

1. GitHub дээрх PR/commit-ийн `Checks` таб руу орно.
2. Алдаа гарсан job (`api` эсвэл `web`) болон тухайн алхмыг (step) олно —
   алхмуудын нэрс нь юу хийж байгааг тодорхой заасан (жишээ нь
   "Type-check (tsc --noEmit)").
3. Алхмын log-г нээж эхний улаан (алдаатай) мөрөөс уншина:
   - `tsc` алдаа → файл:мөр, юун дээр төрөл зөрсөн байгааг заана
   - `jest` алдаа → аль `it(...)`/`describe(...)` унасан, expected/received
   - `next build` алдаа → аль component/route дээр унасан

## Локал дээр яг адилхан шалгалт хэрхэн ажиллуулах вэ

```bash
# api/
cd api
npm ci
npx prisma generate
npx tsc --noEmit
npx jest src/tests/grading.spec.ts

# web/
cd web
npm ci
npx tsc --noEmit
npx next build
```

`nvm` ашигладаг бол push хийхийн өмнө `nvm use` (тус тус `api/` болон
`web/` дотор) ажиллуулж, CI-тэй ижил Node хувилбар (22.23.1) дээр
шалгаарай.
