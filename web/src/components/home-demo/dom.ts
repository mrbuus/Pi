// ⚠️ АВТОМАТААР ҮҮСГЭСЭН — docs/v2/hero/port_home.py --demo. Гараар бүү зас, мокапаа засаад дахин ажиллуул.
/* eslint-disable */
// @ts-nocheck
import katex from 'katex';
import Lenis from 'lenis';
import { createIcons, ArrowDown, ArrowUpRight, Camera, ChevronLeft, ChevronRight, ClipboardCheck, HeartHandshake, Info, MapPin, Menu, Minus, Moon, Phone, Plus, RotateCcw, Scissors, Sun, Users, Wifi, X } from 'lucide';

const ICONS = { ArrowDown, ArrowUpRight, Camera, ChevronLeft, ChevronRight, ClipboardCheck, HeartHandshake, Info, MapPin, Menu, Minus, Moon, Phone, Plus, RotateCcw, Scissors, Sun, Users, Wifi, X };

export function mountDom(root) {
  let dead = false, rafId = 0;
  const offs = [];
  const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); offs.push(() => t.removeEventListener(ev, f, o)); };
const $=s=>root.querySelector(s), $$=s=>[...root.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const range=(p,a,b)=>clamp((p-a)/(b-a));
const ease=t=>1-Math.pow(1-t,3), easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const tex=(el,s)=>{ if(katex) katex.render(s,el,{throwOnError:false}); else el.textContent=s; };
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches;

const S={hero:0,idea:0,globe:0,club:0,vLab:false,vHero:true,vIdea:false,vGlobe:false,vClub:false,nearGlobe:false,nearClub:false,mx:0,my:0,vel:0,go:null};
window.S=S;

let lenis=null;
if(!RM){ lenis=new Lenis({lerp:.09,smoothWheel:true}); }
const goTo=y=>{ lenis? lenis.scrollTo(y,{duration:1.4,force:true}) : scrollTo({top:y,behavior:'smooth'}); };
$$('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
  const id=a.getAttribute('href'); if(id.length<2||id[0]!=='#') return; const t=$(id); if(!t) return;
  e.preventDefault();
  if(sheet.classList.contains('open')) toggleMenu(false);
  let y=t.getBoundingClientRect().top+scrollY;
  if(id==='#enter'){ const h=$('#hero'); y=h.offsetTop+(h.offsetHeight-innerHeight)*.92; }
  goTo(y);
}));
// Холбоосонд хэсэг байвал (жишээ нь /demo/home#results) ачаалсны дараа шууд тэнд очно
if(/^#[\w-]+$/.test(location.hash)){ const t=$(location.hash);
  if(t) setTimeout(()=>{ const y=t.getBoundingClientRect().top+scrollY; lenis? lenis.scrollTo(y,{immediate:true,force:true}) : scrollTo(0,y); },450); }

const sheet=$('#sheet'), menuBtn=$('#menuBtn');
function toggleMenu(o){
  sheet.classList.toggle('open',o); sheet.setAttribute('aria-hidden',!o); menuBtn.setAttribute('aria-expanded',o);
  menuBtn.querySelector('span').textContent=o?'Хаах':'Цэс';
}
menuBtn.addEventListener('click',()=>toggleMenu(!sheet.classList.contains('open')));
// Гадуур дарах, Esc — цэс хаагдана
on(window,'pointerdown',e=>{ if(sheet.classList.contains('open')&&!sheet.contains(e.target)&&!menuBtn.contains(e.target)) toggleMenu(false); });
on(window,'keydown',e=>{ if(e.key==='Escape'&&sheet.classList.contains('open')) toggleMenu(false); });


/* Огтлолын лаборатори */
const LAB=window.LAB={solid:-1,h:.55,tilt:0,labels:true,away:false};
const LAB_N=['Куб','Параллелепипед','Призм','Тетраэдр','Пирамид','Цилиндр','Конус','Бөмбөрцөг'];
const solBox=$('#labSol');
solBox.innerHTML=LAB_N.map((n,i)=>`<button role="radio" aria-checked="false" data-i="${i}">${n}</button>`).join('');
function labPick(i){ LAB.solid=i; $$('#labSol button').forEach(b=>b.setAttribute('aria-checked',String(+b.dataset.i===i))); }
window.labPick=labPick;
solBox.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) labPick(+b.dataset.i); });
const rH=$('#rH'), rT=$('#rT');
function syncR(){ LAB.h=rH.value/100; LAB.tilt=+rT.value; $('#oH').textContent=rH.value+'%'; tex($('#oT'),rT.value+'^\\circ');
  rH.style.setProperty('--v',rH.value+'%'); rT.style.setProperty('--v',((+rT.value+90)/180*100)+'%'); }
rH.addEventListener('input',syncR); rT.addEventListener('input',syncR); syncR();
$('#tgLab').addEventListener('click',e=>{ LAB.labels=!LAB.labels; e.currentTarget.setAttribute('aria-pressed',String(LAB.labels)); });
$('#tgCut').addEventListener('click',e=>{ LAB.away=!LAB.away; e.currentTarget.setAttribute('aria-pressed',String(LAB.away)); });

/* Сургуулиуд (ЭШ-2026, 700+, эзний зургаас) */
const SCHOOLS=['33-р сургууль','Хөгжил сургууль','Ирээдүй сургууль','Өнөр сургууль','1-р сургууль','31-р сургууль','44-р сургууль','141-р сургууль','Мандах лицей','МУИС лицей','Монгени','Оюуны Ундраа','Эрдмийн Өргөө','96-р сургууль','77-р сургууль','48-р сургууль','50-р сургууль','18-р сургууль','Шинэ Монгол','Оюуны Тулга'];
$('#schools').innerHTML=[...SCHOOLS,...SCHOOLS].map(s=>`<span>${s}</span>`).join('');

const say=$('#say');
say.innerHTML=say.textContent.trim().split(/\s+/).map((w,i,a)=>w==='|'?'<br>':`<span class="w${i>=a.length-4?' gw':''}">${w}</span>`).join(' ');
const sayW=$$('#say .w');

/* Номууд */
const BOOKS=[
  {n:'Математикийн тестүүд I',href:'/books/100V3',s:'12 бүлэг сэдэв',d:'12 бүлэг сэдвээр тест, бодлого бүр бодолттой',img:'/home/100x100-front.jpg',tags:['Тест','ЭЕШ','Бодолттой']},
  {n:'Математикийн тестүүд II',href:'/books/200V3',s:'Тестийн цуврал',d:'Тестийн цувралын хоёр дахь дэвтэр, хавтас бэлтгэгдэж байна',sh:'grid',tags:['Тест','ЭЕШ']},
  {n:'Математикийн тестүүд III',href:'/books/300',s:'Тестийн цуврал',d:'Тестийн цувралын гурав дахь дэвтэр, хавтас бэлтгэгдэж байна',sh:'grid',tags:['Тест','ЭЕШ']},
  {n:'Хавтгайн геометр 1',href:'/books/HAV',s:'Планиметр',d:'Гурвалжин, тойрог, тэдгээрийн шинж чанар',sh:'tri',tags:['Геометр','Гурвалжин','Тойрог']},
  {n:'Хавтгайн геометр 2',href:'/books/HAV',s:'Планиметр',d:'Планиметрийн үргэлжлэл: олон өнцөгт, талбай',sh:'circ',tags:['Геометр','Олон өнцөгт']},
  {n:'Огторгуйн геометр',href:'/books/OGT',s:'Стереометр',d:'Огторгуйн биет, огтлол, эзлэхүүн',sh:'cube',tags:['Геометр','Биет','Эзлэхүүн']},
  {n:'<tex>\\pi</tex> тест',href:'/books/PI',s:'Давтлагын тест',d:'Шалгалтын бүтэцтэй давтлагын тест',sh:'pi',tags:['Тест','Сорил']}
];
const A1='#B8CBEF', W1='#FFFFFF';
const SH={
 grid:'<svg viewBox="0 0 100 100"><g fill="none" stroke="'+A1+'" stroke-width="1.6">'+Array.from({length:16},(_,i)=>`<rect x="${10+(i%4)*21}" y="${10+Math.floor(i/4)*21}" width="16" height="16" rx="3"/>`).join('')+'</g></svg>',
 tri:'<svg viewBox="0 0 100 100"><polygon points="12,86 88,86 34,16" fill="none" stroke="'+W1+'" stroke-width="2"/><circle cx="47" cy="62" r="20" fill="none" stroke="'+A1+'" stroke-width="1.6"/></svg>',
 circ:'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="38" fill="none" stroke="'+W1+'" stroke-width="2"/><path d="M50 50 L88 50 A38 38 0 0 0 69 17 Z" fill="rgba(184,203,239,.18)" stroke="'+A1+'" stroke-width="1.6"/><line x1="16" y1="68" x2="84" y2="68" stroke="'+A1+'" stroke-width="1.6"/></svg>',
 cube:'<svg viewBox="0 0 100 100"><g fill="none" stroke="'+W1+'" stroke-width="2"><rect x="18" y="34" width="46" height="46"/><rect x="36" y="18" width="46" height="46"/><path d="M18 34 L36 18 M64 34 L82 18 M64 80 L82 64 M18 80 L36 64"/></g><line x1="18" y1="80" x2="82" y2="18" stroke="'+A1+'" stroke-width="1.8" stroke-dasharray="5 4"/></svg>',
 pi:'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="36" fill="none" stroke="'+W1+'" stroke-width="2"/><line x1="14" y1="50" x2="86" y2="50" stroke="'+A1+'" stroke-width="1.8"/><circle cx="50" cy="50" r="3.5" fill="'+A1+'"/></svg>'
};
const texify=s=>s.replace(/<tex>(.*?)<\/tex>/g,(_,t)=>`<span data-t="${t}"></span>`);
const rot=$('#rot');
BOOKS.forEach((b,i)=>{
  const el=document.createElement('div'); el.className='bk';
  el.innerHTML=`<div class="face"><div class="hd"><span>${String(i+1).padStart(2,'0')}</span><span>/ 07</span></div>
    <div class="cv">${b.img?`<img src="${b.img}" alt="">`:`${SH[b.sh]}<div class="slot">3D загварын зай</div>`}</div>
    <div class="t">${texify(b.n)}</div><div class="d">${b.s}</div></div>`;
  rot.appendChild(el);
});
const bks=$$('.bk');
$('#bProg').innerHTML=BOOKS.map(()=>'<i></i>').join('');
const dashes=$$('#bProg i');
let bkCur=-1;
function bookMeta(i,force){ if(i===bkCur&&!force) return; bkCur=i; const b=BOOKS[i];
  $('#bIdx').textContent=String(i+1).padStart(2,'0')+' / 07';
  $('#bName').innerHTML=texify(b.n); $$('#bName [data-t]').forEach(e=>tex(e,e.dataset.t));
  $('#bDesc').textContent=b.d; $('#bChips').innerHTML=b.tags.map(t=>`<span>${t}</span>`).join('');
  $('#bOpen').href=b.href||'/books';
  dashes.forEach((d,k)=>d.classList.toggle('on',k===i));
}
bookMeta(0);

/* Амжилтын сувгууд: суваг бүр нэг бодит тоо, ард нь тэр тоонд орсон сурагчдын нүүр.
   Нүүр: amjilt/faces/ (build_amjilt_faces.py), t: 8 = 800, 7 = 700–799, 6 = 700-аас доош.
   Тоо: 2018–2026 математикийн ЭЕШ, SAT-аас дүйцүүлсэн оноо ОРОХГҮЙ.
   Эх: эзний амжилтын картууд, 2023 — амжилтын суваг (45), 2025 — эзний хүснэгт (5+58) */
const AMJ='/amjilt/';
const PF_YEARS=[[2018,16],[2019,16],[2020,15],[2021,16],[2022,24],[2023,45],[2024,26],[2025,63],[2026,94]];
const PF=Object.fromEntries(PF_YEARS);
const CH=[
  {g:'800 оноо',big:'20',sm:'2018–2026, математикийн ЭЕШ',cap:'сурагч 800 оноо авсан',d:'Математикаар дээд оноо авсан манай бүх сурагч, 2018 оноос хойш',f:x=>x.s==='mat'&&x.t===8},
  {g:'700+',big:'315',sm:'2018–2026, математикийн ЭЕШ',cap:'сурагч 700-аас дээш авсан',d:'Нүд бүр нэг сурагч, он оноор. Хоосон нүдний сурагчийн зураг одоогоор алга',f:x=>x.s==='mat'&&x.t>=7,byYear:true},
  {g:'15-аас 5',big:'5',sm:'ЭШ-2025, математик',cap:'Улаанбаатарт 800 авсан 15 сурагчийн 5 нь манайх',d:'Хоосон 10 нүд нь Улаанбаатарт 800 авсан бусад сурагч',f:x=>x.y===2025&&x.s==='mat'&&x.t===8,slots:15},
  {g:'Дундаж',big:'632',sm:'ЭШ-2025, математик',cap:'манай 331 сурагчийн дундаж, Улаанбаатарынх 497',d:'Ард нь тэр жил 700-аас дээш авсан манай сурагчид',f:x=>x.y===2025&&x.s==='mat'&&x.t>=7},
  {g:'2026 он',big:'94',sm:'ЭШ-2026, математик',cap:'сурагч 700-аас дээш авсан',d:'353 сурагчаас 259 нь 600-аас дээш, 6 нь 800 оноо авсан',f:x=>x.y===2026&&x.s==='mat'&&x.t>=7},
  {g:'Нийгэм',big:'684',sm:'ЭШ-2026, нийгэм судлал',cap:'анхны жилийн дундаж оноо',d:'Нийгэм судлалын анги нээгдсэн эхний жилдээ 2 сурагч 800 авсан, багш Болортуяа',f:x=>x.y===2026&&x.s==='soc'},
  {g:'SAT',big:'17',sm:'SAT анги, 2026',cap:'сурагч SAT-ын оноогоо ЭШ-д дүйцүүлсэн',d:'Гурван сарын SAT анги, багш Б. Дуламсүрэн. Дээрх 800, 700+ тоонд ороогүй',f:x=>x.y===2026&&x.s==='sat'}
];
const FACES={list:[],cols:1,rows:1};
async function facesLoad(){ try{ const r=await fetch(AMJ+'faces/index.json'); if(!r.ok) return; const j=await r.json();
  FACES.cols=j.cols; FACES.rows=j.rows; FACES.list=j.list.map(([y,i,s,t,o],k)=>({y,i,s,t,o,k})); }catch(e){} }
// Сувгийн нүдүүд: нүүр (эсвэл зураггүй бол null), «он оноор» бол он бүрийн тоонд хүртэл хоосон нүд нэмнэ
function chFaces(c){ const L=FACES.list.filter(c.f); if(!L.length) return L;
  if(c.byYear) return PF_YEARS.flatMap(([y,n])=>{ const a=L.filter(x=>x.y===y); return [...a,...Array(Math.max(0,n-a.length)).fill(null)]; });
  return c.slots?[...L,...Array(Math.max(0,c.slots-L.length)).fill(null)]:L; }
// 4:3 дэлгэцийг n нүдээр дүүргэх багана, мөр: хоосон нүд цөөн, нүд дөрвөлжинд ойр (атласын нүд сунахгүй)
function gridFor(n,dense){ let best=null;
  for(let c=1;c<=40;c++){ const r=Math.ceil(n/c), a=(4/3)/(c/r); if(dense?(a<.85||a>1.18):(a<.62||a>1.45)) continue;
    const s=(c*r-n)/n+Math.abs(Math.log(a))*.4; if(!best||s<best.s) best={c,r,s}; }
  return best||{c:Math.ceil(Math.sqrt(n)),r:Math.ceil(n/Math.ceil(Math.sqrt(n)))}; }
const chMos=$('#chMos'), chScr=$('#chScr'), chStage=$('#chStage'), chGuide=$('#chGuide');
function fillMos(c){ const L=chFaces(c); chMos._L=L;
  if(!L.length){ chMos.className='mos'; chMos.replaceChildren(); return; }
  const dense=L.length>30, g=gridFor(L.length,dense), A=AMJ+'faces/';
  chMos.className='mos'+(dense?' dense':''); chMos.style.gridTemplateColumns=`repeat(${g.c},1fr)`; chMos.style.gridTemplateRows=`repeat(${g.r},1fr)`;
  chMos.style.setProperty('--atl',`url(${A}atlas.webp)`); chMos.style.setProperty('--bs',`${FACES.cols*100}% ${FACES.rows*100}%`);
  let s='';
  for(let k=0;k<g.c*g.r;k++){ const x=L[k];
    if(!x){ s+='<i class="e"></i>'; continue; }
    if(dense){ const px=x.k%FACES.cols/Math.max(1,FACES.cols-1)*100, py=Math.floor(x.k/FACES.cols)/Math.max(1,FACES.rows-1)*100; s+=`<i data-k="${k}" style="background-position:${px}% ${py}%"></i>`; }
    else s+=`<i data-k="${k}"><img src="${A}${x.k}.webp" alt="" decoding="async"></i>`; }
  chMos.innerHTML=s; }
// Нүүрнээс амжилтын карт руу: бүлэг картын хэд хэдэн нүүр нэг картыг заана
function chCards(L){ const seen=new Set(), out=[]; L.forEach(x=>{ if(!x||seen.has(x.y+'/'+x.i)) return; seen.add(x.y+'/'+x.i); const d=(W.data[x.y]||[])[x.i]; if(d) out.push(d); }); return out; }
let ch=0, swiped=false, sx=0, sy=0;
const pad2=n=>String(n+1).padStart(2,'0');
chGuide.innerHTML=CH.map((c,i)=>`<button role="tab" data-i="${i}"><b>${c.big}</b><span>${c.g}</span></button>`).join('');
chGuide.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) showCh(+b.dataset.i,true); });
function showCh(i,anim){ ch=(i+CH.length)%CH.length; const c=CH[ch], li=(ch-1+CH.length)%CH.length, ri=(ch+1)%CH.length;
  const put=()=>{ $('#chSm').textContent=c.sm; $('#chBig').textContent=c.big; $('#chCap').textContent=c.cap; $('#chNo').textContent='CH '+pad2(ch);
    $('#chDesc').textContent=c.d; $('#lBig').textContent=CH[li].big; $('#rBig').textContent=CH[ri].big; $('#lNo').textContent='CH '+pad2(li); $('#rNo').textContent='CH '+pad2(ri);
    fillMos(c); $$('#chGuide button').forEach((b,k)=>b.setAttribute('aria-selected',String(k===ch)));
    chStage.classList.remove('off','on'); if(anim&&!RM){ void chStage.offsetWidth; chStage.classList.add('on'); } };
  chScr.classList.remove('peek');
  const gb=chGuide.children[ch]; if(gb&&chGuide.scrollWidth>chGuide.clientWidth) chGuide.scrollTo({left:gb.offsetLeft-chGuide.clientWidth/2+gb.offsetWidth/2,behavior:'smooth'});
  if(anim){ chStage.classList.add('off'); setTimeout(put,140); } else put();
}
showCh(0);
$('#tvL').onclick=()=>showCh(ch-1,true);
$('#tvR').onclick=()=>showCh(ch+1,true);
// Хулгана: дэлгэц дээр очиход нүүр тодорно. Утас: эхний товшилтоор тодорно, дараагийнхаар карт нээгдэнэ, хажуу тийш шудрахад суваг солигдоно
chScr.addEventListener('pointerenter',e=>{ if(e.pointerType==='mouse'&&chMos.childElementCount) chScr.classList.add('peek'); });
chScr.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse') chScr.classList.remove('peek'); });
chScr.addEventListener('click',e=>{ if(swiped){ swiped=false; return; } if(!chMos.childElementCount) return;
  if(!chScr.classList.contains('peek')){ chScr.classList.add('peek'); return; }
  const t=e.target.closest('#chMos i[data-k]'); if(!t){ chScr.classList.remove('peek'); return; }
  const L=chMos._L, x=L[+t.dataset.k], cards=chCards(L), d=x&&(W.data[x.y]||[])[x.i]; if(d) lbOpen(cards.indexOf(d),cards); });
chScr.addEventListener('touchstart',e=>{ sx=e.touches[0].clientX; sy=e.touches[0].clientY; swiped=false; },{passive:true});
chScr.addEventListener('touchend',e=>{ const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.4){ swiped=true; showCh(ch+(dx<0?1:-1),true); } },{passive:true});
// Атлас (≈290KB) зөвхөн амжилтын хэсэг ойртоход ачаалагдана
const tvIO=new IntersectionObserver((e,o)=>{ if(!e[0].isIntersecting) return; o.disconnect(); facesLoad().then(()=>{ if(FACES.list.length) showCh(ch); }); },{rootMargin:'800px 0px'});
tvIO.observe($('#results'));

const polIO=new IntersectionObserver((e,o)=>{ if(e[0].isIntersecting){ $('#pol').classList.add('in'); o.disconnect(); } },{threshold:.25}); polIO.observe($('#pol'));
$$('#pol .pc').forEach((c,i)=>c.style.transitionDelay=(i*110)+'ms');


/* Он оноор: сурагч бүрийн амжилт (зураг: amjilt/<он>.json) */
let WALL_YEARS=[2026];
const W={data:{},year:null,subj:'all',shown:0,list:[]}; window.__W=W;
const wGrid=$('#wGrid'), wYears=$('#wYears'), wSubj=$('#wSubj'), wCnt=$('#wCnt'), wMore=$('#wMore'), wLess=$('#wLess');
const SUBJ={all:'Бүгд',mat:'Математик',soc:'Нийгэм судлал',sat:'SAT',cls:'Анги'};
// Оны товч дүн (эх: эзний Facebook нийтлэл, амжилтын суваг)
const YNOTE={2026:'353 сурагч, 73% нь 600-аас дээш',2025:'331 сурагч, дундаж 632 оноо, Улаанбаатарын дундаж 497',2024:'10 ангийн 285 сурагч, 72% нь 600-аас дээш',2023:'190 гаруй сурагч, 45 нь 700-аас дээш'};
const wNote=$('#wNote');
const capOf=d=>[d.n,d.o?d.o+' оноо':'',d.sc].filter(Boolean).join(', ');
async function wallInit(){
  try{ const r=await fetch('/amjilt/index.json'); if(r.ok){ const ys=await r.json(); if(Array.isArray(ys)&&ys.length) WALL_YEARS=ys; } }catch(e){}
  for(const y of WALL_YEARS){ try{ const r=await fetch('/amjilt/'+y+'.json'); W.data[y]=r.ok?(await r.json()).map(d=>{ for(const k of ['t','f','a']) if(d[k]&&d[k][0]!=='/') d[k]='/'+d[k]; return d; }):[]; }catch(e){ W.data[y]=[]; } }
  // Оны таб = багана: өндөр нь тэр жил 700-аас дээш авсан сурагчийн тоо (PF_YEARS), эртнээс нь
  const pfMax=Math.max(...PF_YEARS.map(y=>y[1]));
  wYears.innerHTML=[...WALL_YEARS].sort((a,b)=>a-b).map(y=>{ const n=PF[y]; return `<button role="tab" data-y="${y}" aria-label="${y} он${n?', '+n+' сурагч 700-аас дээш':''}">${n?`<i style="--h:${Math.max(8,Math.round(n/pfMax*100))}"></i>`:''}${y}<small>${n||W.data[y].length}</small></button>`; }).join('');
  wYears.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b) wallYear(+b.dataset.y); });
  wSubj.addEventListener('click',e=>{ const b=e.target.closest('button'); if(b){ W.subj=b.dataset.s; wallRender(); } });
  wallYear(WALL_YEARS[0]);
  showCh(ch); heroFaces(); clsInit();
}
function wallYear(y){
  W.year=y; W.subj='all'; const subs=[...new Set(W.data[y].map(d=>d.s))].filter(k=>k!=='cls');
  wNote.textContent=YNOTE[y]||'';
  wSubj.innerHTML=subs.length>1?['all',...subs].map(k=>`<button role="tab" data-s="${k}">${SUBJ[k]||k}</button>`).join(''):'';
  $$('#wYears button').forEach(b=>{ const on=+b.dataset.y===y; b.setAttribute('aria-selected',String(on)); if(on&&wYears.scrollWidth>wYears.clientWidth) wYears.scrollLeft=b.offsetLeft-wYears.clientWidth/2+b.offsetWidth/2; });
  wallRender();
}
function wallRender(){
  $$('#wSubj button').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.s===W.subj)));
  wGrid.classList.toggle('cls',W.subj==='cls');
  W.list=W.data[W.year].filter(d=>W.subj==='all'?(d.s!=='cls'&&d.s!=='sat'):d.s===W.subj); // SAT, анги — өөрийн табд
  if(W.subj==='all') W.list=[...W.list].sort((a,b)=>(b.o||0)-(a.o||0)||(a.s===b.s?0:a.s==='mat'?-1:1)); W.shown=0; wGrid.replaceChildren();
  if(!W.list.length){ const e=document.createElement('div'); e.className='wempty'; e.textContent='Энэ оны зураг одоогоор алга'; wGrid.appendChild(e); }
  wallMore();
}
function wallMore(){
  const step=innerWidth<700?12:20, next=W.list.slice(W.shown,W.shown+step);
  next.forEach((d,k)=>{ const i=W.shown+k, b=document.createElement('button'); b.className='it'+(d.group?' wide':''); b.setAttribute('aria-label',capOf(d));
    if(d.s==='cls'){ const c=document.createElement('span'); c.className='cap2'; const bb=document.createElement('b'); bb.textContent=d.n; c.append(bb,document.createTextNode(d.sc||'')); b.appendChild(c); }
    const im=new Image(); im.loading='lazy'; im.decoding='async'; im.alt=capOf(d); if(d.w){ im.width=d.w; im.height=d.h; } im.onload=()=>im.classList.add('ld'); im.src=d.t;
    b.appendChild(im); b.addEventListener('click',()=>lbOpen(i,W.list)); wGrid.appendChild(b); });
  W.shown+=next.length; wMore.hidden=W.shown>=W.list.length; wLess.hidden=W.shown<=step;
  wCnt.textContent=W.list.length?`${W.year} он: ${W.list.length} зураг, ${W.shown} нь харагдаж байна`:'';
}
wMore.addEventListener('click',wallMore);
wLess.addEventListener('click',()=>{ wallRender(); goTo($('#wall').getBoundingClientRect().top+scrollY); });
function heroFaces(){ const top=(W.data[2026]||[]).filter(d=>d.s==='mat'&&d.o===800).slice(0,3); const bs=$$('.trust .av b');
  top.forEach((d,k)=>{ if(!bs[k]) return; const im=new Image(); im.src=d.a; im.alt=d.n; bs[k].replaceChildren(im); }); }
const lb=$('#lb'), lbImg=$('#lbImg'), lbCap=$('#lbCap'); let lbI=0, lbL=[];
function lbOpen(i,list){ if(list) lbL=list; if(!lbL.length) lbL=W.list; if(!lbL.length) return; lbI=(i+lbL.length)%lbL.length; const d=lbL[lbI];
  lbImg.src=d.f; lbImg.alt=capOf(d);
  const b=document.createElement('b'); b.textContent=d.n||''; lbCap.replaceChildren(b,document.createTextNode([d.o?d.o+' оноо':'',d.sc].filter(Boolean).map(x=>', '+x).join('')));
  lb.hidden=false; lenis&&lenis.stop(); $('#lbX').focus(); }
function lbClose(){ lb.hidden=true; lenis&&lenis.start(); }
$('#lbX').addEventListener('click',lbClose); $('#lbP').addEventListener('click',()=>lbOpen(lbI-1)); $('#lbN').addEventListener('click',()=>lbOpen(lbI+1));
lb.addEventListener('click',e=>{ if(e.target===lb) lbClose(); });
on(window,'keydown',e=>{ if(lb.hidden) return; if(e.key==='Escape') lbClose(); if(e.key==='ArrowLeft') lbOpen(lbI-1); if(e.key==='ArrowRight') lbOpen(lbI+1); });
/* Ангиуд: он бүрийн 12-р ангиуд, багштай нь (эх: эзний Facebook зураг) */
const cYears=$('#cYears'), cGrid=$('#cGrid');
function clsInit(){ const ys=WALL_YEARS.filter(y=>(W.data[y]||[]).some(d=>d.s==='cls')); if(!ys.length) return;
  cYears.innerHTML=ys.map(y=>`<button role="tab" data-y="${y}">${y}</button>`).join('');
  cYears.onclick=e=>{ const b=e.target.closest('button'); if(b) clsYear(+b.dataset.y); }; clsYear(ys[0]); }
function clsYear(y){ $$('#cYears button').forEach(b=>b.setAttribute('aria-selected',String(+b.dataset.y===y)));
  const L=W.data[y].filter(d=>d.s==='cls'); cGrid.replaceChildren();
  L.forEach((d,i)=>{ const b=document.createElement('button'); b.className='cc2'; b.setAttribute('aria-label',capOf(d)+', '+y+' он');
    const im=new Image(); im.src=d.t; im.alt=''; im.loading='lazy'; const cb=document.createElement('div'); cb.className='cb';
    const t=document.createElement('b'), m=(d.n||'').match(/^(\d+-\d+)/); t.textContent=m?m[1]:(d.n||'').replace(' багшийн анги','');
    const sp=document.createElement('span'); sp.textContent=m?(d.sc||y+' он'):'багшийн анги, '+y;
    cb.append(t,sp); b.append(im,cb); b.addEventListener('click',()=>lbOpen(i,L)); cGrid.appendChild(b); }); }
wallInit();
$$('#pol .pc[data-tch]').forEach(c=>c.addEventListener('click',()=>{ const L=(W.data[+c.dataset.y]||[]).filter(d=>d.s==='cls'&&((d.sc||'')+(d.n||'')).includes(c.dataset.tch)); if(L.length) lbOpen(0,L); }));


const wmk=$('#wmk'); let wmHover=false;
// Нэр бүтнээрээ («Шинэ Ирээдүйн Эзэд») өргөнд багтана — фонт ачаалагдсаны дараа, цонх өөрчлөгдөхөд дахин
function fitWmk(){ wmk.style.fontSize=''; const rg=document.createRange(); rg.selectNodeContents(wmk); const tw=rg.getBoundingClientRect().width, cw=wmk.clientWidth;
  if(tw>0&&cw>0){ const fs=parseFloat(getComputedStyle(wmk).fontSize); wmk.style.fontSize=Math.min(fs*cw/tw*.97,220)+'px'; } }
fitWmk(); on(window,'resize',fitWmk); if(document.fonts) document.fonts.ready.then(fitWmk);
wmk.addEventListener('pointermove',e=>{ const r=wmk.getBoundingClientRect(); wmHover=true; wmk.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%'); wmk.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%'); });
wmk.addEventListener('pointerleave',()=>wmHover=false);

const clockEl=$('#clock');
const tickClock=()=>{ clockEl.textContent='Улаанбаатар, '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Ulaanbaatar'})+' (GMT+8)'; };
tickClock(); const clockTimer=setInterval(tickClock,15000);

const cur=$('#cur'); let cx=innerWidth/2, cy=innerHeight/2, tx=cx, ty=cy;
on(window,'pointermove',e=>{ tx=e.clientX; ty=e.clientY; S.mx=e.clientX/innerWidth-.5; S.my=e.clientY/innerHeight-.5; cur.classList.toggle('big',!!e.target.closest('a,button,.chip,.tv.side,.tag')); },{passive:true});

const EL={lab:$('#labView'),hero:$('#hero'),idea:$('#idea'),ring:$('#books'),tvrow:$('#tvrow'),slide:$('#slide'),glb:$('#branches'),notew:$('#notew'),wmk:wmk};
const heroView=$('#heroView'), shade=$('#heroShade'), fly=$('#fly'), b1=$('#b1'), b2=$('#b2'), out=$('#out'), tag=$('#tag'), b2li=$$('#b2 li');
const w1=$('#w1'), w2=$('#w2'), bigA=$('#bigA'), bigB=$('#bigB');
const tvM=$('#tvM'), tvL=$('#tvL'), tvR=$('#tvR');
const sl1=$('#sl1'), sl2=$('#sl2');
const gv=$('#gv'), gl=$('#gl'), gr=$('#gr'), glt=$('#glt'), glbl=$('#glb'), gt=$('#gt');
const logoFix=$('#logoFix');
let logoY=-1;
function logoTone(){ const L=!!logoFix.closest('.light'); if(L!==logoY){ logoY=L; logoFix.classList.toggle('light',L); } }
/* Өнгө: Цагаан / Хөх (эзэн 2026-10-17) — анх хөх, сонголт хадгалагдана; 3D-д window.__theme */
const THEME_EL=root, THEME_KEY='pi-home-theme';
function setTheme(t,save){ const light=t==='light'; THEME_EL.classList.toggle('light',light); window.__themeNow=t;
  $$('.thm button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.th===t)));
  if(window.__theme) window.__theme(light); logoY=-1e9; // логоны өнгийг заавал дахин шалгана
  if(save){ try{ localStorage.setItem(THEME_KEY,t); }catch(e){} } }
let th0='dark'; try{ th0=localStorage.getItem(THEME_KEY)==='light'?'light':'dark'; }catch(e){}
setTheme(th0,false);
$$('.thm button').forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.th,true)));
let swing=0;
const pinP=r=>clamp(-r.top/(r.height-innerHeight));
const seen=r=>r.bottom>-60 && r.top<innerHeight+60;

function frame(now){
  if(dead) return;
  lenis && lenis.raf(now);
  const vh=innerHeight, vw=innerWidth, desk=vw>=900, t=now/1000;
  S.vel=lenis? lenis.velocity : 0;
  const R={}; for(const k in EL) R[k]=EL[k].getBoundingClientRect();

  cx+=(tx-cx)*.2; cy+=(ty-cy)*.2; cur.style.transform=`translate3d(${cx}px,${cy}px,0)`;
  const past=R.hero.bottom<vh*.5; root.classList.toggle('past',past); logoTone();

  /* 1. HERO */
  S.vHero=seen(R.hero);
  if(S.vHero){
    const p=S.hero=pinP(R.hero);
    const fo=range(p,0,.09);
    fly.style.opacity=1-fo; fly.style.transform=`translate3d(0,${-ease(fo)*90}px,0)`; fly.style.pointerEvents=fo>.5?'none':'auto';
    const o1=range(p,.11,.15)*(1-range(p,.34,.38)); b1.style.opacity=o1;
    const fill=Math.round(range(p,.15,.31)*sayW.length); sayW.forEach((w,i)=>w.classList.toggle('on',i<fill));
    const o2=range(p,.39,.43)*(1-range(p,.65,.69)); b2.style.opacity=o2;
    b2li.forEach((li,i)=>{ const c=ease(range(p,.43+i*.035,.48+i*.035)); li.style.opacity=c; li.style.transform=`translate3d(0,${(1-c)*30}px,0)`; });
    const k=easeIO(range(p,.72,.9));
    const top=k*(desk?.12:.1)*vh, bot=k*(desk?.14:.16)*vh, side=k*(desk?64:16), rad=k*28;
    heroView.style.clipPath=k>0?`inset(${top}px ${side}px ${bot}px ${side}px round ${rad}px)`:'none';
    const q=ease(range(p,.8,.9)); out.style.opacity=q; out.style.transform=`translate3d(0,${(1-q)*40}px,0)`; out.style.pointerEvents=q>.6?'auto':'none';
    shade.style.opacity=clamp(.85+.15*Math.max(o1,o2)-.55*k);
    const tagOff=1-range(p,.36,.4)*(1-range(p,.66,.7)); // 4 алхамтай давхцахгүй
    tag.style.opacity=(desk? clamp(1-range(p,.06,.1)*.35+range(p,.86,.92)) : clamp(1-range(p,.06,.1))*(1-range(p,.7,.78)))*tagOff; tag.style.pointerEvents=tagOff<.5?'none':'auto';
  }

  S.vLab=seen(R.lab);

  /* 3. Бөөмс */
  S.vIdea=seen(R.idea);
  if(S.vIdea){
    const p=S.idea=pinP(R.idea);
    w1.style.transform=`translate3d(${-p*6}vw,0,0)`; // зөөлөн, бага хөдөлгөөн
    w2.style.transform=`translate3d(${p*6}vw,0,0)`;
  }

  /* 4. Номын цилиндр */
  if(seen(R.ring)){
    const p=pinP(R.ring), n=BOOKS.length, pos=p*(n-1), step=desk?36:40;
    const cw=desk?Math.min(300,vw*.22):Math.min(230,vw*.56), Rr=cw*(desk?1.55:1.3);
    rot.style.setProperty('--cw',cw+'px');
    rot.style.transform=`translate3d(0,0,${-Rr}px)`;
    bks.forEach((el,i)=>{ const a=(i-pos)*step, d=Math.abs(i-pos);
      el.style.transform=`rotateY(${a}deg) translateZ(${Rr}px)`;
      el.style.opacity=d>2.4?0:1; el.style.filter=d>.5?`brightness(${1-Math.min(d-.5,1.5)*.25}) blur(${Math.min(d-.5,1.5)}px)`:'none'; });
    bookMeta(Math.round(pos));
    bigA.style.transform=`translate3d(${10-p*130}vw,0,0)`;
    bigB.style.transform=`translate3d(${-120+p*120}vw,0,0)`;
  }

  /* 6. Зурагт */
  if(seen(R.tvrow)){
    const e=ease(range(vh-R.tvrow.top,0,vh*.75));
    tvM.style.transform=`translate3d(0,${(1-e)*80}px,0) scale(${.86+.14*e})`;
    const off=Math.min(560,vw*.36);
    tvL.style.transform=`translate3d(${-off-(1-e)*120}px,40px,-200px) rotateY(28deg) scale(.62)`;
    tvR.style.transform=`translate3d(${off+(1-e)*120}px,40px,-200px) rotateY(-28deg) scale(.62)`;
  }

  /* 7. Хоёр мөр */
  if(seen(R.slide)){
    const q=clamp((vh-R.slide.top)/(vh+R.slide.height));
    sl1.style.transform=`translate3d(${10-q*70}vw,0,0)`; sl2.style.transform=`translate3d(${-80+q*70}vw,0,0)`;
  }

  /* 8. Дэлхий: тойрог томорно */
  S.nearGlobe=R.glb.top<vh*3;
  S.vGlobe=seen(R.glb);
  if(S.vGlobe){
    const p=S.globe=pinP(R.glb), k=easeIO(range(p,.03,.3));
    const s0=desk?340:vw*.64, rad=lerpN(s0/2,Math.hypot(vw,vh)/2+2,k);
    S.globeR=rad; S.globeS0=s0;
    gv.style.clipPath=k<1?`circle(${rad}px at 50% 50%)`:'none';
    const so=range(p,.05,.26);
    if(desk){ gl.style.transform=`translate3d(${-so*30}vw,-50%,0)`; gr.style.transform=`translate3d(${so*30}vw,-50%,0)`; }
    else { gl.style.transform=`translate3d(${-so*40}vw,0,0)`; gr.style.transform=`translate3d(${so*40}vw,0,0)`; }
    gl.style.opacity=gr.style.opacity=1-range(p,.14,.28); glt.style.opacity=glbl.style.opacity=1-range(p,.03,.14);
    const g=ease(range(p,.7,.8)); gt.style.opacity=g; gt.style.transform=desk?`translate3d(${(1-g)*-40}px,-50%,0)`:`translate3d(0,${(1-g)*40}px,0)`; gt.classList.toggle('on',g>.5);
  }

  /* 11. Өлгөөтэй тэмдэглэл */
  if(seen(R.notew)){ swing+=(clamp(S.vel*.5,-10,10)-swing)*.06; EL.notew.style.transform=`rotate(${Math.sin(t*1.3)*1.4+swing}deg)`; }

  if(!wmHover && seen(R.wmk)){ wmk.style.setProperty('--mx',(50+42*Math.sin(t*.45))+'%'); wmk.style.setProperty('--my','55%'); }

  window.__three && window.__three(S,t);
  rafId=requestAnimationFrame(frame);
}
function lerpN(a,b,t){ return a+(b-a)*t; }
rafId=requestAnimationFrame(frame);

$$('.chip').forEach(c=>{
  const set=v=>{ S.go=v; $$('.chip').forEach(x=>x.classList.toggle('on',!!v&&x===c)); };
  c.addEventListener('pointerenter',e=>{ if(e.pointerType==='mouse') set(c.dataset.go); });
  c.addEventListener('pointerleave',e=>{ if(e.pointerType==='mouse') set(null); });
  c.addEventListener('click',()=>set(S.go===c.dataset.go&&c.classList.contains('on')?null:c.dataset.go));
});

(()=>{
  createIcons({icons:ICONS,attrs:{'stroke-width':1.75}});
  const go=()=>{ if(!katex) return setTimeout(go,80);
    $$('[data-tex]').forEach(e=>tex(e,e.dataset.tex)); $$('[data-t]').forEach(e=>tex(e,e.dataset.t)); bookMeta(bkCur<0?0:bkCur,true); syncR(); };
  go();
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('ready')));
})();

  return () => {
    dead = true; cancelAnimationFrame(rafId); clearInterval(clockTimer); polIO.disconnect(); tvIO.disconnect();
    offs.forEach((f) => f()); if (lenis) lenis.destroy();
    delete window.S; delete window.LAB; delete window.labPick; delete window.__W;
  };
}
