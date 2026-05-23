// Download a list of URLs (stdin or JSON file) with a given specialty/formTypeHint.
// Usage:
//   node grab.mjs <specialty> <formTypeHint> [urlsJsonFile]
// If no file, reads URLs (one per line) from stdin.
import { readFile } from 'node:fs/promises';
import { download } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const [,, specialty='unknown', formTypeHint='auto', file] = process.argv;
let urls = [];
if (file) {
  const t = await readFile(file, 'utf8');
  try { urls = JSON.parse(t); if (urls[0] && typeof urls[0] === 'object') urls = urls.map(u => u.url || u.href || u); }
  catch { urls = t.split('\n').filter(Boolean); }
} else {
  const chunks = []; for await (const c of process.stdin) chunks.push(c);
  urls = Buffer.concat(chunks).toString('utf8').split('\n').map(s=>s.trim()).filter(Boolean);
}
const seen = new Set();
let s=0, k=0, e=0;
for (const u of urls) {
  let url = u;
  // strip google highlight fragments
  url = url.replace(/#:~:text=.*/, '');
  if (seen.has(url)) continue; seen.add(url);
  try {
    const r = await download({ url, title: '', specialty, formTypeHint, sourceEngine: 'manual', discoveredVia: file || 'stdin' });
    if (r.saved) { s++; console.log(`  + ${r.formType}  ${url}`); }
    else if (r.skipped) { k++; }
    else if (r.error) { e++; console.log(`  ! ${r.error} ${url}`); }
  } catch (ex) { e++; }
  await sleep(200);
}
console.log(`grab: saved=${s} skipped=${k} err=${e}`);
