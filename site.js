const KEY='zarok.site.preferences.v1';
const themes=['porcelain','obsidian','cobalt','copper'];
const names={porcelain:'Фарфор',obsidian:'Обсидиан',cobalt:'Кобальт',copper:'Медь'};
const media=window.matchMedia('(prefers-reduced-motion: reduce)');
const defaults={rememberDesign:false,reducedMotion:null};
let preferences={...defaults},material='porcelain',toastTimer;
try{
  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  if(stored&&typeof stored==='object'&&Number.isFinite(stored.updatedAt)&&Date.now()-stored.updatedAt<365*86400000){
    preferences={rememberDesign:stored.rememberDesign===true,reducedMotion:typeof stored.reducedMotion==='boolean'?stored.reducedMotion:null};
    if(preferences.rememberDesign&&themes.includes(stored.material))material=stored.material;
  }else if(stored&&Number.isFinite(stored.updatedAt)&&Date.now()-stored.updatedAt>=365*86400000){localStorage.removeItem(KEY);}
}catch{}
const isReduced=()=>preferences.reducedMotion===true||media.matches;
const motionHooks=[];
function applyMotion(){document.documentElement.dataset.motion=isReduced()?'reduce':'normal';motionHooks.forEach(f=>f());}
function persist(){
  const record={...preferences,updatedAt:Date.now()};
  if(preferences.rememberDesign)record.material=material;
  try{localStorage.setItem(KEY,JSON.stringify(record));return true;}catch{return false;}
}
function toast(text){const node=document.querySelector('.site-toast');node.textContent=text;node.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('visible'),4000);}
function setMaterial(value,save=false){
  if(!themes.includes(value))return;
  material=value;document.documentElement.dataset.siteTheme=value;
  document.querySelector('meta[name="theme-color"]').content={porcelain:'#f6f4ee',obsidian:'#151914',cobalt:'#151e30',copper:'#281e1e'}[value];
  const control=document.querySelector('[data-cycle-theme]');if(control)control.setAttribute('aria-label','Оформление сайта: '+names[value]+'. Переключить');
  if(save&&preferences.rememberDesign&&!persist())toast('Не удалось сохранить оформление в этом браузере.');
}
setMaterial(material);applyMotion();
media.addEventListener?.('change',applyMotion);
document.querySelector('[data-cycle-theme]')?.addEventListener('click',()=>{setMaterial(themes[(themes.indexOf(material)+1)%themes.length],true);toast('Оформление: '+names[material]);});

/* Картинки с телефоном (первый экран, «Один день»): кадр 2688 px по ширине, экран-вёрстка стоит по углам (matrix3d) и масштабируется с кадром */
document.querySelectorAll('[data-phone-art]').forEach(art=>{const ui=art.querySelector('.hero-ui'),fit=()=>ui.style.setProperty('--s',art.clientWidth/2688);
  fit();if('ResizeObserver' in window)new ResizeObserver(fit).observe(art);else addEventListener('resize',fit);});
/* первый экран главной: экран «Сегодня» в вырезе картинки — масштаб по ширине выреза, дата, третье дело отмечается само и растёт прогресс
   (при «меньше движения» стоит); шапка на первом экране узкая и разворачивается с прокруткой */
/* подпись под знаком «Зарок» — не шире самого слова: курсив с засечками системный и у разных компьютеров разной ширины */
const heroMark=document.querySelector('.hero-mark'),heroTag=document.querySelector('.hero-tag');
if(heroMark&&heroTag&&heroMark.firstChild){const fitTag=()=>{heroTag.style.fontSize='';if(getComputedStyle(heroTag).whiteSpace!=='nowrap')return;
  const r=document.createRange();r.selectNodeContents(heroMark.firstChild);const want=r.getBoundingClientRect().width*.9,has=heroTag.scrollWidth;
  if(has>want)heroTag.style.fontSize=(parseFloat(getComputedStyle(heroTag).fontSize)*want/has).toFixed(1)+'px';};
  fitTag();addEventListener('resize',fitTag);if(document.fonts)document.fonts.ready.then(fitTag);}
const hero=document.querySelector('[data-hero-demo]');
if(hero){
  const date=hero.querySelector('[data-hero-date]');try{date.textContent=new Date().toLocaleDateString(document.documentElement.lang||'ru',{day:'numeric',month:'long'});}catch(e){}
  const task=hero.querySelector('[data-hero-task]'),count=hero.querySelector('[data-hero-count]'),bar=hero.querySelector('[data-hero-bar]');let timer=0,on=false;
  const set=v=>{on=v;task.classList.toggle('done',v);count.textContent=v?'3':'2';bar.style.width=v?'75%':'50%';};
  const tick=()=>{set(!on);timer=setTimeout(tick,on?3800:2600);};
  const run=()=>{clearTimeout(timer);set(false);if(!isReduced())timer=setTimeout(tick,1800);};
  motionHooks.push(run);run();
  /* шапка разворачивается вместе с прокруткой первого экрана: --hp от 0 (узкая плашка) до 1 (полная шапка) */
  let raf=0;const grow=()=>{raf=0;document.documentElement.style.setProperty('--hp',Math.min(1,Math.max(0,scrollY/(hero.offsetHeight*.6))).toFixed(3));};
  grow();addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(grow);},{passive:true});addEventListener('resize',grow);
}
/* «Один день с Зароком» на главной: утро, задачи, привычки, вечер — у каждого своя сцена во весь блок. Шаги идут сами, пока блок на экране и никто не нажимал; при «меньше движения» — только по нажатию */
const day=document.querySelector('[data-day]');
if(day){
  const tabs=[...day.querySelectorAll('[data-day-step]')],arts=[...day.querySelectorAll('.day-art')];
  const caps=[...day.querySelectorAll('.day-captions>span')].map(n=>n.textContent),cap=day.querySelector('.day-caption');
  let step=0,timer=0,held=false,seen=false;
  const show=i=>{step=i;tabs.forEach((t,k)=>{t.setAttribute('aria-selected',String(k===i));t.tabIndex=k===i?0:-1;});arts.forEach((n,k)=>n.classList.toggle('on',k===i));cap.textContent=caps[i];cap.setAttribute('aria-labelledby',tabs[i].id);};
  const plan=()=>{clearTimeout(timer);if(!held&&seen&&!isReduced())timer=setTimeout(()=>{show((step+1)%tabs.length);plan();},4200);};
  tabs.forEach((t,i)=>{t.addEventListener('click',()=>{held=true;clearTimeout(timer);show(i);});
    t.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const n=(i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)+tabs.length)%tabs.length;held=true;clearTimeout(timer);show(n);tabs[n].focus();});});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{seen=es[0].isIntersecting;plan();},{threshold:.35}).observe(day);
  motionHooks.push(plan);
}
/* «Семь Зароков»: подпись Зарока по касанию (на телефоне нет наведения); одна открыта за раз, касание мимо — закрывает */
const sevenStage=document.querySelector('[data-seven]');
if(sevenStage){
  const tags=[...sevenStage.querySelectorAll('.seven-tag')];
  tags.forEach(t=>t.addEventListener('click',e=>{e.stopPropagation();const was=t.classList.contains('open');tags.forEach(x=>x.classList.remove('open'));t.classList.toggle('open',!was);}));
  document.addEventListener('click',()=>tags.forEach(x=>x.classList.remove('open')));
}
/* «Семь Зароков» на главной: видео по кругу идёт, только пока блок на экране; при «меньше движения» остаётся кадр */
const seven=document.querySelector('[data-seven-video]');
if(seven){
  let shown=false;
  const sync=()=>{if(shown&&!isReduced()){seven.play().then(()=>seven.classList.add('on')).catch(()=>seven.addEventListener('canplay',sync,{once:true}));}else seven.pause();};
  if('IntersectionObserver' in window){
    /* за экран до блока видео начинает загружаться, чтобы к появлению оно уже шло, а не показывало только кадр */
    new IntersectionObserver((es,o)=>{if(es[0].isIntersecting&&!isReduced()){seven.preload='auto';o.disconnect();}},{rootMargin:'100% 0px'}).observe(seven);
    new IntersectionObserver(es=>{shown=es[0].isIntersecting;sync();},{threshold:.15}).observe(seven);
  }
  motionHooks.push(sync);
}
const tasks=[true,true,false,false];
function updateProgress(){
  const count=tasks.filter(Boolean).length;
  const label=document.querySelector('[data-demo-count]');if(label)label.innerHTML=count+' <small>/ 4</small>';
  document.querySelectorAll('[data-demo-bar],[data-widget-bar]').forEach(b=>b.style.width=count/4*100+'%');
  const widget=document.querySelector('[data-widget-count]');if(widget)widget.textContent=count+' / 4';
  const caption=document.querySelector('.demo-summary p');if(caption)caption.textContent=count===4?'Всё важное сделано. Можно выдохнуть.':count===0?'Начните с одного небольшого шага.':'Уже есть повод порадоваться.';
}
document.querySelectorAll('[data-demo-task]').forEach(b=>b.addEventListener('click',()=>{
  const i=+b.dataset.demoTask;tasks[i]=!tasks[i];b.classList.toggle('complete',tasks[i]);b.setAttribute('aria-pressed',String(tasks[i]));b.querySelector('.demo-check').textContent=tasks[i]?'✓':'';b.querySelector('i').textContent=tasks[i]?'Сделано':'Отметить';updateProgress();
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
  document.querySelector('[data-calendar-caption]').textContent=b.dataset.calendarDay+' октября · прогулка и чтение';
}));
document.querySelectorAll('[data-billing]').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('[data-billing]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));
  const yr=b.dataset.billing==='year',pr=document.querySelector('[data-price-month]'),nt=document.querySelector('[data-billing-note]');
  if(pr)pr.textContent=yr?pr.dataset.priceYear:pr.dataset.priceMonth;
  if(nt)nt.textContent=yr?nt.dataset.noteYear:nt.dataset.noteMonth;
}));

const menu=document.querySelector('#site-nav'),menuToggle=document.querySelector('.menu-toggle');
function closeMenu(){menu.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Открыть меню');}
menuToggle?.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');});
menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu.classList.contains('open')){closeMenu();menuToggle.focus();}});

const dialog=document.getElementById('privacy-dialog');let privacyTrigger;
document.querySelectorAll('[data-privacy-open]').forEach(b=>b.addEventListener('click',()=>{
  privacyTrigger=b;document.getElementById('pref-design').checked=preferences.rememberDesign;document.getElementById('pref-motion').checked=isReduced();dialog.showModal();
}));
document.querySelector('[data-dialog-close]').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>privacyTrigger?.focus({preventScroll:true}));
document.querySelector('[data-preferences-save]').addEventListener('click',()=>{
  preferences={rememberDesign:document.getElementById('pref-design').checked,reducedMotion:document.getElementById('pref-motion').checked};
  applyMotion();const ok=persist();dialog.close();toast(ok?'Ваш выбор сохранён на этом устройстве.':'Выбор применён. Браузер не разрешил сохранить его.');
});
document.querySelector('[data-preferences-essential]').addEventListener('click',()=>{
  preferences={...defaults};applyMotion();const ok=persist();dialog.close();toast(ok?'Оформление не будет запоминаться.':'Оформление не запоминается; сохранение выбора недоступно.');
});
document.querySelector('[data-preferences-reset]').addEventListener('click',()=>{
  let ok=true;try{localStorage.removeItem(KEY);}catch{ok=false;}
  preferences={...defaults};setMaterial('porcelain');
  applyMotion();dialog.close();toast(ok?'Сохранённые настройки сайта удалены.':'Настройки сброшены на странице; браузер не разрешил удалить сохранение.');
});
if('IntersectionObserver' in window&&!isReduced()){
  document.body.classList.add('js-ready');const observer=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');observer.unobserve(e.target);}});},{threshold:.08});document.querySelectorAll('.reveal').forEach(n=>observer.observe(n));
}

/* Рисунки сайта: без перетаскивания и меню «Сохранить картинку». Порог от случайного копирования, не замок. */
(function guardImages(){
  const mark=function(n){if(n&&n.tagName==='IMG')n.draggable=false;};
  document.querySelectorAll('img').forEach(mark);
  new MutationObserver(function(list){list.forEach(function(m){m.addedNodes.forEach(function(n){if(n.nodeType!==1)return;mark(n);if(n.querySelectorAll)n.querySelectorAll('img').forEach(mark);});});}).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('contextmenu',function(e){if(e.target&&e.target.tagName==='IMG')e.preventDefault();});
  document.addEventListener('dragstart',function(e){if(e.target&&e.target.tagName==='IMG')e.preventDefault();});
})();

/* копирование команд подключения ИИ-клиентов (страница /mcp-guide): подпись кнопки меняется на короткое время */
document.addEventListener('click',async function(e){
  const b=e.target.closest&&e.target.closest('[data-copy]');if(!b)return;
  try{await navigator.clipboard.writeText(b.getAttribute('data-copy'));b.textContent=b.getAttribute('data-copied-label');setTimeout(function(){b.textContent=b.getAttribute('data-copy-label');},1600);}catch(err){}
});

/* Язык сайта (с 18 октября 2026: английский в корне, русский под /ru/). Выбор в переключателе запоминается в cookie zarok_lang
   на год: с ней сервер открывает старые адреса сразу на выбранном языке, а страница подключения ИИ-клиента и письма без аккаунта
   говорят на нём же. Это не слежка, а настройка, которую человек выбрал сам. Строки «Этот сайт есть и на …» сверху нет (решение владельца, 26 октября 2026):
   кто открыл английскую версию, видит только английскую, и наоборот; сменить язык можно переключателем в шапке. */
document.addEventListener('click',function(e){
  const a=e.target.closest&&e.target.closest('a.lang-switch[hreflang]');if(!a)return;
  document.cookie='zarok_lang='+a.getAttribute('hreflang')+'; Path=/; Max-Age=31536000; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'');
});

/* Витрина тем на странице «Зароки» (19 октября 2026): карточки в перспективе, средняя — крупно и впереди, соседние повёрнуты и приглушены.
   Стрелки в плашке, перетаскивание мышью и пальцем, клавиши ← →, нажатие на соседнюю карточку. Положение — дробное число (pos),
   при перетаскивании меняется плавно, при отпускании встаёт на ближайшую карточку. Анимируются только transform и opacity.
   Со сниженной анимацией — плоская лента без поворотов и без плавности; без скрипта — обычная лента с прокруткой. */
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
  /* перетаскивание: ширина карточки — шаг; быстрый взмах добавляет ещё одну-две карточки */
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

/* меню «Открыть приложение»: закрывается по касанию мимо и по Esc */
document.querySelectorAll('.open-menu,.lang-menu').forEach(m=>{
  document.addEventListener('click',e=>{if(m.open&&!m.contains(e.target))m.open=false;});
  m.addEventListener('keydown',e=>{if(e.key==='Escape'&&m.open){m.open=false;m.querySelector('summary').focus();}});
});

/* «Возможности»: проигрыватель — вкладка меняет описание и экран в телефоне; стрелками ↑↓←→ по вкладкам */
document.querySelectorAll('[data-fx]').forEach(fx=>{
  const tabs=[...fx.querySelectorAll('[data-fx-tab]')],panes=[...fx.querySelectorAll('.fx-pane')],shots=[...fx.querySelectorAll('[data-fx-shot]')];
  const show=i=>{tabs.forEach((t,k)=>{t.setAttribute('aria-selected',String(k===i));t.tabIndex=k===i?0:-1;});panes.forEach((p,k)=>p.hidden=k!==i);shots.forEach((s,k)=>s.classList.toggle('on',k===i));};
  tabs.forEach((t,i)=>{t.addEventListener('click',()=>show(i));
    t.addEventListener('keydown',e=>{const d={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.key];if(!d)return;e.preventDefault();const n=(i+d+tabs.length)%tabs.length;show(n);tabs[n].focus();});});
});
/* «Сначала ваши слова»: разговор проигрывается, пока блок на экране — фраза набирается в поле, уходит, приходят ответ и план,
   галочки отмечаются, «Применить», «Готово»; пауза и заново. При «меньше движения» виден итог (без класса run) */
document.querySelectorAll('[data-ai-chat]').forEach(chat=>{
  const steps=[...chat.querySelectorAll('[data-ai-step]')].sort((a,b)=>a.dataset.aiStep-b.dataset.aiStep),field=chat.querySelector('[data-ai-typing]'),text=steps[0].textContent;
  let timers=[],shown=false,running=false;
  const at=(ms,f)=>timers.push(setTimeout(f,ms));
  const stop=()=>{timers.forEach(clearTimeout);timers=[];running=false;chat.classList.remove('run');steps.forEach(s=>s.classList.remove('in'));field.textContent='';};
  const play=()=>{
    stop();if(!shown||isReduced())return;running=true;chat.classList.add('run');
    let t=500;[...text].forEach((ch,i)=>at(t+=45,()=>{field.textContent=text.slice(0,i+1);}));
    at(t+=500,()=>{field.textContent='';steps[0].classList.add('in');});
    [900,900,700,600,900,900].forEach((d,k)=>at(t+=d,()=>steps[k+1].classList.add('in')));
    at(t+=4200,play);
  };
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{shown=es[0].isIntersecting;if(shown&&!running)play();else if(!shown)stop();},{threshold:.35}).observe(chat);
  motionHooks.push(()=>{if(isReduced())stop();else if(shown&&!running)play();});
});
