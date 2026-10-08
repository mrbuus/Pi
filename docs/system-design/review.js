/* Local requirements review only. Does not mark production features complete. */
(function(root){
'use strict';
const states={unread:'Уншаагүй',read:'Уншсан',approved:'Санал нийлсэн',change:'Засах саналтай'};
function clean(data){
 if(!data||data.version!==1||!data.entries||typeof data.entries!=='object'||Array.isArray(data.entries))throw Error('Review JSON v1 файл шаардлагатай. Байрлалын JSON биш.');
 const out=Object.create(null),rows=Object.entries(data.entries);if(rows.length>10000)throw Error('10000-аас олон тэмдэглэл байна.');
 for(const [key,v] of rows){
  if(!/^[\w\-:.\u0400-\u04ff/ ]{1,500}$/.test(key)||['__proto__','constructor','prototype'].includes(key))throw Error('Буруу тэмдэглэлийн ID.');
  if(!v||!Object.hasOwn(states,v.state)||typeof v.note!=='string'||v.note.length>20000||typeof v.title!=='string'||v.title.length>1000||!Number.isFinite(Date.parse(v.updatedAt)))throw Error('Тэмдэглэлийн бүтэц/хугацаа буруу: '+key);
  out[key]={state:v.state,note:v.note,title:v.title,updatedAt:v.updatedAt};
 }return out;
}
function merge(current,incoming,replace=false){const result=Object.assign(Object.create(null),current);let conflicts=0;for(const [k,v] of Object.entries(incoming)){if(result[k]){conflicts++;if(!replace)continue;}result[k]=v;}return {entries:result,conflicts};}
if(typeof module!=='undefined'){module.exports={clean,merge,states};return;}
const KEY='pi-requirement-review-v1',esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let entries=Object.create(null),warning='',pending=null;
try{const raw=localStorage.getItem(KEY);if(raw)entries=clean(JSON.parse(raw));}catch{warning='Өмнөх тэмдэглэлийг уншиж чадсангүй. Нөөц JSON-оо шалгана уу; шинэ хадгалалт өмнөхийг солих боломжтой.';}
const dialog=document.createElement('dialog');dialog.id='reviewDialog';document.body.append(dialog);
function data(){return {version:1,exportedAt:new Date().toISOString(),entries};}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(data()));warning='';return true;}catch{warning='Browser хадгалалт боломжгүй/дүүрсэн. Энэ tab-д л байна. JSON нөөц татаж аваарай.';return false;}}
function download(){flush();const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data(),null,2)],{type:'application/json'}));a.download='pi-review-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function flush(){if(pending){const fn=pending;pending=null;fn();}}
function shell(title,body){flush();dialog.innerHTML=`<div class="modal-top"><h2>${esc(title)}</h2><button data-close aria-label="Хаах">×</button></div><div class="review-body"><p class="small">Зөвхөн энэ browser-д хадгална. Өөр Safari/төхөөрөмжид автоматаар sync хийхгүй. JSON татаж нөөцлөөрэй. «Санал нийлсэн» нь feature хэрэгжсэн гэсэн үг биш.</p>${body}</div>`;dialog.querySelector('[data-close]').onclick=()=>{flush();dialog.close()};if(!dialog.open)dialog.showModal();dialog.scrollTop=0;}
function open(id,title){const row=entries[id]||{state:'unread',note:''};shell(title,`<label>Уншсан төлөв<select id="reviewState">${Object.entries(states).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Миний санал<textarea id="reviewText" rows="9" maxlength="20000" placeholder="Юуг өөрчлөх, ямар асуулт үлдсэнийг бичнэ үү."></textarea></label><p id="reviewSave" role="status"></p><button id="reviewExport">JSON нөөц татах</button>`);
 const select=dialog.querySelector('#reviewState'),area=dialog.querySelector('#reviewText'),msg=dialog.querySelector('#reviewSave');select.value=row.state;area.value=row.note;msg.textContent=warning||'Өөрчлөлт автоматаар хадгалагдана.';
 const save=()=>{entries[id]={state:select.value,note:area.value,title,updatedAt:new Date().toISOString()};msg.textContent=persist()?'Хадгаллаа · '+new Date().toLocaleTimeString():warning;document.dispatchEvent(new Event('pi-review-change'));};
 let timer;const changed=()=>{clearTimeout(timer);pending=save;msg.textContent='Хадгалж байна…';timer=setTimeout(flush,300);};select.onchange=changed;area.oninput=changed;dialog.querySelector('#reviewExport').onclick=download;
}
function list(){shell('Миний уншсан тэмдэг ба засах саналууд',`<div class="reader-controls"><select id="reviewFilter"><option value="">Бүх хадгалсан</option>${Object.entries(states).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select><input id="reviewSearch" placeholder="ID, нэр, саналаас хайх"><button id="reviewExport">JSON татах</button><label class="button">JSON оруулах<input id="reviewImport" type="file" accept="application/json,.json"></label><select id="reviewMerge"><option value="keep">Давхардвал одоогийнхыг хадгалах</option><option value="replace">Давхардвал оруулсан хувилбараар солих</option></select></div><p id="reviewResult" role="status">${esc(warning)}</p><div id="reviewRows"></div>`);
 const draw=()=>{const q=dialog.querySelector('#reviewSearch').value.toLowerCase(),filter=dialog.querySelector('#reviewFilter').value;const rows=Object.entries(entries).filter(([k,v])=>(!filter||v.state===filter)&&(k+' '+v.title+' '+v.note).toLowerCase().includes(q)).sort((a,b)=>b[1].updatedAt.localeCompare(a[1].updatedAt));const box=dialog.querySelector('#reviewRows');box.innerHTML=rows.map(([k,v])=>`<article class="review-row"><b>${esc(states[v.state])} · ${esc(v.title)}</b><small>${esc(k)} · ${esc(new Date(v.updatedAt).toLocaleString())}</small><p>${esc(v.note)||'Тайлбаргүй'}</p><button data-edit="${esc(k)}">Тэмдэглэл засах</button> <button data-jump="${esc(k)}">Холбоотой хэсэг</button></article>`).join('')||'<p>Хадгалсан тэмдэглэл алга.</p>';box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>open(b.dataset.edit,entries[b.dataset.edit].title));box.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>{dialog.close();document.dispatchEvent(new CustomEvent('pi-review-jump',{detail:b.dataset.jump}))});};
 dialog.querySelector('#reviewFilter').onchange=draw;dialog.querySelector('#reviewSearch').oninput=draw;dialog.querySelector('#reviewExport').onclick=download;
 dialog.querySelector('#reviewImport').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>5*1024*1024)throw Error('Файл 5MB-аас том байна.');const incoming=clean(JSON.parse(await f.text()));const merged=merge(entries,incoming,dialog.querySelector('#reviewMerge').value==='replace');if(Object.keys(entries).length)download();entries=merged.entries;const ok=persist();draw();dialog.querySelector('#reviewResult').textContent=`${Object.keys(incoming).length} тэмдэглэл уншлаа; ${merged.conflicts} давхардал сонгосон дүрмээр. Өмнөх тэмдэглэлийг JSON нөөцөөр татав. ${ok?'Хадгаллаа.':warning}`;document.dispatchEvent(new Event('pi-review-change'));}catch(err){dialog.querySelector('#reviewResult').textContent=err.message;}e.target.value='';};draw();
}
dialog.addEventListener('cancel',flush);dialog.addEventListener('close',flush);window.addEventListener('beforeunload',flush);
root.PI_REVIEW={open,list,download,get:id=>entries[id],states};
})(typeof window!=='undefined'?window:globalThis);
