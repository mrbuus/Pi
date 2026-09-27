#!/usr/bin/env node
'use strict';
// Independent finite-difference, quadrature, and interval probes for authored
// C6 examples. These do not parse/prove arbitrary LaTeX or replace analytic
// review of domains, completeness, theorem hypotheses, and quiz semantics.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const data=JSON.parse(fs.readFileSync(process.argv[2]||path.join(__dirname,'data/formulas/calculus.json'),'utf8'));
const rows=new Map(data.formulas.map(f=>[f.slug.slice(5),f]));
let assertions=0,derivativeProbes=0,integralProbes=0;
const covered=new Set();
const close=(a,b,tol=2e-7,label='')=>{assertions++;assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${label}: ${a} != ${b}`);};
const same=(a,b,label='')=>{assertions++;assert.deepEqual(a,b,label);};
const truth=(x,label='')=>{assertions++;assert.ok(x,label);};
function v(slug,i,answer,fn){same(rows.get(slug).examples[i].answer,answer,`${slug} displayed example ${i+1}`);fn();covered.add(`${slug}:${i}`);}
function derivative(f,x){const h=2e-4*Math.max(1,Math.abs(x));derivativeProbes++;return (-f(x+2*h)+8*f(x+h)-8*f(x-h)+f(x-2*h))/(12*h);}
function second(f,x){const h=2e-3*Math.max(1,Math.abs(x));derivativeProbes++;return (-f(x+2*h)+16*f(x+h)-30*f(x)+16*f(x-h)-f(x-2*h))/(12*h*h);}
function simpson(f,a,b,n=1024){assert.equal(n%2,0);const h=(b-a)/n;let s=f(a)+f(b);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(a+i*h);integralProbes++;return s*h/3;}
const grid=(a,b,n=41)=>Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));
const cube=x=>x**3-3*x;
function limit(f,c,L){for(const side of [-1,1]){const errors=[.1,.01,.001,.0001,.00001].map(h=>Math.abs(f(c+side*h)-L));truth(errors.at(-1)<errors[0]+1e-10);close(f(c+side*1e-5),L,2e-4);}}
function antiderivative(f,F,points){for(const x of points)close(derivative(F,x),f(x));for(const [a,b] of [[points[0],points.at(-1)]])close(simpson(f,a,b),F(b)-F(a),2e-7);}
function localExtremum(f,c,type){for(const h of [1e-3,.01,.1])for(const side of [-1,1])truth(type==='min'?f(c)<f(c+side*h):f(c)>f(c+side*h));}

v('limit-factor',0,'$4$',()=>limit(x=>(x*x-4)/(x-2),2,4));
v('limit-factor',1,'$3/2$',()=>limit(x=>(x**3-1)/(x*x-1),1,1.5));
v('limit-conjugate',0,'$1/6$',()=>limit(x=>(Math.sqrt(x)-3)/(x-9),9,1/6));
v('limit-conjugate',1,'$1/2$',()=>limit(x=>(Math.sqrt(1+x)-1)/x,0,.5));
v('limit-infinity',0,'$3/2$',()=>{const f=x=>(3*x*x-1)/(2*x*x+x);truth(Math.abs(f(1e7)-1.5)<Math.abs(f(100)-1.5));close(f(1e7),1.5);});
v('limit-infinity',1,'$0$',()=>{const f=x=>(2*x+5)/(x*x+1);truth(f(1e7)<f(100));close(f(1e7),0,3e-7);});
v('limit-sine',0,'$3$',()=>limit(x=>Math.sin(3*x)/x,0,3));
v('limit-sine',1,'$2/5$',()=>limit(x=>Math.sin(2*x)/Math.sin(5*x),0,.4));
v('limit-e',0,'$e^2$',()=>{const f=n=>Math.exp(2*n*Math.log1p(1/n));truth(f(1e6)>f(100));close(f(1e6),Math.exp(2),2e-6);});
v('limit-e',1,'$e^{-1}$',()=>{const f=n=>Math.exp(n*Math.log1p(-1/n));truth(f(1e6)>f(100));close(f(1e6),Math.exp(-1),2e-6);});
v('derivative-definition',0,'$6$',()=>{close(derivative(x=>x*x,3),6);for(const h of [-.01,.01])close(((3+h)**2-9)/h,6+h);});
v('derivative-definition',1,'$f^{\\prime}(0)\\text{ оршихгүй}$',()=>{for(const h of [.1,.01,.001]){close(Math.abs(h)/h,1);close(Math.abs(-h)/(-h),-1);}});
v('derivative-constant',0,'$0$',()=>close(derivative(()=>7,4),0));
v('derivative-constant',1,'$0$',()=>close(derivative(()=>Math.PI**2,2),0));
v('derivative-power',0,'$80$',()=>close(derivative(x=>x**5,2),80));
v('derivative-power',1,'$-1/4$',()=>close(derivative(x=>x**-2,2),-.25));
v('derivative-sqrt',0,'$1/6$',()=>close(derivative(Math.sqrt,9),1/6));
v('derivative-sqrt',1,'$1$',()=>close(derivative(Math.sqrt,.25),1));
v('derivative-reciprocal',0,'$-1/4$',()=>close(derivative(x=>1/x,2),-.25));
v('derivative-reciprocal',1,'$-1/9$',()=>close(derivative(x=>1/x,-3),-1/9));
v('derivative-exponential',0,'$1$',()=>close(derivative(Math.exp,0),1));
v('derivative-exponential',1,'$3$',()=>close(derivative(Math.exp,Math.log(3)),3));
v('derivative-base-exponential',0,'$8\\ln2$',()=>close(derivative(x=>2**x,3),8*Math.log(2)));
v('derivative-base-exponential',1,'$-\\ln2$',()=>close(derivative(x=>.5**x,0),-Math.log(2)));
v('derivative-logarithm',0,'$1/4$',()=>close(derivative(Math.log,4),.25));
v('derivative-logarithm',1,'$e$',()=>close(derivative(Math.log,1/Math.E),Math.E));
v('derivative-base-logarithm',0,'$1/\\ln10$',()=>close(derivative(Math.log10,1),1/Math.log(10)));
v('derivative-base-logarithm',1,'$-1/(2\\ln2)$',()=>close(derivative(x=>Math.log(x)/Math.log(.5),2),-1/(2*Math.log(2))));
v('derivative-sine',0,'$1$',()=>close(derivative(Math.sin,0),1));
v('derivative-sine',1,'$1/2$',()=>close(derivative(Math.sin,Math.PI/3),.5));
v('derivative-cosine',0,'$-1$',()=>close(derivative(Math.cos,Math.PI/2),-1));
v('derivative-cosine',1,'$-1/2$',()=>close(derivative(Math.cos,Math.PI/6),-.5));
v('derivative-tangent',0,'$1$',()=>close(derivative(Math.tan,0),1));
v('derivative-tangent',1,'$2$',()=>close(derivative(Math.tan,Math.PI/4),2));
v('derivative-cotangent',0,'$-1$',()=>close(derivative(x=>1/Math.tan(x),Math.PI/2),-1));
v('derivative-cotangent',1,'$-4$',()=>close(derivative(x=>1/Math.tan(x),Math.PI/6),-4));
v('derivative-sum',0,'$1$',()=>close(derivative(x=>x**3+Math.sin(x),0),1));
v('derivative-sum',1,'$3$',()=>close(derivative(x=>x*x+Math.log(x),1),3));
v('derivative-scale',0,'$12$',()=>close(derivative(x=>3*x*x,2),12));
v('derivative-scale',1,'$-5$',()=>close(derivative(x=>-5*Math.sin(x),0),-5));
v('derivative-product',0,'$1$',()=>close(derivative(x=>x*Math.exp(x),0),1));
v('derivative-product',1,'$1$',()=>close(derivative(x=>x*x*Math.log(x),1),1));
v('derivative-quotient',0,'$1/4$',()=>close(derivative(x=>x/(x+1),1),.25));
v('derivative-quotient',1,'$3/4$',()=>close(derivative(x=>(x*x+1)/x,2),.75));
v('derivative-chain',0,'$3$',()=>close(derivative(x=>Math.sin(3*x),0),3));
v('derivative-chain',1,'$1$',()=>close(derivative(x=>Math.log(x*x+1),1),1));
v('tangent',0,'$y=2x-1$',()=>{const line=x=>2*x-1;close(line(1),1);close(derivative(line,1),derivative(x=>x*x,1));});
v('tangent',1,'$y=x/e$',()=>{const line=x=>x/Math.E;close(line(Math.E),Math.log(Math.E));close(derivative(line,Math.E),derivative(Math.log,Math.E));});
v('slope',0,'$6$',()=>close(derivative(x=>x*x,3),6));
v('slope',1,'$1$',()=>close(Math.tan(Math.PI/4),1));
v('kinematics',0,'$v=9\\ \\mathrm{m/s},\\ a=12\\ \\mathrm{m/s^2}$',()=>{close(derivative(cube,2),9);close(second(cube,2),12);});
v('kinematics',1,'$|v|=6\\ \\mathrm{m/s},\\ a=10\\ \\mathrm{m/s^2}$',()=>{close(Math.abs(derivative(t=>5*t*t-4*t,1)),6);close(second(t=>5*t*t-4*t,1),10);});
v('monotonic',0,'$\\text{хатуу өснө}$',()=>{for(const x of grid(.01,5))truth(derivative(t=>t*t,x)>0);});
v('monotonic',1,'$\\text{өсөх: }(-\\infty,-1),(1,\\infty);\\ \\text{буурах: }(-1,1)$',()=>{for(const x of [...grid(-5,-1.01),...grid(1.01,5)])truth(derivative(cube,x)>0);for(const x of grid(-.99,.99))truth(derivative(cube,x)<0);close(derivative(cube,-1),0);close(derivative(cube,1),0);});
v('critical-points',0,'$\\{-1,1\\}$',()=>{for(const x of [-1,1])close(derivative(cube,x),0);for(const x of grid(-3,3,61))close(derivative(cube,x),3*(x-1)*(x+1));});
v('critical-points',1,'$\\{0\\}$',()=>{close(Math.abs(.01)/.01,1);close(Math.abs(-.01)/-.01,-1);for(const x of [-3,-1,1,3])close(Math.abs(derivative(Math.abs,x)),1);});
v('extremum-necessary',0,'$x=3$',()=>{const f=x=>(x-3)**2+2;close(derivative(f,3),0);localExtremum(f,3,'min');});
v('extremum-necessary',1,'$\\text{экстремум биш}$',()=>{close(derivative(x=>x**3,0),0);truth((-.01)**3<0 && .01**3>0);});
v('first-derivative-test',0,'$\\text{максимум }(-1,2),\\ \\text{минимум }(1,-2)$',()=>{close(cube(-1),2);close(cube(1),-2);localExtremum(cube,-1,'max');localExtremum(cube,1,'min');});
v('first-derivative-test',1,'$\\text{максимум }(0,0)$',()=>{close(-(0**2),0);localExtremum(x=>-x*x,0,'max');});
v('closed-interval-extrema',0,'$\\min f=0,\\ \\max f=4$',()=>{const ys=[...grid(-1,2,601),0].map(x=>x*x);close(Math.min(...ys),0);close(Math.max(...ys),4);});
v('closed-interval-extrema',1,'$\\min f=-2\\ (x=-2,1),\\ \\max f=2\\ (x=-1,2)$',()=>{const ys=grid(-2,2,801).map(cube);close(Math.min(...ys),-2);close(Math.max(...ys),2);same([-2,-1,1,2].map(cube),[-2,2,-2,2]);});
v('second-derivative-test',0,'$\\text{минимум }(2,-3)$',()=>{const f=x=>x*x-4*x+1;close(derivative(f,2),0);close(second(f,2),2);close(f(2),-3);localExtremum(f,2,'min');});
v('second-derivative-test',1,'$\\text{максимум }(2,7)$',()=>{const f=x=>-2*x*x+8*x-1;close(derivative(f,2),0);close(second(f,2),-4);close(f(2),7);localExtremum(f,2,'max');});
v('concavity',0,'$\\text{шүргэгчээс дээш}$',()=>{for(const c of [-2,0,3])for(const x of grid(-4,4))if(x!==c){truth(x*x>c*c+2*c*(x-c));close(x*x-(c*c+2*c*(x-c)),(x-c)**2);}});
v('concavity',1,'$\\text{шүргэгчээс доор}$',()=>{for(const c of [.5,1,3])for(const x of grid(.1,5))if(Math.abs(x-c)>.01)truth(Math.log(x)<Math.log(c)+(x-c)/c);});
v('inflection',0,'$(0,0)$',()=>{close(0**3,0);for(const x of [-1,-.1,.1,1]){close(second(t=>t**3,x),6*x);truth(Math.sign(second(t=>t**3,x))===Math.sign(x));}});
v('inflection',1,'$\\text{нугаралтын цэг биш}$',()=>{close(second(x=>x**4,0),0);for(const x of [-1,-.1,.1,1])truth(second(t=>t**4,x)>0);});
v('antiderivative-definition',0,'$F(x)=x^2+C$',()=>{for(const C of [-3,0,7])antiderivative(x=>2*x,x=>x*x+C,[-2,-1,0,1,2]);});
v('antiderivative-definition',1,'$F(x)=x^3+4$',()=>{antiderivative(x=>3*x*x,x=>x**3+4,[-2,-1,0,1,2]);close(1**3+4,5);});
v('antiderivative-linearity',0,'$x^3-2x+C$',()=>antiderivative(x=>3*x*x-2,x=>x**3-2*x,[-2,-1,0,1,2]));
v('antiderivative-linearity',1,'$2\\sin x+e^x+C$',()=>antiderivative(x=>2*Math.cos(x)+Math.exp(x),x=>2*Math.sin(x)+Math.exp(x),[-1,0,1,2]));
v('antiderivative-power',0,'$x^3/3+C$',()=>antiderivative(x=>x*x,x=>x**3/3,[-2,-1,0,1,2]));
v('antiderivative-power',1,'$2\\sqrt x+C$',()=>antiderivative(x=>1/Math.sqrt(x),x=>2*Math.sqrt(x),[.25,.5,1,2,4]));
v('antiderivative-reciprocal',0,'$\\ln x+C$',()=>antiderivative(x=>1/x,Math.log,[.25,.5,1,2,4]));
v('antiderivative-reciprocal',1,'$3\\ln(-x)+C$',()=>antiderivative(x=>3/x,x=>3*Math.log(-x),[-4,-2,-1,-.5,-.25]));
v('antiderivative-exponential',0,'$2^x/\\ln2+C$',()=>antiderivative(x=>2**x,x=>2**x/Math.log(2),[-2,-1,0,1,2]));
v('antiderivative-exponential',1,'$3e^x+C$',()=>antiderivative(x=>3*Math.exp(x),x=>3*Math.exp(x),[-1,0,1,2]));
v('antiderivative-trig',0,'$-\\cos x+C$',()=>antiderivative(Math.sin,x=>-Math.cos(x),[-1,-.5,0,.5,1]));
v('antiderivative-trig',1,'$\\operatorname{tg}x+C$',()=>antiderivative(x=>1/Math.cos(x)**2,Math.tan,[-1,-.5,0,.5,1]));
v('antiderivative-linear-inner',0,'$(2x+1)^5/10+C$',()=>antiderivative(x=>(2*x+1)**4,x=>(2*x+1)**5/10,[-1,-.5,0,.5,1]));
v('antiderivative-linear-inner',1,'$-e^{-3x}/3+C$',()=>antiderivative(x=>Math.exp(-3*x),x=>-Math.exp(-3*x)/3,[-1,-.5,0,.5,1]));
v('newton-leibniz',0,'$8$',()=>close(simpson(x=>3*x*x,0,2),8));
v('newton-leibniz',1,'$1$',()=>close(simpson(x=>1/x,1,Math.E),1));
v('definite-properties',0,'$-2$',()=>close(simpson(x=>x,2,0),-2));
v('definite-properties',1,'$5$',()=>{const f=x=>x/3+11/6;close(simpson(f,0,3),7);close(simpson(f,0,1),2);close(simpson(f,1,3),5);});
v('integral-area',0,'$1$',()=>{close(simpson(x=>-x,-1,0)+simpson(x=>x,0,1),1);close(simpson(x=>x,-1,1),0);});
v('integral-area',1,'$8/3$',()=>close(simpson(x=>x*x,0,2),8/3));
v('area-between',0,'$1/6$',()=>{for(const x of grid(0,1))truth(x>=x*x-1e-15);close(simpson(x=>Math.abs(x-x*x),0,1),1/6);});
v('area-between',1,'$2$',()=>close(simpson(x=>-2*x,-1,0)+simpson(x=>2*x,0,1),2));
v('volume-revolution',0,'$8\\pi/3$',()=>{close(simpson(x=>Math.PI*x*x,0,2),8*Math.PI/3);close(Math.PI*2**2*2/3,8*Math.PI/3);});
v('volume-revolution',1,'$12\\pi$',()=>{close(simpson(()=>Math.PI*4,0,3),12*Math.PI);close(Math.PI*2**2*3,12*Math.PI);});
for(const f of data.formulas)for(let i=0;i<f.examples.length;i++)truth(covered.has(`${f.slug.slice(5)}:${i}`),`Missing example ${f.slug}:${i}`);
console.log(`${covered.size}/92 examples checked with limits, finite differences, Simpson integration, and interval/boundary probes.`);

// Seeded derivative/antiderivative families, safely inside each domain.
let seed=20260929;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
const derivativeFamilies=[
 ['constant',()=>5,()=>0,()=>-3+6*random()],
 ['power',x=>x**2.5,x=>2.5*x**1.5,()=>.3+3*random()],
 ['negative integer power',x=>x**-3,x=>-3*x**-4,()=>-3+1.5*random()],
 ['sqrt',Math.sqrt,x=>1/(2*Math.sqrt(x)),()=>.3+3*random()],
 ['reciprocal',x=>1/x,x=>-1/x**2,()=>.3+3*random()],
 ['exp',Math.exp,Math.exp,()=>-2+4*random()],
 ['base exp',x=>.3**x,x=>.3**x*Math.log(.3),()=>-2+4*random()],
 ['ln',Math.log,x=>1/x,()=>.3+3*random()],
 ['base log',x=>Math.log(x)/Math.log(7),x=>1/(x*Math.log(7)),()=>.3+3*random()],
 ['sin',Math.sin,Math.cos,()=>-6+12*random()],
 ['cos',Math.cos,x=>-Math.sin(x),()=>-6+12*random()],
 ['tan',Math.tan,x=>1/Math.cos(x)**2,()=>-1+2*random()],
 ['cot',x=>1/Math.tan(x),x=>-1/Math.sin(x)**2,()=>.4+2.3*random()],
 ['sum',x=>x*x+Math.sin(x),x=>2*x+Math.cos(x),()=>-2+4*random()],
 ['scale',x=>-3*Math.exp(x),x=>-3*Math.exp(x),()=>-2+4*random()],
 ['product',x=>x*x*Math.exp(x),x=>(2*x+x*x)*Math.exp(x),()=>-2+4*random()],
 ['quotient',x=>Math.sin(x)/(x*x+1),x=>(Math.cos(x)*(x*x+1)-2*x*Math.sin(x))/(x*x+1)**2,()=>-2+4*random()],
 ['chain',x=>Math.log(2+x*x),x=>2*x/(2+x*x),()=>-2+4*random()],
];
for(const [name,f,df,next]of derivativeFamilies)for(let i=0;i<50;i++){const x=next();close(derivative(f,x),df(x),2e-7,name);}
const integralFamilies=[
 [x=>x**3,x=>x**4/4,-2,2],
 [x=>x**-.5,x=>2*Math.sqrt(x),.3,3],
 [x=>1/x,Math.log,.3,3],
 [x=>1/x,x=>Math.log(-x),-3,-.3],
 [Math.exp,Math.exp,-1,2],
 [x=>.4**x,x=>.4**x/Math.log(.4),-2,2],
 [Math.sin,x=>-Math.cos(x),-3,3],
 [Math.cos,Math.sin,-3,3],
 [x=>1/Math.cos(x)**2,Math.tan,-1,1],
 [x=>1/Math.sin(x)**2,x=>-1/Math.tan(x),.4,2.7],
 [x=>Math.cos(3*x-1),x=>Math.sin(3*x-1)/3,-1,1],
 [x=>Math.exp(-2*x+1),x=>-Math.exp(-2*x+1)/2,-1,1],
];
for(const [f,F,a,b]of integralFamilies)for(let i=0;i<30;i++){
 const lo=a+(b-a)*random(),hi=a+(b-a)*random();
 close(simpson(f,lo,hi),F(hi)-F(lo),2e-7);
 close(derivative(F,lo),f(lo),2e-7);
}
// Display contracts that make the analytic identities valid; sampled agreement
// never grants permission to drop these domain restrictions.
truth(!JSON.stringify(data).includes('\\\\prime^'), 'Double prime must not nest a prime inside a prime');
truth(rows.get('derivative-sqrt').conditions.includes('x>0'));
truth(rows.get('derivative-logarithm').conditions.includes('x>0'));
truth(rows.get('derivative-quotient').conditions.includes('g(x)\\ne0'));
truth(rows.get('antiderivative-linear-inner').conditions.some(s=>s.includes('k\\ne0')));
truth(rows.get('newton-leibniz').conditions.some(s=>s.includes('тасралтгүй')));
truth(rows.get('closed-interval-extrema').latex.includes('f(a),f(b)'));
same(rows.get('derivative-sum').latex,'(f\\pm g)^{\\prime}=f^{\\prime}\\pm g^{\\prime}');
same(rows.get('derivative-scale').latex,'(cf)^{\\prime}=cf^{\\prime}');
same(rows.get('derivative-product').latex,'(fg)^{\\prime}=f^{\\prime}g+fg^{\\prime}');

// Blank choices: exact numeric evaluation or derivative/semantic comparison.
// No generic eval of arbitrary data. Each symbolic fixture is tied to the
// exact authored choice string, preventing silent stale evaluator mappings.
const specialNumbers=new Map([
 ['e',Math.E],['e^3',Math.exp(3)],['\\ln2',Math.log(2)],['\\ln3',Math.log(3)],
 ['1/\\ln2',1/Math.log(2)],['1/\\ln3',1/Math.log(3)],
 ['\\pi',Math.PI],['\\pi/2',Math.PI/2],['\\pi/3',Math.PI/3],['\\pi^2/3',Math.PI**2/3],
]);
function number(s){if(specialNumbers.has(s))return specialNumbers.get(s);assert.match(s,/^-?\d+(?:\/\d+)?$/);const [a,b='1']=s.split('/');assert.notEqual(+b,0);return +a/+b;}
const values={
 'limit-factor':6,'limit-conjugate':.25,'limit-infinity':2.5,'limit-sine':2,'limit-e':Math.exp(3),
 'derivative-definition':derivative(x=>x*x,2),'derivative-constant':derivative(()=>-12,0),
 'derivative-power':derivative(x=>x**3,2),'derivative-sqrt':derivative(Math.sqrt,4),
 'derivative-reciprocal':derivative(x=>1/x,-2),'derivative-exponential':derivative(Math.exp,Math.log(2)),
 'derivative-base-exponential':derivative(x=>3**x,0),'derivative-logarithm':derivative(Math.log,2),
 'derivative-base-logarithm':derivative(Math.log2,1),'derivative-sine':derivative(Math.sin,Math.PI),
 'derivative-cosine':derivative(Math.cos,0),'derivative-tangent':derivative(Math.tan,Math.PI/3),
 'derivative-cotangent':derivative(x=>1/Math.tan(x),Math.PI/4),
 'derivative-sum':derivative(x=>x*x+x,2),'derivative-scale':derivative(x=>-2*x**3,1),
 'derivative-product':derivative(x=>x*(x+1),2),'derivative-quotient':derivative(x=>1/(x+1),1),
 'derivative-chain':derivative(x=>(2*x+1)**3,0),'tangent':2**2-4*2,
 'slope':derivative(x=>3*x*x,1),'kinematics':derivative(x=>x*x,3),
 'extremum-necessary':2,'closed-interval-extrema':Math.max(...grid(-2,1,601).map(x=>x*x)),
 'inflection':0,'antiderivative-definition':1**2+3,
 'newton-leibniz':simpson(x=>2*x,0,1),'definite-properties':-3,
 'integral-area':simpson(()=>Math.abs(-1),0,3),'area-between':simpson(()=>2,0,3),
 'volume-revolution':simpson(x=>Math.PI*x*x,0,1),
};
const quizCovered=new Set();
for(const [slug,value]of Object.entries(values)){
 const q=rows.get(slug).quiz.find(q=>q.type==='blank'),all=[q.answer,...q.distractors];
 same(all.map((s,i)=>Math.abs(number(s)-value)<2e-7?i:null).filter(x=>x!==null),[0],`${slug} numeric blank uniqueness`);
 quizCovered.add(slug);
}
const symbolicQuizzes=[
 ['antiderivative-linearity',x=>2*x+1,[-1,0,1,2],[['x^2+x+C',x=>x*x+x],['x^2+1+C',x=>x*x+1],['2x^2+x+C',x=>2*x*x+x],['x^2-x+C',x=>x*x-x]]],
 ['antiderivative-power',x=>x**3,[-2,-1,.5,2],[['x^4/4+C',x=>x**4/4],['x^4+C',x=>x**4],['x^3/3+C',x=>x**3/3],['3x^2+C',x=>3*x*x]]],
 ['antiderivative-reciprocal',x=>1/x,[-3,-2,-1,-.5],[['\\ln(-x)+C',x=>Math.log(-x)],['-\\ln(-x)+C',x=>-Math.log(-x)],['1/x+C',x=>1/x],['x^2/2+C',x=>x*x/2]]],
 ['antiderivative-exponential',x=>3**x,[-1,0,1,2],[['3^x/\\ln3+C',x=>3**x/Math.log(3)],['3^x\\ln3+C',x=>3**x*Math.log(3)],['3^x+C',x=>3**x],['x3^x+C',x=>x*3**x]]],
 ['antiderivative-trig',Math.cos,[-1,-.5,.3,1],[['\\sin x+C',Math.sin],['-\\sin x+C',x=>-Math.sin(x)],['\\cos x+C',Math.cos],['-\\cos x+C',x=>-Math.cos(x)]]],
 ['antiderivative-linear-inner',x=>Math.cos(2*x),[-1,-.3,.2,1],[['\\sin(2x)/2+C',x=>Math.sin(2*x)/2],['2\\sin(2x)+C',x=>2*Math.sin(2*x)],['\\sin(2x)+C',x=>Math.sin(2*x)],['-\\sin(2x)/2+C',x=>-Math.sin(2*x)/2]]],
];
for(const [slug,f,points,fixtures]of symbolicQuizzes){
 const q=rows.get(slug).quiz.find(q=>q.type==='blank');same([q.answer,...q.distractors],fixtures.map(([s])=>s),`${slug} fixture binding`);
 same(fixtures.map(([,F],i)=>points.every(x=>Math.abs(derivative(F,x)-f(x))<2e-7)?i:null).filter(x=>x!==null),[0],`${slug} one valid antiderivative family`);
 quizCovered.add(slug);
}
const semanticFixtures=[
 ['monotonic',['\\text{хатуу буурна}','\\text{хатуу өснө}','\\text{тогтмол}','\\text{тодорхойгүй}'],()=>{for(const x of grid(-4,4))close(derivative(t=>-2*t,x),-2);}],
 ['critical-points',['\\{0\\}','\\varnothing','\\{-1,1\\}','\\mathbb R'],()=>{close(derivative(x=>x**3,0),0);for(const x of [-2,-1,1,2])truth(derivative(t=>t**3,x)>0);}],
 ['first-derivative-test',['\\text{локал минимумтай}','\\text{локал максимумтай}','\\text{экстремумгүй}','\\text{тодорхойгүй}'],()=>localExtremum(x=>x*x,0,'min')],
 ['second-derivative-test',['\\text{дүгнэлт өгөхгүй}','\\text{максимум тогтооно}','\\text{минимум тогтооно}','\\text{экстремумгүйг тогтооно}'],()=>{close(second(x=>x**4,0),0);localExtremum(x=>x**4,0,'min');localExtremum(x=>-(x**4),0,'max');}],
 ['concavity',['\\text{доор}','\\text{дээш}','\\text{үргэлж давхцана}','\\text{нэг талд биш}'],()=>{for(const c of [-2,0,1])for(const x of grid(-3,3))if(Math.abs(x-c)>.001)truth(-x*x< -c*c-2*c*(x-c));}],
];
for(const [slug,choices,check]of semanticFixtures){const q=rows.get(slug).quiz.find(q=>q.type==='blank');same([q.answer,...q.distractors],choices);check();quizCovered.add(slug);}
same(quizCovered.size,46);for(const f of data.formulas)truth(quizCovered.has(f.slug.slice(5)),`Missing quiz ${f.slug}`);
// Additional adversarial probes supporting the manually reviewed T/F meanings:
// differentiable implies continuous, not conversely; stationary is not extrema;
// positive second derivative is not positive first derivative; area not signed.
truth(Math.abs(-.01)/-.01 !== Math.abs(.01)/.01);
close(derivative(x=>x**3,0),0);truth((-.1)**3<0 && .1**3>0);
close(second(x=>x*x,-1),2);close(derivative(x=>x*x,-1),-2);
close(simpson(x=>x,-1,1),0);close(simpson(Math.abs,-1,0)+simpson(Math.abs,0,1),1);
close(simpson(()=>Math.PI,0,2),2*Math.PI);truth(Math.PI*simpson(()=>1,0,2)**2!==2*Math.PI);
for(const eps of [.1,.01,.001])truth(simpson(x=>1/x**2,eps,1,4096)>1/eps-1-.1); // truncated singularity: grows
console.log(`18 derivative families x50 seeded points; 12 antiderivative families x30 intervals; ${derivativeProbes} finite-difference and ${integralProbes} Simpson evaluations.`);
console.log(`46/46 blank quizzes checked (35 numeric, 6 antiderivative-family, 5 semantic); ${assertions} assertions. All 46 T/F statements and theorem completeness require the recorded analytic review.`);
