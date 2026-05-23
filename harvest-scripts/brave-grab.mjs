// Brave Search via CDP -> direct .href links -> download.
// Usage: node brave-grab.mjs <specialty> <formTypeHint> "<query>"
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';
import { download } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const [,, specialty='unknown', formTypeHint='auto', ...qparts] = process.argv;
const q = qparts.join(' ');
if (!q) { console.error('usage: node brave-grab.mjs <spec> <hint> "<query>"'); process.exit(2); }

const target = await newTab('about:blank');
const cdp = await attachToTab(target.id);
let saved = 0, skipped = 0;
try {
  // brave pagination: &offset=0, 20, 40
  for (const offset of [0, 20, 40]) {
    const url = `https://search.brave.com/search?q=${encodeURIComponent(q)}&source=web&offset=${offset}`;
    await gotoAndWait(cdp, url, { waitForNetIdleMs: 1500, timeoutMs: 30000 }).catch(()=>{});
    const links = await evalJS(cdp, `
      Array.from(document.querySelectorAll('a[href^="http"]')).map(a=>a.href)
        .filter(h => !/brave\\.com|brave-news|braveapps|brave-search/.test(h))
        .filter((v,i,a)=>a.indexOf(v)===i)
    `);
    for (const u0 of (links||[])) {
      const u = u0.replace(/#:~:text=.*$/, '');
      try {
        const r = await download({ url: u, title: '', specialty, formTypeHint, searchQuery: q, sourceEngine: 'brave', discoveredVia: url });
        if (r.saved) { saved++; console.log(`  + ${r.formType}  ${u}`); }
        else skipped++;
      } catch { skipped++; }
      await sleep(120);
    }
    await sleep(700);
  }
} finally { cdp.close(); await closeTab(target.id); }
console.log(`brave-grab: q="${q}" saved=${saved} skipped=${skipped}`);
