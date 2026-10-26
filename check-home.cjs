const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function element(dataset={}){return {dataset,attrs:{},tabIndex:0,listeners:{},textContent:'',classList:{values:new Set(),toggle(k,on){if(on)this.values.add(k);else this.values.delete(k);}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.listeners[k]=f;},focus(){this.focused=true;}};}
async function setup(lang='ru'){
 const tabs=Array.from({length:4},(_,i)=>Object.assign(element({screen:String(i)}),{id:'rh-tab-'+i}));
 const friends=Array.from({length:7},(_,i)=>element({friend:String(i)}));
 const nodes=Object.fromEntries(['.rh-demo-screen','[data-day-title]','[data-day-text]','#rh-day-panel','.rh-friend-quote'].map(k=>[k,element()]));
 const copy=JSON.parse(fs.readFileSync(`home-copy-${lang}.json`,'utf8'));
 const context={document:{documentElement:{lang},querySelectorAll(s){return s==='[data-screen]'?tabs:friends;},querySelector(s){return nodes[s];}},fetch:async()=>({ok:true,json:async()=>copy})};
 await vm.runInNewContext('(async()=>{'+fs.readFileSync('home-redesign.js','utf8')+'})()',context);
 return {tabs,friends,nodes,copy};
}
test('calendar tab swaps screenshot, description and accessible panel association',async()=>{
 const {tabs,nodes,copy}=await setup();tabs[2].listeners.click();
 assert.match(nodes['.rh-demo-screen'].src,/cal-month.webp$/);
 assert.equal(nodes['[data-day-title]'].textContent,copy.tabheads[2]);
 assert.equal(nodes['#rh-day-panel'].attrs['aria-labelledby'],'rh-tab-2');
 assert.deepEqual(tabs.map(t=>t.attrs['aria-selected']),['false','false','true','false']);
});
test('keyboard navigation wraps and moves focus; English copy remains English',async()=>{
 const {tabs,nodes,copy}=await setup('en');let prevented=false;
 tabs[0].listeners.keydown({key:'ArrowLeft',preventDefault(){prevented=true;}});
 assert.ok(prevented);assert.ok(tabs[3].focused);assert.equal(tabs[3].tabIndex,0);
 assert.equal(nodes['[data-day-text]'].textContent,copy.tabtexts[3]);
});
test('choosing a companion selects only it and updates its quote',async()=>{
 const {friends,nodes,copy}=await setup();friends[6].listeners.click();
 assert.equal(nodes['.rh-friend-quote'].textContent,'«'+copy.quotes[6]+'»');
 assert.equal(friends.filter(b=>b.attrs['aria-pressed']==='true').length,1);
 assert.ok(friends[6].classList.values.has('is-selected'));
});
