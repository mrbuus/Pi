// ⚠️ АВТОМАТААР ҮҮСГЭСЭН — docs/v2/hero/port_home.py --demo. Гараар бүү зас, мокапаа засаад дахин ажиллуул.
/* eslint-disable */
// @ts-nocheck
import katex from 'katex';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';

export function mountThree(root) {
  let dead = false;
  const offs = [];
  const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); offs.push(() => t.removeEventListener(ev, f, o)); };
const $=s=>root.querySelector(s);
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)), range=(p,a,b)=>clamp((p-a)/(b-a));
const ease=t=>1-Math.pow(1-t,3), easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2, lerp=(a,b,t)=>a+(b-a)*t;
const tex=(el,s)=>{ if(katex) katex.render(s,el,{throwOnError:false}); else el.textContent=s; };
const MOBILE=matchMedia('(max-width: 899px)').matches;
const DPR=Math.min(devicePixelRatio,MOBILE?1.75:2);
const ACC=0xB8CBEF, ACC2=0x8EABE4, SOFT=0xE6ECF8;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const D2R=Math.PI/180;
const TAN=Math.tan(18*D2R);
function kf(p,keys){ if(p<=keys[0][0]) return keys[0][1]; for(let i=1;i<keys.length;i++){ if(p<=keys[i][0]){ const [a,va]=keys[i-1],[b,vb]=keys[i]; return lerp(va,vb,easeIO((p-a)/(b-a))); } } return keys[keys.length-1][1]; }
function fit(r,cam,el){ const w=el.clientWidth,h=el.clientHeight; if(!w||!h) return; if(r.domElement.width!==Math.floor(w*DPR)||r.domElement.height!==Math.floor(h*DPR)){ r.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); } }
const dotTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=64; const g=c.getContext('2d'); const gr=g.createRadialGradient(32,32,0,32,32,32); gr.addColorStop(0,'rgba(255,255,255,1)'); gr.addColorStop(.45,'rgba(255,255,255,.9)'); gr.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle=gr; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c); })();

/* =========================================================
   Сурах бичгийн 8 биет: оройн нэр, харагдахгүй ирмэг тасархай,
   тодотгол (диагональ, радиус, өндөр), хэмжээс, тэгш өнцөг
   ========================================================= */
const EM=0x99B7F5, EDGE=0xFFFFFF, DIMC=0x8D9AB8;
const TAN12=Math.tan(12*D2R);
const CUBEF=[['A','B','C','D'],['A_1','B_1','C_1','D_1'],['A','B','B_1','A_1'],['B','C','C_1','B_1'],['C','D','D_1','C_1'],['D','A','A_1','D_1']];
const SOLIDS=[
  {id:'cube',n:'Куб',u:'a',L:1.6,fx:['V=a^3','S=6a^2','d=a\\sqrt{3}'],
   poly:{v:{A:[-.8,-.8,.8],B:[.8,-.8,.8],C:[.8,-.8,-.8],D:[-.8,-.8,-.8],A_1:[-.8,.8,.8],B_1:[.8,.8,.8],C_1:[.8,.8,-.8],D_1:[-.8,.8,-.8]},f:CUBEF},
   ann:[{t:'em',a:'A',b:'C_1',lab:'d'},{t:'aux',a:'A',b:'C',lab:'a\\sqrt{2}'},{t:'right',at:'C',a:'A',b:'C_1'},{t:'dim',a:'A',b:'B',lab:'a'}]},
  {id:'box',n:'Параллелепипед',u:'a',L:2.0,fx:['V=abc','S=2(ab+bc+ac)','d=\\sqrt{a^2+b^2+c^2}'],
   poly:{v:{A:[-1,-.65,.55],B:[1,-.65,.55],C:[1,-.65,-.55],D:[-1,-.65,-.55],A_1:[-1,.65,.55],B_1:[1,.65,.55],C_1:[1,.65,-.55],D_1:[-1,.65,-.55]},f:CUBEF},
   ann:[{t:'em',a:'A',b:'C_1',lab:'d'},{t:'dim',a:'A',b:'B',lab:'a'},{t:'dim',a:'B',b:'C',lab:'b'},{t:'dim',a:'A',b:'A_1',lab:'c'}]},
  {id:'prism',n:'Гурвалжин призм',u:'a',L:1.8,fx:['V=S_{\\text{суурь}}\\,h','S_{\\text{суурь}}=\\dfrac{a^2\\sqrt{3}}{4}'],
   poly:{v:{A:[-.9,-.8,.5196],B:[.9,-.8,.5196],C:[0,-.8,-1.0392],A_1:[-.9,.8,.5196],B_1:[.9,.8,.5196],C_1:[0,.8,-1.0392]},f:[['A','B','C'],['A_1','B_1','C_1'],['A','B','B_1','A_1'],['B','C','C_1','B_1'],['C','A','A_1','C_1']]},
   ann:[{t:'dim',a:'A',b:'B',lab:'a'},{t:'dim',a:'B',b:'B_1',lab:'h'}]},
  {id:'tet',n:'Зөв тетраэдр',u:'a',L:2.0,fx:['V=\\dfrac{a^3\\sqrt{2}}{12}','h=a\\sqrt{\\tfrac{2}{3}}'],
   poly:{v:{A:[-1,-.408,-.577],B:[1,-.408,-.577],C:[0,-.408,1.155],S:[0,1.225,0]},f:[['A','B','C'],['S','A','B'],['S','B','C'],['S','C','A']]},
   pts:{O:[0,-.408,0]},
   ann:[{t:'aux',a:'S',b:'O',lab:'h'},{t:'aux',a:'O',b:'C'},{t:'right',at:'O',a:'S',b:'C'},{t:'dim',a:'A',b:'B',lab:'a'}]},
  {id:'pyr',n:'Зөв пирамид',u:'a',L:1.8,fx:['V=\\dfrac{1}{3}a^2h','S_{\\text{суурь}}=a^2'],
   poly:{v:{A:[-.9,-.75,.9],B:[.9,-.75,.9],C:[.9,-.75,-.9],D:[-.9,-.75,-.9],S:[0,1.05,0]},f:[['A','B','C','D'],['S','A','B'],['S','B','C'],['S','C','D'],['S','D','A']]},
   pts:{O:[0,-.75,0]},
   ann:[{t:'aux',a:'S',b:'O',lab:'h'},{t:'aux',a:'A',b:'C'},{t:'aux',a:'B',b:'D'},{t:'right',at:'O',a:'S',b:'B'},{t:'dim',a:'A',b:'B',lab:'a'}]},
  {id:'cyl',n:'Цилиндр',u:'r',L:.95,fx:['V=\\pi r^2h','S_{\\text{хажуу}}=2\\pi rh'],curved:'cyl',r:.95,h:1.9,
   pts:{O:[0,-.95,0],O_1:[0,.95,0],A:[.778,-.95,.545]},
   ann:[{t:'em',a:'O',b:'A',lab:'r'},{t:'aux',a:'O',b:'O_1',lab:'h'},{t:'right',at:'O',a:'A',b:'O_1'}]},
  {id:'cone',n:'Конус',u:'r',L:1.05,fx:['V=\\dfrac{1}{3}\\pi r^2h','l=\\sqrt{r^2+h^2}'],curved:'cone',r:1.05,h:2.0,
   pts:{O:[0,-1,0],S:[0,1,0],A:[.86,-1,.602]},
   ann:[{t:'em',a:'S',b:'A',lab:'l'},{t:'em',a:'O',b:'A',lab:'r'},{t:'aux',a:'S',b:'O',lab:'h'},{t:'right',at:'O',a:'A',b:'S'}]},
  {id:'sph',n:'Бөмбөрцөг',u:'R',L:1.25,fx:['V=\\dfrac{4}{3}\\pi R^3','S=4\\pi R^2'],curved:'sph',r:1.25,
   pts:{O:[0,0,0],A:[1.0825,0,.625]},
   ann:[{t:'em',a:'O',b:'A',lab:'R'}]}
];
const PERIOD=10*60*1000;
const qs=new URLSearchParams(location.search);
let preview=qs.has('solid')? (+qs.get('solid'))%SOLIDS.length : null;
// Эзэн 2026-10-17: цаг зогсоосон — хуудас нээх бүрт нэг дүрс, явцад солигдохгүй, тоолуургүй
const FIXED_IDX=Math.floor(Date.now()/PERIOD)%SOLIDS.length;
const currentIdx=()=> preview!==null? preview : FIXED_IDX;

function buildPoly(def){
  const P=def.poly, V3=k=>V(...P.v[k]), keys=Object.keys(P.v);
  const cen=keys.reduce((a,k)=>a.add(V3(k)),V(0,0,0)).multiplyScalar(1/keys.length);
  const faces=P.f.map(f0=>{ let f=f0, pts=f.map(V3);
    const n=new THREE.Vector3().subVectors(pts[1],pts[0]).cross(new THREE.Vector3().subVectors(pts[2],pts[0])).normalize();
    const c=pts.reduce((a,p)=>a.add(p.clone()),V(0,0,0)).multiplyScalar(1/pts.length);
    if(n.dot(c.clone().sub(cen))<0){ f=[...f].reverse(); pts=f.map(V3); n.negate(); }
    return {k:f,pts,n,c}; });
  const pos=[]; faces.forEach(F=>{ for(let i=1;i<F.pts.length-1;i++) [F.pts[0],F.pts[i],F.pts[i+1]].forEach(p=>pos.push(p.x,p.y,p.z)); });
  const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); geo.computeVertexNormals();
  const em=new Map(), vf={};
  faces.forEach((F,fi)=>F.k.forEach((a,i)=>{ const b=F.k[(i+1)%F.k.length], key=[a,b].sort().join('|');
    if(!em.has(key)) em.set(key,{a,b,f:[]}); em.get(key).f.push(fi); (vf[a]=vf[a]||[]).push(fi); }));
  return {geo,faces,edges:[...em.values()],cen,vf};
}
function geoFor(def){
  if(def.poly) return buildPoly(def).geo;
  if(def.curved==='cyl') return new THREE.CylinderGeometry(def.r,def.r,def.h,128,1);
  if(def.curved==='cone') return new THREE.ConeGeometry(def.r,def.h,128,1);
  return new THREE.SphereGeometry(def.r,96,64);
}
// студийн гэрэл: харанхуй өрөөнд зурвас гэрлүүд (бүтээгдэхүүний гэрэл зургийн арга)
function studioEnv(r){
  const sc=new THREE.Scene(); sc.background=new THREE.Color(0x030406);
  const add=(w,h,p,rot,i)=>{ const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(i,i,i*1.02),side:THREE.DoubleSide})); m.position.set(...p); m.rotation.set(...rot); sc.add(m); };
  add(1.1,9,[-5,1,1.5],[0,Math.PI/2,0],7);
  add(1.1,9,[5,1,-1.5],[0,-Math.PI/2,0],4.5);
  add(9,3.5,[0,6,0],[Math.PI/2,0,0],2.2);
  add(5,1,[0,-.6,7],[0,Math.PI,0],.55);
  add(2.4,2.4,[1.5,2.2,-6],[0,0,0],1.3);
  const pm=new THREE.PMREMGenerator(r), t=pm.fromScene(sc,.02).texture; pm.dispose(); return t;
}
function backdropTex(cx,cy,cs=['#22386A','#13244A','#0B1834']){
  const c=document.createElement('canvas'); c.width=c.height=512; const g=c.getContext('2d');
  const gr=g.createRadialGradient(512*cx,512*cy,0,512*cx,512*cy,512*.75); gr.addColorStop(0,cs[0]); gr.addColorStop(.55,cs[1]); gr.addColorStop(1,cs[2]);
  g.fillStyle=gr; g.fillRect(0,0,512,512); const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
const blobTex=(()=>{ const c=document.createElement('canvas'); c.width=c.height=128; const g=c.getContext('2d'); const r=g.createRadialGradient(64,64,0,64,64,64); r.addColorStop(0,'rgba(0,0,0,.75)'); r.addColorStop(.55,'rgba(0,0,0,.3)'); r.addColorStop(1,'rgba(0,0,0,0)'); g.fillStyle=r; g.fillRect(0,0,128,128); return new THREE.CanvasTexture(c); })();

function computeSection(geo,pl,isPoly){
  const pos=geo.attributes.position, idx=geo.index, tri=(idx?idx.count:pos.count)/3;
  const a=V(0,0,0),b=V(0,0,0),c=V(0,0,0),e1=V(0,0,0),e2=V(0,0,0), raw=[]; let flat=false;
  const dist=p=>{ const d=pl.distanceToPoint(p); return Math.abs(d)<1e-6?1e-6:d; };
  for(let t=0;t<tri;t++){
    const ia=idx?idx.getX(t*3):t*3, ib=idx?idx.getX(t*3+1):t*3+1, ic=idx?idx.getX(t*3+2):t*3+2;
    a.fromBufferAttribute(pos,ia); b.fromBufferAttribute(pos,ib); c.fromBufferAttribute(pos,ic);
    const da=dist(a), db=dist(b), dc=dist(c), P=[];
    if(da*db<0) P.push(a.clone().lerp(b,da/(da-db)));
    if(db*dc<0) P.push(b.clone().lerp(c,db/(db-dc)));
    if(dc*da<0) P.push(c.clone().lerp(a,dc/(dc-da)));
    if(P.length>=2){ raw.push(P[0],P[1]); if(!isPoly){ e1.subVectors(b,a); e2.subVectors(c,a); if(Math.abs(e1.cross(e2).normalize().y)>.99) flat=true; } }
  }
  const pts=[]; raw.forEach(p=>{ for(const q of pts) if(q.distanceToSquared(p)<1e-8) return; pts.push(p); });
  if(pts.length<3) return null;
  const n=pl.normal, ctr=pts.reduce((s,p)=>s.add(p),V(0,0,0)).multiplyScalar(1/pts.length);
  const u=new THREE.Vector3().crossVectors(n,Math.abs(n.y)<.9?V(0,1,0):V(1,0,0)).normalize(), v=new THREE.Vector3().crossVectors(n,u);
  const uv=pts.map(p=>{ const d=p.clone().sub(ctr); return {p,x:d.dot(u),y:d.dot(v)}; }).sort((A,B)=>Math.atan2(A.y,A.x)-Math.atan2(B.y,B.x));
  let area=0; for(let i=0;i<uv.length;i++){ const P0=uv[i],P1=uv[(i+1)%uv.length]; area+=P0.x*P1.y-P1.x*P0.y; }
  const op=uv.map(o=>o.p);
  let corners=op;
  if(isPoly) corners=op.filter((p,i)=>{ const pr=op[(i-1+op.length)%op.length], nx=op[(i+1)%op.length]; return p.clone().sub(pr).normalize().dot(nx.clone().sub(p).normalize())<.9995; });
  return {pts:op,corners,area:Math.abs(area)/2,flat,c:ctr};
}
function polyName(c){
  const n=c.length, side=i=>c[(i+1)%n].clone().sub(c[i]), L=c.map((_,i)=>side(i).length()), eq=Math.max(...L)/Math.min(...L)<1.02;
  if(n===3) return eq?'Зөв гурвалжин':'Гурвалжин';
  if(n===4){ const s=[0,1,2,3].map(i=>side(i).normalize());
    const right=Math.abs(s[0].dot(s[1]))<.02&&Math.abs(s[1].dot(s[2]))<.02;
    const p02=Math.abs(Math.abs(s[0].dot(s[2]))-1)<.002, p13=Math.abs(Math.abs(s[1].dot(s[3]))-1)<.002;
    if(right) return eq?'Квадрат':'Тэгш өнцөгт';
    if(p02&&p13) return eq?'Ромб':'Параллелограмм';
    if(p02||p13) return 'Трапец';
    return 'Дөрвөн өнцөгт'; }
  if(n===5) return 'Таван өнцөгт';
  if(n===6) return eq?'Зөв зургаан өнцөгт':'Зургаан өнцөгт';
  return n+' өнцөгт';
}
function sectionInfo(def,sec,tilt){
  if(!sec) return null;
  const th=Math.abs(tilt), A=sec.area/(def.L*def.L); let name;
  if(def.curved==='sph') name='Тойрог';
  else if(def.curved==='cyl') name= th<.5?'Тойрог' : th>89.5?'Тэгш өнцөгт' : sec.flat?'Эллипсийн хэсэг':'Эллипс';
  else if(def.curved==='cone'){ const beta=Math.atan2(def.h,def.r)/D2R; name= th<.5?'Тойрог' : th>89.5?'Гурвалжин' : th<beta-1?(sec.flat?'Эллипсийн хэсэг':'Эллипс') : th<=beta+1?'Парабол' : 'Гипербол'; }
  else name=polyName(sec.corners);
  return {name,A,u:def.u};
}

const _st=V(0,0,0),_sw=V(0,0,0),_sq1=V(0,0,0),_sq2=V(0,0,0);
class SolidStage{
  constructor(canvas,ann,o={}){
    this.canvas=canvas; this.ann=ann; this.o=o;
    const r=this.r=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    r.setPixelRatio(DPR); r.toneMapping=THREE.NeutralToneMapping; r.localClippingEnabled=true;
    this.scene=new THREE.Scene(); this.scene.background=backdropTex(o.bx??.5,o.by??.45);
    this.scene.environment=studioEnv(r);
    this.cam=new THREE.PerspectiveCamera(24,1,.1,200);
    this.root=new THREE.Group(); this.scene.add(this.root);
    this.shadow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false,opacity:.75}));
    this.shadow.rotation.x=-Math.PI/2; this.scene.add(this.shadow);
    this.clip=new THREE.Plane(V(0,-1,0),1e3);
    this.glassM=new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:.07,transmission:.96,thickness:1.4,ior:1.5,dispersion:1.2,attenuationColor:new THREE.Color('#BFD3F2'),attenuationDistance:1.9,specularIntensity:1,clearcoat:.3,clearcoatRoughness:.05,envMapIntensity:1.9,clippingPlanes:[this.clip]});
    this.tintM=new THREE.MeshBasicMaterial({color:0xC9D7F2,transparent:true,opacity:.05,depthWrite:false,clippingPlanes:[this.clip]});
    const mob=!!o.mobile, lm=x=>new LineMaterial(Object.assign({transparent:true,depthTest:false,depthWrite:false},x));
    this.M={vis:lm({color:EDGE,linewidth:mob?1.3:1.6,opacity:.95,clippingPlanes:[this.clip]}),
      hid:lm({color:DIMC,linewidth:mob?1:1.1,opacity:.75,dashed:true,dashSize:.075,gapSize:.06,clippingPlanes:[this.clip]}),
      em:lm({color:EM,linewidth:mob?2.2:2.6}), rt:lm({color:EM,linewidth:1.4}),
      aux:lm({color:EM,linewidth:mob?1.3:1.5,opacity:.95,dashed:true,dashSize:.07,gapSize:.05}),
      dim:lm({color:DIMC,linewidth:1.1,opacity:.9}), sec:lm({color:EM,linewidth:mob?2:2.4})};
    const seg=m=>{ const l=new LineSegments2(new LineSegmentsGeometry(),m); l.frustumCulled=false; l.renderOrder=3; return l; };
    this.Lv=seg(this.M.vis); this.Lh=seg(this.M.hid);
    this.secFill=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:EM,transparent:true,opacity:.24,side:THREE.DoubleSide,depthTest:false,depthWrite:false}));
    this.secFill.renderOrder=2; this.secFill.frustumCulled=false;
    this.secLine=new Line2(new LineGeometry(),this.M.sec); this.secLine.renderOrder=4; this.secLine.frustumCulled=false;
    const pm=(c,s)=>new THREE.PointsMaterial({color:c,size:s,sizeAttenuation:false,map:dotTex,transparent:true,depthTest:false,depthWrite:false});
    this.dotsV=new THREE.Points(new THREE.BufferGeometry(),pm(0xFFFFFF,mob?6:7)); this.dotsH=new THREE.Points(new THREE.BufferGeometry(),pm(DIMC,mob?5:6));
    this.dotsV.renderOrder=this.dotsH.renderOrder=5; this.dotsV.frustumCulled=this.dotsH.frustumCulled=false;
    this.def=null; this.labels=[]; this.sec=null; this.secInfo=null; this.secKey=''; this.camL=V(0,0,0); this.vvis={}; this.born=0;
  }
  setSolid(def){
    while(this.root.children.length) this.root.remove(this.root.children[0]);
    this.ann.innerHTML=''; this.labels=[]; this.def=def; this.secKey=''; this.vvis={}; this.born=performance.now();
    this.pd=def.poly?buildPoly(def):null;
    const g=this.geo=this.pd?this.pd.geo:geoFor(def); g.computeBoundingBox(); this.bb=g.boundingBox;
    const mesh=new THREE.Mesh(g,this.glassM); mesh.renderOrder=1; this.root.add(mesh);
    const tint=new THREE.Mesh(g,this.tintM); tint.renderOrder=1.5; this.root.add(tint);
    this.root.add(this.Lv,this.Lh,this.secFill,this.secLine,this.dotsV,this.dotsH);
    this.P={}; if(def.poly) for(const k in def.poly.v) this.P[k]=V(...def.poly.v[k]); if(def.pts) for(const k in def.pts) this.P[k]=V(...def.pts[k]);
    const em=[],aux=[],rt=[],dim=[], cen=this.pd?this.pd.cen:V(0,0,0), hero=!!this.o.hero, mob=!!this.o.mobile; this.rtN=[];
    (def.ann||[]).forEach(a=>{
      if(a.t==='em'||a.t==='aux'){ const A=this.P[a.a],B=this.P[a.b]; (a.t==='em'?em:aux).push(A,B); if(a.lab) this.addLabel(a.lab,A.clone().add(B).multiplyScalar(.5),'em',{perp:[A,B]}); }
      else if(a.t==='right'){ const O=this.P[a.at], u=this.P[a.a].clone().sub(O).normalize().multiplyScalar(.14), w=this.P[a.b].clone().sub(O).normalize().multiplyScalar(.14);
        const p1=O.clone().add(u), p2=O.clone().add(u).add(w), p3=O.clone().add(w); rt.push(p1,p2,p2,p3); this.rtN.push({O,n:u.clone().cross(w).normalize()}); }
      else if(a.t==='dim'){ const A=this.P[a.a],B=this.P[a.b], d=B.clone().sub(A).normalize(), m=A.clone().add(B).multiplyScalar(.5), out=m.clone().sub(cen);
        out.sub(d.clone().multiplyScalar(out.dot(d))).normalize();
        const o1=out.clone().multiplyScalar(.26), e0=out.clone().multiplyScalar(.06), e1=out.clone().multiplyScalar(.32), tk=d.clone().add(out).normalize().multiplyScalar(.045);
        dim.push(A.clone().add(e0),A.clone().add(e1),B.clone().add(e0),B.clone().add(e1),A.clone().add(o1),B.clone().add(o1));
        [A,B].forEach(P0=>{ const c=P0.clone().add(o1); dim.push(c.clone().sub(tk),c.clone().add(tk)); });
        this.addLabel(a.lab,m.clone().add(out.clone().multiplyScalar(.44)),'dm'); }
    });
    const mk=(arr,mat,dashed)=>{ if(!arr.length) return; const l=new LineSegments2(new LineSegmentsGeometry().setPositions(arr.flatMap(v=>[v.x,v.y,v.z])),mat); if(dashed) l.computeLineDistances(); l.renderOrder=3; l.frustumCulled=false; this.root.add(l); };
    mk(em,this.M.em); mk(aux,this.M.aux,true); mk(rt,this.M.rt); mk(dim,this.M.dim);
    for(const k in this.P) this.addLabel(k,this.P[k],'v',{vtx:k});
    this.secLab=this.addLabel('\\alpha',V(0,0,0),'sec');
    const re=()=>{ if(!katex) return setTimeout(re,120); this.labels.forEach(L=>tex(L.el,L.src)); }; re();
  }
  addLabel(src,pos,kind,extra={}){ const el=document.createElement('span'); el.className=kind; tex(el,src); this.ann.appendChild(el); const L={el,src,pos,kind,...extra}; this.labels.push(L); return L; }
  polyLines(vis,hid,dv,dh){
    const F=this.pd.faces, front=F.map(f=>f.n.dot(_st.copy(this.camL).sub(f.c))>0);
    this.pd.edges.forEach(e=>{ const A=this.P[e.a],B=this.P[e.b]; (e.f.some(i=>front[i])?vis:hid).push(A.x,A.y,A.z,B.x,B.y,B.z); });
    for(const k in this.pd.vf){ const P=this.P[k], f=this.pd.vf[k].some(i=>front[i]); (f?dv:dh).push(P.x,P.y,P.z); this.vvis[k]=f; }
    if(this.def.pts) for(const k in this.def.pts){ const P=this.P[k]; dv.push(P.x,P.y,P.z); this.vvis[k]=true; }
  }
  curveLines(vis,hid,dv){
    const d=this.def, c=this.camL, K=128, push=(arr,a,b)=>arr.push(a.x,a.y,a.z,b.x,b.y,b.z);
    if(d.curved==='cyl'||d.curved==='cone'){
      const r=d.r,H=d.h,yb=-H/2,yt=H/2,rho=Math.hypot(c.x,c.z),phi=Math.atan2(c.z,c.x), rim=(th,y)=>V(r*Math.cos(th),y,r*Math.sin(th));
      for(let k=0;k<K;k++){ const a=k/K*Math.PI*2,b=(k+1)/K*Math.PI*2,m=(a+b)/2;
        if(d.curved==='cyl'){ const side=c.x*Math.cos(m)+c.z*Math.sin(m)-r>0; push(side||c.y>yt?vis:hid,rim(a,yt),rim(b,yt)); push(side||c.y<yb?vis:hid,rim(a,yb),rim(b,yb)); }
        else { const side=H*rho*Math.cos(m-phi)+r*c.y-r*H/2>0; push(side||c.y<yb?vis:hid,rim(a,yb),rim(b,yb)); } }
      if(d.curved==='cyl'){ if(rho>r){ const dd=Math.acos(r/rho); [phi+dd,phi-dd].forEach(th=>push(vis,rim(th,yb),rim(th,yt))); } }
      else { const val=r*(H/2-c.y)/(H*rho); if(Math.abs(val)<=1){ const dd=Math.acos(val), S=V(0,yt,0); [phi+dd,phi-dd].forEach(th=>push(vis,S,rim(th,yb))); } }
    } else {
      const R=d.r, L=c.length();
      if(L>R){ const dir=c.clone().normalize(), k=R*R/L, rad=R*Math.sqrt(1-(R*R)/(L*L)), ctr=dir.clone().multiplyScalar(k);
        const u=new THREE.Vector3().crossVectors(dir,Math.abs(dir.y)<.9?V(0,1,0):V(1,0,0)).normalize(), v=new THREE.Vector3().crossVectors(dir,u);
        const cp=a=>ctr.clone().addScaledVector(u,Math.cos(a)*rad).addScaledVector(v,Math.sin(a)*rad);
        for(let i=0;i<K;i++) push(vis,cp(i/K*Math.PI*2),cp((i+1)/K*Math.PI*2)); }
      for(let i=0;i<K;i++){ const a=i/K*Math.PI*2,b=(i+1)/K*Math.PI*2, pa=V(R*Math.cos(a),0,R*Math.sin(a)), pb=V(R*Math.cos(b),0,R*Math.sin(b)); push(pa.clone().add(pb).multiplyScalar(.5).dot(c)>R*R*.999?vis:hid,pa,pb); }
    }
    for(const k in this.P){ const P=this.P[k]; dv.push(P.x,P.y,P.z); this.vvis[k]=true; }
  }
  updateCut(cut){
    const on=!!(cut&&cut.on); this.secFill.visible=this.secLine.visible=on;
    if(!on){ this.clip.set(V(0,-1,0),1e3); this.secInfo=null; return; }
    const bb=this.bb, y=lerp(bb.min.y+.03,bb.max.y-.03,cut.h), th=cut.tilt*D2R, n=V(0,Math.cos(th),Math.sin(th)), P=V(0,y,0);
    const key=this.def.id+'|'+y.toFixed(4)+'|'+th.toFixed(4);
    if(key!==this.secKey){ this.secKey=key;
      this.sec=computeSection(this.geo,new THREE.Plane().setFromNormalAndCoplanarPoint(n,P),!!this.def.poly);
      this.secInfo=sectionInfo(this.def,this.sec,cut.tilt);
      const s=this.sec;
      if(s){ const pos=[]; for(let i=0;i<s.pts.length;i++){ const a=s.pts[i],b=s.pts[(i+1)%s.pts.length]; pos.push(s.c.x,s.c.y,s.c.z,a.x,a.y,a.z,b.x,b.y,b.z); }
        this.secFill.geometry.dispose(); const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); this.secFill.geometry=g;
        this.secLine.geometry.dispose(); const lg=new LineGeometry(); lg.setPositions([...s.pts,s.pts[0]].flatMap(v=>[v.x,v.y,v.z])); this.secLine.geometry=lg; this.secLine.computeLineDistances();
        let far=s.pts[0],fd=-1; s.pts.forEach(q=>{ const d=q.x*q.x+q.z*q.z; if(d>fd){ fd=d; far=q; } }); this.secLab.pos.copy(s.c).lerp(far,.55); }
      else { this.secFill.visible=this.secLine.visible=false; }
    }
    if(!this.sec){ this.secFill.visible=this.secLine.visible=false; }
    if(cut.away){ const pl=new THREE.Plane().setFromNormalAndCoplanarPoint(n.clone().negate(),P); pl.applyMatrix4(this.root.matrixWorld); this.clip.copy(pl); }
    else this.clip.set(V(0,-1,0),1e3);
  }
  update(t,s){
    fit(this.r,this.cam,this.canvas);
    const w=this.canvas.clientWidth,h=this.canvas.clientHeight; if(!w||!h) return;
    for(const k in this.M) this.M[k].resolution.set(w,h);
    const sc=(s.scale||1)*ease(Math.min(1,(performance.now()-this.born)/800));
    this.root.position.copy(s.rootPos); this.root.rotation.set(0,s.rotY||0,0); this.root.scale.setScalar(Math.max(.001,sc));
    if(s.camPos){ this.cam.position.copy(s.camPos); this.cam.lookAt(s.target); }
    this.root.updateMatrixWorld(true); this.cam.updateMatrixWorld();
    this.camL.copy(this.cam.position); this.root.worldToLocal(this.camL);
    const vis=[],hid=[],dv=[],dh=[];
    if(this.pd) this.polyLines(vis,hid,dv,dh); else this.curveLines(vis,hid,dv);
    const setL=(l,arr,dashed)=>{ l.visible=arr.length>0; if(!arr.length) return; l.geometry.dispose(); l.geometry=new LineSegmentsGeometry().setPositions(arr); if(dashed) l.computeLineDistances(); };
    setL(this.Lv,vis); setL(this.Lh,hid,true);
    this.dotsV.geometry.setAttribute('position',new THREE.Float32BufferAttribute(dv,3)); this.dotsH.geometry.setAttribute('position',new THREE.Float32BufferAttribute(dh,3));
    this.updateCut(s.cut);
    // тэгш өнцгийн тэмдэг камер руу хажуугаараа харвал (|cos| бага) бүдгэрнэ — эс бөгөөс тасархай зураас мэт гацаж харагддаг
    if(this.rtN&&this.rtN.length){ let f=1; this.rtN.forEach(r=>{ const c=Math.abs(_st.copy(this.camL).sub(r.O).normalize().dot(r.n)); f=Math.min(f,clamp((c-.18)/.22)); }); this.M.rt.opacity=f; this.M.rt.visible=f>.02; }
    const bbm=this.bb, by=bbm.min.y*sc, sz=Math.max(bbm.max.x-bbm.min.x,bbm.max.z-bbm.min.z)*sc;
    this.shadow.position.set(s.rootPos.x,s.rootPos.y+by-.012,s.rootPos.z); this.shadow.scale.set(sz*1.9,sz*1.9,1);
    this.placeLabels(w,h,s.labels!==false,s.labelOpacity??1);
    this.r.render(this.scene,this.cam);
  }
  placeLabels(w,h,on,op){
    this.ann.style.opacity=on?op:0; if(!on||op<=0) return;
    const c0=_st.copy(this.root.position).project(this.cam), cx0=(c0.x*.5+.5)*w, cy0=(-c0.y*.5+.5)*h;
    this.labels.forEach(L=>{
      if(L.kind==='sec'){ L.el.style.display=this.secFill.visible?'':'none'; if(!this.secFill.visible) return; }
      _sw.copy(L.pos).applyMatrix4(this.root.matrixWorld).project(this.cam);
      const x=(_sw.x*.5+.5)*w, y=(-_sw.y*.5+.5)*h; let ox=0, oy=0;
      if(L.kind==='v'){ const dx=x-cx0, dy=y-cy0, d=Math.hypot(dx,dy); if(d<4){ oy=-17; } else { ox=dx/d*17; oy=dy/d*17; } L.el.style.opacity=this.vvis[L.vtx]===false?.42:1; }
      else if(L.perp){ _sq1.copy(L.perp[0]).applyMatrix4(this.root.matrixWorld).project(this.cam); _sq2.copy(L.perp[1]).applyMatrix4(this.root.matrixWorld).project(this.cam);
        let sx=(_sq2.x-_sq1.x)*w, sy=-(_sq2.y-_sq1.y)*h; const sl=Math.hypot(sx,sy)||1; let nx=-sy/sl, ny=sx/sl;
        // өндөр шиг төвөөр гарах шугамд тал нь кадр бүр солигдож «h» үсэрдэг байсан — 20px-ээс хэтрэхэд л солигдоно
        const side=nx*(x-cx0)+ny*(y-cy0); if(!L.side) L.side=side<0?-1:1; else if(Math.abs(side)>20) L.side=side<0?-1:1;
        ox=nx*15*L.side; oy=ny*15*L.side; }
      L.ax=x; L.ay=y; L.X=x+ox; L.Y=y+oy; L.on=true;
    });
    // давхцал: оройн нэр эхэлж байрлана, бусад нь тэднээс түлхэгдэнэ; дэлгэцээс гарахгүй
    const placed=[], order=[...this.labels].sort((a,b)=>(a.kind==='v'?0:1)-(b.kind==='v'?0:1));
    order.forEach(L=>{ if(!L.on) return; L.on=false;
      const bw=Math.max(14,L.el.offsetWidth||14), bh=Math.max(14,L.el.offsetHeight||16);
      for(let k=0;k<8;k++){ const hit=placed.find(o=>Math.abs(o.X-L.X)<(o.w+bw)/2+2&&Math.abs(o.Y-L.Y)<(o.h+bh)/2+1); if(!hit) break;
        let dx=L.X-hit.X, dy=L.Y-hit.Y, d=Math.hypot(dx,dy); if(d<1){ dx=1; dy=-1; d=1.42; } L.X+=dx/d*7; L.Y+=dy/d*7; }
      placed.push({X:L.X,Y:L.Y,w:bw,h:bh});
      // цэгээс хол байх зай (offset) кадр хооронд зөөлөн өөрчлөгдөнө — давхцлаас түлхэгдэхэд үсрэхгүй
      const tx=L.X-L.ax, ty=L.Y-L.ay; if(L.ox==null||Math.hypot(tx-L.ox,ty-L.oy)>80){ L.ox=tx; L.oy=ty; } else { L.ox+=(tx-L.ox)*.22; L.oy+=(ty-L.oy)*.22; }
      const X=Math.min(w-bw/2-4,Math.max(bw/2+4,L.ax+L.ox)), Y=Math.min(h-bh/2-4,Math.max(bh/2+4,L.ay+L.oy));
      L.el.style.transform=`translate3d(${X}px,${Y}px,0) translate(-50%,-50%)`;
    });
  }
}

/* ---------- Hero ба лабораторийн тайз ---------- */
const hc=$('#heroGL');
const heroStage=new SolidStage(hc,$('#heroAnn'),{hero:true,mobile:MOBILE,bx:MOBILE?.5:.66,by:MOBILE?.26:.45});
const labC=$('#labGL');
const labStage=new SolidStage(labC,$('#labAnn'),{mobile:MOBILE,bx:.5,by:.42});
labStage.cam.position.set(4.6,2.9,8.2);
const controls=new OrbitControls(labStage.cam,labC);
controls.enableZoom=false; controls.enablePan=false; controls.enableDamping=true; controls.autoRotate=true; controls.autoRotateSpeed=.6;
controls.minPolarAngle=.35; controls.maxPolarAngle=1.8; controls.target.set(0,0,0);
controls.addEventListener('start',()=>{ controls.autoRotate=false; });
let shown=-1, labShown=-1, roKey='';
// Цагаан горимд дүрс сурах бичиг шиг: цагаан дэвсгэр, хөх зураас (dom-ийн setTheme дуудна)
const THEMES={dark:{bg:['#22386A','#13244A','#0B1834'],edge:EDGE,dim:DIMC,em:EM,dot:0xFFFFFF,tint:0xC9D7F2},
  light:{bg:['#FFFFFF','#F3F6FC','#E6ECF7'],edge:0x182950,dim:0x8592AE,em:0x2E57B8,dot:0x182950,tint:0x9DB2DA}};
window.__theme=light=>{ const T=THEMES[light?'light':'dark'];
  [heroStage,labStage].forEach(st=>{ st.M.vis.color.set(T.edge); st.M.hid.color.set(T.dim); st.M.dim.color.set(T.dim);
    ['em','rt','aux','sec'].forEach(k=>st.M[k].color.set(T.em)); st.secFill.material.color.set(T.em);
    st.dotsV.material.color.set(T.dot); st.dotsH.material.color.set(T.dim); st.tintM.color.set(T.tint);
    const old=st.scene.background; st.scene.background=backdropTex(st.o.bx??.5,st.o.by??.45,T.bg); if(old&&old.dispose) old.dispose(); });
};
if(window.__themeNow==='light') window.__theme(true);
function applySolid(i){
  const s=SOLIDS[i]; shown=i;
  $('#tName').textContent=s.n;
  const fx=$('#tFx'); fx.innerHTML=s.fx.map(()=>'<span></span>').join(''); [...fx.children].forEach((el,k)=>tex(el,s.fx[k]));
  heroStage.setSolid(s); ideaTarget(i);
  if(window.LAB&&window.LAB.solid<0&&window.labPick) window.labPick(i);
}
(function k(){ if(!katex||shown<0) return setTimeout(k,120); const s=SOLIDS[shown]; [...$('#tFx').children].forEach((el,j)=>tex(el,s.fx[j])); })();
function labReadout(){
  const info=labStage.secInfo, def=labStage.def; if(!def) return;
  const key=def.id+'|'+(info?info.name+info.A.toFixed(2):'none');
  if(key===roKey) return; roKey=key;
  $('#secName').textContent=info?info.name:'Огтлол алга';
  tex($('#secArea'),info?`S\\approx ${info.A.toFixed(2)}\\,${info.u}^2`:'-');
  const fx=$('#labFx'); fx.innerHTML=def.fx.map(()=>'<span></span>').join(''); [...fx.children].forEach((el,j)=>tex(el,def.fx[j]));
}

/* =========================================================
   БӨӨМС: бөмбөрцөг -> одод -> биет
   ========================================================= */
const ic=$('#ideaGL');
const ir=new THREE.WebGLRenderer({canvas:ic,antialias:true,alpha:true}); ir.setPixelRatio(DPR);
const is=new THREE.Scene(); const icam=new THREE.PerspectiveCamera(40,1,.1,100); icam.position.set(0,0,8);
const N=MOBILE?3600:6400;
const A=new Float32Array(N*3), B=new Float32Array(N*3), C=new Float32Array(N*3), C0=new Float32Array(N*3);
for(let i=0;i<N;i++){
  const y=1-(i/(N-1))*2, r=Math.sqrt(1-y*y), th=i*2.39996323, Rs=2.1;
  A[i*3]=Math.cos(th)*r*Rs; A[i*3+1]=y*Rs; A[i*3+2]=Math.sin(th)*r*Rs;
  const rr=3.6+Math.random()*4.4, u=Math.random()*Math.PI*2, v=Math.acos(2*Math.random()-1);
  B[i*3]=rr*Math.sin(v)*Math.cos(u)*1.3; B[i*3+1]=rr*Math.cos(v)*.75; B[i*3+2]=rr*Math.sin(v)*Math.sin(u)*.6-3;
}
const ig=new THREE.BufferGeometry(); const IP=new Float32Array(A); ig.setAttribute('position',new THREE.BufferAttribute(IP,3));
const col=new Float32Array(N*3); for(let i=0;i<N;i++){ const g=Math.random()<.14; col[i*3]=g?.69:.86; col[i*3+1]=g?.77:.89; col[i*3+2]=g?.94:.95; }
ig.setAttribute('color',new THREE.BufferAttribute(col,3));
const pts=new THREE.Points(ig,new THREE.PointsMaterial({size:MOBILE?.05:.04,map:dotTex,vertexColors:true,transparent:true,opacity:.92,depthWrite:false,blending:THREE.AdditiveBlending}));
const ideaG=new THREE.Group(); ideaG.add(pts); is.add(ideaG);
const orb=new THREE.Mesh(new THREE.SphereGeometry(.1,32,24),new THREE.MeshBasicMaterial({color:0xE9EFFC})); is.add(orb);
const halo=new THREE.Mesh(new THREE.SphereGeometry(.24,32,24),new THREE.MeshBasicMaterial({color:ACC,transparent:true,opacity:.12,depthWrite:false})); is.add(halo);
let cMix=1, cInit=false;
function ideaTarget(i){
  C0.set(C); cMix=cInit?0:1;
  const m=new THREE.Mesh(geoFor(SOLIDS[i])), sm=new MeshSurfaceSampler(m).build(), v=V(0,0,0);
  for(let k=0;k<N;k++){ sm.sample(v); C[k*3]=v.x*1.25; C[k*3+1]=v.y*1.25; C[k*3+2]=v.z*1.25; }
  if(!cInit){ C0.set(C); cInit=true; }
}

/* =========================================================
   ДЭЛХИЙ: Монгол руу ойртож, 21 аймгаас Улаанбаатар руу урсана
   ========================================================= */
const gc=$('#globeGL');
const gr2=new THREE.WebGLRenderer({canvas:gc,antialias:true,alpha:true}); gr2.setPixelRatio(DPR);
const gs=new THREE.Scene(); const gcam=new THREE.PerspectiveCamera(36,1,.01,200);
gs.add(new THREE.AmbientLight(0xffffff,.6));
const sun=new THREE.DirectionalLight(0xffffff,2.0); sun.position.set(-5,3,6); gs.add(sun);
const earth=new THREE.Group(); gs.add(earth);
const TL=new THREE.TextureLoader(); TL.setCrossOrigin('anonymous');
const IMG='/home/';
const eMat=new THREE.MeshPhongMaterial({color:0x1E2A44,shininess:12,specular:0x1E2A44,bumpScale:.04});
TL.load(IMG+(MOBILE?'earth-blue-marble-2k.webp':'earth-blue-marble.webp'),t=>{ t.colorSpace=THREE.SRGBColorSpace; t.anisotropy=8; eMat.map=t; eMat.color.set(0xffffff); eMat.needsUpdate=true; });
TL.load(IMG+'earth-topology.webp',t=>{ eMat.bumpMap=t; eMat.needsUpdate=true; });
const ER=1.6;
earth.add(new THREE.Mesh(new THREE.SphereGeometry(ER,128,96),eMat));
const atmo=new THREE.Mesh(new THREE.SphereGeometry(ER*1.08,64,48),new THREE.ShaderMaterial({transparent:true,side:THREE.BackSide,blending:THREE.AdditiveBlending,depthWrite:false,
  vertexShader:'varying vec3 vN; void main(){ vN=normalize(normalMatrix*normal); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader:'varying vec3 vN; void main(){ float i=pow(.7-dot(vN,vec3(0,0,1.)),3.); gl_FragColor=vec4(.55,.68,.95,1.)*i*1.25; }'}));
gs.add(atmo);
{ const n=2200,a=new Float32Array(n*3); for(let i=0;i<n;i++){ const r=40+Math.random()*30,u=Math.random()*Math.PI*2,v=Math.acos(2*Math.random()-1); a[i*3]=r*Math.sin(v)*Math.cos(u); a[i*3+1]=r*Math.cos(v); a[i*3+2]=r*Math.sin(v)*Math.sin(u); }
  const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(a,3)); gs.add(new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:.15,map:dotTex,transparent:true,opacity:.6,depthWrite:false}))); }
const ll=(lat,lon,r=ER)=>{ const phi=(90-lat)*D2R, th=(lon+180)*D2R; return V(-r*Math.sin(phi)*Math.cos(th), r*Math.cos(phi), r*Math.sin(phi)*Math.sin(th)); };
function face(lat,lon,tilt=0){ const d=ll(lat,lon).normalize(), h=V(d.x,0,d.z).normalize();
  const q1=new THREE.Quaternion().setFromUnitVectors(h,V(0,0,1)), d1=d.clone().applyQuaternion(q1);
  return new THREE.Quaternion().setFromAxisAngle(V(1,0,0),Math.atan2(d1.y,d1.z)-tilt).multiply(q1); }
const Q={mn:face(46.9,103.6)};

const UB=[47.918,106.917];
const AIMAGS=[['Архангай',47.475,101.454],['Баян-Өлгий',48.968,89.962],['Баянхонгор',46.194,100.718],['Булган',48.812,103.534],['Говь-Алтай',46.372,96.258],['Говьсүмбэр',46.360,108.360],['Дархан-Уул',49.465,105.974],['Дорноговь',44.892,110.141],['Дорнод',48.067,114.536],['Дундговь',45.763,106.271],['Завхан',47.741,96.845],['Орхон',49.028,104.047],['Өвөрхангай',46.264,102.775],['Өмнөговь',43.571,104.425],['Сүхбаатар',46.681,113.280],['Сэлэнгэ',50.232,106.208],['Төв',47.707,106.953],['Увс',49.981,92.067],['Ховд',48.006,91.641],['Хөвсгөл',49.638,100.162],['Хэнтий',47.320,110.656]];
const ubV=ll(...UB).normalize();
const SEG=56;
const arcs=AIMAGS.map(([name,lat,lon])=>{
  const a=ll(lat,lon).normalize(), ang=a.angleTo(ubV), h=.006+ang*.5, pts=[];
  for(let k=0;k<=SEG;k++){ const t=k/SEG; pts.push(a.clone().lerp(ubV,t).normalize().multiplyScalar(ER*(1.0015+Math.sin(Math.PI*t)*h))); }
  const geo=new LineGeometry(); geo.setPositions(pts.flatMap(v=>[v.x,v.y,v.z])); geo.instanceCount=0;
  const mat=new LineMaterial({color:0xC7D6F6,linewidth:MOBILE?1.5:2,transparent:true,opacity:.8,depthWrite:false});
  const line=new Line2(geo,mat); line.computeLineDistances(); line.frustumCulled=false; earth.add(line);
  return {name,pts,line,ang,start:ll(lat,lon,ER*1.0015)};
});
const maxAng=Math.max(...arcs.map(a=>a.ang));
const aDots=new THREE.Points(new THREE.BufferGeometry().setFromPoints(arcs.map(a=>a.start)),new THREE.PointsMaterial({color:0xE9EFFC,size:6,sizeAttenuation:false,map:dotTex,transparent:true,opacity:0,depthWrite:false}));
earth.add(aDots);
const ubPt=ll(...UB,ER*1.0015);
const ubDot=new THREE.Points(new THREE.BufferGeometry().setFromPoints([ubPt]),new THREE.PointsMaterial({color:0xFFFFFF,size:13,sizeAttenuation:false,map:dotTex,transparent:true,depthWrite:false}));
earth.add(ubDot);
const ubRing=new THREE.Mesh(new THREE.RingGeometry(1,1.18,56),new THREE.MeshBasicMaterial({color:ACC,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
ubRing.position.copy(ubPt); ubRing.lookAt(ubPt.clone().multiplyScalar(2)); earth.add(ubRing);
const FK=3, fPos=new Float32Array(arcs.length*FK*3);
const fGeo=new THREE.BufferGeometry(); fGeo.setAttribute('position',new THREE.BufferAttribute(fPos,3));
const flow=new THREE.Points(fGeo,new THREE.PointsMaterial({color:0xFFFFFF,size:MOBILE?6:7,sizeAttenuation:false,map:dotTex,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}));
flow.frustumCulled=false; earth.add(flow);

const LON0=86,LON1=121,LAT0=40.5,LAT1=53;
const mnCanvas=document.createElement('canvas'); mnCanvas.width=MOBILE?1600:3000; mnCanvas.height=Math.round(mnCanvas.width*(LAT1-LAT0)/(LON1-LON0));
const mnTex=new THREE.CanvasTexture(mnCanvas); mnTex.colorSpace=THREE.SRGBColorSpace; mnTex.anisotropy=8;
const mnMat=new THREE.MeshBasicMaterial({map:mnTex,transparent:true,opacity:0,depthWrite:false});
earth.add(new THREE.Mesh(new THREE.SphereGeometry(ER*1.0008,180,72,(LON0+180)*D2R,(LON1-LON0)*D2R,(90-LAT1)*D2R,(LAT1-LAT0)*D2R),mnMat));
let mnState=0;
async function loadMongolia(){
  mnState=1;
  try{
    const geom=await fetch('/home/mongolia.json').then(r=>{ if(!r.ok) throw new Error(String(r.status)); return r.json(); });
    if(dead) return; drawMongolia(geom); mnState=2;
  }catch(e){ console.warn('Монголын хил ачаалсангүй:',e.message); mnState=3; }
}
function drawMongolia(geom){
  const W=mnCanvas.width,H=mnCanvas.height, g=mnCanvas.getContext('2d');
  const X=lo=>(lo-LON0)/(LON1-LON0)*W, Y=la=>(LAT1-la)/(LAT1-LAT0)*H;
  const polys=geom.type==='Polygon'?[geom.coordinates]:geom.coordinates, path=new Path2D();
  polys.forEach(poly=>poly.forEach(ring=>{ ring.forEach(([lo,la],i)=>i?path.lineTo(X(lo),Y(la)):path.moveTo(X(lo),Y(la))); path.closePath(); }));
  g.clearRect(0,0,W,H);
  g.save(); g.clip(path);
  g.fillStyle='rgba(9,13,24,.46)'; g.fillRect(0,0,W,H);
  const st=W/170, cx=1/Math.cos(47*D2R);
  g.fillStyle='rgba(226,234,252,.30)';
  for(let y=st/2;y<H;y+=st) for(let x=st*cx/2;x<W;x+=st*cx){ g.beginPath(); g.ellipse(x,y,st*.13*cx,st*.13,0,0,Math.PI*2); g.fill(); }
  g.restore();
  g.lineJoin='round';
  g.strokeStyle='rgba(184,203,239,.24)'; g.lineWidth=W/170; g.stroke(path);
  g.strokeStyle='rgba(236,241,252,.92)'; g.lineWidth=W/700; g.stroke(path);
  mnTex.needsUpdate=true;
}
const alab=$('#alab');
const labs=[...arcs.map(a=>({n:a.name,p:a.start})),{n:'Улаанбаатар',p:ubPt,ub:true}].map(o=>{ const el=document.createElement('span'); el.textContent=o.n; if(o.ub) el.className='ub'; alab.appendChild(el); return {...o,el}; });
const _w=V(0,0,0),_n=V(0,0,0),_cd=V(0,0,0);
let dragX=0, dragV=0, dragging=null; const gvEl=$('#gv');
gvEl.addEventListener('pointerdown',e=>{ if(window.S.globe<.3) return; dragging=e.clientX; });
on(window,'pointermove',e=>{ if(dragging===null) return; dragV=(e.clientX-dragging)*.005; dragX+=dragV; dragging=e.clientX; });
on(window,'pointerup',()=>dragging=null); on(window,'pointercancel',()=>dragging=null);
const qCur=new THREE.Quaternion(), qSpin=new THREE.Quaternion(), Yax=V(0,1,0);

/* =========================================================
   Нэг кадр
   ========================================================= */
const clock=new THREE.Clock();
const fmt=ms=>{ const s=Math.max(0,Math.ceil(ms/1000)); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); };
let lastSec=-1;
const tHl=$('#tHl'), HC=V(0,0,0), HT=V(0,0,0), HR=V(0,0,0), V0=V(0,0,0);
// hero-ийн камерын зам (24 градусын линз)
const ZD=[[0,10],[.12,9],[.36,8.2],[.42,8.8],[.66,8.8],[.82,12],[1,13]];
const SXD=[[0,1.95],[.14,1.3],[.36,1.3],[.42,.7],[.66,.7],[.82,0],[1,0]];
const SYD=[[0,.2],[.12,.25],[.36,.25],[.42,.75],[.66,.75],[.82,.25],[1,.25]];
const ZM=[[0,18.5],[.12,15],[.36,12.5],[.42,15.5],[.66,15.5],[.82,19],[1,20]];
const FYM=[[0,.24],[.12,.18],[.36,.2],[.42,.22],[.66,.22],[.8,.05],[1,.05]]; // утас: гарчиг, 4 алхамын дээрх хоосон зайн голд
const SXM=[[0,0],[1,0]];

window.__three=(S,t)=>{
  const dt=Math.min(.1,clock.getDelta()), now=performance.now();
  const idx=currentIdx(); if(idx!==shown) applySolid(idx);

  /* ---- HERO ---- */
  if(S.vHero){
    const p=S.hero, mob=hc.clientWidth/Math.max(1,hc.clientHeight)<.9;
    let sx,sy,z;
    if(mob){ z=kf(p,ZM); sx=kf(p,SXM); sy=kf(p,FYM)*2*z*TAN12; HC.set(S.mx*.4,z*.22,z); HT.set(0,0,0); }
    else { z=kf(p,ZD); sx=kf(p,SXD); sy=kf(p,SYD); HC.set(S.mx*.6+sx*.2,z*.24-S.my*.4,z); HT.set(sx*.55,sy,0); }
    HR.set(sx,sy,0);
    const cutK=range(p,.42,.48)*(1-range(p,.64,.7));
    heroStage.update(t,{camPos:HC,target:HT,rootPos:HR,rotY:t*.22+.5,scale:mob?.92:1,
      cut:{on:cutK>0,h:lerp(.92,.4,easeIO(range(p,.43,.58))),tilt:22*easeIO(range(p,.5,.62)),away:false},labelOpacity:1-range(p,.72,.8)});
    const info=heroStage.secInfo, want=info?('Огтлол: '+info.name):''; if(tHl.textContent!==want) tHl.textContent=want;
  }

  /* ---- ЛАБОРАТОРИ ---- */
  if(S.vLab){
    const L=window.LAB;
    if(L.solid>=0&&L.solid!==labShown){ labStage.setSolid(SOLIDS[L.solid]); labShown=L.solid; roKey=''; }
    if(labShown>=0){ controls.update(); labStage.update(t,{rootPos:V0,rotY:0,scale:1,cut:{on:true,h:L.h,tilt:L.tilt,away:L.away},labels:L.labels}); labReadout(); }
  }

  /* ---- БӨӨМС ---- */
  if(S.vIdea){
    fit(ir,icam,ic);
    const p=S.idea, asp=ic.clientWidth/ic.clientHeight;
    if(cMix<1) cMix=Math.min(1,cMix+dt/1.2);
    const ab=easeIO(range(p,.05,.36)), bcm=easeIO(range(p,.4,.75)), cm=ease(cMix);
    for(let i=0;i<N*3;i++){ const c=C0[i]+(C[i]-C0[i])*cm, ab_=A[i]+(B[i]-A[i])*ab; IP[i]=ab_+(c-ab_)*bcm; }
    ig.attributes.position.needsUpdate=true;
    ideaG.scale.setScalar(Math.min(1,asp*1.6)); ideaG.position.y=asp<.9?.25:0;
    ideaG.rotation.y=t*.08+p*1.6+S.mx*.4; ideaG.rotation.x=.28+S.my*.25-bcm*.15;
    const ps=1+Math.sin(t*2.2)*.08; halo.scale.setScalar(ps*(1+bcm*.4)); orb.position.set(S.mx*.3,-S.my*.25+ideaG.position.y,0); halo.position.copy(orb.position);
    ir.render(is,icam);
  }

  /* ---- ДЭЛХИЙ ---- */
  if(S.nearGlobe && mnState===0) loadMongolia();
  if(S.vGlobe){
    fit(gr2,gcam,gc);
    const p=S.globe, w=gc.clientWidth, h=gc.clientHeight, asp=w/h, mob=asp<.9;
    const rotK=easeIO(range(p,.2,.45)), zk=easeIO(range(p,.36,.6));
    const mnK=ease(range(p,.46,.6)), labK=ease(range(p,.62,.72)), flowK=ease(range(p,.68,.76));
    qCur.copy(Q.mn);
    if(dragging===null){ dragX+=dragV; dragV*=.92; if(zk>.5) dragX*=.95; }
    // Эзэн 2026-10-17: дэлхий дээш доош хөдлөхгүй (хазайлт байхгүй) — гүйлгэхэд байрандаа
    // нэг бүтэн эргээд шууд Монгол дээр зогсож, газрын зураг гарна.
    qSpin.setFromAxisAngle(Yax,dragX-(1-rotK)*Math.PI*2);
    earth.quaternion.copy(qSpin).multiply(qCur);
    // тойрог доторх дэлхийн хэмжээ: тойргийн 84%-ийг эзэлнэ
    const r=S.globeR||170, Dfit=ER*h/(TAN*1.68*r), Dmid=mob? ER*h/(TAN*.94*w) : ER/(TAN*.86);
    const Dn=Math.max(Dmid,Dfit);
    const D=lerp(Dn, mob?2.35:1.12, zk);
    const visH=2*D*TAN, visW=visH*asp;
    const offX=mob?0:-.17*visW*zk, offY=mob?-.2*visH*zk:0, tz=ER*zk;
    gcam.position.set(offX,offY,tz+D); gcam.lookAt(offX,offY,tz);
    mnMat.opacity=mnState===2?mnK:0;
    const hiAll=S.go==='mn';
    const arcK=range(p,.55,.78);
    arcs.forEach(a=>{
      const local=clamp(arcK*1.6-(a.ang/maxAng)*.6);
      a.line.geometry.instanceCount=Math.floor(SEG*ease(local));
      a.line.material.resolution.set(w,h);
      a.line.material.opacity=hiAll?1:.78;
    });
    aDots.material.opacity=mnK; aDots.material.size=hiAll?9:6;
    flow.material.opacity=flowK;
    if(flowK>0){ let n=0;
      arcs.forEach((a,i)=>{ for(let k=0;k<FK;k++){ const s=(t*.32+k/FK+i*.137)%1, f=s*SEG, j=Math.min(SEG-1,Math.floor(f)), u=f-j, Pa=a.pts[j], Pb=a.pts[j+1];
        fPos[n++]=Pa.x+(Pb.x-Pa.x)*u; fPos[n++]=Pa.y+(Pb.y-Pa.y)*u; fPos[n++]=Pa.z+(Pb.z-Pa.z)*u; } });
      fGeo.attributes.position.needsUpdate=true; }
    const pulse=(t*.7)%1, base=D*lerp(.007,.0095,zk)*(S.go==='ub'?1.6:1);
    ubRing.scale.setScalar(base*(1+pulse*2.4)); ubRing.material.opacity=(1-pulse)*Math.max(mnK,.5);
    alab.style.opacity=labK;
    if(labK>0){
      earth.updateMatrixWorld();
      labs.forEach(o=>{
        _w.copy(o.p).applyMatrix4(earth.matrixWorld); _n.copy(_w).normalize(); _cd.copy(gcam.position).sub(_w).normalize();
        const front=_n.dot(_cd)>.15, show=front&&(!mob||o.ub);
        _w.project(gcam);
        o.el.style.opacity=show?1:0;
        o.el.style.transform=`translate3d(${(_w.x*.5+.5)*w+(o.ub?10:7)}px,${(-_w.y*.5+.5)*h-(o.ub?9:7)}px,0)`;
      });
    }
    gr2.render(gs,gcam);
  }

};
applySolid(currentIdx());

  return () => {
    dead = true; delete window.__three; offs.forEach((f) => f()); controls.dispose();
    [heroStage.r, labStage.r, ir, gr2].forEach((r) => { r.dispose(); r.forceContextLoss(); });
  };
}
