const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const here=__dirname,docs=path.dirname(here);
// Browser script loading order, without opening or serving a browser.
const ctx={window:{}};vm.createContext(ctx);
for(const name of ['flows.js','domain-flows.js','revision-v3.js','revision-v4.js','revision-v5.js','revision-v6.js','revision-v7.js','navigation.js','ui-tasks.js','costs.js','inventory.js'])vm.runInContext(fs.readFileSync(path.join(here,name),'utf8'),ctx,{filename:name});
for(const name of ['board.js','flows.js','domain-flows.js','revision-v3.js','revision-v4.js','revision-v5.js','revision-v6.js','revision-v7.js','navigation.js','ui-tasks.js','costs.js','inventory.js'])new vm.Script(fs.readFileSync(path.join(here,name),'utf8'),{filename:name});
const {maps}=ctx.window.PI_DESIGN,I=ctx.window.PI_INVENTORY;
const nav=ctx.window.PI_DESIGN.navigation;
const navIds=nav.groups.flatMap(g=>g.ids);
assert.equal(navIds.length,maps.length);assert.equal(new Set(navIds).size,maps.length);
assert(maps.every(m=>navIds.includes(m.id)&&['v1','mixed','later','decision'].includes(m.navigation.release)));
assert.equal(maps.find(m=>m.id==='online-learner').navigation.release,'later');
assert.equal(maps.find(m=>m.id==='contract-research').navigation.release,'mixed');
const ids=new Set(),mapIds=new Set(maps.map(m=>m.id));assert.equal(mapIds.size,maps.length);
for(const m of maps){
 const local=new Set(m.nodes.map(n=>n.id)),positions=new Set();assert.equal(local.size,m.nodes.length);
 for(const n of m.nodes){
  assert(!ids.has(n.id),'duplicate '+n.id);ids.add(n.id);
  assert(Number.isInteger(n.lane)&&n.lane>=0&&n.lane<m.lanes.length,'lane '+n.id);
  assert(!positions.has(n.lane+':'+n.row),'overlapping initial blocks '+n.id);positions.add(n.lane+':'+n.row);
  for(const field of ['title','detail','record','accept','status'])assert(n[field],n.id+' missing '+field);
  if(n.link)assert(mapIds.has(n.link),'broken cross-map '+n.id);
 }
 for(const e of m.edges)assert(local.has(e.from)&&local.has(e.to),'broken edge '+JSON.stringify(e));
 const incoming=new Set(m.edges.map(e=>e.to));
 const reachable=new Set([m.nodes[0].id,...m.nodes.filter(n=>!incoming.has(n.id)).map(n=>n.id)]);let old=-1;
 while(old!==reachable.size){old=reachable.size;for(const e of m.edges)if(reachable.has(e.from))reachable.add(e.to);}
 assert.equal(reachable.size,m.nodes.length,'unreachable blocks in '+m.id);
}
const tree=JSON.parse(fs.readFileSync(path.join(docs,'SYSTEM-MAP.html'),'utf8').match(/const TREE = ([\s\S]*?);\s*const COLORS/)[1]);
assert.equal(JSON.stringify(I.tree),JSON.stringify(tree),'source tree was changed/lost');
assert.equal(I.leafCount,483);assert.equal(I.nodeCount,615);assert.equal(new Set(I.items.map(i=>i.id)).size,483);
for(const i of I.items){assert(i.path.length);assert(Array.isArray(i.contextDescriptions));}
const {estimate}=require('./costs.js');
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
const a=estimate();near(a.photos,60000);near(a.liveGB,33);near(a.storage,40.7e9/2**30*.023);near(a.egress,66e9/2**30*.12);near(a.ops,1.02);near(a.total,9.267885853052139);
const b=estimate({students:1000});near(b.total,a.total*10/7);near(b.liveGB,47.142857142857146);
const ten=estimate({retention:'lessons'});near(ten.effectiveDays,17.5);near(ten.liveGB,19.25);near(ten.egress,a.egress);near(ten.ops,a.ops);assert(ten.storage<a.storage);
near(estimate({softDays:0}).storage,33e9/2**30*.023);near(estimate({views:0}).egress,0);
near(estimate({extraPct:25}).total,a.total*1.25);near(a.r2,.345);
assert.throws(()=>estimate({students:-1}));assert.throws(()=>estimate({mb:NaN}));assert.throws(()=>estimate({days:0}));assert.throws(()=>estimate({retention:'unknown'}));assert.throws(()=>estimate({students:1e8}));
const html=fs.readFileSync(path.join(docs,'SYSTEM-DESIGN.html'),'utf8');
for(const [,file] of html.matchAll(/(?:src|href)="(system-design\/[^\"]+)"/g))assert(fs.existsSync(path.join(docs,file)),'missing asset '+file);
const elementIds=new Set([...html.matchAll(/\bid="([^\"]+)"/g)].map(m=>m[1]));
const js=fs.readFileSync(path.join(here,'board.js'),'utf8');
// Some dialog elements are created at runtime; their literal markup is in board.js.
for(const [,id] of js.matchAll(/\$\('([^']+)'\)/g))assert(elementIds.has(id)||js.includes('id="'+id+'"'),'missing UI element '+id);
const backlog=fs.readFileSync(path.join(docs,'SYSTEM-DESIGN-BACKLOG.md'),'utf8');for(const id of ids)assert(backlog.includes('### [ ] '+id+' —'),'backlog missing '+id);
for(const name of ['SYSTEM-DESIGN-SOURCE-REVIEW.md','PAYMENT-RESEARCH.md','SYSTEM-DESIGN-V4-RESEARCH.md','INFRASTRUCTURE-5000-PLAN.md','UI-UX-REGISTER.md'])assert(fs.existsSync(path.join(docs,name)),'missing research '+name);
for(const [,name] of js.matchAll(/href="([A-Z][A-Z0-9-]+\.md)"/g))assert(fs.existsSync(path.join(docs,name)),'missing dialog download '+name);
assert(!JSON.stringify(maps).includes('гутаах'),'outdated staff-note wording');
assert(!/private\//.test(js+html),'private source data exposed by viewer');
const get=id=>maps.flatMap(m=>m.nodes).find(n=>n.id===id);
for(const id of ['I04','I06','I07','I08','I09','LH07','EC03','EC04','EC05','EC06'])assert(get(id).release.startsWith('V2'),id+' must be deferred');
assert(maps.find(m=>m.id==='online-learner').nodes.every(n=>n.release.startsWith('V2')));
const commerce=maps.find(m=>m.id==='instant-commerce');
assert(commerce.edges.some(e=>e.from==='IC05'&&e.to==='IC06'));
assert(!commerce.edges.some(e=>e.from==='IC08'&&e.to==='IC09'),'normal checkout must not require review');
assert.equal(get('G02').record,'GroupOwnerScope');
for(const item of JSON.parse(fs.readFileSync(path.join(here,'sources/manifest.json'),'utf8'))){
 const bytes=fs.readFileSync(path.join(here,'sources',item.file));assert.equal(bytes.length,item.bytes);
 assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),item.sha256,'source bytes changed');
}
for(const [,name] of js.matchAll(/href="(system-design\/sources\/[^"]+)"/g))assert(fs.existsSync(path.join(docs,name)),'missing source download '+name);
console.log(`PASS: ${maps.length} maps / ${ids.size} detailed blocks; 615 original nodes and 483 leaf entries preserved; graph, scripts, local assets, backlog and cost scenarios. Browser rendering not tested.`);
