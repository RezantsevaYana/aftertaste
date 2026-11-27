import { mkdirSync, writeFileSync } from 'node:fs';
import { Browser, sleep } from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs';
import { probe, app } from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/probe.mjs';
import { judge, judgeApp, APP_SKIP } from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/rules.mjs';

// Isolated browser fixtures: no account is created and no request mutates real data.
const out = process.env.AFTERTASTE_AUDIT_OUT || '.taste-skill/audit-2026-11-26';
const origin = process.env.AFTERTASTE_AUDIT_ORIGIN || 'http://localhost:8080';
mkdirSync(out, { recursive: true });
function fixtures(mode) {
  const user = { id: 'audit-owner', email: 'audit@example.test', handle: 'anna', firstName: 'Анна', lastName: 'Иванова', avatar: null };
  const person = { id: 'audit-friend', handle: 'maria', firstName: 'Мария', lastName: 'Петрова', avatar: null, friend: true, following: true, request: null };
  const categories = [['book','Книги','book-open'],['film','Фильмы','film'],['series','Сериалы','tv'],['theatre','Спектакли','drama'],['music','Музыка','disc-3'],['exhibition','Выставки и музеи','image'],['concert','Концерты','ticket'],['podcast','Подкасты','mic'],['lecture','Лекции','graduation-cap']].map(([key,name,icon],i)=>({ key,name,icon:'lucide:'+icon,custom:false,customCategoryId:null,enabled:i<7,reviewVisibility:'private',count:1 }));
  const entries = [
    { id:'audit-book',type:'book',title:'Мастер и Маргарита',author:'Михаил Булгаков',genre:'Роман',rating:10 },
    { id:'audit-film',type:'film',title:'Отель «Гранд Будапешт»',director:'Уэс Андерсон',genre:'Комедия',rating:8 },
    { id:'audit-series',type:'series',title:'Очень длинное название сериала, которое должно корректно переноситься в карточке',rating:1 },
    { id:'audit-album',type:'album',title:'Kind of Blue',artist:'Miles Davis',rating:9 },
    { id:'audit-plan',type:'book',title:'Сто лет одиночества',author:'Габриэль Гарсиа Маркес',rating:null,status:'plan',month:null,plannedDate:'2026-12-05' },
  ].map(e=>({status:'done',month:'2026-11',date:'2026-11-25',review:'Хочется вернуться к этой истории. Запомнились детали, атмосфера и герои.',reviewVisibility:'inherit',photos:[],...e}));
  const recommendation = {id:'audit-rec',person,work:{type:'book',title:'Сто лет одиночества',author:'Габриэль Гарсиа Маркес'},note:'Кажется, тебе понравится. Потом обсудим!',createdAt:'2026-11-25T12:00:00Z'};
  const originalFetch=window.fetch.bind(window);
  window.fetch = async (input, options={}) => {
    const url = new URL(typeof input==='string'?input:input.url,location.origin);
    if (!url.pathname.startsWith('/api/')) return originalFetch(input,options);
    const path=url.pathname.slice(4);
    if(path==='/auth/me') return new Response(JSON.stringify(mode==='auth'?{message:'Unauthorized'}:user),{status:mode==='auth'?401:200});
    if(mode==='loading' && path==='/entries') await new Promise(r=>setTimeout(r,15000));
    if(mode==='error' && path==='/entries') return new Response(JSON.stringify({message:'Не удалось загрузить записи'}),{status:500});
    let value = path==='/account/settings'?{plansVisible:true,categories}:path==='/entries'?(mode==='empty'?[]:entries):path==='/social/recommendations'?{incoming:mode==='empty'?[]:[recommendation],sent:mode==='empty'?[]:[recommendation]}:path==='/social/people'?{users:mode==='empty'?[]:[person],nextCursor:null,counts:{friends:1,following:1,requests:0}}:path==='/social/people/audit-friend'?{person,canViewPlans:true,entries}:path==='/auth/password-reset/check'?{valid:true}:{};
    return new Response(JSON.stringify(value),{status:200,headers:{'Content-Type':'application/json'}});
  };
}
async function click(p, text, selector='button') {
  const ok=await p.eval(({text,selector})=>{const normalize=s=>s.replace(/\s/g,'');const e=[...document.querySelectorAll(selector)].find(e=>e.getClientRects().length && normalize(e.textContent)===normalize(text));e?.click();return !!e},{text,selector});
  if(!ok) throw new Error('Missing control: '+text);
  await sleep(400);
}
async function profile(p, tab) {
  await p.eval(()=>document.querySelector('.dropdown-trigger').click());await sleep(200);
  await click(p,'Личный кабинет');
  if(tab) await click(p,tab==='Мои категории' && await p.eval(()=>innerWidth<=768)?'Категории':tab);
}
async function openEntry(p) { await p.eval(()=>document.querySelector('.entry-open').click());await sleep(400); }
const screens = [
  ['login','auth'], ['register','auth',p=>click(p,'Зарегистрироваться')],
  ['register-profile','auth',async p=>{await click(p,'Зарегистрироваться');await p.eval(()=>{for(const [id,value] of [['auth-email','audit@example.test'],['auth-password','testpassword123'],['auth-password-confirm','testpassword123']]){const e=document.getElementById(id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}});await click(p,'Продолжить');}],
  ['recovery','auth',p=>click(p,'Не помнишь пароль?')],
  ['login-errors','auth',p=>click(p,'Войти')],
  ['catalog','full'], ['catalog-empty','empty'], ['catalog-error','error'],
  ['plans','full',p=>click(p,'Планы1')],
  ['entry-form','full',p=>click(p,'Добавить впечатление')],
  ['entry-form-errors','full',async p=>{await click(p,'Добавить впечатление');await click(p,'Добавить в каталог');}],
  ['entry-details','full',openEntry],
  ['entry-edit','full',async p=>{await openEntry(p);await click(p,'Редактировать');}],
  ['entry-delete','full',async p=>{await openEntry(p);await click(p,'Удалить запись');}],
  ['recommend-modal','full',async p=>{await openEntry(p);await click(p,'Порекомендовать');}],
  ['companions-modal','full',async p=>{await openEntry(p);await click(p,'Изменить');}],
  ['profile','full',p=>profile(p)], ['password','full',p=>profile(p,'Пароль')],
  ['categories','full',p=>profile(p,'Мои категории')], ['privacy','full',p=>profile(p,'Приватность')],
  ['people','full',p=>click(p,'Люди')], ['people-empty','empty',p=>click(p,'Люди')],
  ['person-collection','full',async p=>{await click(p,'Люди');await p.eval(()=>document.querySelector('.person-identity').click());await sleep(400);}],
  ['recommendations','full',p=>click(p,'Мне советуют1')],
  ['recommendations-empty','empty',p=>click(p,'Мне советуют')],
  ['account-menu','full',async p=>{await p.eval(()=>document.querySelector('.dropdown-trigger').click());}],
  ['extra-loading','loading'],
  ['extra-filters','full',async p=>{if(await p.eval(()=>innerWidth<=768))await click(p,'Фильтры');else {await p.eval(()=>document.querySelector('#catalog-year-filter').click());await sleep(200);}}],
  ['extra-calendar','full',async p=>{if(await p.eval(()=>innerWidth<=768))await click(p,'Фильтры');await p.eval(()=>[...document.querySelectorAll('.date-trigger')].find(e=>e.getClientRects().length).click());await sleep(300);}],
  ['extra-select','full',async p=>{await click(p,'Добавить впечатление');await p.eval(()=>document.querySelector('dialog .select-trigger').click());await sleep(200);}],
  ['extra-plan-form','full',async p=>{await click(p,'Планы1');await click(p,'Добавить в планы');}],
  ['extra-complete-plan','full',async p=>{await click(p,'Планы1');await click(p,'Прочитано');}],
  ['extra-form-footer','full',async p=>{await click(p,'Добавить впечатление');await p.eval(()=>{const d=document.querySelector('dialog');d.scrollTop=d.scrollHeight;const c=d.querySelector('.modal__content');c.scrollTop=c.scrollHeight;});}],
  ['extra-unsaved','full',async p=>{await click(p,'Добавить впечатление');await p.eval(()=>{const e=document.querySelector('dialog input');e.value='Тестовая запись';e.dispatchEvent(new Event('input',{bubbles:true}));});await click(p,'Отмена');}],
  ['extra-password-errors','full',async p=>{await profile(p,'Пароль');await click(p,'Сменить пароль');}],
  ['extra-recovery-sent','auth',async p=>{await click(p,'Не помнишь пароль?');await p.eval(()=>{const e=document.querySelector('input[type="email"]');e.value='audit@example.test';e.dispatchEvent(new Event('input',{bubbles:true}));});await click(p,'Отправить ссылку');}],
  ['extra-password-reset','auth',p=>p.goto(origin + '/#resetToken=audit-only',{settleMs:500})],
  ['extra-recommendations-sent','full',async p=>{await click(p,'Мне советуют1');await click(p,'Отправленные1');}],
];
const report=[];
const browser=await Browser.launch();
try {
  for(const width of [1440,768,390]) {
    for(const [name,mode,prep] of screens.filter(s=>!process.argv[2] || s[0].match(process.argv[2]))) {
      const p=await browser.newPage({width,height:width===768?1024:width===390?844:900,mobile:width===390});
      try {
        await p.send('Page.addScriptToEvaluateOnNewDocument',{source:`(${fixtures})(${JSON.stringify(mode)})`});
        await p.goto(origin,{settleMs:500});
        if(prep) await prep(p);
        await sleep(150);
        const image=`${out}/${width}-${name}.jpg`;
        await p.screenshot({path:image,quality:80,fullPage:true});
        const metrics=await p.eval(probe), appMetrics=await p.eval(app);
        const findings=[...judge(metrics,{width,allow:[]}).filter(f=>!APP_SKIP.has(f.id)),...judgeApp(appMetrics,metrics,{width,allow:[]})];
        const controls=await p.eval(()=>[...document.querySelectorAll('button,input,.select-trigger,h1,h2,.modal__content')].filter(e=>e.getClientRects().length).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:e.className,text:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,90),x:r.x,y:r.y,w:r.width,h:r.height,font:s.fontSize,radius:s.borderRadius,weight:s.fontWeight,color:s.color,bg:s.backgroundColor}}));
        report.push({width,name,image,title:metrics.hero,findings,controls,consoleErrors:p.consoleErrors});
        console.log(width,name,findings.filter(f=>f.level==='FAIL').map(f=>f.id).join(','));
      }catch(e){report.push({width,name,error:e.message});console.log('ERROR',width,name,e.message);}
      finally{await p.close();writeFileSync(`${out}/${process.argv[2]==='^extra-filters$'?'report-filters':process.argv[2]?'report-extra':'report'}.json`,JSON.stringify(report,null,2));}
    }
  }
}finally{await browser.close();}
