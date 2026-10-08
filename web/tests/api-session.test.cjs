const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function harness() {
  const calls = [], storage = new Map();
  const compiled = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/lib/api.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = { exports: {}, process: { env: {} }, window: {}, navigator: { onLine: true }, localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) }, AbortSignal, FormData, console,
    fetch: (_url, init) => new Promise(resolve => calls.push({init, finish: value => resolve({ok:true,status:200,json:async()=>value,text:async()=>String(value)})})) };
  vm.runInNewContext(compiled, context);
  return { api: context.exports, calls, storage };
}
test('identical identity and representation share parsed GET result', async () => {
  const h=harness();h.api.setAuth('synthetic-a','STUDENT');const a=h.api.api('/own'),b=h.api.api('/own');assert.equal(h.calls.length,1);h.calls[0].finish({own:1});assert.deepEqual(await a,{own:1});assert.deepEqual(await b,{own:1});
});
test('changed JWT cannot share or deliver previous identity response', async () => {
  const h=harness();h.api.setAuth('synthetic-a','STUDENT');const old=h.api.api('/own');const rejected=assert.rejects(old,e=>e.status===401);h.storage.set('pi_token','synthetic-b');const current=h.api.api('/own');assert.equal(h.calls.length,2);h.calls[0].finish({oldPrivate:true});await rejected;h.calls[1].finish({current:true});assert.deepEqual(await current,{current:true});
});
test('JSON and text representations do not share requests', async () => {
  const h=harness();const json=h.api.api('/same'),text=h.api.api('/same',{responseType:'text'});assert.equal(h.calls.length,2);h.calls[0].finish({json:true});h.calls[1].finish('text');assert.deepEqual(await json,{json:true});assert.equal(await text,'text');
});
test('clearAuth invalidates old request even when same identity later logs in', async () => {
  const h=harness();h.api.setAuth('synthetic-a','STUDENT');const old=h.api.api('/own');const rejected=assert.rejects(old,e=>e.status===401);h.api.clearAuth();h.api.setAuth('synthetic-a','STUDENT');const current=h.api.api('/own');assert.equal(h.calls.length,2);h.calls[0].finish({old:true});await rejected;const joined=h.api.api('/own');assert.equal(h.calls.length,2);h.calls[1].finish({current:true});assert.deepEqual(await current,{current:true});assert.deepEqual(await joined,{current:true});
});
test('upload keys from an old session cannot reach the new account', async () => {
  const h=harness();h.api.setAuth('synthetic-a','STUDENT');const upload=h.api.uploadFile(new (require('node:buffer').File)(['synthetic'],'fixture.txt'));const rejected=assert.rejects(upload,e=>e.status===401);h.api.setAuth('synthetic-b','STUDENT');h.calls[0].finish({key:'old-private-file'});await rejected;
});
test('legacy JSON strings and object bodies send the same JSON without double encoding', async () => {
  const h=harness();const payload={answer:'synthetic',count:2};const object=h.api.api('/save',{method:'POST',body:payload});const legacy=h.api.api('/save',{method:'POST',body:JSON.stringify(payload)});assert.equal(h.calls[0].init.body,JSON.stringify(payload));assert.equal(h.calls[1].init.body,h.calls[0].init.body);assert.deepEqual(JSON.parse(h.calls[1].init.body),payload);h.calls.forEach(c=>c.finish({saved:true}));await Promise.all([object,legacy]);
});
