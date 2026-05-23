// NICHQ Vanderbilt Assessment Scale — PARENT Informant (initial)
import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, SYS, EXT } from '../lib.mjs';

const ID = 'nichq-vanderbilt-parent-initial';
const PFX = 'vandp';

const freq4 = [
  { ord: 0, code: 'never', display: 'Never' },
  { ord: 1, code: 'occasionally', display: 'Occasionally' },
  { ord: 2, code: 'often', display: 'Often' },
  { ord: 3, code: 'very-often', display: 'Very Often' },
];
const freqOpts = freq4.map(o => ({ extension: [ordinal(o.ord)], valueCoding: { code: o.code, display: o.display } }));

const perfOpts = [
  { ord: 1, code: 'excellent', display: 'Excellent' },
  { ord: 2, code: 'above-average', display: 'Above Average' },
  { ord: 3, code: 'average', display: 'Average' },
  { ord: 4, code: 'somewhat-problem', display: 'Somewhat of a Problem' },
  { ord: 5, code: 'problematic', display: 'Problematic' },
].map(o => ({ extension: [ordinal(o.ord)], valueCoding: { code: o.code, display: o.display } }));

const symptoms = [
  ['inattn',  1,  'Does not pay attention to details or makes careless mistakes with, for example, homework'],
  ['inattn',  2,  'Has difficulty keeping attention to what needs to be done'],
  ['inattn',  3,  'Does not seem to listen when spoken to directly'],
  ['inattn',  4,  'Does not follow through when given directions and fails to finish activities (not due to refusal or failure to understand)'],
  ['inattn',  5,  'Has difficulty organizing tasks and activities'],
  ['inattn',  6,  'Avoids, dislikes, or does not want to start tasks that require ongoing mental effort'],
  ['inattn',  7,  'Loses things necessary for tasks or activities (toys, assignments, pencils, or books)'],
  ['inattn',  8,  'Is easily distracted by noises or other stimuli'],
  ['inattn',  9,  'Is forgetful in daily activities'],
  ['hyper', 10,  'Fidgets with hands or feet or squirms in seat'],
  ['hyper', 11,  'Leaves seat when remaining seated is expected'],
  ['hyper', 12,  'Runs about or climbs too much when remaining seated is expected'],
  ['hyper', 13,  'Has difficulty playing or beginning quiet play activities'],
  ['hyper', 14,  'Is "on the go" or often acts as if "driven by a motor"'],
  ['hyper', 15,  'Talks too much'],
  ['hyper', 16,  'Blurts out answers before questions have been completed'],
  ['hyper', 17,  'Has difficulty waiting his or her turn'],
  ['hyper', 18,  'Interrupts or intrudes in on others\' conversations and/or activities'],
  ['odd',   19,  'Argues with adults'],
  ['odd',   20,  'Loses temper'],
  ['odd',   21,  'Actively defies or refuses to go along with adults\' requests or rules'],
  ['odd',   22,  'Deliberately annoys people'],
  ['odd',   23,  'Blames others for his or her mistakes or misbehaviors'],
  ['odd',   24,  'Is touchy or easily annoyed by others'],
  ['odd',   25,  'Is angry or resentful'],
  ['odd',   26,  'Is spiteful and wants to get even'],
  ['cd',    27,  'Bullies, threatens, or intimidates others'],
  ['cd',    28,  'Starts physical fights'],
  ['cd',    29,  'Lies to get out of trouble or to avoid obligations (i.e., "cons" others)'],
  ['cd',    30,  'Is truant from school (skips school) without permission'],
  ['cd',    31,  'Is physically cruel to people'],
  ['cd',    32,  'Has stolen things that have value'],
  ['cd',    33,  'Deliberately destroys others\' property'],
  ['cd',    34,  'Has used a weapon that can cause serious harm (bat, knife, brick, gun)'],
  ['cd',    35,  'Is physically cruel to animals'],
  ['cd',    36,  'Has deliberately set fires to cause damage'],
  ['cd',    37,  'Has broken into someone else\'s home, business, or car'],
  ['cd',    38,  'Has stayed out at night without permission'],
  ['cd',    39,  'Has run away from home overnight'],
  ['cd',    40,  'Has forced someone into sexual activity'],
  ['anxdep', 41, 'Is fearful, anxious, or worried'],
  ['anxdep', 42, 'Is afraid to try new things for fear of making mistakes'],
  ['anxdep', 43, 'Feels worthless or inferior'],
  ['anxdep', 44, 'Blames self for problems, feels guilty'],
  ['anxdep', 45, 'Feels lonely, unwanted, or unloved; complains that "no one loves him or her"'],
  ['anxdep', 46, 'Is sad, unhappy, or depressed'],
  ['anxdep', 47, 'Is self-conscious or easily embarrassed'],
];

const symptomMatrix = group(`${PFX}.symptoms`, 'Symptoms (past 6 months)',
  symptoms.map(([sub, n, text]) => ({
    linkId: `${PFX}.symptoms.q${n}`,
    type: 'choice',
    required: true,
    prefix: `${n}.`,
    text,
    extension: [{ url: EXT.shortText, valueString: `${sub.toUpperCase()}-${n}` }],
    answerOption: freqOpts,
  })),
  { control: 'gtable' }
);

const performance = group(`${PFX}.performance`, 'Performance',
  [
    [48, 'Overall school performance'],
    [49, 'Reading'],
    [50, 'Writing'],
    [51, 'Mathematics'],
    [52, 'Relationship with parents'],
    [53, 'Relationship with siblings'],
    [54, 'Relationship with peers'],
    [55, 'Participation in organized activities (e.g., teams)'],
  ].map(([n, text]) => ({
    linkId: `${PFX}.performance.q${n}`,
    type: 'choice',
    required: true,
    prefix: `${n}.`,
    text,
    answerOption: perfOpts,
  })),
  { control: 'gtable' }
);

const medQ = {
  linkId: `${PFX}.medContext`, type: 'choice', required: true,
  text: 'Is this evaluation based on a time when the child was on or off medication?',
  answerOption: [
    { valueCoding: { code: 'on-meds',  display: 'Was on medication' } },
    { valueCoding: { code: 'off-meds', display: 'Was not on medication' } },
    { valueCoding: { code: 'unsure',   display: 'Not sure' } },
  ],
};

const q = questionnaire({
  id: ID,
  name: 'NICHQVanderbiltParentInitial',
  title: 'NICHQ Vanderbilt Assessment Scale — Parent Informant (Initial)',
  code: [{ system: SYS.loinc, code: '77904-7', display: 'NICHQ Vanderbilt Assessment Scale — Parent informant [NICHQ]' }],
  copyright: '© 2002 American Academy of Pediatrics and National Initiative for Children\'s Healthcare Quality. Adapted from the Vanderbilt Rating Scales developed by Mark L. Wolraich, MD.',
  extension: [
    variable('inattnYes2', "%resource.item.descendants().where(linkId in ('vandp.symptoms.q1'|'vandp.symptoms.q2'|'vandp.symptoms.q3'|'vandp.symptoms.q4'|'vandp.symptoms.q5'|'vandp.symptoms.q6'|'vandp.symptoms.q7'|'vandp.symptoms.q8'|'vandp.symptoms.q9')).answer.valueCoding.where(code in ('often'|'very-often')).count()"),
    variable('hyperYes2',  "%resource.item.descendants().where(linkId in ('vandp.symptoms.q10'|'vandp.symptoms.q11'|'vandp.symptoms.q12'|'vandp.symptoms.q13'|'vandp.symptoms.q14'|'vandp.symptoms.q15'|'vandp.symptoms.q16'|'vandp.symptoms.q17'|'vandp.symptoms.q18')).answer.valueCoding.where(code in ('often'|'very-often')).count()"),
    variable('oddYes2',    "%resource.item.descendants().where(linkId in ('vandp.symptoms.q19'|'vandp.symptoms.q20'|'vandp.symptoms.q21'|'vandp.symptoms.q22'|'vandp.symptoms.q23'|'vandp.symptoms.q24'|'vandp.symptoms.q25'|'vandp.symptoms.q26')).answer.valueCoding.where(code in ('often'|'very-often')).count()"),
    variable('cdYes2',     "%resource.item.descendants().where(linkId in ('vandp.symptoms.q27'|'vandp.symptoms.q28'|'vandp.symptoms.q29'|'vandp.symptoms.q30'|'vandp.symptoms.q31'|'vandp.symptoms.q32'|'vandp.symptoms.q33'|'vandp.symptoms.q34'|'vandp.symptoms.q35'|'vandp.symptoms.q36'|'vandp.symptoms.q37'|'vandp.symptoms.q38'|'vandp.symptoms.q39'|'vandp.symptoms.q40')).answer.valueCoding.where(code in ('often'|'very-often')).count()"),
    variable('anxdepYes2', "%resource.item.descendants().where(linkId in ('vandp.symptoms.q41'|'vandp.symptoms.q42'|'vandp.symptoms.q43'|'vandp.symptoms.q44'|'vandp.symptoms.q45'|'vandp.symptoms.q46'|'vandp.symptoms.q47')).answer.valueCoding.where(code in ('often'|'very-often')).count()"),
  ],
  item: [
    display(`${PFX}.preamble`,
      'When completing this form, think about your child\'s behaviors in the past 6 months. Rate each item according to what is appropriate for the age of your child.',
      { category: 'instructions' }),
    medQ,
    symptomMatrix,
    performance,
    totalScore(`${PFX}.scores.inattnYes2`, 'Inattention — count of items rated Often / Very Often (DSM threshold: ≥6)', 'inattnYes2', null),
    totalScore(`${PFX}.scores.hyperYes2`, 'Hyperactivity/Impulsivity — count rated Often / Very Often (≥6)', 'hyperYes2', null),
    totalScore(`${PFX}.scores.oddYes2`, 'Oppositional-Defiant — count rated Often / Very Often (≥4)', 'oddYes2', null),
    totalScore(`${PFX}.scores.cdYes2`, 'Conduct Disorder — count rated Often / Very Often (≥3)', 'cdYes2', null),
    totalScore(`${PFX}.scores.anxdepYes2`, 'Anxiety/Depression — count rated Often / Very Often (≥3)', 'anxdepYes2', null),
  ],
});

fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
console.log(`Wrote questionnaires/${ID}.json`);
