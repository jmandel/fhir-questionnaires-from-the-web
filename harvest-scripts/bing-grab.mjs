// Bing search via CDP -> scrape all candidate links -> download.
// Usage: node bing-grab.mjs <specialty> <formTypeHint> "<bing query>"
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';
import { download } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const [,, specialty='unknown', formTypeHint='auto', ...qparts] = process.argv;
const q = qparts.join(' ');
if (!q) { console.error('usage: node bing-grab.mjs <spec> <hint> "<query>"'); process.exit(2); }

const target = await newTab('about:blank');
const cdp = await attachToTab(target.id);
let saved = 0, skipped = 0;
try {
  for (let first = 1; first <= 41; first += 20) {  // pages 1, 21, 41
    const url = `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20&first=${first}`;
    await gotoAndWait(cdp, url, { waitForNetIdleMs: 1200, timeoutMs: 30000 }).catch(()=>{});
    const rawLinks = await evalJS(cdp, `
      Array.from(document.querySelectorAll('li.b_algo h2 a, li.b_algo .b_title a, li.b_algo a[href^="http"]')).map(a=>a.href)
        .filter(h => /^https?:\\/\\//.test(h))
        .filter((v,i,a)=>a.indexOf(v)===i)
    `);
    const links = [];
    for (const h of (rawLinks||[])) {
      if (/bing\.com\/ck\/a/.test(h)) {
        // decode u=a1<base64url>
        try {
          const u = new URL(h);
          const enc = u.searchParams.get('u') || '';
          if (enc.startsWith('a1')) {
            const b64 = enc.slice(2).replace(/-/g,'+').replace(/_/g,'/');
            const pad = '='.repeat((4 - b64.length % 4) % 4);
            const real = Buffer.from(b64 + pad, 'base64').toString('utf8');
            if (/^https?:\/\//.test(real)) links.push(real);
          }
        } catch {}
      } else if (!/bing\.com|microsoft\.com|msn\.com|aclick/i.test(h)) {
        links.push(h);
      }
    }
    // dedupe
    const uniq = [...new Set(links)];
    for (const u of uniq) {
      try {
        const r = await download({ url: u, title: '', specialty, formTypeHint, searchQuery: q, sourceEngine: 'bing', discoveredVia: url });
        if (r.saved) { saved++; console.log(`  + ${r.formType}  ${u}`); }
        else skipped++;
      } catch { skipped++; }
      await sleep(150);
    }
    await sleep(700);
  }
} finally { cdp.close(); await closeTab(target.id); }
console.log(`bing-grab: q="${q}" saved=${saved} skipped=${skipped}`);
