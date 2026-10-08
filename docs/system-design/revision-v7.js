/* v0.7 requirements and research only. */
(function(root){const maps=[
 {
  "id": "design-evidence",
  "title": "74 · Өнгө ба хэрэглээний нотолгоо",
  "summary": "Шар/алтлаг акцент, дэвтрийн дөрвөлжин болон давтагдсан цэгэн фон хэрэглэхгүй. Master логоны хөхийг эх болгоно.",
  "lanes": [
   "Үйлдлүүд дээрээс доош · хариуцагч блок бүрд"
  ],
  "nodes": [
   {
    "id": "V7D01",
    "lane": 0,
    "row": 0,
    "title": "Брэндийн шинэ хязгаарыг мөрдөнө",
    "actor": "Дизайнер",
    "detail": "Шар/алтлаг акцент, дэвтрийн дөрвөлжин болон давтагдсан цэгэн фон хэрэглэхгүй. Master логоны хөхийг эх болгоно.",
    "record": "Brand decision record",
    "accept": "Постын өнгийг байгууллагын өнгө гэж үзэхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7D02",
    "lane": 0,
    "row": 1,
    "title": "Мэргэжлийн хэрэгслээр хувилбар бэлдэнэ",
    "actor": "Дизайнер",
    "detail": "Adobe Color → Realtime Colors → contrast QA. Шинэ HEX-ийг AI-аас тааж батлахгүй; хоёр дэлгэц дээр харьцуулна.",
    "record": "Palette export + source + approval",
    "accept": "Өнгөний үүрэг, focus/error, Ө/Ү уншигдах чанар шалгасан байна.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7D03",
    "lane": 0,
    "row": 2,
    "title": "Шүүмжлэлийг хэрэглээний шалгуур болгоно",
    "actor": "UI/UX",
    "detail": "Reddit-ийн түүвэр нь consensus биш. Generic card, over-animation, scroll hijacking-аас зайлсхийх; task success-ийг хэмжих.",
    "record": "Critique → acceptance matrix",
    "accept": "Гоё харагдалт дангаараа GO шийдвэр биш.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7D04",
    "lane": 0,
    "row": 3,
    "title": "Нүүр ба ажлын дэлгэцээр батална",
    "actor": "Эзэн / дизайнер",
    "detail": "Нүүрэнд бодит орчин, багш, амжилт; өдөр тутмын ажилд нягт хүснэгт, тайван surface.",
    "record": "Screen proofs",
    "accept": "Багшийн өнгө/статусыг нэргүй дангаар харуулахгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7M05",
    "lane": 0,
    "row": 4,
    "title": "Сан сонгох pilot хийнэ",
    "actor": "Инженер / багш",
    "detail": "JSXGraph MIT browser pilot санал; Desmos/GeoGebra commercial лиценз ба quote-г тусад нь харьцуулна.",
    "record": "License, cost, mobile QA",
    "accept": "Үнэгүй website гэдгийг commercial embedding үнэгүй гэж үзэхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7D01",
    "to": "V7D02"
   },
   {
    "from": "V7D02",
    "to": "V7D03"
   },
   {
    "from": "V7D03",
    "to": "V7D04"
   },
   {
    "from": "V7D04",
    "to": "V7M05"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "TODO → Судалгаа",
  "source": "DESIGN-AND-SIMULATION-RESEARCH.md",
  "kind": "planning",
  "navigationGroup": "public",
  "scope": "Хувилбар шийдэх"
 },
 {
  "id": "homepage-interactions",
  "title": "75 · Нүүрийн фото ба хэрэгтэй хөдөлгөөн",
  "summary": "Багш самбарт тайлбарлаж буй бодит зураг, байгууллагын нэр, элсэлтийн гол мэдээлэл. Нэг зорилготой эхний дэлгэц.",
  "lanes": [
   "Үйлдлүүд дээрээс доош · хариуцагч блок бүрд"
  ],
  "nodes": [
   {
    "id": "V7H01",
    "lane": 0,
    "row": 0,
    "title": "Сургалтын төвтэй танилцана",
    "actor": "Зочин",
    "detail": "Багш самбарт тайлбарлаж буй бодит зураг, байгууллагын нэр, элсэлтийн гол мэдээлэл. Нэг зорилготой эхний дэлгэц.",
    "record": "Hero content + image source",
    "accept": "Hero хүлээлгэж товч даруулахгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7H02",
    "lane": 0,
    "row": 1,
    "title": "Орчин ба замаа харна",
    "actor": "Зочин",
    "detail": "Салбарын гадна зураг, танхим, хаяг, цаг. Фото тайлбар нь очиход хэрэгтэй мэдээлэлтэй.",
    "record": "Branch gallery",
    "accept": "Зураггүй/сул сүлжээнд хаяг текстээр харагдана.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7H03",
    "lane": 0,
    "row": 2,
    "title": "Он оны амжилтыг шүүнэ",
    "actor": "Зочин",
    "detail": "Он, хичээл, оноо; 800 жижиг тусгай тэмдэгтэй, шаргүй. Зөвшөөрөлтэй portrait ба эх оноо.",
    "record": "Achievement index",
    "accept": "Зохиомол оноо, тасралтгүй анивчилтгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7H04",
    "lane": 0,
    "row": 3,
    "title": "Төвийн нэг өдрийг үзнэ",
    "actor": "Зочин",
    "detail": "Онол → бодлого → даалгавар → багшийн шалгалт. Native scroll, богино reveal; reduced motion үед бүтэн статик.",
    "record": "Story sections",
    "accept": "Scroll бүр API request=0; контентыг animation-оор түгжихгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7H05",
    "lane": 0,
    "row": 4,
    "title": "Хэрэгтэй ялгааг харьцуулна",
    "actor": "Сурагч / зочин",
    "detail": "Before/after slider зөвхөн эх/тайлбарласан геометр зэрэг утгатай хос зурагт. Drag, keyboard, тусдаа бүтэн зураг гэсэн fallback.",
    "record": "Image pair + purpose",
    "accept": "Mobile дээр чирэхгүйгээр ч ялгааг үзэж чадна.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7H01",
    "to": "V7H02"
   },
   {
    "from": "V7H02",
    "to": "V7H03"
   },
   {
    "from": "V7H03",
    "to": "V7H04"
   },
   {
    "from": "V7H04",
    "to": "V7H05"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "Хэрэглэгчийн ажиллагаа",
  "source": "DESIGN-AND-SIMULATION-RESEARCH.md",
  "kind": "operation",
  "navigationGroup": "public",
  "scope": "Хувилбар шийдэх"
 },
 {
  "id": "math-simulation",
  "title": "76 · Функц ба геометрийг турших",
  "summary": "Функц, парабол, sin/cos, шүргэгч, геометр. Бодлогын ID ба тайлбартай; фото solver-оос тусдаа.",
  "lanes": [
   "Үйлдлүүд дээрээс доош · хариуцагч блок бүрд"
  ],
  "nodes": [
   {
    "id": "V7M01",
    "lane": 0,
    "row": 0,
    "title": "Сэдвээс симулятор нээнэ",
    "actor": "Сурагч",
    "detail": "Функц, парабол, sin/cos, шүргэгч, геометр. Бодлогын ID ба тайлбартай; фото solver-оос тусдаа.",
    "record": "Topic → simulation ID",
    "accept": "V1 хүрээ шийдээгүй; шалгалтад policy зөвшөөрөөгүй бол хаалттай.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7M02",
    "lane": 0,
    "row": 1,
    "title": "Параметр өөрчилж ажиглана",
    "actor": "Сурагч",
    "detail": "Графикийг браузерт бодох; slider, keyboard input, reset. Координатын тор зөвхөн график дотор.",
    "record": "Parameters + bounds",
    "accept": "Slider хөдөлгөх бүр server API дуудахгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7M03",
    "lane": 0,
    "row": 2,
    "title": "Тайлбартай холбож ойлгоно",
    "actor": "Сурагч",
    "detail": "Ямар коэффициент юу өөрчилснийг харуулна; багшийн баталсан математик жишээ, Монгол нэршил.",
    "record": "Teacher reviewed example revision",
    "accept": "Domain, radians/degrees, asymptote буруу дүрслэхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7M04",
    "lane": 0,
    "row": 3,
    "title": "Хадгалах эсвэл дахин эхэлнэ",
    "actor": "Сурагч",
    "detail": "Тусгай save үйлдлээр зөвхөн параметрийн жижиг state; нээлтэд dependency lazy load, failure үед тайлбар зураг.",
    "record": "Saved state / reset",
    "accept": "Tool outage үндсэн бодлого хийхийг зогсоохгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7M01",
    "to": "V7M02"
   },
   {
    "from": "V7M02",
    "to": "V7M03"
   },
   {
    "from": "V7M03",
    "to": "V7M04"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "Хэрэглэгчийн ажиллагаа",
  "source": "DESIGN-AND-SIMULATION-RESEARCH.md",
  "kind": "operation",
  "navigationGroup": "content",
  "scope": "Хувилбар шийдэх"
 },
 {
  "id": "schedule-export",
  "title": "77 · Хуваарь гараар засах ба татах",
  "summary": "Ганц occurrence / энэ өдрөөс хойшхи series ялгана. Ноорог эсвэл нийтэлсэн revision тодорхой.",
  "lanes": [
   "Үйлдлүүд дээрээс доош · хариуцагч блок бүрд"
  ],
  "nodes": [
   {
    "id": "V7X01",
    "lane": 0,
    "row": 0,
    "title": "Өдөр ба засах хүрээг сонгоно",
    "actor": "Schedule.manage эрхтэй хүн",
    "detail": "Ганц occurrence / энэ өдрөөс хойшхи series ялгана. Ноорог эсвэл нийтэлсэн revision тодорхой.",
    "record": "Schedule scope + revision",
    "accept": "Хуучин бодит хичээлийн түүхийг дарж бичихгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7X02",
    "lane": 0,
    "row": 1,
    "title": "Саналыг өөрчилж гараар бичнэ",
    "actor": "Эрхтэй төлөвлөгч",
    "detail": "Сэдэв, багш, анги, өрөө, цаг, тайлбар. Suggestion авах/нэмэх/хасах; чирэхээс гадна form.",
    "record": "Draft change set",
    "accept": "Чөлөөт тайлбар нь structured цаг/анги ID-г эвдэхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7X03",
    "lane": 0,
    "row": 2,
    "title": "Давхцлыг шалгаж нийтэлнэ",
    "actor": "Эрхтэй төлөвлөгч",
    "detail": "Багш/өрөө/анги/салбар, амралт, missing subject; шинэ revision. Core save ба notification intent найдвартай холбогдоно.",
    "record": "Published version + audit",
    "accept": "Зэрэг өөр хүн зассан бол conflict харуулна.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7X04",
    "lane": 0,
    "row": 3,
    "title": "Бэлэн хуваарь татна",
    "actor": "Багш / сурагч",
    "detail": "Сонгосон өдөр/салбар/өөрийн эрхээр PDF хэвлэх. CSV/XLSX/ICS хэрэгцээг батална; файлд version/time орно.",
    "record": "Role-filtered export",
    "accept": "Сурагчид staff note/цалин алдагдахгүй; page break уншигдана.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7X05",
    "lane": 0,
    "row": 4,
    "title": "Хуучин таталтаа танина",
    "actor": "Багш / сурагч",
    "detail": "Дараа өөрчлөгдсөн бол одоогийн revision-г вебээс харна. Татсан PDF автоматаар шинэчлэгдэхгүйг огноогоор ойлгуулна.",
    "record": "Exported at / revision",
    "accept": "Хуучин offline файл шинэ хуваарийн үнэн эх биш.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7X01",
    "to": "V7X02"
   },
   {
    "from": "V7X02",
    "to": "V7X03"
   },
   {
    "from": "V7X03",
    "to": "V7X04"
   },
   {
    "from": "V7X04",
    "to": "V7X05"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "Хэрэглэгчийн ажиллагаа",
  "source": "DESIGN-AND-SIMULATION-RESEARCH.md",
  "kind": "operation",
  "navigationGroup": "staff",
  "scope": "Хувилбар шийдэх"
 },
 {
  "id": "notification-delay",
  "title": "78 · Цаг өөрчлөх → 10 минут → мэдэгдэл",
  "summary": "Draft өөрчлөлтөөс үүсгэхгүй. Өмнөх/шинэ ирэх цаг, үйлчлэх өдөр, анги, revision.",
  "lanes": [
   "Үйлдлүүд дээрээс доош · хариуцагч блок бүрд"
  ],
  "nodes": [
   {
    "id": "V7N01",
    "lane": 0,
    "row": 0,
    "title": "Нийтэлсэн өөрчлөлтөөс intent үүснэ",
    "actor": "Систем",
    "detail": "Draft өөрчлөлтөөс үүсгэхгүй. Өмнөх/шинэ ирэх цаг, үйлчлэх өдөр, анги, revision.",
    "record": "Pending notification",
    "accept": "Notification алдагдсан ч published schedule хадгалагдсан байна.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7N02",
    "lane": 0,
    "row": 1,
    "title": "Сүүлийн өөрчлөлтөөс 10 минут хүлээнэ",
    "actor": "Систем",
    "detail": "20:00 →20:10; 20:04 засав →20:14. Энэ debounce default нь батлах санал; браузер timer-д найдахгүй.",
    "record": "dueAt / latest revision",
    "accept": "Хуучин job revision-г давхар илгээхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7N03",
    "lane": 0,
    "row": 2,
    "title": "Preview, цуцлах эсвэл яаралтай илгээнэ",
    "actor": "Эрхтэй хариуцагч",
    "detail": "Анхны цагт буцвал unsent цуцална. Хичээл эхлэхэд 10 мин хүрэхгүй бол urgent decision; шалтгаан аудиттай.",
    "record": "Cancelled / send now / pending",
    "accept": "Аль хэдийн явсныг цуцалсан мэт үзүүлэхгүй; correction явна.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7N04",
    "lane": 0,
    "row": 3,
    "title": "Эрх ба давхардлыг дахин шалгана",
    "actor": "Delivery worker",
    "detail": "Одоогийн зөв хүлээн авагчид, latest revision, recipient/channel dedupe. Restart/retry-тэй durable job.",
    "record": "Notification ID + recipient key",
    "accept": "Өөр ангид шилжсэн хүүхдэд хуучин ангийн мэдэгдэл очихгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7N05",
    "lane": 0,
    "row": 4,
    "title": "Хүргэлт ба уншсан төлөвийг харна",
    "actor": "Багш / сурагч",
    "detail": "In-app эхний суваг санал; failed/retry/read тусдаа. V1 SMS байхгүй; email/push тусдаа scope.",
    "record": "Delivery status / readAt",
    "accept": "Илгээсэн гэдэг нь уншсан гэсэн үг биш.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7N01",
    "to": "V7N02"
   },
   {
    "from": "V7N02",
    "to": "V7N03"
   },
   {
    "from": "V7N03",
    "to": "V7N04"
   },
   {
    "from": "V7N04",
    "to": "V7N05"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "Хэрэглэгчийн ажиллагаа",
  "source": "DESIGN-AND-SIMULATION-RESEARCH.md",
  "kind": "operation",
  "navigationGroup": "staff",
  "scope": "Хувилбар шийдэх"
 },
 {
  "id": "payment-two-channels",
  "title": "79 · Хоёр төлбөрийн суваг → нэг бүртгэл",
  "summary": "Хоёр суваг заавал байна. Онлайн ном/шалгалт автомат; сургалтын төлбөрийн хуулга preview+review.",
  "lanes": [
   "Худалдан авалт / API / нэгтгэл",
   "Банкны хуулга"
  ],
  "nodes": [
   {
    "id": "V7P01",
    "lane": 0,
    "row": 0,
    "title": "API эсвэл хуулгын суваг сонгоно",
    "actor": "Худалдан авагч / төлбөр хариуцагч",
    "detail": "Хоёр суваг заавал байна. Онлайн ном/шалгалт автомат; сургалтын төлбөрийн хуулга preview+review.",
    "record": "Invoice / intake channel",
    "accept": "Онлайн хэрэглэгч бүрийг багшаар гараар батлуулахгүй.",
    "status": "requested",
    "release": "V1",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7P02",
    "lane": 0,
    "row": 1,
    "title": "API төлбөрийг server баталгаажуулна",
    "actor": "Commerce service",
    "detail": "Provider-оос amount/currency/merchant/status-ыг шалгана. Callback дангаараа үнэн эх биш; retry idempotent.",
    "record": "Verified payment reference",
    "accept": "Хуурамч эсвэл дүн зөрсөн callback эрх нээхгүй.",
    "status": "requested",
    "release": "V1",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7P03",
    "lane": 1,
    "row": 1,
    "title": "Хуулгын мөрийг тулгаж батална",
    "actor": "Төлбөрийн эрхтэй хүн",
    "detail": "File hash, bank reference, ID/утас/дүн; exact/ambiguous/unmatched. Ижил утас ах дүүд байж болно.",
    "record": "Import batch + review decision",
    "accept": "Давхардсан мөрийг дахин орлого болгохгүй.",
    "status": "requested",
    "release": "V1",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7P04",
    "lane": 0,
    "row": 3,
    "title": "Хоёр сувгийн давхардлыг барина",
    "actor": "Commerce service",
    "detail": "Provider payment хуулганд дахин харагдвал нэг төлбөртэй холбоно. Тодорхойгүй match review; partial/overpayment allocation тусдаа.",
    "record": "Payment → allocation ledger",
    "accept": "Мөнгө ба эрх нэг удаа; F01–F05 шалгалт.",
    "status": "requested",
    "release": "V1",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7P05",
    "lane": 0,
    "row": 4,
    "title": "Эрх ба тайланг шинэчилнэ",
    "actor": "Систем",
    "detail": "Atomic allocation/entitlement, notification outbox. Refund эсрэг бичилт; audit хадгална.",
    "record": "Entitlement + ledger + audit",
    "accept": "Өмнөх санхүүгийн түүхийг overwrite хийхгүй.",
    "status": "requested",
    "release": "V1",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7P01",
    "to": "V7P02",
    "label": "Онлайн API"
   },
   {
    "from": "V7P01",
    "to": "V7P03",
    "label": "Банкны хуулга"
   },
   {
    "from": "V7P02",
    "to": "V7P04"
   },
   {
    "from": "V7P03",
    "to": "V7P04"
   },
   {
    "from": "V7P04",
    "to": "V7P05"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "Хэрэглэгчийн ажиллагаа",
  "source": "SYSTEM-RISK-REVIEW.md; BACKEND-PLANNING-HANDOFF.md",
  "kind": "operation",
  "navigationGroup": "finance",
  "scope": "V1"
 },
 {
  "id": "critical-plan-audit",
  "title": "80 · Алдаа ба хэрэггүй ажлын шүүлт",
  "summary": "FEATURE-PATTERN-COVERAGE бүртгэлд зураглал бүрийн reference, шийдвэр, одоогийн хэрэгжилтийн нотолгооны хязгаарыг харна.",
  "lanes": [
   "Үйлдлүүд дээрээс доош · хариуцагч блок бүрд"
  ],
  "nodes": [
   {
    "id": "V7A01",
    "lane": 0,
    "row": 0,
    "title": "Бүх зураглалын хамралтыг тулгана",
    "actor": "Шинжээч",
    "detail": "FEATURE-PATTERN-COVERAGE бүртгэлд зураглал бүрийн reference, шийдвэр, одоогийн хэрэгжилтийн нотолгооны хязгаарыг харна.",
    "record": "Map coverage",
    "accept": "Бүртгэлд байгааг runtime PASS гэж тооцохгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7A02",
    "lane": 0,
    "row": 1,
    "title": "Мөнгө, эрх, дүнгийн дүрмийг шалгана",
    "actor": "Domain эзэн / QA",
    "detail": "F01–F40: duplicate, race, stale version, offline, retention, grade, restore.",
    "record": "Risk → rule → test",
    "accept": "P0 бүрийн шийдвэр ба хүлээгдсэн үр дүн байна.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7A03",
    "lane": 0,
    "row": 2,
    "title": "Давхардсан дэлгэцүүдийг нэгтгэнэ",
    "actor": "Product owner",
    "detail": "Хуваарийн 3 map нэг ажлын дэлгэц байж болно; банк/API нэг ledger; notification нэг төв.",
    "record": "Keep / merge / defer register",
    "accept": "Diagram бүрийг тусдаа production цэс болгохгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7A04",
    "lane": 0,
    "row": 3,
    "title": "V1 ба хойшлуулахыг батална",
    "actor": "Төслийн эзэн",
    "detail": "Feedback V1; SMS, AI, online class, personal planner, ML export хойш. Simulator scope нээлттэй.",
    "record": "Release decision",
    "accept": "Санал болгох feature хэрэглэгч батлаагүй байхад V1 болгож өргөжүүлэхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7A05",
    "lane": 0,
    "row": 4,
    "title": "Backend зураг төслийн оролтыг өгнө",
    "actor": "Шинжээч",
    "detail": "Нээлттэй business policy, dictionary, эхний sequence, acceptance test-ийг нэгтгэнэ.",
    "record": "Planning handoff",
    "accept": "Production код эхлээгүй; unresolved policy ил тод.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7A01",
    "to": "V7A02"
   },
   {
    "from": "V7A02",
    "to": "V7A03"
   },
   {
    "from": "V7A03",
    "to": "V7A04"
   },
   {
    "from": "V7A04",
    "to": "V7A05"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "TODO → Судалгаа",
  "source": "SYSTEM-RISK-REVIEW.md; FEATURE-PATTERN-COVERAGE.md",
  "kind": "planning",
  "navigationGroup": "plan",
  "scope": "Хувилбар шийдэх"
 },
 {
  "id": "backend-plan-sequence",
  "title": "81 · Backend зураг төслийн зөв дараалал",
  "summary": "Identity, Content, Schedule, Learning, Exam, Commerce, Staff, Media, Notifications. Modular boundary санал.",
  "lanes": [
   "Үйлдлүүд дээрээс доош · хариуцагч блок бүрд"
  ],
  "nodes": [
   {
    "id": "V7B01",
    "lane": 0,
    "row": 0,
    "title": "Domain нэр ба ownership тогтооно",
    "actor": "Backend инженер / domain эзэн",
    "detail": "Identity, Content, Schedule, Learning, Exam, Commerce, Staff, Media, Notifications. Modular boundary санал.",
    "record": "Domain dictionary",
    "accept": "Нэг өгөгдөлд хоёр competing source of truth үүсгэхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7B02",
    "lane": 0,
    "row": 1,
    "title": "Төлөв ба эрхийг зурна",
    "actor": "Инженер / QA",
    "detail": "Use case/swimlane → state diagram → scoped permission; null/0/unrecorded ялгана.",
    "record": "State / permission matrix",
    "accept": "Хууль бус шилжилт бүр deny rule-тай.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7B03",
    "lane": 0,
    "row": 2,
    "title": "ERD ба sequence гаргана",
    "actor": "Инженер",
    "detail": "Logical relation/revision; callback, bank reconciliation, homework, schedule, exam happy+failure paths.",
    "record": "ERD + sequence diagrams",
    "accept": "Question revision солигдоход хуучин attempt өөрчлөгдөхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7B04",
    "lane": 0,
    "row": 3,
    "title": "API contract тодорхойлно",
    "actor": "Инженер",
    "detail": "Input/output/error, exact money, dates, concurrency/idempotency, pagination; OpenAPI toolchain.",
    "record": "API specification",
    "accept": "Бүх write actor/scope/version/idempotency бодлоготой.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7B05",
    "lane": 0,
    "row": 4,
    "title": "Deployment ба сэргэлт төлөвлөнө",
    "actor": "Инженер",
    "detail": "C4 container, DB/object store/queue, TLS/WAF, backup/restore, logs, 5000 burst workload, зардлын хувилбар.",
    "record": "Deployment / recovery / capacity",
    "accept": "Provider/DB уналаа гэхэд ямар үйлдэл боломжтойг ялгасан байна.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   },
   {
    "id": "V7B06",
    "lane": 0,
    "row": 5,
    "title": "Pilot, migration, rollback шалгуур тогтооно",
    "actor": "QA / эзэн",
    "detail": "Хуучин ID/content түүхийг хадгалсан dry run; F01–F40 тест; scoped rollout.",
    "record": "Go / no-go evidence",
    "accept": "Тест ба бизнес шийдвэр батлаагүй байхад publish хийхгүй.",
    "status": "requested",
    "release": "Хувилбар шийдэх",
    "origin": "2026-09-24 хэрэглэгчийн засвар ба эх сурвалжийн судалгаа"
   }
  ],
  "edges": [
   {
    "from": "V7B01",
    "to": "V7B02"
   },
   {
    "from": "V7B02",
    "to": "V7B03"
   },
   {
    "from": "V7B03",
    "to": "V7B04"
   },
   {
    "from": "V7B04",
    "to": "V7B05"
   },
   {
    "from": "V7B05",
    "to": "V7B06"
   }
  ],
  "questions": [
   "Дэлгэрэнгүй эх, санал ба шийдээгүй зүйлийг Судалгааны сангаас уншина."
  ],
  "phase": "Шаардлага → аудит → backend зураг төсөл",
  "screen": "TODO → Судалгаа",
  "source": "BACKEND-PLANNING-HANDOFF.md",
  "kind": "planning",
  "navigationGroup": "platform",
  "scope": "Хувилбар шийдэх"
 }
];function apply(D){D.maps.push(...maps);}if(typeof module!=="undefined")module.exports=apply;else apply(root.PI_DESIGN);})(typeof window!=="undefined"?window:globalThis);
