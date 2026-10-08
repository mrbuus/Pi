const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const ctx={window:{}};vm.createContext(ctx);
for(const name of ['flows.js','domain-flows.js','revision-v3.js','revision-v4.js','revision-v5.js','revision-v6.js','revision-v7.js','v1-scope-data.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,name),'utf8'),ctx);
const rows=ctx.window.PI_V1_SCOPE.rows,maps=new Set(ctx.window.PI_DESIGN.maps.map(m=>m.id));
assert.equal(new Set(rows.map(r=>r.id)).size,rows.length);
for(const r of rows){assert(['confirmed','review','later'].includes(r.status));for(const k of ['title','actor','reason','data','limits','decision'])assert(r[k].length>0);assert(r.steps.length>=2);assert(r.checks.length);for(const id of r.maps)assert(maps.has(id),id);}
assert.equal(rows.find(r=>r.maps.includes('feedback')).status,'confirmed');
assert.equal(rows.find(r=>r.id==='V1-17').status,'later');
assert.equal(rows.find(r=>r.id==='V1-18').status,'later');
assert.equal(rows.find(r=>r.id==='V1-10').status,'review');
const review=require('./review.js');for(const r of rows)review.clean({version:1,entries:{[r.id]:{state:'read',title:r.title,note:'Хяналтын жишээ',updatedAt:new Date().toISOString()}}});
new vm.Script(fs.readFileSync(path.join(__dirname,'v1-scope.js'),'utf8'));
const html=fs.readFileSync(path.join(__dirname,'../SYSTEM-DESIGN.html'),'utf8');for(const s of ['v1-scope-data.js','v1-scope.js','v1-scope.css','id="v1Scope"'])assert(html.includes(s));
console.log(`PASS: ${rows.length} scope entries, map references, review IDs, exclusions, script syntax and HTML integration. Browser rendering not tested.`);
