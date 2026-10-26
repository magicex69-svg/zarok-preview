const base='/zarok-preview';
const lang=document.documentElement.lang==='ru'?'ru':'en';
const response=await fetch(`${base}/home-copy-${lang}.json`);
if(response.ok){
 const copy=await response.json();
 const screens=['day-morning','day-main','cal-month','progress-tab'];
 const tabs=[...document.querySelectorAll('[data-screen]')];
 function selectScreen(button){
  const i=Number(button.dataset.screen);
  tabs.forEach(t=>{const selected=t===button;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;});
  const image=document.querySelector('.rh-demo-screen');
  image.src=`${base}/img/home/${screens[i]}.webp`;image.alt=copy.tabheads[i];
  document.querySelector('[data-day-title]').textContent=copy.tabheads[i];
  document.querySelector('[data-day-text]').textContent=copy.tabtexts[i];
  document.querySelector('#rh-day-panel').setAttribute('aria-labelledby',button.id);
 }
 tabs.forEach((button,i)=>{
  button.addEventListener('click',()=>selectScreen(button));
  button.addEventListener('keydown',e=>{
   let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;
   e.preventDefault();tabs[next].focus();selectScreen(tabs[next]);
  });
 });
 document.querySelectorAll('[data-friend]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-friend]').forEach(b=>{b.setAttribute('aria-pressed',String(b===button));b.classList.toggle('is-selected',b===button);});
  document.querySelector('.rh-friend-quote').textContent=`«${copy.quotes[Number(button.dataset.friend)]}»`;
 }));
}
