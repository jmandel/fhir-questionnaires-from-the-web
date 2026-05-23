// Build INDEX.md + sources.csv + summary.md from manifest.jsonl
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename, relative } from 'node:path';

const ROOT = '/home/jmandel/hobby/intake-forms';
const rows = (await readFile(`${ROOT}/manifest/manifest.jsonl`, 'utf8'))
  .split('\n').filter(Boolean).map(JSON.parse);

// Sample first-page text snippets to give the index a "what kinds of questions" flavor
const samples = new Map();
for (const r of rows) {
  let text = '';
  if (r.kind === 'pdf') {
    const o = spawnSync('pdftotext', ['-q','-layout','-l','2', r.path, '-'], { encoding:'utf8', timeout: 8000 });
    text = (o.stdout || '').slice(0, 1500);
  } else if (r.kind === 'html') {
    try { text = (await readFile(r.path,'utf8')).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,1500); } catch {}
  }
  // collapse whitespace; pick title-ish line + 2 representative question lines
  const lines = text.split(/\r?\n|\s{2,}/).map(s=>s.trim()).filter(s => s.length>5 && s.length<140);
  const isQuestion = (s) => /[?_]|please|how often|in the past|rate|describe|circle|check|have you|do you|number of|date of|y\s*\/\s*n|yes\s*\/\s*no|name|date of birth|chief complaint/i.test(s);
  const title = lines[0] || '';
  const qs = lines.filter(isQuestion).slice(0,3);
  samples.set(r.path, [title, ...qs].slice(0,4).join(' | '));
}

// Group by specialty -> formType -> rows
const bySpec = new Map();
for (const r of rows) {
  if (!bySpec.has(r.specialty)) bySpec.set(r.specialty, new Map());
  const m = bySpec.get(r.specialty);
  const ft = r.formType || 'unknown';
  if (!m.has(ft)) m.set(ft, []);
  m.get(ft).push(r);
}

// Host diversity
const hostSet = new Set();
for (const r of rows) hostSet.add(r.provenance?.host || (new URL(r.url)).host);

// CSV
const csvRows = [['sha8','specialty','formType','kind','bytes','host','engine','query','title','url','path'].join(',')];
for (const r of rows) {
  const f = (s) => `"${(s||'').toString().replace(/"/g,'""').replace(/\n/g,' ').slice(0,500)}"`;
  csvRows.push([r.sha256.slice(0,8), r.specialty, r.formType, r.kind, r.bytes, r.provenance?.host||'', r.provenance?.sourceEngine||'', r.provenance?.searchQuery||'', r.title||'', r.url, r.path].map(f).join(','));
}
await writeFile(`${ROOT}/manifest/sources.csv`, csvRows.join('\n')+'\n');

// MD index
const lines = [];
lines.push(`# Intake-Form Collection — Index`);
lines.push('');
lines.push(`*Generated: ${new Date().toISOString()}*`);
lines.push('');
lines.push(`**Totals:** ${rows.length} artifacts · ${hostSet.size} distinct source hosts · ${bySpec.size} specialty buckets`);
lines.push('');
lines.push(`**Kinds:** ` + Object.entries(rows.reduce((a,r)=>{a[r.kind]=(a[r.kind]||0)+1;return a;},{})).map(([k,v])=>`${k}=${v}`).join(', '));
lines.push('');
lines.push(`See \`sources.csv\` for the full table (every row carries the search query + engine that found it).`);
lines.push('');
lines.push(`---`);
const sortedSpec = [...bySpec.keys()].sort();
for (const spec of sortedSpec) {
  const m = bySpec.get(spec);
  const n = [...m.values()].reduce((a,b)=>a+b.length,0);
  const distinctHosts = new Set([...m.values()].flat().map(r => r.provenance?.host || ''));
  lines.push(`## ${spec}  *(${n} item${n!==1?'s':''} · ${distinctHosts.size} host${distinctHosts.size!==1?'s':''})*`);
  for (const ft of [...m.keys()].sort()) {
    const items = m.get(ft);
    lines.push(`### ${ft}  *(${items.length})*`);
    for (const r of items) {
      const host = r.provenance?.host || '';
      const snippet = (samples.get(r.path)||'').replace(/\|/g,'·').slice(0,160);
      const relP = relative(ROOT, r.path);
      lines.push(`- **${host}** — [${basename(r.path)}](${relP}) · ${r.bytes.toLocaleString()} B · markers=${r.markerCount||'?'}`);
      lines.push(`  - url: ${r.url}`);
      if (r.provenance?.searchQuery) lines.push(`  - via ${r.provenance.sourceEngine}: \`${r.provenance.searchQuery}\``);
      if (snippet) lines.push(`  - sample: _${snippet}_`);
    }
    lines.push('');
  }
  lines.push('');
}
await writeFile(`${ROOT}/INDEX.md`, lines.join('\n'));
console.log(`wrote INDEX.md (${rows.length} rows, ${hostSet.size} hosts, ${bySpec.size} specialties)`);
