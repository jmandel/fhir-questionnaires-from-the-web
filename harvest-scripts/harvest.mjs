// Orchestrate searches per specialty/condition and download results.
import { ddgSearch, bingSearchCDP } from './search.mjs';
import { download, alreadySeenUrl } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const queries = JSON.parse(process.env.QUERIES_JSON || '[]');
if (!queries.length) {
  console.error('Set QUERIES_JSON env: [{"specialty":"...","formTypeHint":"...","q":"..."}]');
  process.exit(2);
}

const MAX_RESULTS_PER_QUERY = parseInt(process.env.MAX_PER_QUERY || '15', 10);
const ENGINES = (process.env.ENGINES || 'ddg,bing').split(',');

let totalSaved = 0, totalSkipped = 0, totalErr = 0;

for (const item of queries) {
  const { specialty, formTypeHint = 'auto', q } = item;
  const links = [];
  for (const engine of ENGINES) {
    try {
      let r = [];
      if (engine === 'ddg') r = await ddgSearch(q, MAX_RESULTS_PER_QUERY);
      else if (engine === 'bing') r = await bingSearchCDP(q, MAX_RESULTS_PER_QUERY);
      console.log(`[search:${engine}] "${q}" -> ${r.length} hits`);
      links.push(...r);
    } catch (e) {
      console.log(`[search:${engine}] ERR ${e.message}`);
    }
    await sleep(400 + Math.random()*600);
  }
  // dedupe within batch
  const seen = new Set();
  const uniq = links.filter(l => l.url && !seen.has(l.url) && (seen.add(l.url), true));

  for (const lnk of uniq) {
    if (alreadySeenUrl(lnk.url)) continue;
    try {
      const res = await download({ url: lnk.url, title: lnk.title, specialty, formTypeHint, searchQuery: q, sourceEngine: ENGINES.join('+'), discoveredVia: 'harvest.mjs' });
      if (res.saved) { totalSaved++; console.log(`  + ${specialty}/${res.formType}  ${lnk.url}`); }
      else if (res.skipped) { totalSkipped++; }
      else if (res.error) { totalErr++; console.log(`  ! ${res.error}  ${lnk.url}`); }
    } catch (e) { totalErr++; console.log(`  ! exn ${e.message}  ${lnk.url}`); }
    await sleep(250);
  }
  await sleep(800);
}

console.log(`DONE saved=${totalSaved} skipped=${totalSkipped} err=${totalErr}`);
