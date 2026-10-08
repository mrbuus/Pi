/* Specification only. Product V1 is not this diagram's v0.4. */
(function(root){
function apply(D){
 const node=id=>D.maps.flatMap(m=>m.nodes).find(n=>n.id===id);
 const change=(id,p)=>Object.assign(node(id),p);
 for(const m of D.maps)for(const n of m.nodes)n.release='V1 суурь / scope review';
 function later(id,reason){change(id,{release:'V2+ · дараа',deferredReason:reason});}
 for(const id of ['I04','I07','I08','I09'])later(id,'Зорилго, автомат санал болголт, ML export V1-д орохгүй.');
 for(const n of D.maps.find(m=>m.id==='online-learner').nodes)later(n.id,'Энэ жил онлайн анги нээхгүй; үйл ажиллагааны зураг л хадгална.');
 for(const id of ['N03','N04','N05'])change(id,{detail:'V1: зөвхөн веб доторх зарлал, feedback, ажилтны task-ийн audience ба төлөв. SMS template/provider/send/retry нь V2+; эхний release-д sender worker, credential, автомат SMS байхгүй.'});
 change('C06',{detail:'V1: фото/PDF боловсруулалт, тайлан, дүнгийн aggregation-ийг queue/worker гүйцэтгэнэ. SMS ба AI job нь V2+.'});
 change('B07',{detail:'V1: ангийн зарлал ба ажилтны ажлыг веб дотор удирдана. SMS илгээх нь дараагийн хувилбар.'});
 change('B09',{title:'Сэдвийн бодит гүйцэтгэл',detail:'Энэ шалгалтын оноо, зөв/буруу/хоосон, сэдвийн хувь; хамгийн бага гүйцэтгэлтэй сэдвийг давтах тэмдэглэл. AI чадвар таамаглах, бодлого санал болгох нь V2+.',link:'topic-results'});
 change('I05',{title:'Багш баримттай явцыг харна',detail:'Даалгаврын submission/review, ирц, тухайн шалгалтын сэдвийн оноог харна. V1-д автомат эрсдэлийн прогноз, зан чанарын дүгнэлт гаргахгүй.'});
 change('SC06',{detail:'Өөрийн шалгалтын дүн, сэдвийн гүйцэтгэл, анхны зөв/буруу, багшийн үнэлгээ, төлбөр/хуваарь. Зорилго V1-д байхгүй.',link:'topic-results'});
 change('SB05',{title:'Оролдлого ба сэдвийн үр дүнгээ харах',detail:'Өөрийн түүх, сэдэв бүрийн зөв/буруу ба хувь. Хамгийн бага гүйцэтгэлтэй сэдэвт давтах тэмдэглэл; зорилго/AI санал V2+.',link:'topic-results'});
 change('SB06',{title:'Багшийн бүлэгт нэгдэх',detail:'Ном авсан сурагч хүсвэл бие даасан багшийн бүлэгт join code-оор нэгдэнэ. Pi-ийн багшийн нэмэлт онлайн сургалт санал болгохгүй.',record:'GroupMembership + sharing scope',link:'self-service-group'});
 change('SB07',{detail:'Номын эрх нь дотоод багшаар хичээл заалгах/фото шалгуулах үйлчилгээ биш. Танхимын элсэлт тусдаа түвшин тогтоох замтай; бие даасан багшид дотоод ирц/төлбөр/note очихгүй.',record:'Book entitlement; group projection'});
 change('G01',{title:'«Анги удирдах» нээх',detail:'Хэрэглэгч өөрөө бүлэг үүсгэнэ. UI-д «Гадны багш» гэсэн нэршил, ажилтнаар хүсэлт батлуулах алхам байхгүй.',link:'self-service-group'});
 change('G02',{title:'Бүлгийн удирдлагын хүрээ үүсгэх',detail:'Систем өөрийн бүлгийг удирдах scope олгоно; Pi-ийн Багш+ role олгохгүй. Rate limit ба дүрэм зөвшөөрөх нь гараар багш батлах үйлдэл биш.'});
 D.maps.find(m=>m.id==='external').title='20 · Анги удирдах · өөрийн бүлэг';
 D.maps.find(m=>m.id==='external').summary='Өөрөө бүлэг нээнэ → кодоор сурагч нэмнэ → зөвшөөрсөн дасгал/шалгалтын түүхийг харна. Дотоод төвийн мэдээлэл тусдаа.';
 change('G06',{detail:'Гишүүний зөвшөөрсөн дасгал/шалгалтын явц, үр дүн, түүхийг харна. Танхимын сурагч нэгдсэн ч бусад гишүүнтэй ижил projection; дотоод төлбөр, ирц, homework фото, staff note ил гарахгүй.',link:'self-service-group'});
 change('Y03',{detail:'Онлайн ном/шалгалт/хугацаат эрхэд gateway invoice үүсгэнэ. Танхимын сургалтын банкны хуулгын BR урсгал тусдаа.',link:'instant-commerce'});
 change('Y06',{title:'Зөвхөн төлбөрийн зөрүүг шийдэх',detail:'Онлайн амжилттай төлбөр бүрийг багш батлахгүй. Unknown/дутуу/илүү/валют зөрсөн/буцаасан төлбөр support queue-д; хэвийн төлбөр автоматаар эрх нээнэ.',link:'instant-commerce'});
 const pay=D.maps.find(m=>m.id==='payments');pay.edges=pay.edges.filter(e=>!(e.from==='Y04'&&e.to==='Y06'));pay.edges.push({from:'Y05',to:'Y06',label:'зөвхөн exception'});
 change('WL03',{detail:'Онлайн top-up: provider серверийн баталгаажуулалт → яг invoice/дүн/валют/хүлээн авагч → автомат credit. Амжилттай төлбөрт Багш+ approval байхгүй; exception л review.',link:'instant-commerce'});
 for(const id of ['B01','Z01'])change(id,{title:'Танхимын элсэлт → түвшин тогтоох',detail:'Эхлээд сургалтын нөхцөлийг уншина → хувийн мэдээлэл → шалгалт → заавал бодолтын зураг/PDF → Багш+ review → утсаар анги/цаг санал болгох → 1–2 туршилтын хичээл → гэрээ.',link:'placement-admission'});
 change('TP02',{detail:'Бодит анхны ирц, TRIAL1/TRIAL2, гэрээ байгуулсан огноо тусдаа. Туршилтын өдрүүд төлбөрт орох эсэхийг гэрээгээр баталсны дараа billingAnchor тогтооно; гэрээ байгуулахаас өмнө автоматаар өр/хаалт үүсгэхгүй.'});
 change('K04',{link:'exam-tagging'});change('K05',{link:'problem-video'});
 for(const id of ['LV11','OD07'])change(id,{title:'Алдсан сэдвээ харах',detail:'V1: бодит оноонд суурилсан сэдвийн хувь, алдсан бодлогын жагсаалт, «энэ сэдвээ давтаарай». Автомат 2–3 бодлого сонгох, AI зөвлөх нь V2+.',link:'topic-results'});
 for(const id of ['C10','V10'])change(id,{title:'5000 зэрэг шалгуулагчийн туршилт',detail:'100→1000→5000 зэрэг session: login/start burst, autosave, submit, result, reconnect; DB pool, queue lag, p95, алдагдсан/давхар хариу шалгах. 5000 бүртгэлтэй account гэдгээр даана гэж үзэхгүй.',link:'capacity-5000'});
 change('LV04',{detail:'Lobby-д төхөөрөмж/холболт/хадгалалтын шалгалт. 5000 сурагч нэг мөчид нээх ачааллын туршилт; эхлэхээс өмнө хариу response-д байхгүй.'});
 change('ST04',{detail:'Golden OMR → жижиг дотоод pilot →100/1000→5000 зэрэг session. Хариу алдахгүй, давхар оноо/суутгалгүйг шалгана.',link:'capacity-5000'});
 change('X01',{detail:'Бодлого/зураг/видео/бодолт/онол байнгын контент. Student attempt/ID/score түүх элсэлт/эрх дууссан ч үлдэнэ. Homework/makeup фото богино policy; placement evidence нь admission policy. Холбоо барих PII, санхүү, media бүрийн хугацаа тусдаа.',link:'history-foundation'});
 change('X11',{title:'Бодлого, видео, онолын байнгын архив',detail:'Бодлого, зураг, текст бодолт, видео master/provider mapping, хувилбарууд automatic TTL-гүй. YouTube линк нь backup биш; өөрийн эх видео ба сэргээх manifest хэрэгтэй.'});
 const add=(id,title,prefix,lanes,screen,rows,release='V1',questions=[])=>{
  const nodes=rows.map(([lane,title,detail,record,accept,link],i)=>({id:prefix+String(i+1).padStart(2,'0'),lane,row:i,title,detail,record,accept,link,status:'requested',release}));
  D.maps.push({id,title,lanes,screen,nodes,summary:'v0.4 · '+release+' төлөвлөгөө. Үйлдлийг дээрээс доош уншина; блок дарж өгөгдөл, алдаа, хүлээн авах шалгуурыг үзнэ.',phase:release+' · хөгжүүлэлт эхлээгүй',source:'2026-09-22 хүсэлт; SYSTEM-DESIGN-V4-RESEARCH.md; INFRASTRUCTURE-5000-PLAN.md',questions,edges:nodes.slice(0,-1).map((n,i)=>({from:n.id,to:nodes[i+1].id,label:''}))});
 };
 add('release-scope','34 · V1 ба дараагийн хувилбар','VS',['Эзэн / бүтээгдэхүүн','Хөгжүүлэлт / QA'],'Төлөвлөгөө → Release scope',[
  [0,'V1 үндсэн хүрээг тогтоох','Танхим, бие даасан номын хэрэглэгч, нээлттэй шалгуулагч, эцэг эх, өөрөө бүлэг удирдах багш. Онлайн анги V2+.','ReleaseScope','V1 navigation/API-д онлайн enrollment зарахгүй.'],
  [0,'Энгийн онооны шинжилгээг оруулах','Бодлого бүрийн гараар баталсан ангилал → сэдвийн бодит хувь → хамгийн бага гүйцэтгэлтэй сэдэв.','TopicResultV1','Энэ нь AI чадварын онош, ирээдүйн алдааны магадлал биш.','topic-results'],
  [0,'V1-ээс хассан боломжууд','SMS; AI зөвлөх/auto classification; зорилго; автомат recommendation; ML export; онлайн анги; animation.','DeferredFeature register','Товч нуухаас гадна job/route/provider тохиргоо идэвхгүй.'],
  [1,'Худалдан авалт автоматаар','Зөв төлөгдсөн ном/шалгалт/эрх → сервер тулгалт → entitlement. Багшийн approval хэвийн замд байхгүй.','Checkout automation','Танхимын BR review-тэй хольж болохгүй.','instant-commerce'],
  [1,'Баримттай хяналтын дэлгэц','Элсэлт, үдэлтийн цаг, homework submitted/reviewed, анхны оноо/багшийн үнэлгээ тусдаа.','Teacher / parent view','Нийт ангийн тарах цагийг нэг хүүхдийн баттай гарсан цаг болгож бичихгүй.'],
  [1,'Нийтлэхийн өмнөх шалгуур','Контент QA, эрх, төлбөр, backup restore, 5000 capacity rehearsal, rollback зааврыг шалгах.','Release checklist','Төлөвлөгөөний бүх checklist checked болсон гэж өнөөдөр тэмдэглэхгүй.','release-operations']
 ]);
 add('exam-tagging','35 · Багш+ шалгалт оруулах ба ангилах','QT',['Багш+','Контентын систем','Сурагчийн тайлан'],'Шалгалт → Засах → Бодлого → Ангилал',[
  [0,'Албан ангиллын хувилбар сонгох','2026 хураангуйн 5 бүлэг; дэлгэрэнгүй дэд агуулгын 2021 эхийг огноотой ялгана. Шинэ жилийн өөрчлөлтөөр хувилбар үүсгэнэ.','TaxonomyVersion + SourceDocument','2021 дэд агуулгыг 2026/2027 батлагдсан бүрэн жагсаалт гэж нэрлэхгүй.'],
  [0,'Шалгалтын draft үүсгэх','Хичээл, нэр, live/anytime/placement, хугацаа, variant, үнэ, maximum, release policy.','ExamVersion DRAFT','Монгол хэл/шинэ хичээлд математикийн 5 бүлгийг хүчлэхгүй.'],
  [0,'Бодлогыг импортлох / сонгох','LaTeX эсвэл existing questionId; text, imageAssetId, сонголт, correct key, source page/number.','QuestionVersion + ExamItem','A/B/C ижил дугаар нь ижил problem ID гэсэн үг биш.'],
  [0,'Бүлэг ба дэд сэдэв гараар сонгох','Нэг primary бүлэг; олон skill, арга, томьёо tag байж болно. Хайлт, багцаар оноох, дараа нь нэг бүрчлэн засах.','QuestionClassification revision','Primary бүлгийн оноог нэг бодлогоос давхар нэмэхгүй.'],
  [0,'Томьёо / арга / prerequisite холбоно','Багшийн дотоод method taxonomy: квадрат гүйцээх, задлах, уламжлалын дүрэм гэх мэт; source-backed skill эсвэл Pi нэмэлт гэдгийг ялгана.','Skill / Method / Formula / prerequisite','Бүх арга нь БҮТ-ийн албан заалт гэж худал эх сурвалжлахгүй.'],
  [1,'LaTeX ба дотоод тайлбарыг салгах','Локал AI-аар бэлтгэсэн файл байж болно; structured metadata импортлоод багш review. Private note серверийн тусдаа model; raw LaTeX comment/HTML comment-д нууц хадгалахгүй.','PrivateAuthoringNote + ImportPreview','Student DTO, page source, JSON, cache-д private note/answer key байхгүй.'],
  [0,'Оноо, бүлгийн тархалтыг preview','Тоо/оноо хоёр хэмжүүр тусдаа. 2026 жишиг40 бодлогын 4/12/8/10/6 бүтэцтэй харьцуулж харуулна; заавал тэр бүтэцтэй байх эсэх exam policy.','BlueprintCoverage','10% бодлогын тоо нь заавал нийт онооны10% биш.'],
  [1,'Нийтлэхээс өмнө дутууг барих','Key, rubric, primary topic, image alt/source, render, duplicate variant, source permission шалгах.','Validation report','Ангилаагүй бодлого байвал publish blocker эсвэл ил тод unclassified бодлого гэсэн баталсан policy.'],
  [0,'Баталж version freeze хийх','Багш+ preview approve; taxonomy ба key snapshot. Дараа засвар нь шинэ revision/regrade үйлдэл.','Published ExamVersion','Өмнөх шалгалтын ангилал/тайлан чимээгүй өөрчлөгдөхгүй.'],
  [2,'Эх сурвалжтай тайлан руу холбох','Сурагч сэдвийн нэр, эх баримтын он/БҮТ холбоосыг харна; private арга-нууц тайлбар харахгүй.','Public taxonomy projection','AI suggestion дараа нэмэгдсэн ч багш батлахгүйгээр ground truth болохгүй.','topic-results']
 ]);
 add('topic-results','36 · Шалгалт → алдсан сэдвийн тайлан','DG',['Үнэлгээний систем','Сурагч','Багш / эцэг эх'],'Миний шалгалт → Дүн → Сэдвээр',[
  [0,'Дүнгийн баталсан хувилбар авах','AttemptId, questionVersion, rubricVersion, taxonomyVersion; OMR/онлайн/placement mode ялгана.','ScoreSnapshot','Regrade бол өмнөх revision устгахгүй.'],
  [0,'Бодлого бүрийн үр дүнг хадгалах','Selected/raw answer, correct/wrong/blank/invalid, earned/max, primary topic, solutionSeen, first/retry.','ItemResult','Бодолт үзсэн retry анхны чадварын хэмжүүрийг дарж солихгүй.'],
  [0,'Бүлгийн хувийг тооцох','Topic%=sum earned/sum maximum×100. Primary бүлгээр тооцно; skill tags тусдаа давхцсан шинжилгээ.','TopicScore numerator/denominator','Дэд group оноог rubric-гүйгээр нүд бүрд хуваахгүй.'],
  [1,'Тоо ба хувийг хамт харах','Алгебр жишээ6/20 оноо=30%; зөв/буруу/хоосон бодлогын тоо, шалгасан N, огноо.','TopicResult card','Огт асуугаагүй сэдэв0% биш «энэ шалгалтаар шалгаагүй».'],
  [0,'Хамгийн бага гүйцэтгэлийг ялгах','Тухайн шалгалтад хэмжсэн сэдвийг хувиар эрэмбэлнэ. 1 бодлоготой хэсэгт «цөөн даалгаварт суурилсан» тэмдэглэл.','Deterministic review order','«Чи муу хүүхэд» биш «Энэ шалгалтын энэ сэдвийг давтаарай». Ижил хувь ижил ач холбогдол.'],
  [1,'Алдсан бодлогуудаа нээх','Сэдэв → алдсан questionId → өөрийн answer → release/эрх хүрсэн текст/видео бодолт.','Mistake review list','Live дуусаагүй/хариу задлах цаг болоогүй үед зөв key/видео өгөхгүй.'],
  [2,'Холбогдсон хүний тайланг харах','Багш scope, verified parent link, group sharing тусдаа projection.','Scoped report','Дотоод homework completion ба exam accuracy-г нэг үнэлгээ болгохгүй.'],
  [0,'Урт хугацааны түүхэнд нэмэх','Оролдлого ба classification snapshot хадгална; дараагийн V2 AI судалгаанд ашиглах бүтэц үлдэнэ.','LearningHistory','V1 тайлан ирээдүйд алдах магадлал/ML skill mastery гаргахгүй.','history-foundation']
 ]);
 add('placement-admission','37 · Танхимын элсэлт ба түвшин тогтоох','PA',['Шинэ сурагч','Систем','Багш+'],'Танхимын сургалт → Мэдээлэл → Түвшин тогтоох → Хүсэлт',[
  [0,'Мэдээллээ өгөхөөс өмнө нөхцөл унших','7 хоногт4 удаа, бүтэн жилийн хөтөлбөр; анги/цаг нь түвшин ба суудлаас шалтгаална. Үнэ, байршил, холбоо барих цагийг баталсан утгаар нийтэлнэ.','AdmissionInfoVersion','Ажлын цаг/хаяг тодорхойгүй бол зохиож нийтлэхгүй.'],
  [0,'Шалгалтын зорилгыг ойлгох','«Өөрийн одоогийн мэдлэгээр бодоорой. Чадах бодолтоо бичээрэй. Эцэст нь бодолтын зургаа заавал илгээнэ.»','Instructions accepted','Хэн ч өгөх боломжтой; сургалтын эрх худалдан авсан байх шаардлагагүй.'],
  [0,'Бүртгэл эсвэл existing account ашиглах','Овог нэр, өөрийн утас, аав/ээжийн холбоо, Gmail/имэйл. Асран хамгаалагчийн өөр нөхцөлд холбоо барих хүн сонгох замтай.','ApplicantProfile + contact verification','Эцэг эхийн дугаар давхардсанаар хүүхдүүдийг нэг account болгохгүй. SMS V1-д байхгүй; email/Google ба утсаар тулгах хувилбар.'],
  [1,'Placement эхийг бэлтгэж батлах','Desktop/Books/Түвшин шалгах.pdf нэг хуудас10 бодлого. LaTeX,key,questionId,source bbox;6/8 давхардлыг багш шийднэ.','PlacementFormVersion','Нэг алгебрын тестээс бүх5 бүлгийн түвшнийг үнэлсэн гэж гаргахгүй.'],
  [0,'Бодож веб хариугаа илгээх','Цаас/дэвтэрт бодно; choice/number answer autosave; зураггүй үе ANSWERS_SAVED.','PlacementAttempt','Шалгалт бөглөснийг элсэлтийн хүсэлт бүрэн болсон гэж үзэхгүй.'],
  [0,'Заавал бодолтын зураг оруулах','Дараалал/rotate/уншигдах чанар; хуудас ба хамрах бодлогын дугаар; фото→PDF.','PlacementEvidenceDraft','Зураг/PDF-г аюулгүй шалгаж READY болтол FINAL_SUBMITTED биш.'],
  [1,'Бүрэн хүсэлт үүсгэх','Answers + дор хаяж1 valid evidence PDF + холбоо барих мэдээлэл → SUBMITTED.','AdmissionApplication','Conversion fail/pending үед draft хадгалагдаж үргэлжлүүлнэ.'],
  [0,'Хариу хүлээх мэдээлэл харах','«Хүсэлт хүлээн авлаа. Ажлын [баталсан цаг]-т холбогдож тохирох анги/цагийг ярилцана. Төвд ирж мэдээлэл авч болно.»','Acknowledgement','Утсаар ярьсан гэж систем автоматаар тэмдэглэхгүй; SMS илгээхгүй.'],
  [2,'Бодолт ба дүнг нэг дор review','PDF rotate/zoom, бодлого бүрийн хариу/бодолт, тайлбар; хэрэгтэй бол нэмэлт материал хүсэх.','PlacementReview','AutoScore нь элсүүлэх эцсийн шийдвэр биш.'],
  [2,'Утсаар холбогдож анги санал болгох','Түвшин, багтаамж, хуваарь; залгасан цаг/хариу, дахин холбогдох өдөр, proposed class.','ContactLog + ClassOffer','Жинхэнэ дуудлага багш өөрөө; V1 telephony/SMS integration шаардахгүй.'],
  [2,'1–2 туршилтын хичээлд суулгах','TRIAL_BOOKED → TRIAL1/TRIAL2; бодит ирц, хуваарь, багшийн ажиглалт.','TrialAttendance','Бүртгэл дээр шууд урт хугацааны гэрээ/өрийн lock үүсгэхгүй.'],
  [2,'Туршилтын дараа гэрээ ба элсэлт','Суудал батлах → гэрээний шинэ хувилбар → төлбөрийн anchor/туршилтын тооцоог тохирох → ACTIVE.','Contract + Enrollment','Туршилт төлбөртэй эсэх, анхны ирц anchor-д багтах эсэх шийдвэргүй бол auto invoice хийгдэхгүй.','contract-research'],
  [1,'Элсээгүй/дахин хүссэн түүх','WITHDRAWN/WAITLIST/NEEDS_CONTACT гэх төлөв; тухайн user-ийн attempt түүх хадгална.','AdmissionHistory','Бодолтын PDF хугацаа нь homework30хоногт автоматаар хамаарахгүй; admission retention-ийг батална.']
 ]);
 add('parent-day','38 · Тарах цаг ба эцэг эхийн өдрийн тойм','DP',['Багш / Багш+','Систем','Эцэг эх'],'Миний анги → Өнөөдөр → Таралт; Эцэг эх → Өнөөдөр',[
  [0,'Анги, өдрөө нээх','Өөрийн анги, зөв LessonOccurrence, ирц ба даалгаврын явц эхэнд харагдана.','DailyClassView','Өнгөрсөн өдрийг санамсаргүй өнөөдөр гэж засахгүй.'],
  [0,'Олонх гарсан цаг тэмдэглэх','Ойролцоо цаг, өөрөө ажигласан эсэх, тайлбар; хурдан «Одоо» эсвэл гараар цаг.','ClassDeparture.majorityLeftAt','Энэ нь тухайн хүүхдийн баталгаатай гарсан цаг биш.'],
  [0,'Сүүлийн хүүхэд гарсан цаг','Сүүлчийн сурагч гармагц цаг; засах reason ба author/time.','ClassDeparture.lastLeftAt','Majority time-ээс өмнөх last time бол шалгана.'],
  [0,'Хүүхдийн тусгай гарсан цаг · сонголт','Эрт гарсан/тусгай тохиолдолд тухайн сурагчид actual observed departure; ангиар бөөн хуулж баттай timestamp болгохгүй.','StudentDeparture optional','Тэмдэглээгүй бол «хүүхдийн хувийн цаг бүртгээгүй».'],
  [1,'Сервер баталж тойм шинэчлэх','Revision бүхий update, audit; parent dashboard SSE эсвэл polling refresh, тасарвал latest snapshot.','DailyProjection + updatedAt','V1 SMS/push биш; нээсэн веб дээр шинэчлэгдэнэ.'],
  [2,'Ирц ба таралтын мэдээлэл харах','Хүүхдийн бодит ирц; ангийн олонх/сүүлийн тарах цаг label-тай; хувийн timestamp байвал тусад нь.','VerifiedParentScope','Анги тарсан нь гэртээ ирснийг нотлохгүй; live GPS гэж нэрлэхгүй.'],
  [2,'Даалгавар ба үнэлгээг ялгаж харах','Due/submittedAt/reviewedAt; хичээлээс өмнө илгээсэн эсэх; анхны зөв/буруу; багшийн final completion.','Homework daily summary','Хугацаандаа илгээгээгүй нь огт хөдөлмөрлөөгүй гэсэн автомат дүгнэлт биш.'],
  [1,'Засварын түүхийг хадгалах','Багш зассан цаг, old/new; эцэг эх хамгийн шинэ зөвшөөрсөн хувилбар харна.','Revision / parent visibility','Staff note, бусад сурагчийн мэдээлэл response-д байхгүй.']
 ]);
 add('self-service-group','39 · «Анги удирдах» ба түүхийн хүрээ','SG',['Бүлэг удирдах хүн','Сурагч','Access систем'],'Анги удирдах → Бүлэг → Гишүүд → Явц',[
  [0,'Бүлэг өөрөө үүсгэх','Нэр/хичээл/түвшин, own group scope. Багшийн хүсэлт батлуулахгүй.','Group owner membership','Pi дотоод teacher эрх үүсэхгүй.'],
  [0,'Нэгдэх код гаргах','Код rotate/expiry, join rate limit, хуваалцах хүрээг тайлбарлах.','JoinInvitation','Code таахад бүх сурагчийн мэдээлэл авахгүй.'],
  [1,'Бүлэг ба хуваалцах хүрээ харах','Номын худалдан авагч эсвэл танхимын сурагч аль аль нэгдэнэ. Ямар дасгал/шалгалт ба өмнөх түүхийг багш харахыг зөвшөөрнө.','GroupSharingGrant','Нэгтгэх account биш; membership нэмнэ.'],
  [2,'Гишүүнд зориулсан ижил projection','Бүлгийн зөвшөөрсөн learning history/analysis; бүх төрлийн сурагчид ижил талбар.','GroupLearnerProjection','Дотоод төлбөр, ирц, гэрээ, parent phone, homework photo, staff note тусгаарлагдсан.'],
  [0,'Өөрийн гишүүдийн түүх харах','QuestionId, оролдлого, сэдвийн хувь, шалгалтын дүн, хугацаа; зөвшөөрсөн pre-join history хамрах боломжтой.','ScopedHistoryQuery','Ирээдүйд бүлгийн хүрээнээс давсан хувийн өгөгдлийг автоматаар нэмж хуваалцахгүй.'],
  [1,'Гарах / зөвшөөрлөө өөрчлөх','Гишүүнчлэл дуусахад багшийн access шинэчлэгдэнэ; сурагчийн үндсэн түүх үлдэнэ.','Membership endedAt','Дараа нь хуучин URL/API-аар түүх нээхэд scope шалгана.'],
  [2,'Хил заагийг турших','Номын сурагч ба танхимын сурагч ижил хүсэлтээр зөвшөөрсөн ижил талбар авна; өөр бүлэг403.','Permission matrix tests','UI нуух төдий биш API projection/schema түвшинд шалгах.']
 ]);
 add('instant-commerce','40 · Онлайн төлбөр → шууд эрх нээх','IC',['Худалдан авагч','Сервер / gateway','Админ · exception'],'Ном / Эрхийн багц / Шалгалт → Худалдан авах',[
  [2,'Бүтээгдэхүүн ба хугацаа тохируулах','Ном тус бүр үнэ; бүх сангийн сарын pass; сонгосон номын2/3 сарын багц; ЭШ хүртэл date-bound эрх. Яг үнэ/хугацааг дараа шийднэ.','OfferVersion + contentScope','«Бүх сан» нь шалгалт/видео/ирээдүйн номыг хамрах эсэхийг ил тод заана.'],
  [0,'Хамрах эрх, нийт үнийг харах','Юу нээгдэх, эхлэх/дуусах, видео орсон эсэх, renew/refund; нэг удаагийн төлбөр.','CheckoutSummary','Автомат сар бүр суутгал default биш.'],
  [1,'Invoice үүсгэх','Сервер offerVersion-ы үнээр invoice үүсгэж user/order-той холбоно.','PurchaseIntent + providerInvoiceId','Browser дүн/offer expiry-г өөрчилсөн ч сервер зөв үнийг хэрэглэнэ.'],
  [0,'Төлөх ба төлөв харах','QR/deep link → буцах → processing/confirmed; давхар дарахад existing intent.','Payment status UI','«Багш батлахыг хүлээнэ» хэвийн урсгалд байхгүй.'],
  [1,'Төлбөрийг серверээр баталгаажуулах','Authenticated provider query/callback verification; invoice, amount, currency, merchant, final status тулгана.','VerifiedPayment','Fake callback, wrong amount, reused txn ID эрх нээхгүй.'],
  [1,'Автоматаар эрх олгох','Payment confirm ба grant нэг transaction; unique payment+grant; outbox refresh.','Entitlement ACTIVE','Давтан callback нэг эрх; DB fail бол confirmed гэж амлахгүй, retry/reconcile.'],
  [0,'Ном / шалгалтаа шууд нээх','Сервер баталгаажуулсны дараа dashboard шинэчлэгдэнэ. Provider down бол pending тайлбар ба дахин шалгах.','My purchases','Шуурхай SLO нь provider-ийн баталгаажуулалт ирснээс хойш хэмжигдэнэ.'],
  [1,'Хугацаа ба давхар эрх тооцох','startsAt/endsAt, timezone, renewal stacking/overlap; хүчинтэй grant-уудын union.','EntitlementResolver','Нэг pass дуусахад өөр purchase-ийн эрх цуцлагдахгүй.'],
  [2,'Зөвхөн зөрүүтэй төлбөр харах','Амжилттай худалдан авагчийн жагсаалт readonly; mismatched/refund/chargeback л exception queue.','Payments dashboard','700/5000 төлбөрт гараар approval шаардахгүй.'],
  [1,'Хугацаа дуусах ба түүх үлдэх','Контентын эрх expire; learner identity/attempt/result үлдэнэ.','ExpiredGrant + retained history','Түүх хадгалсан нь paid контентыг хугацаагүй нээхгүй.'],
  [1,'Хуулбарлалтыг хязгаарлах','Session/device cap, rate limit, зөвшөөрсөн watermark, bulk fetch alert. Web screenshot-ийн тоог найдвартай мэдэх боломжгүй.','Abuse signal / support review','Screenshot гэж таагаад автоматаар төлбөртэй эрхийг хураахгүй; exact SS counter амлахгүй.']
 ]);
 add('problem-video','41 · Бодлого бүрийн видео / LaTeX бодолт','PV',['Багш+','Медиа үйлчилгээ','Сурагч'],'Бодлого → Бодолт → Видео / Текст; Контент → Видеоны сан',[
  [0,'Бодлогоо ID-аар сонгох','Ном/тест/хувилбар/дугаар, thumbnail, questionVersion харж сонгоно. A variant-ын видео B/C-д автоматаар таарна гэж үзэхгүй.','ProblemVideoBinding','Playlist order эсвэл filename ганцаараа mapping баталгаа биш.'],
  [0,'Бэлэн YouTube линк холбох','VideoId, playlistId, problem mapping, шаардлагатай start/end; embed боломж, unlisted/private төлөвийг турших.','VideoAsset provider=YOUTUBE','Өгсөн playlist-г энэ удаад агуулгаар бүрэн шалгаж чадаагүй; screenshot нь unlisted төлөвтэй.'],
  [0,'Эсвэл шинэ видео upload хийх','Богино нэг удаагийн upload URL, resumable, progress; title/problemId/author; вэб API-гаар бүх байтыг proxy хийхгүй.','UploadIntent + VideoAsset','Багш+ provider secret авахгүй; upload count/duration limit.'],
  [1,'Боловсруулах ба чанар шалгах','Encoding → poster/captions metadata → READY/FAILED; retry. Private storage master backup.','VideoProcessingJob','READY болоогүй видео сурагчид broken player болохгүй.'],
  [0,'Текстэн бодолт оруулах','LaTeX алхам, зураг, өнгөөр онцлох; зөв key-тэй consistency; animation нь V2+.','SolutionVersion','LaTeX trust=false/sanitized; staff note тусдаа, public solution-д нууц comment орохгүй.'],
  [0,'Харагдах эрх ба нээх мөч','Book/pass scope, text/video тусдаа capability; practice2алдаа, exam end/release, placement release policy.','SolutionAccessPolicy','Клиент нуудаг нь хамгаалалт биш; backend зөвшөөрсний дараа token/URL өгнө.'],
  [1,'Төлбөртэй видео delivery','Managed Stream signed token + origin restriction санал; unlisted YouTube бол линк тарах эрсдэлийг хүлээн зөвшөөрсөн transitional сонголт.','PlaybackGrant','YouTube private-г Pi login дангаар нээхгүй; firewall YouTube линкийг буцааж нууцлахгүй.'],
  [2,'Видео тоглуулах / үргэлжлүүлэх','Mobile inline player, pause/seek/speed, resume position; autoplay blocked бол Play button.','PlaybackProgress','Үзсэн минут нь бодлого бодож чаддаг гэсэн үнэлгээ биш.'],
  [1,'Дараагийн видеог хязгаартай бэлтгэх','Зөвшөөрсөн дараагийн1 видео metadata/poster, тохирвол эх segment. Save-data/сул сүлжээнд preload унтраана.','Bounded preload budget','Хэрэглээгүй preload ч төлбөртэй байж болно; нууц дараагийн бодлогын видео prefetch хийхгүй.'],
  [0,'Видео солих ба түүх хадгалах','Шинэ assetVersion, хуучин mapping/audit; archive only, master recovery; provider устсан үед rebuild.','VideoVersion + backup manifest','«Хэзээ ч устгахгүй» нь auto TTL-гүй ба сэргээх журам; ганц YouTube холбоос backup биш.'],
  [0,'12 сарын контентын ажлыг оноох','25 тест×A хувилбарын question list → багш бүрд record task → missing/recorded/reviewed/published count.','VideoCoverageBoard','Нийт1000 гэсэн өмнөх ажлыг хэмжиж тулгана; playlist count-ийг1000 баталгаатай видео гэж нэрлэхгүй.']
 ]);
 add('content-quality','42 · 100x100 V3 / 200x200 V3 чанар','CQ',['Контентын багш+','Импорт / QA','Хэрэглэгчийн дэлгэц'],'Контент → Эх сан → Импорт preview → QA',[
  [0,'Эх файл ба номын хувилбар бүртгэх','Desktop/Books хоёр V3 хавтас; PDF/DOCX source hash/page/variant manifest. Одоогийн DB snapshot-тай тусад нь тулгана.','BookEditionSource','2026-08-26 тайлан өнөөдрийн DB байдлыг нотлохгүй.'],
  [1,'ID-г тогтвортой оноох','BookId, testId, variantId, problemId, problemVersionId, imageAssetId. Хуудасны bbox/index нь source locator.','Identity manifest','Rename/reimport нь шинэ санамсаргүй problemId үүсгэхгүй.'],
  [1,'Word/LaTeX эхийг задлах','DOCX OMML/text байвал эхээс нь; зураг бол vision draft. Текст/математикийг эх зурагтай тулгана.','ImportDraft','Word байна гэдгээр100% алдаагүй гэж үзэхгүй; embedded image/OLE шалгах.'],
  [0,'Бодлого бүрийн агуулгыг шалгах','Кирилл, тэмдэг, зэрэг/язгуур, сонголт, хариу, зурагны cropping, geometry labels.','ContentReview','100x100 өмнөх119 текст/35 page эргэлзээтэй тайланг хаагдсан гэж автоматаар тооцохгүй.'],
  [0,'Зураг бүрийн холбоосыг шалгах','ImageAssetId→questionVersion, source page/bbox, checksum, alt; orphan/missing/duplicate assets тайлан.','AssetRelationshipAudit','Нэг зураг өөр бодлогынхтой солигдоогүйг эх ба preview-оор шалгах.'],
  [2,'Веб / утас дээр render шалгах','Problem, answer choices, written solution, video panel: Safari desktop/iOS, narrow width, zoom, dark/light.','RenderCoverage record','Бүх бодлого automatic missing-asset/math-parse scan; дараа visually reviewed coverage100% батлах.'],
  [0,'Бүлэг / арга / видео mapping батлах','Taxonomy+solution+variant+video reference-ийг review; зөв A видео зөв бодлогод.','Verified content package','Алдаатай эх бодлогыг import цэвэр гэдгээр хэвлэж болохгүй.'],
  [1,'Dry-run ба ялгааны тайлан','Insert/update/unchanged/conflict; FK/IDs/count/source coverage; rollback snapshot.','ImportPlan','Одоогийн хэрэглэгчийн attempt/analysis-ийг текст төстэйгээр сохроор зөөхгүй.'],
  [0,'Pilot → нийтлэх → засварлах','Нэг багц publish, error ticket questionId/assetId/screenId-тай; засвар revision.','ContentRelease','Архивлаад нууж болно; үндсэн файл/бодолт/түүх автомат устахгүй.']
 ]);
 add('history-foundation','43 · Сурагчийн урт хугацааны түүх','LH',['Үйлдэл хийсэн сурагч','Өгөгдлийн систем','Эрхтэй тайлан'], 'Бодлого → Attempt → Хувийн түүх',[
  [0,'Нэг identity олон үйлчилгээ','Танхим/ном/сорил/бүлэг хэрэглэсэн ч нэг stable userId; гадны код alias history.','LearnerIdentity','Сургалтаас гарахад account-ыг устгахгүй.'],
  [1,'Хариултын нотолгоо хадгалах','Attempt mode, itemVersion, first/retry, server timestamps, answer, score, rubric/topic version, solution exposure.','AttemptItemResult','Client хугацаа/үзсэн дохио баттай мэдлэгийн нотолгоо биш.'],
  [1,'Өөрчлөлтийг revision-оор хадгалах','Key correction, regrade, topic remap, manual review тусдаа revision; original answer үлдэнэ.','Provenance chain','Хуучин дүн яагаад өөр байсныг тайлбарлаж чадна.'],
  [1,'Эрх дуусах ба өгөгдөл тусдаа','Enrollment/pass expire → content access өөрчлөгдөнө; хувийн шалгалтын түүх хэвээр.','RetentionClass','Homework фото30хоног ба learning record байнгын зорилго ялгаатай.'],
  [2,'Зөвшөөрсөн түүхийг нээх','Өөрийн history; parent verified link; group sharing scope; staff scope.','HistoryProjection','Бүх өгөгдөл хадгална гэдэг нь хүн бүрт бүх өгөгдлийг харуулна гэсэн үг биш.'],
  [1,'Урт хугацааны хадгалалтыг удирдах','Learning identity/result-ийг урт хугацаанд хадгалах зорилго. Contact PII/log/media purpose тус бүрийн хэрэгцээ/эрх зүйн хугацаа, export/deletion request тусдаа.','Retention & data-rights policy','Хуулийн шаардлагыг үл тоон бүх PII-г үүрд хадгална гэж амлахгүй.'],
  [2,'V2 судалгаанд шилжих gate','Q-matrix/knowledge tracing, calibration, cold-start, held-out evaluation, consent, teacher feedback-ийг дараа судална.','Research backlog','V1 дээр ML export/AI recommendation launch blocker биш.']
 ]);
 add('capacity-5000','44 · 5000 зэрэг шалгалт ба серверийн зураг','IF',['Browser / mobile','Edge / API / worker','DB / media / operations'],'Дэд бүтэц → Deployment → Load rehearsal',[
  [0,'Хүсэлт DNS/TLS-ээр орох','pi.mn/web, api, media hostnames-ийн эзэмшил; staging тусдаа. Managed cert, DNS TTL/renewal, domain recovery.','DNS + certificate inventory','Эдгээр нь санал болгосон host roles; одоо DNS өөрчлөхгүй.'],
  [1,'Edge WAF ба routing','HTTPS LB + WAF/rate limits; static CDN; API authenticated. Origin bypass хаах, health check зөвшөөрөх.','Ingress policy','CORS/firewall нь user authorization-ийг орлохгүй.'],
  [1,'Stateless API pool','Нэг modular backend-ийн олон instance: auth, exams, billing, content модулиуд. Warm minimum, bounded maximum, graceful shutdown.','Cloud Run service / equivalent','Netflix хэмжээний microservice/Kubernetes нь V1-д зайлшгүй биш.'],
  [2,'PostgreSQL гол үнэн','User/enrollment, exam/answer/score, payment/ledger, content metadata; private IP, HA, connection pool, indexes.','Cloud SQL PostgreSQL HA санал','Видео/зурагны байтыг database row-д хадгалахгүй.'],
  [2,'Redis хэрэгтэй үед','Rate limits/cache/ephemeral fanout; эхний шатанд шаардлагыг хэмжиж шийднэ.','Optional managed Redis','Answer/ledger-ийн ганц хуулбар Redis биш; уналаа ч өгөгдөл алдахгүй.'],
  [2,'Файлын байтыг тусад нь','GCS private: permanent problems/master media; evidence short policy; placement тусдаа. Signed access + metadata.','Object storage prefixes/buckets','Public question metadata cache-д private evidence/key орохгүй.'],
  [2,'Видеог streaming CDN-д','Stream эсвэл GCS+transcoder+CDN; adaptive bitrate, signed playback; API зөвхөн эрх/token.','Video delivery','5000×2Mbps ≈10Gbps; веб API instance-оор video proxy хийхгүй.','problem-video'],
  [1,'Хариуг autosave transaction-д','Зөвхөн өөрчлөгдсөн хариу, sequence, attemptVersion; server receipt commit-ийн дараа.','AnswerRevision + receipt','Давтан sequence нэг удаа; older write newer answer-ийг дарж болохгүй.'],
  [1,'Submit ба дүнг боловсруулах','Freeze deadline/snapshot → outbox → grading worker → topic aggregation → personal result.','Idempotent scoring job','Queue давтан delivery давхар score/санхүү үүсгэхгүй.'],
  [2,'Тайлан ба ranking read load','Баталсан snapshot, pagination/virtual list, cached public projection; parent update бага давтамж.','Read model','5000 хүнд raw бүхий бүх хүснэгт дахин SUM хийхгүй.'],
  [1,'Тооцоотой ачааллын загвар','5000 хүн/10sec autosave≈500req/s;30sec≈167. Login60sec≈83/s; бүхsubmit10sec≈500/s. Нэмэлт traffic/headroom тусдаа.','Workload model','Энэ нь тооцоо; сервер даахыг баталсан benchmark биш.'],
  [2,'DB connection budget','maxInstances×pool + workers + migrations + reserve ≤ DB connection budget. Slow query/lock/CPU нь autoscaling-ээс түрүүлж хязгаар болж болно.','Capacity worksheet','Зүгээр max instances өсгөж DB-г connection exhaustion болгохгүй.'],
  [1,'Load ба failure rehearsal','100→1000→5000, cold/warm start, same-second submit, reconnect, provider timeout, DB failover, worker crash.','Load-test report','Zero acknowledged-answer loss; duplicate grant0; p95/error thresholds-г хэмжиж батална.'],
  [2,'Алдааг олж сэргээх','RequestId/traceId, examId/attemptId, structured errors, SLO/queue/DB alerts, backup PITR/restore, incident owner.','Runbook + restore report','Хариу, утас, credential-г логт бүтнээр бичихгүй. 100% огт унахгүй гэж амлахгүй.','release-operations']
 ],'V1 · 5000 capacity gate');
 add('release-operations','45 · UI/UX бүртгэл, deploy, алдаа засвар','OP',['Инженер / QA','Release / Ops','Багш+ / хэрэглэгч'],'Төлөвлөгөө → Дэлгэцийн бүртгэл → Release',[
  [0,'Дэлгэцийн inventory үүсгэх','ScreenId, route, actor, task, API, source, component, image/video IDs, desktop/mobile layout.','ScreenContract','Хаана ямар feature байгааг нэг бүртгэлээс олно.'],
  [0,'Төлөв бүрийн харагдацыг тодорхойлох','Loading/empty/ready/pending/failed/expired/restricted/conflict; text/buttons/action permission.','UIState matrix','Error үед алга болдог хоосон хэсэг биш, retry/support өгнө.'],
  [0,'API гэрээ ба domain invariants','Versioned OpenAPI, request/response, auth scope, idempotency, validation, error code; модуль ownership.','APIContract','Frontend comment-оор permission тогтоохгүй.'],
  [1,'Орчин ба secret-ийг салгах','Dev/staging/prod project, bank sandbox/prod, least-privilege service accounts, secret manager; prod PII staging-д хуулбарлахгүй.','Environment manifest','Git/browser bundle-д түлхүүр байхгүй.'],
  [1,'CI/CD ба DB migration','Lint/build/contract/access tests → content QA → backup → expand/contract migration → canary → smoke.','ReleaseArtifact + migration plan','Rollback хуучин code-той schema нийцэхгүй бол deploy эхлэхгүй.'],
  [1,'Runbook ба хяналтын самбар','Error budget, checkout pending age, last successful backup, DB pool, queue lag, video readiness, missing asset.','Ops dashboard','5000 live үед хэн ямар дохиог хариуцах нь нэрлэгдсэн албан үүрэгтэй.'],
  [2,'Алдаа мэдээлэх богино зам','Тусламж/report button → screenId+safe requestId+problemId; багш тайлбар, зөвшөөрсөн screenshot.','Issue record','Хэрэглэгчийг бүх console log/нууц token явуулахыг шаардахгүй.'],
  [0,'Засвар → regression → rollout','Дахин давтагдах нөхцөл, эх шалтгаан, data repair preview, rollback; requestId-аар мөрдөх.','Incident / repair audit','Дүн/төлбөрийг silent SQL fix хийхгүй; revision, reconciliation.'],
  [1,'Launch ба өргөжүүлэлтийн gate','Contract/content/payment/data privacy/restore/capacity тайлан. V1 excluded flags routes/jobs off.','Go-live checklist','Бодит load/restore тест хийгдээгүй байхад «5000 даана» гэж нийтлэхгүй.']
 ]);
 add('contract-research','46 · Туршилтын дараах гэрээ · цахим судалгаа','EC',['Багш+ / асран хамгаалагч','Гэрээний үйлчилгээ','Хууль / operations'],'Туршилтын хичээл → Гэрээний preview',[
  [0,'Туршилт дууссан эсэхийг шалгах','1–2 удаа ирсэн үр дүн, түвшин/анги/хуваарь, төлбөрийн санал.','TrialDecision','Шинэ элсэгч мэдээлэл бөглөхөд шууд гэрээ байгуулахгүй.'],
  [0,'V1 гэрээний хувилбар бүртгэх','Батлагдсан цаасан гэрээний огноо/version/status; зөв хүнтэй холбоно. Туршилтын төлбөр ба anchor-ийг эцэслэнэ.','ContractRecord','Электрон гарын үсэг V1 зайлшгүй feature гэж нэмэхгүй.'],
  [2,'Цахим гэрээний эрх зүй судлах','Цахим гарын үсгийн тухай хууль6.3; signing person/guardian authority, evidence, нөхцөлийн ойлгомжтой preview.','Legal/provider review','Checkbox/утасны OTP-г бүх тохиолдолд тоон гарын үсэгтэй адил гэж үзэхгүй.'],
  [1,'V2 гарын үсгийн урсгал','Immutable contract bytes/hash → signer identity → trusted signature → verify certificate/status/timestamp → signed copy.','SignatureEnvelope','Pi хувийн signing key-г өөрөө хадгалах шаардлагагүй provider сонгох.'],
  [0,'Хуулбар, өөрчлөлт, цуцлалт','Эцэг эх/төв баталсан хувилбараа татна; шинэ нөхцөл нь amendment, дахин зөвшөөрөл.','ContractRevision','Гарын үсэгтэй PDF-ийн байтыг дараа нь засахгүй.'],
  [2,'Provider сонгох туршилт','Үнэ/API/sandbox/support, насанд хүрээгүй хүүхдийн төлөөлөл, audit evidence/retention; хуульчийн review.','E-contract decision','Санхүүгийн апп ашигладаг гэдгээр Pi-д яг адил гэрээ хүчинтэй гэж дүгнэхгүй.']
 ],'V1 бүртгэл / V2+ цахим гарын үсэг');
 // Separate alternatives/exception paths so manual review is never the happy path.
 const edges=(mapId,rows)=>D.maps.find(m=>m.id===mapId).edges=rows.map(([from,to,label=''])=>({from,to,label}));
 edges('instant-commerce',[
  ['IC01','IC02'],['IC02','IC03'],['IC03','IC04'],['IC04','IC05'],['IC05','IC06','яг таарсан'],['IC06','IC07'],['IC07','IC08'],['IC08','IC10','эрх дуусах үед'],
  ['IC05','IC09','зөвхөн зөрүү'],['IC09','IC05','шийдээд дахин тулгах'],['IC07','IC11','хэрэглээний хамгаалалт']
 ]);
 edges('problem-video',[
  ['PV01','PV02','бэлэн YouTube'],['PV01','PV03','эсвэл upload'],['PV02','PV04','embed preview'],['PV03','PV04','encoding'],
  ['PV01','PV05','текстэн бодолт'],['PV04','PV06'],['PV05','PV06'],['PV06','PV07'],['PV07','PV08'],['PV08','PV09'],
  ['PV08','PV10','дараа шинэчлэх'],['PV11','PV01','багц ажлын оноолт']
 ]);
 edges('parent-day',[
  ['DP01','DP02'],['DP02','DP03'],['DP03','DP05'],['DP03','DP04','тусгай хүүхэд · сонголт'],['DP04','DP05'],['DP05','DP06'],['DP06','DP07'],['DP07','DP08','засварын түүх']
 ]);
 const ex=D.maps.find(m=>m.id==='external');ex.lanes=['Анги удирдах багш','Систем / эрх','Сурагч / систем'];
 change('G02',{record:'GroupOwnerScope',accept:'Бүлгийн owner scope нь Pi дотоод ангид нэвтрэх staff эрх биш; гараар approval шаардахгүй.'});
 change('P04',{detail:'Баталгаажсан хүүхдийн ирц, submitted/reviewed цаг, анхны correctness ба багшийн completion, нөхөлт, ангийн ойролцоо тарах цагийг тус тусын нэрээр харна.',link:'parent-day'});
 change('P06',{title:'Вебийн шинэчлэлээ харах',detail:'V1: нээсэн веб дээр дүн/буцсан ажил/нөхөх мэдээлэл шинэчлэгдэнэ, updatedAt/stale төлөвтэй. SMS/push provider нь дараа.',record:'Web notification preference; updatedAt',accept:'V1-д SMS job/credential/илгээх үйлдэл байхгүй.'});
 change('I06',{release:'V2+ · дараа',deferredReason:'V1 нь энгийн сэдвийн тайлан. Psychometric item-analysis-г тусдаа судалж батална.'});
 for(const id of ['EC03','EC04','EC05','EC06','LH07'])later(id,'Цахим гэрээ, ML/AI дараагийн хувилбарын судалгаа.');
 change('N01',{detail:'V1: ангийн веб зар, сурагчийн feedback, дотоод note, ажилтны task. SMS нь V2+.'});
 change('N02',{detail:'V1: зарлалын текст ба анги; note төрөл/author; task owner, хугацаа, дэд ажил. SMS template нь V2+.'});
 D.maps.find(m=>m.id==='online-learner').phase='V2+ · V1-д байхгүй';
 D.maps.find(m=>m.id==='online-learner').summary='Энэ жил онлайн анги нээхгүй. Дараагийн хувилбарын үйл ажиллагааны зураг; V1 navigation/enrollment-д орохгүй.';
}
if(typeof module!=='undefined')module.exports=apply;else apply(root.PI_DESIGN);
})(typeof window!=='undefined'?window:globalThis);
