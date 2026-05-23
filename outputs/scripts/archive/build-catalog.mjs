#!/usr/bin/env node
// Build the static site:
//   - catalog.json (machine-readable taxonomy + per-form metadata)
//   - index.html   (browsable catalog with filtering/sorting)
//   - assets/style.css + assets/site.js + assets/banner.svg + assets/favicon.svg
//
// Taxonomy (hierarchical):
//   instrument-class
//     standardized       (a named published instrument)
//       with-loinc       (has a top-level LOINC `code` on the Questionnaire OR uses derivedFrom http://loinc.org/q/*)
//       without-loinc    (named instrument but no LOINC binding)
//     local              (practice/system-specific composition — not a named published instrument)

import fs from 'node:fs';
import path from 'node:path';

const QDIR = 'outputs/questionnaires';
const OUT_JSON = 'outputs/catalog.json';
const OUT_HTML = 'webapp/index.html';
const ASSETS_DIR = 'webapp/assets';

const TAX = {
  'phq-9':         { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'adult',  answeringMode:'self-report',          parentInstrument:'PHQ' },
  'phq-2':         { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'adult',  answeringMode:'self-report',          parentInstrument:'PHQ' },
  'phq-9-teen':    { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'pediatric',  answeringMode:'self-report',     parentInstrument:'PHQ' },
  'gad-7':         { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'adult',  answeringMode:'self-report' },
  'epds':          { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'mother-postpartum', answeringMode:'self-report' },
  'mdq':           { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'adult',  answeringMode:'self-report' },
  'cmrs-p':        { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'pediatric', answeringMode:'observer' },
  'asrs-v1-1':     { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'adult',  answeringMode:'self-report' },
  'rfs':           { class:'standardized', domain:'mental-health',     formType:'prom',         audience:'adult',  answeringMode:'self-report' },
  'moca':          { class:'standardized', domain:'cognition',         formType:'observational',audience:'adult',  answeringMode:'clinician-administered' },
  'c-ssrs-risk-assessment': { class:'standardized', domain:'suicide-risk', formType:'observational', audience:'adult', answeringMode:'clinician-administered' },
  'aims':          { class:'standardized', domain:'mental-health',     formType:'observational',audience:'both',   answeringMode:'clinician-administered' },

  'audit':         { class:'standardized', domain:'substance-use',     formType:'prom',         audience:'adult',  answeringMode:'self-report' },
  'audit-c':       { class:'standardized', domain:'substance-use',     formType:'prom',         audience:'adult',  answeringMode:'self-report', parentInstrument:'AUDIT' },
  'cage':          { class:'standardized', domain:'substance-use',     formType:'prom',         audience:'adult',  answeringMode:'self-report' },
  'dast-10':       { class:'standardized', domain:'substance-use',     formType:'prom',         audience:'adult',  answeringMode:'self-report' },

  'nichq-vanderbilt-parent-initial':   { class:'standardized', domain:'mental-health', formType:'prom', audience:'pediatric', answeringMode:'observer', parentInstrument:'NICHQ Vanderbilt ADHD' },
  'nichq-vanderbilt-parent-followup':  { class:'standardized', domain:'mental-health', formType:'monitoring', audience:'pediatric', answeringMode:'observer', parentInstrument:'NICHQ Vanderbilt ADHD' },
  'nichq-vanderbilt-teacher-initial':  { class:'standardized', domain:'mental-health', formType:'prom', audience:'pediatric', answeringMode:'observer', parentInstrument:'NICHQ Vanderbilt ADHD' },
  'nichq-vanderbilt-teacher-followup': { class:'standardized', domain:'mental-health', formType:'monitoring', audience:'pediatric', answeringMode:'observer', parentInstrument:'NICHQ Vanderbilt ADHD' },

  'koos':          { class:'standardized', domain:'ortho-msk',         formType:'prom', audience:'adult', answeringMode:'self-report' },
  'womac':         { class:'standardized', domain:'ortho-msk',         formType:'prom', audience:'adult', answeringMode:'self-report' },
  'odi':           { class:'standardized', domain:'ortho-msk',         formType:'prom', audience:'adult', answeringMode:'self-report' },
  'lefs':          { class:'standardized', domain:'ortho-msk',         formType:'prom', audience:'adult', answeringMode:'self-report' },
  'quickdash':     { class:'standardized', domain:'ortho-msk',         formType:'prom', audience:'adult', answeringMode:'self-report', parentInstrument:'DASH' },
  'faam':          { class:'standardized', domain:'ortho-msk',         formType:'prom', audience:'adult', answeringMode:'self-report' },
  'spadi':         { class:'standardized', domain:'ortho-msk',         formType:'prom', audience:'adult', answeringMode:'self-report' },

  'fiqr':          { class:'standardized', domain:'rheum',             formType:'prom', audience:'adult', answeringMode:'self-report' },
  'haq-di':        { class:'standardized', domain:'rheum',             formType:'prom', audience:'adult', answeringMode:'self-report' },
  'rapid3':        { class:'standardized', domain:'rheum',             formType:'prom', audience:'adult', answeringMode:'self-report' },

  'saq':           { class:'standardized', domain:'cardio',            formType:'prom', audience:'adult', answeringMode:'self-report' },
  'kccq-12':       { class:'standardized', domain:'cardio',            formType:'prom', audience:'adult', answeringMode:'self-report' },
  'mmrc':          { class:'standardized', domain:'pulm',              formType:'prom', audience:'adult', answeringMode:'self-report' },

  'ipss':          { class:'standardized', domain:'urology',           formType:'prom', audience:'adult', answeringMode:'self-report' },
  'paid-20':       { class:'standardized', domain:'mental-health',     formType:'prom', audience:'adult', answeringMode:'self-report' },
  'midas':         { class:'standardized', domain:'neurology',         formType:'prom', audience:'adult', answeringMode:'self-report' },

  'stop-bang':     { class:'standardized', domain:'sleep',             formType:'prom', audience:'adult', answeringMode:'self-report' },
  'isi':           { class:'standardized', domain:'sleep',             formType:'prom', audience:'adult', answeringMode:'self-report' },
  'ess':           { class:'standardized', domain:'sleep',             formType:'prom', audience:'adult', answeringMode:'self-report' },

  'barthel':       { class:'standardized', domain:'geriatrics',        formType:'prom',         audience:'adult', answeringMode:'clinician-administered' },
  'mahc-10':       { class:'standardized', domain:'geriatrics',        formType:'observational',audience:'adult', answeringMode:'clinician-administered' },
  'steadi-referral': { class:'standardized', domain:'geriatrics',      formType:'referral',     audience:'adult', answeringMode:'clinician-administered' },

  'flacc':         { class:'standardized', domain:'peds-pain',         formType:'observational',audience:'pediatric', answeringMode:'observer' },
  'sf-mpq':        { class:'standardized', domain:'pain',              formType:'prom', audience:'adult', answeringMode:'self-report', parentInstrument:'McGill Pain Questionnaire' },
  'sf-mpq-2':      { class:'standardized', domain:'pain',              formType:'prom', audience:'adult', answeringMode:'self-report', parentInstrument:'McGill Pain Questionnaire' },
  'bpi-short':     { class:'standardized', domain:'pain',              formType:'prom', audience:'adult', answeringMode:'self-report' },

  'aafp-social-needs': { class:'standardized', domain:'social-determinants', formType:'prom', audience:'adult', answeringMode:'self-report' },
  'aafp-adult-preventive-screening': { class:'standardized', domain:'preventive-care', formType:'checklist', audience:'adult', answeringMode:'clinician-administered' },

  'aacap-cap-intake-1':            { class:'local', domain:'mental-health',    formType:'intake',     audience:'pediatric', answeringMode:'observer' },
  'aacap-telephone-intake':        { class:'local', domain:'mental-health',    formType:'intake',     audience:'pediatric', answeringMode:'observer' },
  'aacap-medication-side-effects': { class:'local', domain:'mental-health',    formType:'monitoring', audience:'pediatric', answeringMode:'observer' },
  'aacap-stimulant-monitoring':    { class:'local', domain:'mental-health',    formType:'monitoring', audience:'pediatric', answeringMode:'observer' },

  'cc-union-intake':                { class:'local', domain:'primary-care',   formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'stanford-ir-dvt':                { class:'local', domain:'vascular',       formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'stanford-ir-ivc':                { class:'local', domain:'vascular',       formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'stanford-ir-fibroid':            { class:'local', domain:'gyn-obs',        formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'stanford-ir-demographics':       { class:'local', domain:'vascular',       formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'stanford-ortho-intake':          { class:'local', domain:'ortho-msk',      formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'stanford-valleycare-gyn':        { class:'local', domain:'gyn-obs',        formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'mgh-derm-intake':                { class:'local', domain:'dermatology',    formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'mgh-hrscc':                      { class:'local', domain:'dermatology',    formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'mgh-allergy-intake':             { class:'local', domain:'allergy-immunology', formType:'intake', audience:'adult', answeringMode:'self-report' },
  'mgh-vein-care':                  { class:'local', domain:'vascular',       formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'bwh-neurosurgery-intake':        { class:'local', domain:'neurosurgery',   formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'bwh-aerd-allergy':               { class:'local', domain:'allergy-immunology', formType:'intake', audience:'adult', answeringMode:'self-report' },
  'bwh-pediatric-allergy':          { class:'local', domain:'allergy-immunology', formType:'intake', audience:'pediatric', answeringMode:'observer' },
  'bwh-brain-mind':                 { class:'local', domain:'cognition',      formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'nyu-fresco-parkinson':           { class:'local', domain:'movement-disorders', formType:'intake', audience:'adult', answeringMode:'self-report' },
  'nyu-fgp-demographic':            { class:'local', domain:'primary-care',   formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'nyu-multi-physician-neuro':      { class:'local', domain:'neurology',      formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'hopkins-schizophrenia-consult':  { class:'local', domain:'mental-health',  formType:'intake', audience:'adult',  answeringMode:'self-report' },
  'upmc-jameson-bariatrics':        { class:'local', domain:'bariatric',      formType:'intake', audience:'adult',  answeringMode:'self-report' },
};

const DOMAIN_META = {
  'mental-health':       { label: 'Mental Health',         emoji: '🧠', tint: 'violet' },
  'substance-use':       { label: 'Substance Use',         emoji: '🍷', tint: 'rose' },
  'sleep':               { label: 'Sleep',                 emoji: '😴', tint: 'indigo' },
  'cognition':           { label: 'Cognition',             emoji: '🧩', tint: 'amber' },
  'suicide-risk':        { label: 'Suicide Risk',          emoji: '⚠️', tint: 'rose' },
  'neurology':           { label: 'Neurology',             emoji: '⚡', tint: 'amber' },
  'neurosurgery':        { label: 'Neurosurgery',          emoji: '🔬', tint: 'slate' },
  'movement-disorders':  { label: 'Movement Disorders',    emoji: '🚶', tint: 'amber' },
  'cardio':              { label: 'Cardiology',            emoji: '❤️', tint: 'rose' },
  'pulm':                { label: 'Pulmonology',           emoji: '🫁', tint: 'sky' },
  'ortho-msk':           { label: 'Orthopedics / MSK',     emoji: '🦴', tint: 'orange' },
  'rheum':               { label: 'Rheumatology',          emoji: '🌡️', tint: 'orange' },
  'pain':                { label: 'Pain Management',       emoji: '💢', tint: 'rose' },
  'peds-pain':           { label: 'Pediatric Pain',        emoji: '🧒', tint: 'teal' },
  'gi':                  { label: 'Gastroenterology',      emoji: '🥗', tint: 'lime' },
  'gyn-obs':             { label: 'GYN / OB',              emoji: '🌷', tint: 'pink' },
  'urology':             { label: 'Urology',               emoji: '💧', tint: 'sky' },
  'geriatrics':          { label: 'Geriatrics',            emoji: '👴', tint: 'slate' },
  'dermatology':         { label: 'Dermatology',           emoji: '🌞', tint: 'orange' },
  'allergy-immunology':  { label: 'Allergy & Immunology',  emoji: '🌼', tint: 'lime' },
  'vascular':            { label: 'Vascular',              emoji: '🩸', tint: 'rose' },
  'bariatric':           { label: 'Bariatric',             emoji: '⚖️', tint: 'teal' },
  'primary-care':        { label: 'Primary Care',          emoji: '🩺', tint: 'sky' },
  'social-determinants': { label: 'Social Determinants',   emoji: '🏘️', tint: 'teal' },
  'preventive-care':     { label: 'Preventive Care',       emoji: '🛡️', tint: 'lime' },
  'other':               { label: 'Other',                 emoji: '📋', tint: 'slate' },
};

const FORMTYPE_META = {
  prom:          { label: 'PROM',          glyph:'⊜' },
  intake:        { label: 'Intake',        glyph:'⊞' },
  monitoring:    { label: 'Monitoring',    glyph:'∿' },
  checklist:     { label: 'Checklist',     glyph:'☑' },
  observational: { label: 'Observational', glyph:'◉' },
  referral:      { label: 'Referral',      glyph:'➔' },
};

function inspect(item, acc) {
  if (!item) return;
  for (const it of item) {
    acc.totalItems++;
    if (it.type === 'group') acc.groups++;
    else if (it.type === 'display') acc.displays++;
    else {
      acc.questions++;
      acc.byType[it.type] = (acc.byType[it.type] || 0) + 1;
      if (it.required) acc.requiredCount++;
      if (it.readOnly) acc.readOnlyCount++;
    }
    if (it.item) inspect(it.item, acc);
  }
}

const SDC_FEATURES = {
  itemControl:           'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
  ordinalValue:          'http://hl7.org/fhir/StructureDefinition/ordinalValue',
  calculatedExpression:  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
  enableWhenExpression:  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression',
  variable:              'http://hl7.org/fhir/StructureDefinition/variable',
  displayCategory:       'http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory',
  unit:                  'http://hl7.org/fhir/StructureDefinition/questionnaire-unit',
  unitOption:            'http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption',
  regex:                 'http://hl7.org/fhir/StructureDefinition/regex',
  entryFormat:           'http://hl7.org/fhir/StructureDefinition/entryFormat',
  sliderStepValue:       'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue',
  minOccurs:             'http://hl7.org/fhir/StructureDefinition/questionnaire-minOccurs',
  maxOccurs:             'http://hl7.org/fhir/StructureDefinition/questionnaire-maxOccurs',
  shortText:             'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText',
  optionExclusive:       'http://hl7.org/fhir/StructureDefinition/questionnaire-optionExclusive',
  choiceOrientation:     'http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation',
};
const URL_TO_FEATURE = Object.fromEntries(Object.entries(SDC_FEATURES).map(([k,v]) => [v,k]));
function findFeatures(node, found) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { for (const x of node) findFeatures(x, found); return; }
  if (typeof node.url === 'string' && URL_TO_FEATURE[node.url]) found.add(URL_TO_FEATURE[node.url]);
  if (node.system === 'http://hl7.org/fhir/questionnaire-item-control' && typeof node.code === 'string') found.add(`itemControl:${node.code}`);
  for (const k of Object.keys(node)) findFeatures(node[k], found);
}

function classifyLoinc(q) {
  const hasCodeLoinc    = (q.code || []).some(c => c.system === 'http://loinc.org');
  const hasDerivedLoinc = (q.derivedFrom || []).some(u => typeof u === 'string' && u.startsWith('http://loinc.org/'));
  let anyItemLoinc = false;
  (function walk(items) {
    if (!items) return;
    for (const it of items) {
      if ((it.code || []).some(c => c.system === 'http://loinc.org')) anyItemLoinc = true;
      if (it.item) walk(it.item);
    }
  })(q.item);
  return hasCodeLoinc || hasDerivedLoinc || anyItemLoinc;
}

function summarize(q, taxEntry) {
  const acc = { totalItems: 0, groups: 0, displays: 0, questions: 0, requiredCount: 0, readOnlyCount: 0, byType: {} };
  inspect(q.item, acc);
  const features = new Set();
  findFeatures(q.item, features);
  findFeatures(q.extension, features);
  const meta = q.meta || {};
  const sourceUrl = meta.source || null;
  const tags = (meta.tag || []).reduce((m, t) => { m[t.system.split('/').pop()] = t.code; return m; }, {});
  const sha = (meta.extension || []).find(e => e.url.endsWith('/sourceSha256'))?.valueString || null;
  const artifact = (meta.extension || []).find(e => e.url.endsWith('/derivedFromArtifact'))?.valueString || null;
  const alsoSeen = (meta.extension || []).filter(e => e.url.endsWith('/alsoSeenAt')).length;
  return {
    id: q.id, name: q.name, title: q.title, copyright: q.copyright || null,
    derivedFrom: q.derivedFrom || [], code: q.code || [],
    hasLoinc: classifyLoinc(q),
    classKind: taxEntry?.class || 'local',
    domain: taxEntry?.domain || 'other',
    formType: taxEntry?.formType || 'intake',
    audience: taxEntry?.audience || 'adult',
    answeringMode: taxEntry?.answeringMode || 'self-report',
    parentInstrument: taxEntry?.parentInstrument || null,
    stats: acc,
    features: Array.from(features).sort(),
    source: { url: sourceUrl, sha256: sha, artifact, alsoSeenCount: alsoSeen, specialty: tags.specialty, formTypeTag: tags['form-type'], host: tags['source-host'] },
    path: `questionnaires/${q.id}.json`,
  };
}

const files = fs.readdirSync(QDIR).filter(f => f.endsWith('.json')).sort();
const catalog = [];
const missingTax = [];
for (const f of files) {
  const q = JSON.parse(fs.readFileSync(path.join(QDIR, f), 'utf8'));
  const t = TAX[q.id];
  if (!t) missingTax.push(q.id);
  catalog.push(summarize(q, t));
}
if (missingTax.length) console.warn(`! No taxonomy entry for: ${missingTax.join(', ')}`);

function groupBy(arr, key) { return arr.reduce((m, x) => { (m[x[key]] ||= []).push(x); return m; }, {}); }
const byClass = groupBy(catalog, 'classKind');
const standardized = byClass.standardized || [];
const local = byClass.local || [];
const taxonomy = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totals: { total: catalog.length, standardized: standardized.length, standardizedWithLoinc: standardized.filter(c=>c.hasLoinc).length, local: local.length },
  byClass: {
    standardized: { withLoinc: standardized.filter(c=>c.hasLoinc).map(c=>c.id), withoutLoinc: standardized.filter(c=>!c.hasLoinc).map(c=>c.id) },
    local: local.map(c=>c.id),
  },
  byDomain:   Object.fromEntries(Object.entries(groupBy(catalog, 'domain')).map(([k,v]) => [k, v.map(x=>x.id)])),
  byFormType: Object.fromEntries(Object.entries(groupBy(catalog, 'formType')).map(([k,v]) => [k, v.map(x=>x.id)])),
  byAudience: Object.fromEntries(Object.entries(groupBy(catalog, 'audience')).map(([k,v]) => [k, v.map(x=>x.id)])),
};

fs.mkdirSync(ASSETS_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({ taxonomy, items: catalog, meta: { domains: DOMAIN_META, formTypes: FORMTYPE_META } }, null, 2) + '\n');
console.log(`Wrote ${OUT_JSON}`);

// ─── Build banner SVG ───────────────────────────────────────────────────────
const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Decorative clinical-form banner">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c4a6e"/><stop offset="0.5" stop-color="#1e6fb8"/><stop offset="1" stop-color="#0891b2"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="320" fill="url(#g)"/>
  <rect width="1200" height="320" fill="url(#grid)"/>
  <!-- Stylized form rows -->
  <g transform="translate(72,80)" opacity="0.85">
    <g fill="rgba(255,255,255,0.18)">
      <rect x="0"   y="0"  width="220" height="14" rx="3"/>
      <rect x="0"   y="36" width="280" height="14" rx="3"/>
      <rect x="0"   y="72" width="160" height="14" rx="3"/>
      <rect x="0"   y="108" width="240" height="14" rx="3"/>
    </g>
    <g fill="rgba(255,255,255,0.32)">
      <circle cx="280"  cy="7"   r="7"/>
      <circle cx="320"  cy="7"   r="7"/>
      <circle cx="360"  cy="7"   r="7" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.85)"/>
      <circle cx="280"  cy="43"  r="7"/>
      <circle cx="320"  cy="43"  r="7" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.85)"/>
      <circle cx="360"  cy="43"  r="7"/>
      <circle cx="220"  cy="79"  r="7" stroke="white" stroke-width="2" fill="rgba(255,255,255,0.85)"/>
      <circle cx="260"  cy="79"  r="7"/>
      <circle cx="300"  cy="79"  r="7"/>
      <circle cx="340"  cy="79"  r="7"/>
    </g>
  </g>
  <!-- FHIR-ish flame, abstract -->
  <g transform="translate(960,40)" opacity="0.95">
    <path d="M120 0 C140 60 60 70 90 140 C100 180 80 210 120 240 C30 220 -10 130 50 60 C80 30 100 20 120 0Z"
          fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
    <path d="M120 30 C135 70 80 90 100 140 C110 170 95 195 120 220 C70 200 50 140 80 95 C95 70 110 50 120 30Z"
          fill="rgba(255,255,255,0.35)"/>
  </g>
</svg>
`;
fs.writeFileSync(path.join(ASSETS_DIR, 'banner.svg'), bannerSvg);

// Favicon — same flame, smaller
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0c4a6e"/>
  <path d="M36 8 C42 22 22 25 30 42 C33 50 27 56 36 64 C12 58 4 36 18 20 C25 14 30 12 36 8Z" fill="#7dd3fc"/>
</svg>
`;
fs.writeFileSync(path.join(ASSETS_DIR, 'favicon.svg'), favicon);

// ─── Build CSS ───────────────────────────────────────────────────────────────
const css = `/* Design tokens */
:root {
  --bg:        #f7f6f3;
  --panel:     #ffffff;
  --panel-2:   #fafaf7;
  --ink:       #0f172a;
  --muted:     #64748b;
  --line:      #e2e8f0;
  --line-2:    #cbd5e1;
  --accent:    #0c4a6e;
  --accent-2:  #1e6fb8;
  --accent-3:  #0891b2;
  --accent-bg: #ecfeff;
  --radius:    10px;
  --shadow-1:  0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.04);
  --shadow-2:  0 4px 12px rgba(15,23,42,0.06), 0 2px 4px rgba(15,23,42,0.04);
  --font-ui:   -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Monaco, monospace;

  /* Tint palette — domain pills */
  --tint-violet-bg: #ede9fe; --tint-violet-ink: #5b21b6;
  --tint-rose-bg:   #ffe4e6; --tint-rose-ink:   #9f1239;
  --tint-indigo-bg: #e0e7ff; --tint-indigo-ink: #3730a3;
  --tint-amber-bg:  #fef3c7; --tint-amber-ink:  #92400e;
  --tint-sky-bg:    #e0f2fe; --tint-sky-ink:    #075985;
  --tint-orange-bg: #ffedd5; --tint-orange-ink: #9a3412;
  --tint-pink-bg:   #fce7f3; --tint-pink-ink:   #9d174d;
  --tint-teal-bg:   #ccfbf1; --tint-teal-ink:   #115e59;
  --tint-lime-bg:   #ecfccb; --tint-lime-ink:   #365314;
  --tint-slate-bg:  #f1f5f9; --tint-slate-ink:  #334155;

  /* Class pills */
  --pill-std-bg:    #dcfce7; --pill-std-ink:    #166534;
  --pill-loinc-bg:  #dbeafe; --pill-loinc-ink:  #1e40af;
  --pill-local-bg:  #fef3c7; --pill-local-ink:  #92400e;
}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font: 14px/1.5 var(--font-ui);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
a { color: var(--accent-2); }
a:hover { color: var(--accent); }
code { font-family: var(--font-mono); font-size: 12.5px; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }

/* ── Banner / hero ───────────────────────────────────────────────────────── */
.banner {
  position: relative;
  height: 220px;
  background: linear-gradient(135deg, #0c4a6e 0%, #1e6fb8 55%, #0891b2 100%);
  overflow: hidden;
}
.banner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.7; }
.banner-inner {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 32px;
  color: white;
}
.banner h1 {
  margin: 0 0 6px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: -0.01em;
  text-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
.banner .tagline { font-size: 15px; opacity: 0.95; max-width: 760px; text-shadow: 0 1px 4px rgba(0,0,0,0.2); }
.banner .badges { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.banner .badges a {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.18); color: white; text-decoration: none;
  padding: 4px 10px; border-radius: 999px; font-size: 12px;
  border: 1px solid rgba(255,255,255,0.32);
  backdrop-filter: blur(4px);
}
.banner .badges a:hover { background: rgba(255,255,255,0.28); }
.banner .badges svg { width: 12px; height: 12px; fill: currentColor; }

/* ── Stats strip ─────────────────────────────────────────────────────────── */
.stats-strip {
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.stats-row {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 32px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0;
}
.stat {
  padding: 8px 24px;
  border-right: 1px solid var(--line);
}
.stat:last-child { border-right: none; }
.stat .num { font-size: 26px; font-weight: 700; color: var(--accent); display: block; line-height: 1.1; }
.stat .label { font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; display: block; }

/* ── Main layout ─────────────────────────────────────────────────────────── */
main { max-width: 1200px; margin: 0 auto; padding: 24px 32px 80px; }

/* ── Filter toolbar ─────────────────────────────────────────────────────── */
.toolbar {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-1);
  padding: 16px 18px;
  margin-bottom: 18px;
  display: grid;
  grid-template-columns: 2fr repeat(6, 1fr) auto;
  gap: 12px;
  align-items: end;
}
.toolbar .field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.toolbar label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 500;
}
.toolbar select,
.toolbar input[type="text"] {
  border: 1px solid var(--line);
  background: white;
  padding: 7px 9px;
  border-radius: 6px;
  font: inherit;
  color: var(--ink);
  width: 100%;
}
.toolbar select:focus, .toolbar input[type="text"]:focus {
  outline: 2px solid var(--accent-2);
  outline-offset: 1px;
  border-color: var(--accent-2);
}
.reset-btn {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--accent-2);
  padding: 8px 14px;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  white-space: nowrap;
}
.reset-btn:hover { background: var(--accent-bg); border-color: var(--accent-2); }

@media (max-width: 1080px) {
  .toolbar { grid-template-columns: 1fr 1fr 1fr; }
  .toolbar .field.search { grid-column: 1 / -1; }
}

/* ── Result count ────────────────────────────────────────────────────────── */
.result-count { color: var(--muted); font-size: 13px; margin-bottom: 10px; }

/* ── Table ───────────────────────────────────────────────────────────────── */
.table-wrap {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
table { width: 100%; border-collapse: collapse; }
thead { background: var(--panel-2); }
th {
  text-align: left;
  padding: 12px 14px;
  font-weight: 600;
  font-size: 11.5px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
th:hover { color: var(--ink); }
th .arrow { display: inline-block; opacity: 0.35; font-size: 9px; margin-left: 4px; vertical-align: 1px; }
th.active { color: var(--accent); }
th.active .arrow { opacity: 1; color: var(--accent); }
td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
}
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover { background: #fcfcfa; }

.title-cell { max-width: 360px; }
.title-cell a {
  display: inline-block;
  color: var(--accent-2);
  text-decoration: none;
  font-weight: 500;
  font-size: 14.5px;
  line-height: 1.35;
}
.title-cell a:hover { color: var(--accent); text-decoration: underline; }
.title-cell .id {
  color: var(--muted);
  font-size: 12px;
  font-family: var(--font-mono);
  margin-top: 3px;
}
.title-cell .variant {
  color: var(--muted);
  font-size: 12px;
  margin-top: 1px;
  font-style: italic;
}

/* ── Pills ───────────────────────────────────────────────────────────────── */
.pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  white-space: nowrap;
  line-height: 1.4;
}
.pill.std    { background: var(--pill-std-bg);    color: var(--pill-std-ink); }
.pill.loinc  { background: var(--pill-loinc-bg);  color: var(--pill-loinc-ink); }
.pill.local  { background: var(--pill-local-bg);  color: var(--pill-local-ink); }
.pill-group  { display: flex; flex-wrap: wrap; gap: 4px; }

.domain-pill { padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 500; }
.tint-violet { background: var(--tint-violet-bg); color: var(--tint-violet-ink); }
.tint-rose   { background: var(--tint-rose-bg);   color: var(--tint-rose-ink); }
.tint-indigo { background: var(--tint-indigo-bg); color: var(--tint-indigo-ink); }
.tint-amber  { background: var(--tint-amber-bg);  color: var(--tint-amber-ink); }
.tint-sky    { background: var(--tint-sky-bg);    color: var(--tint-sky-ink); }
.tint-orange { background: var(--tint-orange-bg); color: var(--tint-orange-ink); }
.tint-pink   { background: var(--tint-pink-bg);   color: var(--tint-pink-ink); }
.tint-teal   { background: var(--tint-teal-bg);   color: var(--tint-teal-ink); }
.tint-lime   { background: var(--tint-lime-bg);   color: var(--tint-lime-ink); }
.tint-slate  { background: var(--tint-slate-bg);  color: var(--tint-slate-ink); }

.formtype { font-size: 12.5px; color: var(--ink); display: inline-flex; align-items: center; gap: 4px; }
.formtype .glyph { color: var(--accent-2); font-size: 14px; }
.audience-tag { font-size: 12px; color: var(--muted); }

.stats-cell { font-size: 12px; color: var(--muted); white-space: nowrap; line-height: 1.5; }
.stats-cell strong { color: var(--ink); font-weight: 600; }
.feature-chip {
  font-size: 11px;
  background: var(--accent-bg);
  color: var(--accent);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
}

.source-cell { color: var(--muted); font-size: 12px; max-width: 240px; line-height: 1.4; }
.source-cell a { color: var(--muted); }
.source-cell .variants {
  color: var(--accent-3);
  font-size: 11px;
  font-weight: 500;
  margin-top: 2px;
}

/* ── Empty / footer ──────────────────────────────────────────────────────── */
.empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--muted);
}
.empty .icon { font-size: 32px; margin-bottom: 8px; }

.footer {
  max-width: 1200px;
  margin: 24px auto 0;
  padding: 0 32px;
  color: var(--muted);
  font-size: 12.5px;
  text-align: center;
}
.footer code { background: rgba(255,255,255,0.6); }

/* ── Responsive niceties ────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .banner { height: 180px; }
  .banner h1 { font-size: 22px; }
  .banner .tagline { font-size: 13px; }
  .stat { padding: 8px 12px; }
  .stat .num { font-size: 22px; }
  main { padding: 16px 16px 60px; }
  th, td { padding: 10px 10px; font-size: 13px; }
  .title-cell a { font-size: 13.5px; }
}
`;
fs.writeFileSync(path.join(ASSETS_DIR, 'style.css'), css);

// ─── Site JS ─────────────────────────────────────────────────────────────────
const siteJs = `(function() {
  const DATA = JSON.parse(document.getElementById('data').textContent);
  const META = JSON.parse(document.getElementById('meta').textContent);

  for (const r of DATA) {
    r.questionCount = r.stats.questions;
    r.featuresCount = r.features.length;
    r.specialty = r.source.specialty || '';
    const d = META.domains[r.domain] || META.domains.other;
    r.domainLabel = d.label;
    r.domainEmoji = d.emoji;
    r.domainTint  = d.tint;
    const f = META.formTypes[r.formType] || { label: r.formType, glyph: '·' };
    r.formTypeLabel = f.label;
    r.formTypeGlyph = f.glyph;
  }

  function distinct(field) { return [...new Set(DATA.map(r => r[field]))].filter(Boolean).sort(); }
  function fillSelect(id, values, formatter) {
    const sel = document.getElementById(id);
    for (const v of values) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = formatter ? formatter(v) : v;
      sel.appendChild(opt);
    }
  }
  fillSelect('f-domain',   distinct('domain'),    d => (META.domains[d] ? META.domains[d].emoji + ' ' + META.domains[d].label : d));
  fillSelect('f-formType', distinct('formType'),  ft => (META.formTypes[ft] ? META.formTypes[ft].label : ft));
  fillSelect('f-audience', distinct('audience'));
  fillSelect('f-mode',     distinct('answeringMode'));

  const state = { q:'', class:'', loinc:'', domain:'', formType:'', audience:'', mode:'', sort:'title', dir:1 };

  function read() {
    state.q        = document.getElementById('q').value.trim().toLowerCase();
    state.class    = document.getElementById('f-class').value;
    state.loinc    = document.getElementById('f-loinc').value;
    state.domain   = document.getElementById('f-domain').value;
    state.formType = document.getElementById('f-formType').value;
    state.audience = document.getElementById('f-audience').value;
    state.mode     = document.getElementById('f-mode').value;
    render();
  }

  function filtered() {
    return DATA.filter(r => {
      if (state.q) {
        const hay = (r.title + ' ' + r.id + ' ' + (r.specialty || '') + ' ' + (r.parentInstrument || '') + ' ' + r.domain + ' ' + r.domainLabel).toLowerCase();
        if (!hay.includes(state.q)) return false;
      }
      if (state.class    && r.classKind     !== state.class)    return false;
      if (state.loinc === 'yes' && !r.hasLoinc) return false;
      if (state.loinc === 'no'  &&  r.hasLoinc) return false;
      if (state.domain   && r.domain        !== state.domain)   return false;
      if (state.formType && r.formType      !== state.formType) return false;
      if (state.audience && r.audience      !== state.audience) return false;
      if (state.mode     && r.answeringMode !== state.mode)     return false;
      return true;
    });
  }

  function sortRows(rows) {
    const k = state.sort, dir = state.dir;
    return rows.slice().sort((a,b) => {
      const va = a[k], vb = b[k];
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function render() {
    const rows = sortRows(filtered());
    const tb = document.getElementById('tbody');
    tb.innerHTML = '';
    document.getElementById('result-count').textContent =
      rows.length + ' of ' + DATA.length + ' Questionnaire' + (DATA.length === 1 ? '' : 's');
    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td class="title-cell">
          <a href="\${esc(r.path)}" target="_blank" rel="noopener">\${esc(r.title)}</a>
          <div class="id">\${esc(r.id)}</div>
          \${r.parentInstrument ? '<div class="variant">variant of '+esc(r.parentInstrument)+'</div>' : ''}
        </td>
        <td>
          <span class="domain-pill tint-\${esc(r.domainTint)}">\${r.domainEmoji} \${esc(r.domainLabel)}</span>
        </td>
        <td>
          <div class="pill-group">
            <span class="pill \${r.classKind === 'standardized' ? 'std' : 'local'}">\${esc(r.classKind)}</span>
            \${r.hasLoinc ? '<span class="pill loinc">LOINC</span>' : ''}
          </div>
        </td>
        <td><span class="formtype"><span class="glyph">\${r.formTypeGlyph}</span> \${esc(r.formTypeLabel)}</span></td>
        <td><span class="audience-tag">\${esc(r.audience)}</span><br><span class="audience-tag">\${esc(r.answeringMode)}</span></td>
        <td class="stats-cell"><strong>\${r.stats.questions}</strong> q · <strong>\${r.stats.groups}</strong> grp\${r.stats.requiredCount ? ' · '+r.stats.requiredCount+' req' : ''}</td>
        <td class="stats-cell"><span class="feature-chip">\${r.features.length}</span></td>
        <td class="source-cell">
          \${r.source.url ? '<a href="'+esc(r.source.url)+'" target="_blank" rel="noopener">'+esc(r.source.host || r.source.url)+'</a>' : '—'}
          \${r.source.alsoSeenCount ? '<div class="variants">+ '+r.source.alsoSeenCount+' variant'+(r.source.alsoSeenCount===1?'':'s')+'</div>' : ''}
        </td>
      \`;
      tb.appendChild(tr);
    }
    document.getElementById('empty').style.display = rows.length ? 'none' : 'block';
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.classList.toggle('active', th.dataset.sort === state.sort);
      const a = th.querySelector('.arrow');
      if (a) a.textContent = th.dataset.sort === state.sort ? (state.dir === 1 ? '▾' : '▴') : '▾';
    });
  }

  document.querySelectorAll('input,select').forEach(el => el.addEventListener('input', read));
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      if (state.sort === th.dataset.sort) state.dir = -state.dir;
      else { state.sort = th.dataset.sort; state.dir = 1; }
      render();
    });
  });
  document.getElementById('reset').addEventListener('click', () => {
    document.getElementById('q').value = '';
    document.querySelectorAll('select').forEach(s => s.value = '');
    read();
  });

  read();
})();
`;
fs.writeFileSync(path.join(ASSETS_DIR, 'site.js'), siteJs);

// ─── Build index.html ───────────────────────────────────────────────────────
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>FHIR Questionnaires from the Web — ${taxonomy.totals.total} forms</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="${taxonomy.totals.total} hand-authored FHIR R4 Questionnaire resources converted from real-world clinic intake forms and validated PROMs, with full provenance back to the source PDFs.">
  <link rel="icon" type="image/svg+xml" href="assets/favicon.svg">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<header class="banner">
  <img src="assets/banner.svg" alt="">
  <div class="banner-inner">
    <h1>FHIR Questionnaires from the Web</h1>
    <p class="tagline">${taxonomy.totals.total} hand-authored R4 Questionnaire resources converted from real-world provider intake forms and validated PROMs, using HL7 SDC STU4 idioms — with full provenance back to each source PDF.</p>
    <div class="badges">
      <a href="https://hl7.org/fhir/R4/questionnaire.html" target="_blank" rel="noopener">FHIR R4 Questionnaire</a>
      <a href="https://hl7.org/fhir/uv/sdc/" target="_blank" rel="noopener">SDC IG STU4</a>
      <a href="catalog.json">catalog.json</a>
      <a href="notes/sdc-best-practices.md">SDC cheat-sheet</a>
      <a href="README.md">README</a>
    </div>
  </div>
</header>

<section class="stats-strip" aria-label="Collection statistics">
  <div class="stats-row">
    <div class="stat"><span class="num">${taxonomy.totals.total}</span><span class="label">Questionnaires</span></div>
    <div class="stat"><span class="num">${taxonomy.totals.standardized}</span><span class="label">Standardized</span></div>
    <div class="stat"><span class="num">${taxonomy.totals.standardizedWithLoinc}</span><span class="label">With LOINC</span></div>
    <div class="stat"><span class="num">${taxonomy.totals.local}</span><span class="label">Practice / system</span></div>
  </div>
</section>

<main>
  <div class="toolbar" role="search">
    <div class="field search">
      <label for="q">Search</label>
      <input type="text" id="q" placeholder="title, id, specialty, parent instrument…" autocomplete="off">
    </div>
    <div class="field">
      <label for="f-class">Class</label>
      <select id="f-class"><option value="">all</option><option value="standardized">standardized</option><option value="local">local</option></select>
    </div>
    <div class="field">
      <label for="f-loinc">LOINC</label>
      <select id="f-loinc"><option value="">any</option><option value="yes">has LOINC</option><option value="no">no LOINC</option></select>
    </div>
    <div class="field">
      <label for="f-domain">Domain</label>
      <select id="f-domain"><option value="">all</option></select>
    </div>
    <div class="field">
      <label for="f-formType">Form type</label>
      <select id="f-formType"><option value="">all</option></select>
    </div>
    <div class="field">
      <label for="f-audience">Audience</label>
      <select id="f-audience"><option value="">all</option></select>
    </div>
    <div class="field">
      <label for="f-mode">Mode</label>
      <select id="f-mode"><option value="">all</option></select>
    </div>
    <button class="reset-btn" id="reset" type="button">Clear</button>
  </div>

  <div class="result-count" id="result-count"></div>

  <div class="table-wrap">
    <table id="tbl">
      <thead>
        <tr>
          <th data-sort="title">Title <span class="arrow">▾</span></th>
          <th data-sort="domain">Domain <span class="arrow">▾</span></th>
          <th data-sort="classKind">Class <span class="arrow">▾</span></th>
          <th data-sort="formType">Form type <span class="arrow">▾</span></th>
          <th data-sort="audience">Audience <span class="arrow">▾</span></th>
          <th data-sort="questionCount">Items <span class="arrow">▾</span></th>
          <th data-sort="featuresCount">SDC <span class="arrow">▾</span></th>
          <th>Source</th>
        </tr>
      </thead>
      <tbody id="tbody"></tbody>
    </table>
    <div class="empty" id="empty" style="display:none">
      <div class="icon">🔍</div>
      <div>No questionnaires match the current filters.</div>
    </div>
  </div>
</main>

<footer class="footer">
  <p>Built from <code>fhir/scripts/build-catalog.mjs</code>. Each Questionnaire carries <code>meta.source</code> back to its original PDF and <code>meta.extension[alsoSeenAt]</code> for variant copies. Generated ${taxonomy.generatedAt}.</p>
</footer>

<script type="application/json" id="data">
${JSON.stringify(catalog)}
</script>
<script type="application/json" id="meta">
${JSON.stringify({ domains: DOMAIN_META, formTypes: FORMTYPE_META })}
</script>
<script src="assets/site.js"></script>
</body>
</html>
`;
fs.writeFileSync(OUT_HTML, html);
console.log(`Wrote ${OUT_HTML}`);
console.log(`Wrote ${ASSETS_DIR}/style.css, site.js, banner.svg, favicon.svg`);
