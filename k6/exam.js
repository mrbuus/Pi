import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { SharedArray } from 'k6/data';
import { safeTarget } from './target.js';
const target=safeTarget(__ENV.LOAD_TARGET,Boolean(__ENV.LOAD_TARGET));
const vus=Number(__ENV.LOAD_VUS||2000);
if(!Number.isInteger(vus)||vus<1||vus>2000)throw new Error('LOAD_VUS must be 1..2000');
const fixtures=new SharedArray('synthetic students',()=>JSON.parse(open(__ENV.LOAD_FIXTURE||'./fixture.json')));
if(fixtures.length<vus)throw new Error('Need a distinct synthetic fixture/token for every VU');
const tokens=new Set();
for(const f of fixtures){if(typeof f.token!=='string'||!f.token||tokens.has(f.token)||typeof f.testId!=='string'||!/^lttest_/.test(f.testId)||!Array.isArray(f.problemIds)||f.problemIds.length<20||new Set(f.problemIds.slice(0,20)).size!==20||!f.problemIds.every(p=>typeof p==='string'&&/^ltprob_/.test(p)))throw new Error('Only distinct synthetic load-test fixtures are accepted');tokens.add(f.token);}
export const options={
 scenarios:{exam:{executor:'per-vu-iterations',vus,iterations:1,maxDuration:'5m'}},
 thresholds:{http_req_duration:['p(95)<500'],http_req_failed:['rate<0.005'],checks:['rate>0.995'],
 'http_req_duration{phase:start}':['p(95)<500'],'http_req_duration{phase:session}':['p(95)<500'],'http_req_duration{phase:submit}':['p(95)<500']},
 maxRedirects:0,discardResponseBodies:true,
};
export default function(){
 const student=fixtures[__VU-1],base=`${target}/tests/${encodeURIComponent(student.testId)}`;
 const params=phase=>({headers:{Authorization:`Bearer ${student.token}`,'Content-Type':'application/json'},tags:{phase,name:`exam_${phase}`},redirects:0,timeout:'20s'});
 function verify(response,phase){if(!check(response,{[`${phase} 2xx`]:r=>r.status>=200&&r.status<300}))fail(`Synthetic exam ${phase} failed (${response.status})`);}
 verify(http.post(`${base}/start`,'{}',params('start')),'start');
 for(let i=0;i<20;i++){const id=student.problemIds[i];verify(http.patch(`${base}/session`,JSON.stringify({answers:{[id]:'1'},selfStates:{[id]:'SOLVED_CLEAN'},problemTimes:{[id]:5}}),params('session')),'session');sleep(0.2);}
 verify(http.post(`${base}/submit`,'{}',params('submit')),'submit');
}
