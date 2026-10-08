# Orphan код чанарын аудит — 7 үл-холбогдсон хуудас

**Мэргэжилтэн үзэлтэйхэйр дүүлгэх: 2026-09-10 | Өмнөхөмж: STATUS.md §6 (дизайны гэрээ)**

---

## Хураангуй хүснэгт

| Хуудас | Төлөв | Шийдвэр | Нэг мөр шалтгаан |
|---|---|---|---|
| web/src/app/app/admin/classrooms/ | бэлэн | **холбох** | Цэвэр, бүтэн, api() орвуулна — завсруулах сэтгүүлийг л нэм |
| web/src/app/app/admin/finance/ | хагас | **нэгтгэх** | API байгаа, FinanceDashboardClient ажиллаж байгаа ч навигацид алга |
| web/src/app/app/admin/store/ | хаягдсан | **устгах** | /books endpoint байхгүй; StoreAdminClient дуудагдахгүй, 404 эргүүлнэ |
| web/src/app/app/insights/ | хагас | **устгах** | Mock өгөгдөл, API дуудлага БАЙХГҮЙ — нүхэлтийн прототип |
| web/src/app/app/practice/ | бэлэн | **холбох** | PracticeList, /recommend endpoint бүгд байгаа, чанар сайн |
| web/src/app/app/store/ | бэлэн | **холбок эсвэл устгах** | Бүхэл, ажиллаж байгаа, гэхдээ үл-холбогдсон (эс тул хаягдсан болсон уу, эсвэл туршилтын дэлгүүр үү) |
| web/src/app/app/tuition/ | бэлэн | **холбох** | RefundCalculator, /tuition/refund дуудлага цэвэр — навигацид l холбосон |

---

## 1. `web/src/app/app/admin/classrooms/`

### Юу хийдэг
- Админ/учиртай арга: ангиудыг жагсаалуулж, тардаг
- Өрөл биш ангийн нэр таарахыг шалгаж, Disband POST дуудлага хийнэ

### API дуудлаганууд
| Эндпойнт | Арга | Байгаа уу |
|---|---|---|
| `/classrooms` | GET | ✅ `api/src/classrooms/classrooms.controller.ts:38` |
| `/classrooms/{id}/disband` | POST | ✅ `api/src/classrooms/classrooms.controller.ts:114` |

### Конвенцийн эс хаалтануу
- ✅ `"use client"` байгаа (ClassroomsClient.tsx:1)
- ✅ `api()` ашигласан, түүхий fetch() БИШ
- ✅ Алдааны мессеж монгол
- ✅ Ачаалж байна/хоосон/алдаа төлөв бүгд байгаа
- ✅ Компонентүүд (`Meta`, `LoadingState` гэх мэт) орвуулсан
- ✅ Emoj БАЙХГҮЙ

### TypeScript чанар
- ✅ `any` БАЙХГҮЙ
- ✅ Error handling зөв: `errMsg()` утга нь Error.message
- ✅ Заавал `@ts-ignore` БИШ

### Төлөв
**БЭЛЭН** — зөвхөн дүүлгэхэд хэмжээ байхгүй

### Ажилласа хүлээлт

- Навигацид холбоос нэм (`/app/admin/classrooms`)
- Эрхийн шалгалт: `RequireRole` зөв юу — `ADMIN, TEACHER_PLUS` утгатай

---

## 2. `web/src/app/app/admin/finance/`

### Юу хийдэг
- Админ дэлгэц: санхүүгийн тайлан (орлого/зарлага, сарын тайлан)
- FinanceDashboardClient-г урьдаж, түүнд дахь мэдээллийг харуулна

### API дуудлаганууд (`FinanceDashboardClient`-нээс)
| Эндпойнт | Байгаа уу |
|---|---|
| `/finance/report?month={yyyy-mm}` | ✅ `api/src/finance/finance.controller.ts:14` (@Get('report')) |
| `/finance/expenses?month={yyyy-mm}` | ✅ `api/src/finance/finance.controller.ts:21` (@Get('expenses')) |

### Конвенцийн эс хаалтануу
- ✅ `FinanceDashboardClient` дээр `"use client"` (FinanceDashboardClient.tsx:1)
- ✅ `api()` ашигласан
- ✅ Компонентүүд чийгвэр
- ✅ Emoji БИШ

### Төлөв
**ХАГАС** — API + UI бүгд бэлэн, гэхдээ:
- Навигацийн сайдбарт холбоос БАЙХГҮЙ
- Үл-холбогдсон → хэрэглэгч олоогүй → сүүлийн үедийнх орхигдсон

### Ажилласа хүлээлт
- Сайдбарт `/app/admin/finance` холбоос нэм
- Эрхийн шалгалт: `RequireRole` check хэр

---

## 3. `web/src/app/app/admin/store/`

### Юу хийдэг
- Админ дэлгүүрийн удирдлага: бүтээгдэхүүн, үнэ, худалдан авалт, орлогын санхүү
- StoreAdminClient-г урьдаж

### API дуудлаганууд (`StoreAdminClient`-нээс)
| Эндпойнт | Байгаа уу | Сатар |
|---|---|---|
| `/store/admin/products` | ✅ `store.controller.ts:113` | — |
| `/store/admin/purchases` | ✅ `store.controller.ts:123` | — |
| `/store/admin/revenue` | ✅ `store.controller.ts:134` | — |
| `/tests` | ✅ `tests.controller.ts:43` | — |
| **`/books`** | ❌ **БАЙХГҮЙ** | 🔴 **ХАЯГДСАН ЭНДПОЙНТ** |

### Конвенцийн эс хаалтануу
- ✅ `"use client"` байгаа
- ✅ `api()` ашигласан
- ❌ **Байхгүй эндпойнт дуудав** — `/books` controller БАЙХГҮЙ
  - `StoreAdminClient.tsx:80`: `api<Book[]>('/books')`
  - Үр дүн: **404, компонент буссан унана**

### TypeScript чанар
- ✅ Interface-үүд зөв тодорхойлогдсон
- ✅ Error handling байгаа

### Төлөв
**ХАЯГДСАН** — API дуудлага сүүлийнхээс л дуусч, 404 унана:
- `/books` endpoint БАЙХГҮЙ → backend бүтээхэд орхигдсон
- Компонент нь дуудсан боловч, ашигла муугүй → хаягдсан

### Сатар
```
Сүүлийн үедийнхээс хэмжээ: `/books` эндпойнт ч бага муугүй хэрэгтэйгээр сургалтын төвтэй байвал,
бүтээхэд орхигдсон. Үл хадгалсан үржүүлэлт.
```

---

## 4. `web/src/app/app/insights/`

### Юу хийдэг
- Админ дэлгэц: шалгалтын тооцоо, сэдвийн дүн шинжилгээ, сайл сонголтын шинжилгээ
- InsightsDashboard-г урьдаж

### API дуудлаганууд
- **БАЙХГҮЙ** — mock өгөгдөл л ашигласан
- InsightsDashboard.tsx:99-100 тэмдэглэл:
  ```tsx
  const testId = searchParams.get("test");
  // ... гэхдээ API дуудлага БАЙХГҮЙ
  ```

### Конвенцийн эс хаалтануу
- ✅ `"use client"` байгаа
- ✅ Компонентүүд зөв
- ❌ **API дуудлага ҮГҮЙ** — MOCK_INSIGHTS л ашигласан
  - InsightsDashboard.tsx:13-96 — бүгд хард-кодлогдсон сүүлийнхээ

### TypeScript чанар
- ✅ Interface-үүд зөв

### Төлөв
**ХАЯГДСАН** — нүхэлтийн прототип л:
- Mock өгөгдөл зөвхөн
- API дуудлага үгүй
- Backend модуль? `/insights` эндпойнт? Мэдээлээгүй
- Хэрэглэгч буруу ангид сүүлийн үе орхигдсон

---

## 5. `web/src/app/app/practice/`

### Юу хийдэг
- Сурагч дасгал: дараагийн санал болгогдсон бодлого жагсаалуулж, оролдолт хадгална
- PracticeList компонентыг урьдаж

### API дуудлаганууд
| Эндпойнт | Арга | Байгаа уу |
|---|---|---|
| `/recommend/next?limit=10` | GET | ✅ `recommend.controller.ts:36` |
| `/recommend/attempt` | POST | ✅ `recommend.controller.ts:54` |

### Конвенцийн эс хаалтануу
- ✅ `"use client"` байгаа (page.tsx:1)
- ✅ `api()` ашигласан, түүхий fetch() БИШ
- ✅ Алдааны мессеж монгол
- ✅ Ачаалж байна/хоосон/алдаа төлөв
- ✅ Emoji БИШ
- ✅ Компонентүүд orion

### TypeScript чанар
- ✅ `any` БАЙХГҮЙ
- ✅ Error handling зөв
- ✅ RecommendReason тип зөв

### Төлөв
**БЭЛЭН** — навигацид холбоосон ХЭРЭГТЭЙ:
- `/app/practice` ссылка сайдбарт
- Эрхий шалгалт: STUDENT л

---

## 6. `web/src/app/app/store/`

### Юу хийдэг
- Ерөнхий дэлгүүр: нэг удаагийн шалгалт, ном худалдаж авах
- Таб: Бүтээгдэхүүнүүд / Миний авсан
- StoreProducts & MyPurchases компонентүүд

### API дуудлаганууд
| Эндпойнт | Байгаа уу |
|---|---|
| `/store/products` | ✅ `store.controller.ts:26` |
| `/store/purchase` | ✅ `store.controller.ts:35` |
| `/store/my-purchases` | ✅ `store.controller.ts:47` |

### Конвенцийн эс хаалтануу
- ✅ `"use client"` байгаа (store-products.tsx:1, my-purchases.tsx:1)
- ✅ `api()` ашигласан, түүхий fetch() БИШ
- ✅ Компонентүүд (Surface → Card гэх мэт)
- ✅ Монгол мессеж
- ✅ Error handling

### TypeScript чанар
- ✅ Interface-үүд ясаатай
- ✅ `any` БАЙХГҮЙ

### Төлөв
**БЭЛЭН** — бүтэн, ажиллаж байгаа. Гэхдээ:
- Сайдбарт холбоос БАЙХГҮЙ → үл-холбогдсон → хаягдсан
- **Шийдвэр: холбох уу, устгах уу?**
  - Хэрэв бизнесийн дэлгүүр шаардлагатай: холбоос нэм
  - Хэрэв эмээгүй: устгах (2 компонент)

---

## 7. `web/src/app/app/tuition/`

### Юу хийдэг
- Сургалтын төлбөрийн буцаалт: сурагч ангиас гарахад суусан өдөр нарийнаар буцааж хадгална
- RefundCalculator компонентоор форм бөглүүлнэ

### API дуудлаганууд
| Эндпойнт | Арга | Байгаа уу |
|---|---|---|
| `/tuition/refund` | POST | ✅ `tuition.controller.ts:58` |

### Конвенцийн эс хаалтануу
- ✅ `"use client"` байгаа
- ✅ `api()` ашигласан (page.tsx:21)
- ✅ Компонентүүд зөв
- ✅ Error handling, loading төлөв

### TypeScript чанар
- ✅ Type-safe

### Төлөв
**БЭЛЭН** — навигацид холбоосон ХЭРЭГТЭЙ:
- `/app/tuition` холбоос нэм
- Эрхий: админ / учиртай арга (tuition.controller.ts:60 @Roles)

---

## Кросс-сценическийн дүл хүснэгт

| Атл | Сүүлийнхээ | Файл:мөр |
|---|---|---|
| **Байхгүй эндпойнт** | `/books` | `web/src/app/app/admin/store/page.tsx` (StoreAdminClient.tsx:80) |
| **Mock өгөгдөл байхгүй API** | InsightsDashboard | `web/src/app/app/insights/page.tsx` |
| **Үл-холбогдсон (засалт)** | finance, practice, store, tuition | Сайдбарт холбоос байхгүй |
| **Цэвэр, готов** | classrooms, practice | Холбоо нэм л |

---

## Дүгнэлт хүснэгт

| Хуудас | Төлөв | Холбох ажил |
|---|---|---|
| **classrooms** | ✅ БЭЛЭН | Сайдбарт холбоос нэм. Таймаут 30 мин. |
| **finance** | ⚠️ ХАГАС | API байгаа, гэхдээ навигацид алга. Нэгтгэхэд 10 мин. |
| **admin/store** | ❌ ХАЯГДСАН | `/books` эндпойнт ҮГҮЙ. Устгах эсвэл backend-г гүйцэтгэл. |
| **insights** | ❌ ХАЯГДСАН | Mock-ын сүүлүүд л. Backend байхгүй. Устгах. |
| **practice** | ✅ БЭЛЭН | Сайдбарт холбоос нэм. 15 мин. |
| **store** | ✅ БЭЛЭН | Сайдбарт холбоос нэм уу, устгах. 20 мин. |
| **tuition** | ✅ БЭЛЭН | Сайдбарт холбоос нэм. 15 мин. |

---

## Хамгийн сэргүүлэх: `/books` эндпойнт

### Өнөө байдал
```typescript
// web/src/app/app/admin/store/ (StoreAdminClient.tsx:80)
api<Book[]>('/books')  // → 404 БУССАН УНАНА
```

**Туршилт**: Админ дэлгүүрт нэвтэрч нуруухан ачаалдаг. Сонголт:
1. **Backend-г гүйцэтгэл**: `/books` controller + service нэм (`/api/src/books/`)
2. **Устгах**: StoreAdminClient-нээс дуудлага авах
3. **Дахин сэргүүлэх**: Энэ функц шаарддаггүй бол компонентоос хас

---

## Дахь ажил

**Баримтлал таслал:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web
npx tsc --noEmit
npm run build
```

**Чанараа шалга:**
- Сайдбарт холбоосяд сонго (дүрсэлсэн 4 хуудас)
- Навигаци фронт-энд дээр: `app/layout.tsx` эсвэл `components/nav/`
- Эрхий шалгалт аль ачигдана: `RequireRole` компонентүүд

---

Бичсэн: 2026-09-10 | Аудиторын мэдлэг: STATUS.md, AGENTS.md, code conventions
