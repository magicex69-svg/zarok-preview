import { characters } from './site-data.js?v=3c9b9649eb';

const KEY='zarok.site.preferences.v1';
const themes=['porcelain','obsidian','cobalt','copper'];
const names={porcelain:'Porcelain',obsidian:'Obsidian',cobalt:'Cobalt',copper:'Copper'};
const media=window.matchMedia('(prefers-reduced-motion: reduce)');
const defaults={rememberDesign:false,rememberCharacter:false,reducedMotion:null};
let preferences={...defaults},material='porcelain',selected='root',emotion='idle',toastTimer;
try{
  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  if(stored&&typeof stored==='object'&&Number.isFinite(stored.updatedAt)&&Date.now()-stored.updatedAt<365*86400000){
    preferences={rememberDesign:stored.rememberDesign===true,rememberCharacter:stored.rememberCharacter===true,reducedMotion:typeof stored.reducedMotion==='boolean'?stored.reducedMotion:null};
    if(preferences.rememberDesign&&themes.includes(stored.material))material=stored.material;
    if(preferences.rememberCharacter&&characters.some(c=>c.id===stored.character))selected=stored.character;
  }else if(stored&&Number.isFinite(stored.updatedAt)&&Date.now()-stored.updatedAt>=365*86400000){localStorage.removeItem(KEY);}
}catch{}
const byId=id=>characters.find(c=>c.id===id);
const isReduced=()=>preferences.reducedMotion===true||media.matches;
const motionHooks=[];
function applyMotion(){document.documentElement.dataset.motion=isReduced()?'reduce':'normal';motionHooks.forEach(f=>f());}
function persist(){
  const record={...preferences,updatedAt:Date.now()};
  if(preferences.rememberDesign)record.material=material;
  if(preferences.rememberCharacter)record.character=selected;
  try{localStorage.setItem(KEY,JSON.stringify(record));return true;}catch{return false;}
}
function toast(text){const node=document.querySelector('.site-toast');node.textContent=text;node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),4000);}
function setMaterial(value,save=false){
  if(!themes.includes(value))return;
  material=value;document.documentElement.dataset.siteTheme=value;
  document.querySelector('meta[name="theme-color"]').content={porcelain:'#f6f4ee',obsidian:'#151914',cobalt:'#151e30',copper:'#281e1e'}[value];
  const control=document.querySelector('[data-cycle-theme]');if(control)control.setAttribute('aria-label','Site look: '+names[value]+'. Switch');
  if(save&&preferences.rememberDesign&&!persist())toast('Couldn’t save the look in this browser.');
}

const loaded=new Map(),queue=[];let running=0,rushing=0;
function pump(){
  for(let i=0;i<queue.length;){
    const job=queue[i];
    
    if(job.urgent?running<5:(rushing===0&&running<2)){queue.splice(i,1);running++;if(job.urgent)rushing++;job.start();}else i++;
  }
}
function load(src,urgent=false){
  if(!src)return Promise.reject();
  let job=loaded.get(src);
  if(job){
    
    if(urgent&&!job.urgent&&!job.started){job.urgent=true;const i=queue.indexOf(job);if(i>0){queue.splice(i,1);queue.unshift(job);}pump();}
    return job.ready;
  }
  job={urgent,started:false,done:false};
  job.ready=new Promise((ok,fail)=>{
    job.start=()=>{
      job.started=true;const im=new Image();im.decoding='async';im.draggable=false;if(job.urgent)im.fetchPriority='high';
      
      const free=()=>{running--;if(job.rushed)rushing--;};job.rushed=job.urgent;
      im.onload=()=>{job.done=true;free();ok(src);pump();if(im.decode)im.decode().catch(()=>{});};
      im.onerror=()=>{loaded.delete(src);free();fail();pump();};
      im.src=src;job.im=im;
    };
  });
  job.ready.catch(()=>{});
  loaded.set(src,job);if(urgent)queue.unshift(job);else queue.push(job);pump();
  return job.ready;
}
const isLoaded=src=>loaded.get(src)?.done===true;
let portraitTurn=0;
function showPortrait(img,c){
  const big=c.images[emotion],light=c.small?.[emotion],turn=++portraitTurn,stage=img.closest('.character-stage');
  img.alt='Zarok '+c.name+', '+c.animal.toLowerCase();
  const put=src=>{if(turn!==portraitTurn)return;if(img.getAttribute('src')!==src)img.src=src;stage?.classList.remove('is-loading');};
  if(isLoaded(big)){put(big);return;}
  if(isLoaded(light))put(light);
  else{
    
    stage?.classList.add('is-loading');
    if(light)load(light,true).then(src=>{if(!isLoaded(big))put(src);}).catch(()=>{});
  }
  load(big,true).then(put).catch(()=>{if(turn===portraitTurn){if(!light)img.src=big;stage?.classList.remove('is-loading');}});
}

function warm(c){if(!c)return;Object.values(c.small||{}).forEach(src=>load(src).catch(()=>{}));}
function updateCharacter(value,save=false){
  const c=byId(value);if(!c)return;selected=value;
  document.querySelectorAll('.character-gallery').forEach(g=>{
    g.style.setProperty('--character-color',c.color);
    
    const put=(sel,text)=>{const n=g.querySelector(sel);if(n)n.textContent=text;};
    put('[data-character-number]','FORM '+c.number+' / VII');put('[data-character-tone]',c.tone);put('[data-character-origin]',c.level+' · '+c.chakra);
    put('[data-character-name]',c.name);put('[data-character-lead]',c.lead);put('[data-character-quote]','“'+c.tag+'”');put('[data-character-story]',c.story);
    const list=g.querySelector('[data-character-details]');if(list)list.replaceChildren(...c.details.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
    showPortrait(g.querySelector('.character-portrait'),c);
  });
  warm(c);
  document.querySelectorAll('[data-character]').forEach(b=>{const on=b.dataset.character===value;b.classList.toggle('selected',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  if(save){history.replaceState(null,'','#'+value);if(preferences.rememberCharacter&&!persist())toast('Couldn’t save your chosen Zarok.');}
}

function setCharacter(value,save=true){updateCharacter(value,save);}
setMaterial(material);applyMotion();
media.addEventListener?.('change',applyMotion);
const incoming=location.hash.slice(1);if(byId(incoming))selected=incoming;
if(document.querySelector('.character-gallery')){
  updateCharacter(selected);
  if(byId(incoming))requestAnimationFrame(()=>document.querySelector('.character-section').scrollIntoView({behavior:'instant'}));
  
  const idle=window.requestIdleCallback||(f=>setTimeout(f,400));
  idle(()=>characters.forEach(c=>Object.values(c.small||{}).forEach(src=>load(src).catch(()=>{}))));
}
document.querySelector('[data-cycle-theme]')?.addEventListener('click',()=>{setMaterial(themes[(themes.indexOf(material)+1)%themes.length],true);toast('Look: '+names[material]);});
document.querySelectorAll('[data-character]').forEach(b=>{
  
  const ahead=()=>{const c=byId(b.dataset.character);if(c){load(c.small?.[emotion],true).catch(()=>{});load(c.images[emotion],true).catch(()=>{});}};
  b.addEventListener('pointerenter',ahead);b.addEventListener('pointerdown',ahead);b.addEventListener('focus',ahead);
  b.addEventListener('click',()=>setCharacter(b.dataset.character));
  b.addEventListener('keydown',e=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();
    const i=characters.findIndex(c=>c.id===selected);
    const next=e.key==='Home'?0:e.key==='End'?characters.length-1:(i+(e.key==='ArrowRight'?1:-1)+characters.length)%characters.length;
    const target=document.querySelector('[data-character="'+characters[next].id+'"]');
    setCharacter(characters[next].id);target.focus({preventScroll:true});target.scrollIntoView({block:'nearest',inline:'nearest'});
  });
});
document.querySelectorAll('[data-emotion]').forEach(b=>{const ahead=()=>{const c=byId(selected),e=b.dataset.emotion;if(c&&c.images[e]){load(c.small?.[e],true).catch(()=>{});load(c.images[e],true).catch(()=>{});}};b.addEventListener('pointerenter',ahead);b.addEventListener('pointerdown',ahead);b.addEventListener('focus',ahead);});
document.querySelectorAll('[data-emotion]').forEach(b=>b.addEventListener('click',()=>{
  emotion=b.dataset.emotion;if(!byId(selected).images[emotion])return;
  document.querySelectorAll('[data-emotion]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
  updateCharacter(selected);
}));
document.querySelector('[data-share-character]')?.addEventListener('click',async()=>{
  const url=location.origin+(document.documentElement.lang==='ru'?'/zarok-preview/ru':'')+'/zarok-preview/characters#'+selected;
  try{
    if(navigator.share){await navigator.share({title:'Zarok '+byId(selected).name,url});return;}
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);toast('Link to this Zarok copied.');return;}
    toast('Open the address bar to copy the link to this Zarok.');
  }catch(e){if(e.name!=='AbortError')toast('Couldn’t share. The link to the character is in the address bar.');}
});


const hero=document.querySelector('[data-hero-demo]');
if(hero){
  const art=hero.querySelector('.hero-art'),ui=hero.querySelector('[data-hero-ui]'),fit=()=>ui.style.setProperty('--s',art.clientWidth/2688);
  fit();if('ResizeObserver' in window)new ResizeObserver(fit).observe(art);else addEventListener('resize',fit);
  const date=hero.querySelector('[data-hero-date]');try{date.textContent=new Date().toLocaleDateString(document.documentElement.lang||'ru',{day:'numeric',month:'long'});}catch(e){}
  const task=hero.querySelector('[data-hero-task]'),count=hero.querySelector('[data-hero-count]'),bar=hero.querySelector('[data-hero-bar]');let timer=0,on=false;
  const set=v=>{on=v;task.classList.toggle('done',v);count.textContent=v?'3':'2';bar.style.width=v?'75%':'50%';};
  const tick=()=>{set(!on);timer=setTimeout(tick,on?3800:2600);};
  const run=()=>{clearTimeout(timer);set(false);if(!isReduced())timer=setTimeout(tick,1800);};
  motionHooks.push(run);run();
  const scrolled=()=>document.documentElement.classList.toggle('is-scrolled',scrollY>hero.offsetHeight*.6);
  scrolled();addEventListener('scroll',scrolled,{passive:true});
}

const day=document.querySelector('[data-day]');
if(day){
  const tabs=[...day.querySelectorAll('[data-day-step]')],skies=[...day.querySelectorAll('.day-sky')],screens=[...day.querySelectorAll('.day-screen')];
  const caps=[...day.querySelectorAll('.day-captions>span')].map(n=>n.textContent),cap=day.querySelector('.day-caption'),zork=day.querySelector('.day-zarok'),poses=zork.dataset.dayPoses.split(' ');
  let step=0,timer=0,held=false,seen=false;
  const show=i=>{step=i;tabs.forEach((t,k)=>{t.setAttribute('aria-selected',String(k===i));t.tabIndex=k===i?0:-1;});skies.forEach((n,k)=>n.classList.toggle('on',k===i));screens.forEach((n,k)=>n.hidden=k!==i);cap.textContent=caps[i];cap.setAttribute('aria-labelledby',tabs[i].id);zork.src=poses[i];};
  const plan=()=>{clearTimeout(timer);if(!held&&seen&&!isReduced())timer=setTimeout(()=>{show((step+1)%tabs.length);plan();},4200);};
  tabs.forEach((t,i)=>{t.addEventListener('click',()=>{held=true;clearTimeout(timer);show(i);});
    t.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const n=(i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)+tabs.length)%tabs.length;held=true;clearTimeout(timer);show(n);tabs[n].focus();});});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{seen=es[0].isIntersecting;if(seen)poses.forEach(src=>load(src).catch(()=>{}));plan();},{threshold:.35}).observe(day);
  motionHooks.push(plan);
}
const tasks=[true,true,false,false];
function updateProgress(){
  const count=tasks.filter(Boolean).length;
  const label=document.querySelector('[data-demo-count]');if(label)label.innerHTML=count+' <small>/ 4</small>';
  document.querySelectorAll('[data-demo-bar],[data-widget-bar]').forEach(b=>b.style.width=count/4*100+'%');
  const widget=document.querySelector('[data-widget-count]');if(widget)widget.textContent=count+' / 4';
  const caption=document.querySelector('.demo-summary p');if(caption)caption.textContent=count===4?'Important stuff done. You can breathe easy.':count===0?'Start with one small step.':'Already something to smile about.';
}
document.querySelectorAll('[data-demo-task]').forEach(b=>b.addEventListener('click',()=>{
  const i=+b.dataset.demoTask;tasks[i]=!tasks[i];b.classList.toggle('complete',tasks[i]);b.setAttribute('aria-pressed',String(tasks[i]));b.querySelector('.demo-check').textContent=tasks[i]?'✓':'';b.querySelector('i').textContent=tasks[i]?'Done':'Check off';updateProgress();
}));
document.querySelectorAll('[data-demo-view]').forEach(b=>b.addEventListener('click',()=>{
  const key=b.dataset.demoView;document.querySelectorAll('[data-demo-view]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
  document.querySelectorAll('[data-demo-panel]').forEach(n=>n.hidden=n.dataset.demoPanel!==key);
}));
document.querySelectorAll('button[data-demo-material]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelector('.demo-shell').dataset.demoMaterial=b.dataset.demoMaterial;document.querySelectorAll('button[data-demo-material]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
}));
document.querySelectorAll('[data-calendar-day]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-calendar-day]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
  document.querySelector('[data-calendar-caption]').textContent=b.dataset.calendarDay+' October · walk and reading';
}));
document.querySelectorAll('[data-billing]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-billing]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
  const yr=b.dataset.billing==='year',pr=document.querySelector('[data-price-month]'),nt=document.querySelector('[data-billing-note]');
  if(pr)pr.textContent=yr?pr.dataset.priceYear:pr.dataset.priceMonth;
  if(nt)nt.textContent=yr?nt.dataset.noteYear:nt.dataset.noteMonth;
}));

const menu=document.querySelector('#site-nav'),menuToggle=document.querySelector('.menu-toggle');
function closeMenu(){menu.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Open menu');}
menuToggle?.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close menu':'Open menu');});
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open')){closeMenu();menuToggle.focus();}});

const dialog=document.getElementById('privacy-dialog');let privacyTrigger;
document.querySelectorAll('[data-privacy-open]').forEach(b=>b.addEventListener('click',()=>{
  privacyTrigger=b;document.getElementById('pref-design').checked=preferences.rememberDesign;document.getElementById('pref-character').checked=preferences.rememberCharacter;document.getElementById('pref-motion').checked=isReduced();dialog.showModal();
}));
document.querySelector('[data-dialog-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>privacyTrigger?.focus({preventScroll:true}));
document.querySelector('[data-preferences-save]').addEventListener('click',()=>{
  preferences={rememberDesign:document.getElementById('pref-design').checked,rememberCharacter:document.getElementById('pref-character').checked,reducedMotion:document.getElementById('pref-motion').checked};
  applyMotion();const ok=persist();dialog.close();toast(ok?'Your choice is saved on this device.':'Choice applied. The browser didn’t allow saving it.');
});
document.querySelector('[data-preferences-essential]').addEventListener('click',()=>{
  preferences={...defaults};applyMotion();const ok=persist();dialog.close();toast(ok?'The look and Zarok won’t be remembered.':'The look and Zarok aren’t remembered; saving the choice isn’t available.');
});
document.querySelector('[data-preferences-reset]').addEventListener('click',()=>{
  let ok=true;try{localStorage.removeItem(KEY);}catch{ok=false;}
  preferences={...defaults};setMaterial('porcelain');selected='root';emotion='idle';
  if(document.querySelector('.character-gallery')){
    updateCharacter(selected);document.querySelectorAll('[data-emotion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.emotion==='idle')));
    if(byId(location.hash.slice(1)))history.replaceState(null,'',location.pathname+location.search);
  }
  applyMotion();dialog.close();toast(ok?'Saved site settings deleted.':'Settings reset on this page; the browser didn’t allow deleting the saved data.');
});
if('IntersectionObserver' in window&&!isReduced()){
  document.body.classList.add('js-ready');const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}});},{threshold:.08});document.querySelectorAll('.reveal').forEach(n=>observer.observe(n));
}


(function guardImages(){
  const mark=function(n){if(n&&n.tagName==='IMG')n.draggable=false;};
  document.querySelectorAll('img').forEach(mark);
  new MutationObserver(function(list){list.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;mark(n);if(n.querySelectorAll)n.querySelectorAll('img').forEach(mark);});});}).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('contextmenu',function(e){if(e.target&&e.target.tagName==='IMG')e.preventDefault();});
  document.addEventListener('dragstart',function(e){if(e.target&&e.target.tagName==='IMG')e.preventDefault();});
})();


document.addEventListener('click',async function(e){
  const b=e.target.closest&&e.target.closest('[data-copy]');if(!b)return;
  try{await navigator.clipboard.writeText(b.getAttribute('data-copy'));b.textContent=b.getAttribute('data-copied-label');setTimeout(function(){b.textContent=b.getAttribute('data-copy-label');},1600);}catch(err){}
});


document.addEventListener('click',function(e){
  const a=e.target.closest&&e.target.closest('a.lang-switch[hreflang]');if(!a)return;
  document.cookie='zarok_lang='+a.getAttribute('hreflang')+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
});
(function(){
  try{if(/(?:^|;\s*)zarok_lang=/.test(document.cookie))return;}catch{return;}
  const sw=document.querySelector('.site-header a.lang-switch[data-suggest]');if(!sw)return;
  
  const tag=String((navigator.languages&&navigator.languages[0])||navigator.language||'').toLowerCase().split('_').join('-').split('-');
  const l=tag[0],r=tag.slice(1).find(x=>/^[a-z]{2}$/.test(x))||'';
  const ours=['en','uk','es','pt','id','in','de','fr'],toOurs={ua:1,id:1,br:1,pt:1,de:1,at:1,ch:1,fr:1,be:1,es:1,mx:1,ar:1,co:1,cl:1,pe:1,ve:1,ec:1,gt:1,cu:1,bo:1,do:1,hn:1,py:1,sv:1,ni:1,cr:1,pa:1,uy:1,pr:1};
  const cis=['be','kk','ky','uz','tg','tk','hy','az','ka','mo'],cisR=['ru','by','kz','kg','uz','tj','tm','am','az','ge','md'];
  const want=!l?'':l==='ru'?'ru':ours.includes(l)||toOurs[r]?'en':cis.includes(l)||cisR.includes(r)?'ru':'en';
  if(!want||want!==sw.getAttribute('hreflang'))return;
  const bar=document.createElement('div');bar.className='lang-suggest';bar.setAttribute('role','note');
  const go=document.createElement('a');go.href=sw.getAttribute('href');go.setAttribute('hreflang',want);go.lang=want;go.className='lang-switch';go.textContent=sw.dataset.suggest+' →';
  const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label','OK');x.addEventListener('click',()=>bar.remove());
  bar.append(go,x);document.body.prepend(bar);
})();


(function themeFlow(){
  const root=document.querySelector('[data-tf]');if(!root)return;
  const track=root.querySelector('[data-tf-track]'),cards=[...track.querySelectorAll('[data-tf-card]')],n=cards.length;if(!n)return;
  const nowName=root.querySelector('[data-tf-now]'),nowKind=root.querySelector('[data-tf-kind]');
  let pos=Number(root.dataset.tfStart)||0,drag=null,moved=false;
  const near=d=>{d=((d%n)+n)%n;return d>n/2?d-n:d;};
  const current=()=>((Math.round(pos)%n)+n)%n;
  function layout(){
    const flat=isReduced();root.classList.toggle('tf-flat',flat);
    cards.forEach((c,i)=>{
      const d=near(i-pos),a=Math.abs(d),s=Math.sign(d);let t,o;
      if(flat){t='translateX('+(d*108)+'%)';o=a>2.6?0:1;}
      else{
        const x=s*(Math.min(a,1)*80+Math.max(0,Math.min(a,3)-1)*42);
        t='translateX('+x+'%) translateZ('+(-Math.min(a,3)*150)+'px) rotateY('+(-s*Math.min(a,1)*38)+'deg) scale('+(1-Math.min(a,3)*.05)+')';
        o=a>3.4?0:a>2.6?(3.4-a)/.8:1;
      }
      c.style.transform=t;c.style.opacity=String(o);c.style.zIndex=String(100-Math.round(a*10));
      c.style.setProperty('--dim',String(Math.min(a,2.5)*(flat?.16:.26)));
      const center=a<.5;
      c.classList.toggle('is-center',center);c.setAttribute('aria-hidden',String(a>=.5));
    });
    const c=cards[current()];
    if(nowName)nowName.textContent=c.dataset.tfName;
    if(nowKind){const plus=c.dataset.tfPlus==='1';nowKind.textContent=nowKind.dataset[plus?'plus':'free'];nowKind.classList.toggle('is-plus',plus);}
  }
  function go(to){pos=to;layout();}
  root.classList.add('tf-ready');layout();
  motionHooks.push(layout);
  root.querySelector('[data-tf-prev]')?.addEventListener('click',()=>go(Math.round(pos)-1));
  root.querySelector('[data-tf-next]')?.addEventListener('click',()=>go(Math.round(pos)+1));
  root.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'){e.preventDefault();go(Math.round(pos)-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();go(Math.round(pos)+1);}
  });
  cards.forEach((c,i)=>c.addEventListener('click',()=>{if(moved)return;const d=near(i-pos);if(Math.abs(d)>=.5)go(Math.round(pos)+Math.round(d));}));
  
  track.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    drag={x:e.clientX,y:e.clientY,pos,w:cards[0].offsetWidth*(isReduced()?1.08:.64)||200,t:performance.now(),lx:e.clientX,v:0,on:false};moved=false;
  });
  track.addEventListener('pointermove',e=>{
    if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.on){if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy))return;drag.on=true;moved=true;root.classList.add('is-drag');try{track.setPointerCapture(e.pointerId);}catch{}}
    const now=performance.now();drag.v=(e.clientX-drag.lx)/Math.max(1,now-drag.t);drag.lx=e.clientX;drag.t=now;
    pos=drag.pos-dx/drag.w;layout();
  });
  const end=()=>{
    if(!drag)return;const was=drag;drag=null;root.classList.remove('is-drag');
    if(was.on){const fling=Math.max(-2,Math.min(2,-was.v*.9));go(Math.round(pos+fling));setTimeout(()=>{moved=false;},0);}
  };
  track.addEventListener('pointerup',end);track.addEventListener('pointercancel',end);
})();
