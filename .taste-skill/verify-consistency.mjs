import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Browser, sleep } from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs';
const source=readFileSync('.taste-skill/audit.mjs','utf8');
const fixture=source.slice(source.indexOf('function fixtures('),source.indexOf('async function click('));
const out='.taste-skill/after-2026-11-27';mkdirSync(out,{recursive:true});
const b=await Browser.launch(),results=[];
try {
 for(const width of [320,390,480,481,768,769,1024,1441]) {
  const p=await b.newPage({width,height:900,mobile:width<=768});
  try {
   await p.send('Page.addScriptToEvaluateOnNewDocument',{source:fixture+"\nfixtures('full');"});
   await p.goto('http://localhost:4173',{settleMs:300});
   const heading=await p.eval(()=>getComputedStyle(document.querySelector('h1')).fontSize);
   assert.equal(heading,width<=768?'32px':'42px');
   assert.equal(await p.eval(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Page overflow');
   const pos=await p.eval(()=>{const r=document.querySelector('.intro .button').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}});
   await p.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pos});
   await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pos});
   await sleep(400);
   const fields=await p.eval(()=>[...document.querySelectorAll('dialog .field__control > input,dialog .select-trigger')].filter(e=>e.getClientRects().length).map(e=>({h:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize})));
   assert.ok(fields.length>=4);
   for(const field of fields) {assert.equal(field.h,width<=480?38:width<=768?40:44,'Field height');assert.equal(field.font,width<=768?'16px':'13px','Field text');}
   const direction=await p.eval(()=>getComputedStyle(document.querySelector('dialog .modal__actions')).flexDirection);
   assert.equal(direction,width<=480?'column':'row');
   await p.eval(()=>document.querySelector('dialog button[type="submit"]')?.click() || document.querySelector('dialog .modal__footer button[type="submit"]').click());
   await sleep(80);
   const reserve=await p.eval(()=>{
    const field=document.querySelector('dialog .field--invalid');
    const error=field.querySelector('.field__error'),space=field.querySelector('.field__error-space');
    const text='Проверь название: слишком длинное сообщение должно переноситься на несколько строк и оставлять достаточно места до следующего поля.';
    error.textContent=text;space.textContent=text;
    const er=error.getBoundingClientRect(),sr=space.getBoundingClientRect(),fr=field.getBoundingClientRect();
    return {errorHeight:er.height,reserveHeight:sr.height,errorBottom:er.bottom,fieldBottom:fr.bottom};
   });
   assert.ok(reserve.reserveHeight>=reserve.errorHeight-1,'Error text outgrows reserve');
   assert.ok(reserve.fieldBottom>=reserve.errorBottom-1,'Error extends beyond field');
   if(width===390) await p.screenshot({path:out+'/390-long-error-pointer.jpg',quality:85});
   results.push({width,heading,fields,direction,reserve,passed:true});
   console.log('PASS',width);
  } finally {await p.close();}
 }
 writeFileSync(out+'/geometry-checks.json',JSON.stringify(results,null,2));
}finally{await b.close();}
