/* Static help navigation. No application state, analytics or backend search. */
(function(){
  'use strict';
  /* адрес справки зависит от языка страницы: английская — /help, русская — /ru/help (адреса сайта с 18 октября 2026) */
  const HELP='/zarok-preview/uk/help';
  const center=document.querySelector('[data-help-center]');if(!center)return;
  center.classList.add('hc-ready');
  const side=center.querySelector('.hc-sidebar'),openButton=center.querySelector('[data-help-open]'),backdrop=center.querySelector('.hc-backdrop'),search=center.querySelector('#help-search'),nav=center.querySelector('.hc-nav'),results=center.querySelector('#help-search-results'),status=center.querySelector('[data-help-status]'),imageDialog=center.querySelector('.hc-image-dialog');
  const small=matchMedia('(max-width:760px)'),cache=new Map(),titles=new Map(Array.from(nav.querySelectorAll('[data-help-slug]')).map(a=>[a.dataset.helpSlug,a.textContent.trim()]));
  let controller=null,request=0,opened=false,previousOverflow='',outlineObserver=null;
  function pane(){return document.getElementById('help-article-pane');}
  cache.set(pane().dataset.helpCurrent,pane().cloneNode(true));
  function focusables(){return Array.from(side.querySelectorAll('a,button,input,summary')).filter(el=>el.getClientRects().length&&!el.disabled);}
  function menu(show,restore=true){
    if(!small.matches)show=false;opened=show;side.classList.toggle('is-open',show);backdrop.hidden=!show;openButton.setAttribute('aria-expanded',String(show));
    if(show){side.setAttribute('role','dialog');side.setAttribute('aria-modal','true');previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';}else{side.removeAttribute('role');side.removeAttribute('aria-modal');document.body.style.overflow=previousOverflow;}
    document.querySelectorAll('.site-header,.site-footer').forEach(el=>{el.inert=show;});pane().inert=show;openButton.inert=show;
    if(show)search.focus();else if(restore&&small.matches)openButton.focus();
  }
  function normalize(s){return s.toLocaleLowerCase('ru-RU').replace(/ё/g,'е').trim();}
  function filter(){const index=results.querySelector('template[data-help-search-index]');if(index)index.replaceWith(index.content);const query=normalize(search.value),tokens=query.split(/\s+/).filter(Boolean);results.hidden=!query;nav.hidden=!!query;let count=0;const links=Array.from(results.querySelectorAll('[data-help-search-title]'));links.forEach(a=>{const title=normalize(a.dataset.helpSearchTitle+' '+(a.querySelector('small')?.textContent||''));a.hidden=!tokens.every(t=>title.includes(t));if(!a.hidden)count++;});results.querySelector('[data-help-search-status]').textContent=count?'Знайдено: '+count:'За цим запитом нічого не знайдено. Спробуйте іншу назву.';}
  function activate(slug){center.querySelectorAll('.hc-nav [data-help-link]').forEach(a=>{if(a.dataset.helpSlug===slug)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});const group=Array.from(center.querySelectorAll('.hc-group')).find(d=>d.querySelector('[data-help-slug="'+slug+'"]'));if(group)center.querySelectorAll('.hc-group').forEach(d=>{d.open=d===group;});center.querySelector('[data-help-mobile-title]').textContent=titles.get(slug)||'Центр допомоги';}
  function paintGallery(g,index){const figures=Array.from(g.querySelectorAll('.hc-figure'));g.dataset.figureIndex=String(index);figures.forEach((f,i)=>{f.hidden=i!==index;});g.querySelector('[data-help-figure-count]').textContent=(index+1)+' / '+figures.length;g.querySelector('[data-help-figure-prev]').disabled=index===0;g.querySelector('[data-help-figure-next]').disabled=index===figures.length-1;}
  function bindGalleries(){pane().querySelectorAll('[data-help-gallery]').forEach(g=>{const controls=g.querySelector('.hc-gallery-controls');if(!controls)return;controls.hidden=false;paintGallery(g,0);});}
  function bindOutline(){outlineObserver?.disconnect();const outline=pane().querySelector('.hc-outline');if(!outline||!('IntersectionObserver'in window))return;outlineObserver=new IntersectionObserver(entries=>{const entry=entries.find(e=>e.isIntersecting);if(!entry)return;outline.querySelectorAll('a').forEach(a=>a.classList.toggle('on',a.hash==='#'+entry.target.id));},{rootMargin:'-120px 0px -65% 0px',threshold:0});pane().querySelectorAll('.hc-step,.hc-tips,.hc-faq').forEach(el=>outlineObserver.observe(el));}
  async function navigate(slug,url,historyMode='push',moveFocus=true){
    const serial=++request;controller?.abort();controller=new AbortController();status.textContent='Відкриваємо статтю…';pane().setAttribute('aria-busy','true');
    try{
      let next=cache.get(slug);
      const offline=document.querySelector('template[data-help-offline="'+slug+'"]');
      if(!next&&offline)next=offline.content.querySelector('.hc-article-pane');
      if(!next){const endpoint=new URL(slug?HELP+'/'+slug:HELP,location.origin);const response=await fetch(endpoint,{signal:controller.signal,credentials:'same-origin'});if(!response.ok)throw Error('HTTP '+response.status);const doc=new DOMParser().parseFromString(await response.text(),'text/html');next=doc.querySelector('.hc-article-pane');if(!next||next.dataset.helpCurrent!==slug)throw Error('Article mismatch');cache.set(slug,next.cloneNode(true));}
      if(serial!==request)return;
      menu(false,false);const replacement=next.cloneNode(true);replacement.removeAttribute('aria-busy');pane().replaceWith(replacement);activate(slug);search.value='';filter();
      if(historyMode==='push')history.pushState({helpSlug:slug},'',url);
      document.title=slug?(titles.get(slug)+' — довідка Зарока'):'Довідка — Зарок';const canonical=document.querySelector('link[rel=canonical]');if(canonical)canonical.href='https://zarok.app'+HELP+(slug?'/'+slug:'');
      bindOutline();bindGalleries();status.textContent=slug?'Відкрито статтю: '+titles.get(slug):'Відкрито всі розділи';const target=url.hash?document.getElementById(decodeURIComponent(url.hash.slice(1))):replacement.querySelector('h1');if(moveFocus)replacement.querySelector('h1')?.focus({preventScroll:true});target?.scrollIntoView({block:'start',behavior:'instant'});
    }catch(error){if(error.name==='AbortError')return;if(serial!==request)return;pane().removeAttribute('aria-busy');status.textContent='Стаття відкриється окремою сторінкою.';/* адрес уже этот (назад/вперёд): assign с тем же адресом и #шагом снова дал бы popstate и круг */if(url.href.split('#')[0]===location.href.split('#')[0])location.reload();else location.assign(url.href);}
  }
  center.addEventListener('click',e=>{
    if(e.target.closest('[data-help-open]')){menu(true);return;}if(e.target.closest('[data-help-close]')){menu(false);return;}
    if(e.target.closest('[data-help-image-close]')){imageDialog.close();return;}
    const galleryButton=e.target.closest('[data-help-figure-prev],[data-help-figure-next]');if(galleryButton){const g=galleryButton.closest('[data-help-gallery]'),index=Number(g.dataset.figureIndex)+(galleryButton.hasAttribute('data-help-figure-next')?1:-1);if(index>=0&&index<g.querySelectorAll('.hc-figure').length)paintGallery(g,index);return;}
    const image=e.target.closest('[data-help-image]');if(image){e.preventDefault();const original=image.querySelector('img');const img=imageDialog.querySelector('img');img.src=original.src;img.alt=original.alt;imageDialog.querySelector('figcaption').textContent=image.closest('figure').querySelector('figcaption').textContent;imageDialog.showModal();return;}
    const a=e.target.closest('a[data-help-link]');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const url=new URL(a.href,location.href);if(url.origin!==location.origin)return;e.preventDefault();navigate(a.dataset.helpSlug,url);
  });
  center.addEventListener('toggle',e=>{if(!e.target.matches('.hc-group')||!e.target.open)return;center.querySelectorAll('.hc-group').forEach(d=>{if(d!==e.target)d.open=false;});},true);
  search.addEventListener('input',filter);search.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=Array.from(results.querySelectorAll('a')).find(a=>!a.hidden);if(first){e.preventDefault();first.click();}}});
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(small.matches)menu(true);search.focus();search.select();}
    if(e.key==='Escape'&&opened){e.preventDefault();menu(false);}
    if(e.key==='Tab'&&opened){const list=focusables(),first=list[0],last=list[list.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  });
  imageDialog.addEventListener('click',e=>{if(e.target!==imageDialog)return;const r=imageDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)imageDialog.close();});
  small.addEventListener('change',()=>{if(opened&&!small.matches)menu(false,false);});
  /* переход по шагу внутри статьи (#step-…) тоже даёт popstate: статья та же, прокрутку делает сам браузер — заново её не открываем */
  addEventListener('popstate',()=>{const u=new URL(location.href),slug=location.protocol==='file:'?(u.searchParams.get('article')||''):u.pathname.replace(/\/$/,'').split(HELP+'/')[1]||'';if(slug&&!titles.has(slug))return;if(slug===pane().dataset.helpCurrent)return;navigate(slug,u,'none',false);});
  const initial=new URL(location.href);if(location.protocol==='file:'&&initial.searchParams.has('article'))navigate(initial.searchParams.get('article'),initial,'none',false);else{bindOutline();bindGalleries();}
})();
