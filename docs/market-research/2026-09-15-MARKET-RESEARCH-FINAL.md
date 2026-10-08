# Pi.mn — ЭШ, математикийн сургалтын зах зээлийн эцсийн судалгаа

## Шийдвэрийн товч

Pi.mn-ийн хамгийн бодит зах зээл нь “ЭШ-ийн тестийн вэбсайт” биш, харин **математикийн танхимын сургалт ба өөрөө суралцах бэлтгэлийг нэг өгөгдлийн урсгалд холбох үйлчилгээ** юм. Зах зээл дээр дараах суурь функцүүд хэдийн бий болсон: өнгөрсөн тест, хугацаатай сорил, автомат дүн, видео хичээл, XP/leaderboard, багштай online анги, PDF/номын контент. Тиймээс эдгээрийн аль нэгийг дангаар нь “шинэ” гэж зарах боломжгүй.

Pi.mn-ийн хамгаалагдах ялгарал бол дараах дараалал:

```text
Танхимын болон онлайнаар хийсэн оролдлого
             ↓
Source + skill + алдааны төрөлтэй бодлогын мэдээлэл
             ↓
Сурагчийн дараагийн 3 тодорхой ажил
             ↓
Багшийн анхаарах сурагчдын queue + эцэг эхийн товч тайлан
```

Энэ нь одоогийн `SPEC.md`-ийн агуулгын таксономи, `ProblemAnalysis`, teacher/admin/parent role-уудыг тус тусдаа feature биш, нэг learner outcome болгон ашиглах боломж юм.

## Судалгааны арга ба хамрах хүрээ

Энэхүү тайлан `m02`, `m03`, `m04`, `m05`, `m07`, `m08`, `m09`-ийн бүх сэдвийг дахин audit хийж нэгтгэв. Нэхэмжлэл бүрийг боломжтой тохиолдолд тухайн платформын сайт, Google Play/App Store, төрийн эсвэл анхдагч баримтаар шалгасан. Платформын өөрийн амжилтын тоо, Facebook-ийн index-лэгдсэн ганц post, хуучин үнэ, гуравдагч талын review-г **independent market fact** гэж ашиглаагүй.

Facebook-ийн reach, зарын зорилтот сегмент, зарын зардал, бүх сургалтын төвийн өнөөгийн үнэ нь public web-ээс бүрэн харагддаггүй. Иймээс уг сувгийн тухай зөвхөн шалгагдах qualitative дүгнэлт хийсэн; зах зээлийн “хувь” зохиогоогүй. Энэ нь судалгааны сул тал биш, харин эх сурвалжийн бодит хязгаар юм.

## 1. Монголын зах зээл: баталгаажсан өрсөлдөгчид

| Сегмент | Платформ | Нийтэд харагдах бодит санал | Pi.mn-д учруулах дарамт / сургамж |
|---|---|---|---|
| Олон хичээлийн ЭШ, mobile-first | [YESH](https://yesh.mn/quick-test) | 2026 blueprint-д суурилсан цахим сорил; дахин өгөх, ахиц харьцуулах, чадварын түвшний тайлан. Google Play дээр 100K+ download, 4.0 rating, 295 review, 2026-06 update. iOS-д $9.99/сар, $29.99/6 сар, $49.99/12 сар гэсэн in-app purchase харагдана. | Fast acquisition, multi-subject, simulation-д хүчтэй. Pi нь “тест + дүн” хуулбарлаж өрсөлдөхгүй. |
| Математикийн багштай + self-serve экосистем | [iMath / 8×100](https://imath.mn/) | Online test; видео ба текст хосолсон онол–жишээ–даалгавар; ЭШ-ийн хэмжээст оноотой харьцуулах; ном, сургалт, системийн багц. | Хамгийн ойр benchmark. Багш, ном, онлайн системийг нэгтгэх positioning аль хэдийн эзэлсэн. |
| Gamified math course | [Lumina](https://www.lumina.mn/) | 500+/600+/700+ зорилтот курс, 100+ lesson, XP, шагнал/тэргүүлэгч, search, жишиг тестийн архив. | Outcome-first IA, богино хичээл ба мотивациас суралц. |
| Creator-led math course | [Математик 6000 тест](https://math6000test.thinkific.com/products/courses/math) | 7 chapter, 60 lesson, сэдэвчилсэн “ЭШ 1000”, 2006–2025 материал, олон жишиг сорил, бодолтууд. | Контентын олон тоо дангаараа moat биш. QA болон цэгцтэй metadata нь Pi-ийн давуу тал байх ёстой. |
| Нээлттэй past-paper practice | [math.edu.mn](https://math.edu.mn/) | Өмнөх ЭШ-ийн даалгавар, timed test, авто шалгалт, шууд дүн, бодолттой задаргаа; сайт нь “100+ даалгавар”, үнэ төлбөргүй гэж мэдээлдэг. | Free diagnostic/past-paper нь зах зээлийн minimum expectation. |
| Нээлттэй math problem bank | [Integral.mn](https://integral.mn/about) | ЭШ, олимпиад, их сургуулийн чиглэлийн ойролцоогоор 10,000 бодлого; ихэнх нь бодолт/заавартай гэж өөрийн танилцуулгад бичжээ. Нийтэд харагдах бодлогууд LaTeX маягийн тэмдэглэгээ, tag, амжилтын хувийг ашигладаг. | Pi-ийн 6,000 бодлого бол тоогоороо ялгарахгүй. Сайн source trace, answer QA, skill graph, student history-гаар ялгарна. |
| 1–5 ангийн дасгал | [BLesson](https://blesson.mn/) | 1–5 ангийн математикт 100 орчим дасгал; parent болон teacher entry; даалгавар бэлдэх; зарим контент programmatically generated гэж танилцуулдаг. | Бага ангийн өргөтгөлийг ЭШ MVP-тэй холихгүй. Харин teacher/parent role pattern нь хэрэгтэй. |
| Broad school e-learning | [e-surgalt.com](https://www.e-surgalt.com/) | Математикийн сорил, онолын нийтлэл, 1,000 бодлого гэж public page дээрээ дурддаг; зарим материал төлбөртэй. | “Нийтлэл + бодлого” зах зээлд аль хэдийн байгаа. Идэвхтэй план ба үр дүнгийн loop хэрэгтэй. |
| 1–5 ангийн adaptive school math | [Eduten Mongolia](https://eduten.com/mn/) | Долоо хоногийн хөтөлбөр, олон зуун дасгал, буруу ойлголтын автомат шинжилгээ ба teacher-focus messaging. | Pi-д эхнээсээ skill-level тайлбар, багшийн анхаарах queue хэрэгтэйг харуулна; харин Eduten-ийн “20%” үр дүн нь өөрийн marketing claim тул benchmark KPI биш. |
| Насан туршийн general learning | [Melearn](https://melearn.mn/) | Course + audio book subscription; Google Play дээр 100K+ downloads, 3.9 rating, 344 reviews, 2025-12 update. | App install олон байх нь ЭШ conversion-ийг батлахгүй. Melearn-г math competitor биш, mobile content consumption benchmark гэж үз. |

### 1.1 Үнэ: ашиглаж болох anchors

Үнэ нь хангалттай ил тод, хугацаа нь шинэ эх сурвалжаас батлагдсан цорын ганц хамгийн чухал direct anchor нь iMath юм:

| iMath-н санал | Нийтэд зарласан үнэ | Тайлбар |
|---|---:|---|
| Бие даан ажиллах жилийн цахим эрх | 300,000₮/жил | Хичээл, сорил үзэж бие даан ажиллах эрх |
| Багштай онлайн анги | 1,000,000₮/жил | iMath систем дээр багштайгаар ажиллах |
| Танхимын жилийн анги | 3,000,000₮/жил | 2026 ЭШ-д зориулсан анги |
| Хоцрогдол арилгах танхим | 3,000,000₮/жил; 360,000₮/сар | 6–11 ангийн хагас ганцаарчилсан сургалт |

Эх сурвалж: [iMath нүүр](https://imath.mn/), [iMath сургалтын тайлбар](https://imath.mn/nv/mathlearning).

Иймд Pi.mn-ийн 350,000₮/сар гэдэг нь self-serve эрхэд **тохирохгүй**. Энэ үнэ зөвхөн тогтмол танхимын уулзалт, жижиг бүлэг, багшийн feedback, paper-test entry, parent report орсон premium hybrid багцад л test хийх боломжтой. Үнийн шийдвэрийг market-average гэх хуучин таамаг дээр биш, хоёр жижиг cohort-ийн conversion, completion, renewal дээр үндэслэнэ.

### 1.2 ЭШ-ийн бодит нөхцөл

БҮТ-ийн 2026 мэдээллээр 47,100 шалгуулагч элсэлтийн шалгалтад оролцсон; математик, хими, физикийн даалгавар 100 минутын хугацаатай байв. Lumina-ийн public mock page нь 36 сонгох + 4 нөхөх, A–D хувилбар, автомат хадгалалт/дахин оролдлогын хэв шинжийг харуулдаг. Pi-д timer, resume, сонгох/тоо нөхөх формат, source-version, шалгалтын дараах задаргаа нь заавал байх baseline юм. [БҮТ](https://www.eec.mn/cat/for-new-enrollers), [Lumina mock tests](https://www.lumina.mn/mock-test)

## 2. Mobile ба сургалтын удирдлагын судалгаа

Өмнөх mobile-app тайлангийн гол засвар: `Skuul.mn` “0 download/abandoned” биш. Google Play дээр 1K+ download, 2026-02-15 update-тай, ЭШ-д зориулсан self-study + багшийн дэмжлэгийн positioning-тэй байна. Зах зээлийн эзлэх хувийг энэ тооноос дүгнэх боломжгүй ч “бодит, шинэ өрсөлдөгч” гэж үзнэ. [Skuul.mn — Google Play](https://play.google.com/store/apps/details?hl=en&id=ecm.skuul.mn)

eSchool экосистем ЭШ math-ийн шууд өрсөлдөгч биш боловч Pi-ийн operational UX-д чухал жишиг юм. `eStudent` нь 50K+ download, хуваарь, даалгавар, шалгалтын мэдээлэл, chat, цахим хичээл зэргийг багтаадаг; `eParent` нь 100K+ download, ирц, даалгавар, шалгалтын дүн, төлбөр, chat зэрэг мэдээллийг эцэг эхэд харуулдаг. Харин eParent-ийн rating 2.8/5 (307 review) бөгөөд нийтэд харагдах сэтгэгдлүүдэд удаан ачааллах, найдвартай байдал, багшийн data-entry тогтмол бус байх асуудал гарсан. Pi-ийн дүгнэлт: эцэг эхийн интерфэйсийг “бүх data”-гаар дүүргэхээс илүү, баталгаатай, ойлгомжтой weekly digest болго; багшийн entry хугацааг 1–2 минутаас хэтрүүлэхгүй. [eStudent](https://play.google.com/store/apps/details?hl=en&id=dem.eschool.estudent), [eParent](https://play.google.com/store/apps/details?hl=en&id=dem.eschool.eparent), [eTeacher](https://play.google.com/store/apps/details?id=dem.eschool.eteacher)

## 3. Ном, PDF, access control

Өмнөх digital-book тайлан дахь “Монголд DRM хэн ч хэрэглэдэггүй”, “Mbook 130,000₮/сар” гэдэг нь баталгаатай биш/буруу. Одоогийн Mbook-ийн public product page 750+ цахим, аудио, товч бүтээлтэй subscription-ийг 14,900₮/сар гэж харуулдаг; app-аар офлайн сонсох боломж, 3 хүртэлх төхөөрөмжийн access гэж тусламжийн хуудсанд бичжээ. [Mbook product page](https://www.m-book.mn/Oroigui-sum), [Mbook help](https://help.m-book.mn/)

Pi-д авах зөв шийдвэр нь:

- Номыг бүтэн public PDF болгон татуулахгүй; book → chapter → problem/solution эрхээр гаргана.
- Энэ нь piracy-г бүрэн арилгахгүй. Screenshot, дахин шивэх, зураг авахыг техникийн аргаар бүрэн хааж болохгүй.
- Иймд access-control-ийн зорилго нь “болзошгүй хуулбарыг 0 болгох” биш, баталгаатай төлбөртэй хэрэглэгчид илүү хурдан сурах utility (hint, retry, хувийн error history, багшийн feedback)-г өгөх юм.
- Эхний шатанд server-side permission, short-lived signed asset URL, audit log, watermark бүхий preview хангалттай; өндөр өртөгтэй DRM эсвэл PDF хамгаалагчийг MVP-д бүү ав.

## 4. Facebook ба acquisition

Public Facebook index нь pricing survey хийх найдвартай суурь биш. Тодорхойлогдсон ажиглалт бол дараах positioning хэлбэрүүд: “ЭШ бэлтгэл”, зорилтот оноо (500+/600+/700+), багшийн туршлага, бага/дэд бүлэг, live/online convenience, хөнгөлөлт, шинэ intake. iMath болон Lumina-ийн өөрийн public хуудсууд оноо-зорилт, багштай эсвэл self-paced сургалтыг энэ хэлбэрээр илэрхийлдэг. [iMath](https://imath.mn/), [Lumina](https://www.lumina.mn/)

Pi-ийн 2027 acquisition-д дараах хяналтын хүснэгт хэрэгтэй. Энэ бол нэг удаагийн Google search биш, 8 долоо хоногийн first-party research юм.

| Долоо хоног бүр бичих талбар | Яагаад |
|---|---|
| Хуудас, огноо, хичээл, grade | Хэн ямар сегментэд зарлаж байгааг харна |
| Санал (free mock, discount, багш, жижиг бүлэг) | Conversion message-ийг ангилна |
| Үнэ, хугацаа, уулзалтын давтамж | Үнэний snapshot үүсгэнэ |
| CTA (comment, DM, form, phone, landing page) | Pi-ийн funnel-тэй харьцуулна |
| Post type, reaction/comment/share | Creative winner-ийг qualitative байдлаар олно |
| Claim-ийн proof link | “800 оноо” зэрэг амлалтыг outcome баримтаас ялгана |

Эхний paid campaign-ийн санал: “Үнэгүй ЭШ diagnostic → 3 сул чадвар + 7 хоногийн plan”. “800 оноо амлана” гэдэг хэллэгийг ашиглахгүй. Эхний зорилт нь reach биш, test completion rate, completed-test-to-registration rate, registration-to-paid rate байх ёстой.

## 5. Жижиг зах зээлийн олон улсын харьцуулалт

### Казахстан: full curriculum + exam prep + role ecosystem

BilimLand нь интерактив хичээл, цахим сурах бичиг, виртуал лаборатори, ЕНТ бэлтгэл, parent/student tools-ийг нэг экосистемд багтаадаг. Тус сайт нь 102,380 educational resource, 40,000+ interactive lesson гэж мэдээлдэг; 90 өдөр 4,490₸, 180 өдөр 7,990₸, 365 өдөр 14,290₸ гэсэн public subscription мөн харагдана. Энэ үнийг Монголд шууд хөрвүүлж тавихгүй — улс, орлого, subsidy, content scale өөр. Харин суралцах зүйл нь гэр бүлд нэг ойлгомжтой subscription, curriculum + test + feedback-ийн багц, мөн role-specific surface юм. [BilimLand courses](https://bilimland.kz/ru/courses), [BilimLand subscription](https://bilimland.kz/ru/subscribe)

### Гүрж, Узбекистан: official exam platform нь product moat биш

Georgia-ийн NAEC 2026 entrance-exam registration болон үр дүнгийн official онлайн сувагтай; Uzbekistan-ийн UZBMB нь registration/official test administration-ийн мэдээлэл өгдөг. Эдгээр нь Pi-д “төрийн шалгалтын мэдээлэл” дээр өрсөлдөх бус, сурагчийн **бэлтгэх явц, тайлбар, давталт** дээр үнэ цэнэ бий болгох ёстойг батална. [Georgia NAEC](https://online.naec.ge/), [Uzbekistan UZBMB](https://uzbmb.uz/page/talabgorlar_uchun_eslatma)

## 6. Дэлхийн IA-аас шууд авах дүрэм

Том платформын menu-г хуулбарлах биш, дараах role-logic-ийг хэрэгжүүл.

| Хэнд | Home дээр эхэнд харагдах зүйл | Баримттай жишиг | Pi.mn-ийн шийдэл |
|---|---|---|---|
| Сурагч | Ойрын хугацааны ажил, яг одоо эхлэх зүйл | Google Classroom-ийн “Due soon” нь 7 хоногийн доторх даалгаврыг гаргадаг; Khan Learner Home нь active/өндөр идэвхтэй ажлыг түрүүлж харуулдаг. | “Өнөөдрийн 3 ажил”, дуусах хугацаа, retry хийх 1–2 бодлого. |
| Багш | Review хийх сурагч/ажил, class insight | Classroom Teaching view нь recently due, class highlights-аар багшийн ажлыг эхлүүлдэг. | “Анхаарах 5 сурагч”, баталгаажуулах result, алдааны сэдвийн heatmap. |
| Эцэг эх | Missing/upcoming work-ийн богино тойм | Classroom guardian summary нь missing, upcoming work, class activity-г email-ээр өгдөг. | Долоо хоногт 1 удаа: ирц, хийсэн/дутуу, 1 ахиц, дараагийн focus. |
| Админ | Системийн management, learner nav-аас тусгаар | Classroom admin view нь school-wide analytics-аар ялгагддаг. | Admin-ын олон module-г student nav-д бүү оруул; role-specific sidebar ашигла. |

Эх сурвалж: [Google Classroom homepage](https://support.google.com/edu/classroom/answer/17231999), [guardian summaries](https://support.google.com/edu/classroom/answer/6388136), [Khan Learner Home](https://support.khanacademy.org/hc/en-us/articles/360030629852-What-is-my-Learner-Home-page-and-what-can-I-do-there), [Duolingo learning path](https://blog.duolingo.com/new-duolingo-home-screen-design/).

## 7. Asia exam-prep: хэрэгжүүлэх ёстой ба хэрэгжүүлэхгүй зүйл

**Хэрэгжүүлэх: hybrid paper-to-digital.** Kumon Connect нь сурагч таблет, stylus-оор worksheet хийж, parent нь Study Records/History-аар progress хянах боломжийг үзүүлдэг; myKumon portal нь parent overview өгдөг. Pi-ийн хувьд энэ санааг хямдхан хувилбараар хэрэгжүүл: эхлээд цаасан сорилын score, skill, mistake label-ийг багш 1–2 минутад гараар оруулна. OCR/OMR-ийг adoption батлагдсаны дараа судал. [Kumon Connect](https://www.kumon.com/resources/how-kumon-connect-works/), [Kumon progress](https://www.kumon.com/resources/understanding-student-progress-in-kumon-what-to-look-for-and-where-to-find-it/)

**Хэрэгжүүлэх: event data-г эхнээс нь хадгал.** Riiid-ийн EdNet нь 784,309 сурагчийн 131,441,538 interaction, 13,169 problem, 1,021 lecture, 293 skill tag-ийн data-г нээлттэй болгосон. Pi ийм scale-д байхгүй учир neural knowledge tracing-г launch feature болгохгүй. Харин attempt, answer, elapsed time, hint/solution-view, retry, teacher-label, assignment/source гэсэн event-үүдийг эхнээс нь алдагдуулахгүй хадгал. Энэ нь хожмын rule-based болон ML personalization-ийн суурь болно. [EdNet official repository](https://github.com/riiid/ednet), [EdNet paper](https://arxiv.org/abs/1912.03072)

**Хойшлуулах: “AI tutor” маркетинг ба micro-skill хэт задлалт.** Pi-ийн одоогийн content/data хэмжээнд эхний 10–30 priority skill, source-verified answer, багшийн засварын label илүү чухал. Skill graph-ийг 100–200 node-оор эхлүүлж, хэрэглэгчийн бодит алдаанаас тэл. Багшийн шалгаагүй LLM-ийн урт бодолтыг шууд зөв хариу мэт бүү гарга.

## 8. Pi.mn-ийн эцсийн product ба бизнесийн шийдвэр

### MVP-д заавал хийх

1. **ЭШ fidelity:** 100-minute timed mock, A–D болон numeric response, save/resume, test-version, бодлогын source/answer status.
2. **Result-to-action:** score гэдгээс гадна 3 weak skill, алдааны type, богино explanation, 2–3 follow-up question, 7-day plan.
3. **Teacher operating loop:** paper/online result entry, flagged-student list, check/review queue, нэг ангийн topic heatmap.
4. **Parent trust loop:** ганцхан weekly digest, мэдэгдлийн preference, төлбөр/ирц/даалгаврын state ил тод.
5. **Content QA:** question бүр source, answer status, skill, difficulty evidence, review owner/dated audit-тэй.

### MVP-д хийхгүй

- Бүх subject marketplace
- Автомат answer OCR/OMR
- Нотолгоогүй score guarantee
- Багшийн шалгалтгүй AI-generated full solution
- DRM-ийг гол борлуулалтын аргумент болгох
- 6,000 бодлогыг нэг дор “AI adaptive” гэж нэрлэх

### Эхний 90 хоногийн хэмжүүр

| Үе | Туршилт | Амжилтын бодит хэмжүүр |
|---|---|---|
| 0–30 өдөр | 1 diagnostic, 3 full mock, 10 skill дээр QA | test completion; timer/resume failure; answer-review coverage |
| 31–60 өдөр | 20–40 сурагчтай internal/hybrid cohort | 7/28 хоногийн return; багшийн result-entry time; assigned follow-up completion |
| 61–90 өдөр | Free diagnostic → paid pass funnel | completed-test-to-registration; registration-to-paid; cohort renewal; parent feedback |

## Өмнөх файлуудаас хүчингүй болгох/болгоомжлох claim

| Файл | Хуучин claim | Эцсийн шийдвэр |
|---|---|---|
| `m02` | Integral 500+ problem; YESH 62k test/30k active/88% high scorer; “зөвхөн хоёр нь LaTeX” | Integral өөрөө ~10k problem гэж мэдээлдэг. YESH-ийн marketing usage/achievement тоо хөндлөн баталгаагүй. LaTeX coverage-ийг бүх платформоор code audit хийгээгүй тул ranking claim хийхгүй. |
| `m03` | Skuul 0 download, abandoned; YESH 86K | Skuul Play дээр 1K+, 2026 update. YESH Play дээр 100K+ download. App install band-ыг active learner, revenue, learning outcome гэж тайлбарлахгүй. |
| `m04` | Facebook-ийн 95/45/30/20% prevalence; 2026 price bands | Representative sample байхгүй, хаяна. Old 8×100 price-ийг current price гэж хэрэглэхгүй. |
| `m05` | Монголд DRM байхгүй; Mbook/BookHub 130k/сар | DRM-н universal absence батлагдаагүй. Mbook-ийн public subscription 14,900₮/сар; BookHub-ийн current price/access тусад нь батлагдаагүй. |
| `m07` | Олон улсын platform-уудын status, USD price ranges | Official site-ээр батлагдсан BilimLand, NAEC, UZBMB-ийн ажиллах зарчим л ашиглана. Сул эх сурвалжтай platform valuation/acquisition claim-ийг strategy-д ашиглахгүй. |
| `m08` | “world-class” nav count зэрэг өргөн generalization | Official Khan, Classroom, Duolingo pattern-ийг л ашиглана: role-specific home, due/recommended task first, guardian digest. |
| `m09` | Company valuation, market status, 10,000+ knowledge point зэрэг олон marketing claim | Kumon/EdNet-ийн documented pattern-ийг л design input болгоно. Pi-д simple event data + teacher workflow нь AI claim-ээс урьтал. |

## Эх сурвалж

1. Боловсролын үнэлгээний төв. [2026 оны шинэ элсэгчдэд зориулсан мэдээ](https://www.eec.mn/cat/for-new-enrollers). Accessed 2026-09-15.
2. YESH. [Цахим ЭШ 2026](https://yesh.mn/quick-test); [Google Play](https://play.google.com/store/apps/details?id=com.yesh); [App Store](https://apps.apple.com/mn/app/yesh-mn/id1556433230). Accessed 2026-09-15.
3. Сэлүүн Санаа ХХК. [iMath](https://imath.mn/); [сургалтын тайлбар](https://imath.mn/nv/mathlearning); [багштай анги](https://imath.mn/surgalt/7). Accessed 2026-09-15.
4. Expontmind Solutions. [Lumina](https://www.lumina.mn/); [ЭШ тест](https://www.lumina.mn/mock-test). Accessed 2026-09-15.
5. Integral Онлайн ХХК. [Монгол Бодлогын Сан — танилцуулга](https://integral.mn/about); [бодлогууд](https://integral.mn/problems). Accessed 2026-09-15.
6. BLesson. [Давтлага хичээл](https://blesson.mn/). Accessed 2026-09-15.
7. e-surgalt.com. [Нүүр](https://www.e-surgalt.com/). Accessed 2026-09-15.
8. Eduten. [Eduten Mongolia](https://eduten.com/mn/). Accessed 2026-09-15.
9. Melearn. [Нүүр](https://melearn.mn/); [Google Play](https://play.google.com/store/apps/details?id=com.bilguun.melearn). Accessed 2026-09-15.
10. Digital Edu Management LLC. [eStudent](https://play.google.com/store/apps/details?hl=en&id=dem.eschool.estudent); [eParent](https://play.google.com/store/apps/details?hl=en&id=dem.eschool.eparent); [eTeacher](https://play.google.com/store/apps/details?id=dem.eschool.eteacher). Accessed 2026-09-15.
11. Mbook. [Subscription/product](https://www.m-book.mn/Oroigui-sum); [тусламж](https://help.m-book.mn/). Accessed 2026-09-15.
12. BilimLand. [Courses](https://bilimland.kz/ru/courses); [subscription](https://bilimland.kz/ru/subscribe). Accessed 2026-09-15.
13. National Assessment and Examinations Center, Georgia. [Online NAEC](https://online.naec.ge/). Accessed 2026-09-15.
14. Uzbekistan Knowledge and Qualifications Assessment Agency. [Applicant guidance](https://uzbmb.uz/page/talabgorlar_uchun_eslatma). Accessed 2026-09-15.
15. Google. [Classroom homepage](https://support.google.com/edu/classroom/answer/17231999); [guardian summaries](https://support.google.com/edu/classroom/answer/6388136). Accessed 2026-09-15.
16. Khan Academy. [Learner Home](https://support.khanacademy.org/hc/en-us/articles/360030629852-What-is-my-Learner-Home-page-and-what-can-I-do-there). Accessed 2026-09-15.
17. Duolingo. [Home screen redesign](https://blog.duolingo.com/new-duolingo-home-screen-design/). Accessed 2026-09-15.
18. Kumon. [Kumon Connect](https://www.kumon.com/resources/how-kumon-connect-works/); [student progress](https://www.kumon.com/resources/understanding-student-progress-in-kumon-what-to-look-for-and-where-to-find-it/). Accessed 2026-09-15.
19. Riiid. [EdNet repository](https://github.com/riiid/ednet); [EdNet paper](https://arxiv.org/abs/1912.03072). Accessed 2026-09-15.
