/* Глобус языков на /download (владелец, 27.10.2026): чёрно-белая Земля, страны языков приложения подсвечены, на них плашки
   с названием языка. Глобус крутится пальцем или мышью (по горизонтали на телефоне, чтобы страница прокручивалась как обычно),
   приближается кнопками, щипком или колесом с Ctrl; пока его не трогали — медленно вращается сам. Выбранный язык (кнопка
   под глобусом, плашка или страна) темнее, глобус поворачивается к нему; при вращении выбор переходит к языку в середине.
   Карта — public/globe-data.js (tools/site-globe-data.cjs), языки и их страны — tools/site-globe-langs.json через кнопки. */
(()=>{const box=document.querySelector('[data-globe]');if(!box||!window.ZAROK_WORLD)return;
const cv=box.querySelector('canvas'),ctx=cv.getContext('2d'),tags=box.querySelector('.globe-labels'),D=Math.PI/180;
const calm=()=>document.documentElement.dataset.motion==='reduce'||matchMedia('(prefers-reduced-motion: reduce)').matches;
const langs=[...document.querySelectorAll('[data-globe-lang]')].map(b=>{const t=document.createElement('span');t.className='globe-tag';t.textContent=b.textContent;
  if(b.lang)t.lang=b.lang;tags.appendChild(t);return{b,t,ids:new Set(b.dataset.ids.split(' ').map(Number)),at:b.dataset.at.split(',').map(Number),slot:0,w:0,h:0};});
const owner=new Map();langs.forEach(l=>l.ids.forEach(id=>owner.set(id,l)));
const vec=(lo,la)=>{const c=Math.cos(la*D);return[c*Math.cos(lo*D),c*Math.sin(lo*D),Math.sin(la*D)];};
const rings=ZAROK_WORLD.map(([id,f])=>{const n=f.length/2,v=new Float64Array(n*3),ll=new Float64Array(n*2);
  for(let i=0;i<n;i++){const p=vec(f[2*i]/10,f[2*i+1]/10);v.set(p,3*i);ll[2*i]=f[2*i]/10;ll[2*i+1]=f[2*i+1]/10;}return{lang:owner.get(id)||null,v,ll};});
const grid=[];for(let lo=-180;lo<180;lo+=30){const g=[];for(let la=-90;la<=90;la+=3)g.push(vec(lo,la));grid.push(g);}
for(let la=-60;la<=60;la+=30){const g=[];for(let lo=-180;lo<=180;lo+=3)g.push(vec(lo,la));grid.push(g);}
let W=0,H=0,R=0,cx=0,cy=0,k=1,lam=0,phi=20,sel=null,hover=null,spin=!calm(),seen=false,dirty=true,anim=null,vel=0,velY=0;
let cl,sl,cp,sp,col={};
const colors=()=>{const s=getComputedStyle(box),g=n=>s.getPropertyValue(n).trim();col={sea:g('--g-sea'),land:g('--g-land'),lang:g('--g-lang'),sel:g('--g-sel'),line:g('--g-line'),edge:g('--g-edge'),shade:g('--g-shade')};};
/* поворот: середина глобуса — (lam, phi); r — вправо, u — вверх, d — к зрителю */
const rot=(x,y,z)=>{const x1=x*cl+y*sl,y1=-x*sl+y*cl;return[y1,-x1*sp+z*cp,x1*cp+z*sp];};
/* холст перерисовывается сразу после смены размера: иначе на кадр он пустой и глобус мигает при прокрутке (панель адреса на телефоне) */
const size=()=>{const r=box.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(r.width===W&&r.height===H&&cv.width===Math.round(W*dpr))return;
  W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);cx=W/2;cy=H/2;if(cl!==undefined)draw();};
/* контур страны, обрезанный по краю видимой половины (как в картографических библиотеках): видимые куски контура
   соединяются по окружности по часовой стрелке с ближайшим следующим куском — так целы и страны у края, и заливы за краем.
   Контуры обходятся по часовой (tools/site-globe-data.cjs) */
const TAU=Math.PI*2,ang=p=>Math.atan2(-p[1],p[0]);
const ring=v=>{const n=v.length/3,P=new Array(n);let o=-1;
  for(let i=0;i<n;i++){P[i]=rot(v[3*i],v[3*i+1],v[3*i+2]);if(P[i][2]<0&&o<0)o=i;}
  if(o<0){ctx.moveTo(cx+R*P[0][0],cy-R*P[0][1]);for(let i=1;i<n;i++)ctx.lineTo(cx+R*P[i][0],cy-R*P[i][1]);ctx.closePath();return true;}
  const cross=(a,b)=>{const t=a[2]/(a[2]-b[2]),r=a[0]+t*(b[0]-a[0]),u=a[1]+t*(b[1]-a[1]),m=Math.hypot(r,u)||1;return[r/m,u/m];};
  const chains=[];let cur=null;
  for(let s=1;s<=n;s++){const a=P[(o+s-1)%n],b=P[(o+s)%n];
    if(a[2]<0&&b[2]>=0){cur=[cross(a,b),b];}
    else if(a[2]>=0&&b[2]<0){cur.push(cross(a,b));chains.push(cur);cur=null;}
    else if(b[2]>=0)cur.push(b);}
  if(!chains.length)return false;
  const used=chains.map(()=>false);
  for(let i=0;i<chains.length;i++){if(used[i])continue;let j=i;ctx.moveTo(cx+R*chains[i][0][0],cy-R*chains[i][0][1]);
    for(let guard=0;guard<=chains.length;guard++){used[j]=true;const c=chains[j];for(let q=1;q<c.length;q++)ctx.lineTo(cx+R*c[q][0],cy-R*c[q][1]);
      const a=ang(c[c.length-1]);let best=i,bd=Infinity;
      for(let k=0;k<chains.length;k++){if(used[k]&&k!==i)continue;const d=((ang(chains[k][0])-a)%TAU+TAU)%TAU;if(d<bd){bd=d;best=k;}}
      ctx.arc(cx,cy,R,a,a+bd,false);if(best===i)break;j=best;}
    ctx.closePath();}
  return true;};
const fillSet=(list,fill)=>{ctx.beginPath();let any=false;for(const r of list)any=ring(r.v)||any;if(!any)return;ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=.6;ctx.strokeStyle=col.line;ctx.stroke();};
const draw=()=>{cl=Math.cos(lam*D);sl=Math.sin(lam*D);cp=Math.cos(phi*D);sp=Math.sin(phi*D);R=Math.min(W,H)*.43*k;ctx.clearRect(0,0,W,H);
  ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fillStyle=col.sea;ctx.fill();
  ctx.beginPath();for(const l of grid){let pv=null;for(const p of l){const q=rot(...p);if(q[2]>0&&pv&&pv[2]>0){ctx.moveTo(cx+R*pv[0],cy-R*pv[1]);ctx.lineTo(cx+R*q[0],cy-R*q[1]);}pv=q;}}
  ctx.lineWidth=.5;ctx.strokeStyle=col.line;ctx.globalAlpha=.45;ctx.stroke();ctx.globalAlpha=1;
  fillSet(rings.filter(r=>!r.lang),col.land);
  for(const l of langs)fillSet(rings.filter(r=>r.lang===l),l===sel?col.sel:col.lang);
  if(hover&&hover!==sel){ctx.save();ctx.globalAlpha=.25;fillSet(rings.filter(r=>r.lang===hover),col.sel);ctx.restore();}
  /* объём: лёгкая тень к краю поверх суши и моря */
  const g=ctx.createRadialGradient(cx-R*.3,cy-R*.35,R*.2,cx,cy,R);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,col.shade);
  ctx.beginPath();ctx.arc(cx,cy,R,0,7);ctx.fillStyle=g;ctx.fill();ctx.lineWidth=1.2;ctx.strokeStyle=col.edge;ctx.stroke();
  place();};
/* плашки: у точки языка, а если место занято — рядом, с тонкой линией к точке; выбранная и ближние к середине ставятся первыми */
const SLOTS=[[0,0],[0,-36],[0,36],[-1,0],[1,0],[-1,-30],[1,-30],[-1,30],[1,30]];
const place=()=>{const used=[],order=langs.map(l=>{const q=rot(...vec(...l.at));return{l,q};}).sort((a,b)=>(b.l===sel)-(a.l===sel)||(b.l.shown|0)-(a.l.shown|0)||b.q[2]-a.q[2]);
  ctx.beginPath();
  for(const {l,q} of order){const t=l.t;if(!l.w){l.w=t.offsetWidth;l.h=t.offsetHeight;}
    const x=cx+R*q[0],y=cy-R*q[1],a=Math.max(0,Math.min(1,(q[2]-.12)/.2));
    if(a<=0||x<-40||x>W+40||y<-20||y>H+20){l.shown=false;t.style.opacity=0;t.style.pointerEvents='none';continue;}
    const fits=s=>{const [sx,sy]=SLOTS[s],dx=sx===-1?-(l.w/2+14):sx===1?l.w/2+14:0,b={x:x+dx-l.w/2,y:y+sy-l.h/2,w:l.w,h:l.h};
      return b.x>=2&&b.x+b.w<=W-2&&b.y>=2&&b.y+b.h<=H-2&&used.every(u=>b.x+b.w+6<u.x||u.x+u.w+6<b.x||b.y+b.h+4<u.y||u.y+u.h+4<b.y)?b:null;};
    let s=l.slot,b=fits(s);if(!b)for(s=0;s<SLOTS.length&&!(b=fits(s));s++);
    if(!b){l.shown=false;t.style.opacity=0;t.style.pointerEvents='none';continue;}
    l.slot=s;l.shown=true;used.push(b);t.style.transform='translate('+b.x+'px,'+b.y+'px)';t.style.opacity=a;t.style.pointerEvents=a>.5?'auto':'none';
    t.classList.toggle('on',l===sel);
    ctx.moveTo(x+2.5,y);ctx.arc(x,y,2.5,0,7);if(s){ctx.moveTo(x,y);ctx.lineTo(b.x+b.w/2,b.y+b.h/2);}}
  ctx.fillStyle=ctx.strokeStyle=col.edge;ctx.lineWidth=1;ctx.globalAlpha=.7;ctx.fill();ctx.stroke();ctx.globalAlpha=1;};
const choose=(l,turn)=>{if(sel===l&&!turn)return;sel=l;langs.forEach(x=>x.b.setAttribute('aria-pressed',String(x===l)));
  if(turn){spin=false;const [lo,la]=l.at,from=[lam,phi],to=[lam+(((lo-lam)%360+540)%360-180),Math.max(-50,Math.min(50,la))];
    if(calm()){lam=to[0];phi=to[1];}else anim={from,to,t0:performance.now()};}dirty=true;};
/* какая страна под точкой экрана: обратная проекция и проверка контура */
const pick=(px,py)=>{const r=(px-cx)/R,u=-(py-cy)/R,dd=1-r*r-u*u;if(dd<0)return null;const d=Math.sqrt(dd);
  const x1=d*cp-u*sp,z=d*sp+u*cp,y1=r,x=x1*cl-y1*sl,y=x1*sl+y1*cl,lo=Math.atan2(y,x)/D,la=Math.asin(Math.max(-1,Math.min(1,z)))/D;
  for(const g of rings){if(!g.lang)continue;const f=g.ll;let c=false;for(let i=0,j=f.length-2;i<f.length;j=i,i+=2){const yi=f[i+1],yj=f[j+1];
    if((yi>la)!==(yj>la)&&lo<(f[j]-f[i])*(la-yi)/(yj-yi)+f[i])c=!c;}if(c)return g.lang;}return null;};
const middle=()=>{let best=null,bd=.8;for(const l of langs){const d=rot(...vec(...l.at))[2];if(d>bd){bd=d;best=l;}}if(best)choose(best,false);};
const tick=now=>{requestAnimationFrame(tick);if(!seen)return;
  if(anim){const p=Math.min(1,(now-anim.t0)/900),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;lam=anim.from[0]+(anim.to[0]-anim.from[0])*e;phi=anim.from[1]+(anim.to[1]-anim.from[1])*e;if(p>=1)anim=null;dirty=true;}
  else if(drag===null&&(Math.abs(vel)>.01||Math.abs(velY)>.01)){lam-=vel;phi=Math.max(-70,Math.min(70,phi+velY));vel*=.94;velY*=.94;middle();dirty=true;}
  else if(spin&&drag===null){lam+=.07;dirty=true;}
  if(dirty){dirty=false;draw();}};
let drag=null;const pts=new Map();
cv.addEventListener('pointerdown',e=>{pts.set(e.pointerId,[e.clientX,e.clientY]);cv.setPointerCapture(e.pointerId);
  const [p,q]=[...pts.values()];drag={x:e.clientX,y:e.clientY,moved:0,pinch:q?Math.hypot(p[0]-q[0],p[1]-q[1]):0,k};anim=null;vel=velY=0;});
cv.addEventListener('pointermove',e=>{const b=box.getBoundingClientRect();
  if(!drag){const h=pick(e.clientX-b.left,e.clientY-b.top);if(h!==hover){hover=h;cv.style.cursor=h?'pointer':'grab';dirty=true;}return;}
  pts.set(e.pointerId,[e.clientX,e.clientY]);
  if(pts.size>1){const [p,q]=[...pts.values()],d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(drag.pinch)zoom(drag.k*d/drag.pinch);drag.moved=99;return;}
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.moved+=Math.abs(dx)+Math.abs(dy);
  if(drag.moved>4){spin=false;vel=dx/R/D;velY=e.pointerType==='touch'?0:dy/R/D;lam-=vel;phi=Math.max(-70,Math.min(70,phi+velY));middle();dirty=true;}});
const up=e=>{pts.delete(e.pointerId);if(!drag)return;if(pts.size)return;
  if(drag.moved<=4){const b=box.getBoundingClientRect(),l=pick(e.clientX-b.left,e.clientY-b.top);if(l)choose(l,false);vel=velY=0;}
  drag=null;};
cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',e=>{pts.delete(e.pointerId);drag=null;vel=velY=0;});
cv.addEventListener('pointerleave',()=>{if(hover){hover=null;dirty=true;}});
const zoom=z=>{k=Math.max(1,Math.min(2.6,z));spin=false;dirty=true;};
cv.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();zoom(k*Math.exp(-e.deltaY*.002));},{passive:false});
box.querySelectorAll('[data-globe-zoom]').forEach(b=>b.addEventListener('click',()=>zoom(k*(b.dataset.globeZoom==='in'?1.35:1/1.35))));
langs.forEach(l=>{l.b.addEventListener('click',()=>choose(l,true));l.t.addEventListener('click',()=>choose(l,true));});
new ResizeObserver(size).observe(box);new IntersectionObserver(es=>es.forEach(e=>{seen=e.isIntersecting;dirty=true;})).observe(box);
colors();size();const first=langs.find(l=>l.b.getAttribute('aria-pressed')==='true')||langs[0];lam=first.at[0];choose(first,false);
requestAnimationFrame(tick);})();
