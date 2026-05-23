// Open a page via CDP, scrape all .pdf links (resolved), download each.
// Usage: node mine-page.mjs <specialty> <formTypeHint> <pageUrl>
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';
import { download } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const [,, specialty='unknown', formTypeHint='auto', pageUrl] = process.argv;
if (!pageUrl) { console.error('usage: node mine-page.mjs <spec> <hint> <pageUrl>'); process.exit(2); }

const target = await newTab('about:blank');
const cdp = await attachToTab(target.id);
let saved = 0, skipped = 0;
try {
  await gotoAndWait(cdp, pageUrl, { waitForNetIdleMs: 1800, timeoutMs: 30000 });
  const pdfs = await evalJS(cdp, `
    Array.from(new Set(
      Array.from(document.querySelectorAll('a[href]')).map(a => a.href)
        .filter(h => /\\.pdf(?:\\?|$|#)/i.test(h))
    ))
  `);
  console.log(`[${pageUrl}] ${pdfs.length} PDFs`);
  for (const u of (pdfs || [])) {
    try {
      const r = await download({ url: u, title: '', specialty, formTypeHint, sourceEngine: 'mine-page', discoveredVia: pageUrl });
      if (r.saved) { saved++; console.log(`  + ${r.formType}  ${u}`); }
      else { skipped++; if (process.env.DEBUG_SKIP) console.log(`    - ${r.skipped||r.error}  ${u}`); }
    } catch (e) { skipped++; }
    await sleep(150);
  }
} finally { cdp.close(); await closeTab(target.id); }
console.log(`mine-page: saved=${saved} skipped=${skipped}`);
