import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, SYS, EXT } from '../lib.mjs';

const ID = 'ipss';
const PFX = 'ipss';

const freq6 = [
  { ord: 0, code: 'never',     display: 'Not at all' },
  { ord: 1, code: 'lt-1-in-5', display: 'Less than 1 in 5 times' },
  { ord: 2, code: 'lt-half',   display: 'Less than half the time' },
  { ord: 3, code: 'half',      display: 'About half the time' },
  { ord: 4, code: 'gt-half',   display: 'More than half the time' },
  { ord: 5, code: 'always',    display: 'Almost always' },
];
const freq6opts = freq6.map(o => ({ extension: [ordinal(o.ord)], valueCoding: { code: o.code, display: o.display } }));

const nocturia = [
  { ord: 0, code: '0', display: 'None' },
  { ord: 1, code: '1', display: '1 time' },
  { ord: 2, code: '2', display: '2 times' },
  { ord: 3, code: '3', display: '3 times' },
  { ord: 4, code: '4', display: '4 times' },
  { ord: 5, code: '5', display: '5 or more times' },
];
const nocturiaOpts = nocturia.map(o => ({ extension: [ordinal(o.ord)], valueCoding: { code: o.code, display: o.display } }));

const qol = [
  { ord: 0, code: 'delighted', display: 'Delighted' },
  { ord: 1, code: 'pleased',   display: 'Pleased' },
  { ord: 2, code: 'mostly-satisfied', display: 'Mostly satisfied' },
  { ord: 3, code: 'mixed',     display: 'Mixed — about equally satisfied and dissatisfied' },
  { ord: 4, code: 'mostly-dissatisfied', display: 'Mostly dissatisfied' },
  { ord: 5, code: 'unhappy',   display: 'Unhappy' },
  { ord: 6, code: 'terrible',  display: 'Terrible' },
];
const qolOpts = qol.map(o => ({ extension: [ordinal(o.ord)], valueCoding: { code: o.code, display: o.display } }));

const itemDefs = [
  ['incomplete',   '1.', 'Incomplete emptying — Over the past month, how often have you had a sensation of not emptying your bladder completely after you finished urinating?', freq6opts, '65394-6'],
  ['frequency',    '2.', 'Frequency — Over the past month, how often have you had to urinate again less than two hours after you finished urinating?', freq6opts, '65395-3'],
  ['intermittency','3.', 'Intermittency — Over the past month, how often have you found you stopped and started again several times when you urinated?', freq6opts, '65396-1'],
  ['urgency',      '4.', 'Urgency — Over the past month, how often have you found it difficult to postpone urination?', freq6opts, '65397-9'],
  ['weak-stream',  '5.', 'Weak stream — Over the past month, how often have you had a weak urinary stream?', freq6opts, '65398-7'],
  ['straining',    '6.', 'Straining — Over the past month, how often have you had to push or strain to begin urination?', freq6opts, '65399-5'],
  ['nocturia',     '7.', 'Nocturia — Over the past month, how many times did you most typically get up to urinate from the time you went to bed at night until the time you got up in the morning?', nocturiaOpts, '65400-1'],
];

const matrix = group(`${PFX}.matrix`, 'IPSS symptom items (past month)',
  itemDefs.map(([slug, prefix, text, opts, loinc]) => ({
    linkId: `${PFX}.matrix.${slug}`,
    type: 'choice',
    required: true,
    prefix,
    text,
    code: [{ system: SYS.loinc, code: loinc }],
    answerOption: opts,
  })),
  { control: 'gtable' }
);

const q = questionnaire({
  id: ID,
  name: 'IPSS',
  title: 'International Prostate Symptom Score (IPSS / I-PSS)',
  code: [{ system: SYS.loinc, code: '83796-2', display: 'International Prostate Symptom Score panel' }],
  copyright: 'IPSS is in the public domain (American Urological Association BPH Index, 1992).',
  extension: [
    variable('ipssSum', "%resource.item.descendants().where(linkId.startsWith('ipss.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
  ],
  item: [
    display(`${PFX}.preamble`, 'In the past month, how often have you experienced each of the following urinary symptoms?', { category: 'instructions' }),
    matrix,
    totalScore(`${PFX}.totalScore`, 'IPSS symptom-severity total (0–35; 0–7 mild, 8–19 moderate, 20–35 severe)', 'ipssSum',
      '83792-1'),
    {
      linkId: `${PFX}.qol`, type: 'choice', required: true,
      text: 'If you were to spend the rest of your life with your urinary condition just the way it is now, how would you feel about that?',
      code: [{ system: SYS.loinc, code: '83795-4', display: 'IPSS Quality-of-life due to urinary symptoms' }],
      answerOption: qolOpts,
    }
  ],
});

fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
console.log(`Wrote questionnaires/${ID}.json`);
