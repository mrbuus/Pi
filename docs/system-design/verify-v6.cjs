const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const here=__dirname,root=path.dirname(path.dirname(here)),ctx={window:{}};vm.createContext(ctx);
for(const f of ['schedule-data.js','flows.js','domain-flows.js','revision-v3.js','revision-v4.js','revision-v5.js','revision-v6.js','revision-v7.js','navigation.js'])vm.runInContext(fs.readFileSync(path.join(here,f),'utf8'),ctx,{filename:f});
for(const f of ['schedule-review.js','schedule-launcher.js','revision-v6.js'])new vm.Script(fs.readFileSync(path.join(here,f),'utf8'),{filename:f});
const D=JSON.parse(JSON.stringify(ctx.window.PI_SCHEDULE)),A=JSON.parse(fs.readFileSync(path.join(here,'private/schedule-audit.json'),'utf8'));
assert.equal(D.sha256,crypto.createHash('sha256').update(fs.readFileSync(A.source)).digest('hex'));
assert.equal(D.sheets.length,8);assert.equal(D.sheets.reduce((s,x)=>s+x.cells.length,0),26341);assert.equal(D.blocks.length,282);assert.equal(new Set(D.blocks.map(b=>b.id)).size,282);
for(const s of D.sheets){const a=A.sheets.find(x=>x.name===s.name);assert.deepEqual(s.cells,a.cells);assert.deepEqual(s.merged,a.merged);}
assert.deepEqual(D.excluded.map(x=>x.name),['Төгсөлт','Х','Sheet4','Sheet3','12-3','12-13']);
assert.equal(D.blocks.filter(b=>b.issues.some(x=>x.includes('гариг'))).length,34);assert.equal(D.blocks.filter(b=>b.issues.some(x=>x.includes('ижил'))).length,63);
const {clean}=require('./review.js');
for(const b of D.blocks){const s=D.sheets.find(s=>s.id===b.sheetId),a=s.cells.find(c=>c.cell===b.anchor),[x1,y1,x2,y2]=b.bounds;assert.equal(a.value,b.raw);assert.equal(b.yearInferred,true);assert.deepEqual(b.cells,s.cells.filter(c=>x1<=c.c&&c.c<=x2&&y1<=c.r&&c.r<=y2).map(c=>c.cell));for(const l of b.lessons){assert(y1<l.row&&l.row<=y2);assert(b.cells.includes(l.class.cell));}for(const c of b.calendar){assert(b.date>=c.from&&b.date<=c.to);assert(c.source.startsWith('https://'));}clean({version:1,entries:{['schedule:'+b.id]:{state:'read',title:b.raw,note:'Эх нүд шалгав',updatedAt:'2026-09-24T00:00:00Z'}}});}
// Regression evidence: preserve erroneous dates and two source copies, not silently “fix”.
assert(D.blocks.find(b=>b.sheet==='Хичээлийн хуваарь1'&&b.anchor==='B1162').issues.some(x=>x.includes('гариг')));
assert(D.blocks.filter(b=>b.sheet==='0601-с хойшхи'&&b.date==='2026-06-13').length>1);
for(const id of ['schedule-source','school-calendar','schedule-proposal','next-topic-rule','topic-icon-plan','brand-evidence','schedule-research-order'])assert.equal(ctx.window.PI_DESIGN.maps.find(m=>m.id===id).navigation.release,'decision');
const html=fs.readFileSync(path.join(root,'docs/SYSTEM-DESIGN.html'),'utf8');assert(html.includes('id="scheduleEvidence"'));assert(html.includes('schedule-launcher.js'));assert(!html.includes('src="system-design/schedule-data.js"'));assert(!html.includes('private/'));
console.log('PASS v0.6: workbook hash; all 26,341 selected cells and merges preserved; 282 blocks/source bounds; date anomalies kept; exclusions; calendar labels; review IDs; deferred scope; lazy local loading; syntax. Browser rendering not tested.');
