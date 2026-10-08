/* Scenario estimates, not a cloud invoice. No API calls or subscriptions. */
(function(root){
const sources=[
 ['Google Cloud Storage — үнэ','https://cloud.google.com/storage/pricing'],
 ['GCS — lifecycle','https://docs.cloud.google.com/storage/docs/lifecycle'],
 ['GCS — soft delete','https://docs.cloud.google.com/storage/docs/soft-delete'],
 ['GCS — signed URL','https://docs.cloud.google.com/storage/docs/access-control/signed-urls'],
 ['Cloud SQL — HA','https://docs.cloud.google.com/sql/docs/postgres/high-availability'],
 ['Cloudflare R2 — үнэ','https://developers.cloudflare.com/r2/pricing/']
];
const rates={date:'2026-09-22',region:'GCS Standard · Seoul (asia-northeast3) · flat namespace',storage:0.023,egress:0.12,classA:0.005/1000,classB:0.0004/1000,r2Storage:0.015};
function estimate(o={}){
 const x={students:700,daysPerWeek:4,photos:5,mb:0.5,thumbMB:0.05,views:2,retention:'days',days:30,lessons:10,softDays:7,extraPct:0,...o};
 const numeric=['students','daysPerWeek','photos','mb','thumbMB','views','days','lessons','softDays','extraPct'];
 for(const k of numeric)if(!Number.isFinite(x[k])||x[k]<0)throw new Error('Буруу оролт: '+k);
 if(!x.students||!x.daysPerWeek||!x.photos||!x.mb||x.daysPerWeek>7)throw new Error('Сурагч, өдөр, зураг, хэмжээ эерэг; өдөр ≤7 байна.');
 if(!['days','lessons'].includes(x.retention)||!(x.retention==='days'?x.days:x.lessons))throw new Error('Хадгалалтын төрөл болон эерэг хугацаа сонгоно.');
 const sessions=x.daysPerWeek*30/7;
 const photos=x.students*sessions*x.photos*(1+x.extraPct/100);
 const bytes=photos*(x.mb+x.thumbMB)*1e6;
 const effectiveDays=x.retention==='lessons'?x.lessons/x.daysPerWeek*7:x.days;
 const liveBytes=bytes*effectiveDays/30;
 const billedBytes=bytes*(effectiveDays+x.softDays)/30;
 const egressBytes=bytes*x.views;
 if(egressBytes/2**30>10240)throw new Error('Download 10 TiB-ээс давлаа. Дараагийн үнийн шаттай тусгай тооцоо шаардлагатай.');
 const a=photos*3,b=photos*(2*x.views+1);
 const storage=billedBytes/2**30*rates.storage;
 const egress=egressBytes/2**30*rates.egress;
 const ops=a*rates.classA+b*rates.classB;
 const r2=Math.ceil(Math.max(0,liveBytes/1e9-10))*rates.r2Storage+
   Math.ceil(Math.max(0,a-1e6)/1e6)*4.5+Math.ceil(Math.max(0,b-1e7)/1e6)*0.36;
 return {input:x,sessions,photos,effectiveDays,liveGB:liveBytes/1e9,billedGiB:billedBytes/2**30,monthlyGB:bytes/1e9,egressGiB:egressBytes/2**30,a,b,storage,egress,ops,total:storage+egress+ops,r2};
}
const api={estimate,rates,sources};if(typeof module!=='undefined')module.exports=api;else root.PI_COSTS=api;
})(typeof window!=='undefined'?window:globalThis);
