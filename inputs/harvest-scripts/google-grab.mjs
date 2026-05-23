// Run a Google search via CDP, scrape all PDF (or HTML form) links, and download.
// Usage: node google-grab.mjs <specialty> <formTypeHint> "<google query>"
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';
import { download } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const [,, specialty='unknown', formTypeHint='auto', ...qparts] = process.argv;
const q = qparts.join(' ');
if (!q) { console.error('usage: node google-grab.mjs <spec> <hint> "<query>"'); process.exit(2); }

const target = await newTab('about:blank');
const cdp = await attachToTab(target.id);

let saved = 0, skipped = 0;
try {
  // page 0..2
  for (let start = 0; start <= 30; start += 10) {
    const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20&hl=en&gl=us&start=${start}`;
    await gotoAndWait(cdp, url, { waitForNetIdleMs: 1200, timeoutMs: 30000 }).catch(()=>{});
    const links = await evalJS(cdp, `
      Array.from(document.querySelectorAll('a[href]')).map(a=>a.href)
        .filter(h => /^https?:\\/\\//.test(h) && !/google\\.|gstatic|youtube|webcache|googleusercontent/.test(h))
        .filter((v,i,a)=>a.indexOf(v)===i)
    `);
    // strip #:~:text=
    const urls = links.map(u => u.replace(/#:~:text=.*$/, '')).filter((v,i,a)=>a.indexOf(v)===i);
    for (const u of urls) {
      try {
        const r = await download({ url: u, title: '', specialty, formTypeHint, searchQuery: q, sourceEngine: 'google', discoveredVia: url });
        if (r.saved) { saved++; console.log(`  + ${r.formType}  ${u}`); }
        else skipped++;
      } catch { skipped++; }
      await sleep(120);
    }
    await sleep(800);
  }
} finally { cdp.close(); await closeTab(target.id); }
console.log(`google-grab: q="${q}" saved=${saved} skipped=${skipped}`);
