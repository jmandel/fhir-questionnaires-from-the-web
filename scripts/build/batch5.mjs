// Batch5: AIMS, AACAP medication side effects, AACAP stimulant monitoring,
// AACAP CAP intake form, AACAP telephone intake, Reminiscence Functions (43-item),
// McGill SF-MPQ, Rome IV IBS diagnostic, C-SSRS Risk Assessment (Lifeline),
// Vanderbilt teacher-initial, Vanderbilt follow-ups (parent + teacher).
import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, whenExpr, SYS, EXT } from '../lib.mjs';

const ordOpts = (triples) => triples.map(([o, code, display]) => ({ extension: [ordinal(o)], valueCoding: { code, display } }));
const yesNo = (yes=1, no=0) => [
  { extension:[ordinal(no)],  valueCoding:{ system: SYS.yn, code:'N', display:'No' } },
  { extension:[ordinal(yes)], valueCoding:{ system: SYS.yn, code:'Y', display:'Yes' } },
];

// ─── AIMS (Abnormal Involuntary Movement Scale) ──────────────────────────────
{
  const ID = 'aims'; const PFX = 'aims';
  const sev = ordOpts([
    [0,'none','None'],
    [1,'minimal','Minimal, may be extreme normal'],
    [2,'mild','Mild'],
    [3,'moderate','Moderate'],
    [4,'severe','Severe'],
  ]);
  const movementItems = [
    [`${PFX}.facial.q1`,'1.', 'Muscles of facial expression — movements of forehead, eyebrows, periorbital area, cheeks; frowning, blinking, smiling, grimacing'],
    [`${PFX}.facial.q2`,'2.', 'Lips and perioral area — puckering, pouting, smacking'],
    [`${PFX}.facial.q3`,'3.', 'Jaw — biting, clenching, chewing, mouth opening, lateral movement'],
    [`${PFX}.facial.q4`,'4.', 'Tongue — rate only increases in movement both in and out of mouth (not inability to sustain movement)'],
    [`${PFX}.extr.q5`,  '5.', 'Upper extremity (arms, wrists, hands, fingers) — choreic and athetoid movements; do NOT include tremor'],
    [`${PFX}.extr.q6`,  '6.', 'Lower extremity (legs, knees, ankles, toes) — lateral knee movement, foot tapping, heel dropping, foot squirming, inversion/eversion'],
    [`${PFX}.trunk.q7`, '7.', 'Trunk (neck, shoulders, hips) — rocking, twisting, squirming, pelvic gyrations'],
    [`${PFX}.global.q8`,'8.', 'Severity of abnormal movements overall'],
    [`${PFX}.global.q9`,'9.', 'Incapacitation due to abnormal movements'],
    [`${PFX}.global.q10`,'10.','Patient\'s awareness of abnormal movements (0 = no awareness; 1 = aware, no distress; 2 = aware, mild distress; 3 = aware, moderate distress; 4 = aware, severe distress)'],
  ];
  const movements = group(`${PFX}.movements`, 'Movement ratings (rate highest severity observed; activated movements rated one less than spontaneous)',
    movementItems.map(([id,p,t])=>({ linkId:id, type:'choice', required:true, prefix:p, text:t, answerOption: sev })),
    { control:'gtable' });
  const dental = group(`${PFX}.dental`, 'Dental status', [
    { linkId:`${PFX}.dental.q11`, type:'choice', required:true, prefix:'11.', text:'Current problems with teeth and/or dentures?', answerOption: yesNo() },
    { linkId:`${PFX}.dental.q12`, type:'choice', required:true, prefix:'12.', text:'Are dentures usually worn?',                 answerOption: yesNo() },
    { linkId:`${PFX}.dental.q13`, type:'choice', required:true, prefix:'13.', text:'Edentia?',                                   answerOption: yesNo() },
    { linkId:`${PFX}.dental.q14`, type:'choice', required:true, prefix:'14.', text:'Do movements disappear in sleep?',           answerOption: yesNo() },
  ], { control:'gtable' });
  const q = questionnaire({
    id: ID, name:'AIMS',
    title:'Abnormal Involuntary Movement Scale (AIMS)',
    code: [{ system: SYS.loinc, code:'88147-1', display:'Abnormal Involuntary Movement Scale [AIMS]' }],
    copyright:'NIMH Abnormal Involuntary Movement Scale; public domain.',
    extension:[variable('aimsSum', "%resource.item.descendants().where(linkId in ('aims.facial.q1'|'aims.facial.q2'|'aims.facial.q3'|'aims.facial.q4'|'aims.extr.q5'|'aims.extr.q6'|'aims.trunk.q7')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'Complete the Examination Procedure before making ratings.', { category:'instructions' }),
      movements, dental,
      totalScore(`${PFX}.score`, 'Sum of movement items 1–7 (commonly tracked for dyskinesia trend)', 'aimsSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── AACAP Evaluation of Possible Medication Side Effects (Bostic) ───────────
{
  const ID = 'aacap-medication-side-effects'; const PFX = 'medse';
  const sections = [
    ['visual', 'Visual', ['Blurriness','Double vision','Irritation or redness','Eye pain','Watering','Eye twitching','Dryness','Light bothering eyes']],
    ['hearing', 'Hearing', ['Ear ache','Ear infection','Poor hearing','Ringing in the ears']],
    ['nose', 'Nose', ['Nose bleeds','Nose dryness','Sinus congestion','Change in smell']],
    ['mouth-lips', 'Mouth/Lips', ['Mouth ulcer/sores','Dry mouth','Gum problems','Too much saliva','Dental problems','Drooling','Sore/swollen tongue','Bad taste in mouth']],
    ['head', 'Head', ['Headache','Facial pain','Face muscle weakness']],
    ['throat', 'Throat', ['Sore throat','Hoarse voice / laryngitis','Difficulty swallowing']],
    ['chest', 'Chest', ['Pain','Tightness','Shortness of breath','Wheezing','Coughing']],
    ['breast', 'Breast', ['Swelling','Pain','Discharge']],
    ['heart', 'Heart', ['Rapid heartbeat','Irregular heartbeat','Slow heartbeat']],
    ['stomach', 'Stomach', ['Pain/Discomfort','Heartburn/Reflux','Nausea','Vomiting']],
    ['appetite', 'Appetite', ['Increased appetite','Decreased appetite','Taste abnormality','Weight gain','Weight loss','Increased thirst']],
    ['urination', 'Urination', ['Painful','Difficulty','Increased urination','Bedtime wetting','Daytime wetting','Change in color/smell']],
    ['bowels', 'Bowels', ['Diarrhea','Stool discoloration','Constipation','Hemorrhoids','Blood in stool','Bloated/gassy']],
    ['menstrual', 'Menstrual', ['Irregular periods','Mid-cycle pain','Cramping','Premenstrual tension or mood changes','Increased bleeding','Breakthrough bleeding']],
    ['genital', 'Genital', ['Genital discomfort/swelling','Decreased urges/interest in sex','Discharge','Sexual dysfunction','Increased urges/interest in sex']],
    ['msk', 'Muscles, bones, joints', ['Pain','Numbness','Swelling/fluid buildup','Tingling','Cramps/contractions','Restless legs']],
    ['movement', 'Movement', ['Clumsiness / poor coordination','Restlessness','Tics (twitches, blinking, sounds)','Tremor / trembling / shaking','Rigidity, aches, cramps']],
    ['sleep', 'Sleep', ['Difficulty falling asleep','Sleeping too much','Interrupted sleep','Awakening not feeling rested','Early morning awakening','Drowsiness','Nightmares']],
    ['energy', 'Energy', ['Tiredness / fatigue','Excessive yawning','Sedation / drugged feeling','Overly excited / energetic','Withdrawn','Staring','Too keyed up / unable to settle down']],
    ['skin-hair', 'Skin / Hair', ['Rashes/irritation','Flaking scalp','Change in body odor','Pimples/acne','Sensitive to sun','Hair problems (loss, brittle)','Hives','Blisters','Oily skin/hair','Dry skin','Excessive sweating','Easy bruising']],
    ['strange', 'Strange experiences/thoughts', ['Seeing things that are not there','Hearing things that are not there','Smelling/tasting things that are not there','Strange physical feelings','Strange thoughts or ideas']],
    ['thinking', 'Thinking', ['Memory problems','Speech difficulty/changes','Concentration difficulty','Dizziness / faintness','Confusion','Slowed thinking','Loss of consciousness']],
    ['mood', 'Mood changes', ['Depressed','Irritable','Anxious / nervous','"Manicky"','Loss of interest / motivation']],
    ['accident', 'Accident / injury', ['Accidental injury','Attempted suicide','Self-harmful behavior (cutting, banging head, etc.)']],
    ['illness', 'Illness', ['Upper respiratory infection','Lower respiratory infection','Bacterial infection','Swollen glands','Urinary tract infection','Feeling flushed or warm','Fever','Feeling cold or chills','Gastrointestinal virus','Allergies / asthma']],
  ];
  const groups = sections.map(([slug, title, items]) => ({
    linkId: `${PFX}.${slug}`, type:'open-choice', repeats:true, text:title,
    extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
    answerOption: items.map(t => ({ valueCoding:{ code: t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: t } })),
  }));
  const q = questionnaire({
    id: ID, name:'AACAPMedSideEffects',
    title:'AACAP Evaluation of Possible Medication Side Effects',
    copyright: 'Adapted by J. Bostic, MD, EdD. AACAP Toolbox for Clinical Practice. Personal/non-commercial use permitted with attribution.',
    item: [
      display(`${PFX}.preamble`, 'TICK any problems listed below that you have noticed in your child since the medication was started. These effects may not be related to the medication, so please contact your clinician before changing or stopping the medication.', { category:'instructions' }),
      ...groups,
      { linkId:`${PFX}.medical-procedure`, type:'text', text:'Medical or surgical procedure (describe)' },
      { linkId:`${PFX}.medications`,       type:'text', text:'Medicine(s) (names/doses of all medications currently taking)' },
      { linkId:`${PFX}.other`,             type:'text', text:'Any other side effects (please describe)' },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── AACAP Stimulant Monitoring Form ──────────────────────────────────────────
{
  const ID = 'aacap-stimulant-monitoring'; const PFX = 'stim';
  const opts = ordOpts([
    [0,'none','0 — not present (I haven\'t noticed this)'],
    [1,'little','1 — a little (doesn\'t bother me)'],
    [2,'moderate','2 — a moderate amount (it bothers me)'],
    [3,'severe','3 — a severe amount (it bothers me a lot)'],
  ]);
  const symptoms = [
    'Hyperactivity','Impulsivity','Inattention','Aggression','Hallucinations','Delusions','Disorganized thoughts',
    'Low mood','Anxiety','Tics (uncontrolled motor movements or vocalizations)','Disruptive behaviors',
    'Trouble falling or staying asleep','Feeling overly excited or happy',
  ];
  const sideEffects = [
    'Nervousness','Insomnia','Headaches','Feeling dizzy or lightheaded','Feeling nauseated or vomiting','Tics',
    'Racing heart beat','Skin rash','Feeling of sensitivity','Mood changes','Dizziness','Strange thoughts',
    'Unusual behavior','Appetite loss','Weight loss',
  ];
  const visit = (vid) => group(`${PFX}.visit${vid}`, vid === 0 ? 'Baseline' : `Visit ${vid}`, [
    { linkId:`${PFX}.visit${vid}.date`,   type:'date',    text:'Date' },
    { linkId:`${PFX}.visit${vid}.dose`,   type:'string',  text:'Dose' },
    group(`${PFX}.visit${vid}.symptoms`, 'Symptoms',
      symptoms.map((s,i)=>({ linkId:`${PFX}.visit${vid}.symptoms.s${i+1}`, type:'choice', required:false, text:s, answerOption: opts })),
      { control:'gtable' }),
    group(`${PFX}.visit${vid}.side-effects`, 'Possible side effects',
      sideEffects.map((s,i)=>({ linkId:`${PFX}.visit${vid}.side-effects.s${i+1}`, type:'choice', required:false, text:s, answerOption: opts })),
      { control:'gtable' }),
    { linkId:`${PFX}.visit${vid}.missed-doses`, type:'integer', text:'Approximate # of missed doses of stimulant in the past week',
      extension:[{ url: EXT.minValue, valueInteger:0 }] },
  ]);
  const q = questionnaire({
    id: ID, name:'AACAPStimulantMonitoring',
    title:'AACAP Stimulant Monitoring Form for Children and Adolescents',
    copyright: 'AACAP Toolbox for Clinical Practice. Non-commercial use permitted with attribution.',
    item: [
      group(`${PFX}.header`, 'Patient & medication', [
        { linkId:`${PFX}.header.name`,         type:'string', text:'Name' },
        { linkId:`${PFX}.header.startDate`,    type:'date',   text:'Start date' },
        { linkId:`${PFX}.header.weight`,       type:'quantity', text:'Weight',
          extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[lb_av]', display:'lb' } }] },
        { linkId:`${PFX}.header.height`,       type:'quantity', text:'Height',
          extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[in_i]', display:'in' } }] },
        { linkId:`${PFX}.header.medication`,   type:'string', text:'Medication name' },
        { linkId:`${PFX}.header.completer`,    type:'string', text:'Completer\'s name' },
        { linkId:`${PFX}.header.relationship`, type:'string', text:'Relationship to patient' },
      ]),
      display(`${PFX}.scale`, '0 = not present · 1 = a little · 2 = a moderate amount · 3 = a severe amount', { category:'instructions' }),
      ...Array.from({length:7}, (_,i) => visit(i)),  // baseline + visits 1–6
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── AACAP CAP Intake Form 1 — New Patient Registration (child psychiatry) ──
{
  const ID = 'aacap-cap-intake-1'; const PFX = 'capi1';
  const effectScale = ordOpts([
    [1,'no-effect','No effect'],
    [2,'little','Little effect'],
    [3,'some','Some effect'],
    [4,'much','Much effect'],
    [5,'significant','Significant effect'],
  ]);
  const problems = [
    'Depression','Anxiety','Stress','Grief/Loss','LD/ADHD','Anger','Obsessions/Compulsions','Trauma',
    'Chronic Illness','Chronic Pain','Loneliness','Eating or Weight Problem','Abuse/Victimization','Domestic Violence',
    'Manic Episodes','Legal Matters','Relationship Issues','Sexuality/Sexual Issues','Family Conflict',
    'Behavioral Problems','Schizophrenia/Psychosis','Phobias/Fears','Eliminating a Drug/Alcohol Habit','Eliminating Another Habit (e.g., over-spending, gambling)',
  ];
  const q = questionnaire({
    id: ID, name:'AACAPCAPIntake1',
    title:'AACAP Child & Adolescent Psychiatry — New Patient Intake Form (Form 1)',
    copyright: 'AACAP Toolbox for Clinical Practice. Non-commercial use permitted with attribution.',
    item: [
      group(`${PFX}.physician`, 'Physician information', [
        { linkId:`${PFX}.physician.name`,    type:'string', text:'Physician name' },
        { linkId:`${PFX}.physician.phone`,   type:'string', text:'Phone',
          extension:[{ url: EXT.entryFormat, valueString:'nnn-nnn-nnnn' }] },
        { linkId:`${PFX}.physician.fax`,     type:'string', text:'Fax' },
        { linkId:`${PFX}.physician.address`, type:'text',   text:'Address' },
      ]),
      display(`${PFX}.intro`, 'This form requests information about your child which will help us design a treatment plan geared specifically to your child\'s needs.', { category:'instructions' }),
      group(`${PFX}.patient`, 'Patient & family', [
        { linkId:`${PFX}.patient.name`,        type:'string', required:true, text:'Patient name' },
        { linkId:`${PFX}.patient.birthdate`,   type:'date',   required:true, text:'Birthdate' },
        { linkId:`${PFX}.patient.todaysDate`,  type:'date',   text:'Today\'s date' },
        { linkId:`${PFX}.patient.address`,     type:'text',   text:'Address' },
        { linkId:`${PFX}.patient.age`,         type:'integer', text:'Age' },
        { linkId:`${PFX}.patient.sex`,         type:'choice', text:'Sex',
          answerOption: [
            { valueCoding:{ system: SYS.adminGender, code:'male',   display:'Male' } },
            { valueCoding:{ system: SYS.adminGender, code:'female', display:'Female' } },
          ] },
        { linkId:`${PFX}.patient.cityStateZip`, type:'string', text:'City, State, Zip' },
        { linkId:`${PFX}.patient.phoneHome`,    type:'string', text:'Home phone' },
        { linkId:`${PFX}.patient.phoneCell`,    type:'string', text:'Cell phone' },
        { linkId:`${PFX}.patient.parentStatus`, type:'choice', text:'Relationship status of parents',
          answerOption: [
            { valueCoding:{ code:'never-married', display:'Never married' } },
            { valueCoding:{ code:'married',       display:'Married / Partnership' } },
            { valueCoding:{ code:'separated',     display:'Separated' } },
            { valueCoding:{ code:'divorced',      display:'Divorced' } },
            { valueCoding:{ code:'widowed',       display:'Widowed' } },
          ] },
        { linkId:`${PFX}.patient.responsible`, type:'string', text:'Person responsible for bill' },
        { linkId:`${PFX}.patient.respAddress`, type:'text',   text:'Responsible party address' },
      ]),
      group(`${PFX}.mother`, 'Mother', [
        { linkId:`${PFX}.mother.name`,  type:'string', text:'Name' },
        { linkId:`${PFX}.mother.home`,  type:'string', text:'Home phone' },
        { linkId:`${PFX}.mother.work`,  type:'string', text:'Work phone' },
        { linkId:`${PFX}.mother.cell`,  type:'string', text:'Cell phone' },
      ]),
      group(`${PFX}.father`, 'Father', [
        { linkId:`${PFX}.father.name`,  type:'string', text:'Name' },
        { linkId:`${PFX}.father.home`,  type:'string', text:'Home phone' },
        { linkId:`${PFX}.father.work`,  type:'string', text:'Work phone' },
        { linkId:`${PFX}.father.cell`,  type:'string', text:'Cell phone' },
        { linkId:`${PFX}.father.address-different`, type:'text', text:'Father\'s address, if different from above' },
      ]),
      group(`${PFX}.household`, 'Other persons living in your household (including children not living at home)', [
        { linkId:`${PFX}.household.members`, type:'group', repeats:true,
          text:'Household member',
          extension:[{ url: EXT.minOccurs, valueInteger:0 },{ url: EXT.maxOccurs, valueInteger:10 }],
          item: [
            { linkId:`${PFX}.household.members.name`,        type:'string',  text:'Name' },
            { linkId:`${PFX}.household.members.age`,         type:'integer', text:'Age' },
            { linkId:`${PFX}.household.members.relationship`,type:'string',  text:'Relationship' },
            { linkId:`${PFX}.household.members.employment`,  type:'boolean', text:'Employed?' },
            { linkId:`${PFX}.household.members.welfare`,     type:'boolean', text:'On welfare aid?' },
            { linkId:`${PFX}.household.members.lives-at-home`, type:'boolean', text:'Lives at home?' },
          ] },
      ]),
      group(`${PFX}.demographics`, 'Demographics', [
        { linkId:`${PFX}.demographics.income`, type:'choice', text:'Household income (USD)',
          answerOption: [
            { valueCoding:{ code:'lt-20k',  display:'$0 – 20,000' } },
            { valueCoding:{ code:'20-50k',  display:'$20,000 – 50,000' } },
            { valueCoding:{ code:'gt-50k',  display:'More than $50,000' } },
            { valueCoding:{ code:'unknown', display:'Unknown' } },
          ] },
        { linkId:`${PFX}.demographics.fatherEd`, type:'choice', text:'Education level (father)',
          answerOption: ['Kindergarten','Elementary','Middle School','High School','Graduate'].map(s => ({ valueCoding:{ code: s.toLowerCase().replace(/\s+/g,'-'), display: s } })) },
        { linkId:`${PFX}.demographics.motherEd`, type:'choice', text:'Education level (mother)',
          answerOption: ['Kindergarten','Elementary','Middle School','High School','Graduate'].map(s => ({ valueCoding:{ code: s.toLowerCase().replace(/\s+/g,'-'), display: s } })) },
      ]),
      group(`${PFX}.referral`, 'Referral & insurance', [
        { linkId:`${PFX}.referral.pcp`,        type:'string', text:'Primary care physician' },
        { linkId:`${PFX}.referral.pcpAddress`, type:'text',   text:'PCP address' },
        { linkId:`${PFX}.referral.pcpPhone`,   type:'string', text:'PCP phone' },
        { linkId:`${PFX}.referral.allowExchange`, type:'boolean', text:'May we exchange information with your treating physicians to coordinate your care?' },
        { linkId:`${PFX}.referral.referredBy`, type:'string', text:'By whom were you referred?' },
        { linkId:`${PFX}.referral.insurance`,  type:'choice', text:'Insurance type',
          answerOption: [
            { valueCoding:{ code:'private', display:'Private' } },
            { valueCoding:{ code:'public',  display:'Public' } },
          ] },
        { linkId:`${PFX}.referral.reason`,     type:'text', text:'Reason(s) for seeking treatment at this time (include when the problem started)' },
        { linkId:`${PFX}.referral.otherClinicians`, type:'text', text:'Other health care professionals currently treating your child' },
        { linkId:`${PFX}.referral.allergies`,  type:'text', text:'Current allergies or other health problems for your child' },
      ]),
      group(`${PFX}.problemHistory`, 'Past (P) and current (C) problems',
        problems.map(p => ({
          linkId:`${PFX}.problemHistory.${p.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`,
          type:'choice', text:p,
          answerOption: [
            { valueCoding:{ code:'none',    display:'No history' } },
            { valueCoding:{ code:'past',    display:'Past (P)' } },
            { valueCoding:{ code:'current', display:'Current (C)' } },
            { valueCoding:{ code:'both',    display:'Past and current' } },
          ],
        })),
        { control:'gtable' }),
      { linkId:`${PFX}.problemHistory.other`, type:'text', text:'Other problems (please explain)' },
      group(`${PFX}.impact`, 'How are the problems affecting these areas of you and your child\'s life?',
        ['Relationships with peers','Family','Job/School Performance','Friendships','Financial situation','Physical health']
          .map((t,i)=>({ linkId:`${PFX}.impact.q${i+1}`, type:'choice', required:false, text:t, answerOption: effectScale })),
        { control:'gtable' }),
      group(`${PFX}.priorTx`, 'Prior mental health or substance abuse treatment', [
        { linkId:`${PFX}.priorTx.episodes`, type:'group', repeats: true, text:'Treatment episode',
          item: [
            { linkId:`${PFX}.priorTx.episodes.type`,     type:'string', text:'Type of treatment' },
            { linkId:`${PFX}.priorTx.episodes.provider`, type:'string', text:'Provider name' },
            { linkId:`${PFX}.priorTx.episodes.phone`,    type:'string', text:'Phone number' },
            { linkId:`${PFX}.priorTx.episodes.first`,    type:'date',   text:'First seen' },
            { linkId:`${PFX}.priorTx.episodes.last`,     type:'date',   text:'Last seen' },
          ] },
      ]),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── AACAP Telephone Intake (minimal) ────────────────────────────────────────
{
  const ID = 'aacap-telephone-intake'; const PFX = 'tpi';
  const q = questionnaire({
    id: ID, name:'AACAPTelephoneIntake',
    title:'AACAP Practice — Telephone Intake',
    copyright: 'AACAP Toolbox for Clinical Practice.',
    item: [
      group(`${PFX}.patient`, 'Patient', [
        { linkId:`${PFX}.patient.name`, type:'string', required:true, text:'Patient name' },
        { linkId:`${PFX}.patient.sex`,  type:'choice', text:'Sex',
          answerOption: [
            { valueCoding:{ system: SYS.adminGender, code:'male',   display:'Male' } },
            { valueCoding:{ system: SYS.adminGender, code:'female', display:'Female' } },
          ] },
        { linkId:`${PFX}.patient.age`,  type:'integer', text:'Age' },
        { linkId:`${PFX}.patient.dob`,  type:'date',    text:'DOB' },
        { linkId:`${PFX}.patient.parentStatus`, type:'choice', text:'Parent status',
          answerOption: [
            { valueCoding:{ code:'single',   display:'Single' } },
            { valueCoding:{ code:'married',  display:'Married' } },
            { valueCoding:{ code:'divorced', display:'Divorced' } },
          ] },
      ]),
      group(`${PFX}.mother`, 'Mother', [
        { linkId:`${PFX}.mother.name`,    type:'string', text:'Name' },
        { linkId:`${PFX}.mother.phone`,   type:'string', text:'Phone' },
        { linkId:`${PFX}.mother.cell`,    type:'string', text:'Cell' },
        { linkId:`${PFX}.mother.work`,    type:'string', text:'Work' },
        { linkId:`${PFX}.mother.address`, type:'text',   text:'Address' },
      ]),
      group(`${PFX}.father`, 'Father', [
        { linkId:`${PFX}.father.name`,    type:'string', text:'Name' },
        { linkId:`${PFX}.father.phone`,   type:'string', text:'Phone' },
        { linkId:`${PFX}.father.cell`,    type:'string', text:'Cell' },
        { linkId:`${PFX}.father.work`,    type:'string', text:'Work' },
        { linkId:`${PFX}.father.address`, type:'text',   text:'Address' },
      ]),
      group(`${PFX}.insurance`, 'Insurance', [
        { linkId:`${PFX}.insurance.type`,       type:'string', text:'Type of insurance' },
        { linkId:`${PFX}.insurance.adviseContact`, type:'boolean', text:'Advised to contact insurance company?' },
        { linkId:`${PFX}.insurance.subscriber`, type:'string', text:'Subscriber name' },
        { linkId:`${PFX}.insurance.ssn`,        type:'string', text:'Subscriber SSN' },
        { linkId:`${PFX}.insurance.subscriberDob`, type:'date', text:'Subscriber DOB' },
      ]),
      { linkId:`${PFX}.reason`,     type:'text',   text:'Reason for evaluation' },
      { linkId:`${PFX}.referredTo`, type:'string', text:'Referred to' },
      { linkId:`${PFX}.referredBy`, type:'string', text:'Referred by' },
      { linkId:`${PFX}.date`,       type:'date',   text:'Date of intake' },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
