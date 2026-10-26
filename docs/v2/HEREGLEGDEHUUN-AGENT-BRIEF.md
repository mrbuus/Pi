# Хэрэглэгдэхүүн — хэрэгсэл бүрийн нийтлэг бриф

Эхлээд `docs/v2/HEREGLEGDEHUUN-TOLOVLOGOO.md`-г (төлөвлөгөө), `STATUS.md` §3 (эзний хатуу дүрэм) ба §6 (дизайны гэрээ)-г унш.

## Чи юу хийх вэ

`web/src/components/tools/<хэрэгсэл>/` хавтсанд ӨӨРИЙН хэрэгслийг бүрэн хийнэ. Түр орлуулагч `<Нэр>Tool.tsx` (default export, пропсгүй) байгаа — түүнийг бодит хэрэгслээр СОЛИНО. Өөр хэрэгслийн хавтас, `core/`, `nav/`, `app/` файлыг ЗАСАХГҮЙ (core-д дутуу зүйл олвол өөрийн хавтсанд хуул эсвэл төгсгөлд тайландаа бич).

## Бэлэн цөм (`../core/`)

- `expr.ts` (импортгүй цэвэр): `parse`, `parseRelation`, `compile(node,{degrees})` → `(scope)=>number`, `freeSymbols`, `toLatex`, `relationLatex`, `diff`, `simplify`, `same`, `niceTex(x)` (бүхэл/бутархай/a\sqrt{b}/k\pi), `toFraction`, `fracTex`, `splitSqrt`, `gcd`, `fmt`, `numTex`, `normalizeInput`, `ParseError` (монгол мессежтэй).
- `ToolFrame.tsx`: default `ToolFrame({svgRef, fileName, controls, children, toolbar, footer, wide})` (дүүрэн дэлгэц, PNG/SVG татах хийгдсэн; `svgRef` нь зургийн ҮНДСЭН `<svg>`), нэрлэсэн: `Panel`, `Segmented`, `NumberField`, `Toggle`.
- `svgText.tsx`: `SvgLabel({x,y,label,size,italic})` (оройн нэр `A_1`, `\alpha`, `60^\circ`, `\sqrt{2}` → SVG текст; зургийн доторх бүх шошгонд ЭНИЙГ ашигла), `SERIES_COLORS`, `MATH_FONT`.
- `export.ts`: `loadState(key, fallback)`, `saveState(key, value)` (localStorage, try/catch-тэй; түлхүүр нь `pi-tools:` угтвартай).
- `hub.ts`: `useToolsNav().go(tool, payload)` өөр хэрэгсэл рүү шилжүүлнэ; хүлээн авагч ачаалахдаа `takePending<T>("graph")`-ийг НЭГ удаа (useEffect-д) уншина.
- Бусад: `@/components/MathText` (`<MathText>{`$...$`}</MathText>` — UI дахь бүх томьёо), `@/components/ui/kit/{button,card,badge,tabs}`, `@/components/ui/StateBlock`, `@/components/ui/InfoHint` (default), `lucide-react`, `sonner` toast, `@/lib/cn`.

## Хатуу дүрэм (зөрчвөл ажил хүчингүй)

1. UI-ийн математик ҮРГЭЛЖ LaTeX (`MathText`); `π ² · √ ≤` гэх мэт unicode-ыг UI бичвэрт БҮҮ бич. Зөвхөн SVG зураг доторх шошго `SvgLabel`-ээр (энэ нь тэмдэгтийг өөрөө зохицуулна).
2. Emoji, unicode глиф хориотой — зөвхөн `lucide-react`. Тусгаарлагч цэг `·` гараар бичихгүй (`Meta`/`Dot` ашигла эсвэл зураас).
3. Өнгө зөвхөн токен: `text-ink`, `bg-surface`, `border-line`, `text-brand`, `bg-brand-bright`… SVG-д `var(--ink)`, `var(--brand)`, `var(--line)`, `var(--ink-dim)`, `var(--brand-tint)`. `#fff`, `text-blue-500` БОЛОХГҮЙ. ШАР/АЛТАН өнгө хориотой (`--gold` бүү ашигла).
4. Гарчиг, товч, богино тайлбарын төгсгөлд цэг (.) тавихгүй. Тайлбар бичвэр олшруулахгүй, хэрэгтэй бол `InfoHint`. Техникийн үг («API», «null») хэрэглэгчид харуулахгүй; алдаа монголоор, айлгахгүй.
5. Гар утас тэргүүнд (375px): хэвтээ гүйлт байхгүй, хүрэх талбай ≥44px (`min-h-11`), зураг дээр, удирдлага доор (`ToolFrame` үүнийг хийдэг).
6. Сүлжээ ХЭРЭГГҮЙ: гадаад зураг/CDN/WebGL/шинэ npm сан хориотой. 3D = цэвэр SVG (өөрийн проекц). Бүх тооцоо клиентэд.
7. `useEffect` дотор синхрон `setState` дарааллаар бүү үүсгэ (React 19 lint); `ssr:false`-тэй dynamic тул `window` аюулгүй, гэхдээ `localStorage`-г `loadState/saveState`-ээр л хэрэглэ.
8. Будалтгүй, тод зураас (сурах бичгийн хэв): шугам `stroke="var(--ink)"`, зургийн дүрс `fill="none"` эсвэл маш зөөлөн `--brand-tint`. Нуугдсан ирмэг тасархай.
9. Функц устгахгүй, нэмж л болно. Эзэн «хийж болох бүх зүйлийг» хүсдэг — гүйцэд, шалгагдсан, өргөн хүрээтэй хий.

## Цэвэр логик ба тест

- Тооцоо/геометр/алгоритмыг JSX-ээс ТУСАД нь `*.ts` (react-гүй) файлд бич. Харьцангуй импорт `.ts` өргөтгөлтэй (`import {parse} from "../core/expr.ts"` — tsconfig-д `allowImportingTsExtensions` нээлттэй). Node 22 `.ts`-ийг шууд ачаалдаг тул: `node --test src/components/tools/<хэрэгсэл>/`. TS-ийн parameter property, enum, namespace БҮҮ ашигла (strip-only горим дэмждэггүй).
- Тест `*.test.mjs` нь ЖИНХЭНЭ модулийг импортолж шалгана (логикийг давтан бичихгүй). Нарийн тоон хариуг гараар баталгаажсан мэдэгдэж буй жишээгээр шалга.

## Шалгах

- `cd web && npx tsc --noEmit` ЦЭВЭР байх ёстой (өөрийн файлуудад). `npm run build`, dev server АСААХГҮЙ (өөр session-ий сервер ажиллаж байна, `.next`-ийг эвдэнэ). Браузер хэрэггүй.
- Үр дүнгийн ГҮЙЦЭТГЭЛ: эзэн тайланд итгэдэггүй — юу хийснээ, ямар тест ногоон болсныг, юу дутуу үлдсэнийг үнэнээр бич.
- git commit/push хийхгүй. Шинэ npm сан суулгахгүй. Өгөгдлийн сан, API, `.runtime`-д хүрэхгүй.

## Тайлан

Төгсгөлд: файлын жагсаалт, боломжуудын жагсаалт, тестийн үр дүн, мэдэгдэж буй дутагдал (товч, 15 мөрөөс бага).
