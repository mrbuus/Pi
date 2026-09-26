/* eslint-disable */
// Independent numerical audit for authored C2 examples. No database or packages.
// Explicit expected answers bind each numeric fixture to its displayed answer.
// Finite sampling verifies inequalities near and at boundaries; it is not a proof
// over all real numbers. Symbolic derivations and completeness require review.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/formulas/equations-inequalities.json'), 'utf8'));
const bySlug = new Map(data.formulas.map(f => [f.slug, f]));
const covered = new Set();
let assertions = 0;
const ok = (x, message) => { assertions++; assert.ok(x, message); };
const close = (a,b) => Math.abs(a-b) < 1e-8 * Math.max(1,Math.abs(a),Math.abs(b));
const eq = (a,b) => ok(close(a,b), `${a} != ${b}`);
const same = (a,b) => { const aa=[...new Set(a)].sort((x,y)=>x-y),bb=[...new Set(b)].sort((x,y)=>x-y); ok(aa.length===bb.length, `${aa} vs ${bb}`); aa.forEach((x,i)=>eq(x,bb[i])); };
const quadratic = (a,b,c) => {
  if(a===0) return b===0 ? (c===0 ? null : []) : [-c/b];
  const d=b*b-4*a*c;
  return d<0 ? [] : d===0 ? [-b/(2*a)] : [(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)];
};
const poly = (cs,x) => cs.reduce((value,c)=>value*x+c,0);
function roots(cs, expected) { same(quadratic(...cs),expected); expected.forEach(x=>eq(poly(cs,x),0)); }
function points(boundaries=[]) {
  const a=[]; for(let n=-160;n<=160;n++) a.push(n/8);
  for(const x of boundaries) a.push(x-1e-6,x,x+1e-6);
  return [...a,-1e6,1e6];
}
function sets(predicate, expected, boundaries=[]) {
  for(const x of points(boundaries)) { assertions++; assert.equal(Boolean(predicate(x)),Boolean(expected(x)),`set mismatch at ${x}`); }
}
function system(rows,xy) { rows.forEach(([a,b,c])=>eq(a*xy[0]+b*xy[1],c)); }
function v(slug,index,answer,check) {
  const key=`eq-${slug}:${index}`; const f=bySlug.get(`eq-${slug}`);
  assert.ok(f,slug); assert.equal(f.examples[index].answer,answer,`displayed answer changed: ${key}`);
  assert.ok(!covered.has(key),`duplicate fixture ${key}`); covered.add(key); check();
}
v('linear',0,'$x=-4$',()=>roots([0,-3,-12],[-4]));
v('linear',1,'$x\\in\\mathbb R$',()=>sets(x=>2*(x+3)===2*x+6,()=>true));
v('discriminant',0,'$1$ ялгаатай бодит язгуур',()=>roots([1,-6,9],[3]));
v('discriminant',1,'$0$ бодит язгуур',()=>roots([2,1,1],[]));
v('quadratic-roots',0,'$x\\in\\{1/2,2\\}$',()=>roots([2,-5,2],[.5,2]));
v('quadratic-roots',1,'$x=-1\\pm\\sqrt3$',()=>roots([1,2,-2],[-1-Math.sqrt(3),-1+Math.sqrt(3)]));
v('even-coefficient',0,'$x\\in\\{1,3\\}$',()=>roots([3,-12,9],[1,3]));
v('even-coefficient',1,'$x\\in\\{-3,1\\}$',()=>roots([2,4,-6],[-3,1]));
v('incomplete-square',0,'$x\\in\\{-3,3\\}$',()=>roots([5,0,-45],[-3,3]));
v('incomplete-square',1,'$S=\\varnothing$',()=>roots([4,0,12],[]));
v('incomplete-product',0,'$x\\in\\{0,4\\}$',()=>roots([3,-12,0],[0,4]));
v('incomplete-product',1,'$x\\in\\{-5/2,0\\}$',()=>roots([2,5,0],[-2.5,0]));
v('vieta',0,'$S=7/2,\\ P=3/2$',()=>{ roots([2,-7,3],[.5,3]); eq(.5+3,3.5); eq(.5*3,1.5); });
v('vieta',1,'$S=-8,\\ P=16$',()=>{ roots([1,8,16],[-4]); eq(-4-4,-8); eq((-4)*(-4),16); });
v('vieta-converse',0,'$x^2-7x+10=0$',()=>roots([1,-7,10],[2,5]));
v('vieta-converse',1,'$-3$ ба $2$',()=>{ eq(-3+2,-1); eq(-3*2,-6); roots([1,1,-6],[-3,2]); });
v('cubic-vieta',0,'$6,\\ 11,\\ 6$',()=>{ [1,2,3].forEach(x=>eq(poly([1,-6,11,-6],x),0)); eq(1+2+3,6); eq(1*2+1*3+2*3,11); eq(1*2*3,6); });
v('cubic-vieta',1,'$4$',()=>{ [-1,2,-2].forEach(x=>eq(poly([2,2,-8,-8],x),0)); eq(-1*2*-2,4); });
v('sum-squares',0,'$13$',()=>{ roots([1,-5,6],[2,3]); eq(2**2+3**2,13); });
v('sum-squares',1,'$10$',()=>{ roots([2,4,-6],[-3,1]); eq((-3)**2+1,10); });
v('reciprocal-sum',0,'$7/10$',()=>{ roots([1,-7,10],[2,5]); eq(1/2+1/5,7/10); });
v('reciprocal-sum',1,'$5/2$',()=>{ roots([3,5,-2],[-2,1/3]); eq(-1/2+3,5/2); });
v('root-distance',0,'$4$',()=>{ roots([1,-8,12],[2,6]); eq(Math.abs(2-6),4); });
v('root-distance',1,'$3$',()=>{ roots([-2,2,4],[-1,2]); eq(Math.abs(-1-2),3); });
v('factor',0,'$2(x-2)(x-3)$',()=>points([2,3]).forEach(x=>eq(poly([2,-10,12],x),2*(x-2)*(x-3))));
v('factor',1,'$-3(x+1)^2$',()=>points([-1]).forEach(x=>eq(poly([-3,-6,-3],x),-3*(x+1)**2)));
v('biquadratic',0,'$x\\in\\{-2,-1,1,2\\}$',()=>{ const ts=quadratic(1,-5,4); const xs=ts.filter(t=>t>=0).flatMap(t=>[-Math.sqrt(t),Math.sqrt(t)]); same(xs,[-2,-1,1,2]); xs.forEach(x=>eq(x**4-5*x*x+4,0)); });
v('biquadratic',1,'$x\\in\\{-1,1\\}$',()=>{ const xs=quadratic(1,1,-2).filter(t=>t>=0).flatMap(t=>[-Math.sqrt(t),Math.sqrt(t)]); same(xs,[-1,1]); xs.forEach(x=>eq(x**4+x*x-2,0)); });
v('substitution',0,'$x\\in\\{1,2\\}$',()=>{ roots([1,-3,2],[1,2]); [1,2].forEach(x=>eq((x+1)**2-5*(x+1)+6,0)); });
v('substitution',1,'$x\\in\\{-\\sqrt3,-\\sqrt2,\\sqrt2,\\sqrt3\\}$',()=>{ const xs=quadratic(1,-3,2).flatMap(t=>[-Math.sqrt(t+1),Math.sqrt(t+1)]); same(xs,[-Math.sqrt(3),-Math.sqrt(2),Math.sqrt(2),Math.sqrt(3)]); xs.forEach(x=>eq((x*x-1)**2-3*(x*x-1)+2,0)); });
v('rational',0,'$x=-1$',()=>{ const xs=quadratic(1,0,-1).filter(x=>x!==1); same(xs,[-1]); xs.forEach(x=>eq((x*x-1)/(x-1),0)); ok(!Number.isFinite((1-1)/(1-1)),'excluded pole'); });
v('rational',1,'$x=5$',()=>{ roots([0,1,-5],[5]); eq(2/(5-1),3/(5+1)); ok(5!==1&&5!==-1); });
v('inequality-add',0,'$x<5$',()=>sets(x=>x+7<12,x=>x<5,[5]));
v('inequality-add',1,'$x\\le-6$',()=>sets(x=>3*x+2<=2*x-4,x=>x<=-6,[-6]));
v('inequality-scale',0,'$x>-3$',()=>sets(x=>-2*x<6,x=>x>-3,[-3]));
v('inequality-scale',1,'$x\\le-3$',()=>sets(x=>5-3*x>=14,x=>x<=-3,[-3]));
v('product-sign',0,'$x\\in(-\\infty,1)\\cup(4,\\infty)$',()=>sets(x=>(x-1)*(x-4)>0,x=>x<1||x>4,[1,4]));
v('product-sign',1,'$x\\in(-2,3)$',()=>sets(x=>(x+2)*(x-3)<0,x=>x>-2&&x<3,[-2,3]));
v('interval-sign',0,'$x\\in[-2,1]\\cup[3,\\infty)$',()=>sets(x=>(x+2)*(x-1)*(x-3)>=0,x=>(x>=-2&&x<=1)||x>=3,[-2,1,3]));
v('interval-sign',1,'$x\\in(-\\infty,-1)\\cup(2,4)$',()=>sets(x=>-(x+1)*(x-2)*(x-4)>0,x=>x<-1||(x>2&&x<4),[-1,2,4]));
v('repeated-root-sign',0,'$x\\in(-\\infty,-2]\\cup\\{1\\}$',()=>sets(x=>(x-1)**2*(x+2)<=0,x=>x<=-2||x===1,[-2,1]));
v('repeated-root-sign',1,'$x>2$',()=>sets(x=>(x+3)**2*(x-2)>0,x=>x>2,[-3,2]));
v('rational-inequality',0,'$x\\in(-\\infty,-1)\\cup[2,\\infty)$',()=>sets(x=>x!==-1&&(x-2)/(x+1)>=0,x=>x<-1||x>=2,[-1,2]));
v('rational-inequality',1,'$x\\in(-\\infty,1)\\cup(1,3)$',()=>sets(x=>x!==3&&(x-1)**2/(x-3)<0,x=>x<3&&x!==1,[1,3]));
v('quadratic-sign',0,'$x\\in[2,3]$',()=>sets(x=>x*x-5*x+6<=0,x=>x>=2&&x<=3,[2,3]));
v('quadratic-sign',1,'$x\\in(-2,3)$',()=>sets(x=>-x*x+x+6>0,x=>x>-2&&x<3,[-2,3]));
v('quadratic-degenerate',0,'$x\\in\\mathbb R$',()=>sets(x=>x*x+2*x+2>0,()=>true,[-1]));
v('quadratic-degenerate',1,'$x=2$',()=>sets(x=>-2*x*x+8*x-8>=0,x=>x===2,[2]));
v('abs-constant',0,'$x\\in\\{-1,4\\}$',()=>{ const xs=[(3+5)/2,(3-5)/2]; same(xs,[-1,4]); xs.forEach(x=>eq(Math.abs(2*x-3),5)); });
v('abs-constant',1,'$S=\\varnothing$',()=>sets(x=>Math.abs(x+1)===-2,()=>false,[-1]));
v('abs-equal',0,'$x\\in\\{-2,0\\}$',()=>{ roots([3,6,0],[-2,0]); [-2,0].forEach(x=>eq(Math.abs(x-1),Math.abs(2*x+1))); });
v('abs-equal',1,'$x\\in\\{-1/2,3\\}$',()=>{ roots([8,-20,-12],[-.5,3]); [-.5,3].forEach(x=>eq(Math.abs(3*x-2),Math.abs(x+4))); });
v('abs-function',0,'$x=1$',()=>{ const xs=quadratic(0,-4,4).filter(x=>x>=0); same(xs,[1]); eq(Math.abs(1-2),1); });
v('abs-function',1,'$S=\\varnothing$',()=>{ const xs=quadratic(3,6,0).filter(x=>x-1>=0); same(xs,[]); [-2,0].forEach(x=>ok(!close(Math.abs(2*x+1),x-1))); });
v('abs-less',0,'$x\\in(-1,2)$',()=>sets(x=>Math.abs(2*x-1)<3,x=>x>-1&&x<2,[-1,2]));
v('abs-less',1,'$x>0$',()=>sets(x=>Math.abs(x-1)<x+1,x=>x>0,[0,1]));
v('abs-greater',0,'$x\\in(-\\infty,-1)\\cup(5,\\infty)$',()=>sets(x=>Math.abs(x-2)>3,x=>x<-1||x>5,[-1,5]));
v('abs-greater',1,'$x\\in\\mathbb R$',()=>sets(x=>Math.abs(x)>x-2,()=>true,[0,2]));
v('abs-compare',0,'$x>-1$',()=>sets(x=>Math.abs(x-1)<Math.abs(x+3),x=>x>-1,[-1]));
v('abs-compare',1,'$x\\in(-\\infty,-1]\\cup[3,\\infty)$',()=>sets(x=>Math.abs(2*x)>=Math.abs(x+3),x=>x<=-1||x>=3,[-1,3]));
v('abs-intervals',0,'$x\\in\\{-2,2\\}$',()=>sets(x=>Math.abs(x-1)+Math.abs(x+1)===4,x=>x===-2||x===2,[-2,-1,1,2]));
v('abs-intervals',1,'$x\\in[-1,3]$',()=>sets(x=>Math.abs(x)+Math.abs(x-2)<=4,x=>x>=-1&&x<=3,[-1,0,2,3]));
v('radical-equation',0,'$x=2$',()=>{ const xs=quadratic(1,-1,-2).filter(x=>x>=0&&x+2>=0); same(xs,[2]); xs.forEach(x=>eq(Math.sqrt(x+2),x)); ok(!close(Math.sqrt(-1+2),-1)); });
v('radical-equation',1,'$x=3$',()=>{ const xs=quadratic(1,-2,-3).filter(x=>x>=0&&2*x+3>=0); same(xs,[3]); xs.forEach(x=>eq(Math.sqrt(2*x+3),x)); ok(!close(Math.sqrt(2*-1+3),-1)); });
v('radical-equal',0,'$x=3$',()=>{ roots([0,1,-3],[3]); eq(Math.sqrt(2*3+1),Math.sqrt(3+4)); });
v('radical-equal',1,'$S=\\varnothing$',()=>{ const xs=quadratic(0,1,1).filter(x=>x-2>=0&&2*x-1>=0); same(xs,[]); ok(Number.isNaN(Math.sqrt(-1-2))); });
v('radical-less',0,'$x\\in[-1,8)$',()=>sets(x=>x+1>=0&&Math.sqrt(x+1)<3,x=>x>=-1&&x<8,[-1,8]));
v('radical-less',1,'$x>2$',()=>sets(x=>x+2>=0&&Math.sqrt(x+2)<x,x=>x>2,[-2,-1,0,2]));
v('radical-greater',0,'$x\\in[-2,2)$',()=>sets(x=>x+2>=0&&Math.sqrt(x+2)>x,x=>x>=-2&&x<2,[-2,-1,0,2]));
v('radical-greater',1,'$x\\ge1$',()=>sets(x=>x-1>=0&&Math.sqrt(x-1)>-2,x=>x>=1,[1]));
v('radical-substitution',0,'$x\\in\\{1,4\\}$',()=>{ const xs=quadratic(1,-3,2).filter(t=>t>=0).map(t=>t*t); same(xs,[1,4]); xs.forEach(x=>eq(x-3*Math.sqrt(x)+2,0)); });
v('radical-substitution',1,'$x=4$',()=>{ const xs=quadratic(1,1,-6).filter(t=>t>=0).map(t=>t*t); same(xs,[4]); eq(4+Math.sqrt(4)-6,0); ok(!close(9+Math.sqrt(9)-6,0)); });
v('system-substitution',0,'$(x,y)=(3,5)$',()=>system([[-2,1,-1],[1,1,8]],[3,5]));
v('system-substitution',1,'$(x,y)\\in\\{(2,3),(3,2)\\}$',()=>{ roots([1,-5,6],[2,3]); [[2,3],[3,2]].forEach(([x,y])=>{eq(x+y,5);eq(x*y,6);}); });
v('system-addition',0,'$(x,y)=(3,2)$',()=>system([[2,3,12],[2,-1,4]],[3,2]));
v('system-addition',1,'$(x,y)=(2,1/2)$',()=>system([[3,2,7],[5,-2,9]],[2,.5]));
v('cramer',0,'$(x,y)=(2,1)$',()=>{system([[2,1,5],[1,-1,1]],[2,1]);ok(2*(-1)-1!==0);});
v('cramer',1,'$(x,y)=(2,1)$',()=>{system([[1,2,4],[3,-1,5]],[2,1]);ok(-1-6!==0);});
v('system-consistency',0,'$S=\\varnothing$',()=>{eq(2-2*1,0);eq(4-2*2,0);ok(6-2*4!==0);});
v('system-consistency',1,'$(x,y)=(3-2t,t),\\ t\\in\\mathbb R$',()=>points().forEach(t=>system([[2,4,6],[1,2,3]],[3-2*t,t])));
function parameter(cs, predicate, answer, boundaries) {
  sets(m=>{const r=quadratic(...cs(m)); return r!==null && r.length>0 && r.every(predicate);},answer,boundaries);
}
v('positive-roots',0,'$m\\in(0,9]$',()=>parameter(m=>[1,-6,m],x=>x>0,m=>m>0&&m<=9,[0,9]));
v('positive-roots',1,'$m\\ge2$',()=>parameter(m=>[1,-2*m,m+2],x=>x>0,m=>m>=2,[-2,-1,0,2]));
v('roots-above',0,'$m\\in(5,9]$',()=>parameter(m=>[1,-6,m],x=>x>1,m=>m>5&&m<=9,[5,9]));
v('roots-above',1,'$m\\in[3,13/4)$',()=>parameter(m=>[1,-2*m,9],x=>x>2,m=>m>=3&&m<13/4,[-3,2,3,13/4]));
v('interval-roots',0,'$m\\in[0,1]$',()=>parameter(m=>[1,-2,m],x=>x>=0&&x<=2,m=>m>=0&&m<=1,[0,1]));
v('interval-roots',1,'$m\\in[5,9]$',()=>parameter(m=>[1,-6,m],x=>x>=1&&x<=5,m=>m>=5&&m<=9,[5,9]));
v('unique',0,'$m\\in\\{1,2\\}$',()=>{sets(m=>quadratic(m-1,2,1)?.length===1,m=>m===1||m===2,[1,2]);roots([0,2,1],[-.5]);roots([1,2,1],[-1]);});
v('unique',1,'$m\\in\\{0,1\\}$',()=>{sets(m=>quadratic(1,-2*m,m)?.length===1,m=>m===0||m===1,[0,1]);roots([1,0,0],[0]);roots([1,-2,1],[1]);});
assert.equal(covered.size,88);
for(const f of data.formulas) f.examples.forEach((_,i)=>assert.ok(covered.has(`${f.slug}:${i}`),`unaudited example ${f.slug}:${i}`));
const exampleAssertions = assertions;

// A condition weaker than the solution is a valid implication but an invalid
// equivalent answer. Read every choice from the JSON, then compare truth sets
// against the original inequality (not against a copied expected answer).
function conditionPredicate(latex) {
  const source = latex.replace(/\\le/g, '<=').replace(/\\ge/g, '>=').replace(/\s/g, '');
  const atom = '(x|-?\\d+(?:/\\d+)?)';
  const match = source.match(new RegExp(`^${atom}(<=|>=|<|>|=)${atom}(?:(<=|>=|<|>|=)${atom})?$`));
  assert.ok(match, `Unsupported quiz condition: ${latex}`);
  const value = (token, x) => token === 'x' ? x : token.split('/').map(Number).reduce((a,b) => a/b);
  const compare = (a, operator, b) => ({ '<':a<b, '>':a>b, '<=':a<=b, '>=':a>=b, '=':a===b })[operator];
  return x => compare(value(match[1],x), match[2], value(match[3],x)) &&
    (!match[4] || compare(value(match[3],x), match[4], value(match[5],x)));
}
const quizFixtures = [
  ['inequality-add', String.raw`x-8>1`, x => x-8>1, [-7,9]],
  ['inequality-scale', String.raw`-4x\ge8`, x => -4*x>=8, [-2,2]],
  ['abs-compare', String.raw`|x|<|x-2|`, x => Math.abs(x)<Math.abs(x-2), [1,2]],
  ['radical-greater', String.raw`\sqrt{x}>1`, x => x>=0 && Math.sqrt(x)>1, [0,1]],
];
for (const [slug, premise, original, boundaries] of quizFixtures) {
  const quiz = bySlug.get(`eq-${slug}`).quiz[0];
  const prompt = quiz.prompt.match(/^(.*?)\\quad\\(iff|Longrightarrow)\\quad\\square$/);
  assert.ok(prompt, `Unsupported quiz prompt: ${slug}`);
  assert.equal(prompt[1], premise, `Review the changed quiz input: ${slug}`);
  const choices = [quiz.answer, ...quiz.distractors];
  const correct = choices.map(choice => {
    const candidate = conditionPredicate(choice);
    return points(boundaries).every(x => prompt[2] === 'iff'
      ? original(x) === candidate(x) : !original(x) || candidate(x));
  });
  ok(correct[0], `The answer does not satisfy the prompt: ${slug}`);
  ok(correct.slice(1).every(x => !x), `Another choice satisfies the prompt: ${slug}`);
}
const radicalQuiz = bySlug.get('eq-radical-equation').quiz[1];
const radicalPrompt = radicalQuiz.prompt.replace(/\\quad|\s/g, '').match(/^\\sqrt\{x\}=(-?\d+)\\(iff|Longrightarrow)x=(-?\d+)$/);
assert.ok(radicalPrompt, 'Unsupported radical quiz prompt');
const [,rhs,relation,target] = radicalPrompt;
const radicalTruth = points([0,Number(target),Number(rhs)**2]).every(x => {
  const left = x>=0 && Math.sqrt(x)===Number(rhs), right = x===Number(target);
  return relation === 'iff' ? left===right : !left || right;
});
ok(radicalQuiz.answer === String(radicalTruth), 'Radical quiz confuses implication with equivalence');

// Bind each numerical criterion to the authored formula. Independently solve
// coefficient grids, including negative leading coefficients, D=0 and empty
// real root sets. Sampling supports the manual proof review; it is not a proof.
function rule(slug, latex) {
  const formula = bySlug.get(`eq-${slug}`);
  assert.equal(formula.latex, latex, `Review changed rule: ${slug}`);
  assert.equal(formula.general, latex, `Review changed general rule: ${slug}`);
}
rule('positive-roots', String.raw`x_1>0,\ x_2>0\iff D\ge0,\quad -\frac ba>0,\quad\frac ca>0`);
rule('roots-above', String.raw`x_1>k,\ x_2>k\iff D\ge0,\quad S-2k>0,\quad P-kS+k^2>0`);
rule('interval-roots', String.raw`x_1,x_2\in[\ell,u]\iff D\ge0,\quad\ell\le v\le u,\quad\frac{f(\ell)}a\ge0,\quad\frac{f(u)}a\ge0`);
let parameterCases = 0;
for (const a of [-2,-1,1,2]) for (let b=-4;b<=4;b++) for (let c=-4;c<=4;c++) {
  const r=quadratic(a,b,c), d=b*b-4*a*c, s=-b/a, p=c/a, vertex=-b/(2*a);
  const all = predicate => r.length>0 && r.every(predicate);
  ok(all(x=>x>0) === (d>=0 && s>0 && p>0), `positive roots: ${a},${b},${c}`);
  for (const k of [-1,0,1]) {
    ok(all(x=>x>k) === (d>=0 && s-2*k>0 && p-k*s+k*k>0), `roots above ${k}: ${a},${b},${c}`);
  }
  for (const [lo,hi] of [[-2,2],[0,1],[-3,-1]]) {
    ok(all(x=>x>=lo && x<=hi) === (d>=0 && lo<=vertex && vertex<=hi && poly([a,b,c],lo)/a>=0 && poly([a,b,c],hi)/a>=0), `interval ${lo},${hi}: ${a},${b},${c}`);
  }
  parameterCases++;
}
rule('unique', String.raw`ax^2+bx+c=0\text{ ганц бодит шийдтэй}\iff(a\ne0\land D=0)\lor(a=0\land b\ne0)`);
let degreeCases = 0;
for (let a=-2;a<=2;a++) for (let b=-3;b<=3;b++) for (let c=-3;c<=3;c++) {
  const r=quadratic(a,b,c);
  ok((r!==null && r.length===1) === ((a!==0 && b*b-4*a*c===0) || (a===0 && b!==0)), `unique solution: ${a},${b},${c}`);
  degreeCases++;
}

console.log(`${covered.size}/88 worked examples checked; ${exampleAssertions} numerical assertions (substitution, identities, systems, sampled sets and parameter boundaries).`);
console.log(`Focused review: ${quizFixtures.length} blank quizzes / 16 choices, 1 true-false regression; ${parameterCases} quadratic coefficient cases / 7 root-location checks each; ${degreeCases} degree/unique-solution cases; ${assertions-exampleAssertions} additional assertions.`);
