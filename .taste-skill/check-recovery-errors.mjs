import { Browser, sleep } from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const out='.taste-skill/recovery-errors';mkdirSync(out,{recursive:true});
const b=await Browser.launch(),results=[];
try {
 for(const width of [1440,390]) {
  const p=await b.newPage({width,height:900,mobile:width===390});
  try {
   await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.modalFrames=[];new MutationObserver(()=>{const d=document.querySelector('dialog[open]');if(!d||d.dataset.sampled)return;d.dataset.sampled='true';const start=performance.now();const sample=()=>{window.modalFrames.push({time:performance.now()-start,opacity:Number(getComputedStyle(d).opacity),width:d.getBoundingClientRect().width});if(performance.now()-start<400&&d.isConnected)requestAnimationFrame(sample)};requestAnimationFrame(sample)}).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});const original=window.fetch.bind(window);window.auditRequests=[];window.fetch=async(...args)=>{const r=await original(...args);window.auditRequests.push({url:String(args[0]),status:r.status});return r;}`});
   await p.goto('http://localhost:8080',{settleMs:500});
   const click=async text=>{const found=await p.eval(text=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===text);e?.click();return !!e},text);assert.ok(found,text);await sleep(350)};
   await click('Не помнишь пароль?');
   await p.eval(()=>{const e=document.getElementById('recovery-email');e.value='not-registered-ui-check@example.invalid';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await click('Отправить ссылку');await sleep(350);
   assert.ok(await p.eval(()=>document.querySelector('dialog')?.textContent.includes('Аккаунт с такой почтой не найден')));
   assert.ok(await p.eval(()=>window.auditRequests.some(r=>r.url.endsWith('/auth/password-reset/request')&&r.status===404)));
   const frames=await p.eval(()=>window.modalFrames);console.log('FRAMES',width,JSON.stringify(frames));if(width===1440){assert.ok(frames.some(f=>f.opacity<0.9),'Entrance starts transparent');assert.ok(frames.some(f=>f.opacity>0.99),'Entrance completes');assert.ok(frames.at(-1).width<=402,'Compact desktop width');}await p.screenshot({path:`${out}/${width}-unknown-email.jpg`,quality:85});
   await click('Понятно');
   assert.equal(await p.eval(()=>document.getElementById('recovery-email').value),'not-registered-ui-check@example.invalid');
   assert.equal(await p.eval(()=>document.activeElement.id),'recovery-email');
   assert.equal(await p.eval(()=>document.querySelector('dialog')===null),true);
   await p.eval(()=>{const e=document.getElementById('recovery-email');e.value='invalid';e.dispatchEvent(new Event('input',{bubbles:true}));});
   await click('Отправить ссылку');
   assert.equal(await p.eval(()=>document.querySelector('dialog')===null),true);
   assert.equal(await p.eval(()=>document.getElementById('recovery-email').getAttribute('aria-invalid')),'true');
   assert.equal(await p.eval(()=>window.auditRequests.filter(r=>r.url.endsWith('/auth/password-reset/request')).length),1);
   await click('Вернуться ко входу');
   await p.eval(()=>{for(const [id,value] of [['auth-email','not-registered-ui-check@example.invalid'],['auth-password','testpassword123']]){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}});
   await click('Войти');await sleep(300);
   assert.ok(await p.eval(()=>document.querySelector('dialog')?.textContent.includes('Не удалось войти')));
   await p.screenshot({path:`${out}/${width}-login-error.jpg`,quality:85});
   await click('Понятно');
   assert.equal(await p.eval(()=>document.getElementById('auth-email').value),'not-registered-ui-check@example.invalid');
   results.push({width,unknownStatus:404,emailPreserved:true,focusRestored:true,localValidation:true,loginErrorModal:true});
   console.log('PASS',width);
  }finally{await p.close();}
 }
 writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
}finally{await b.close();}
