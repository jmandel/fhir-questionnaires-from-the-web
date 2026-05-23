import fs from 'node:fs';
import { questionnaire, display, ordinal, SYS, EXT } from '../lib.mjs';

const ID = 'mmrc';
const PFX = 'mmrc';

const opts = [
  { ord: 0, text: 'I only get breathless with strenuous exercise.' },
  { ord: 1, text: 'I get short of breath when hurrying on the level or walking up a slight hill.' },
  { ord: 2, text: 'I walk slower than people of the same age on the level because of breathlessness, or have to stop for breath when walking at my own pace on the level.' },
  { ord: 3, text: 'I stop for breath after walking about 100 yards or after a few minutes on the level.' },
  { ord: 4, text: 'I am too breathless to leave the house, or I am breathless when dressing or undressing.' },
];

const q = questionnaire({
  id: ID,
  name: 'mMRC',
  title: 'Modified Medical Research Council (mMRC) Dyspnea Scale',
  code: [{ system: SYS.loinc, code: '89212-4', display: 'Modified Medical Research Council Dyspnea Scale' }],
  copyright: 'mMRC is in the public domain.',
  item: [
    display(`${PFX}.preamble`, 'Please select the statement that best describes your shortness of breath (dyspnea) on most days.', { category: 'instructions' }),
    {
      linkId: `${PFX}.grade`,
      type: 'choice',
      required: true,
      text: 'mMRC grade',
      extension: [
        { url: EXT.itemControl, valueCodeableConcept: { coding: [{ system: SYS.itemControl, code: 'radio-button' }] } },
        { url: EXT.choiceOrientation, valueCode: 'vertical' },
      ],
      answerOption: opts.map(o => ({
        extension: [ordinal(o.ord)],
        valueCoding: { code: String(o.ord), display: `Grade ${o.ord}: ${o.text}` },
      })),
    }
  ],
});

fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
console.log(`Wrote questionnaires/${ID}.json`);
