// Search Bing for clinic forms-hub pages and emit URL list.
// Usage: node find-hubs.mjs "<query>" > hub-urls.txt
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const q = process.argv.slice(2).join(' ');
if (!q) { console.error('usage: node find-hubs.mjs "<query>"'); process.exit(2); }

function decodeBingCk(h) {
  try {
    const u = new URL(h);
    const enc = u.searchParams.get('u') || '';
    if (enc.startsWith('a1')) {
      const b64 = enc.slice(2).replace(/-/g,'+').replace(/_/g,'/');
      const pad = '='.repeat((4 - b64.length % 4) % 4);
      const real = Buffer.from(b64 + pad, 'base64').toString('utf8');
      if (/^https?:\/\//.test(real)) return real;
    }
  } catch {}
  return null;
}

const target = await newTab('about:blank');
const cdp = await attachToTab(target.id);
try {
  const all = new Set();
  for (const first of [1, 21, 41]) {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20&first=${first}`;
    await gotoAndWait(cdp, url, { waitForNetIdleMs: 1400, timeoutMs: 30000 }).catch(()=>{});
    const links = await evalJS(cdp, `
      Array.from(document.querySelectorAll('li.b_algo h2 a, li.b_algo .b_title a')).map(a=>a.href)
    `).catch(()=>[]);
    for (const h of (links||[])) {
      let real = null;
      if (/bing\.com\/ck\/a/.test(h)) real = decodeBingCk(h);
      else if (/^https?:\/\//.test(h) && !/bing\.com|microsoft\.com|aclick/i.test(h)) real = h;
      if (!real) continue;
      // skip non-clinical noise hosts
      if (/wikipedia\.org|merriam-webster|collinsdictionary|cambridge\.org\/dictionary|dictionary\.com|britannica\.com|news\.google|cnn\.com|nytimes\.com|foxnews\.com|apnews\.com|reuters\.com|youtube\.com|facebook\.com|twitter\.com|reddit\.com|amazon\.com|webmd\.com|healthline\.com|healthgrades\.com|usnews\.com|patient\.info|drugs\.com|medlineplus|medscape\.com|uptodate\.com|epocrates\.com|doctor\.webmd|/i.test(real)) continue;
      all.add(real);
    }
    await sleep(800);
  }
  for (const u of all) console.log(u);
} finally { cdp.close(); await closeTab(target.id); }
