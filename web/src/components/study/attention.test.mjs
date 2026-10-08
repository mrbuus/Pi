import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('./attention.ts', import.meta.url),'utf8');
const compiled = ts.transpileModule(source,{ compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const { StudyClock } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('visible focused elapsed, hidden elapsed, blurred unknown remain separate',()=>{
 const c=new StudyClock(0,true,true);c.tick(5000,false,false);c.tick(8000,true,false);c.tick(10000,true,true);
 assert.deepEqual(c.summary(),{focusedMs:5000,hiddenMs:3000,unknownMs:2000,buttons:0});
});
test('long suspension never becomes focused attention; bounded totals/buttons',()=>{
 const c=new StudyClock(0,true,true);c.tick(999999999,true,true);for(let i=0;i<300;i++) c.button();
 assert.equal(c.summary().focusedMs,0);assert.equal(c.summary().unknownMs,1800000);assert.equal(c.summary().buttons,100);
});
test('backward timer contributes no negative duration',()=>{
 const c=new StudyClock(100,true,true);c.tick(50,true,true);assert.equal(c.summary().focusedMs,0);
});

test('regression or invalid time cannot double count subsequent elapsed',()=>{
 const c=new StudyClock(100,true,true);c.tick(200,true,true);c.tick(50,true,true);c.tick(NaN,true,true);c.tick(300,true,true);
 assert.deepEqual(c.summary(),{focusedMs:100,hiddenMs:0,unknownMs:100,buttons:0});
});

test('fractional performance clock emits bounded whole milliseconds without losing accumulated fractions',()=>{
 const c=new StudyClock(10.25,true,true);c.tick(10.75,true,true);assert.equal(c.summary().focusedMs,0);c.tick(12.9,false,false);c.tick(14.7,true,false);c.tick(17.2,true,true);
 assert.deepEqual(c.summary(),{focusedMs:2,hiddenMs:1,unknownMs:2,buttons:0});
 for(const value of Object.values(c.summary()))assert(Number.isSafeInteger(value)&&value>=0&&value<=1800000);
 assert.equal(c.summary().focusedMs,2); // summary is a projection, not a counter reset.
});
