#!/usr/bin/env node
// Снимает по cookie все экраны aftertaste в заданных ширинах.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Browser, sleep } from '/Users/rezanceva96/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs';

const label = process.argv[2] || 'before';
const base = resolve('/Users/rezanceva96/PhpstormProjects/aftertaste/.taste-skill', label);
mkdirSync(base, { recursive: true });

const ORIGIN = 'http://localhost:8080';
const COOKIE = process.env.AFTERTASTE_COOKIE || '';
if (!COOKIE) { console.error('AFTERTASTE_COOKIE env missing'); process.exit(2); }

const WIDTHS = [
  { w: 1440, h: 900, name: 'desktop' },
  { w: 768,  h: 1024, name: 'tablet' },
  { w: 390,  h: 844, name: 'mobile' },
];

// each: { id, path, name, settleMs?, prep?, loggedOut? }
const SCREENS = [
  { id: 'auth-login',       path: '/',                   loggedOut: true },
  { id: 'auth-register-1',  path: '/',                   loggedOut: true,
    prep: async (p) => { await p.eval(() => { const btn = [...document.querySelectorAll('button')].find(b => /зарегистр/i.test(b.textContent)); btn?.click(); }); await sleep(500); } },
  { id: 'auth-reset',       path: '/',                   loggedOut: true,
    prep: async (p) => { await p.eval(() => { const btn = [...document.querySelectorAll('button, a')].find(b => /забыл|восстан/i.test(b.textContent)); btn?.click(); }); await sleep(500); } },
  { id: 'catalog-done-empty', path: '/' },
  { id: 'catalog-plans-empty', path: '/',
    prep: async (p) => { await p.eval(() => { const btn = [...document.querySelectorAll('button')].find(b => /план/i.test(b.textContent)); btn?.click(); }); await sleep(500); } },
  { id: 'entry-form',       path: '/',
    prep: async (p) => { await p.eval(() => { const btn = [...document.querySelectorAll('button')].find(b => /добав|\+/i.test(b.textContent)); btn?.click(); }); await sleep(800); } },
  { id: 'profile-main',     path: '/',
    prep: async (p) => { await p.eval(() => { const btn = document.querySelector('[class*=avatar-button], .app-header .avatar'); btn?.click(); }); await sleep(300); await p.eval(() => { const a = [...document.querySelectorAll('a, button')].find(b => /кабинет|профил/i.test(b.textContent)); a?.click(); }); await sleep(800); } },
  { id: 'profile-password', path: '/',
    prep: async (p) => { await p.eval(() => { const btn = document.querySelector('[class*=avatar-button], .app-header .avatar'); btn?.click(); }); await sleep(300); await p.eval(() => { const a = [...document.querySelectorAll('a, button')].find(b => /кабинет|профил/i.test(b.textContent)); a?.click(); }); await sleep(800); await p.eval(() => { const a = [...document.querySelectorAll('a, button')].find(b => /парол/i.test(b.textContent)); a?.click(); }); await sleep(300); } },
  { id: 'profile-categories', path: '/',
    prep: async (p) => { await p.eval(() => { const btn = document.querySelector('[class*=avatar-button], .app-header .avatar'); btn?.click(); }); await sleep(300); await p.eval(() => { const a = [...document.querySelectorAll('a, button')].find(b => /кабинет|профил/i.test(b.textContent)); a?.click(); }); await sleep(800); await p.eval(() => { const a = [...document.querySelectorAll('a, button')].find(b => /категор/i.test(b.textContent)); a?.click(); }); await sleep(300); } },
  { id: 'profile-privacy', path: '/',
    prep: async (p) => { await p.eval(() => { const btn = document.querySelector('[class*=avatar-button], .app-header .avatar'); btn?.click(); }); await sleep(300); await p.eval(() => { const a = [...document.querySelectorAll('a, button')].find(b => /кабинет|профил/i.test(b.textContent)); a?.click(); }); await sleep(800); await p.eval(() => { const a = [...document.querySelectorAll('a, button')].find(b => /приватн/i.test(b.textContent)); a?.click(); }); await sleep(300); } },
];

const browser = await Browser.launch();
try {
  for (const { w, h, name } of WIDTHS) {
    for (const s of SCREENS) {
      const page = await browser.newPage({ width: w, height: h, mobile: w < 600 });
      try {
        await page.send('Network.enable');
        if (!s.loggedOut) {
          await page.send('Network.setCookie', { name: 'aftertaste_session', value: COOKIE, url: ORIGIN, httpOnly: true, sameSite: 'Lax' });
        }
        await page.goto(ORIGIN + s.path, { settleMs: 1200 });
        if (s.prep) await s.prep(page);
        await sleep(400);
        const path = `${base}/${name}-${s.id}.jpg`;
        await page.screenshot({ path, quality: 78 });
        console.log('→', `${name}-${s.id}.jpg`);
      } catch (e) {
        console.error('fail', name, s.id, e.message);
      } finally {
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
