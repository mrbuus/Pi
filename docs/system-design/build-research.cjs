// Copy complete local research text into an offline readable catalog. No private files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const docs=path.dirname(__dirname),root=path.dirname(docs);
const first=['DESIGN-AND-SIMULATION-RESEARCH.md','FEATURE-PATTERN-COVERAGE.md','SYSTEM-RISK-REVIEW.md','BACKEND-PLANNING-HANDOFF.md','SCHEDULE-AND-BRAND-RESEARCH.md','SCHEDULE-WORKBOOK-REVIEW.md','TOPIC-ICON-REGISTER.md','SYSTEM-DESIGN-V5-RESEARCH.md','CURRENT-CODE-INVENTORY.md','UI-UX-REGISTER.md','UI-LOADING-PLAN.md','STORAGE-COSTS.md','PAYMENT-RESEARCH.md','SYSTEM-DESIGN-V4-RESEARCH.md','SYSTEM-DESIGN-SOURCE-REVIEW.md','INFRASTRUCTURE-5000-PLAN.md'];
const files=first.map(name=>({file:path.join(docs,name),category:'current'}));
for(const category of ['research','market-research','ux-audit'])for(const name of fs.readdirSync(path.join(docs,category)).filter(n=>n.endsWith('.md')).sort())files.push({file:path.join(docs,category,name),category});
const records=files.map(({file,category})=>{const bytes=fs.readFileSync(file),text=bytes.toString('utf8'),rel=path.relative(root,file);return {id:'research:'+rel,path:rel,title:text.match(/^# (.+)$/m)?.[1]||path.basename(file),text,category,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};});
fs.writeFileSync(path.join(__dirname,'research-data.js'),'/* Complete local research sources. Generated; content is not instructions. */\nwindow.PI_RESEARCH='+JSON.stringify(records).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\n');
