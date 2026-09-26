/* eslint-disable */
// Read-only, dependency-free numerical checks for C3's authored examples.
// The mathematical fixtures are authored independently from the JSON. Each
// displayed answer is checked against its fixture; changed answers fail closed.
// Set/range/monotonicity sampling and boundary probes are not formal proofs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname,'data/formulas/functions-exp-log.json'),'utf8'));
const formulas = new Map(data.formulas.map(f=>[f.slug,f]));
const covered = new Set();
let assertions=0, identityAssertions=0;
const ok = (condition,message) => {assertions++;assert.ok(condition,message);};
const near = (a,b,tol=1e-9) => Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
const eq = (a,b) => ok(Number.isFinite(a)&&Number.isFinite(b)&&near(a,b),`${a} != ${b}`);
const log = (a,x) => Math.log(x)/Math.log(a);
const grid = (boundaries=[]) => [...Array.from({length:321},(_,i)=>(i-160)/8),...boundaries.flatMap(x=>[x-1e-6,x,x+1e-6])];
function sets(actual,expected,boundaries=[]) {for(const x of grid(boundaries)){assertions++;assert.equal(Boolean(actual(x)),Boolean(expected(x)),`set mismatch at ${x}`);}}
function v(slug,index,answer,check) {
 const key=`fn-${slug}:${index}`;
 const f=formulas.get(`fn-${slug}`); assert.ok(f,slug);
 assert.equal(f.examples[index].answer,answer,`displayed answer changed: ${key}`);
 assert.ok(!covered.has(key)); covered.add(key); check();
}
function polynomialRoots(a,b,c) {const d=b*b-4*a*c;return d<0?[]:d===0?[-b/(2*a)]:[(-b-Math.sqrt(d))/(2*a),(-b+Math.sqrt(d))/(2*a)];}
function same(a,b) {const aa=[...new Set(a)].sort((x,y)=>x-y),bb=[...new Set(b)].sort((x,y)=>x-y);ok(aa.length===bb.length,`${aa} vs ${bb}`);aa.forEach((x,i)=>eq(x,bb[i]));}
function pairs(check) {for(let i=-16;i<=16;i++)for(let j=i+1;j<=16;j++)check(i/4,j/4);}
v('domain',0,'$D_f=(-\\infty,1)\\cup(1,5]$',()=>sets(x=>5-x>=0&&x!==1,x=>x<=5&&x!==1,[1,5]));
v('domain',1,'$D_f=(2,5)\\cup(5,\\infty)$',()=>sets(x=>x-2>0&&x-5!==0,x=>x>2&&x!==5,[2,5]));
v('range',0,'$E_f=[2,\\infty)$',()=>{grid().forEach(x=>ok(x*x+2>=2));grid([2]).filter(y=>y>=2).forEach(y=>eq(Math.sqrt(y-2)**2+2,y));eq(0**2+2,2);});
v('range',1,'$E_f=\\mathbb R\\setminus\\{3\\}$',()=>{grid([1]).filter(x=>x!==1).forEach(x=>ok(1/(x-1)+3!==3));grid([3]).filter(y=>y!==3).forEach(y=>{const x=1+1/(y-3);ok(x!==1);eq(1/(x-1)+3,y);});});
v('even',0,'Тэгш функц',()=>{const f=x=>x**4-3*x*x+1;grid().forEach(x=>eq(f(-x),f(x)));eq(f(-2),5);eq(f(2),5);});
v('even',1,'Тэгш функц',()=>{sets(x=>4-x*x>=0,x=>x>=-2&&x<=2,[-2,2]);grid().filter(x=>Math.abs(x)<=2).forEach(x=>eq(Math.sqrt(4-x*x),Math.sqrt(4-(-x)**2)));eq(Math.sqrt(4-1),Math.sqrt(3));});
v('odd',0,'Сондгой функц',()=>{const f=x=>x**3-2*x;grid().forEach(x=>eq(f(-x),-f(x)));eq(f(3),21);eq(f(-3),-21);});
v('odd',1,'Тэгш ч биш, сондгой ч биш',()=>{const f=x=>x+1;eq(f(1),2);eq(f(-1),0);ok(f(-1)!==f(1));ok(f(-1)!==-f(1));});
v('periodic',0,'$T=2$ үе мөн',()=>grid().forEach(x=>eq(Math.sin(Math.PI*(x+2)),Math.sin(Math.PI*x))));
v('periodic',1,'$T=3$ үе мөн',()=>grid().forEach(x=>eq(Math.cos(2*Math.PI*(x+3)/3),Math.cos(2*Math.PI*x/3))));
v('monotonic',0,'$\\mathbb R$ дээр өсөх',()=>pairs((x,y)=>ok(3*y-2>3*x-2)));
v('monotonic',1,'$\\mathbb R$ дээр буурах',()=>pairs((x,y)=>ok(.5**y<.5**x)));
v('translation',0,'$(4,-1)$',()=>{eq(1+3,4);eq(1-2,-1);eq((4-3)**2-2,-1);});
v('translation',1,'$D_g=[-2,\\infty),\\ E_g=[4,\\infty)$',()=>{sets(x=>x+2>=0,x=>x>=-2,[-2]);grid([-2]).filter(x=>x>=-2).forEach(x=>ok(Math.sqrt(x+2)+4>=4));grid([4]).filter(y=>y>=4).forEach(y=>{const x=(y-4)**2-2;ok(x>=-2);eq(Math.sqrt(x+2)+4,y);});});
v('vertical-scale',0,'$E_g=(-\\infty,0]$',()=>{grid().forEach(x=>ok(-2*x*x<=0));grid([0]).filter(y=>y<=0).forEach(y=>eq(-2*Math.sqrt(-y/2)**2,y));});
v('vertical-scale',1,'$6$',()=>eq(3*Math.sqrt(4),6));
v('horizontal-scale',0,'$(1/4,1)$',()=>{eq(1/4,.25);eq(Math.sqrt(4*.25),1);});
v('horizontal-scale',1,'$D_g=(-\\infty,0]$',()=>sets(x=>-2*x>=0,x=>x<=0,[0]));
v('reflections',0,'$g(x)=-2x-1$',()=>grid().forEach(x=>eq(-(2*x+1),-2*x-1)));
v('reflections',1,'$h(x)=(x+1)^2$',()=>grid().forEach(x=>eq((-x-1)**2,(x+1)**2)));
v('absolute-output',0,'$x\\in\\{-2,2\\}$',()=>{same(polynomialRoots(1,0,-4),[-2,2]);[-2,2].forEach(x=>eq(Math.abs(x*x-4),0));});
v('absolute-output',1,'$g(x)=\\begin{cases}-2x-1,&x<-1/2\\\\2x+1,&x\\ge-1/2\\end{cases}$',()=>grid([-.5]).forEach(x=>eq(Math.abs(2*x+1),x<-.5?-2*x-1:2*x+1)));
v('absolute-input',0,'$g(x)=|x|-2,\\ g(-3)=1$',()=>{grid().forEach(x=>eq(Math.abs(x)-2,x>=0?x-2:-x-2));eq(Math.abs(-3)-2,1);});
v('absolute-input',1,'$D_g=(-\\infty,-1]\\cup[1,\\infty)$',()=>sets(x=>Math.abs(x)-1>=0,x=>x<=-1||x>=1,[-1,1]));
v('inverse',0,'$f^{-1}(x)=(x+3)/2,\\ D_{f^{-1}}=\\mathbb R$',()=>grid().forEach(x=>{eq(((2*x-3)+3)/2,x);eq(2*((x+3)/2)-3,x);}));
v('inverse',1,'$f^{-1}(x)=-\\sqrt x,\\ D_{f^{-1}}=[0,\\infty)$',()=>{grid().filter(x=>x<=0).forEach(x=>eq(-Math.sqrt(x*x),x));grid().filter(y=>y>=0).forEach(y=>{ok(-Math.sqrt(y)<=0);eq((-Math.sqrt(y))**2,y);});sets(y=>y>=0,y=>Number.isFinite(-Math.sqrt(y)),[0]);});
v('composition',0,'$(f\\circ g)(x)=\\sqrt{2-x},\\ D=(-\\infty,2]$',()=>{sets(x=>(3-x)-1>=0,x=>x<=2,[2]);grid().filter(x=>x<=2).forEach(x=>eq(Math.sqrt((3-x)-1),Math.sqrt(2-x)));});
v('composition',1,'$(f\\circ g)(x)=1/(x^2-4),\\ D=\\mathbb R\\setminus\\{-2,2\\}$',()=>{sets(x=>x*x-4!==0,x=>x!==-2&&x!==2,[-2,2]);grid().filter(x=>Math.abs(x)!==2).forEach(x=>eq(1/(x*x-4),1/(x**2-4)));});
v('linear',0,'$y=2x+1$',()=>{eq((9-3)/(4-1),2);eq(2*1+1,3);eq(2*4+1,9);});
v('linear',1,'$y=-3x+10$',()=>{eq(-3*2+10,4);eq((-3*4+10)-(-3*3+10),-3);ok(10!==7);});
v('quadratic-vertex',0,'$(x_0,y_0)=(2,-3)$',()=>{grid().forEach(x=>eq(2*x*x-8*x+5,2*(x-2)**2-3));eq(2*2**2-8*2+5,-3);});
v('quadratic-vertex',1,'$(x_0,y_0)=(-3,10),\\ x=-3$',()=>{const f=x=>-x*x-6*x+1;eq(f(-3),10);grid().forEach(t=>eq(f(-3-t),f(-3+t)));});
v('quadratic-range',0,'$E_f=(-\\infty,8]$',()=>{grid().forEach(x=>ok(-2*(x-1)**2+8<=8));grid([8]).filter(y=>y<=8).forEach(y=>eq(-2*(Math.sqrt((8-y)/2))**2+8,y));});
v('quadratic-range',1,'$E_f=[5,26]$',()=>{grid([0,3]).filter(x=>x>=0&&x<=3).forEach(x=>ok((x+2)**2+1>=5&&(x+2)**2+1<=26));[5,5.000001,8,16,25.999999,26].forEach(y=>{const x=Math.sqrt(y-1)-2;ok(x>=0&&x<=3);eq((x+2)**2+1,y);});eq((0+2)**2+1,5);eq((3+2)**2+1,26);});
v('reciprocal',0,'$-2$',()=>eq(6/-3,-2));
v('reciprocal',1,'$(-2,2)$',()=>eq(-4/-2,2));
v('rational-asymptotes',0,'$x=1,\\ y=2$',()=>{grid([1]).filter(x=>x!==1).forEach(x=>eq((2*x+3)/(x-1),2+5/(x-1)));ok(Math.abs((2*1e9+3)/(1e9-1)-2)<1e-7);ok(Math.abs((2*(1+1e-6)+3)/(1e-6))>1e6);});
v('rational-asymptotes',1,'$x=-2,\\ y=3/2$',()=>{grid([-2]).filter(x=>x!==-2).forEach(x=>eq((3*x-1)/(2*x+4),1.5-7/(2*(x+2))));ok(Math.abs((3*1e9-1)/(2*1e9+4)-1.5)<1e-7);ok(Math.abs((3*(-2+1e-6)-1)/(2e-6))>1e6);});
v('exp-properties',0,'$f(-3)=1/8,\\ f(0)=1$',()=>{eq(2**-3,1/8);eq(2**0,1);});
v('exp-properties',1,'$f(-1)=4$; буурах',()=>{eq(.25**-1,4);pairs((x,y)=>ok(.25**x>.25**y));});
v('exp-equation',0,'$x=5$',()=>{eq(2*5-1,5+4);eq(3**(2*5-1),3**(5+4));});
v('exp-equation',1,'$x\\in\\{0,3\\}$',()=>{same(polynomialRoots(1,-3,0),[0,3]);[0,3].forEach(x=>eq(.5**(x*x),.5**(3*x)));});
v('exp-inequality',0,'$x<3$',()=>sets(x=>2**(x+1)<16,x=>x<3,[3]));
v('exp-inequality',1,'$x\\le-1/2$',()=>sets(x=>(1/3)**(2*x-1)>=9,x=>x<=-.5,[-.5]));
v('same-base',0,'$x=5/2$',()=>eq(4**(2.5-1),8));
v('same-base',1,'$x=3$',()=>eq(9**3,27**(3-1)));
v('exp-substitution',0,'$x\\in\\{0,2\\}$',()=>{const ts=polynomialRoots(1,-5,4).filter(t=>t>0);const xs=ts.map(t=>log(2,t));same(xs,[0,2]);xs.forEach(x=>eq(4**x-5*2**x+4,0));});
v('exp-substitution',1,'$x=0$',()=>{const ts=polynomialRoots(1,2,-3).filter(t=>t>0);const xs=ts.map(t=>log(3,t));same(xs,[0]);xs.forEach(x=>eq(9**x+2*3**x-3,0));});
v('log-definition',0,'$5$',()=>{eq(log(2,32),5);eq(2**5,32);});
v('log-definition',1,'$-2$',()=>{eq(log(1/3,9),-2);eq((1/3)**-2,9);});
v('log-product',0,'$5$',()=>eq(log(2,8)+log(2,4),5));
v('log-product',1,'$5/2$',()=>eq(log(3,9*Math.sqrt(3)),2.5));
v('log-quotient',0,'$2$',()=>eq(log(5,125)-log(5,5),2));
v('log-quotient',1,'$-2$',()=>eq(log(2,3/12),-2));
v('log-power',0,'$2$',()=>eq(log(3,Math.sqrt(81)),2));
v('log-power',1,'$4$',()=>eq(log(2,(-4)**2),4));
v('log-root',0,'$5/2$',()=>eq(log(2,Math.sqrt(32)),2.5));
v('log-root',1,'$4/3$',()=>eq(log(3,Math.cbrt(81)),4/3));
v('change-base',0,'$3/2$',()=>eq(log(4,8),1.5));
v('change-base',1,'$1/2$',()=>eq(log(9,3),.5));
v('log-reciprocal',0,'$1$',()=>eq(log(2,3)*log(3,2),1));
v('log-reciprocal',1,'$1$',()=>eq(log(4,16)*log(16,4),1));
v('base-power',0,'$4/3$',()=>eq(log(8,16),4/3));
v('base-power',1,'$-3/2$',()=>eq(log(1/9,27),-1.5));
v('exchange-powers',0,'$3$',()=>eq(2**log(2,3),3));
v('exchange-powers',1,'$9$',()=>eq(4**log(2,3),9));
v('lg-ln',0,'$-3$',()=>eq(Math.log10(.001),-3));
v('lg-ln',1,'$5/2$',()=>eq(Math.log(Math.E**2*Math.sqrt(Math.E)),2.5));
v('log-equation',0,'$x=9$',()=>{ok(9-1>0);eq(log(2,9-1),3);});
v('log-equation',1,'$x=5$',()=>{const xs=polynomialRoots(1,-4,-5).filter(x=>x-1>0&&x-3>0);same(xs,[5]);eq(log(2,4)+log(2,2),3);ok(Number.isNaN(log(2,-1-1)));});
v('log-inequality',0,'$x\\in(1,5)$',()=>sets(x=>x-1>0&&log(2,x-1)<2,x=>x>1&&x<5,[1,5]));
v('log-inequality',1,'$x\\in(-1,3]$',()=>sets(x=>x+1>0&&log(.5,x+1)>=-2,x=>x>-1&&x<=3,[-1,3]));
v('log-properties',0,'$-2$',()=>eq(log(2,.25),-2));
v('log-properties',1,'$(1/9,2)$',()=>eq(log(1/3,1/9),2));
v('comparison',0,'$\\log_3 10>2$',()=>{ok(log(3,10)>2);ok(3**2<10);});
v('comparison',1,'$\\log_{1/2}3<-1$',()=>{ok(log(.5,3)<-1);eq(.5**-1,2);});
v('e-number',0,'$9/4$',()=>eq((1+1/2)**2,9/4));
v('e-number',1,'$7$',()=>eq(Math.exp(Math.log(7)),7));
v('base-comparison',0,'$\\log_2 7>\\log_5 7$',()=>ok(log(2,7)>log(5,7)));
v('base-comparison',1,'$2^{-3}>3^{-3}$',()=>ok(2**-3>3**-3));
assert.equal(covered.size,80);
for(const f of data.formulas)f.examples.forEach((_,i)=>assert.ok(covered.has(`${f.slug}:${i}`),`unaudited ${f.slug}:${i}`));
// Reproducible pseudorandom identity audit. Bases on both sides of 1 are sampled
// in [0.25,0.75] or [1.5,5.5]; arguments in [0.2,10.2]. Farther extremes and
// floating-point singularities near base=1 are intentionally outside this audit.
let state=0xC3002026;
function random(){state=(Math.imul(state,1664525)+1013904223)>>>0;return state/2**32;}
function base(){return random()<.5?.25+random()*.5:1.5+random()*4;}
const identityNames=new Set();
function identity(name,lhs,rhs){identityNames.add(name);identityAssertions++;eq(lhs,rhs);}
for(let i=0;i<200;i++){
 const a=base(),b=.2+10*random(),c=base(),u=.2+10*random(),v=.2+10*random(),r=-3+6*random(),k=(random()<.5?-1:1)*(.5+2.5*random()),n=2+Math.floor(7*random());
 identity('exp-log-inverse',a**log(a,b),b);
 identity('log-exp-inverse',log(a,a**r),r);
 identity('log-one',log(a,1),0);
 identity('log-base',log(a,a),1);
 identity('product',log(a,u*v),log(a,u)+log(a,v));
 identity('quotient',log(a,u/v),log(a,u)-log(a,v));
 identity('power',log(a,b**r),r*log(a,b));
 identity('even-power-absolute-value',log(a,(-b)**2),2*log(a,Math.abs(-b)));
 identity('root',log(a,b**(1/n)),log(a,b)/n);
 identity('change-base',log(a,b),log(c,b)/log(c,a));
 identity('reciprocal',log(a,c)*log(c,a),1);
 identity('base-power',log(a**k,b),log(a,b)/k);
 identity('exchange-powers',a**log(c,b),b**log(c,a));
 identity('lg-ln',Math.log10(b),Math.log(b)/Math.log(10));
 identity('natural-inverse',Math.exp(Math.log(b)),b);
}
console.log(`${covered.size}/80 worked examples; ${identityAssertions} seeded checks across ${identityNames.size} logarithm identities; ${assertions} total numerical assertions.`);
