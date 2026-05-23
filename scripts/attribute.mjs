#!/usr/bin/env node
// Add meta.source + meta.tag + provenance extensions to every Questionnaire JSON.
// Reads fhir/manifest/questionnaire-provenance.json which maps Questionnaire id -> source records.

import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://hobby.intake-forms/fhir';
const QDIR = 'questionnaires';
const MAP = 'manifest/questionnaire-provenance.json';

const manifest = fs.readFileSync('harvest-manifest/manifest.jsonl', 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const byStem = new Map();
for (const r of manifest) {
  const stem = path.basename(r.path).replace(/\.(pdf|html)$/, '');
  byStem.set(stem, r);
}

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));

function buildMeta(qid, info) {
  const stems = [info.primary, ...(info.alsoSeen || [])];
  const primary = byStem.get(info.primary);
  if (!primary) throw new Error(`No manifest entry for primary stem ${info.primary} (Q ${qid})`);
  const tags = [];
  if (primary.specialty)         tags.push({ system: `${BASE}/CodeSystem/specialty`, code: primary.specialty });
  if (primary.formType)          tags.push({ system: `${BASE}/CodeSystem/form-type`, code: primary.formType });
  if (primary.provenance?.host)  tags.push({ system: `${BASE}/CodeSystem/source-host`, code: primary.provenance.host });
  const ext = [
    { url: `${BASE}/StructureDefinition/derivedFromArtifact`, valueString: `raw/${primary.kind}/${info.primary}.${primary.ext}` },
    { url: `${BASE}/StructureDefinition/sourceSha256`,        valueString: primary.sha256 },
  ];
  if (primary.provenance?.searchQuery) {
    ext.push({ url: `${BASE}/StructureDefinition/sourceSearchQuery`, valueString: primary.provenance.searchQuery });
  }
  if (primary.provenance?.sourceEngine) {
    ext.push({ url: `${BASE}/StructureDefinition/sourceSearchEngine`, valueString: primary.provenance.sourceEngine });
  }
  // alsoSeen variants
  for (const s of (info.alsoSeen || [])) {
    const a = byStem.get(s);
    if (!a) { console.warn(`  (also-seen ${s} not in manifest, skipping)`); continue; }
    ext.push({
      url: `${BASE}/StructureDefinition/alsoSeenAt`,
      extension: [
        { url: 'sourceUrl',  valueUri: a.finalUrl || a.url },
        { url: 'host',       valueString: a.provenance?.host || '' },
        { url: 'artifact',   valueString: `raw/${a.kind}/${s}.${a.ext}` },
      ],
    });
  }
  return {
    source: primary.finalUrl || primary.url,
    tag: tags,
    extension: ext,
  };
}

const files = fs.readdirSync(QDIR).filter(f => f.endsWith('.json')).sort();
let touched = 0;
for (const f of files) {
  const qid = f.replace(/\.json$/, '');
  const info = map[qid];
  if (!info) { console.log(`- ${qid}: no provenance entry`); continue; }
  const q = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
  q.meta = buildMeta(qid, info);
  // re-order so meta sits right after id
  const ordered = {};
  for (const k of ['resourceType','id','meta']) if (k in q) ordered[k] = q[k];
  for (const k of Object.keys(q)) if (!(k in ordered)) ordered[k] = q[k];
  fs.writeFileSync(path.join(QDIR, f), JSON.stringify(ordered, null, 2) + '\n');
  touched++;
  console.log(`✓ ${qid}`);
}
console.log(`\nUpdated ${touched}/${files.length} Questionnaires.`);
