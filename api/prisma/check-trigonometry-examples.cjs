/* eslint-disable */
// C4 authored mathematical fixtures; read-only, no dependencies or database.
// Every display answer is bound to independently written numerical calculations.
// Finite identity/solution sampling supplements the symbolic derivations; it is
// not a formal proof over R. Explicit pole exclusions avoid floating-point tan
// returning a huge finite number where the real function is undefined.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const data=JSON.parse(fs.readFileSync(path.join(__dirname,'data/formulas/trigonometry.json'),'utf8'));
const formulas=new Map(data.formulas.map(f=>[f.slug,f]));
const covered=new Set();
let assertions=0;
const P=Math.PI, sin=Math.sin, cos=Math.cos, tan=Math.tan, sqrt=Math.sqrt;
const cot=x=>cos(x)/sin(x), deg=x=>x*P/180, acot=x=>P/2-Math.atan(x);
const near=(a,b,t=1e-9)=>Math.abs(a-b)<=t*Math.max(1,Math.abs(a),Math.abs(b));
function ok(a,m){assertions++;assert.ok(a,m);}
function eq(a,b){ok(Number.isFinite(a)&&Number.isFinite(b)&&near(a,b),`${a} != ${b}`);}
const grid=Array.from({length:193},(_,i)=>(i-96)*P/24);
function v(slug,i,answer,check){const key=`trig-${slug}:${i}`;const f=formulas.get(`trig-${slug}`);assert.ok(f,slug);assert.equal(f.examples[i].answer,answer,`answer changed: ${key}`);assert.ok(!covered.has(key));covered.add(key);check();}
v('radians',0,'$5\\pi/6$',()=>eq(deg(150),5*P/6));
v('radians',1,'$315^\\circ$',()=>eq((7*P/4)*180/P,315));
v('arc',0,'$2\\pi$',()=>eq(6*(P/3),2*P));
v('arc',1,'$3\\pi$',()=>eq(4*deg(135),3*P));
v('unit-circle',0,'$\\sin\\theta=4/5,\\ \\operatorname{tg}\\theta=4/3$',()=>{const x=Math.atan2(4/5,3/5);eq(sin(x),4/5);eq(tan(x),4/3);});
v('unit-circle',1,'$\\sin\\theta=-1/2,\\ \\cos\\theta=-\\sqrt3/2$',()=>{const x=Math.atan2(-.5,-sqrt(3)/2);eq(sin(x),-.5);eq(cos(x),-sqrt(3)/2);});
v('quadrants',0,'$\\sin200^\\circ<0$',()=>ok(sin(deg(200))<0));
v('quadrants',1,'$\\cos300^\\circ>0,\\ \\operatorname{tg}300^\\circ<0$',()=>{ok(cos(deg(300))>0);ok(tan(deg(300))<0);});
v('values',0,'$1$',()=>eq(sin(P/6)+cos(P/3),1));
v('values',1,'$2$',()=>eq(tan(P/4)+cot(P/4),2));
v('pythagorean',0,'$4/5$',()=>eq(cos(Math.asin(3/5)),4/5));
v('pythagorean',1,'$12/13$',()=>{const x=2*P-Math.asin(5/13);ok(x>3*P/2&&x<2*P);eq(sin(x),-5/13);eq(cos(x),12/13);});
v('tan-cot',0,'$4/3$',()=>eq(cot(Math.atan(3/4)),4/3));
v('tan-cot',1,'$1$',()=>eq(tan(-P/3)*cot(-P/3),1));
v('secant',0,'$1/5$',()=>eq(cos(Math.atan(2))**2,1/5));
v('secant',1,'$4$',()=>eq(1+tan(2*P/3)**2,4));
v('cosecant',0,'$1/10$',()=>eq(sin(acot(-3))**2,1/10));
v('cosecant',1,'$4$',()=>eq(1+cot(P/6)**2,4));
v('parity',0,'$-1/2$',()=>eq(sin(-P/6),-.5));
v('parity',1,'$-1/2$',()=>eq(cos(-P/3)+tan(-P/4),-.5));
v('period',0,'$1/2$',()=>eq(sin(13*P/6),.5));
v('period',1,'$1$',()=>eq(tan(5*P/4),1));
v('reduction',0,'$-\\sqrt3/2$',()=>eq(cos(P-P/6),-sqrt(3)/2));
v('reduction',1,'$-\\sqrt3/2$',()=>eq(sin(3*P/2+P/6),-sqrt(3)/2));
const u=Math.asin(3/5),w=Math.asin(5/13);
v('sin-add',0,'$(\\sqrt6+\\sqrt2)/4$',()=>eq(sin(deg(75)),(sqrt(6)+sqrt(2))/4));
v('sin-add',1,'$56/65$',()=>eq(sin(u+w),56/65));
v('sin-difference',0,'$(\\sqrt6-\\sqrt2)/4$',()=>eq(sin(deg(15)),(sqrt(6)-sqrt(2))/4));
v('sin-difference',1,'$16/65$',()=>eq(sin(u-w),16/65));
v('cos-add',0,'$(\\sqrt6-\\sqrt2)/4$',()=>eq(cos(deg(75)),(sqrt(6)-sqrt(2))/4));
v('cos-add',1,'$33/65$',()=>eq(cos(u+w),33/65));
v('cos-difference',0,'$(\\sqrt6+\\sqrt2)/4$',()=>eq(cos(deg(15)),(sqrt(6)+sqrt(2))/4));
v('cos-difference',1,'$63/65$',()=>eq(cos(u-w),63/65));
v('tan-add',0,'$2+\\sqrt3$',()=>eq(tan(deg(75)),2+sqrt(3)));
v('tan-add',1,'$1$',()=>eq(tan(Math.atan(.5)+Math.atan(1/3)),1));
v('tan-difference',0,'$2-\\sqrt3$',()=>eq(tan(deg(15)),2-sqrt(3)));
v('tan-difference',1,'$1$',()=>eq(tan(Math.atan(2)-Math.atan(1/3)),1));
v('double-sin',0,'$-24/25$',()=>{const x=P-Math.asin(3/5);ok(x>P/2&&x<P);eq(sin(2*x),-24/25);});
v('double-sin',1,'$1/2$',()=>eq(2*sin(P/12)*cos(P/12),.5));
v('double-cos',0,'$7/25$',()=>eq(cos(2*Math.asin(3/5)),7/25));
v('double-cos',1,'$-7/9$',()=>eq(cos(2*Math.acos(1/3)),-7/9));
v('double-tan',0,'$3/4$',()=>eq(tan(2*Math.atan(1/3)),3/4));
v('double-tan',1,'$-4/3$',()=>eq(tan(2*Math.atan(2)),-4/3));
v('triple-sin',0,'$23/27$',()=>eq(sin(3*Math.asin(1/3)),23/27));
v('triple-sin',1,'$1/2$',()=>eq(3*sin(P/18)-4*sin(P/18)**3,.5));
v('triple-cos',0,'$-22/27$',()=>eq(cos(3*Math.acos(2/3)),-22/27));
v('triple-cos',1,'$1/2$',()=>eq(4*cos(P/9)**3-3*cos(P/9),.5));
v('half-sin',0,'$3/5$',()=>eq(sin(Math.acos(7/25)/2),3/5));
v('half-sin',1,'$-\\sqrt2/2$',()=>eq(sin((5*P/2)/2),-sqrt(2)/2));
v('half-cos',0,'$4/5$',()=>eq(cos(Math.acos(7/25)/2),4/5));
v('half-cos',1,'$-3/5$',()=>{const x=2*P-Math.acos(-7/25);ok(x>P&&x<2*P);eq(cos(x/2),-3/5);});
v('half-tan',0,'$1/3$',()=>eq(tan(Math.atan2(3/5,4/5)/2),1/3));
v('half-tan',1,'$-1/2$',()=>eq(tan((2*P+Math.atan2(-4/5,3/5))/2),-.5));
v('power-reduction',0,'$(2-\\sqrt3)/4$',()=>eq(sin(deg(15))**2,(2-sqrt(3))/4));
v('power-reduction',1,'$(2+\\sqrt2)/4$',()=>eq(cos(P/8)**2,(2+sqrt(2))/4));
v('sum-sines',0,'$\\sqrt6/2$',()=>eq(sin(deg(75))+sin(deg(15)),sqrt(6)/2));
v('sum-sines',1,'$2\\sin2x\\cos x$',()=>grid.forEach(x=>eq(sin(x)+sin(3*x),2*sin(2*x)*cos(x))));
v('difference-sines',0,'$\\sqrt2/2$',()=>eq(sin(deg(75))-sin(deg(15)),sqrt(2)/2));
v('difference-sines',1,'$2\\cos2x\\sin x$',()=>grid.forEach(x=>eq(sin(3*x)-sin(x),2*cos(2*x)*sin(x))));
v('sum-cosines',0,'$\\sqrt6/2$',()=>eq(cos(deg(15))+cos(deg(75)),sqrt(6)/2));
v('sum-cosines',1,'$2\\cos2x\\cos x$',()=>grid.forEach(x=>eq(cos(x)+cos(3*x),2*cos(2*x)*cos(x))));
v('difference-cosines',0,'$\\sqrt2/2$',()=>eq(cos(deg(15))-cos(deg(75)),sqrt(2)/2));
v('difference-cosines',1,'$-2\\sin2x\\sin x$',()=>grid.forEach(x=>eq(cos(3*x)-cos(x),-2*sin(2*x)*sin(x))));
v('product-sines',0,'$\\sqrt3/4$',()=>eq(sin(P/6)*sin(P/3),sqrt(3)/4));
v('product-sines',1,'$(\\cos2x-\\cos4x)/2$',()=>grid.forEach(x=>eq(sin(x)*sin(3*x),(cos(2*x)-cos(4*x))/2)));
v('product-cosines',0,'$\\sqrt3/4$',()=>eq(cos(P/6)*cos(P/3),sqrt(3)/4));
v('product-cosines',1,'$(\\cos2x+\\cos4x)/2$',()=>grid.forEach(x=>eq(cos(x)*cos(3*x),(cos(2*x)+cos(4*x))/2)));
v('product-sin-cos',0,'$1/4$',()=>eq(sin(P/6)*cos(P/3),1/4));
v('product-sin-cos',1,'$(\\sin4x+\\sin2x)/2$',()=>grid.forEach(x=>eq(sin(3*x)*cos(x),(sin(4*x)+sin(2*x))/2)));
v('universal',0,'$\\sin x=4/5,\\ \\cos x=3/5$',()=>{const x=2*Math.atan(.5);eq(sin(x),4/5);eq(cos(x),3/5);});
v('universal',1,'$\\sin x=-4/5,\\ \\cos x=-3/5$',()=>{const x=2*Math.atan(-2);eq(sin(x),-4/5);eq(cos(x),-3/5);});
v('harmonic',0,'$[-5,5]$',()=>{const f=x=>3*sin(x)+4*cos(x),phase=Math.atan2(4,3);grid.forEach(x=>{eq(f(x),5*sin(x+phase));ok(f(x)>=-5-1e-9&&f(x)<=5+1e-9);});eq(f(P/2-phase),5);eq(f(-P/2-phase),-5);});
v('harmonic',1,'$\\sqrt2\\sin(x+\\pi/4)$',()=>grid.forEach(x=>eq(sin(x)+cos(x),sqrt(2)*sin(x+P/4))));
v('inverse',0,'$\\pi/2$',()=>eq(Math.asin(.5)+Math.acos(.5),P/2));
v('inverse',1,'$-\\pi/4,\\ 3\\pi/4$',()=>{eq(Math.atan(-1),-P/4);eq(acot(-1),3*P/4);});
v('inverse-parity',0,'$-\\pi/3$',()=>eq(Math.asin(-sqrt(3)/2),-P/3));
v('inverse-parity',1,'$2\\pi/3$',()=>eq(Math.acos(-.5),2*P/3));
const lattice=(x,start,period)=>near((x-start)/period,Math.round((x-start)/period),1e-10);
function solution(actual,expected,extra=[]){for(const x of [...grid,...extra.flatMap(x=>[x-.001,x,x+.001])]){assertions++;assert.equal(actual(x),expected(x),`solution-set mismatch at ${x}`);}}
v('sine-equation',0,'$x=\\pi/6+2\\pi k\\ \\lor\\ x=5\\pi/6+2\\pi k,\\ k\\in\\mathbb Z$',()=>{const roots=[];for(let k=-4;k<=4;k++){roots.push(P/6+2*P*k,5*P/6+2*P*k);}roots.forEach(x=>eq(sin(x),.5));solution(x=>near(sin(x),.5,1e-10),x=>lattice(x,P/6,2*P)||lattice(x,5*P/6,2*P),roots);});
v('sine-equation',1,'$x=-\\pi/4+\\pi k,\\ k\\in\\mathbb Z$',()=>{const roots=Array.from({length:9},(_,i)=>-P/4+P*(i-4));roots.forEach(x=>eq(sin(2*x),-1));solution(x=>near(sin(2*x),-1,1e-10),x=>lattice(x,-P/4,P),roots);});
v('cosine-equation',0,'$x=\\pm2\\pi/3+2\\pi k,\\ k\\in\\mathbb Z$',()=>{const roots=[];for(let k=-4;k<=4;k++)roots.push(2*P/3+2*P*k,-2*P/3+2*P*k);roots.forEach(x=>eq(cos(x),-.5));solution(x=>near(cos(x),-.5,1e-10),x=>lattice(x,2*P/3,2*P)||lattice(x,-2*P/3,2*P),roots);});
v('cosine-equation',1,'$x=2\\pi k/3,\\ k\\in\\mathbb Z$',()=>{const roots=Array.from({length:13},(_,i)=>2*P*(i-6)/3);roots.forEach(x=>eq(cos(3*x),1));solution(x=>near(cos(3*x),1,1e-10),x=>lattice(x,0,2*P/3),roots);});
v('tangent-equation',0,'$x=\\pi/3+\\pi k,\\ k\\in\\mathbb Z$',()=>{const roots=Array.from({length:9},(_,i)=>P/3+P*(i-4));roots.forEach(x=>{ok(Math.abs(cos(x))>.1);eq(tan(x),sqrt(3));});solution(x=>Math.abs(cos(x))>1e-10&&near(tan(x),sqrt(3),1e-10),x=>lattice(x,P/3,P),roots);});
v('tangent-equation',1,'$x=-\\pi/8+\\pi k/2,\\ k\\in\\mathbb Z$',()=>{const roots=Array.from({length:17},(_,i)=>-P/8+P*(i-8)/2);roots.forEach(x=>{ok(Math.abs(cos(2*x))>.1);eq(tan(2*x),-1);});solution(x=>Math.abs(cos(2*x))>1e-10&&near(tan(2*x),-1,1e-10),x=>lattice(x,-P/8,P/2),roots);});
v('inequalities',0,'$x\\in[\\pi/6,5\\pi/6]$',()=>{const a=P/6,b=5*P/6;for(const x of [...grid,a-.001,a,a+.001,b-.001,b,b+.001,0,2*P]){const actual=x>=0&&x<2*P&&sin(x)>=.5-1e-10;const expected=x>=a-1e-10&&x<=b+1e-10;assertions++;assert.equal(actual,expected,`sine boundary ${x}`);}});
v('inequalities',1,'$x\\in\\bigcup_{k\\in\\mathbb Z}(\\pi/2+2\\pi k,3\\pi/2+2\\pi k)$',()=>{const expected=x=>{const t=((x%(2*P))+2*P)%(2*P);return t>P/2+1e-10&&t<3*P/2-1e-10;};solution(x=>cos(x)<-1e-10,expected,[P/2,3*P/2,-P/2]);});
v('sine-wave',0,'$3,\\ \\pi,\\ -\\pi/8$',()=>{const f=x=>-3*sin(2*x+P/4);grid.forEach(x=>{eq(f(x+P),f(x));eq(f(x),-3*sin(2*(x+P/8)));ok(Math.abs(f(x))<=3+1e-9);});eq(Math.abs(f(P/8)),3);eq(-P/4/2,-P/8);});
v('sine-wave',1,'$2,\\ 2\\pi/3$',()=>{const f=x=>2*sin(-3*x+P/2);grid.forEach(x=>{eq(f(x+2*P/3),f(x));ok(Math.abs(f(x))<=2+1e-9);});eq(f(0),2);});
v('sine-rule',0,'$6$',()=>eq(6/(2*sin(P/6)),6));
v('sine-rule',1,'$8\\sqrt3$',()=>{eq(8*sin(P/3)/sin(P/6),8*sqrt(3));eq(P/6+P/3,P/2);});
v('cosine-rule',0,'$\\sqrt{19}$',()=>eq(Math.hypot(3*cos(P/3)-5,3*sin(P/3)),sqrt(19)));
v('cosine-rule',1,'$\\pi/3$',()=>{const A=Math.acos((5**2+8**2-7**2)/(2*5*8));eq(A,P/3);eq(Math.hypot(5*cos(A)-8,5*sin(A)),7);});
v('triangle-area',0,'$12$',()=>eq(Math.abs(6*8*sin(P/6))/2,12));
v('triangle-area',1,'$35\\sqrt3/4$',()=>eq(Math.abs(5*7*sin(2*P/3))/2,35*sqrt(3)/4));
assert.equal(covered.size,92);
for(const f of data.formulas)f.examples.forEach((_,i)=>assert.ok(covered.has(`${f.slug}:${i}`),`unaudited example ${f.slug}:${i}`));
console.log(`${covered.size}/92 worked examples checked; ${assertions} numerical assertions before identity/quiz audits.`);
// Reproducible angle pairs. Each listed identity gets 50 valid pairs in
// [-4*pi,4*pi]. Common pole distances >0.12 intentionally avoid numerical
// ill-conditioning; excluded and limiting cases are tested separately below.
let seed=0xC4002026;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}
const norm=x=>((x%(2*P))+2*P)%(2*P);
const sgnSin=x=>norm(x)<P?1:-1;
const sgnCos=x=>norm(x)<P/2||norm(x)>3*P/2?1:-1;
const ids=[
 ['pythagorean',x=>sin(x)**2+cos(x)**2,()=>1],['tan-cot',x=>tan(x)*cot(x),()=>1],
 ['secant',x=>1+tan(x)**2,x=>1/cos(x)**2],['cosecant',x=>1+cot(x)**2,x=>1/sin(x)**2],
 ['odd-sine',x=>sin(-x),x=>-sin(x)],['even-cosine',x=>cos(-x),x=>cos(x)],['odd-tangent',x=>tan(-x),x=>-tan(x)],['odd-cotangent',x=>cot(-x),x=>-cot(x)],
 ['period-sine',x=>sin(x+2*P),x=>sin(x)],['period-cosine',x=>cos(x+2*P),x=>cos(x)],['period-tangent',x=>tan(x+P),x=>tan(x)],['period-cotangent',x=>cot(x+P),x=>cot(x)],
 ['reduce-sine-complement',x=>sin(P/2-x),x=>cos(x)],['reduce-cosine-complement',x=>cos(P/2-x),x=>sin(x)],
 ['reduce-sine-supplement',x=>sin(P-x),x=>sin(x)],['reduce-cosine-supplement',x=>cos(P-x),x=>-cos(x)],
 ['reduce-three-half-sine',x=>sin(3*P/2+x),x=>-cos(x)],['reduce-three-half-cosine',x=>cos(3*P/2+x),x=>sin(x)],['reduce-tangent',x=>tan(P/2-x),x=>cot(x)],
 ['sin-add',(x,y)=>sin(x+y),(x,y)=>sin(x)*cos(y)+cos(x)*sin(y)],['sin-difference',(x,y)=>sin(x-y),(x,y)=>sin(x)*cos(y)-cos(x)*sin(y)],
 ['cos-add',(x,y)=>cos(x+y),(x,y)=>cos(x)*cos(y)-sin(x)*sin(y)],['cos-difference',(x,y)=>cos(x-y),(x,y)=>cos(x)*cos(y)+sin(x)*sin(y)],
 ['tan-add',(x,y)=>tan(x+y),(x,y)=>(tan(x)+tan(y))/(1-tan(x)*tan(y))],['tan-difference',(x,y)=>tan(x-y),(x,y)=>(tan(x)-tan(y))/(1+tan(x)*tan(y))],
 ['double-sine',x=>sin(2*x),x=>2*sin(x)*cos(x)],['double-cosine-mixed',x=>cos(2*x),x=>cos(x)**2-sin(x)**2],['double-cosine-cos',x=>cos(2*x),x=>2*cos(x)**2-1],['double-cosine-sin',x=>cos(2*x),x=>1-2*sin(x)**2],['double-tangent',x=>tan(2*x),x=>2*tan(x)/(1-tan(x)**2)],
 ['triple-sine',x=>sin(3*x),x=>3*sin(x)-4*sin(x)**3],['triple-cosine',x=>cos(3*x),x=>4*cos(x)**3-3*cos(x)],
 ['half-sine-signed',x=>sin(x/2),x=>sgnSin(x/2)*sqrt((1-cos(x))/2)],['half-cosine-signed',x=>cos(x/2),x=>sgnCos(x/2)*sqrt((1+cos(x))/2)],
 ['half-tangent',x=>tan(x/2),x=>sin(x)/(1+cos(x))],['half-tangent-alternative',x=>tan(x/2),x=>(1-cos(x))/sin(x)],
 ['reduce-sine-square',x=>sin(x)**2,x=>(1-cos(2*x))/2],['reduce-cosine-square',x=>cos(x)**2,x=>(1+cos(2*x))/2],
 ['sum-sines',(x,y)=>sin(x)+sin(y),(x,y)=>2*sin((x+y)/2)*cos((x-y)/2)],['difference-sines',(x,y)=>sin(x)-sin(y),(x,y)=>2*cos((x+y)/2)*sin((x-y)/2)],
 ['sum-cosines',(x,y)=>cos(x)+cos(y),(x,y)=>2*cos((x+y)/2)*cos((x-y)/2)],['difference-cosines',(x,y)=>cos(x)-cos(y),(x,y)=>-2*sin((x+y)/2)*sin((x-y)/2)],
 ['product-sines',(x,y)=>sin(x)*sin(y),(x,y)=>(cos(x-y)-cos(x+y))/2],['product-cosines',(x,y)=>cos(x)*cos(y),(x,y)=>(cos(x-y)+cos(x+y))/2],['product-sin-cos',(x,y)=>sin(x)*cos(y),(x,y)=>(sin(x+y)+sin(x-y))/2],
 ['universal-sine',x=>sin(x),x=>2*tan(x/2)/(1+tan(x/2)**2)],['universal-cosine',x=>cos(x),x=>(1-tan(x/2)**2)/(1+tan(x/2)**2)],['universal-tangent',x=>tan(x),x=>2*tan(x/2)/(1-tan(x/2)**2)],
];
const counts=new Map(ids.map(([name])=>[name,0]));
for(let i=0;i<50;i++){
 let x,y;
 do{x=(random()*8-4)*P;y=(random()*8-4)*P;}while([sin(x),cos(x),sin(y),cos(y),cos(x+y),cos(x-y),cos(2*x),sin(x/2),cos(x/2)].some(z=>Math.abs(z)<.12));
 for(const [name,left,right] of ids){eq(left(x,y),right(x,y));counts.set(name,counts.get(name)+1);}
 const z=2*random()-1,p=20*random()-10;
 for(const [name,left,right] of [
  ['inverse-sine',sin(Math.asin(z)),z],['inverse-cosine',cos(Math.acos(z)),z],['inverse-tangent',tan(Math.atan(p)),p],['inverse-cotangent',cot(acot(p)),p],
  ['arcsine-negative',Math.asin(-z),-Math.asin(z)],['arccosine-negative',Math.acos(-z),P-Math.acos(z)],['arctangent-negative',Math.atan(-p),-Math.atan(p)],['arccotangent-negative',acot(-p),P-acot(p)]
 ]){eq(left,right);counts.set(name,(counts.get(name)||0)+1);}
 const aa=10*random()-5,bb=10*random()-5,R=Math.hypot(aa,bb),phase=Math.atan2(bb,aa);
 eq(aa*sin(x)+bb*cos(x),R*sin(x+phase));counts.set('harmonic',(counts.get('harmonic')||0)+1);
 const A=.15+1.2*random(),B=(P-A)*(.1+.8*random()),C=P-A-B,r=.5+5*random();
 const b=2*r*sin(B),c=2*r*sin(C),a=Math.hypot(b*cos(A)-c,b*sin(A));
 eq(a/sin(A),2*r);eq(b/sin(B),2*r);eq(c/sin(C),2*r);counts.set('sine-rule',(counts.get('sine-rule')||0)+1);
 eq(a*a,b*b+c*c-2*b*c*cos(A));counts.set('cosine-rule',(counts.get('cosine-rule')||0)+1);
 eq(Math.abs(c*b*sin(A))/2,a*b*sin(C)/2);counts.set('triangle-area',(counts.get('triangle-area')||0)+1);
 const amplitude=.5+4*random(),omega=(random()<.5?-1:1)*(.5+4*random()),phi=4*random()-2,T=2*P/Math.abs(omega);
 eq(amplitude*sin(omega*(x+T)+phi),amplitude*sin(omega*x+phi));counts.set('sine-wave-period',(counts.get('sine-wave-period')||0)+1);
}
for(const [name,count] of counts)assert.equal(count,50,`insufficient checks for ${name}`);
// Complete special-angle table and explicit undefined values.
const table=[[0,0,1,0,null],[P/6,.5,sqrt(3)/2,1/sqrt(3),sqrt(3)],[P/4,sqrt(2)/2,sqrt(2)/2,1,1],[P/3,sqrt(3)/2,.5,sqrt(3),1/sqrt(3)],[P/2,1,0,null,0],[P,0,-1,0,null]];
for(const [x,s,c,t,k] of table){eq(sin(x),s);eq(cos(x),c);if(t===null)ok(Math.abs(cos(x))<1e-12);else eq(tan(x),t);if(k===null)ok(Math.abs(sin(x))<1e-12);else eq(cot(x),k);}
for(const x of [-3*P,-P,P,3*P])ok(Math.abs(cos(x/2))<1e-12,'universal-substitution pole');
// All blank quiz choices are evaluated, including mathematical equivalence.
// Tiny expression parser handles only arithmetic, sqrt, pi and parentheses;
// it never evals arbitrary JSON content.
function number(s){
 const str=s.replace(/\\sqrt/g,'S').replace(/\\pi/g,'P').replace(/[{}]/g,c=>c==='{'?'(':')').replace(/\s/g,'');
 const tokens=str.match(/\d+(?:\.\d+)?|[PS()+\-*/]/g)||[];assert.equal(tokens.join(''),str,`unsupported expression ${s}`);let i=0;
 function primary(){const t=tokens[i++];if(t==='-')return-primary();if(t==='+')return primary();if(t==='P')return P;if(t==='S')return sqrt(primary());if(t==='('){const n=sum();assert.equal(tokens[i++],')');return n;}assert.ok(t&&/^\d/.test(t),s);return Number(t);}
 function product(){let n=primary();while(i<tokens.length){const t=tokens[i];if(t==='*'||t==='/'){i++;const r=primary();n=t==='*'?n*r:n/r;}else if(t==='P'||t==='S'||t==='('||/^\d/.test(t)){n*=primary();}else break;}return n;}
 function sum(){let n=product();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],r=product();n=op==='+'?n+r:n-r;}return n;}
 const answer=sum();assert.equal(i,tokens.length,s);return answer;
}
let quizChecks=0;
function unique(slug,valid){const q=formulas.get(`trig-${slug}`).quiz[0];assert.deepEqual([q.answer,...q.distractors].filter(valid),[q.answer],`incorrect/nonunique blank ${slug}`);quizChecks++;}
for(const [slug,value] of [
 ['radians',deg(60)],['arc',3*2],['unit-circle',1],['values',cos(P/6)],['pythagorean',sqrt(1-(4/5)**2)],['tan-cot',-1/2],['secant',1/(1+9)],['cosecant',1/(1+4)],
 ['parity',cos(-P/4)],['period',cos(7*P/3)],['reduction',sin(P/2-P/3)],['sin-add',sin(P/4+P/6)],['sin-difference',sin(P/3-P/6)],['cos-add',cos(P/3+P/6)],['cos-difference',cos(0)],
 ['tan-add',tan(Math.atan(1)+Math.atan(.5))],['tan-difference',tan(Math.atan(1)-Math.atan(.5))],['double-sin',2*(3/5)*(4/5)],['double-cos',cos(2*Math.acos(.5))],['double-tan',tan(2*Math.atan(.5))],
 ['triple-sin',sin(3*Math.asin(.5))],['triple-cos',cos(3*Math.acos(.5))],['half-sin',sin(P/12)],['half-cos',cos(P/8)],['half-tan',tan(P/6)],['power-reduction',sin(P/4)**2],
 ['sum-sines',sin(P/6)+sin(5*P/6)],['difference-sines',sin(5*P/6)-sin(P/6)],['sum-cosines',cos(P/3)+cos(2*P/3)],['difference-cosines',cos(P/3)-cos(2*P/3)],
 ['product-sines',sin(P/4)**2],['product-cosines',cos(P/3)**2],['product-sin-cos',sin(P/4)*cos(P/4)],['universal',sin(2*Math.atan(1/3))],['inverse',Math.acos(0)],['inverse-parity',Math.acos(-sqrt(2)/2)],
 ['sine-wave',2*P/5],['sine-rule',2*5*sin(P/6)],['cosine-rule',Math.hypot(3,4)],['triangle-area',3*4/2]
])unique(slug,s=>near(number(s),value));
unique('quadrants',s=>s==='<0'&&tan(2*P/3)<0);
function finiteSet(s){assert.ok(s.startsWith('\\{')&&s.endsWith('\\}'));return s.slice(2,-2).split(',').map(number).sort((a,b)=>a-b);}
function sameSet(a,b){return a.length===b.length&&a.every((n,i)=>near(n,b[i]));}
unique('sine-equation',s=>sameSet(finiteSet(s),[0,P]));
unique('cosine-equation',s=>sameSet(finiteSet(s),[P/2,3*P/2]));
unique('tangent-equation',s=>s==='\\varnothing'?false:sameSet(finiteSet(s),[0]));
function interval(s){const [a,b]=s.slice(1,-1).split(',').map(number);return {a,b,left:s[0]==='[',right:s.at(-1)===']'};}
unique('harmonic',s=>{const z=interval(s);return near(z.a,-13)&&near(z.b,13)&&z.left&&z.right;});
unique('inequalities',s=>{const z=interval(s);return near(z.a,0)&&near(z.b,P)&&!z.left&&!z.right;});
for(const f of data.formulas)assert.ok(!/\\(?:Longrightarrow|Rightarrow)/.test(f.quiz[0].prompt),`implication blank ${f.slug}`);
assert.equal(quizChecks,46);
console.log(`${counts.size} identities/formula families each checked at 50 seeded valid angle cases; 6 complete table rows and substitution poles checked.`);
console.log(`${quizChecks}/46 blank quizzes have exactly one numerically/semantically valid choice; ${assertions} total numerical assertions. True/false wording and global symbolic completeness still require manual review.`);
