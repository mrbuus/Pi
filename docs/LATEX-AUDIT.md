# LaTeX-ийн зөвхөн унших аудит

`api/prisma/audit-latex.cjs` нь вебийн суусан KaTeX хувилбарыг шууд ашиглана (`web/node_modules/katex`; lockfile одоогоор 0.17.0). API болон web dependencies-ийг эхлээд `npm ci`-аар суулгана. Шинэ SaaS, сангийн түлхүүр, агуулга өөрчлөх скрипт байхгүй.

```sh
cd api
node --test prisma/audit-latex.test.cjs
node prisma/audit-latex.cjs --help
# DATABASE_URL-ийг SELECT-only дансны холболтоор env-д өгсний дараа:
node prisma/audit-latex.cjs --format json --output /private/tmp/latex-audit.json
node prisma/audit-latex.cjs --format csv --output /private/tmp/latex-audit.csv
```

Скрипт `.env` ачаалахгүй, хоосон DATABASE_URL-тай ажиллахгүй. `BEGIN ... READ ONLY` дотор parameterized SELECT, keyset pagination хийнэ; амжилттай болон алдаатай үед ROLLBACK хийнэ. Нэмэлт хамгаалалт болгон SELECT-only DB account ашиглана. Production дээр энэ PR-ийн ажлаар ажиллуулаагүй.

Problem бүрийн statementText, choices, correctAnswer, бүтэцтэй сонголтын text/mistakeNote, analysis-ийн formulas/solutionOutline-ыг уншина. Зөөлөн устгасан контентыг ч хамарна; сурагч, утас, төлбөрийн өгөгдөл уншихгүй. Том тайлангийн issues санах ойд хуримтлагддаг тул их хэмжээний каталогт тусдаа нөөц/хугацааг тооцно. Нэг SQL хүсэлт 30 секунд, lock хүлээлт 5 секундээр хязгаарлагдсан.

8 шинж тэмдгийн тоо нь **талбар тус бүрийн** review candidate тоо; нэг бодлого хэд хэдэн ангилалд орж болно. Экранилсан хаалт болон зайтай сөрөг тоо заримдаа зөв LaTeX тул автоматаар алдаа гэж үзэхгүй. `KATEX_PARSE_ERROR` нь үнэхээр renderToString-д алдаа гаргасан томьёо. Энэ нь бодлогын математикийн зөв хариуг батлахгүй.

`$...$`, `$$...$$`, `\(...\)`, `\[...\]`, дан LaTeX тушаалтай талбаруудыг шалгана. MathText-ийн дэлгэц дээр хийдэг үсэг/зэргийн heuristic засварыг энд хийхгүй; эх агуулгын эвдрэл нуугдах ёсгүй. Бүх импортын хэлбэрийг төгс таних tokenizer биш: review candidate-уудыг багш шалгана.

JSON нь KaTeX version, checked/affected Problems, ангиллын counts, issue ID/field-ийг агуулна. CSV нь UTF-8 BOM, formula injection хамгаалалттай. Агуулгын snippet, зөв хариу, DB connection string тайланд байхгүй. `--output` нь өмнөх файлыг дарахгүй (`wx`), зөвхөн эзэнд унших/бичих permission-тай үүсгэнэ. Тайланг Git-д commit хийхгүй.
