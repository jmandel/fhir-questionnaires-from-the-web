#!/usr/bin/env node
// Classify each text-extracted PDF into a triage bucket for FHIR Questionnaire conversion.
// Buckets:
//   PROM         - validated patient-reported outcome (PHQ-9, GAD-7, AUDIT-C, KOOS, ...)
//   INTAKE       - new-patient history/intake with structured questions
//   FOLLOWUP     - follow-up / monitoring form
//   DEMOG        - demographics-only (still convertible but lower priority)
//   CONSENT      - consent/privacy/HIPAA/release/financial-policy — skip
//   ADMIN        - report / handbook / orientation / guidelines / 990 — skip
//   UNKNOWN      - low confidence

import fs from 'node:fs';
import path from 'node:path';

const TEXT_DIR = 'fhir/triage/text';
const RAW_DIR = 'raw/pdf';
const files = fs.readdirSync(TEXT_DIR).filter(f => f.endsWith('.txt')).sort();

const CONSENT_PAT = /(informed consent|consent to treat(ment)?|treatment consent|authorization for (the )?release|notice of privacy practices|privacy practices notice|hipaa|financial policy|psychotherapy notes? release|medical records request|release of (protected )?health information|patient consent|consent form|telehealth consent|prior authorization)/i;
const ADMIN_PAT = /(form 990|annual report|orientation handbook|adult preventive health screening guidelines|provider manual|clinical practice guideline|table of contents|description and scoring|interpret(ation|ing) (the )?(score|results)|allogeneic handbook|please refer to)/i;
const RESEARCH_PAT = /(original article|original research|received: |accepted: |published: |©.*all rights reserved|abstract\s*[\n:]|conflict of interest|j\.\s*\w+\.\s*\d{4}|doi:?\s*10\.\d{4,}|^\s*(introduction|abstract|background|methods?|results?|discussion|conclusion)s?\s*$|http(s)?:\/\/doi\.org|p\s*=\s*0\.\d|N\s*=\s*\d+\s+patients|ethics committee|informed consent was obtained|study (design|population|protocol|participants))/im;
const PROM_NAME_PAT = /\b(PHQ-?9|PHQ-?2|GAD-?7|AUDIT-?C|CAGE|DAST|MDQ|ASRS|MoCA|C-SSRS|Columbia Suicide|Vanderbilt|CMRS|KOOS|WOMAC|HOOS|DASH|QuickDASH|ODI|Oswestry|RMDQ|NDI|FAAM|LEFS|IPSS|OABSS|SHIM|IIEF|FSFI|HAQ-DI|RAPID3|BASDAI|ASAS-HI|FIQR?|PsAID|BPI|McGill Pain|MMRC|CAT|ACT|ACQ-7|IBDQ|IBS-SSS|ESS|ISI|STOP-?BANG|Berlin|MMSE|MoCA|MAHC|EORTC|FACT|EPIC|PROMIS|EQ-5D|SF-36|SF-12|Edmonton|MOLST|POLST|AIMS|SBIRT|SNAP-IV|PCL-5|Sheehan|YBOCS|Y-BOCS|Hamilton|HAM-D|MADRS|Barthel|Lawton|FAST|Bristol stool|Rome IV|Mini-Cog|Reminiscence Functions Scale|Seattle Angina|MLHFQ|KCCQ|Rose Dyspnea|Berg Balance|TUG|Tinetti|MyOcular|VHI|THI|Wexner|Cleveland Constipation)\b/i;
const INTAKE_HINTS = [
  /new patient (intake|packet|questionnaire|history|form|information)/i,
  /patient (intake|registration) form/i,
  /comprehensive (history|intake)/i,
  /medical history (form|questionnaire)/i,
  /review of systems/i,
  /chief complaint/i,
  /history of present illness/i,
  /patient health (history|information)/i,
  /demographic(s)? (information|form)/i,
];
const FOLLOWUP_HINTS = [
  /follow-?up (questionnaire|form)/i,
  /monitoring form/i,
  /progress note/i,
  /side effects? monitoring/i,
  /symptom diary/i,
];

function classify(name, text) {
  const lower = text.toLowerCase();
  const firstK = text.slice(0, 4000);
  const reasons = [];

  // Hard skip if clearly consent/privacy/admin and lacks question-like structure
  const consentHit = CONSENT_PAT.test(text);
  const adminHit = ADMIN_PAT.test(firstK);
  // Count how many distinct research-paper markers fire in the first ~10K chars
  const researchMatches = [...text.slice(0, 12000).matchAll(new RegExp(RESEARCH_PAT.source, 'gim'))];
  const researchHits = researchMatches.length;
  if (researchHits >= 2) reasons.push(`research-hits=${researchHits}`);

  // Question density heuristic
  const lines = text.split(/\n/);
  const questionLines = lines.filter(l => /[?]\s*$/.test(l.trim())).length;
  const numberedLines = lines.filter(l => /^\s*\d+[\.\)]\s+\S/.test(l)).length;
  const checkboxLines = lines.filter(l => /[☐□▢❑◻]|\bo\s|\[ \]|⬜|\(\s*\)/.test(l)).length;
  const underscoreLines = lines.filter(l => /_{4,}/.test(l)).length;
  const yesnoLines = lines.filter(l => /\b(yes|no)\b.*\b(yes|no)\b/i.test(l)).length;
  const totalWords = text.split(/\s+/).filter(Boolean).length;

  const promName = text.match(PROM_NAME_PAT);
  const intakeHit = INTAKE_HINTS.find(p => p.test(firstK));
  const followupHit = FOLLOWUP_HINTS.find(p => p.test(firstK));

  if (promName) reasons.push(`PROM-name:${promName[0]}`);
  if (intakeHit) reasons.push(`intake-hint:${intakeHit.source.slice(0,40)}`);
  if (followupHit) reasons.push(`followup-hint:${followupHit.source.slice(0,40)}`);
  if (consentHit) reasons.push('consent-pattern');
  if (adminHit) reasons.push('admin-pattern');
  reasons.push(`q?=${questionLines} num=${numberedLines} chk=${checkboxLines} und=${underscoreLines} yn=${yesnoLines} w=${totalWords}`);

  // Decision tree
  let bucket = 'UNKNOWN';
  let priority = 5;

  // Research papers/scoring docs that merely cite a PROM name: skip
  if (researchHits >= 2 && totalWords > 2500) {
    return { bucket: 'ADMIN', priority: 9, reasons: [...reasons, 'looks-like-research-paper'] };
  }

  if (followupHit && (numberedLines >= 5 || checkboxLines >= 5)) {
    bucket = 'FOLLOWUP';
    priority = 1;
  } else if (promName && (numberedLines >= 3 || checkboxLines >= 4)) {
    bucket = 'PROM';
    priority = 1;
  } else if (promName && totalWords > 80) {
    // even if checkbox glyphs didn't survive OCR/layout, named PROM with body counts
    bucket = 'PROM';
    priority = 2;
  } else if (intakeHit && (numberedLines + checkboxLines + underscoreLines >= 8)) {
    bucket = 'INTAKE';
    priority = 1;
  } else if (intakeHit && totalWords > 200) {
    bucket = 'INTAKE';
    priority = 2;
  } else if (consentHit && !intakeHit && !promName && numberedLines < 3) {
    bucket = 'CONSENT';
    priority = 9;
  } else if (adminHit && numberedLines < 5 && checkboxLines < 5) {
    bucket = 'ADMIN';
    priority = 9;
  } else if (/^demographics?_/i.test(name) || /demographics? form/i.test(firstK)) {
    bucket = 'DEMOG';
    priority = 3;
  } else if (numberedLines + checkboxLines >= 10) {
    bucket = 'INTAKE';
    priority = 3;
  } else if (totalWords < 50) {
    bucket = 'ADMIN';
    priority = 9;
    reasons.push('low-text-extraction (likely scanned image)');
  }

  return { bucket, priority, reasons };
}

const rows = files.map(f => {
  const stem = f.replace(/\.txt$/, '');
  const text = fs.readFileSync(path.join(TEXT_DIR, f), 'utf8');
  const c = classify(stem, text);
  return { stem, ...c, firstLine: (text.split(/\n/).find(l => l.trim().length > 4) || '').trim().slice(0, 120) };
});

// Print summary
const byBucket = {};
for (const r of rows) (byBucket[r.bucket] ||= []).push(r);
console.log('=== Counts by bucket ===');
for (const k of Object.keys(byBucket).sort()) console.log(`  ${k}: ${byBucket[k].length}`);

// Write JSON
fs.writeFileSync('fhir/triage/triage.json', JSON.stringify(rows, null, 2));

// Write markdown
let md = '# PDF Triage for FHIR Questionnaire Conversion\n\n';
md += `Total: ${rows.length}\n\n`;
for (const k of ['PROM','INTAKE','FOLLOWUP','DEMOG','UNKNOWN','CONSENT','ADMIN']) {
  const items = (byBucket[k] || []).sort((a,b) => a.priority - b.priority || a.stem.localeCompare(b.stem));
  md += `\n## ${k} (${items.length})\n\n`;
  for (const r of items) {
    md += `- **[P${r.priority}]** \`${r.stem}\` — _${r.firstLine}_\n  - reasons: ${r.reasons.join(' | ')}\n`;
  }
}
fs.writeFileSync('fhir/triage/triage.md', md);
console.log('Wrote fhir/triage/triage.json and triage.md');
