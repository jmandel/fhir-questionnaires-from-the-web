// RAPID3 — Routine Assessment of Patient Index Data 3 (Pincus et al.)
// Used in RA clinical care; scored from a subset of the MDHAQ.
import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, SYS, EXT } from '../lib.mjs';

const ID = 'rapid3'; const PFX = 'rapid3';

// Functional items: 10 questions, each 0–3 (no/some/much difficulty/unable).
// FN raw sum 0–30, normalized to 0–10 by dividing by 3.
const fnOpts = [
  { extension:[ordinal(0)], valueCoding:{ code:'no',     display:'Without any difficulty' } },
  { extension:[ordinal(1)], valueCoding:{ code:'some',   display:'With some difficulty' } },
  { extension:[ordinal(2)], valueCoding:{ code:'much',   display:'With much difficulty' } },
  { extension:[ordinal(3)], valueCoding:{ code:'unable', display:'Unable to do' } },
];

const fnItems = [
  ['a','Dress yourself, including tying shoelaces and doing buttons?'],
  ['b','Get in and out of bed?'],
  ['c','Lift a full cup or glass to your mouth?'],
  ['d','Walk outdoors on flat ground?'],
  ['e','Wash and dry your entire body?'],
  ['f','Bend down to pick up clothing from the floor?'],
  ['g','Turn regular faucets on and off?'],
  ['h','Get in and out of a car, bus, train, or airplane?'],
  ['i','Walk two miles or three kilometers, if you wish?'],
  ['j','Participate in recreational activities and sports as you would like, if you wish?'],
];

const slider10 = [
  { url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'slider' }] } },
  { url: EXT.minValue, valueInteger:0 },{ url: EXT.maxValue, valueInteger:10 },{ url: EXT.sliderStepValue, valueInteger:1 },
];

const matrix = group(`${PFX}.function`, 'Section 1 — Physical function over the last week',
  fnItems.map(([slug,t])=>({ linkId:`${PFX}.function.q${slug}`, type:'choice', required:true, prefix:`1${slug}.`, text:`Were you able to: ${t}`, answerOption: fnOpts })),
  { control:'gtable' });

const pain = { linkId:`${PFX}.pain`, type:'integer', required:true, prefix:'2.',
  text:'Pain — On a scale from 0 (no pain) to 10 (pain as bad as it could be), how much pain have you had because of your condition over the past week?',
  extension: slider10 };

const global = { linkId:`${PFX}.global`, type:'integer', required:true, prefix:'3.',
  text:'Patient global estimate — Considering all the ways your illness affects you, rate how you are doing on a scale from 0 (very well) to 10 (very poorly).',
  extension: slider10 };

const q = questionnaire({
  id: ID, name:'RAPID3',
  title:'Routine Assessment of Patient Index Data 3 (RAPID3)',
  copyright: 'Pincus T, et al. J Rheumatol 2008;35:2136-47. Free for clinical use; commercial use requires attribution. MDHAQ-derived.',
  extension: [
    variable('rapid3FnRaw', "%resource.item.descendants().where(linkId.startsWith('rapid3.function.q')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
  ],
  item: [
    display(`${PFX}.preamble`, 'RAPID3 combines a 10-item physical function scale, a patient pain VAS, and a patient global VAS. Total 0–30 raw or 0–10 normalized. Severity: ≤1 near-remission · 1.01–2 low · 2.01–4 moderate · >4 high.', { category:'instructions' }),
    matrix,
    { linkId:`${PFX}.fnScore`, type:'decimal', readOnly:true, text:'Function score (FN, 0–10 normalized = raw/3)',
      extension:[calcExpr('%rapid3FnRaw / 3','FN normalized to 0–10')] },
    pain,
    global,
    { linkId:`${PFX}.totalScore`, type:'decimal', readOnly:true, text:'RAPID3 total (FN + Pain + Global, range 0–30 raw → divide by 3 to compare to MD-driven indices 0–10)',
      extension:[calcExpr("(%rapid3FnRaw / 3) + %resource.item.where(linkId='rapid3.pain').answer.valueInteger.first() + %resource.item.where(linkId='rapid3.global').answer.valueInteger.first()", 'RAPID3 total on 0–30 scale')] },
  ],
});

fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
console.log(`Wrote questionnaires/${ID}.json`);
