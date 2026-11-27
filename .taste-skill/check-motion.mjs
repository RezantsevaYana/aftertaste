import { Browser,sleep } from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync('.taste-skill/audit-final.mjs','utf8');
const fixture=source.slice(source.indexOf('function fixtures('),source.indexOf('async function click('));
const out='.taste-skill/motion';mkdirSync(out,{recursive:true});
const b=await Browser.launch();const results=[];
try {for(const width of [1440,768,390]){
 const p=await b.newPage({width,height:900,mobile:width===390});
 try{
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture+`;fixtures('full');const fetchFixture=window.fetch;window.failSwitch=false;window.fetch=async(input,options={})=>{if(String(input).includes('/account/categories/')&&options.method==='PATCH'){await new Promise(r=>setTimeout(r,800));if(window.failSwitch)return new Response(JSON.stringify({message:'Не удалось сохранить настройки'}),{status:500});const data=await(await fetchFixture('/api/account/settings')).json();const key=decodeURIComponent(String(input).split('/').at(-1));Object.assign(data.categories.find(c=>c.key===key),JSON.parse(options.body));return new Response(JSON.stringify(data),{status:200});}return fetchFixture(input,options)};`});
 await p.goto('http://localhost:8080',{settleMs:650});
 const click=async(selector,index=0)=>p.eval(({selector,index})=>{const e=[...document.querySelectorAll(selector)].filter(e=>e.getClientRects().length)[index];if(!e)throw Error(selector);e.click()},{selector,index});
 const metrics=()=>p.eval(()=>({width:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,header:document.querySelector('.header-content').getBoundingClientRect().x,scrollY,scrollHeight:document.documentElement.scrollHeight}));
 const initial=await metrics();assert.ok(initial.scrollWidth<=initial.width,'no horizontal overflow');
 const indicator=()=>p.eval(()=>getComputedStyle(document.querySelector('.catalog-sections'),'::after').transform);
 await p.eval(()=>window.scrollTo(0,150));await sleep(250);const savedScroll=(await metrics()).scrollY;await click('.header-navigation button',1);await sleep(350);await click('.header-navigation button',0);await sleep(350);assert.ok(Math.abs((await metrics()).scrollY-savedScroll)<2,'catalog scroll restored');await p.eval(()=>window.scrollTo(0,0));await sleep(250);
 const before=await indicator();await click('.catalog-sections button',1);await sleep(70);const mid=await indicator();await sleep(300);const after=await indicator();assert.notEqual(before,mid);assert.notEqual(mid,after);
 for(const index of [1,2,0,1,0]){await click('.header-navigation button',index);await sleep(350);const m=await metrics();assert.equal(m.header,initial.header,'header stable');assert.ok(m.scrollWidth<=m.width,'no navigation overflow');assert.equal(await p.eval(()=>[...document.querySelectorAll('.page-screen')].filter(e=>e.getClientRects().length).length),1);}
 await click('.dropdown-trigger');await sleep(80);await p.eval(()=>[...document.querySelectorAll('.account-menu button')].find(e=>e.textContent.includes('Личный кабинет')).click());await sleep(350);
 await p.eval(()=>[...document.querySelectorAll('.profile-navigation button,.profile-tabs button')].find(e=>e.getClientRects().length&&e.textContent.toLowerCase().includes('категор')).click());await sleep(300);
 const row=()=>p.eval(()=>{const e=document.querySelector('.category-row');const r=e.getBoundingClientRect();return {x:r.x,y:r.y,h:r.height,checked:e.querySelector('[role=switch]').getAttribute('aria-checked'),opacity:getComputedStyle(e.querySelector('[role=switch]')).opacity,height:document.documentElement.scrollHeight}});
 const rowBefore=await row();await click('.category-row [role=switch]');await sleep(100);const rowPending=await row();assert.notEqual(rowBefore.checked,rowPending.checked,'optimistic switch');assert.equal(rowPending.opacity,'1');assert.equal(rowPending.height,rowBefore.height,'switch keeps document height');await sleep(1000);const rowAfter=await row();assert.deepEqual([rowAfter.x,rowAfter.y,rowAfter.h],[rowBefore.x,rowBefore.y,rowBefore.h]);
 assert.ok(await p.eval(()=>getComputedStyle(document.querySelector('.toast')).backgroundColor!=='rgb(255, 255, 255)'));
 await p.screenshot({path:`${out}/${width}-toast.jpg`,quality:85});
 const progress=()=>p.eval(()=>getComputedStyle(document.querySelector('.toast__progress')).transform);
 const progressBefore=await progress();await sleep(250);assert.notEqual(await progress(),progressBefore);
 await p.eval(()=>document.querySelector('.toast').dispatchEvent(new PointerEvent('pointerenter')));const paused=await progress();await sleep(350);assert.equal(await progress(),paused,'timer pauses on hover');
 await p.eval(()=>document.querySelector('.toast').dispatchEvent(new PointerEvent('pointerleave')));
 await sleep(7200);assert.equal(await p.eval(()=>!!document.querySelector('.toast')),false,'toast auto dismisses');
 await p.eval(()=>window.failSwitch=true);const checked=(await row()).checked;await click('.category-row [role=switch]');await sleep(100);assert.notEqual((await row()).checked,checked);await sleep(1000);assert.equal((await row()).checked,checked,'failed save rolls back');
 await p.eval(()=>document.querySelector('.profile-back').click());await sleep(350);const final=await metrics();assert.equal(final.header,initial.header);assert.ok(final.scrollWidth<=final.width);
 results.push({width,initial,final,slidingIndicator:true,stableSwitch:true,rollback:true,toastAutoClose:true,pause:true});console.log('PASS',width);
 }finally{await p.close()}
}writeFileSync(out+'/results.json',JSON.stringify(results,null,2));}finally{await b.close()}
