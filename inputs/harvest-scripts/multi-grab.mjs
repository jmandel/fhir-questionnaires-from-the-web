// Multi-engine grab: try engines in rotation, fall through on empty/blocked.
// Usage: node multi-grab.mjs <specialty> <hint> "<query>"
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';
import { download } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const [,, specialty='unknown', formTypeHint='auto', ...qparts] = process.argv;
const q = qparts.join(' ');
if (!q) { console.error('usage: node multi-grab.mjs <spec> <hint> "<query>"'); process.exit(2); }

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
function decodeDdg(h) {
  try {
    const u = new URL(h);
    const enc = u.searchParams.get('uddg');
    if (enc) return decodeURIComponent(enc);
  } catch {}
  return null;
}

async function runEngine(cdp, name, q) {
  const out = [];
  let pages = [];
  if (name === 'bing') pages = [0,20,40].map(o => `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20&first=${o+1}`);
  else if (name === 'brave') pages = [0,20,40].map(o => `https://search.brave.com/search?q=${encodeURIComponent(q)}&source=web&offset=${o}`);
  else if (name === 'ddg') pages = [0,30,60].map(s => `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}&s=${s}`);

  for (const page of pages) {
    await gotoAndWait(cdp, page, { waitForNetIdleMs: 1400, timeoutMs: 30000 }).catch(()=>{});
    const links = await evalJS(cdp, `
      Array.from(document.querySelectorAll('a[href^="http"]')).map(a=>a.href)
        .filter((v,i,a)=>a.indexOf(v)===i)
    `).catch(()=>[]);
    for (const h of (links||[])) {
      if (/bing\.com\/ck\/a/.test(h)) { const r = decodeBingCk(h); if (r) out.push(r); }
      else if (/duckduckgo\.com\/l\/?\?/.test(h)) { const r = decodeDdg(h); if (r) out.push(r); }
      else if (!/bing\.com|brave\.com|brave-search|brave-news|braveapps|duckduckgo\.com|microsoft\.com|msn\.com|aclick|google\.com/i.test(h)) {
        out.push(h);
      }
    }
    await sleep(700);
  }
  // dedupe
  return [...new Set(out.map(u => u.replace(/#:~:text=.*$/, '')))];
}

const target = await newTab('about:blank');
const cdp = await attachToTab(target.id);
const engines = ['bing', 'brave', 'ddg'];
let saved = 0, skipped = 0, totalLinks = 0;
try {
  const all = new Set();
  for (const eng of engines) {
    let links = [];
    try { links = await runEngine(cdp, eng, q); } catch (e) { console.log(`  engine ${eng} err: ${e.message}`); }
    console.log(`  [${eng}] ${links.length} candidates`);
    for (const u of links) all.add(`${u}\t${eng}`);
    if (links.length >= 8) break; // good enough
    await sleep(1500);
  }
  totalLinks = all.size;
  for (const entry of all) {
    const [u, eng] = entry.split('\t');
    try {
      const r = await download({ url: u, title: '', specialty, formTypeHint, searchQuery: q, sourceEngine: eng, discoveredVia: `multi:${eng}` });
      if (r.saved) { saved++; console.log(`  + ${r.formType}  ${u}`); }
      else { skipped++; if (process.env.DEBUG_SKIP) console.log(`    - ${r.skipped || r.error || 'unknown'}  ${u}`); }
    } catch { skipped++; }
    await sleep(150);
  }
} finally { cdp.close(); await closeTab(target.id); }
console.log(`multi-grab: q="${q}" links=${totalLinks} saved=${saved} skipped=${skipped}`);
