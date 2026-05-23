import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, yn, variable, whenExpr, SYS, EXT } from '../lib.mjs';

const ID = 'mdq';
const PFX = 'mdq';

const items1 = [
  ['high', "Felt so good or so hyper that other people thought you were not your normal self, or you were so hyper that you got into trouble?"],
  ['irritable', "Were so irritable that you shouted at people or started fights or arguments?"],
  ['confident', "Felt much more self-confident than usual?"],
  ['less_sleep', "Got much less sleep than usual and found you didn't really miss it?"],
  ['talkative', "Were much more talkative or spoke faster than usual?"],
  ['racing_thoughts', "Thoughts raced through your head or you couldn't slow your mind down?"],
  ['distracted', "Were so easily distracted by things around you that you had trouble concentrating or staying on track?"],
  ['energy', "Had much more energy than usual?"],
  ['active', "Were much more active or did many more things than usual?"],
  ['social', "Were much more social or outgoing than usual, for example, you telephoned friends in the middle of the night?"],
  ['sex', "Were much more interested in sex than usual?"],
  ['excessive', "Did things that were unusual for you or that other people might have thought were excessive, foolish, or risky?"],
  ['spending', "Spending money got you or your family in trouble?"],
];

const q1 = group(`${PFX}.q1`, "Has there ever been a period of time when you were not your usual self and… (check each that has ever applied)",
  items1.map(([slug, text], i) => ({
    linkId: `${PFX}.q1.${slug}`,
    type: 'choice',
    required: true,
    prefix: `1${String.fromCharCode(97+i)}.`,
    text,
    answerOption: yn(),
  })),
  { control: 'gtable' }
);

const q2 = {
  linkId: `${PFX}.q2`, type: 'choice', required: true, prefix: '2.',
  text: 'If you checked YES to more than one of the above, have several of these ever happened during the same period of time?',
  answerOption: yn(),
};

const q3 = {
  linkId: `${PFX}.q3`, type: 'choice', required: true, prefix: '3.',
  text: 'How much of a problem did any of these cause you — like being able to work; having family, money or legal troubles; getting into arguments or fights?',
  extension: [{ url: EXT.itemControl, valueCodeableConcept: { coding: [{ system: SYS.itemControl, code: 'radio-button' }] } }],
  answerOption: [
    { extension: [ordinal(0)], valueCoding: { code: 'none',     display: 'No problem' } },
    { extension: [ordinal(1)], valueCoding: { code: 'minor',    display: 'Minor problem' } },
    { extension: [ordinal(2)], valueCoding: { code: 'moderate', display: 'Moderate problem' } },
    { extension: [ordinal(3)], valueCoding: { code: 'serious',  display: 'Serious problem' } },
  ],
};

const q4 = { linkId: `${PFX}.q4`, type: 'choice', required: true, prefix: '4.',
  text: 'Have any of your blood relatives (children, siblings, parents, grandparents, aunts, uncles) had manic-depressive illness or bipolar disorder?',
  answerOption: yn() };

const q5 = { linkId: `${PFX}.q5`, type: 'choice', required: true, prefix: '5.',
  text: 'Has a health professional ever told you that you have manic-depressive illness or bipolar disorder?',
  answerOption: yn() };

const q1Score = totalScore(`${PFX}.q1.score`, 'Number of "Yes" responses in Question 1 (range 0–13)', 'mdqQ1Yes', null);

const screenPositive = {
  linkId: `${PFX}.screenPositive`, type: 'boolean', readOnly: true,
  text: 'MDQ screen is positive (≥7 YES in Q1 AND Q2=Yes AND Q3 = Moderate or Serious)',
  extension: [
    { url: EXT.calculatedExpression, valueExpression: {
      language: 'text/fhirpath',
      expression: "(%mdqQ1Yes >= 7) and (%resource.item.where(linkId='mdq.q2').answer.valueCoding.code = 'Y') and (%resource.item.where(linkId='mdq.q3').answer.valueCoding.code in ('moderate' | 'serious'))",
      description: 'Composite MDQ screening positivity rule'
    } }
  ],
};

const q = questionnaire({
  id: ID,
  name: 'MDQ',
  title: 'Mood Disorder Questionnaire (MDQ)',
  code: [{ system: SYS.loinc, code: '71354-5', display: 'Mood Disorder Questionnaire' }],
  copyright: '© Hirschfeld RM, et al. Reproduced with permission for clinical/educational use.',
  extension: [
    variable('mdqQ1Yes', "%resource.item.descendants().where(linkId.startsWith('mdq.q1.')).answer.valueCoding.where(code='Y').count()"),
  ],
  item: [
    display(`${PFX}.preamble`, 'Please answer each question as best you can.', { category: 'instructions' }),
    q1,
    q1Score,
    q2,
    q3,
    q4,
    q5,
    screenPositive,
  ],
});

fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
console.log(`Wrote questionnaires/${ID}.json`);
