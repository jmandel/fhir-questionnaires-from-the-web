import fs from 'node:fs';
import { questionnaire, group, display, totalScore, yn, variable, SYS, EXT } from '../lib.mjs';

const ID = 'stop-bang';
const PFX = 'stopbang';

const items = [
  ['snore',     'S', 'Do you SNORE loudly (louder than talking or loud enough to be heard through closed doors)?'],
  ['tired',     'T', 'Do you often feel TIRED, fatigued, or sleepy during the daytime?'],
  ['observed',  'O', 'Has anyone OBSERVED you stop breathing during your sleep?'],
  ['pressure',  'P', 'Do you have, or are you being treated for, high blood PRESSURE?'],
  ['bmi',       'B', 'BMI more than 35 kg/m²?'],
  ['age',       'A', 'AGE over 50 years old?'],
  ['neck',      'N', 'NECK circumference greater than 16 inches (40 cm)?'],
  ['gender',    'G', 'GENDER: Male?'],
];

const matrix = group(`${PFX}.matrix`, 'STOP-BANG items',
  items.map(([slug, letter, text]) => ({
    linkId: `${PFX}.matrix.${slug}`,
    type: 'choice',
    required: true,
    prefix: `${letter}.`,
    text,
    answerOption: yn(),
  })),
  { control: 'gtable' }
);

const q = questionnaire({
  id: ID,
  name: 'StopBang',
  title: 'STOP-BANG Sleep Apnea Questionnaire',
  code: [{ system: SYS.loinc, code: '76555-4', display: 'STOP-BANG sleep apnea questionnaire [Reported]' }],
  copyright: '© Chung F. STOP-Bang Questionnaire. Free to use for clinical practice; permission required for research/commercial. www.stopbang.ca',
  extension: [
    variable('stopBangSum', "%resource.item.descendants().where(linkId.startsWith('stopbang.matrix.')).answer.valueCoding.where(code='Y').count()"),
  ],
  item: [
    display(`${PFX}.preamble`, 'Please answer Yes or No to each of the following 8 items.', { category: 'instructions' }),
    matrix,
    totalScore(`${PFX}.totalScore`, 'STOP-BANG total (count of YES answers, 0–8)', 'stopBangSum', null),
    {
      linkId: `${PFX}.risk`, type: 'string', readOnly: true,
      text: 'OSA risk category',
      extension: [{
        url: EXT.calculatedExpression,
        valueExpression: {
          language: 'text/fhirpath',
          expression: "iif(%stopBangSum >= 5, 'High risk', iif(%stopBangSum >= 3, 'Intermediate risk', 'Low risk'))"
        }
      }],
    }
  ],
});

fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
console.log(`Wrote questionnaires/${ID}.json`);
