# v0.7 · Шаардлагын шүүмжлэл ба алдааны аудит

2026-09-24. Энэ нь шаардлага/зураглалын desk review; production penetration test, runtime аудит, эсвэл бүх алдааг илрүүлсэн баталгаа биш. Одоогийн кодын бүртгэл CURRENT-CODE-INVENTORY.md-д тусдаа. Шинэ дүрэм хэрэгжсэн гэж тооцохгүй.

## 1. Яг одоо зассан зөрчлүүд

1. Шар/алтлаг брэндийн санал хүчингүй; v0.6 эх баримт ба блокийг зассан. Instagram эх зургийн ажиглалт хэвээр, брэндийн шийдвэр биш.
2. Атласын цэгэн чимэглэлийн фон арилсан. Координатын бодит графикт тор байж болно.
3. График симуляторыг фото solver-оос тусгаарласан. Фото solver/сурагчийн AI V2 хэвээр.
4. Төлбөрийн API ба банкны хуулгын хоёр сувгийг нэгтгэх зайлшгүй дүрмийг тодорхойлов; онлайн худалдан авалт бүрийг багшаар батлуулахгүй.
5. Хуваарь татах ба гараар бичихийг тусдаа үйлдэл болгосон. 10 минутын мэдэгдэл нь санал болгосон debounce дүрэм; production feature биш.
6. Хэрэглэгчийн ажиллагаа, хөгжүүлэх TODO, судалгааны нотолгоо, backend зураг төслийн дарааллыг тусад нь хадгалав.

## 2. Эрсдэл → дүрэм → шалгах нөхцөл

P0: мөнгө, өгөгдөл, эрх, шалгалтын үнэн зөвд нөлөөлөх; P1: гол ажлыг таслах; P2: чанар/тав тух. Бүгд төлөвлөсөн шалгалт; доорх нь PASS runtime үр дүн биш.

| ID | Эрсдэл / эрэмбэ | Заавал барих дүрэм | Туршилтын жишээ |
|---|---|---|---|
| F01 | Давхар төлбөр P0 | Provider reference болон bank transaction холбоостой; нэг allocation нэг л удаа | Callback 3 удаа + ижил шилжүүлэг хуулгаар орох → эрх нэг удаа |
| F02 | Хуурамч callback P0 | Server provider-оос дүн, валют, merchant, төлөв шалгана | Зөв invoice ID боловч буруу дүн → эрх нээгдэхгүй |
| F03 | Нэг утас олон хүүхэд P0 | Утас нь unique identity биш; ambiguous queue | Ах дүү ижил эцэг эхийн дугаартай → автоматаар нэгэнд оноохгүй |
| F04 | Partial/илүү төлөлт P0 | Paid amount ба applied amount тусдаа | 300k нэхэмжлэлд 200k+100k; 400k-д үлдэгдлийн шийдвэр |
| F05 | Буцаалт/цуцлалт P0 | Ledger эсрэг бичилт, өмнөхийг overwrite хийхгүй | Эрх ашигласны дараах refund → баталсан бодлогоор |
| F06 | Гэрээний хоног P0 | Policy version, timezone, billable attendance ялгана | 5-нд төлөх, 8-ны 23:59 зөвшөөрнө; 9-ний 00:00 хаах дүрэм батлах |
| F07 | Өвчтэй/тасалсан хоног P0 | Гэрээнээс баталсан сунгалтын дүрэм | Өвчний статус хожим засахад өмнөх дүн/төлбөр аудиттай |
| F08 | Анги шилжилтийн эрх P0 | Membership effective date, хуучин group scope | Шилжсэн багш шинэ private тэмдэглэл харахгүй |
| F09 | Гаднын багшид дотоод дата P0 | External group scope тусдаа | Танхимын сурагч гаднын бүлэгт → төлбөр/дотоод notes харагдахгүй |
| F10 | Эцэг эхийн холбоос P0 | Guardian холбоос баталгаатай | Өөр child ID явуулах → харахгүй |
| F11 | Хуучин ID солих P0 | Dry run mapping, collision report, rollback | Leading zero, давхардсан нэр/ID; түүхээ алдахгүй |
| F12 | Бодлого засахад түүх өөрчлөгдөх P0 | Attempt нь question revision ба answer key snapshot-тай | Хариу зассан ч хуучин анхны дүн тайлбартай хэвээр |
| F13 | Шалгалтын цаг P0 | Server deadline/accepted time authoritative | Утасны цагийг 10 минут ухраахад нэмэлт хугацаагүй |
| F14 | Давхар submit/late retry P0 | Attempt finalization idempotent | Хугацаанд илгээсэн хүсэлтийн retry-г давхар дүн болгохгүй |
| F15 | Сүлжээгүй final submit P0 | Local draft ≠ server accepted; төлөв ил тод | Offline дуустал бичсэн → батлагдсан submission гэж бүү харуул |
| F16 | OMR импорт P0 | File hash, exam version, ID mapping preview | Нэг файл 2 удаа, танигдаагүй ID, буруу A/B → нийтлэхгүй |
| F17 | Сэдвийн буруу тайлан P1 | Ангиллын хувилбар, онооны denominator | 2 бодлоготой сэдвээс «чадваргүй» гэж дүгнэхгүй |
| F18 | Хариу задрах P0 | Solution visibility server policy | Шалгалт дуусаагүй API-аас зөв хариу татах боломжгүй |
| F19 | Фото upload тасрах P1 | Draft/processing/ready ялгана | 5-аас 3 зураг дуусав → бүтэн илгээсэн гэж тооцохгүй |
| F20 | Хортой/хэт том файл P0 | MIME/signature/size/page limit, parser isolation | PDF гэж нэрлэсэн өөр файл, олон мянган page → reject |
| F21 | Байнгын зураг устах P0 | Content asset ба student evidence retention тусдаа | 30 хоногийн cleanup номын asset ID-д хүрэхгүй |
| F22 | Маргаантай ажил устах P1 | Review hold, purge audit | Hold идэвхтэй байхад expiry хүрэх → үлдэнэ |
| F23 | PDF хэмжээг хоёр тооцох P1 | Original+preview+PDF+backup бүр budget-д | Compression нэрээр double storage нуухгүй |
| F24 | Багш давхар дүгнэх P1 | Revision check + conflict UI | Хоёр багш зэрэг хадгалах → сүүлийнх чимээгүй дарахгүй |
| F25 | Анхны зөв ба хийсэн хувь P0 | Accuracy, completion тусдаа утга | Эхлээд буруу, дараа зассан → анхны accuracy нэмэгдэхгүй |
| F26 | Онолын ээлж P1 | Irts snapshot + skipped очередь | 3 тасалсан,4 хийсэн,3 ирсэн →3; дахин4-ийг давтахгүй |
| F27 | Ирүүлсэн тоо P1 | Нэг сурагч/багцын unique final submission | Re-upload 3 удаа →1; enrolled snapshot denominator |
| F28 | Төлөвлөсөн = орсон P0 | Planned session ба actual record тусдаа | Багш сэдэв оруулаагүй бол автоматаар «үзсэн» биш |
| F29 | Давтамж/амралт P1 | Effective version + exception; calendar source | Тавдугаар сарын шинэ цаг 9-р сарын түүх өөрчлөхгүй |
| F30 | Давхцал P1 | Багш/өрөө/анги/салбарын цагийн шалгалт | Хоёр салбар руу 0 минутын зайтай → warning/block дүрэм |
| F31 | Хуучирсан notification P1 | Latest revision, cancel, recheck recipients | 20:00→20:04 өөрчилсөн →20:14 нэг эцсийн message |
| F32 | Worker restart P1 | Durable pending job, idempotent delivery | 20:13 worker унтрав →сэргэхэд зөв revision-г илгээх |
| F33 | Давхар цалин P0 | Actual approved interval, rate version | Нэг багшийн давхацсан 2 class цагийг 2 дахин цалин болгохгүй |
| F34 | Хуваарь экспорт P1 | Role-filtered snapshot | Сурагчийн PDF-д staff-only note/цалин байхгүй |
| F35 | CSV formula injection P0 | Text export escaping | =,+,-,@ эхэлсэн user text spreadsheet formula болж ажиллахгүй |
| F36 | Tab counter буруу дүгнэлт P1 | Visibility event бол нотолгоо биш | Утасны lock/call → cheating гэж автоматаар шийтгэхгүй |
| F37 | Screenshot хамгаалалт P1 | Browser бүх screenshot-г найдвартай тоолохгүй | OS capture-ийг барина гэсэн амлалтгүй; watermark/access audit |
| F38 | Backup байгаа ч сэргээхгүй P0 | Restore drill, RPO/RTO батлах | DB/media metadata сэргээж холбоос ба эрхийг шалгах |
| F39 | 5000 зэрэг шалгалт P0 | Autosave/submit workload capacity gate | Arrival burst, reconnect storm, deadline batch, degraded worker |
| F40 | Хэт өргөн судалгаа P2 | Feature бүр evidence/status/owner-той | «Бүгд судалсан» гэж бичихийн оронд нээлттэй мөр үлдээх |

Tab visibility-ийн бодит боломжийн эх: [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API). Browser-ийн hidden event нь юуг үзсэн, screenshot хийсэн, хуулсан эсэхийг нотлохгүй. Бусад мөр нь Pi.mn-д санал болгосон domain дүрэм ба тест, provider-ийн баталгаа биш.

## 3. Давхардал ба шаардлагагүй ажлыг багасгах

| Хэсгүүд | Аудитын шийдвэр / санал |
|---|---|
| schedule-daily / schedule-proposal / next-topic-rule | Нэг ажлын дэлгэцийн хэсгүүд болгох; тус бүр тусдаа production цэс хэрэггүй |
| day / lesson-bundle | Нэг удаа сонгоод онол, ангид хийх, гэрийн даалгаврыг урьдчилан бөглөх; тусдаа 3 form давтуулахгүй |
| payments / bank-reconcile / instant-commerce | Нэг санхүүгийн үндсэн бүртгэл, хоёр intake суваг; онлайнд manual approval дараалалгүй |
| communications / mail-notify / notification-delay | Нэг notification төв, сувгийн adapter; V1 SMS оруулахгүй |
| staff-board / centre-calendar / schedule | Холбоостой ч daily task, том event, teaching slot тусдаа төрлүүд; бүгдийг class болгохгүй |
| public-story / brand-assets / brand-evidence | Нэг editorial эх ба brand register; 3 админ CMS барихгүй |
| Фото→PDF ба compressed фото | Homework хувилбар сонгоогүй; teacher нэмэлт бодлогын PDF шаардлага хэвээр; duplicate хадгалалтын төсөв ил тод |
| Screenshot count, «100% uptime», «алдаагүй AI» | Баталж чадах амлалт болгон бүү оруул; хэмжүүр/хязгаар/fallback тодорхойл |
| Хүнд 3D hero, scroll hijacking, бүх card анимац | V1 хүрээнээс хасах санал; үндсэн ажлын үр дүнд бага ач холбогдолтой |
| AI зөвлөх, фото solver, personal planner, online class, ML export | V1-д орохгүй гэсэн өмнөх шийдвэр хүчинтэй |
| Гол математикийн graph | Тусдаа жижиг pilot; V1-д оруулах эсэх нээлттэй |
| 5000 хүнтэй болохоос өмнө олон microservice | Эхлээд модуль/ownership/ачааллын хэмжилт; технологийн дуурайлт нь хэрэгцээ биш |

## 4. Нээлттэй шийдвэр ба дараагийн гарц

Шаардлагын гол зөрчлийг тодруулсан боловч audit дууссан ≠ бүтээгдэхүүн бэлэн. P0 дүрэм бүрийн эзэн, contract source, acceptance test-ийг батлах шаардлагатай. Шийдээгүй policy дээр migration/production код эхлүүлэхгүй; хамааралгүй architecture судалгааг үргэлжлүүлж болно.

Ялангуяа: гэрээний billing өдөр; partial/refund; хүүхдийн түүх хадгалах эрх/хугацааны бодлого; homework expiry/hold; exam retry/offline cutoff; хуваарийн 10 минутын emergency override; simulator scope; яг V1-д гаргах staff planner/time/payroll хамрах хүрээ. BACKEND-PLANNING-HANDOFF.md-д эдгээрийн эзэн ба дарааллыг тодруулав.
