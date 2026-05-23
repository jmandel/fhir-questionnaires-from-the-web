#!/usr/bin/env node
// Lightweight Questionnaire sanity checker (no terminology server).
// Run: node fhir/scripts/validate.mjs

import fs from 'node:fs';
import path from 'node:path';

const DIR = 'questionnaires';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.json')).sort();

const SDC_BANNED_URLS = new Set([
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-candidateExpression',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-contextExpression',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationLinkPeriod',
  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-endpoint',
]);

const ITEM_TYPES = new Set(['group','display','question','boolean','decimal','integer','date','dateTime','time','string','text','url','choice','open-choice','attachment','reference','quantity']);

function collectItems(items, acc, parentLinkIds=new Set()) {
  if (!items) return;
  for (const it of items) {
    acc.push(it);
    if (it.item) collectItems(it.item, acc, parentLinkIds);
  }
}
function walkExtensions(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.extension)) for (const e of node.extension) { fn(e); walkExtensions(e, fn); }
  for (const k of Object.keys(node)) {
    if (k === 'extension') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach(x => walkExtensions(x, fn));
    else if (typeof v === 'object' && v !== null) walkExtensions(v, fn);
  }
}

let totalErrs = 0;
for (const f of files) {
  const errs = [];
  let q;
  try {
    q = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  } catch (e) {
    console.log(`✗ ${f}: invalid JSON — ${e.message}`);
    totalErrs++;
    continue;
  }
  if (q.resourceType !== 'Questionnaire') errs.push('resourceType != Questionnaire');
  for (const req of ['url','status','name','title']) if (!q[req]) errs.push(`missing ${req}`);
  if (!q.subjectType?.length) errs.push('missing subjectType');

  const all = [];
  collectItems(q.item, all);
  const linkIds = new Map();
  for (const it of all) {
    if (!it.linkId) { errs.push(`item missing linkId (text=${it.text||'?'})`); continue; }
    if (linkIds.has(it.linkId)) errs.push(`duplicate linkId ${it.linkId}`);
    linkIds.set(it.linkId, it);
    if (!ITEM_TYPES.has(it.type)) errs.push(`bad type "${it.type}" on ${it.linkId}`);
    if (it.type === 'choice' || it.type === 'open-choice') {
      if (!it.answerOption && !it.answerValueSet) errs.push(`${it.linkId}: choice w/o answerOption or answerValueSet`);
      if (it.answerOption) for (const ao of it.answerOption) {
        const has = ['valueCoding','valueString','valueInteger','valueDate','valueTime','valueReference'].some(k => k in ao);
        if (!has) errs.push(`${it.linkId}: answerOption missing valueX`);
      }
    }
  }
  // enableWhen target linkIds must exist
  for (const it of all) for (const ew of it.enableWhen || []) {
    if (!linkIds.has(ew.question)) errs.push(`${it.linkId}: enableWhen.question "${ew.question}" not found`);
  }
  // banned extensions
  walkExtensions(q, e => { if (e.url && SDC_BANNED_URLS.has(e.url)) errs.push(`uses out-of-scope extension ${e.url}`); });

  if (errs.length) {
    console.log(`✗ ${f} (${errs.length})`);
    for (const e of errs) console.log(`    - ${e}`);
    totalErrs += errs.length;
  } else {
    console.log(`✓ ${f}  (${all.length} items)`);
  }
}
console.log(`\n${files.length} files; ${totalErrs} issue(s).`);
process.exit(totalErrs > 0 ? 1 : 0);
