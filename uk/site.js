import { characters } from './site-data.js?v=1940f73aff';

const KEY='zarok.site.preferences.v1';
const themes=['porcelain','obsidian','cobalt','copper'];
const names={porcelain:'Порцеляна',obsidian:'Обсидіан',cobalt:'Кобальт',copper:'Мідь'};
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
  const control=document.querySelector('[data-cycle-theme]');if(control)control.setAttribute('aria-label','Оформлення сайту: '+names[value]+'. Перемкнути');
  if(save&&preferences.rememberDesign&&!persist())toast('Не вдалося зберегти оформлення в цьому браузері.');
}
/* Рисунки примерки. Каждый адрес загружается один раз и остаётся в памяти страницы: повторное нажатие ничего не качает.
   Портрет (480) подменяет лёгкую заготовку (160), когда готов. Загрузки идут очередью: срочные (то, на что человек смотрит
   или нажал) — вперёд и до пяти сразу, запасные — не больше двух сразу, чтобы на медленной связи не отнимать канал у срочных. */
const loaded=new Map(),queue=[];let running=0,rushing=0;
function pump(){
  for(let i=0;i<queue.length;){
    const job=queue[i];
    /* пока грузится срочное, запасные не начинаются: на медленной связи они отнимали бы у него канал */
    if(job.urgent?running<5:(rushing===0&&running<2)){queue.splice(i,1);running++;if(job.urgent)rushing++;job.start();}else i++;
  }
}
function load(src,urgent=false){
  if(!src)return Promise.reject();
  let job=loaded.get(src);
  if(job){
    /* уже в очереди, но стало срочным — переставляем вперёд */
    if(urgent&&!job.urgent&&!job.started){job.urgent=true;const i=queue.indexOf(job);if(i>0){queue.splice(i,1);queue.unshift(job);}pump();}
    return job.ready;
  }
  job={urgent,started:false,done:false};
  job.ready=new Promise((ok,fail)=>{
    job.start=()=>{
      job.started=true;const im=new Image();im.decoding='async';im.draggable=false;if(job.urgent)im.fetchPriority='high';
      /* готов — как только загрузился: decode() ждать нельзя, в фоновой вкладке он не завершается */
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
  img.alt='Зарок '+c.name+', '+c.animal.toLowerCase();
  const put=src=>{if(turn!==portraitTurn)return;if(img.getAttribute('src')!==src)img.src=src;stage?.classList.remove('is-loading');};
  if(isLoaded(big)){put(big);return;}
  if(isLoaded(light))put(light);
  else{
    /* ни заготовки, ни портрета ещё нет: показываем, что нажатие принято, и тянем заготовку вне очереди */
    stage?.classList.add('is-loading');
    if(light)load(light,true).then(src=>{if(!isLoaded(big))put(src);}).catch(()=>{});
  }
  load(big,true).then(put).catch(()=>{if(turn===portraitTurn){if(!light)img.src=big;stage?.classList.remove('is-loading');}});
}
/* запас для выбранного образа — только заготовки его настроений (по 6 КБ): нажатие на настроение отвечает сразу.
   Чёткие портреты других настроений заранее не качаем — они по 40 КБ и на медленной связи задерживали бы тот, что на экране;
   портрет начинает грузиться, когда палец или курсор оказывается на кнопке. */
function warm(c){if(!c)return;Object.values(c.small||{}).forEach(src=>load(src).catch(()=>{}));}
function updateCharacter(value,save=false){
  const c=byId(value);if(!c)return;selected=value;
  document.querySelectorAll('.character-gallery').forEach(g=>{
    g.style.setProperty('--character-color',c.color);
    const put=(sel,text)=>{g.querySelector(sel).textContent=text;};
    put('[data-character-number]','ФОРМА '+c.number+' / VII');put('[data-character-tone]',c.tone);put('[data-character-origin]',c.level+' · '+c.chakra);
    put('[data-character-name]',c.name);put('[data-character-lead]',c.lead);put('[data-character-quote]','«'+c.tag+'»');put('[data-character-story]',c.story);
    g.querySelector('[data-character-details]').replaceChildren(...c.details.map(t=>{const li=document.createElement('li');li.textContent=t;return li;}));
    showPortrait(g.querySelector('.character-portrait'),c);
  });
  warm(c);
  document.querySelectorAll('[data-character]').forEach(b=>{const on=b.dataset.character===value;b.classList.toggle('selected',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
  if(save){history.replaceState(null,'','#'+value);if(preferences.rememberCharacter&&!persist())toast('Не удалось сохранить выбранного Зарока.');}
}
/* Без View Transition: его слой рисуется поверх всей страницы, и портрет на время смены ложился на липкую шапку. */
function setCharacter(value,save=true){updateCharacter(value,save);}
setMaterial(material);applyMotion();
media.addEventListener?.('change',applyMotion);
const incoming=location.hash.slice(1);if(byId(incoming))selected=incoming;
if(document.querySelector('.character-gallery')){
  updateCharacter(selected);
  if(byId(incoming))requestAnimationFrame(()=>document.querySelector('.character-section').scrollIntoView({behavior:'instant'}));
  /* когда страница освободится — лёгкие рисунки всех образов и настроений (их 35, около 0,5 МБ): дальше любая смена мгновенна */
  const idle=window.requestIdleCallback||(f=>setTimeout(f,400));
  idle(()=>characters.forEach(c=>Object.values(c.small||{}).forEach(src=>load(src).catch(()=>{}))));
}
document.querySelector('[data-cycle-theme]')?.addEventListener('click',()=>{setMaterial(themes[(themes.indexOf(material)+1)%themes.length],true);toast('Оформлення: '+names[material]);});
document.querySelectorAll('[data-character]').forEach(b=>{
  /* палец или курсор уже на образе — крупный рисунок начинает грузиться до нажатия */
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
    if(navigator.share){await navigator.share({title:'Зарок '+byId(selected).name,url});return;}
    if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);toast('Ссылка на Зарока скопирована.');return;}
    toast('Откройте адресную строку, чтобы скопировать ссылку на этого Зарока.');
  }catch(e){if(e.name!=='AbortError')toast('Не удалось поделиться. Ссылка на персонажа есть в адресной строке.');}
});

/* Картинки с телефоном (первый экран, «Один день»): кадр 2688 px по ширине, экран-вёрстка стоит по углам (matrix3d) и масштабируется с кадром */
document.querySelectorAll('[data-phone-art]').forEach(art=>{const ui=art.querySelector('.hero-ui'),fit=()=>ui.style.setProperty('--s',art.clientWidth/2688);
  fit();if('ResizeObserver' in window)new ResizeObserver(fit).observe(art);else addEventListener('resize',fit);});
/* первый экран главной: экран «Сегодня» в вырезе картинки — масштаб по ширине выреза, дата, третье дело отмечается само и растёт прогресс
   (при «меньше движения» стоит); шапка появляется, когда первый экран прокручен */
const hero=document.querySelector('[data-hero-demo]');
if(hero){
  const date=hero.querySelector('[data-hero-date]');try{date.textContent=new Date().toLocaleDateString(document.documentElement.lang||'ru',{day:'numeric',month:'long'});}catch(e){}
  const task=hero.querySelector('[data-hero-task]'),count=hero.querySelector('[data-hero-count]'),bar=hero.querySelector('[data-hero-bar]');let timer=0,on=false;
  const set=v=>{on=v;task.classList.toggle('done',v);count.textContent=v?'3':'2';bar.style.width=v?'75%':'50%';};
  const tick=()=>{set(!on);timer=setTimeout(tick,on?3800:2600);};
  const run=()=>{clearTimeout(timer);set(false);if(!isReduced())timer=setTimeout(tick,1800);};
  motionHooks.push(run);run();
  const scrolled=()=>document.documentElement.classList.toggle('is-scrolled',scrollY>hero.offsetHeight*.6);
  scrolled();addEventListener('scroll',scrolled,{passive:true});
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
  let near=false;
  const sync=()=>{if(near&&!isReduced()){seven.preload='auto';seven.play().then(()=>seven.classList.add('on')).catch(()=>{});}else{seven.pause();seven.classList.toggle('on',!isReduced()&&seven.currentTime>0);}};
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{near=es[0].isIntersecting;sync();},{threshold:.2}).observe(seven);
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
function closeMenu(){menu.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Відкрити меню');}
menuToggle?.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Закрити меню':'Відкрити меню');});
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
  applyMotion();const ok=persist();dialog.close();toast(ok?'Ваш вибір збережено на цьому пристрої.':'Вибір застосовано. Браузер не дозволив його зберегти.');
});
document.querySelector('[data-preferences-essential]').addEventListener('click',()=>{
  preferences={...defaults};applyMotion();const ok=persist();dialog.close();toast(ok?'Оформлення й Зарок не запам’ятовуватимуться.':'Оформлення й Зарок не запам’ятовуються; збереження вибору недоступне.');
});
document.querySelector('[data-preferences-reset]').addEventListener('click',()=>{
  let ok=true;try{localStorage.removeItem(KEY);}catch{ok=false;}
  preferences={...defaults};setMaterial('porcelain');selected='root';emotion='idle';
  if(document.querySelector('.character-gallery')){
    updateCharacter(selected);document.querySelectorAll('[data-emotion]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.emotion==='idle')));
    if(byId(location.hash.slice(1)))history.replaceState(null,'',location.pathname+location.search);
  }
  applyMotion();dialog.close();toast(ok?'Збережені налаштування сайту видалено.':'Налаштування скинуто на сторінці; браузер не дозволив видалити збереження.');
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
