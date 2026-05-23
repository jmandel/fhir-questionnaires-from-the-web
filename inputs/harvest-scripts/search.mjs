// Search drivers — DuckDuckGo HTML (no JS), Bing, and Google via CDP if needed.
// DDG HTML is the cheapest; we fall back to Bing/Google through CDP for variety.
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0 Safari/537.36';

export async function ddgSearch(query, max = 30) {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } });
  const html = await r.text();
  const out = [];
  // result links look like: <a class="result__a" href="...uddg=ENCODED..."> or direct
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) && out.length < max) {
    let href = m[1].replace(/&amp;/g, '&');
    // DDG wraps as //duckduckgo.com/l/?uddg=ENCODED
    const u = href.match(/[?&]uddg=([^&]+)/);
    if (u) href = decodeURIComponent(u[1]);
    if (href.startsWith('//')) href = 'https:' + href;
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    out.push({ url: href, title });
  }
  return out;
}

export async function bingSearchCDP(query, max = 30) {
  const target = await newTab(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${max}`);
  const cdp = await attachToTab(target.id);
  try {
    await gotoAndWait(cdp, `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${max}`, { waitForNetIdleMs: 1200 });
    const results = await evalJS(cdp, `
      Array.from(document.querySelectorAll('li.b_algo h2 a')).slice(0, ${max}).map(a => ({
        url: a.href, title: (a.textContent||'').trim()
      }))
    `);
    return results || [];
  } finally { cdp.close(); await closeTab(target.id); }
}

export async function googleSearchCDP(query, max = 30) {
  const target = await newTab('about:blank');
  const cdp = await attachToTab(target.id);
  try {
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${max}&hl=en&gl=us`;
    await gotoAndWait(cdp, url, { waitForNetIdleMs: 1500 });
    const results = await evalJS(cdp, `
      (() => {
        const seen = new Set(); const out = [];
        document.querySelectorAll('a[href^="http"]').forEach(a => {
          const h = a.href;
          if (/google\\.|gstatic|youtube\\.com\\/redirect|webcache|googleusercontent/.test(h)) return;
          const t = (a.querySelector('h3')?.textContent || '').trim();
          if (!t) return;
          if (seen.has(h)) return; seen.add(h);
          out.push({ url: h, title: t });
        });
        return out.slice(0, ${max});
      })()
    `);
    return results || [];
  } finally { cdp.close(); await closeTab(target.id); }
}
