/* Load the large, local schedule source only when requested. */
(()=>{'use strict';let pending;
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(new Error('Эх файлыг уншиж чадсангүй: '+src));};document.body.append(s);});}
async function open(id){const button=document.getElementById('scheduleEvidence');button.disabled=true;button.textContent='Хуваарийн эхийг уншиж байна…';try{if(!pending)pending=(async()=>{if(!window.PI_SCHEDULE)await script('system-design/schedule-data.js');if(!window.PI_SCHEDULE_VIEW)await script('system-design/schedule-review.js');})();await pending;window.PI_SCHEDULE_VIEW.open(id);}catch(e){pending=null;button.textContent='Уншиж чадсангүй · дахин оролдох';button.title=e.message;return;}finally{button.disabled=false;}button.textContent='Хуваарь: өдөр бүр';}
document.getElementById('scheduleEvidence').addEventListener('click',()=>open());document.addEventListener('pi-review-jump',e=>{if(String(e.detail).startsWith('schedule:'))open(e.detail.slice(9));});
})();
