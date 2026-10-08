/* Navigation classification only: does not change feature scope or stable IDs. */
(function(root){
function apply(D){
 const groups=[
  ['plan','Ерөнхий зураг ба төлөвлөгөө','#465bbb',['overview','release-scope','delivery','exam-strategy']],
  ['classroom','Өдөр тутмын сургалт','#087d71',['day','lesson-bundle','homework','review','theory','makeup','classroom-learner']],
  ['people','Хэрэглэгч, элсэлт, эцэг эх','#1c6997',['identity','placement-admission','parents','parent-day','external','self-service-group','communications','online-learner']],
  ['exams','Шалгалт ба үр дүн','#7950ab',['exam','exam-tagging','omr-import','live-exam','on-demand-exam','result-publication','topic-results','insights']],
  ['content','Ном, бодлого, видео','#a34465',['content','book-learner','problem-video','content-quality','academic']],
  ['finance','Төлбөр, гэрээ, бүртгэл','#a26018',['business','payments','instant-commerce','tuition-policy','bank-reconcile','registry-ids','refunds','exam-credit','contract-research']],
  ['platform','Өгөгдөл, сервер, чанар','#50677c',['media','retention','reliability','history-foundation','capacity-5000','release-operations']]
 ];
 groups.push(['staff','Багшийн ажил ба хуваарь','#117d86',[]],['public','Нүүр царай ба брэнд','#a64c6b',[]]);
 for(const m of D.maps.filter(m=>m.navigationGroup)){const g=groups.find(g=>g[0]===m.navigationGroup);if(g)g[3].push(m.id);}
 const notes={
  'communications':['mixed','V1: веб зарлал, тэмдэглэл, ажил. SMS дараа.'],
  'academic':['mixed','V1: олон хичээл нэмэх өгөгдлийн суурь. Шинэ хичээл, гар утасны аппыг дараа өргөжүүлнэ.'],
  'problem-video':['mixed','V1: видео болон текст бодолтын суурь. Анимэйшн дараа; provider ба контентын хүрээг батална.'],
  'insights':['mixed','V1: бодит явц, сэдвийн тайлан. Зорилго, AI/санал болголт, ML дараа.'],
  'history-foundation':['mixed','V1: ID ба оролдлогын түүх хадгална. ML/AI шинжилгээ дараа.'],
  'contract-research':['mixed','V1: туршилтын дараах гэрээний бүртгэл. Цахим гарын үсэг дараа.'],
  'online-learner':['later','V1-д орохгүй. Онлайн ангийн үйл ажиллагааг дараагийн хувилбарт хөгжүүлнэ.']
 };
 D.navigation={groups:groups.map(([id,title,color,ids])=>({id,title,color,ids})),labels:{v1:'V1 · орно',mixed:'V1 + дараа',later:'V2+ · V1-д орохгүй',decision:'Хувилбар шийдэх'}};
 for(const [group,,color,ids] of groups)for(const id of ids){
  const m=D.maps.find(m=>m.id===id);if(!m)throw Error('Navigation: unknown map '+id);
  const deferred=m.nodes.filter(n=>n.release?.startsWith('V2')).length;
  const scope=deferred===m.nodes.length?'later':deferred?'mixed':'v1';
  const [release,note]=notes[id]||[scope,scope==='v1'?'V1-ийн төлөвлөгөөнд орно. Нарийн шийдвэр, хүлээн авах шалгуурыг блок бүрээс харна.':'V1 болон дараагийн хувилбарын алхмуудтай; блокийн тэмдэглэгээг харна.'];
  m.navigation={group,color,release:m.scope==='Хувилбар шийдэх'?'decision':release,note:m.scope==='Хувилбар шийдэх'?'Шинэ хэрэгцээ. V1-д оруулах эсэх хараахан батлагдаагүй.':note};
 }
}
if(typeof module!=='undefined')module.exports=apply;else apply(root.PI_DESIGN);
})(typeof window!=='undefined'?window:globalThis);
