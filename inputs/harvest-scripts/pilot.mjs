// Interactive CDP pilot. Maintains a persistent "pilot" tab across calls
// by storing its targetId in /tmp/pilot-tab.id.
// Subcommands:
//   open <url>
//   eval '<js>'
//   html [maxBytes]      -> prints rendered HTML
//   links [filterRegex]  -> JSON list {href,text}
//   forms                -> dumps any <form> with fields
//   click '<selector>'
//   text [selector]      -> innerText
//   save <specialty> <formTypeHint>  -> save current page via downloader (URL)
//   close
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { listTargets, newTab, closeTab, attachToTab, gotoAndWait, getHTML, evalJS } from './cdp.mjs';

const ID_FILE = '/tmp/pilot-tab.id';
async function getTab(create = true) {
  if (existsSync(ID_FILE)) {
    const id = (await readFile(ID_FILE, 'utf8')).trim();
    const targets = await listTargets();
    if (targets.find(t => t.id === id)) return id;
  }
  if (!create) return null;
  const t = await newTab('about:blank');
  await writeFile(ID_FILE, t.id);
  return t.id;
}

const [cmd, ...args] = process.argv.slice(2);

async function withCdp(fn) {
  const id = await getTab(true);
  const cdp = await attachToTab(id);
  try { return await fn(cdp, id); } finally { cdp.close(); }
}

if (cmd === 'open') {
  const url = args[0];
  await withCdp(async (cdp) => {
    await gotoAndWait(cdp, url, { waitForNetIdleMs: 1500, timeoutMs: 45000 });
    const title = await evalJS(cdp, 'document.title');
    console.log('OPEN', url, '->', title);
  });
}
else if (cmd === 'eval') {
  await withCdp(async (cdp) => {
    const v = await evalJS(cdp, args.join(' '));
    process.stdout.write(typeof v === 'string' ? v : JSON.stringify(v, null, 2));
  });
}
else if (cmd === 'html') {
  const max = parseInt(args[0] || '200000', 10);
  await withCdp(async (cdp) => {
    const h = await getHTML(cdp);
    process.stdout.write(h.slice(0, max));
  });
}
else if (cmd === 'links') {
  const re = args[0] ? new RegExp(args[0], 'i') : null;
  await withCdp(async (cdp) => {
    const links = await evalJS(cdp, `
      Array.from(document.querySelectorAll('a[href]')).map(a => ({
        href: a.href, text: (a.textContent||'').trim().slice(0,200)
      }))
    `);
    const out = re ? links.filter(l => re.test(l.href) || re.test(l.text)) : links;
    process.stdout.write(JSON.stringify(out, null, 2));
  });
}
else if (cmd === 'forms') {
  await withCdp(async (cdp) => {
    const forms = await evalJS(cdp, `
      Array.from(document.querySelectorAll('form')).map(f => ({
        action: f.action, method: f.method,
        fields: Array.from(f.querySelectorAll('input,select,textarea,label')).map(el => ({
          tag: el.tagName.toLowerCase(),
          name: el.name||null, id: el.id||null, type: el.type||null,
          label: (el.tagName==='LABEL' ? el.textContent : null)?.trim().slice(0,200) || null,
          placeholder: el.placeholder || null
        }))
      }))
    `);
    process.stdout.write(JSON.stringify(forms, null, 2));
  });
}
else if (cmd === 'click') {
  await withCdp(async (cdp) => {
    const ok = await evalJS(cdp, `
      (() => { const el = document.querySelector(${JSON.stringify(args[0])}); if (!el) return false; el.click(); return true; })()
    `);
    console.log('click', ok);
  });
}
else if (cmd === 'text') {
  await withCdp(async (cdp) => {
    const sel = args[0] || 'body';
    const t = await evalJS(cdp, `(document.querySelector(${JSON.stringify(sel)})||document.body).innerText`);
    process.stdout.write(t || '');
  });
}
else if (cmd === 'url') {
  await withCdp(async (cdp) => {
    const u = await evalJS(cdp, 'location.href');
    console.log(u);
  });
}
else if (cmd === 'close') {
  if (existsSync(ID_FILE)) {
    const id = (await readFile(ID_FILE, 'utf8')).trim();
    await closeTab(id);
  }
}
else {
  console.log('cmds: open|eval|html|links|forms|click|text|url|close');
  process.exit(1);
}
