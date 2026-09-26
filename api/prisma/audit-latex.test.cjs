const test = require('node:test');
const assert = require('node:assert/strict');
const { classify, auditProblem, readOnlyAudit, asCsv } = require('./audit-latex.cjs');
for (const [input, category] of [[String.raw`\{x\}`, 'ESCAPED_BRACES'], [String.raw`\left(x\right`, 'MISSING_RIGHT_DOT'], [String.raw`\left(x`, 'SPLIT_LEFT_RIGHT'], [String.raw`x\leqx`, 'GLUED_COMMAND'], ['x\\', 'TRAILING_BACKSLASH'], ['x Амжилт хүсье!', 'GOOD_LUCK_SUFFIX'], ['x\u2907y', 'ARROW_GLYPH'], ['$- 3$', 'SPLIT_NEGATIVE']]) {
  test(category, () => assert.ok(classify(input).includes(category)));
}
test('escaped braces and split negatives are review candidates, not proof of corrupt math', () => {
  const issues = auditProblem({id:'fake',token:'fake',statementText:String.raw`$\{x\}$ $- 3$`});
  assert.ok(issues.length); assert.ok(issues.every(i => i.severity === 'REVIEW'));
});
test('checks delimited math, plain latex and nested choice/answer fields without mutating', () => {
  const row = {id:'fake',token:'fake',statementText:'Монгол өгүүлбэр $x^2+1$', choices:[String.raw`\frac{1}{`],correctAnswer:{value:String.raw`$\leqx$`}};
  const before=JSON.stringify(row); const issues=auditProblem(row);
  assert.equal(JSON.stringify(row),before);
  assert.ok(issues.some(i=>i.field==='choices[0]'&&i.category==='KATEX_PARSE_ERROR'));
  assert.ok(issues.some(i=>i.field==='correctAnswer.value'));
  assert.ok(!issues.some(i=>i.field==='statementText'));
});
test('valid left/right, inequality, paired backslashes and subtraction are not false positives', () => {
  assert.deepEqual(classify(String.raw`\left(x\right) x\leq y \\ x - 3`),[]);
});
test('readonly snapshot paginates and always rolls back, never issues data writes', async () => {
  const calls=[]; let pages=0;
  const client={query:async(sql,params)=>{calls.push({sql,params});return {rows:sql.startsWith('SELECT') && pages++===0 ? [{id:'fake',token:'fake',statementText:'$x^2$'}]:[]};}};
  const report=await readOnlyAudit(client,1);
  assert.equal(report.checkedProblems,1);assert.equal(report.affectedProblems,0);
  assert.match(calls[0].sql,/READ ONLY/); assert.equal(calls.at(-1).sql,'ROLLBACK');
  assert.ok(calls.every(c=>/^(BEGIN|SET LOCAL|SELECT|ROLLBACK)/.test(c.sql)));
  assert.deepEqual(calls.filter(c=>c.sql.startsWith('SELECT'))[1].params,['fake',1]);
});
test('query errors still rollback', async()=>{
  const calls=[]; await assert.rejects(()=>readOnlyAudit({query:async sql=>{calls.push(sql);if(sql.startsWith('SELECT'))throw Error('synthetic');return{rows:[]};}}));
  assert.equal(calls.at(-1),'ROLLBACK');
});
test('CSV has BOM, quoted delimiters and spreadsheet formula protection',()=>{
  const csv=asCsv({issues:[{id:'=evil',token:'a,"b',field:'choices',category:'REVIEW',severity:'REVIEW',message:'Монгол'}]});
  assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'=evil"));assert.ok(csv.includes('a,""b'));
});
