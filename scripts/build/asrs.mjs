import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, SYS, EXT } from '../lib.mjs';

const ID = 'asrs-v1-1';
const PFX = 'asrs';

const ord5 = [
  { ord: 0, code: 'never',     display: 'Never' },
  { ord: 1, code: 'rarely',    display: 'Rarely' },
  { ord: 2, code: 'sometimes', display: 'Sometimes' },
  { ord: 3, code: 'often',     display: 'Often' },
  { ord: 4, code: 'very-often',display: 'Very Often' },
];
const ord5opts = ord5.map(({ ord, code, display }) => ({
  extension: [ordinal(ord)],
  valueCoding: { code, display },
}));

const items = [
  ['inattention', 'q1',  'How often do you have trouble wrapping up the final details of a project, once the challenging parts have been done?'],
  ['inattention', 'q2',  'How often do you have difficulty getting things in order when you have to do a task that requires organization?'],
  ['inattention', 'q3',  'How often do you have problems remembering appointments or obligations?'],
  ['inattention', 'q4',  'When you have a task that requires a lot of thought, how often do you avoid or delay getting started?'],
  ['hyperactivity','q5', 'How often do you fidget or squirm with your hands or feet when you have to sit down for a long time?'],
  ['hyperactivity','q6', 'How often do you feel overly active and compelled to do things, like you were driven by a motor?'],
  ['inattention', 'q7',  'How often do you make careless mistakes when you have to work on a boring or difficult project?'],
  ['inattention', 'q8',  'How often do you have difficulty keeping your attention when you are doing boring or repetitive work?'],
  ['inattention', 'q9',  'How often do you have difficulty concentrating on what people say to you, even when they are speaking to you directly?'],
  ['inattention', 'q10', 'How often do you misplace or have difficulty finding things at home or at work?'],
  ['inattention', 'q11', 'How often are you distracted by activity or noise around you?'],
  ['inattention', 'q12', 'How often do you leave your seat in meetings or other situations in which you are expected to remain seated?'],
  ['hyperactivity','q13','How often do you feel restless or fidgety?'],
  ['hyperactivity','q14','How often do you have difficulty unwinding and relaxing when you have time to yourself?'],
  ['hyperactivity','q15','How often do you find yourself talking too much when you are in social situations?'],
  ['hyperactivity','q16','When you are in a conversation, how often do you find yourself finishing the sentences of the people you are talking to, before they can finish them themselves?'],
  ['hyperactivity','q17','How often do you have difficulty waiting your turn in situations when turn taking is required?'],
  ['hyperactivity','q18','How often do you interrupt others when they are busy?'],
];

// Screener (Part A) = q1..q6; per scoring, dark-shaded threshold answers count.
// We expose ordinal sums for both subscales; clinical interpretation lives outside the Questionnaire.

const matrix = group(`${PFX}.matrix`, 'ASRS-v1.1 symptom checklist (past 6 months)',
  items.map(([sub, q, text], i) => ({
    linkId: `${PFX}.matrix.${q}`,
    type: 'choice',
    required: true,
    prefix: `${i+1}.`,
    text,
    extension: [{ url: EXT.shortText, valueString: q.toUpperCase() }],
    answerOption: ord5opts,
  })),
  { control: 'gtable' }
);

const inattItems = items.filter(x => x[0] === 'inattention').map(x => x[1]);
const hyperItems = items.filter(x => x[0] === 'hyperactivity').map(x => x[1]);

const q = questionnaire({
  id: ID,
  name: 'ASRSv11',
  title: 'Adult ADHD Self-Report Scale (ASRS-v1.1) Symptom Checklist',
  code: [{ system: SYS.loinc, code: '87224-1', display: 'Adult attention-deficit/hyperactivity disorder Self Report Scale (ASRS-V1.1) [WHO]' }],
  copyright: '© 2003 World Health Organization. Free to reproduce; no permission required.',
  extension: [
    variable('asrsInattention',
      `%resource.item.descendants().where(linkId in (${inattItems.map(q => `'asrs.matrix.${q}'`).join(' | ')})).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()`),
    variable('asrsHyperactivity',
      `%resource.item.descendants().where(linkId in (${hyperItems.map(q => `'asrs.matrix.${q}'`).join(' | ')})).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()`),
  ],
  item: [
    display(`${PFX}.preamble`,
      'Please answer the questions below, rating yourself on a scale of Never / Rarely / Sometimes / Often / Very Often. Answer each question in a way that best describes how you have felt and conducted yourself in the past 6 months.',
      { category: 'instructions' }),
    matrix,
    totalScore(`${PFX}.inattentionScore`, 'Inattention subscale (A) total', 'asrsInattention', null),
    totalScore(`${PFX}.hyperactivityScore`, 'Hyperactivity / impulsivity subscale (B) total', 'asrsHyperactivity', null),
  ],
});

fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
console.log(`Wrote questionnaires/${ID}.json`);
