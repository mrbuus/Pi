#!/usr/bin/env node
'use strict';
// Mathematical audit of the authored C5 fixtures. Independent recurrence,
// enumeration and weighted finite sample spaces are used, not a LaTeX evaluator.
// Finite checks do not prove identities or justify all prose/conditions; those
// require the accompanying manual review. No database or application is touched.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, 'data/formulas/sequences-combinatorics-probability.json'), 'utf8'));
const bySlug = new Map(data.formulas.map(f => [f.slug.slice(4), f]));
let assertions = 0;
const checked = new Set();
function same(actual, expected, label = '') { assertions++; assert.deepEqual(actual, expected, label); }
function close(actual, expected, label = '') {
  assertions++; assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-10 * Math.max(1, Math.abs(expected)), `${label}: ${actual} != ${expected}`);
}
function v(slug, index, answer, check) {
  const f = bySlug.get(slug); assert.ok(f, slug);
  same(f.examples[index].answer, answer, `${slug} displayed example ${index + 1}`);
  check(); checked.add(`${slug}:${index}`);
}
const sum = a => a.reduce((s, x) => s + x, 0);
const range = (n, start = 0) => Array.from({length: n}, (_, i) => start + i);
function arithmetic(a, d, n) { const xs = [a]; while (xs.length < n) xs.push(xs.at(-1) + d); return xs; }
function geometric(b, q, n) { const xs = [b]; while (xs.length < n) xs.push(xs.at(-1) * q); return xs; }
function tuples(alphabet, k) {
  if (!k) return [[]];
  return tuples(alphabet, k - 1).flatMap(xs => alphabet.map(x => [...xs, x]));
}
function permutations(xs, k = xs.length) {
  if (!k) return [[]];
  return xs.flatMap((x, i) => permutations(xs.filter((_, j) => i !== j), k - 1).map(t => [x, ...t]));
}
function subsets(xs) { return range(2 ** xs.length).map(mask => xs.filter((_, i) => mask & 2 ** i)); }
const chooseSets = (xs, k) => subsets(xs).filter(s => s.length === k);
const uniquePermutations = xs => [...new Set(permutations(xs).map(t => t.join('')))];
const rotateKey = xs => xs.map((_, i) => [...xs.slice(i), ...xs.slice(0, i)].join('')).sort()[0];
const circles = xs => [...new Set(permutations(xs).map(rotateKey))];
const die = range(6, 1), coins = k => tuples([0, 1], k);
const prob = (xs, pred) => xs.filter(pred).length / xs.length;
function weightedPaths(alternatives) {
  let paths = [{values: [], weight: 1}];
  for (const stage of alternatives) paths = paths.flatMap(p => stage.map(([value, weight]) => ({values: [...p.values, value], weight: p.weight * weight})));
  close(sum(paths.map(p => p.weight)), 1, 'sample space total mass');
  return paths;
}
const mass = (xs, pred) => sum(xs.filter(p => pred(p.values)).map(p => p.weight));
const mean = xs => sum(xs) / xs.length;
const variance = xs => { const m = mean(xs); return mean(xs.map(x => (x - m) ** 2)); };
const secondMomentVariance = xs => mean(xs.map(x => x * x)) - mean(xs) ** 2;
const median = xs => { const ys = [...xs].sort((a, b) => a - b), n = ys.length; return n % 2 ? ys[(n - 1) / 2] : (ys[n / 2 - 1] + ys[n / 2]) / 2; };
function modes(xs) {
  const counts = new Map(); for (const x of xs) counts.set(x, (counts.get(x) || 0) + 1);
  const max = Math.max(...counts.values());
  return [...counts].filter(([, n]) => n === max && n > 1).map(([x]) => x).sort((a, b) => a - b);
}
const spread = xs => Math.max(...xs) - Math.min(...xs);

v('arithmetic-term', 0, '$25$', () => close(arithmetic(4, 3, 8).at(-1), 25));
v('arithmetic-term', 1, '$12$', () => same(arithmetic(17, -2, 30).map((x, i) => x === -5 ? i + 1 : null).filter(Boolean), [12]));
v('arithmetic-sum', 0, '$210$', () => close(sum(arithmetic(3, 4, 10)), 210));
v('arithmetic-sum', 1, '$27$', () => close(sum(arithmetic(12, -3, 6)), 27));
v('arithmetic-middle', 0, '$13$', () => close(13 - 7, 19 - 13));
v('arithmetic-middle', 1, '$5$', () => { close(8 - 5, (2 * 5 + 1) - 8); close((16 - 1) / 3, 5); });
v('arithmetic-pairs', 0, '$30$', () => { for (const d of [-4, 0, 2, 5]) { const xs = arithmetic((30 - 9 * d) / 2, d, 9); close(xs[1] + xs[8], 30); close(xs[3] + xs[6], 30); } });
v('arithmetic-pairs', 1, '$20$', () => { for (const d of [-5, 0, 3]) { const xs = arithmetic((40 - 12 * d) / 2, d, 11); close(xs[2] + xs[10], 40); close(xs[6], 20); } });
v('arithmetic-difference', 0, '$4$', () => { const xs = arithmetic(2, 4, 8); close(xs[2], 10); close(xs[7], 30); });
v('arithmetic-difference', 1, '$14$', () => { const xs = arithmetic(14, -3, 6); close(xs[1], 11); close(xs[5], -1); });
v('geometric-term', 0, '$96$', () => close(geometric(3, 2, 6).at(-1), 96));
v('geometric-term', 1, '$-1$', () => close(geometric(8, -.5, 4).at(-1), -1));
v('geometric-sum', 0, '$80$', () => close(sum(geometric(2, 3, 4)), 80));
v('geometric-sum', 1, '$9/2$', () => close(sum(geometric(6, -.5, 3)), 9 / 2));
v('geometric-middle', 0, '$12$', () => { close(12 / 4, 36 / 12); same([-12, 12].filter(x => x > 0), [12]); });
v('geometric-middle', 1, '$x\\in\\{-6,6\\}$', () => { const roots = range(41, -20).filter(x => x !== 0 && x / 2 === 18 / x); same(roots, [-6, 6]); });
v('geometric-infinite', 0, '$12$', () => close(sum(geometric(6, .5, 80)), 12));
v('geometric-infinite', 1, '$8/3$', () => close(sum(geometric(4, -.5, 80)), 8 / 3));
v('recurring', 0, '$3/11$', () => close(Number('0.' + '27'.repeat(20)), 3 / 11));
v('recurring', 1, '$1/6$', () => close(Number('0.1' + '6'.repeat(30)), 1 / 6));
v('sum-integers', 0, '$210$', () => close(sum(range(20, 1)), 210));
v('sum-integers', 1, '$410$', () => close(sum(range(20, 11)), 410));
v('sum-squares', 0, '$55$', () => close(sum(range(5, 1).map(x => x ** 2)), 55));
v('sum-squares', 1, '$77$', () => close(sum(range(3, 4).map(x => x ** 2)), 77));
v('sum-cubes', 0, '$100$', () => close(sum(range(4, 1).map(x => x ** 3)), 100));
v('sum-cubes', 1, '$216$', () => close(sum(range(3, 3).map(x => x ** 3)), 216));
v('sum-odds', 0, '$100$', () => close(sum(range(20, 1).filter(x => x % 2)), 100));
v('sum-odds', 1, '$12$', () => { let total = 0, n = 0; while (total < 144) total += 2 * ++n - 1; same([n, total], [12, 144]); });
// Every combinatorics worked example is explicitly enumerated, including
// repeated symbols, leading-zero restrictions and rotation equivalence.
v('count-add', 0, '$5$', () => same(new Set(['r1','r2','r3','b1','b2']).size, 5));
v('count-add', 1, '$6$', () => same(new Set(['bus1','bus2','bus3','bus4','train1','train2']).size, 6));
v('count-multiply', 0, '$6$', () => same(['s1','s2','s3'].flatMap(s => ['t1','t2'].map(t => [s,t])).length, 6));
v('count-multiply', 1, '$18$', () => same(['A','B'].flatMap(a => tuples([0,1,2], 2).map(t => [a,...t])).length, 18));
v('factorial', 0, '$24$', () => same(permutations([0,1,2,3]).length, 24));
v('factorial', 1, '$120$', () => same(permutations(range(6), 3).length, 120));
v('permutations', 0, '$120$', () => same(permutations(range(5)).length, 120));
v('permutations', 1, '$6$', () => same(permutations(['A','B','C','D']).filter(p => p[0] === 'A').length, 6));
v('arrangements', 0, '$20$', () => same(permutations(range(5), 2).length, 20));
v('arrangements', 1, '$18$', () => same(permutations([0,1,2,3], 3).filter(t => t[0] !== 0).length, 18));
v('combinations', 0, '$20$', () => same(chooseSets(range(6), 3).length, 20));
v('combinations', 1, '$18$', () => same(chooseSets(['r1','r2','r3','r4','b1','b2','b3'], 3).filter(s => s.filter(x => x[0] === 'r').length === 2).length, 18));
v('combination-symmetry', 0, '$21$', () => same(chooseSets(range(7), 5).length, 21));
v('combination-symmetry', 1, '$8$', () => same(chooseSets(range(8), 7).length, 8));
v('pascal', 0, '$10$', () => { same(chooseSets(range(4),1).length + chooseSets(range(4),2).length, 10); same(chooseSets(range(5), 2).length, 10); });
v('pascal', 1, '$20$', () => { const xs = chooseSets(range(6), 3); same(xs.filter(s => s.includes(0)).length, 10); same(xs.filter(s => !s.includes(0)).length, 10); same(xs.length, 20); });
v('subsets', 0, '$16$', () => same(subsets(range(4)).length, 16));
v('subsets', 1, '$31$', () => same(subsets(range(5)).filter(s => s.length).length, 31));
v('repeated-permutations', 0, '$3$', () => same(uniquePermutations(['A','A','B']).sort(), ['AAB','ABA','BAA']));
v('repeated-permutations', 1, '$30$', () => same(uniquePermutations(['A','A','B','B','C']).length, 30));
v('repeated-arrangements', 0, '$27$', () => same(tuples([0,1,2], 3).length, 27));
v('repeated-arrangements', 1, '$32$', () => same(coins(5).length, 32));
v('circular', 0, '$24$', () => same(circles(['A','B','C','D','E']).length, 24));
v('circular', 1, '$4$', () => same(circles(['A','B','C','D']).filter(s => { const distance = Math.abs(s.indexOf('A') - s.indexOf('B')); return distance === 1 || distance === 3; }).length, 4));

v('probability-classical', 0, '$1/2$', () => close(prob(die, x => x % 2 === 0), 1 / 2));
v('probability-classical', 1, '$1/6$', () => close(prob(tuples(die, 2), ([a,b]) => a + b === 7), 1 / 6));
v('probability-complement', 0, '$5/6$', () => close(prob(die, x => x !== 6), 5 / 6));
v('probability-complement', 1, '$1/2$', () => close(prob(coins(3), xs => sum(xs) <= 1), 1 / 2));
v('probability-disjoint', 0, '$1/3$', () => close(prob(die, x => x === 1 || x === 6), 1 / 3));
v('probability-disjoint', 1, '$1/2$', () => close(prob(range(10,1), x => [1,2,7,8,9].includes(x)), 1 / 2));
v('probability-union', 0, '$2/3$', () => close(prob(die, x => x % 2 === 0 || x > 4), 2 / 3));
v('probability-union', 1, '$3/4$', () => close(prob(coins(2), ([a,b]) => a === 1 || b === 1), 3 / 4));
v('probability-independent', 0, '$1/12$', () => close(prob([0,1].flatMap(c => die.map(d => [c,d])), ([c,d]) => c === 1 && d === 6), 1 / 12));
v('probability-independent', 1, '$3/50$', () => { const space = weightedPaths([[[1,.2],[0,.8]],[[1,.3],[0,.7]]]); close(mass(space, ([a,b]) => a && b), 3 / 50); });
v('probability-conditional', 0, '$2/3$', () => close(prob(die.filter(x => x >= 4), x => x % 2 === 0), 2 / 3));
v('probability-conditional', 1, '$1/2$', () => close(prob(permutations(['r1','r2','r3','b1','b2'],2).filter(xs => xs[0][0] === 'r'), xs => xs[1][0] === 'r'), 1 / 2));
// Integer atom multiplicities give independent exact sample spaces for urn
// mixtures/Bayes fixtures; each list member below has equal probability.
const urnTotal = [
  ...['r1','r2','b1'].flatMap(ball => range(4).map(() => ['I',ball[0]])),
  ...['r1','b1','b2','b3'].flatMap(ball => range(6).map(() => ['II',ball[0]])),
];
v('total-probability', 0, '$7/18$', () => { same(urnTotal.length,36); close(prob(urnTotal, ([,c]) => c === 'r'), 7 / 18); });
v('total-probability', 1, '$2/25$', () => { const atoms = [...range(40).map(i => ['I',i < 2]), ...range(60).map(i => ['II',i < 6])]; close(prob(atoms, ([,d]) => d), 2 / 25); });
v('bayes', 0, '$3/4$', () => { const atoms = [['I','r'],['I','r'],['I','r'],['I','b'],['II','r'],['II','b'],['II','b'],['II','b']]; close(prob(atoms.filter(([,c]) => c === 'r'), ([u]) => u === 'I'), 3 / 4); });
v('bayes', 1, '$1/2$', () => { const atoms = [...range(15).map(i => ['I',i < 3]), ...range(45).map(i => ['II',i < 3])]; close(prob(atoms.filter(([,d]) => d), ([u]) => u === 'I'), 1 / 2); });
v('bernoulli', 0, '$3/8$', () => close(prob(coins(4), xs => sum(xs) === 2), 3 / 8));
v('bernoulli', 1, '$48/125$', () => close(prob(tuples(range(5),3), xs => xs.filter(x => x === 0).length === 1), 48 / 125));
v('probability-at-least-one', 0, '$7/8$', () => close(prob(coins(3), xs => xs.some(x => x === 1)), 7 / 8));
v('probability-at-least-one', 1, '$11/36$', () => close(prob(tuples(die,2), xs => xs.includes(6)), 11 / 36));
v('geometric-probability', 0, '$2/5$', () => { close((6 - 2) / (10 - 0), 2 / 5); same(0 <= 2 && 2 <= 6 && 6 <= 10, true); });
v('geometric-probability', 1, '$\\pi/16$', () => { same(1 <= 4/2, true); close(Math.PI * 1 ** 2 / (4 ** 2), Math.PI / 16); });

v('mean', 0, '$5$', () => close(mean([2,4,9]), 5));
v('mean', 1, '$11$', () => close(mean([4,6,11]), 7));
v('weighted-mean', 0, '$86$', () => close(mean([80,80,90,90,90]), 86));
v('weighted-mean', 1, '$14/5$', () => close(mean([1,1,4,4,4]), 14 / 5));
v('median', 0, '$5$', () => close(median([9,1,5,3,7]), 5));
v('median', 1, '$6$', () => close(median([8,2,10,4]), 6));
v('mode', 0, '$2$', () => same(modes([2,2,3,5]), [2]));
v('mode', 1, '$\\{1,2\\}$', () => same(modes([1,1,2,2,3]), [1,2]));
v('range', 0, '$12$', () => close(spread([-3,4,9,1]), 12));
v('range', 1, '$0$', () => close(spread([5,5,5]), 0));
v('variance', 0, '$8/3$', () => { close(variance([2,4,6]), 8 / 3); close(secondMomentVariance([2,4,6]), 8 / 3); });
v('variance', 1, '$2$', () => { close(variance([1,1,4]), 2); close(secondMomentVariance([1,1,4]), 2); });
v('standard-deviation', 0, '$1$', () => close(Math.sqrt(variance([1,3])), 1));
v('standard-deviation', 1, '$\\sqrt6$', () => close(Math.sqrt(variance([0,3,6])), Math.sqrt(6)));
v('expectation', 0, '$7/2$', () => close(mean(die), 7 / 2));
v('expectation', 1, '$1$', () => close(mean([-2,1,1,4]), 1));
for (const f of data.formulas) for (let i=0; i<f.examples.length; i++) assert.ok(checked.has(`${f.slug.slice(4)}:${i}`), `Unverified example ${f.slug}:${i}`);
console.log(`${checked.size}/${data.formulas.reduce((n,f)=>n+f.examples.length,0)} worked examples verified; all 24 combinatorics examples brute-force enumerated.`);

// Formula-family probes: independently generated progressions and finite sums.
let seed = 20260928;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 2 ** 32; }
for (let trial=0; trial<100; trial++) {
  const a = Math.floor(random()*41)-20, d = Math.floor(random()*13)-6, n = 2+Math.floor(random()*20);
  const xs = arithmetic(a,d,n);
  close(xs[n-1],a+(n-1)*d); close(sum(xs),n*(a+xs[n-1])/2); close(sum(xs),n*(2*a+(n-1)*d)/2);
  for (let i=1;i<n-1;i++) close(2*xs[i],xs[i-1]+xs[i+1]);
  const m = 1+Math.floor(random()*(n-1)); close((xs[n-1]-xs[m-1])/(n-m),d);
  close(xs[0]+xs[n-1],xs[1]+xs[n-2]);
  const b = 1+Math.floor(random()*9), q = [-2,-1,-.5,.25,1,2][Math.floor(random()*6)];
  const gs = geometric(b,q,n);
  close(gs.at(-1),b*q**(n-1)); close(sum(gs),q===1?n*b:b*(1-q**n)/(1-q));
  for (let i=1;i<n-1;i++) close(gs[i]**2,gs[i-1]*gs[i+1]);
}
for (let n=1;n<=50;n++) {
  const ints=range(n,1);
  close(sum(ints),n*(n+1)/2); close(sum(ints.map(k=>k*k)),n*(n+1)*(2*n+1)/6);
  close(sum(ints.map(k=>k**3)),(n*(n+1)/2)**2); close(sum(ints.map(k=>2*k-1)),n*n);
}
for (const b of [-7,1,9]) for (const q of [-.75,-.5,.25,.5,.75]) {
  const n=120, actual=sum(geometric(b,q,n)), target=b/(1-q);
  // Analytic remainder bound, separately from a numerical convergence sample.
  assertions++; assert.ok(Math.abs(actual-target) <= Math.abs(b)*Math.abs(q)**n/(1-Math.abs(q)) + 1e-12);
}
for (const [r,blocks] of [[1,[0,1,3,9]],[2,[0,4,27,99]],[3,[0,5,127,999]]]) {
  for (const block of blocks) close(Number('0.'+String(block).padStart(r,'0').repeat(20)),block/(10**r-1));
}
// Factorial formulas are compared with generated permutations/subsets, not used
// to produce the enumeration counts themselves.
const factorial=n=>range(n,1).reduce((a,b)=>a*b,1);
let enumeratedFamilies=0;
for (let n=0;n<=7;n++) {
  const objects=range(n); same(permutations(objects).length,factorial(n));
  for (let k=0;k<=n;k++) {
    same(permutations(objects,k).length,factorial(n)/factorial(n-k));
    const groups=chooseSets(objects,k);
    same(groups.length,factorial(n)/(factorial(k)*factorial(n-k)));
    same(groups.length,chooseSets(objects,n-k).length);
    if(k<n) same(groups.length+chooseSets(objects,k+1).length,chooseSets(range(n+1),k+1).length);
    enumeratedFamilies++;
  }
  same(subsets(objects).length,2**n);
  if(n) same(circles(objects.map(String)).length,factorial(n-1));
}
for (let n=1;n<=4;n++) for (let k=0;k<=5;k++) same(tuples(range(n),k).length,n**k);
for (const counts of [[0,3],[1,3],[2,2],[3,2,1],[2,2,2],[0,0]]) {
  const xs=counts.flatMap((n,i)=>Array(n).fill(String(i)));
  same(uniquePermutations(xs).length,factorial(xs.length)/counts.reduce((p,n)=>p*factorial(n),1));
}
// Finite weighted event spaces check disjoint/overlapping/independent cases and
// nonzero conditional denominators. Empty conditions are deliberately excluded.
const atoms=[0,1,2,3], weights=[.1,.2,.3,.4], events=subsets(atoms);
const P=event=>sum(event.map(i=>weights[i]));
for (const A of events) {
  close(P(A)+P(atoms.filter(i=>!A.includes(i))),1);
  for (const B of events) {
    const intersection=A.filter(i=>B.includes(i)), union=[...new Set([...A,...B])];
    close(P(union),P(A)+P(B)-P(intersection));
    if(!intersection.length) close(P(union),P(A)+P(B));
    if(P(B)>0) close(P(B)*(P(intersection)/P(B)),P(intersection));
  }
  // A fixed positive partition for total probability and Bayes normalization.
  const partition=[[0,1],[2,3]], contributions=partition.map(H=>P(H)*P(A.filter(i=>H.includes(i)))/P(H));
  close(sum(contributions),P(A));
  if(P(A)>0) close(sum(contributions.map(w=>w/P(A))),1);
}
for(let n=1;n<=7;n++) for(const p of [0,.1,.25,.5,.8,1]) {
  const outcomes=coins(n).map(xs=>({xs,weight:xs.reduce((w,x)=>w*(x?p:1-p),1)}));
  close(sum(outcomes.map(o=>o.weight)),1);
  for(let k=0;k<=n;k++) {
    const actual=sum(outcomes.filter(o=>sum(o.xs)===k).map(o=>o.weight));
    const expected=p===0?(k===0?1:0):p===1?(k===n?1:0):factorial(n)/(factorial(k)*factorial(n-k))*p**k*(1-p)**(n-k);
    close(actual,expected);
  }
  close(sum(outcomes.filter(o=>o.xs.some(Boolean)).map(o=>o.weight)),1-(1-p)**n);
}
for(let trial=0;trial<100;trial++) {
  const n=1+Math.floor(random()*15), xs=range(n).map(()=>Math.floor(random()*31)-15), offset=Math.floor(random()*21)-10;
  close(variance(xs),secondMomentVariance(xs));
  close(variance(xs.map(x=>x+offset)),variance(xs));
  close(Math.sqrt(variance(xs.map(x=>-3*x))),3*Math.sqrt(variance(xs)));
  close(spread(xs.map(x=>x+offset)),spread(xs));
  close(mean(xs.map(x=>x+offset)),mean(xs)+offset);
}
same(modes([1,2,3]),[]); same(modes([1,1,2,2]),[1,2]); close(median([9]),9); close(variance([9]),0);
close(sum([1,3].map(x=>(x-2)**2))/(2-1),2); // sample s^2, distinct from population variance=1
same(bySlug.get('variance').conditions.includes('\\text{энд нийт өгөгдлийн дисперс, хуваарь }n'),true);
same(bySlug.get('probability-conditional').conditions.includes('P(B)>0'),true);
same(bySlug.get('bayes').conditions.includes('P(A)>0'),true);

// Every blank asks an exact number, never a weak one-way consequence. All four
// choices are parsed and compared, so equivalent fractional distractors fail.
function numericChoice(s) {
  assert.match(s,/^-?\d+(?:\/\d+)?$/,'Only explicit integers/fractions in these numeric quizzes');
  const [a,b='1']=s.split('/'); assert.notEqual(Number(b),0); return Number(a)/Number(b);
}
const quizValues={
  'arithmetic-term':arithmetic(2,4,6).at(-1),
  'arithmetic-sum':sum(arithmetic(2,2,5)),
  'arithmetic-middle':8,
  'arithmetic-pairs':18,
  'arithmetic-difference':-3,
  'geometric-term':geometric(2,-3,3).at(-1),
  'geometric-sum':sum(geometric(4,1,5)),
  'geometric-middle':9,
  'geometric-infinite':sum(geometric(3,1/3,80)),
  'recurring':Number('0.'+'04'.repeat(20)),
  'sum-integers':sum(range(8,1)),
  'sum-squares':sum([1,4,9]),
  'sum-cubes':sum([1,8,27]),
  'sum-odds':sum([1,3,5,7]),
  'count-add':new Set(['a','b','c','d','e','f','g']).size,
  'count-multiply':tuples([0,1,2,3],2).filter(([a])=>a<2).length,
  'factorial':permutations(range(5),2).length,
  'permutations':permutations(range(3)).length,
  'arrangements':permutations(range(4),2).length,
  'combinations':chooseSets(range(5),2).length,
  'combination-symmetry':chooseSets(range(6),5).length,
  'pascal':chooseSets(range(5),1).length+chooseSets(range(5),2).length,
  'subsets':subsets(range(3)).length,
  'repeated-permutations':uniquePermutations(['A','A','A','B']).length,
  'repeated-arrangements':coins(4).length,
  'circular':circles(['A','B','C','D']).length,
  'probability-classical':prob(die,x=>x>4),
  'probability-complement':prob(range(10),x=>x>=3),
  'probability-disjoint':prob(range(10),x=>x<2 || x>=7),
  'probability-union':prob(range(10),x=>x<5 || (x>=3&&x<7)),
  'probability-independent':prob(tuples(range(4),2).filter(([a])=>a<3),([a,b])=>a===0 && b<3),
  'probability-conditional':prob(range(10).filter(x=>x<5),x=>x<2),
  'total-probability':prob(range(24),x=>(x<6&&x<3)||(x>=6&&x<12)),
  'bayes':prob(range(8).filter(x=>x===0||x>=5),x=>x<4),
  'bernoulli':prob(coins(3),xs=>sum(xs)===2),
  'probability-at-least-one':prob(coins(2),xs=>xs.some(Boolean)),
  'geometric-probability':(3-1)/(8-0),
  'mean':mean([2,6,10]),
  'weighted-mean':mean([10,20,20,20]),
  'median':median([7,1,3]),
  'mode':modes([3,3,3,4,4,5])[0],
  'range':spread([-2,0,5]),
  'variance':variance([1,3]),
  'standard-deviation':Math.sqrt(variance([1,5])),
  'expectation':mean([0,0,0,2]),
};
let blankCount=0;
for(const f of data.formulas) {
  const slug=f.slug.slice(4), value=quizValues[slug]; assert.ok(Number.isFinite(value),`Unverified quiz ${slug}`);
  const quiz=f.quiz.find(q=>q.type==='blank'); assert.ok(quiz);
  same(quiz.prompt.includes('\\Longrightarrow'),false,`${slug} must ask exact value`);
  const all=[quiz.answer,...quiz.distractors].map(numericChoice);
  const hits=all.map((x,i)=>Math.abs(x-value)<1e-10?i:null).filter(x=>x!==null);
  same(hits,[0],`${slug}: exactly one correct numeric choice`); blankCount++;
}
// Adversarial semantic counterexamples and degenerate cases backing the manual
// true/false review. These are not claimed as proofs of every universal claim.
close(prob(tuples(die,2),xs=>sum(xs)===2),1/36);
close(prob(tuples(die,2),xs=>sum(xs)===7),1/6);
same(new Set([1,2,2,3]).size,3);
close(variance([1,3]),1); close(Math.sqrt(variance([-2,-6])),2);
close(prob(coins(2),([a,b])=>a&&b),1/4); // independence is not disjointness
same(circles(['A','B','C','D']).length,6); same(permutations(['A','B','C','D']).length,24);
same(uniquePermutations(['A','A']).length,1); same(subsets([]).length,1); same(permutations([],0).length,1);
close(mean(die),3.5); same(die.includes(mean(die)),false);
console.log(`100 progression cases; 50 finite sums; ${enumeratedFamilies} (n,k) enumerations; weighted event spaces; Bernoulli endpoints; 100 statistics cases checked.`);
console.log(`${blankCount}/45 blank quizzes have one distinct correct numeric choice; ${assertions} total assertions. All 45 true/false statements and global conditions require the recorded manual review.`);
