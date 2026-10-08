const { chromium } = require(process.env.PI_PLAYWRIGHT_MODULE || '/Users/mr.buus/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs');
const path=require('path');
const {pathToFileURL}=require('url');
const assert=require('assert/strict');
const url=pathToFileURL(path.join(__dirname,'PI-LEARNING-SIMULATION.html')).href;
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.PI_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-background-networking']});
 const context=await browser.newContext({viewport:{width:1440,height:1100},acceptDownloads:true});
 const page=await context.newPage();let errors=[];let network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('file:')&&!r.url().startsWith('blob:'))network.push(r.url())});
 await page.goto(url);const results=[];
 function pass(name){results.push({name,status:'PASS'});console.log('PASS '+name)}
 const state=()=>page.evaluate(()=>PiSimulation.getState());
 const click=a=>page.locator('[data-action="'+a+'"]').first().click();
 const go=i=>page.locator('#nav [data-stage="'+i+'"]').click();
 const reset=async(scene,profile)=>{await page.selectOption('#lesson-select',scene);await page.selectOption('#profile-select',profile);await page.click('#reset');};
 const submit=async()=>{await click('publish');await go(1);await click('paper-ready');await go(2);await click('autofill');await click('submit-class');};
 for(const scene of ['linear','word','vector'])for(const profile of ['mixed','strong','struggle','guess','slow','partial']){
  await reset(scene,profile);await submit();let s=await state();let answers=Object.values(s.first);assert.equal(answers.length,10);assert(answers.every(x=>x.source==='paper-backfill'&&x.solveTimeMs===null));assert(answers.filter(x=>x.status!=='answered').every(x=>x.correct===null));
  if(profile==='guess')assert(answers.every(x=>x.confidence==='guess'));
  await page.locator('#homework-section>summary').click();await click('autofill-home');await click('submit-home');await click('material');await page.fill('#teacher-count','5');await click('teacher-grade');assert.equal((await state()).teacher,5);
  await go(3);await click('build-review');s=await state();assert(s.review.items.length>0);assert(s.review.estimated<=9);assert(new Set(s.review.items.map(q=>q.prompt)).size===s.review.items.length);await click('demo-review');await click('finish-review');
  await go(4);await click('start-probe');s=await state();assert.equal(s.probe.items.length,3);assert(s.probe.items.every(q=>![...s.review.items,...Object.values(s.first)].some(x=>x.prompt===q.prompt)));
  assert.equal(await page.locator('.solution').count(),0);await click('demo-probe-good');assert.equal(await page.locator('.solution').count(),0);await click('finish-probe');s=await state();assert(s.probeDone);assert(s.probe.items.every(q=>s.first[q.id].correct));assert.equal(await page.locator('.solution').count(),3);
  await click('start-delayed');await click('demo-delayed-poor');await click('finish-delayed');s=await state();assert(s.delayedDone);assert.equal(s.delayed.items.filter(q=>s.first[q.id].correct).length,1);
  pass(scene+' / '+profile+' complete five-stage flow + delayed example');
 }
 await reset('linear','mixed');await submit();let s=await state();let q=await page.evaluate(()=>PiSimulation.dataset('linear').class[0]);const first=JSON.stringify(s.first[q.id]);
 await page.fill('[data-draft="'+q.id+'"][data-field="value"]',String(q.answer));await click('solution');
 await page.fill('[data-draft="'+q.id+'"][data-field="value"]',String(q.answer));await page.locator('[data-action="retry"][data-id="'+q.id+'"]').click();s=await state();assert.equal(JSON.stringify(s.first[q.id]),first);assert(s.fixes[q.id][0].help);assert(s.fixes[q.id][0].correct);pass('Assisted correction preserves original answer');
 await page.fill('[data-draft="'+q.id+'"][data-field="value"]',String(q.answer));await page.locator('.question-card').filter({has:page.locator('#reason-'+q.id)}).locator('details summary').click();await page.fill('#reason-'+q.id,'<img src=x onerror="window.qaUnsafe=1">');
 await page.locator('[data-action="typing"][data-id="'+q.id+'"]').evaluate(b=>b.click());s=await state();assert.equal(JSON.stringify(s.first[q.id]),first);assert.equal(s.fixes[q.id][1].kind,'typing');assert.equal(await page.evaluate(()=>window.qaUnsafe),undefined);pass('Typing correction audit and HTML-safe reason');
 let snapshot=JSON.stringify((await state()).first);await page.reload();assert.equal(JSON.stringify((await state()).first),snapshot);pass('Reload restores original and corrections');
 await click('network');assert((await state()).offline);await page.reload();assert((await state()).offline);await click('network');assert(!(await state()).offline);pass('Local disconnected-state simulation survives reload');
 await click('ledger');assert.equal(await page.locator('dialog[open]').count(),1);await click('close-ledger');pass('Evidence ledger opens and closes');
 const download=page.waitForEvent('download');await click('export');const downloaded=await download;const exportObj=JSON.parse(fs.readFileSync(await downloaded.path(),'utf8'));assert(exportObj.allSynthetic);assert.equal(exportObj.state.scene,'linear');pass('Export contains state, history and synthetic boundary');
 await reset('linear','mixed');await click('publish');await go(1);await click('paper-ready');await go(2);await page.fill('[data-entry][data-field="value"] >> nth=0','Infinity');await click('submit-class');assert.equal(Object.keys((await state()).first).length,0);assert.match(await page.locator('#message').innerText(),/тоо/);pass('Invalid input rejected atomically');
 await page.fill('[data-entry][data-field="value"] >> nth=0','');await click('submit-class');s=await state();assert(Object.values(s.first).every(r=>r.status==='unknown'&&r.correct===null));pass('All-missing submission is unknown, not 0% ability');
 await go(3);await page.selectOption('#review-mode','count');await page.selectOption('#review-size','40');await page.check('#short-pool');await click('build-review');s=await state();assert.equal(s.review.items.length,3);assert.equal(s.review.available,3);pass('Question shortage exposed without unrelated fillers');
 await click('demo-review');await click('finish-review');const oldReview=(await state()).review;await click('build-review');s=await state();assert(s.review.items.every(q=>!oldReview.items.some(p=>p.id===q.id)));assert(Object.keys(s.first).some(id=>id===oldReview.items[0].id));pass('Fresh review attempt IDs retain prior history');
 await reset('linear','strong');await submit();await go(3);for(const checkbox of await page.locator('input[name="skill"]').all())await checkbox.uncheck();await click('build-review');assert.equal((await state()).review,null);pass('Empty topic choice prevents packet');
 await page.locator('input[name="skill"][value="0"]').check();await page.selectOption('#review-level','middle');await click('build-review');assert.equal((await state()).review.items.length,0);assert.match(await page.locator('#main').innerText(),/олдсонгүй/);pass('Unsupported topic/difficulty abstains');
 await reset('linear','mixed');await submit();await go(3);await click('build-review');s=await state();q=s.review.items[0];await page.fill('[data-draft="'+q.id+'"][data-field="value"]',String(q.answer));await page.locator('[data-action="practice-answer"][data-id="'+q.id+'"]').evaluate(b=>{b.click();b.click();});assert.equal((await state()).events.filter(e=>e.type==='answer'&&e.questionId===q.id).length,1);pass('Double submit creates one first attempt');
 let math=await page.evaluate(()=>{const parse=PiSimulation.parseNumber;return [parse('−1'),parse('1/2'),parse('0/0'),parse('Infinity'),parse('1,5'),parse('<script>')].map(x=>Number.isNaN(x)?'invalid':x)});assert.deepEqual(math,[-1,.5,'invalid','invalid',1.5,'invalid']);pass('Numeric parser supports sign/fraction and rejects invalid');
 const datasets=await page.evaluate(()=>Object.fromEntries(['linear','word','vector'].map(scene=>[scene,PiSimulation.dataset(scene)])));let checked=0;
 for(const [scene,d] of Object.entries(datasets))for(const qu of Object.values(d).flat()){
  assert(Number.isFinite(qu.answer));if(scene==='linear'){
   const expression=qu.prompt.split('\n')[0].replace(/−/g,'-').replace(/\s/g,'');const [lhs,rhs]=expression.split('=');let value;
   if(lhs==='-x')value=-qu.answer;else if(/^x\+\d+$/.test(lhs))value=qu.answer+Number(lhs.split('+')[1]);else if(/^\d+x\+\d+$/.test(lhs)){let m=lhs.match(/^(\d+)x\+(\d+)$/);value=Number(m[1])*qu.answer+Number(m[2]);}else{let m=lhs.match(/^(\d+)\(x\+(\d+)\)$/);assert(m);value=Number(m[1])*(qu.answer+Number(m[2]));}assert.equal(value,Number(rhs));
  }else if(scene==='word'){
   const nums=qu.prompt.match(/\d+/g).map(Number);let answer;if(qu.family==='part')answer=(nums[2]-nums[1])/nums[0];if(qu.family==='model')answer=(nums[2]-nums[1])/nums[0];if(qu.family==='speed')answer=nums[1]/nums[0];if(qu.family==='divide')answer=nums[0]/nums[1];assert.equal(answer,qu.answer);
  }else{
   const vectors=[...qu.prompt.matchAll(/\(([^)]+)\)/g)].map(m=>m[1].replace(/−/g,'-').split(',').map(x=>x.trim()==='x'?'x':Number(x.trim())));let answer;
   if(qu.family==='coord')answer=vectors[0][0]+vectors[1][0];if(qu.family==='dot')answer=vectors[0].reduce((acc,x,i)=>acc+x*vectors[1][i],0);if(qu.family==='norm')answer=vectors[0].reduce((acc,x)=>acc+x*x,0);if(qu.family==='perpendicular')answer=-vectors[0][0];assert.equal(answer,qu.answer);
  }checked++;
 }pass('Independent substitution/text/vector checks for '+checked+' generated questions');
 await reset('word','mixed');await submit();await go(3);await click('build-review');assert(await page.locator('.section-intro h2').evaluate(e=>e.getBoundingClientRect().top>=document.getElementById('nav').getBoundingClientRect().bottom));pass('Stage heading clears sticky navigation');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'/tmp/pi-simulation-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await go(2);const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);await page.screenshot({path:'/tmp/pi-simulation-mobile.png',fullPage:true});pass('390px mobile has no page overflow');
 await page.setViewportSize({width:320,height:800});assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));pass('320px mobile has no page overflow');
 await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.activeElement.tagName!=='BODY'));pass('Keyboard focus reaches interactive control');
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);pass('No browser exceptions and no external network requests');
 fs.writeFileSync('/tmp/pi-simulation-qa-results.json',JSON.stringify({date:new Date().toISOString(),results,errors,network},null,2));console.log('TOTAL '+results.length+' PASSED');await browser.close();
})().catch(err=>{console.error(err);process.exit(1)});
