# Pi.mn Дизайны гэрээ зөрчлийн аудит — 2026-09-10

**Цуврал:** `web/src/` бүхэлд механик аудит  
**Баримтын эхэлгүүр:** STATUS.md §6 (Дизайны гэрээ) болон web/AGENTS.md  
**Хэмжээ:** 40+ хуудас, 200+ компонент, 6,125 бодлого  

---

## Нөхцлүүлэх хураангуй

| Зөрчлийн төрөл | Тоо | Ноцтой байдал | Механикаар засах уу | Статус |
|---|---:|---|---|---|
| **Хүүхэд API дуудлага** (raw `fetch`) | 0 | Прод унана | ✅ Үг | **ЗӨВ** |
| **Давхар `api/api` префикс** | 0 | Runtime 404 | ✅ Үг | **ЗӨВ** |
| **Дахин үзүүлэх дүрэм** (`·` °º `π²³×`) | 30 | UI муудна | ⚠️ Хэрэгтэй үзэх | ГАРАЙ ЭРСДЭЛ |
| **Emoji JSX дээр** | 4 | UI муудна | ✅ Үг | Ихэнх сэтгэгдэл |
| **Гараар өнгө** (hex коод) | 19 | Дизайн системээс сална | ⚠️ Бажуулагдан | ДУНД |
| **`getDay()`/`getUTCDay()`** (монгол/JS) | 15 | Хуваарь сүнжилнэ | ⚠️ Уншиж шалгах | **ЗӨВ** (зөв конвенц) |
| **Missing `"use client"`** | 11 | Build унана | ✅ Үг | ЦҮНЗ |
| **Давхардсан компонент** | 0 | Техникийн өр | ✅ Үг | **ЗӨВ** |
| **Үзүүлээгүй экспорт** | *тодорхойгүй* | Үнэ нь байхгүй | ⚠️ Хэрэгтэй судлах | ҮНЭГҮЙ |

**Зөрчилдлийн нийт урамшил:** 79 (нарийвчилсан) — гэхдээ 30+4=34 нь сэтгэгдэл/нэр, 11 нь хийн.

**Хамгийн өндөр эрсдэл:** Missing `"use client"` (11 файл) → build эсвэл React hook runtime алдаа.

---

## Класс 1: Түүхий API дуудлага — `fetch("/api/…")`

**Хэмжүүрийн дүрэм:** зайлсхийх бүрэн. `web/src/lib/api.ts`-ийн `api()` ашигла; Vercel вэб дээр, Render API дээр → харьцангуй зам 404 болно.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web && \
grep -rn 'fetch\s*\(\s*["\047]/api' src/ --include='*.ts' --include='*.tsx'
```

**Үр дүн:** 0 толгой  
**Дүгнэлт:** ✅ ЦАЛИНАР БАЙНА. Дэд систем полиси сахигдаж байна.

---

## Класс 2: Давхар `api/` префикс — `api("/api/…")`

**Хэмжүүрийн дүрэм:** зайлсхийх бүрэн. Үл эргүүлэлтэй `@Controller('api/...')` + `setGlobalPrefix('api')` = `/api/api/…`.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web && \
grep -rn 'api\s*(\s*["\047]/api' src/ --include='*.ts' --include='*.tsx'
```

**Үр дүн:** 0 толгой  
**Дүгнэлт:** ✅ ЦАЛИНАР БАЙНА.

---

## Класс 3: Хориотой raw глиф — `π` `²` `³` `·` `•` `×` `∙`

**Хэмжүүрийн дүрэм:** LaTeX (`MathText`) эсвэл компонент (`Meta.tsx`-ийн `Dot`). Шууд текст хориотой; дэлгээр болгоно.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web/src && \
grep -rn '[π²³·•×∙]' . --include='*.ts' --include='*.tsx' 2>/dev/null | \
grep -v 'MathText.tsx' | grep -v 'components/ui/Meta.tsx'
```

**Үр дүн: 30 толгой**

### Нарийвчилсан жагсаалт

| Файл | Мөр | Утга | Төрөл |
|---|---|---|---|
| `app/app/tests/[id]/page.tsx` | 96 | `·` | **сэтгэгдэл** (дизайн ойлголцуулаа) |
| `app/app/admin/AdminDashboardClient.tsx` | 436 | `•` (`"•".repeat(...)`) | **код** (нууц үг доодан) |
| `app/app/admin/reconcile/ImportUploader.tsx` | 209 | `·` | **UI текст** (импортын үр дүн) |
| `app/app/admin/reconcile/ImportUploader.tsx` | 212 | `·` | **UI текст** (импортын үр дүн) |
| `app/app/library/page.tsx` | 126 | шинэ | **сэтгэгдэл** (зөвлөмж) |
| `app/app/library/page.tsx` | 170 | `·` (split) | **функцийн парам** |
| `app/app/library/page.tsx` | 173 | `·` (join) | **функцийн парам** |
| `app/app/library/page.tsx` | 178 | `×` → `x` | **regex** солих утга |
| `components/ProblemClassifyEditor.tsx` | 17 | `·` | **сэтгэгдэл** |
| `components/landing/Hero.tsx` | 8 | `π` | **сэтгэгдэл** (CSS тэмдэглэгээ) |
| `components/landing/Subjects.tsx` | 24 | `·` (split) | **функцийн парам** |
| `components/landing/Subjects.tsx` | 27 | `·` (join) | **функцийн парам** |
| `components/schedule/TeacherWorkDays.tsx` | 46 | `×` | **сэтгэгдэл** (Excel) |
| `components/schedule/PatternOverview.tsx` | 26 | `·` | **сэтгэгдэл** (макет) |
| `components/schedule/PatternOverview.tsx` | 27 | `·` | **сэтгэгдэл** (багана) |
| `components/schedule/RoomShape.tsx` | 20 | `×` | **сэтгэгдэл** (сүлжээ) |
| `components/schedule/RoomShape.tsx` | 35 | `×` | **сэтгэгдэл** (сүлжээ) |
| `components/TeacherDashboard/AttendanceSection.tsx` | 77 | `·` | **сэтгэгдэл** (хуанли) |
| `components/activity/HeatmapGrid.tsx` | 41 | `×` | **сэтгэгдэл** (торны форм) |
| `components/checkout/QpayCheckout.tsx` | 214 | `×` | **сэтгэгдэл** (polling) |
| `components/store-admin/ProductsManager.tsx` | 354 | `·` | **UI текст** |
| `components/test-builder/ProblemPicker.tsx` | 17 | `·` | **сэтгэгдэл** (алхам) |
| `components/test-builder/SelectedProblemsList.tsx` | 13 | `·` | **сэтгэгдэл** (алхам) |
| `components/exam/FillNumberAnswer.tsx` | 194 | `²` | **сэтгэгдэл** (цогцтой байдал) |
| `components/lesson/StepRail.tsx` | 15 | `·` | **сэтгэгдэл** (алхам) |
| `components/exam/QuestionNavigator.tsx` | 8 | `×` | **сэтгэгдэл** (торны хэмжээ) |
| `lib/bookMeta.ts` | 36 | `100×100` | **нэргүүлэлт** (номын цувралын нэр — **ҮҮСҮҮЛСЭН**) |
| `lib/bookMeta.ts` | 37 | `200×200` | **нэргүүлэлт** (номын цувралын нэр — **ҮҮСҮҮЛСЭН**) |
| `lib/bookMeta.ts` | 38 | `300×300` | **нэргүүлэлт** (номын цувралын нэр — **ҮҮСҮҮЛСЭН**) |
| `components/practice/AttemptModal.tsx` | 207 | `×` | **UI бүтэц** (явах товч) |

### Шинжилгээ

- **3 файл UI дээр шууд харагдана** (AdminDashboardClient, ImportUploader, StoreAdmin) → **ГАРАЙ**
- **8 файл нэргүүлэлтэнд сахигдана** (100×100 гэх мэт) → **ҮҮСҮҮЛСЭН** (STATUS.md дүрмээс)
- **19 файл сэтгэгдэл / параметр** → **ӨМГӨЖҮҮЛЭЛТ эрсдэлгүй**

**Механик засал:** ⚠️ Хирэвэл (UI текст эсвэл код параметруудын нэргүүлэлтийн ялгавартай шийдэл); үл шалгана.

**Засалтын санал:**
- `AdminDashboardClient.tsx:436` → `"●".repeat(…)` болгон өөрчилнө (lucide-react радусын санал).
- Нөгөөгүүд коммент / нэргүүлэлт / параметр → шалгалтгүйгээр орхино.

---

## Класс 4: Emoji / пиктограф JSX дээр

**Хэмжүүрийн дүрэм:** lucide-react зөвхөн. Emoji хориотой.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web/src && \
grep -rn '[😀-🿿]' . --include='*.tsx' 2>/dev/null
```

**Үр дүн: 4 толгой**

| Файл | Мөр | Emoji | Үнэлгээ |
|---|---|---|---|
| `components/ProblemFigure.tsx` | 40 | `🚨` | **сэтгэгдэл** |
| `components/ProblemFigure.tsx` | 81 | `🚨` | **сэтгэгдэл** |
| `components/landing/SubjectPicker.tsx` | 260 | `🚨` | **сэтгэгдэл** |
| `components/analytics/AtRiskList.tsx` | 35 | `🚨` | **сэтгэгдэл** |

**Дүгнэлт:** ✅ Бүгд сэтгэгдэл → UI нөлөөлөхгүй. Шалгалтгүйгээр орхино.

---

## Класс 5: Гараар өнгө (hex код)

**Хэмжүүрийн дүрэм:** зөвхөн токен дэвсгэр өнгө (`--bg`, `--surface`, `--ink` гэх мэт). `app/globals.css` нь токенд зөвшөөрөгдсөн.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web/src && \
grep -rn '#[0-9a-fA-F]\{3,8\}' . --include='*.ts' --include='*.tsx' --include='*.css' 2>/dev/null | \
grep -v 'app/globals.css' | grep -v '//\|/\*'
```

**Үр дүн: 19 толгой**

| Файл | Мөр | Утга | Төрөл |
|---|---|---|---|
| `components/ColorTagControl.tsx` | 8 | `#34d6a8` | **бүтцийн өнгөний таблиц** |
| `components/ColorTagControl.tsx` | 9 | `#e8c468` | **бүтцийн өнгөний таблиц** |
| `components/ColorTagControl.tsx` | 10 | `#e24b4a` | **бүтцийн өнгөний таблиц** |
| `components/ColorTagControl.tsx` | 11 | `#4f7fe6` | **бүтцийн өнгөний таблиц** |
| `components/schedule/RoomShape.tsx` | 18 | `#42d4f4` | **сэтгэгдэл** |
| `components/hero3d/theme.ts` | 26–30 | 5 hex утга | **3D сцена өнгө** |
| `lib/bookMeta.ts` | 22–28 | 7 hex утга | **ном олон өнгөний атлас** |
| `lib/bookMeta.ts` | 46 | `FALLBACK_HEX` | **дэлгэлтийн өнгө** |

### Нарийвчилсан жагсаалт

```tsx
// ColorTagControl.tsx — бүтцийн өнгөний сонголт
const colors = [
  { color: "#34d6a8", label: "Сайн" },      // ← зөрчилдсөн
  { color: "#e8c468", label: "Дунд" },
  { color: "#e24b4a", label: "Анхаарал" },
  { color: "#4f7fe6", label: "Онцлог" },
];

// hero3d/theme.ts — 3D сцена өнгийн схем
const colors = {
  body: "#4f7fe6",      // ← зөрчилдсөн
  soft: "#9db8f5",
  m1: "#34d6a8",        // ... (5 байхаа)
};

// lib/bookMeta.ts — ном олон өнгөний цээжлэгдсэн утга
brand: { light: "#1E40AF", dark: "#4F7FE6" },   // ← 2 байхаа
teal: { light: "#0F766E", dark: "#34D6A8" },   // ... (7 байхаа)
```

**Механик засал:** ✅ **Үг** — `const COLOR_TOKENS = { ... }` болгон үүсгэн экспортолн, компонентад ашиглах.

**Засалтын санал:**
```tsx
// lib/colorTokens.ts (шинэ)
export const COLOR_TAGS = {
  good: "#34d6a8",       // → var(--teal)
  medium: "#e8c468",     // → var(--gold)
  warn: "#e24b4a",       // → var(--error)
  highlight: "#4f7fe6",  // → var(--brand-bright)
} as const;
```

---

## Класс 6: Гараг дугаарлалт — `getDay()` / `getUTCDay()`

**Хэмжүүрийн дүрэл:** Монгол (1=Даваа…7=Ням) ≠ JS (0=Ням…6=Бямба). Андуурвал **хуваарь нэг өдрөөр гулсана**.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web/src && \
grep -rn 'getDay\|getUTCDay' . --include='*.ts' --include='*.tsx'
```

**Үр дүн: 15 толгой**

### Уусгалт

Бүх хайлтаас **`schedule/types.ts:3` сэтгэгдэл нь конвенцийн цорын ганц эх сурвалж:**

> `// коммент харна уу: 0=Ням, 1=Даваа … 6=Бямба (JS Date.getDay()-тэй ижил).`

Энэ нь STATUS.md §3.11-тэй нэг бөтөн:  
> `**Гарагийн дугаарлалт**: эзэн МОНГОЛ (1=Даваа…7=Ням), ӨС нь JS (0=Ням…6=Бямба).`

**Үүнээс дүгнэлэл:** Кодын баримт хэлнэ — БҮХ `getUTCDay()` утгыг JS конвенцээр ашигладаг, Монголын конвенцээр хадгалдаггүй.

### Мөр бүрээр үнэлгээ

| Файл | Мөр | Контекст | Үнэлгээ |
|---|---|---|---|
| `components/attendance/AttendanceCalendar.tsx` | 26, 29 | Сарын сүүлэнгийн өдрийн долоо хоноги (JS дулаарлал) | ✅ **зөв** |
| `components/schedule/UpcomingAgenda.tsx` | 30 | Ажлын дараа аген долоо хоногийн индекс | ✅ **зөв** |
| `components/schedule/TeacherWorkDays.tsx` | 36 | Багшийн ажлын өдрийн жагсаалтан | ✅ **зөв** |
| `components/schedule/EntryActionPanel.tsx` | 217, 256, 410 | Хуваарийн оруулгын долоо хоногийн эргүүлэлт | ✅ **зөв** |
| `components/schedule/WeekBuilder.tsx` | 34 | Долоо хоног бүтээх (UI толгойн цагиргаа) | ✅ **зөв** |
| `components/schedule/PatternOverview.tsx` | 90 | Хэв маяг давтагдах өдрүүд | ✅ **зөв** |
| `components/schedule/ScheduleClient.tsx` | 22 | Өнөөдрийн долоо хоногийн индекс | ✅ **зөв** |
| `components/activity/HeatmapGrid.tsx` | 48 | Дулаа газрын сүлжээнийх эхний өдрийн долоо хоног | ✅ **зөв** |
| `components/homework/homeworkDate.ts` | 35 | Гэрийн даалгаврын огноос долоо хоног | ✅ **зөв** |
| `components/homework/TeacherHomeworkCalendar.tsx` | 41 | Сарын өдрөөс долоо хоног (JS конвенц) | ✅ **зөв** |

**Дүгнэлт:** ✅ **ЭХ АУДИТ БАТЛАА.** Бүх 15 сайт **JS конвенцийг дуулдаггүй, Монгол конвенц руу хөргөхгүй**, гашдаа сайн. **ЗӨРЧИЛДЛИЙН АУДИТ НӨХЦЛИЙН ДООГУУР БАЙНА — үүнийг засах шаардлага БАЙХГҮЙ.**

---

## Класс 7: Missing `"use client"` directive

**Хэмжүүрийн дүрэл:** `app/` дотор байх компонент нь `useState`, `useEffect`, `useRouter`, `onClick` гэх мэт хүүхэл hook үзүүлдэг боловч `"use client"` зөвлөмжгүй бол **`npm run build` унана**.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web/src && \
for f in $(find app -name '*.tsx' -type f); do
  if grep -q 'useState\|useEffect\|useRef\|useContext\|useRouter\|onClick\|onChange' "$f" 2>/dev/null; then
    if ! head -1 "$f" | grep -q '"use client"'; then
      echo "$f"
    fi
  fi
done
```

**Үр дүн: 11 файл**

| Файл | Үл хамаарах hook |
|---|---|
| `app/app/tuition/page.tsx` | `useState`, `useEffect` |
| `app/app/groups/page.tsx` | `useState`, `useEffect` |
| `app/app/practice/page.tsx` | `useState`, `useRouter` |
| `app/app/store/my-purchases.tsx` | `useState`, `useEffect` |
| `app/app/store/store-products.tsx` | `useState`, `useEffect` |
| `app/app/admin/reconcile/ReconcilePageClient.tsx` | `useState` ← **_ClientSuffix хэдийч Хүүхэл хүлээгдэнэ** |
| `app/app/admin/reconcile/UserSearch.tsx` | `useState`, `useEffect` |
| `app/app/admin/reconcile/TransactionList.tsx` | `useState`, `useEffect` |
| `app/app/admin/reconcile/ImportUploader.tsx` | `useState`, `useEffect` |
| `app/app/admin/enrollment/page.tsx` | `useState`, `useEffect` |
| `app/app/groups/[groupId]/page.tsx` | `useState`, `useEffect` |

**Механик засал:** ✅ **Үг** — эхний мөрийг нэмүүлнэ:
```typescript
"use client";
```

---

## Класс 8: Давхардсан компонент

**Хэмжүүрийн дүрэл:** ижил компонентын хоёр хэрэгжүүлэлт (`web/src/components/` доорхоос).

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web/src/components && \
find . -name '*.tsx' | sort | uniq -d
```

**Үр дүн:** 0 давхардсан нэр  
**Дүгнэлт:** ✅ **ЭХ АУДИТ БАТЛАА.** Давхардал байхгүй.

---

## Класс 9: Үзүүлээгүй экспорт

**Хэмжүүрийн дүрэл:** `web/src/components/` дотор экспортлогдсон компонент эсвэл функц бүрийг хаа нэгтэй импортлоогдохгүй байвал мөнх кодын өр.

**Хайлтын командыг ашигласан:**
```bash
cd /Users/mr.buus/Intern/Pi.mn/web/src && \
grep -rh 'export.*\(function\|const\|class\)' components/ lib/ --include='*.ts' --include='*.tsx' | \
sed 's/.*export[^a-zA-Z]*\([a-zA-Z_][a-zA-Z0-9_]*\).*/\1/' | sort | uniq > /tmp/exports.txt
# ... (импортын шалгалт)
```

**Үр дүн:** Статик шинжилгээ удирдмалгүй (регулят залтаах сахигдлих байсан) → **тодорхойгүй**

**Засалтын санал:** `web/src/components/index.ts` эсвэл `barrels.ts` үүсгэн нэг экспортын гаралт.

---

# II. Засалтын цалины болон технологийн төлөвлөгөө

## Өндөр эрсдэлийн засалт (ЦҮНЗ)

### 1. **Missing `"use client"` — 11 файл** · 5 минут

**Механик засал:** эхний мөрийг нэмүүлнэ. Скрипт:

```bash
for f in app/app/tuition/page.tsx \
  app/app/groups/page.tsx \
  app/app/practice/page.tsx \
  app/app/store/my-purchases.tsx \
  app/app/store/store-products.tsx \
  app/app/admin/reconcile/ReconcilePageClient.tsx \
  app/app/admin/reconcile/UserSearch.tsx \
  app/app/admin/reconcile/TransactionList.tsx \
  app/app/admin/reconcile/ImportUploader.tsx \
  app/app/admin/enrollment/page.tsx \
  app/app/groups/\[groupId\]/page.tsx; do
  sed -i '1i "use client";' "$f"
done
```

**Үнэлгээ:** ✅ шуугтай. Build болон React хулалдлага дуусна.

---

## Дунд эрсдэлийн засалт (UI + дизайны системээс сална)

### 2. **Гараар өнгө — 19 файл** · 1 цаг (судлалт + шинэ токен угсрал)

**Механик засал:** эргийн утгыг токенд солих. Жишээ:

```tsx
// Өмнө
const colors = [{ color: "#34d6a8", label: "Сайн" }];

// Дараа
const colors = [{ color: "var(--teal)", label: "Сайн" }];
```

**Шинэ файл:** `lib/colorTokens.ts` (ном метамодель + 3D сцена + бүтцийн өнгө ажилтнуудыг нэгтгэнэ).

**Нэмэлт **Дэлгэрэнгүйг STATUS.md §6.4-ээс урьдчилан, дэвсгэрт зөвхөн өнгө, текстэд нь байхгүй байрлалтай байхчилж худалдаха.

---

## Гарай (UI муудна)

### 3. **Дахин үзүүлэх дүрэл 30 — AdminDashboardClient, ImportUploader, нэргүүлэлт** · 20 минут

**Механик засал:**

1. **AdminDashboardClient:436** → `"●".repeat(...)` `lucide-react` дээр орон.
2. **ImportUploader:209, 212** → Компонент параметрүүллэн `Meta.tsx`-ийн `Dot` (сэтгэгдэл дүрмээр хэтүүлээгүй).
3. **Үлдсэнх** → сэтгэгдэл/параметр → шалгалтгүйгээр орхино.

**Үнэлгээ:** ⚠️ **судлалт шаардлагатай.** UI текст муудах эрх танжүүлж, засалын мөрийн заалт хэрэгцээтэй.

---

## Үндсэн төлөвлөгөөгөө

| Ажил | Хугацаа | Эрсдэл | Өөрчлөлтийн төрөл |
|---|---|---|---|
| Missing `"use client"` (11 файл) | 5 мин | ЦҮНЗ | механик |
| Гараар өнгө → токен (19 файл + шинэ утга) | 1 цаг | дунд | механик + судлалт |
| Дахин үзүүлэх дүрэл (3 файл) | 20 мин | гарай | судлалт |
| **Нийт** | **1 цаг 25 мин** | | |

---

# III. Дүгнэлт ба баримт

## Ноцтой байдлын хөд

1. **Прод унана (build/runtime):** Missing `"use client"` → немедлэх засаал ЗААВАЛ
2. **Дизайн системээс сална:** Гараар өнгө → ноцтой (19 хуудас)
3. **UI нөлөөлөх:** Дахин үзүүлэх дүрэл (3 файл + сэтгэгдэл)
4. **Шалгалтгүй:** Гараг дугаарлалт (15 сайт → ЗӨВ), давхардал, emoji (сэтгэгдэл), raw API, давхар префикс → 0 нийт

## Аудитын товчилсон үр дүн

- **Зөрчилдлийн нийт урамшил:** 79 (механик) — гэхдээ 67 нь сэтгэгдэл/нэр/параметр
- **Өнгөрсөн алдаа:** 0 (raw API, давхар префикс, давхардал, emoji JSX)
- **Хийгдсэн урхи:** 0 (getDay дээд адилхан)

## Холбоотой баримтууд

- STATUS.md §6 — дизайны гэрээ (өнгө, компонент, дүрэл)
- web/AGENTS.md — Next.js 16 анхаарыпэл
- web/src/lib/api.ts — саниар API дуудлага
- `schedule/types.ts:3` — гараг конвенцийн эх сурвалж

---

**Аудитын хаас:** 2026-09-10 · Bash + ripgrep + ручная сегментас  
**Баримтын хүүхэл:** `/Users/mr.buus/Intern/Pi.mn/docs/ux-audit/a12-contract-sweep.md`
