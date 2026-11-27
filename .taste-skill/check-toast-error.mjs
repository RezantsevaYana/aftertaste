import {Browser,sleep} from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import assert from 'node:assert/strict';
const b=await Browser.launch();
try{for(const reducedMotion of [false,true]){const p=await b.newPage({width:1440,height:900,reducedMotion});try{
 await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`window.toastFrames=[];new MutationObserver(()=>{const t=document.querySelector('.toast');if(!t||t.dataset.sampled)return;t.dataset.sampled='yes';const start=performance.now();function sample(){window.toastFrames.push({time:performance.now()-start,opacity:Number(getComputedStyle(t).opacity)});if(t.isConnected&&performance.now()-start<500)requestAnimationFrame(sample)}requestAnimationFrame(sample)}).observe(document,{subtree:true,childList:true});`});
 await p.goto('http://localhost:8080',{settleMs:400});
 await p.eval(()=>[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Не помнишь пароль')).click());await sleep(200);
 await p.eval(()=>{const e=document.getElementById('recovery-email');e.value='toast-motion-missing@example.invalid';e.dispatchEvent(new Event('input',{bubbles:true}));[...document.querySelectorAll('button')].find(e=>e.textContent.includes('Отправить ссылку')).click()});await sleep(700);
 const frames=await p.eval(()=>window.toastFrames);assert.ok(frames.length);assert.ok(frames.some(f=>f.opacity===1));if(!reducedMotion)assert.ok(frames.some(f=>f.opacity>0&&f.opacity<1),'smooth entrance');
 assert.ok(await p.eval(()=>document.querySelector('.toast').matches(':popover-open')));
 assert.ok(await p.eval(()=>document.querySelector('.toast').textContent.includes('Аккаунт с такой почтой не найден')));assert.equal(await p.eval(()=>!!document.querySelector('dialog[open]')),false);
 await p.screenshot({path:`.taste-skill/motion/error-${reducedMotion}.jpg`,quality:85});
 await p.eval(()=>document.querySelector('.toast__close').click());const exit=[];for(let i=0;i<12;i++){await sleep(25);exit.push(await p.eval(()=>{const t=document.querySelector('.toast');return t?{opacity:Number(getComputedStyle(t).opacity),class:t.className}:null}));}console.log('EXIT',reducedMotion,exit);if(!reducedMotion)assert.ok(exit.some(f=>f&&f.opacity>0&&f.opacity<1),'smooth exit');await sleep(150);assert.equal(await p.eval(()=>!!document.querySelector('.toast')),false);
 console.log('PASS error toast', {reducedMotion});
}finally{await p.close()}}}finally{await b.close()}
