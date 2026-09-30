# Codex спринт №2: 48 цагийн бүтэн ажил (2026-09-26 → 28)

> Эзэн Codex-ийн 7 хоногийн хэрэглээг 2 хоногт бүрэн ашиглах шаардлагатай.
> Энэ файл нь **21 бие даасан даалгавар**. Codex дээр даалгавар бүрийг
> **тусдаа task** болгон зэрэг ажиллуул (JSON хувилбар: `docs/CODEX-SPRINT-2.json`,
> даалгавар бүрийн `prompt` талбар нь дангаараа бүрэн, хуулж тавихад бэлэн).
>
> Гол сэдэв: **ЭЕШ-ийн математикийн томьёоны сан** (бүх томьёо, ерөнхий хэлбэр,
> тайлбар, жишээ, цээжлэх арга, туулсан тест хүртэлх томьёо, давтлага), мөн
> **хүүхдэд хамгийн хэрэгтэй «Алдааны дэвтэр»**, эцэг эхийн долоо хоногийн
> тайлан, сануулга, PWA, чанарын ажил, контентын засвар, судалгаа.

---

## Долгион ба дараалал

| Долгион | Эхлэх үе | Даалгаврууд (зэрэг) |
|---|---|---|
| 1 | Шууд | T01, C1, C2, C3, C4, C5, C6, C7, C8, T12, T14, T15, T17, T19, T20 |
| 2 | T01 нэгтгэгдсэн (167299f) тул шууд, суурь салбараас | T09, T10, T11, T13 |
| 3 | T09-ийн PR нээгдсэний дараа (T09-ийн салбараас) | T21 |
| 4 | Хамгийн сүүлд (бүх PR-ын дараа, суурь салбараас) | T18 |

Нэг долгион доторх даалгаврууд **өөр өөр файл** эзэмшдэг. Иймээс мөргөлдөөн гарахгүй.
Файлын эзэмшлийг «Хамрах файл» хэсэгт заасан. Түүнээс гадуурх файлд хүрэхгүй.

---

<!-- COMMON:BEGIN -->
# НИЙТЛЭГ ЗААВАР (даалгавар бүрт хамаарна)

Чи Pi.mn (Монголын ЭЕШ-ийн бэлтгэлийн сургалтын төвийн платформ, NestJS API
+ Next.js вэб) дээр БИЕ ДААН ажиллана. Эзэн асуултад хариулах боломжгүй.
Эргэлзвэл хамгийн аюулгүй, хамгийн жижиг, буцаах боломжтой шийдлийг сонго.
Сонголтоо PR тайлбарын «Эзэн шийдэх» хэсэгт бич. Ажлыг дундаас нь бүү орхи:
гацвал шалтгаанаа бичээд дараагийн дэд ажил руу шилж, эцэст нь PR заавал нээ.
Энэ даалгавар урт, том. Хугацаа бүү хэмн. Чанар, бүрэн байдал, тест хамгийн чухал.

## 0. Эхлэхийн өмнө
- Repo: `mrbuus/Pi`. Суурь салбар: `claude/100-dollar-credit-usage-ksqjev`
  (хамгийн сүүлийн commit, 49814f3 ба түүнээс хойш).
- Заавал унш: `STATUS.md` (бүхэлд нь: §2 шалгалт, §3 эзний дүрэм, §6 дизайны
  гэрээ, §7 дэд системүүд, §8 урхи), `CLAUDE.md`, `web/AGENTS.md`,
  `web/src/components/ui/kit/README.md`, `api/prisma/schema.prisma`.
- Next.js 16.2 нь сургалтын өгөгдлөөс ЯЛГААТАЙ. Web код бичихийн өмнө
  `web/node_modules/next/dist/docs/`-оос холбогдох хэсгийг унш.
- Стек: NestJS, Prisma 7.8 + `@prisma/adapter-pg`, Next.js 16.2 App Router,
  Tailwind v4, KaTeX (`components/MathText.tsx`: `$...$` мөр дотор,
  `$$...$$` тусдаа мөр).
- Суурь шалгалтыг ЭХЛЭЭД ажиллуулж тоог нь PR-д бич:
  `cd api && npx tsc --noEmit && npx jest`,
  `cd web && npx tsc --noEmit && npx eslint src && npm run build`,
  `cd e2e && npx playwright test`. Эдгээр тоо буурах ЁСГҮЙ.

## 1. ХАТУУ ДҮРЭМ (зөрчвөл PR буцаагдана)
1. `main` руу push/merge ХОРИОТОЙ. Force-push хориотой. PR-ийн base =
   `claude/100-dollar-credit-usage-ksqjev` (эсвэл хамаарах даалгаврын салбар:
   тэр тохиолдолд PR-д «<салбар>-аас хамаарна» гэж бич). Салбарын нэр:
   `codex/s2-<ДААЛГАВАР>-<богино-нэр>`. Нэг даалгавар = нэг PR.
2. Математик бичвэр ҮРГЭЛЖ LaTeX (`MathText`). `π ² · ≤ √ ∞` гэх мэт unicode
   математик тэмдэгт кодод ч, өгөгдөлд ч хориотой: `\pi`, `^2`, `\cdot`, `\le`,
   `\sqrt{}`, `\infty` бич.
3. Emoji, unicode глиф (`✓ ✗ → • ★`) хориотой. Зөвхөн `lucide-react` дүрс.
   Тусгаарлагч цэгийг `components/ui/Meta.tsx`-ээр.
4. Өнгө зөвхөн токеноор (`bg-brand`, `text-ink-dim`, `bg-accent-teal/15`,
   `text-success`, `border-line` …). `bg-blue-600`, `#hex`, `text-green-500`
   хориотой. Гадны CDN, гадны зураг хориотой. Фонт (Onest + Unbounded)
   `web/public/fonts`-оос өөрөө хост хийгдсэн. `next/font/google` ХЭРЭГЛЭХГҮЙ
   (CI build сүлжээгүй үед унадаг). Шинэ фонт нэмэхгүй.
5. UI-г `web/src/components/ui/kit/`-ээс бүтээ (Button, Card, Badge, Progress,
   Tabs, Drawer, Toaster). Мэдэгдэл `toast` (sonner). Шинэ дизайн нь «chunky 3D»:
   карт `chunky` utility (2px хүрээ + 4px доод хүрээ, radius 1.5rem), дарагддаг
   хавтан `chunky chunky-press`, товч `btn-3d`. Жишээ:
   `web/src/app/app/library/page.tsx`, `components/payments/PaidUntilCard.tsx`,
   `components/activity/StreakWeekCard.tsx`. Өнгөлөг, урам өгөх (Duolingo /
   Khan Academy хэв маяг). Гэхдээ «AI-аар хийсэн» мэт ерөнхий харагдах ёсгүй.
6. Web-ээс API дуудахдаа ЗӨВХӨН `web/src/lib/api.ts`-ийн `api()` / `uploadFile()`.
   Түүхий `fetch("/api/…")` хориотой (прод дээр вэб Vercel, API Render дээр).
7. Mobile-first: 375px өргөнд хэвтээ гүйлгэлтгүй, товч 44px-ээс багагүй. Утас болон
   компьютер хоёулаа адил чухал. Дэлгэц бүрт loading / empty / error төлөв
   (`components/ui/StateBlock.tsx`). `"use client"`-ийг мартахгүй.
8. Гараг: эзэн 1=Даваа…7=Ням, ӨС нь JS 0=Ням…6=Бямба.
9. Хэрэглэгчийн анхны нууц үг = утасны дугаар (эзний дүрэм). Нууц үгийн
   бодлого (үсэг+тоо), `auth/*` DTO-д Claude ажиллаж байна. ХҮРЭХГҮЙ.
10. Backend: контроллер бүр `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(...)`.
    `req.user = { userId, role }`. DTO-ийн талбар бүрт class-validator decorator
    ЗААВАЛ (`whitelist:true` decorator-гүй талбарыг чимээгүй хасдаг). DTO бүрт
    `.spec.ts` доторх `validate()` тест. Шинэ модулийг `app.module.ts`-д бүртгэж,
    хамаарах модулийн `exports`-ийг шалга (NestJS boot унадаг урхи, STATUS §8.1/8.4).
11. Эрх: TEACHER зөвхөн өөрийн анги (`classroom.teacherId === userId`),
    TEACHER_PLUS ба ADMIN бүгдийг. STUDENT зөвхөн өөрийнхийгөө. PARENT зөвхөн
    `verifiedAt != null` холбоотой хүүхдийнхээ. Шинэ endpoint бүрт эрхийн тест
    (403 тохиолдол заавал).
12. Функц ХЭЗЭЭ Ч устгахгүй. Одоо байгаа endpoint-ийн хариуны хэлбэрийг эвдэхгүй
    (зөвхөн талбар нэмнэ).
13. Мөнгөтэй үйлчилгээ, шинэ SaaS, API түлхүүр ХОРИОТОЙ (эзэн нэмэлт мөнгө
    төлөхгүй). Имэйл нь одоо байгаа `EMAIL_SMTP_*` env-ээр. Тохируулаагүй бол
    чимээгүй алгасна. Е-баримт ХИЙХГҮЙ (эзний дүрэм 13).
14. Хувийн мэдээлэл бүхий бодит файл, дамп, скриншотыг commit хийхгүй. Тестэд
    зохиомол өгөгдөл. 100x100-ийн C хувилбар бол эзний хувийн материал: нээхгүй,
    импортлохгүй.
15. Шинэ хуудсыг ЦЭСЭНД бүү нэм (`components/nav/*` Claude-ийнх). PR тайлбарт
    «Цэсэнд нэмэх: /app/..., role, бүлэг, lucide дүрс» гэж бич.
16. Самбарт (student/parent/teacher/admin dashboard) шууд бүү нэм. Бие даасан
    компонент бичээд, хаана залгахыг PR-д бич.
17. Шинэ web endpoint дуудлага бүрт `e2e/tests/mock-api.ts`-д mock гэрээ нэм
    (замыг ЯГ тааруулдаг, дутуу mock бол тест унана). Шинэ хуудас бүрт
    `e2e/tests/`-д дор хаяж нэг journey тест (desktop + mobile-375 project).

## 2. Өгөгдлийн сан (миграци)
- Зөвхөн НЭМЭХ: шинэ хүснэгт, nullable эсвэл default-той багана, index.
  DROP, RENAME, төрөл солих, default-гүй NOT NULL ХОРИОТОЙ.
- Миграцийн нэр (давхцахгүй, зөвхөн өөрийнхөө дугаарыг ашигла):
  `20260928_01_formula_library` = T01,
  `20260928_02_formula_review` = T10,
  `20260928_03_mistake_notebook` = T12,
  `20260928_04_reminders_reports` = T14,
  `20260928_05_readiness_snapshot` = T13 (хэрэгтэй бол л).
  Байршил: `api/prisma/migrations/<нэр>/migration.sql`.
- Гараар бичээд `npx prisma validate` + `npx prisma generate` ажиллуул.
  Үүсгэсэн клиент `api/src/generated`-д commit хийгддэг. Үүнийг шинэчилж commit
  хий. Локал Postgres дээр `prisma migrate deploy`-оор хоосон ӨС-д туршиж PR-д бич.
- `20260908_add_google_identity_auth` нь прод ӨС-д бий. Google* хүснэгтэд хүрэхгүй.
- `schema.prisma` дээр зөвхөн өөрийн model/талбарыг хөндөнө.

## 3. ХҮРЭХГҮЙ ФАЙЛ (Claude эзэмшдэг)
`web/src/app/app/layout.tsx` · `web/src/components/nav/**` ·
`web/src/app/globals.css` · `web/src/app/fonts.css` · `web/src/components/ui/**`
(kit-д шинэ компонент нэмэхийг зөвшөөрнө, байгааг засахгүй) ·
`web/src/components/activity/**` · `web/src/app/app/student/page.tsx` ·
`web/src/app/app/parent/page.tsx` · `web/src/app/app/teacher/**` ·
`web/src/app/app/admin/page.tsx`, `AdminDashboardClient.tsx` ·
`web/src/components/TeacherDashboard/**` · `web/src/components/exam/**` ·
`api/src/auth/**` · `api/prisma/import-*.cjs` · `api/prisma/reimport-latex.cjs` ·
`api/prisma/data/100x100-v3/**` · `.github/workflows/**` (зөвхөн T18 шинэ job
санал болгож болно, PR тайлбарт).

## 4. PR тайлбарын загвар (заавал)
```
## Даалгавар: <ID> — <нэр>
## Юу хийсэн (backend / web / миграци / өгөгдөл)
## Яагаад ийм шийдэл (судалгаа, сурах шинжлэх ухааны үндэслэл)
## Эрх (role бүрээр хэн юу хийж чадах)
## Шалгалт (командууд + тоо: jest N/N, e2e N passed, build OK)
## Эзний Mac дээр ажиллуулах команд (хэрэв скрипт бол: dry-run → --commit)
## Цэсэнд нэмэх / Самбарт залгах
## Эзэн шийдэх
## Хамаарал (өөр PR, салбар)
```
<!-- COMMON:END -->

---

# ГЭРЭЭ: Томьёоны өгөгдлийн формат ба API (T01, C1–C8, T09–T11, T21 бүгд үүнийг мөрдөнө)

<!-- CONTRACT:BEGIN -->
## A. Томьёоны өгөгдлийн файл

Байршил: `api/prisma/data/formulas/<section-slug>.json`. Нэг файл = нэг бүлэг.
UTF-8, 2 зайтай. Бүх математик LaTeX. Текст дотор `$...$`, бие даасан талбарт
(`latex`, `general` …) `$`-гүй цэвэр LaTeX.

```jsonc
{
  "section": {
    "slug": "trigonometry",               // доорх B хүснэгтийн slug-аас
    "title": "Тригонометр",
    "order": 5,
    "icon": "triangle-right",             // lucide дүрсний kebab нэр
    "description": "Нэгж тойрог, адилтгал, тэгшитгэл — ЭЕШ-ийн 3–5 бодлого"
  },
  "formulas": [
    {
      "slug": "trig-double-sin",          // давтагдашгүй, [a-z0-9-], бүх файлд
      "title": "Давхар өнцгийн синус",
      "order": 12,
      "level": "CORE",                    // CORE = ЭЕШ-д заавал, EXTRA = гүнзгий
      "grade": 10,                        // анх заагддаг анги (7–12)
      "topicSlugs": ["TRIG"],             // B хүснэгтийн сэдвийн код(ууд)
      "latex": "\\sin 2\\alpha = 2\\sin\\alpha\\cos\\alpha",
      "general": "\\sin 2x = 2\\sin x\\cos x",   // ЕРӨНХИЙ хэлбэр (хувьсагчаар)
      "variants": [                       // бусад хэлбэр, эсрэг чиглэл
        { "label": "Урвуу чиглэлд", "latex": "\\sin\\alpha\\cos\\alpha = \\tfrac{1}{2}\\sin 2\\alpha" }
      ],
      "conditions": [],                   // LaTeX: ["a > 0", "a \\ne 1"]
      "explanation": "…$\\sin$ …",        // 2–5 өгүүлбэр, энгийн монгол хэлээр, 9–12-р ангийн хүүхдэд
      "derivation": [                     // яагаад ийм болдог: 2–6 алхам, текст+$LaTeX$
        "Нийлбэрийн томьёо: $\\sin(\\alpha+\\beta)=\\sin\\alpha\\cos\\beta+\\cos\\alpha\\sin\\beta$",
        "$\\beta=\\alpha$ гэж тавибал …"
      ],
      "mnemonic": "…",                    // цээжлэх арга: хэллэг, хэв маяг, зураг төсөөлөх, 1–3 өгүүлбэр
      "examples": [                       // ДОР ХАЯЖ 2. Нэг нь ЭЕШ-ийн хэв маягтай (A–E сонголттой байж болно)
        {
          "problem": "$\\sin\\alpha=\\tfrac{3}{5}$, $\\alpha$ I мөчид бол $\\sin 2\\alpha$-г ол.",
          "steps": ["$\\cos\\alpha=\\tfrac{4}{5}$", "$\\sin2\\alpha=2\\cdot\\tfrac35\\cdot\\tfrac45=\\tfrac{24}{25}$"],
          "answer": "$\\tfrac{24}{25}$"
        }
      ],
      "commonMistakes": ["$\\sin 2\\alpha$-г $2\\sin\\alpha$ гэж бодох"],
      "eeshTip": "ЭЕШ-д ихэвчлэн … хэлбэрээр гардаг",   // 1–2 өгүүлбэр
      "related": ["trig-double-cos", "trig-sum-sin"],    // бусад slug (байх ёстой)
      "keywords": ["давхар өнцөг", "синус"],             // хайлтад
      "widget": null,                      // эсвэл C хүснэгтийн widget нэр
      "quiz": [                            // цээжлэх тоглоомд, ДОР ХАЯЖ 2
        { "type": "blank", "prompt": "\\sin 2\\alpha = \\square", "answer": "2\\sin\\alpha\\cos\\alpha",
          "distractors": ["2\\sin\\alpha", "\\sin^2\\alpha-\\cos^2\\alpha", "\\sin\\alpha\\cos\\alpha"] },
        { "type": "truefalse", "prompt": "\\sin 2\\alpha = 2\\sin\\alpha", "answer": "false",
          "why": "Аргументийг 2 дахин өсгөхөд утга 2 дахин өсдөггүй" }
      ]
    }
  ]
}
```

Чанарын шаардлага (файл бүр):
- LaTeX бүр KaTeX-ээр алдаагүй рендерлэгдэнэ. Шалгах: T01 бичих
  `node api/prisma/validate-formulas.cjs [файл]`. T01 болоогүй бол энэ түр
  шалгагчийг ашигла:
  ```bash
  node -e 'const k=require("./web/node_modules/katex");const f=process.argv[1];const d=require(require("path").resolve(f));let n=0,e=0;const chk=s=>{try{k.renderToString(s,{throwOnError:true,strict:"ignore"});n++}catch(x){e++;console.error(f,s,x.message)}};const txt=t=>String(t).split("$").forEach((p,i)=>{if(i%2)chk(p)});for(const x of d.formulas){["latex","general"].forEach(k2=>x[k2]&&chk(x[k2]));(x.variants||[]).forEach(v=>chk(v.latex));(x.conditions||[]).forEach(chk);[x.explanation,x.mnemonic,x.eeshTip,...(x.derivation||[]),...(x.commonMistakes||[])].forEach(t=>t&&txt(t));(x.examples||[]).forEach(ex=>[ex.problem,ex.answer,...ex.steps].forEach(txt));(x.quiz||[]).forEach(q=>{chk(q.prompt.replace("\\square","\\boxed{?}"));if(q.type==="blank"){chk(q.answer);q.distractors.forEach(chk)}})}console.log("ok",n,"err",e);process.exit(e?1:0)' api/prisma/data/formulas/<файл>.json
  ```
- Unicode математик тэмдэгт (`π ² ³ · × ÷ ≤ ≥ ≠ √ ∞ ∈ α β`) текстэнд ч
  байхгүй. Үргэлж `$\\pi$` гэх мэт.
- Математик ЗӨВ байх ёстой. Жишээ бүрийг өөрөө бодож шалга. Хариуг тоогоор
  шалгах боломжтой бол жижиг Node скриптээр шалга (жишээ нь тригонометрийн
  адилтгалыг санамсаргүй 20 утгаар). Эргэлзээтэй бол PR-ийн «Эзэн шийдэх»
  хэсэгт жагсаа.
- Хэл: ойлгомжтой, найрсаг, 9–12-р ангийн сурагчид зориулсан. Нэр томьёо Монгол
  сургуулийн сурах бичгийнхтэй ижил («дискриминант», «тодорхойлогдох муж»,
  «прогресс», «уламжлал», «эх функц», «интеграл», «хэсэглэл», «байрлал»,
  «сэлгэмэл», «магадлал»).
- Зохиогчийн эрх: сурах бичиг, ЭЕШ-ийн материалаас текст бүү хуул. Жишээг
  өөрөө зохио.

## B. Бүлгүүд (section) ба сэдвийн кодууд (topicSlugs)

| Файл / section.slug | Гарчиг | order | Даалгавар |
|---|---|---|---|
| `numbers-algebra` | Тоо ба алгебрийн илэрхийлэл | 1 | C1 |
| `equations-inequalities` | Тэгшитгэл ба тэнцэтгэл биш | 2 | C2 |
| `functions-exp-log` | Функц, илтгэгч ба логарифм | 3 | C3 |
| `trigonometry` | Тригонометр | 4 | C4 |
| `sequences-combinatorics-probability` | Прогресс, комбинаторик, магадлал, статистик | 5 | C5 |
| `calculus` | Хязгаар, уламжлал, интеграл | 6 | C6 |
| `plane-geometry` | Хавтгайн геометр | 7 | C7 |
| `solid-geometry-vectors-coordinates` | Огторгуйн геометр, вектор, координат | 8 | C8 |

`topicSlugs` утгууд (одоо байгаа 100x100-ийн сэдвийн кодтой нийцнэ, шинийг
зөвхөн эндээс): `TOO` (тоо), `ALG` (алгебрийн хувиргалт), `RATEQ`, `RATINEQ`,
`ABSEQ`, `ABSINEQ`, `IRREQ`, `IRRINEQ`, `EXPEQ`, `EXPINEQ`, `LOGEXP`, `LOGEQ`,
`LOGINEQ`, `FUNC`, `TRIG`, `TRIGEQ`, `SEQ`, `COMB`, `PROB`, `STAT`, `LIMIT`,
`DERIV`, `INTEG`, `PLANE`, `SOLID`, `VECTOR`, `COORD`, `SYSTEM`, `PARAM`.

## C. Интерактив widget-ийн нэрс (T21 хийнэ; C1–C8 тохирох томьёонд `widget` тавина)

`square-of-sum` (талбайгаар $(a+b)^2$) · `difference-of-squares` ·
`quadratic-graph` (a,b,c гулсуур, орой, дискриминант, язгуур) ·
`vieta` · `abs-graph` · `exp-graph` (суурь гулсуур, a>1 vs 0<a<1) ·
`log-graph` · `unit-circle` (өнцөг чирэх, sin/cos/tg утга) · `sine-graph`
(A, ω, φ гулсуур) · `arith-seq` · `geom-seq` (хязгааргүй нийлбэр рүү
ойртох) · `pascal-triangle` · `probability-dice` (симуляц) ·
`derivative-tangent` (шүргэгч чирэх) · `integral-area` (Риманы нийлбэр) ·
`pythagoras` (талбайн баталгаа) · `triangle-area` · `inscribed-angle` ·
`circle-sector` · `prism-volume` · `cone-cylinder` · `vector-add` ·
`line-slope`.

## D. API гэрээ (T01 хийнэ. T09, T10, T11, T13, T21 үүн дээр тулгуурлана)

Бүгд `JwtAuthGuard`. Хариуны хэлбэр ЯГ ийм:

```
GET  /formulas/sections
     → [{ slug, title, order, icon, description, count }]
GET  /formulas?section=&q=&topic=&level=&grade=
     → [{ slug, title, section, order, level, grade, topicSlugs, latex, general, widget }]
       (q нь title, keywords, slug дээр ILIKE; бүх role)
GET  /formulas/:slug
     → { ...бүх талбар (A-гийн дагуу), section: {slug,title,icon},
         related: [{slug,title,latex}],
         practice: [{ problemId, token, statementText, chapterTitle }] (≤5, ProblemFormula-аас) }
     404 → { message: "Томьёо олдсонгүй" }
GET  /formulas/my?studentId=
     «Туулсан тест хүртэлх томьёо»: сурагчийн оролдлого хийсэн (Attempt ба
     шалгалтын session) бодлогуудын ProblemFormula-аар холбогдсон томьёонууд.
     → { totalFormulas, seenFormulas,
         items: [{ slug, title, section, latex, general,
                   firstSeenAt, lastSeenAt, seenCount, correctCount,
                   lastTestTitle }] }   // firstSeenAt өсөхөөр
     STUDENT: өөрийнх (studentId өгвөл үл хэрэгсэнэ). PARENT: verified хүүхэд
     (studentId заавал). TEACHER: өөрийн ангийн сурагч. TEACHER_PLUS/ADMIN: хэн ч.
POST /formulas            (ADMIN, TEACHER_PLUS) A-гийн бүтэн объект → үүсгэнэ
PATCH /formulas/:slug     (ADMIN, TEACHER_PLUS) хэсэгчилсэн засвар
```

T10 нэмнэ:
```
GET  /formulas/review/due?limit=10
     → { dueCount, newCount, cards: [{ slug, title, latex, general, quiz, box, dueAt }] }
       (эхлээд хугацаа нь болсон, дараа нь «туулсан» боловч давтаагүй, эцэст нь CORE шинэ)
POST /formulas/review/:slug  { result: "AGAIN" | "HARD" | "GOOD" | "EASY" }
     → { slug, box, dueAt, streak }
GET  /formulas/review/stats → { mastered, learning, new, reviewedToday, streakDays }
```
<!-- CONTRACT:END -->

---

# ДААЛГАВРУУД

<!-- TASK:T01 -->
## T01: Томьёоны сангийн backend (схем, API, ачаалагч, шалгагч)
**Долгион 1. Салбар:** `codex/s2-T01-formula-api`. **Миграци:** `20260928_01_formula_library`.

**Зорилго.** ЭЕШ-ийн математикийн бүх томьёог нэг бүтэцтэй сан болгох. Одоо
`Formula { id, name @unique, latex?, description? }` ба `ProblemFormula` бий
(content модуль бодлогод томьёог НЭРЭЭР холбодог: `api/src/content/*`,
`seed.cjs setProblemFormulas`). Үүнийг ЭВДЭХГҮЙГЭЭР өргөтгө.

**Хийх:**
1. Схем (зөвхөн нэмэх):
   - `FormulaSection { slug String @id, title, order Int @default(0), icon String?, description String? }`
   - `Formula`-д: `slug String? @unique`, `sectionSlug String?` (relation → FormulaSection, onDelete SetNull),
     `order Int @default(0)`, `level String @default("CORE")`, `grade Int?`,
     `topicSlugs String[] @default([])`, `general String?`, `variants Json?`,
     `conditions Json?`, `explanation String?`, `derivation Json?`, `mnemonic String?`,
     `examples Json?`, `commonMistakes Json?`, `eeshTip String?`,
     `relatedSlugs String[] @default([])`, `keywords String[] @default([])`,
     `widget String?`, `quiz Json?`, `createdAt DateTime @default(now())`,
     `updatedAt DateTime @default(now()) @updatedAt`.
     Index: `sectionSlug`, `level`.
   - `name` нь `@unique` хэвээр. Ачаалахдаа `name = title`.
2. `api/src/formulas/` модуль: `formulas.module.ts`, `formulas.controller.ts`,
   `formulas.service.ts`, `dto/*.ts` (+ spec). D-гийн endpoint-уудыг яг
   гэрээний дагуу хэрэгжүүл. `GET /formulas/my`: Attempt (дасгал) ба шалгалтын
   session/хариултаас (schema-г уншиж зөв хүснэгтийг ол, `STATUS §7.3`, §7.6)
   бодлогын id-г цуглуулж, ProblemFormula-аар томьёо руу. `correctCount` =
   тухайн томьёотой бодлогыг зөв бодсон тоо. Нэг SQL/Prisma groupBy-аар (N+1 биш).
   `/formulas/review/*` замыг T10 нэмнэ. Controller-т `:slug`-ийг `review`-ээс
   ӨМНӨ бүү тавь (маршрутын дараалал): `@Get('review/...')` T10-д зай үлдээ,
   тайлбар бич.
3. Цэвэр модуль `api/src/formulas/formula-schema.ts`: A форматыг шалгах функц
   `validateFormulaFile(json): { errors: string[], warnings: string[] }` (slug
   давтагдашгүй, related байх ёстой, examples ≥ 2, quiz ≥ 2, unicode
   математик тэмдэгтгүй, topicSlugs B жагсаалтаас, widget C жагсаалтаас).
   Бүрэн jest тест.
4. `api/prisma/validate-formulas.cjs [файл...]`: бүх `data/formulas/*.json`-г
   `validateFormulaFile` + KaTeX (`web/node_modules/katex`, байхгүй бол
   `api`-д devDependency) рендерээр шалгана. Алдаатай бол exit 1. CI-д
   залгахыг PR-д санал болго.
5. `api/prisma/seed-formulas.cjs`: анхдагчаар DRY-RUN (тоолж хэвлэнэ);
   `--commit` бол FormulaSection + Formula-г slug-аар upsert (нэр давхцвал
   байгаа мөрт slug оноох). `--only=<section>` сонголт. Идемпотент.
   `import-100x100-v3.cjs`-ийн DATABASE_URL, dotenv, adapter хэв маягийг дагах
   (тэр файлд ХҮРЭХГҮЙ, зөвхөн загвар болгон уншина).
6. Жишээ өгөгдөл: `api/prisma/data/formulas/_example.json` (гэрээний жишээ,
   2 томьёо). Ачаалагч `_`-ээр эхэлсэн файлыг алгасна.
7. Swagger тайлбар (`swagger.ts` хэв маяг). `STATUS.md` §7-д «7.13 Томьёоны сан»
   хэсэг (5–10 мөр) нэм.
8. Тест: service (my-ийн тооцоо, эрх: STUDENT/PARENT verified/unverified 403/
   TEACHER өөр анги 403), DTO validate, schema шалгагч. `npm run smoke`-д
   endpoint нэм (`api/scripts` эсвэл smoke тохиргоог ол).

**Хамрах файл:** `api/prisma/schema.prisma` (зөвхөн Formula, FormulaSection),
`api/prisma/migrations/20260928_01_*`, `api/src/formulas/**` (tagger.ts-ээс бусад),
`api/src/app.module.ts` (1 мөр), `api/src/generated/**`,
`api/prisma/seed-formulas.cjs`, `api/prisma/validate-formulas.cjs`,
`api/prisma/data/formulas/_example.json`, `STATUS.md` (§7.13 л).
<!-- /TASK -->

<!-- TASK:C1 -->
## C1: Томьёоны контент — Тоо ба алгебрийн илэрхийлэл
**Долгион 1. Салбар:** `codex/s2-C1-formulas-numbers-algebra`. **Файл:** `api/prisma/data/formulas/numbers-algebra.json` (зөвхөн энэ).

Гэрээний A форматаар, бүх талбарыг бөглө. **Хамгийн багадаа 38 томьёо.**
Доорх бүгдийг заавал (нэмж болно):
- Хуваагдах шинж: 2, 3, 4, 5, 8, 9, 10, 11, 25. ХИЕХ ба ХБЕХ: $\gcd(a,b)\cdot\operatorname{lcm}(a,b)=ab$. Анхны тоонд задлах. Хуваагчийн тоо: $(k_1+1)(k_2+1)\dots$.
- Үлдэгдэлтэй хуваах $a=bq+r$. Тоон мөчлөг (сүүлийн цифр).
- Энгийн бутархайн үйлдэл, үеэр давтагдах аравтын бутархайг энгийн рүү хувиргах.
- Пропорц, шууд ба урвуу хамаарал. Хувь: хувийг олох, тооноос хувь, $p\%$-иар өсгөх/бууруулах, дараалсан өөрчлөлт, нийлмэл хүү $A=P(1+r)^n$.
- Модулийн тодорхойлолт, $|ab|=|a||b|$, $|a+b|\le|a|+|b|$, $\sqrt{a^2}=|a|$.
- Зэргийн 7 шинж (сөрөг ба бутархай илтгэгч орно), язгуурын 6 шинж, $\sqrt[n]{a^m}=a^{m/n}$, хуваарийг иррационалаас чөлөөлөх (хосмог илэрхийлэл).
- Товчилсон үржвэрийн 7 томьёо: $(a\pm b)^2$, $(a\pm b)^3$, $a^2-b^2$, $a^3\pm b^3$. Мөн $(a+b+c)^2$, $a^2+b^2=(a+b)^2-2ab$, $a^3+b^3=(a+b)^3-3ab(a+b)$.
- Ньютоны бином ба ерөнхий гишүүн $T_{k+1}=C_n^k a^{n-k}b^k$.
- Олон гишүүнт хуваах, Безугийн теорем, Горнерын схем, рационал язгуурын теорем.
- Дундажуудын тэнцэтгэл биш (AM–GM: $\frac{a+b}{2}\ge\sqrt{ab}$), $a+\frac1a\ge2$.
- Логарифмгүй зэргүүдийг харьцуулах арга.

`widget`: `square-of-sum`, `difference-of-squares`, `pascal-triangle` тохирох газарт.
Цээжлэх аргад анхаар: хүүхдүүдийн хэрэглэдэг хэллэг, хэв маяг («квадрат нийлбэр = эхний квадрат, давхар үржвэр, хоёрдахийн квадрат»), алдааны «урхи».
Шалгалт: гэрээний KaTeX шалгагч `ok N err 0`. Товчилсон үржвэр бүрийг санамсаргүй 50 тоогоор Node скриптээр шалгаж, үр дүнг PR-д бич (скриптийг commit хийх шаардлагагүй).
<!-- /TASK -->

<!-- TASK:C2 -->
## C2: Томьёоны контент — Тэгшитгэл ба тэнцэтгэл биш
**Долгион 1. Салбар:** `codex/s2-C2-formulas-equations`. **Файл:** `api/prisma/data/formulas/equations-inequalities.json`.

**Хамгийн багадаа 40 томьёо/дүрэм.** Заавал:
- Шугаман тэгшитгэл $ax=b$ (3 тохиолдол). Квадрат тэгшитгэл: дискриминант, язгуурын томьёо, тэгш коэффициенттэй хувилбар ($D_1=k^2-ac$), бүрэн бус квадрат тэгшитгэлүүд. Виетийн теорем ба урвуу теорем, 3-р зэргийн Виет. $x_1^2+x_2^2$, $\frac1{x_1}+\frac1{x_2}$, $|x_1-x_2|$-г Виетээр илэрхийлэх. Квадрат гурван гишүүнтийг задлах $a(x-x_1)(x-x_2)$.
- Биквадрат ба орлуулгын арга, рационал тэгшитгэл (ТМ, хуваарь тэг биш).
- Интервалын арга (тэмдэг ээлжлэх, тэгш зэргийн язгуур дээр тэмдэг солигдохгүй), бутархай рационал тэнцэтгэл биш. Квадрат тэнцэтгэл биш ба параболын байрлал.
- Модультай: $|f|=a$, $|f|=|g|$, $|f|=g$ (нөхцөл $g\ge0$), $|f|<g \iff -g<f<g$, $|f|>g$, $|f|<|g|\iff f^2<g^2$, интервалаар задлах арга.
- Иррационал: $\sqrt f=g \iff g\ge0,\ f=g^2$. $\sqrt f=\sqrt g$. $\sqrt f<g$, $\sqrt f>g$ (хоёр системийн нэгдэл). Орлуулга.
- Систем: орлуулах, нэмэх арга, Крамерын дүрэм $2\times2$, шийдгүй/төгсгөлгүй олон шийдтэй нөхцөл $\frac{a_1}{a_2}=\frac{b_1}{b_2}\ne\frac{c_1}{c_2}$.
- Параметр: квадрат тэгшитгэлийн язгуурын байрлал (хоёулаа эерэг, $k$-аас их, хэрчимд) нөхцөлүүд. «Цор ганц шийдтэй» нөхцөл.
- Тэнцэтгэл бишийн шинжүүд (сөрөгт үржүүлэхэд тэмдэг эргэх гэх мэт).

`widget`: `quadratic-graph`, `vieta`, `abs-graph`.
Сэдвийн кодууд: `RATEQ`, `RATINEQ`, `ABSEQ`, `ABSINEQ`, `IRREQ`, `IRRINEQ`, `SYSTEM`, `PARAM`.
Жишээ бүрийн хариуг Node-оор шалга (язгуурыг орлуулж).
<!-- /TASK -->

<!-- TASK:C3 -->
## C3: Томьёоны контент — Функц, илтгэгч, логарифм
**Долгион 1. Салбар:** `codex/s2-C3-formulas-exp-log`. **Файл:** `api/prisma/data/formulas/functions-exp-log.json`.

**Хамгийн багадаа 36.** Заавал:
- Функцийн шинж: тодорхойлогдох муж, утгын муж, тэгш/сондгой ($f(-x)=\pm f(x)$), үелэх, монотон. Графикийн хувиргалт: $f(x-a)+b$, $kf(x)$, $f(kx)$, $-f(x)$, $f(-x)$, $|f(x)|$, $f(|x|)$. Урвуу функц. Нийлмэл функц.
- Шугаман функц (налалт $k$, параллел нөхцөл). Квадрат функц: оройн томьёо $x_0=-\frac{b}{2a}$, $y_0=-\frac{D}{4a}$, тэнхлэг, утгын муж, $a$-гийн тэмдэг. Урвуу пропорциональ хамаарал $y=\frac kx$, бутархай шугаман функцийн асимптот.
- Илтгэгч функцийн шинж, $a^{f(x)}=a^{g(x)}\iff f=g$, тэнцэтгэл биш: $a>1$ бол тэмдэг хадгална, $0<a<1$ бол эргэнэ. Нэг суурьт шилжүүлэх, орлуулга $t=a^x>0$.
- Логарифм: тодорхойлолт, үндсэн адилтгал $a^{\log_a b}=b$, $\log_a 1=0$, $\log_a a=1$, үржвэр, ноогдвор, зэрэг, язгуур, суурь шилжүүлэх, $\log_a b\cdot\log_b a=1$, $\log_{a^k}b=\frac1k\log_a b$, $a^{\log_c b}=b^{\log_c a}$, $\lg$, $\ln$. Логарифм тэгшитгэл (ТМ заавал), тэнцэтгэл биш (суурь ба ТМ). Логарифм функцийн шинж ба график.
- Илтгэгч ба логарифмын харьцуулалт, $e$ тоо.

`widget`: `exp-graph`, `log-graph`. Сэдэв: `FUNC`, `EXPEQ`, `EXPINEQ`, `LOGEXP`, `LOGEQ`, `LOGINEQ`.
Логарифмын адилтгал бүрийг санамсаргүй утгаар Node-оор шалга.
<!-- /TASK -->

<!-- TASK:C4 -->
## C4: Томьёоны контент — Тригонометр
**Долгион 1. Салбар:** `codex/s2-C4-formulas-trig`. **Файл:** `api/prisma/data/formulas/trigonometry.json`.

**Хамгийн багадаа 45.** Заавал:
- Радиан ба градус, нумын урт, нэгж тойрог, мөчөөр тэмдэг, үндсэн өнцгүүдийн утгын хүснэгт ($0, \frac\pi6, \frac\pi4, \frac\pi3, \frac\pi2, \pi$, sin/cos/tg/ctg). Хүснэгтийг нэг томьёо болгоод `variants`-т мөр мөрөөр нь бич.
- Үндсэн адилтгал $\sin^2+\cos^2=1$, $\operatorname{tg}\cdot\operatorname{ctg}=1$, $1+\operatorname{tg}^2=\frac1{\cos^2}$, $1+\operatorname{ctg}^2=\frac1{\sin^2}$. Тэгш/сондгой, үе.
- Эргүүлэх томьёо (дүрэм + цээжлэх арга: «$\frac\pi2$, $\frac{3\pi}2$ бол функц солигдоно, тэмдгийг анхны мөчөөр»).
- Нийлбэр/ялгаврын (sin, cos, tg), давхар өнцгийн (cos-ийн 3 хэлбэр), гурвалсан, хагас өнцөг, зэрэг бууруулах, нийлбэрийг үржвэрт, үржвэрийг нийлбэрт, $\operatorname{tg}\frac\alpha2$-аар универсал орлуулга.
- $a\sin x+b\cos x=\sqrt{a^2+b^2}\sin(x+\varphi)$, утгын муж $[-\sqrt{a^2+b^2};\sqrt{a^2+b^2}]$.
- Урвуу функцууд ба утгын муж, $\arcsin(-a)=-\arcsin a$, $\arccos(-a)=\pi-\arccos a$.
- Энгийн тэгшитгэлүүд: $\sin x=a$, $\cos x=a$, $\operatorname{tg}x=a$ ерөнхий шийд ба тусгай тохиолдлууд ($0, \pm1$). Тэнцэтгэл биш нэгж тойргоор.
- $y=A\sin(\omega x+\varphi)$: далайц, үе $T=\frac{2\pi}{|\omega|}$.
- Синусын теорем ($=2R$), косинусын теорем, гурвалжны талбай $\frac12ab\sin C$ (C7-той давхцаж болно: энд тригонометрийн өнцгөөс бич, slug `trig-`-ээр эхэл).

`widget`: `unit-circle`, `sine-graph`. Сэдэв: `TRIG`, `TRIGEQ`.
Адилтгал бүрийг санамсаргүй 50 өнцгөөр Node-оор шалга (`Math.sin` …).
<!-- /TASK -->

<!-- TASK:C5 -->
## C5: Томьёоны контент — Прогресс, комбинаторик, магадлал, статистик
**Долгион 1. Салбар:** `codex/s2-C5-formulas-seq-comb-prob`. **Файл:** `api/prisma/data/formulas/sequences-combinatorics-probability.json`.

**Хамгийн багадаа 36.** Заавал:
- Арифметик прогресс: $a_n$, $S_n$ (2 хэлбэр), $a_n=\frac{a_{n-1}+a_{n+1}}2$, $a_m+a_n=a_k+a_l$ ($m+n=k+l$), ялгавар олох.
- Геометр прогресс: $b_n$, $S_n$, $b_n^2=b_{n-1}b_{n+1}$, хязгааргүй буурах $S=\frac{b_1}{1-q}$ ($|q|<1$), үеэр давтагдах бутархай.
- Нийлбэрүүд: $1+2+\dots+n$, $1^2+\dots+n^2$, $1^3+\dots+n^3$, сондгой тоонуудын нийлбэр.
- Комбинаторик: нэмэх ба үржүүлэх зарчим, факториал, сэлгэмэл $P_n=n!$, байрлал $A_n^k$, хэсэглэл $C_n^k$, $C_n^k=C_n^{n-k}$, $C_n^k+C_n^{k+1}=C_{n+1}^{k+1}$, $\sum C_n^k=2^n$, давталттай сэлгэмэл $\frac{n!}{n_1!n_2!\dots}$, давталттай байрлал $n^k$, тойрог дээр суулгах $(n-1)!$.
- Магадлал: сонгодог тодорхойлолт, $P(\bar A)=1-P(A)$, үл нийцэх ба нийцэх үзэгдлийн нэмэх, хамааралгүйн үржүүлэх, нөхцөлт магадлал, бүтэн магадлал, Бернуллийн томьёо, «ядаж нэг» арга, геометр магадлал.
- Статистик: арифметик дундаж, жигнэсэн дундаж, медиан, моод, далайц, дисперс ($\overline{x^2}-\bar x^2$ хэлбэр), стандарт хазайлт, математик дундаж $E(X)$.

`widget`: `arith-seq`, `geom-seq`, `pascal-triangle`, `probability-dice`. Сэдэв: `SEQ`, `COMB`, `PROB`, `STAT`.
Комбинаторикийн жишээг Node-оор тоолж (brute force) шалга.
<!-- /TASK -->

<!-- TASK:C6 -->
## C6: Томьёоны контент — Хязгаар, уламжлал, интеграл
**Долгион 1. Салбар:** `codex/s2-C6-formulas-calculus`. **Файл:** `api/prisma/data/formulas/calculus.json`.

**Хамгийн багадаа 36.** Заавал:
- Хязгаар: $\frac00$ задлах (үржигдэхүүнд задлах, хосмог), $\frac\infty\infty$ (хамгийн их зэрэгт хуваах), $\lim\frac{\sin x}x=1$, $\lim(1+\frac1n)^n=e$.
- Уламжлал: тодорхойлолт, хүснэгт (тогтмол, $x^n$, $\sqrt x$, $\frac1x$, $e^x$, $a^x$, $\ln x$, $\log_a x$, $\sin$, $\cos$, $\operatorname{tg}$, $\operatorname{ctg}$), нийлбэр, тогтмол үржигдэхүүн, үржвэр, ноогдвор, давхар функц $(f(g(x)))'$.
- Шүргэгчийн тэгшитгэл $y=f(x_0)+f'(x_0)(x-x_0)$, налалт $=f'(x_0)=\operatorname{tg}\alpha$, физик утга (хурд, хурдатгал).
- Монотон байх нөхцөл, критик цэг, экстремумын шаардлагатай ба хүрэлцээтэй нөхцөл, хэрчим дээрх хамгийн их ба бага утга (алгоритм), хоёрдугаар уламжлал: хотгор, гүдгэр, нугаралт.
- Эх функц: хүснэгт, шинжүүд, $\int f(kx+b)\,dx=\frac1kF(kx+b)+C$.
- Тодорхой интеграл: Ньютон–Лейбниц, шинжүүд, муруй шугаман трапецын талбай, хоёр муруйн хоорондох талбай, эргэлтийн биеийн эзлэхүүн $V=\pi\int_a^b f^2(x)\,dx$.

`widget`: `derivative-tangent`, `integral-area`. Сэдэв: `LIMIT`, `DERIV`, `INTEG`.
Уламжлал/интегралын жишээг тоон аргаар (ялгаврын харьцаа, Симпсон) Node-оор шалга.
<!-- /TASK -->

<!-- TASK:C7 -->
## C7: Томьёоны контент — Хавтгайн геометр
**Долгион 1. Салбар:** `codex/s2-C7-formulas-plane-geometry`. **Файл:** `api/prisma/data/formulas/plane-geometry.json`.

**Хамгийн багадаа 45.** Заавал:
- Өнцөг: босоо, зэргэлдээ, параллел шулуун ба огтлогчийн өнцгүүд. Гурвалжин: өнцгийн нийлбэр, гадаад өнцөг, гурвалжны тэнцэтгэл биш, тэнцүү ба төсөөтэй гурвалжны шинж, төсөөтэй дүрсийн талбайн харьцаа $k^2$, эзэлхүүний харьцаа $k^3$ (C8-д ч бий).
- Талбай: $\frac12ah$, $\frac12ab\sin C$, Герон, $S=pr$, $S=\frac{abc}{4R}$, тэгш талт $\frac{a^2\sqrt3}4$.
- Тэгш өнцөгт гурвалжин: Пифагор, катет ба гипотенуз дахь проекц ($h^2=pq$, $a^2=cp$), $30^\circ$-ын эсрэг катет, багтсан ба багтаасан тойргийн радиус ($r=\frac{a+b-c}2$, $R=\frac c2$).
- Медиан (урт $m_a=\frac12\sqrt{2b^2+2c^2-a^2}$, $2:1$), биссектрис (шинж $\frac{a_1}{a_2}=\frac bc$, урт), өндөр, дундаж шугам, Фалес.
- Дөрвөн өнцөгт: параллелограмм (шинж, $d_1^2+d_2^2=2(a^2+b^2)$, талбай 2 хэлбэр), тэгш өнцөгт, ромб ($\frac{d_1d_2}2$), квадрат, трапец (талбай, дундаж шугам, тэгш хажуут трапецын шинж), дөрвөн өнцөгт $\frac12d_1d_2\sin\varphi$.
- Олон өнцөгт: дотоод өнцгийн нийлбэр $(n-2)\cdot180^\circ$, гадаад өнцгийн нийлбэр, зөв олон өнцөгтийн $R$, $r$, диагоналийн тоо $\frac{n(n-3)}2$.
- Тойрог: урт, талбай, нумын урт, секторын талбай, сегмент, төв ба багтсан өнцөг, диаметр дээр тулсан өнцөг, шүргэгч ба радиус, нэг цэгээс татсан шүргэгчүүд тэнцүү, хөвчүүдийн огтлолцлын үржвэр, шүргэгч ба огтлогч ($t^2=ab$), багтсан дөрвөн өнцөгт ($\alpha+\gamma=180^\circ$), багтаасан дөрвөн өнцөгт ($a+c=b+d$).

`widget`: `pythagoras`, `triangle-area`, `inscribed-angle`, `circle-sector`. Сэдэв: `PLANE`.
Талбайн томьёонуудыг координатын аргаар санамсаргүй гурвалжнаар Node-оор шалга.
<!-- /TASK -->

<!-- TASK:C8 -->
## C8: Томьёоны контент — Огторгуйн геометр, вектор, координат
**Долгион 1. Салбар:** `codex/s2-C8-formulas-solid-vector-coord`. **Файл:** `api/prisma/data/formulas/solid-geometry-vectors-coordinates.json`.

**Хамгийн багадаа 40.** Заавал:
- Призм (хажуу ба бүтэн гадаргуу, $V=Sh$), тэгш өнцөгт параллелепипед ($d^2=a^2+b^2+c^2$, $V=abc$), куб, пирамид ($V=\frac13Sh$, зөв пирамидын апофем, хажуу гадаргуу $\frac12Pl$), тайрмал пирамид $V=\frac h3(S_1+S_2+\sqrt{S_1S_2})$, цилиндр, конус, тайрмал конус, бөмбөрцөг ($V=\frac43\pi R^3$, $S=4\pi R^2$), бөмбөрцгийн хэсэг ($V=\pi h^2(R-\frac h3)$), огтлол, төсөөтэй биеийн эзлэхүүний харьцаа $k^3$. Шулуун ба хавтгайн хоорондох өнцөг, гурван перпендикулярын теорем.
- Вектор: координат, урт, нэмэх (гурвалжин, параллелограмм), тоогоор үржүүлэх, коллинеар нөхцөл, скаляр үржвэр 2 хэлбэр, өнцөг, перпендикуляр нөхцөл, проекц.
- Хавтгайн координат: хоёр цэгийн зай, хэрчмийн дундаж цэг, $\lambda$ харьцаагаар хуваах, шулууны тэгшитгэл ($y=kx+b$, хоёр цэгээр, ерөнхий $Ax+By+C=0$), налалт $k=\frac{y_2-y_1}{x_2-x_1}$, параллел ($k_1=k_2$) ба перпендикуляр ($k_1k_2=-1$), цэгээс шулуун хүртэлх зай, тойргийн тэгшитгэл, параболын орой.
- Огторгуйн координат: зай, дундаж цэг, хавтгайн тэгшитгэл, бөмбөрцгийн тэгшитгэл (ЭЕШ-д бага гардаг бол `level: "EXTRA"`).

`widget`: `prism-volume`, `cone-cylinder`, `vector-add`, `line-slope`. Сэдэв: `SOLID`, `VECTOR`, `COORD`.
Эзлэхүүн, зайны жишээг Node-оор шалга.
<!-- /TASK -->

<!-- TASK:T09 -->
## T09: Томьёоны сангийн вэб (жагсаалт, дэлгэрэнгүй, «Миний туулсан», хуудас хэвлэх)
**Долгион 2** (суурь салбараас. T01 аль хэдийн нэгтгэгдсэн, 167299f). **Салбар:** `codex/s2-T09-formula-web`.

**Зорилго.** Сурагч 3 янзаар ашиглана: (1) «Бүх томьёо»: бүх бүлгийн ерөнхий
хэлбэрийг нэг дороос харах, хайх; (2) «Миний туулсан»: хийсэн тестүүддээ
таарсан томьёонууд цаг хугацааны дарааллаар, хэр сайн эзэмшсэн нь; (3) томьёо
бүрийн дэлгэрэнгүй: тайлбар, яагаад ийм болдог, цээжлэх арга, алхамтай жишээ,
түгээмэл алдаа, ЭЕШ-ийн зөвлөгөө, дасгал бодлого.

**Хуудаснууд:**
1. `/app/formulas` (`web/src/app/app/formulas/page.tsx` + `FormulasClient.tsx`):
   - Толгой: «Томьёоны сан» + тоо («312 томьёо, 8 бүлэг»). Хайлтын талбар
     (debounce 250ms, `?q=` URL-д). Шүүлтүүр: level (Бүгд / ЭЕШ-ийн гол / Нэмэлт),
     анги (7–12).
   - Tabs (kit): «Бүх томьёо» | «Миний туулсан» | «Цээжлэх» (/app/formulas/review
     руу холбоос, T10 хийнэ).
   - «Бүх томьёо»: бүлэг бүр өнгөт chunky хэсэг (бүлэг бүрт өөр accent токен),
     бүлгийн дүрс (lucide, `section.icon`-ийг зөвхөн зөвшөөрсөн нэрсийн map-аар),
     дотор нь томьёоны карт `chunky chunky-press`: гарчиг + `general`-ийг
     MathText display. Карт дээр дарахад дэлгэрэнгүй рүү. Бүлгийг эвхэх боломжтой.
     Утсан дээр 1 багана, md: 2, xl: 3.
   - «Миний туулсан»: `GET /formulas/my`. Дээд хэсэгт явцын мөр
     «Тестүүддээ 48/312 томьёотой таарсан», Progress. Жагсаалт огноогоор бүлэглэсэн
     (өнөөдөр / энэ долоо хоног / өмнө). Карт бүрт эзэмшлийн шошго
     (`correctCount/seenCount`: 80%+ «Эзэмшсэн» success, 50–80 «Сайжирч байна»
     warning, <50 «Давтах хэрэгтэй» error) ба «Сүүлд: <тестийн нэр>» (Meta).
     Хоосон төлөв: «Тест өгөх тусам энд томьёо нэмэгдэнэ» + /app/tests руу товч.
   - Эцэг эх: `?studentId=` дамжуулж хүүхдийнхийг харах (parent хуудас руу
     холбоосыг PR-д санал болго, parent/page.tsx-д бүү хүр).
2. `/app/formulas/[slug]` (`page.tsx` + `FormulaDetailClient.tsx`):
   - Hero: гарчиг, бүлгийн badge, level/grade badge, `latex`-ийг том display.
     «Ерөнхий хэлбэр» (`general`), `variants` жагсаалт, `conditions` (анхааруулгын
     хайрцаг, lucide `triangle-alert`).
   - Хэсгүүд (chunky карт тус бүр): «Энгийнээр» (explanation), «Яагаад ийм
     болдог вэ» (derivation алхмууд: алхам бүр товшиход дараагийнх нээгдэнэ,
     «Бүгдийг харах» товч), «Цээжлэх арга» (mnemonic, lucide `brain`),
     «Жишээ» (жишээ бүр: бодлого → «Эхлээд өөрөө бодоод үз» → «Алхам харах»
     товчоор нэг нэгээр → хариу), «Түгээмэл алдаа» (commonMistakes),
     «ЭЕШ-д» (eeshTip), «Холбоотой томьёо» (related chip-ууд), «Дасгал»
     (practice бодлогууд `/app/practice?problem=<id>` эсвэл одоо байгаа
     дасгалын замаар: практикийн маршрутыг уншиж зөвийг ол).
   - `widget` байвал `web/src/components/formulas/widgets/index.ts`-ийн
     `FORMULA_WIDGETS[widget]`-ийг рендерлэ. Энэ файлыг ЧИ `export const
     FORMULA_WIDGETS: Record<string, React.ComponentType> = {};` гэж үүсгэнэ,
     T21 дүүргэнэ. Байхгүй бол юу ч харуулахгүй.
   - «Хуулах» (LaTeX-ийг clipboard руу), «Хэвлэх».
3. `/app/formulas/print?section=`: A4 хэвлэх «шпаргалка» хуудас: бүлэг бүрийн
   гарчиг + `general` 2 баганаар, зөвхөн CORE. `@media print` (энэ хуудсанд л
   хамаарах CSS module эсвэл Tailwind `print:` утилит, globals.css-д БҮҮ хүр).
4. Бүрэлдэхүүн: `web/src/components/formulas/*` (FormulaCard, SectionBlock,
   MasteryBadge, StepReveal, FormulaSearch). `FormulaOfTheDay.tsx`: өдрийн
   томьёо (огноогоор детерминист сонголт, `/formulas?level=CORE`-оос),
   самбарт залгах компонент. Хаана залгахыг PR-д бич.
5. Гүйцэтгэл: `/formulas` жагсаалтыг нэг удаа ачаалж клиент талд шүүнэ (300
   мөр жижиг). KaTeX рендерийг `React.memo`-оор. Жагсаалтад LaTeX олон тул
   эхний 30-аас хойшхыг `content-visibility:auto`-оор.
6. e2e: mock (`/formulas/sections`, `/formulas`, `/formulas/my`,
   `/formulas/<slug>`) + journey: хайх → дэлгэрэнгүй → алхам нээх.
   375px дээр хэвтээ гүйлгэлтгүй.
7. `/app/formulas` маршрутыг STUDENT, PARENT, TEACHER, TEACHER_PLUS, ADMIN бүгд
   үзнэ. Цэсэнд нэмэхийг PR-д бич (санал: бүлэг «Сургалт», дүрс `sigma`).

**Хамрах файл:** `web/src/app/app/formulas/**` (review/-аас бусад),
`web/src/components/formulas/**` (widgets/ доторх зөвхөн index.ts-ийг үүсгэнэ,
review/-аас бусад), `e2e/tests/*`.
<!-- /TASK -->

<!-- TASK:T10 -->
## T10: Томьёо цээжлэх горим: зайтай давталт + тоглоом
**Долгион 2** (суурь салбараас. T01 аль хэдийн нэгтгэгдсэн, 167299f). **Салбар:** `codex/s2-T10-formula-review`. **Миграци:** `20260928_02_formula_review`.

**Судалгааны үндэслэл (PR-д товч бич):** зайтай давталт (spacing effect),
санаанаас гаргах дасгал (retrieval practice / testing effect), холимог
давталт (interleaving). Leitner хайрцаг хүүхдэд ойлгомжтой.

**Backend:**
1. `FormulaReview { userId, formulaId, box Int @default(0), dueAt DateTime,
   lastResult String?, streak Int @default(0), reviewCount Int @default(0),
   lapses Int @default(0), updatedAt @updatedAt; @@id([userId, formulaId]);
   @@index([userId, dueAt]) }` ба `FormulaReviewDay { userId, day (Date, UTC+8
   өдөр), count; @@id([userId, day]) }` (streak тооцоонд).
2. Цэвэр модуль `api/src/formulas/review-scheduler.ts`: box 0..5, интервал
   [0, 1, 2, 4, 8, 16, 32] хоног. AGAIN → box 1, маргааш. HARD → box хэвээр,
   интервалын хагас. GOOD → +1. EASY → +2. Цагийн бүс: Азия/Улаанбаатар
   (STATUS §8.9-ийн урхийг унш). 100% тесттэй (хил, цагийн бүс).
3. Endpoint-ууд гэрээний D-гийн дагуу (`formulas.controller.ts`-д `review/*`
   маршрутуудыг `:slug`-ээс ӨМНӨ нэм, эсвэл тусдаа `formula-review.controller.ts`,
   зам `formulas/review`: маршрутын дараалал зөв эсэхийг тестээр батал).
   Бүх role өөрийнхөө төлөө ашиглана.

**Web** (`/app/formulas/review`, `web/src/components/formulas/review/**`):
1. Нүүр: өнөөдрийн карт (dueCount + newCount), streak (lucide `flame`),
   «Эхлэх» том btn-3d товч. Статистик: эзэмшсэн / сурч байгаа / шинэ.
2. Сесс (10 карт, холимог бүлэг): 4 төрлийн дасгалыг ээлжлүүл:
   - **Флэш карт:** урд тал нь гарчиг ба `\square`-тай томьёо. Товшиход 3D
     эргэнэ (CSS `transform: rotateY`, `prefers-reduced-motion`-д fade).
     Ар тал нь бүтэн томьёо. 4 товч: «Дахиад» / «Хэцүү» / «Зөв» / «Амархан».
   - **Нөхөх (blank):** `quiz.type=blank`: 4 сонголт (answer + distractors
     холино), зөв/буруу шууд хариу, буруу бол зөвийг ногооноор.
   - **Үнэн/худал:** `truefalse` + `why`.
   - **Хос тааруулах:** 4 томьёоны гарчиг ↔ 4 томьёо (сонгож холбох, 44px).
   Хариу бүр POST хийгдэнэ (optimistic, алдаа гарвал toast + дахин оролдох).
3. Төгсгөл: «10/10 давтлаа», хугацаа, хамгийн хэцүү 3 томьёо (дэлгэрэнгүй рүү
   холбоос), confetti-гүй (emoji хориотой), зөвхөн lucide + chunky анимаци.
4. Гарын товч: Space = эргүүлэх, 1–4 = үнэлгээ (desktop).
5. `ReviewDueCard.tsx`: самбарт залгах жижиг карт («Өнөөдөр 7 томьёо давтах»).
6. e2e mock + journey (карт эргүүлэх → үнэлэх → POST бие шалгах).

**Хамрах файл:** schema (FormulaReview*), миграци 02,
`api/src/formulas/review-scheduler.ts`, `formula-review.*`, `formulas.module.ts`
(бүртгэл), `web/src/app/app/formulas/review/**`,
`web/src/components/formulas/review/**`, `e2e/tests/*`.
<!-- /TASK -->

<!-- TASK:T11 -->
## T11: 6125 бодлогыг томьёотой автоматаар холбох
**Долгион 2** (суурь салбараас. T01 аль хэдийн нэгтгэгдсэн, 167299f). **Салбар:** `codex/s2-T11-problem-formula-tagger`.

«Туулсан тест хүртэлх томьёо» нь `ProblemFormula` холбоос дээр тулгуурладаг.
Одоо холбоос бараг хоосон. Бодлого бүрт 1–4 томьёо оноо.

1. Цэвэр модуль `api/src/formulas/tagger.ts`: оролт = бодлого
   (`statementText`, `choices`, бүлгийн нэр, `ProblemAnalysis.topic/formulas/methods`
   байвал), томьёоны жагсаалт (slug, topicSlugs, keywords). Гаралт =
   `[{ slug, score, reasons[] }]`. Дүрмүүд:
   - Сэдвийн код (бүлгийн нэр, 100V3 token-ий сэдэв: `100V3-LOGEQ-…`) → тухайн
     сэдвийн CORE томьёонууд руу жин.
   - LaTeX-ийн хэв маяг: `\log_` → логарифмын шинж, `\sqrt` + `=` → иррационал
     тэгшитгэл, `|x` → модуль, `\sin|\cos|\operatorname{tg}` → тригонометр,
     `x^2` + `=0` → квадрат тэгшитгэл/Виет, `a_n|S_n` → прогресс, `C_n^k|A_n^k|!`
     → комбинаторик, `\int` → интеграл, `f'(` → уламжлал, гэх мэт. 60-аас
     доошгүй дүрэм, дүрэм бүр тайлбартай.
   - `ProblemAnalysis.formulas` (Json) байвал хамгийн их жин.
   - Босго (0.5) ба дээд тал нь 4 томьёо.
   Jest: 40-өөс доошгүй бодит хэлбэрийн (зохиомол) бодлогоор тест.
2. `api/prisma/tag-problem-formulas.cjs`: DRY-RUN анхдагч. Тайлан: хэдэн бодлогод
   хэдэн томьёо, томьёо бүрийн тоо, холбогдоогүй бодлогын тоо ба сэдвээр нь
   задаргаа, 30 санамсаргүй жишээ (token + slug-ууд + шалтгаан). `--commit`:
   `ProblemFormula` createMany skipDuplicates (гараар оноосныг устгахгүй).
   `--only-book=100V3`. Тайлангийн жишээ гаралтыг
   `docs/qa/formula-tagging-sample.md`-д (зохиомол ӨС дээр ажиллуулсан) хадгал.
3. Шинэ бодлого үүсэх/засагдахад (content.service) автоматаар таглах hook-ийг
   санал болго (PR-д). Content модульд өөрөө бүү хүр.

**Хамрах файл:** `api/src/formulas/tagger.ts`, `tagger.spec.ts`,
`api/prisma/tag-problem-formulas.cjs`, `docs/qa/formula-tagging-sample.md`.
<!-- /TASK -->

<!-- TASK:T12 -->
## T12: «Алдааны дэвтэр»: хүүхдэд хамгийн хэрэгтэй ганц зүйл
**Долгион 1. Салбар:** `codex/s2-T12-mistake-notebook`. **Миграци:** `20260928_03_mistake_notebook`.

**Яагаад хамгийн чухал вэ (PR-д судалгаагаар дэлгэрүүл):** ЭЕШ-ийн оноо
өсгөх хамгийн хурдан зам нь шинэ бодлого биш, **өөрийн алдаан дээр ажиллах**.
Алдаагаа ангилж, зөв аргыг харж, зайтай давтан дахин бодох нь (error-driven
learning + retrieval + spacing) сургалтын төвүүдийн «алдааны дэвтэр»-ийн
дижитал хувилбар. Одоо сурагч тест өгөөд дүнгээ хардаг ч алдаа нь алга болдог.

**Backend** (`api/src/mistakes/**`):
1. Схем: `MistakeEntry { id, userId, problemId, source String ("PRACTICE" |
   "TEST"), sourceRefId String?, testTitle String?, givenAnswer String?,
   status String @default("NEW") ("NEW" | "RETRYING" | "MASTERED"),
   retryCount Int @default(0), consecutiveCorrect Int @default(0),
   lastRetryAt DateTime?, nextRetryAt DateTime?, reason String?
   ("CALC" | "CONCEPT" | "FORMULA" | "READING" | "TIME" | "UNKNOWN"),
   note String?, createdAt, updatedAt; @@unique([userId, problemId]);
   @@index([userId, status, nextRetryAt]) }`.
2. Цуглуулах: оролдлого буруу болоход (дасгал: `attempts` модуль, тест:
   шалгалт илгээх үед: `tests` модулийг уншиж хаана дүгнэгддэгийг ол)
   MistakeEntry-г upsert (буруу дахин гарвал MASTERED → RETRYING). Холбогдох
   service-т ганц мөрийн дуудлага + тусдаа `MistakeCollector` service
   (алдаа гарвал үндсэн урсгалыг эвдэхгүй: try/catch + log). Одоо байгаа
   өгөгдлөөс нөхөх `api/prisma/backfill-mistakes.cjs` (DRY-RUN анхдагч).
3. Endpoint-ууд:
   - `GET /mistakes/my?status=&topic=&source=` → `{ counts: {NEW, RETRYING, MASTERED},
     byTopic: [{topic, count}], items: [{ id, problem: {id, statementText, choices,
     format, imageKey}, givenAnswer, status, reason, note, testTitle, createdAt,
     nextRetryAt, formulas: [{slug, title, latex}] }] }`. Зөв хариуг ЗӨВХӨН дахин
     бодож үзсэний дараа эсвэл MASTERED бол буцаана (хуурахаас сэргийлэх).
   - `POST /mistakes/:id/retry { answer }` → одоо байгаа `tests/grading.ts`-ээр
     дүгнэж `{ correct, correctAnswer, status, nextRetryAt, solutionOutline? }`.
     Эзэмших дүрэм: **өөр өдрүүдэд** 2 удаа дараалан зөв бол MASTERED.
     nextRetryAt: 1, 3, 7 хоног.
   - `PATCH /mistakes/:id { reason?, note? }` (note ≤ 500).
   - `GET /mistakes/today` → өнөөдөр давтах ≤5 (самбарын виджетэд).
   - `GET /mistakes/student/:studentId` (TEACHER өөрийн анги, PARENT verified,
     ADMIN): зөвхөн тоо, сэдвийн задаргаа, хамгийн их алддаг 5 сэдэв.
   - Формулын холбоос: `ProblemFormula`-аас (T01/T11 байхгүй үед хоосон массив).
4. Тест: цуглуулагч (давхардалгүй), эзэмших дүрэм (нэг өдөрт 2 зөв → MASTERED
   БИШ), эрх (өөр хүний entry → 403/404), хариу нууцлал.

**Web** (`/app/mistakes`, `web/src/components/mistakes/**`):
1. Толгой: «Алдааны дэвтэр», 3 тоо (Шинэ / Давтаж байна / Эзэмшсэн) өнгөт
   chunky хавтангаар, «Өнөөдөр 5 алдаа давтах» btn-3d.
2. Шүүлтүүр: сэдэв (chip), төлөв (Tabs), эх үүсвэр.
3. Карт: бодлого (MathText, зураг `imageKey` байвал), «Чиний хариулт: C»,
   шалтгаан сонгох (6 chip: Бодолтын алдаа / Ойлголт / Томьёо мартсан /
   Буруу уншсан / Цаг дууссан / Мэдэхгүй: хүүхэд өөрөө тэмдэглэнэ:
   метакогниц), тэмдэглэл, «Дахин бодох» → сонголт/хариу оруулах → зөв бол
   ногоон анимаци, буруу бол зөв хариу + шийдлийн тойм, «Хэрэгтэй томьёо»
   chip-ууд `/app/formulas/<slug>` руу (T09 байхгүй бол ч холбоос хэвээр).
4. «Давтлагын сесс» горим: өнөөдрийн ≤5 алдааг дараалан, эцэст нь дүн.
5. `MistakesTodayCard.tsx`: самбарт залгах карт. `TopicWeaknessList.tsx`:
   багш/эцэг эхийн хуудсанд залгах сэдвийн сул талын жагсаалт.
6. e2e mock + journey (шалтгаан сонгох → дахин бодох → POST бие).

**Хамрах файл:** schema (MistakeEntry), миграци 03, `api/src/mistakes/**`,
`app.module.ts` (1 мөр), attempts/tests service-т ЗӨВХӨН collector дуудах
мөр, `api/prisma/backfill-mistakes.cjs`, `web/src/app/app/mistakes/**`,
`web/src/components/mistakes/**`, `e2e/tests/*`.
<!-- /TASK -->

<!-- TASK:T13 -->
## T13: ЭЕШ-ийн бэлэн байдлын индекс ба зорилго
**Долгион 2** (суурь салбараас. T01 аль хэдийн нэгтгэгдсэн, 167299f). **Салбар:** `codex/s2-T13-readiness`. **Миграци (хэрэгтэй бол):** `20260928_05_readiness_snapshot`.

Эхлээд `api/src/goals`, `api/src/insights`, `api/src/progress`, `api/src/recommend`
болон `web/src/app/app/goals`, `insights`-ийг уншиж ОДОО БАЙГААГ давхардуулахгүй.
Өргөтгөнө.

1. Цэвэр модуль `readiness.ts`: сэдэв бүрийн эзэмшил (сүүлийн 60 хоногийн
   оролдлого, хуучин нь бага жинтэй, Байесийн сглажлалт: `(correct+2)/(total+4)`),
   ЭЕШ-ийн сэдвийн жин (тохиргооны хүснэгт `readiness-weights.ts`: тайлбартай,
   эзэн засна), нийт индекс 0–100, итгэлийн муж (өгөгдөл бага бол өргөн).
   **Хуурамч нарийвчлал бүү харуул**: «~62 (55–70)» хэлбэрээр. ЭЕШ-ийн 800
   онооны хөрвүүлэлтийг ХИЙХГҮЙ (албан хөрвүүлэлт тогтмол биш), оронд нь
   «Бэлэн байдал».
2. `GET /readiness/my`, `GET /readiness/student/:id` (эрхийн дүрмээр):
   `{ index, low, high, dataPoints, topics: [{ topic, title, mastery, weight,
   attempts, trend: "UP"|"DOWN"|"FLAT" }], nextBestTopics: [3],
   weeklyHistory: [{week, index}] }`.
   Долоо хоногийн түүхийг snapshot хүснэгтэд (эсвэл тооцоолж) хадгал.
3. Web: `/app/readiness` хуудас: том дугуй индикатор (SVG, токен өнгө),
   сэдвүүдийн «дулааны зураг» (хүчтэй/сул), «Дараагийн алхам» 3 карт (сэдэв →
   дасгал / томьёо / алдааны дэвтэр рүү), 8 долоо хоногийн шугаман график
   (гараар SVG, шинэ chart сан НЭМЭХГҮЙ, эсвэл байгаа сан ашигла:
   package.json-г шалга). Зорилго (goals модуль байгаа бол) тавих хэсэг.
4. `ReadinessMiniCard.tsx` самбарт залгах компонент.
5. Тест + e2e.

**Хамрах файл:** `api/src/readiness/**`, миграци 05 (хэрэгтэй бол),
`web/src/app/app/readiness/**`, `web/src/components/readiness/**`, `e2e/tests/*`.
<!-- /TASK -->

<!-- TASK:T14 -->
## T14: Сануулга ба эцэг эхийн долоо хоногийн тайлан (үнэгүй cron)
**Долгион 1. Салбар:** `codex/s2-T14-reminders-reports`. **Миграци:** `20260928_04_reminders_reports`.

Мөнгө төлөхгүй: cron-ыг **GitHub Actions schedule** (нийтийн репод үнэгүй)
эсвэл UptimeRobot-оос `POST /jobs/run?name=` руу `X-Cron-Secret` header-тэй
дуудна. Workflow файлыг `.github/workflows`-д БҮҮ нэм. `docs/CRON-SETUP.md`-д
бэлэн YAML ба UptimeRobot-ийн алхмыг бич (эзэн нэмнэ).

1. `api/src/jobs/**`: `JobsController` (`@Public` маягаар JWT-гүй, гэхдээ
   `CRON_SECRET` env-тэй constant-time харьцуулалт. env байхгүй бол 503),
   ажлын бүртгэл. `JobRun { id, name, startedAt, finishedAt, ok, summary Json }`
   (давхар ажиллуулахаас сэргийлэх: 10 минутын lock).
2. Ажлууд (идемпотент, `NotificationDelivery`/`sentKey` маягаар нэг сануулгыг
   хоёр удаа бүү илгээ):
   - `payment-due`: `tuition` paid-until 3 хоногийн дотор дуусах сурагч ба
     эцэг эхэд мэдэгдлийн төв (`notification-center` модуль) + SMTP тохируулсан бол
     имэйл. Текст эелдэг, товч.
   - `homework-due`: маргааш хугацаа дуусах даалгавар.
   - `mistakes-review`: 3+ хоног давтаагүй MistakeEntry-тэй сурагчид (T12-ийн
     хүснэгт байхгүй бол алгас: Prisma model байгаа эсэхийг runtime-д шалга).
   - `parent-weekly`: Ням гараг бүр 20:00 (UTC+8) эцэг эх бүрт хүүхэд бүрийн
     долоо хоногийн тайлан: ирц (ирсэн/тасалсан), өгсөн тест ба дүн, дасгалын тоо,
     даалгавар (хийсэн/хийгээгүй), хамгийн сайн ба сул сэдэв, дараа долоо хоногийн
     хуваарь. In-app мэдэгдэл + имэйл (HTML загвар, inline style, токеноос
     авсан hex-ийг ЗӨВХӨН имэйлийн загварт зөвшөөрнө, тайлбар бич).
3. `GET /parents/weekly-report?studentId=&week=` (PARENT verified, ADMIN) →
   тайлангийн JSON. Web `/app/parent/weekly` (`web/src/app/app/parent/weekly/**`,
   parent/page.tsx-д БҮҮ хүр): 7 хоногийн сонголт, хүүхэд сонголт, картууд.
   Хэвлэх боломжтой.
4. Хэрэглэгчийн тохиргоо: `NotificationPreference { userId @id, emailWeekly
   Boolean @default(true), emailReminders Boolean @default(true) }` +
   `/app/notifications`-ийн хажууд `/app/notifications/settings` хуудас.
5. Тест: давхар илгээхгүй, цагийн бүс (Ням 20:00 UTC+8), secret буруу 401,
   эрх.

**Хамрах файл:** `api/src/jobs/**`, `api/src/reports/**`, миграци 04, schema
(JobRun, NotificationPreference, sentKey хүснэгт), `app.module.ts` (1 мөр),
`web/src/app/app/parent/weekly/**`, `web/src/app/app/notifications/settings/**`,
`web/src/components/reports/**`, `docs/CRON-SETUP.md`, `render.yaml`
(`CRON_SECRET` env мөр л), `e2e/tests/*`.
<!-- /TASK -->

<!-- TASK:T15 -->
## T15: PWA: утсанд суулгах, томьёог офлайн харах
**Долгион 1. Салбар:** `codex/s2-T15-pwa`.

1. `web/src/app/manifest.ts` (Next 16-ийн metadata route: docs-оос шалга):
   нэр «Pi.mn», short_name, theme/background өнгө токенд тохирсон hex (зөвхөн
   manifest-д), дүрсүүд 192/512/maskable (`web/public/icons/`-д PNG, одоо байгаа
   логоноос `sharp`-гүйгээр үүсгэж чадахгүй бол SVG-ээс Node скриптээр үүсгэж
   commit хий).
2. Service worker `web/public/sw.js` (гараар, сан нэмэхгүй): app shell cache,
   `GET` API хариуг зөвхөн `/formulas*` замд stale-while-revalidate (өөр API-г
   КЭШЛЭХГҮЙ: хувийн мэдээлэл), офлайн fallback хуудас `/offline`.
   Бүртгэл: `web/src/components/pwa/RegisterSW.tsx` (production-д л), `layout.tsx`-д
   БҮҮ хүр: хаана залгахыг PR-д бич.
3. «Суулгах» товч: `beforeinstallprompt` (Android/desktop) ба iOS Safari-д
   «Хуваалцах → Нүүр дэлгэцэнд нэмэх» заавар (lucide `share`, `square-plus`).
   `web/src/components/pwa/InstallPrompt.tsx`.
4. Кэшийн хувилбар, шинэ хувилбар гарахад «Шинэчлэх» toast.
5. Lighthouse PWA шалгалтыг локал build дээр (Playwright + Chromium) хийж
   үр дүнг PR-д бич.

**Хамрах файл:** `web/src/app/manifest.ts`, `web/public/sw.js`,
`web/public/icons/**`, `web/src/app/offline/**`, `web/src/components/pwa/**`.
<!-- /TASK -->

<!-- TASK:T17 -->
## T17: Техникийн өр (STATUS §9.2)
**Долгион 1. Салбар:** `codex/s2-T17-tech-debt`.

1. **Архивласан хэрэглэгч:** анги, SMS хүлээн авагч, багшийн ирц,
   даалгавар оноох жагсаалтууд архивласан (G25: `archivedAt`/`archived` талбарыг
   schema-гаас ол) сурагчийг харуулдаг. Бүгдийг шүүж, тест нэм. Хаана
   шүүснээ PR-д жагсаа.
2. **`react-hooks/set-state-in-effect` анхааруулга (91):** ЗӨВХӨН эдгээр
   хавтсанд засна: `web/src/components/{schedule,students,tuition,sms,planner,
   leads,online,analytics,lesson,test-builder,preview,finance,store}/**`,
   `web/src/app/app/{sms,store,schedule,students,planner,online,videos,
   goals,insights,groups,tuition}/**`. Арга: өгөгдөл ачаалах эффектийг
   `useEffect` доторх async функц + `alive` guard хэв маягаар (тухайн файлд
   `queueMicrotask` биш, зөв бүтэц), derived state-ийг `useMemo`, props-оос
   state эхлүүлэхийг `key` ашиглан. Зан байдал өөрчлөгдөхгүй. Анхааруулгын
   тоог өмнө/дараа нь PR-д бич.
3. **Дэлгүүрийн админ UI:** `api/src/store` + `web/src/app/app/store`-ийг уншиж үнэ
   тогтоох, бүтээгдэхүүн идэвхжүүлэх хэсэг дутуу бол хий (эрх ADMIN).
   (G40 дэлгүүр ба эрхийн нэгдэл нь эзний шийдвэр хүлээж байгаа: схемийн
   том өөрчлөлт ХИЙХГҮЙ.)
4. **«Ачаалж байна…» цэвэрлэгээ:** `grep -rn "Ачаалж байна"` → `LoadingState`
   (skeleton) руу, зөвхөн 2-р зүйлийн хавтсуудад.
5. **Smoke:** `npm run smoke` хамрахгүй endpoint-уудыг нэм.

**Хамрах файл:** дээр дурдсан хавтсууд, `api/src/{classrooms,sms,attendance,
assignments,store}/**` (шүүлтүүр), тестүүд.
<!-- /TASK -->

<!-- TASK:T19 -->
## T19: Контентын засвар: 1913 бодлогын placeholder сонголт
**Долгион 1. Салбар:** `codex/s2-T19-choices-extract`.

STATUS §9.3: 1913/1916 бодлого `choices = ["A".."E"]` (placeholder), жинхэнэ
хувилбарууд нь `statementText` дотор («A. 2  B. 3 …», LaTeX-тай).
`isPlaceholderChoices()`-ийг ол.

1. Цэвэр модуль `api/src/content/choice-extract.ts`: statement-оос 5 хувилбарыг
   салгаж `{ stem, choices[5], confidence, issues[] }` буцаана. Олон хэлбэр:
   `A.`/`A)`/`(A)`/`А.` (кирилл А!), мөр мөрөөр, нэг мөрөнд, `$...$` дотор
   хуваагдсан, `\qquad` тусгаарлагчтай гэх мэт. LaTeX-ийг бүү эвдэ (`$` тэгш
   тоотой байх, KaTeX-ээр рендерлэгдэх).
   Jest: 60-аас доошгүй тохиолдол (бодит ӨС-ийн хэлбэрийг дуурайсан зохиомол).
2. `api/prisma/fix-placeholder-choices.cjs`: DRY-RUN анхдагч → тайлан (амжилттай
   / эргэлзээтэй / бүтэлгүй тоо, 40 жишээ) `docs/qa/choices-extract-report.md`.
   `--commit --min-confidence=0.9`: зөвхөн итгэлтэйг шинэчилнэ, хуучин утгыг
   `ProblemRevision` эсвэл JSON нөөц файл (`--backup=<зам>`, репод commit
   хийхгүй) руу. Зөв хариу (`correctAnswer` үсэг) хэвээр үлдэнэ.
3. Эргэлзээтэйг `ProblemAnalysis.status = REVIEW_REQUIRED` болгох нь
   `--flag-review` сонголт.
4. **Импортын скриптүүдэд хүрэхгүй.**

**Хамрах файл:** `api/src/content/choice-extract.ts` (+spec),
`api/prisma/fix-placeholder-choices.cjs`, `docs/qa/choices-extract-report.md`.
<!-- /TASK -->

<!-- TASK:T20 -->
## T20: Судалгаа: хүүхдэд юу хамгийн их тусалдаг вэ (баримт бичиг)
**Долгион 1. Салбар:** `codex/s2-T20-research`. **Файл:** `docs/research/LEARNING-FEATURES-2026.md` (+ шаардлагатай бол `docs/research/*.md`).

Код бичихгүй. Гүнзгий, практик судалгаа:
1. Сурах шинжлэх ухаан: retrieval practice, spacing, interleaving, worked
   examples ба faded examples, dual coding, elaboration, metacognition,
   feedback timing, growth mindset-ийн мессеж, gamification-ы эерэг ба сөрөг
   тал (streak-ийн дарамт гэх мэт). Тус бүр: юу вэ, нотолгооны хүч
   (хүчтэй/дунд/сул), Pi.mn-д яаж хэрэгжүүлэх, аль хэдийн байгаа эсэх
   (кодыг уншиж шалга).
2. Бүтээгдэхүүний шинжилгээ: Khan Academy, Duolingo, Brilliant, Photomath,
   Quizlet, Anki, Seneca, Gauthmath, Монголын ЭЕШ-ийн бэлтгэлийн платформууд
   (мэдэж байгаагаараа). Тус бүрээс 3–5 санаа ба Pi.mn-д тохирох эсэх.
3. Pi.mn-ийн одоогийн бүх feature-ийн жагсаалт (кодоос: `web/src/app/app/**`
   маршрут бүр, role бүрээр) ба сул тал.
4. **Дараагийн 30 feature**: нөлөө (1–5), хүчин чармайлт (S/M/L), эрсдэл,
   хамаарал, үнэгүй эсэх. Хамгийн эхний 10-ыг дэлгэрэнгүй (хэрэглэгчийн түүх,
   дэлгэцийн тойм, өгөгдлийн загвар, амжилтыг хэмжих үзүүлэлт).
5. Хүүхдийн нууцлал ба сэтгэл зүйн аюулгүй байдал (харьцуулсан leaderboard-ын
   эрсдэл, эцэг эхийн дарамт, насанд хүрээгүй хүүхдийн мэдээлэл).
6. Ишлэл: зөвхөн үнэхээр мэддэг бүтээл (зохиогч, он). Эргэлзээтэй бол «ишлэл
   шалгах шаардлагатай» гэж тэмдэглэ. Зохиомол ишлэл ХАТУУ хориотой.
Монгол хэлээр, 4000–8000 үг.
<!-- /TASK -->

<!-- TASK:T21 -->
## T21: Интерактив томьёоны widget-ууд (SVG, сангүй)
**Долгион 3** (T09-ийн салбараас). **Салбар:** `codex/s2-T21-formula-widgets`.

Гэрээний C жагсаалтын **23 widget** бүгдийг `web/src/components/formulas/widgets/*.tsx`
болгон хийж `index.ts`-ийн `FORMULA_WIDGETS`-д бүртгэ. Шаардлага:
- Гадны сан НЭМЭХГҮЙ (chart, d3, three хориотой). Цэвэр SVG + React state +
  `<input type="range">` (kit загвартай гулсуур: `kit/slider.tsx`-ийг Radix
  Slider-ээр нэмж болно).
- Өнгө: SVG-д `stroke="var(--brand)"` гэх мэт CSS хувьсагч (токенууд
  `globals.css`-д: нэрийг уншиж зөвийг ашигла). Харанхуй горимд ажиллана.
- Бичвэр ба тоон утгыг MathText-ээр (SVG дээр `foreignObject` эсвэл SVG-ийн
  доор). Тоог 2 орон хүртэл.
- Хүртээмж: гулсуур бүр `aria-label`, SVG `role="img"` + `aria-label` тайлбар,
  гараар удирдах (сум товч), `prefers-reduced-motion`.
- 375px-д багтана (viewBox + `w-full`).
- Жишээ: `quadratic-graph`: a, b, c гулсуур, парабол, орой (цэг + $(x_0;y_0)$),
  тэнхлэг тасархай, язгуурууд, $D$-ийн утга ба тэмдгийн тайлбар («$D<0$:
  язгуургүй»). `unit-circle`: цэгийг чирэх (pointer events, touch), өнцөг
  градус/радиан, sin, cos проекц өнгөтэй хэрчмээр, tg. `geom-seq`: хэсэгчилсэн
  нийлбэрүүд $S=\frac{b_1}{1-q}$ руу ойртохыг баганаар. `probability-dice`:
  N удаа шидэх симуляц, давтамж онолын магадлал руу ойртох.
- Widget бүрт жижиг jest/RTL тест байхгүй бол e2e-д нэг widget-ийн гулсуурыг
  хөдөлгөж утга өөрчлөгдөхийг шалга.
- `/app/formulas/widgets` (зөвхөн ADMIN, TEACHER_PLUS): бүх widget-ийн галерей
  (QA-д).

**Хамрах файл:** `web/src/components/formulas/widgets/**`,
`web/src/components/ui/kit/slider.tsx` (шинэ), `web/src/app/app/formulas/widgets/**`,
`e2e/tests/*`.
<!-- /TASK -->

<!-- TASK:T18 -->
## T18: Хүртээмж ба e2e аудит (хамгийн сүүлд)
**Долгион 4. Салбар:** `codex/s2-T18-a11y-e2e`. Бусад PR merge хийгдсэний дараа, суурь салбараас.

1. `@axe-core/playwright` (үнэгүй, devDependency) нэмж `e2e/tests/a11y.spec.ts`:
   mock-api-тай бүх `/app/**` маршрут (role бүрээр) + нийтийн хуудсууд.
   `serious`/`critical` зөрчлийг тоол.
2. Зөрчлийг засах: §3 «ХҮРЭХГҮЙ ФАЙЛ»-аас бусад газарт шууд зас. Тэдгээрт
   байгааг `docs/qa/a11y-2026-09-28.md`-д файл:мөр + санал болгох засвартай
   жагсаа (Claude засна).
3. Гар удирдлага: гол 5 урсгал (нэвтрэх, тест өгөх, томьёо хайх, алдаа дахин
   бодох, төлбөр харах) зөвхөн Tab/Enter/Space-ээр явагдах e2e.
4. Үр дүн: өмнө/дараа нь зөрчлийн тоо, CI-д нэмэх job-ийн YAML-ийг PR
   тайлбарт (workflow файлд бүү хүр).

**Хамрах файл:** `e2e/**`, `docs/qa/a11y-*.md`, зөрчил засах жижиг
өөрчлөлтүүд (§3-аас гадуур).
<!-- /TASK -->

---

## Claude юу хийх вэ (Codex-ийн дараа)
- PR бүрийг шалгаж суурь салбарт нэгтгэнэ. Цэс (`nav-data.ts`) ба самбарын
  холболтыг хийнэ (FormulaOfTheDay, ReviewDueCard, MistakesTodayCard,
  ReadinessMiniCard, RegisterSW, InstallPrompt).
- Нууц үгийн бодлого (сэргээх/солих үед үсэг+тоо, 8+ тэмдэгт) нь Claude-ийнх
  (хийгдэж байна).
- Эзэнд: `node prisma/seed-formulas.cjs --commit`,
  `node prisma/tag-problem-formulas.cjs --commit`,
  `node prisma/backfill-mistakes.cjs --commit`,
  `node prisma/fix-placeholder-choices.cjs --commit --min-confidence=0.9`
  (бүгд эхлээд dry-run, Supabase нөөцлөлтийн дараа), `CRON_SECRET`-ийг
  Render-т, cron-ыг GitHub Actions/UptimeRobot-т тохируулах заавар.
