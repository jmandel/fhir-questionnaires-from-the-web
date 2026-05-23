// Batch of PROM builders: FAAM, SPADI, SAQ-7, FIQR, MIDAS, Barthel, MAHC-10, ISI, ESS, STEADI referral, MoCA
import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, SYS, EXT } from '../lib.mjs';

function ordOpts(triples) {
  return triples.map(([o, code, display]) => ({ extension: [ordinal(o)], valueCoding: { code, display } }));
}

// ─────────────────────────── FAAM (ADL + Sports) ─────────────────────────────
{
  const ID = 'faam'; const PFX = 'faam';
  const diff = ordOpts([
    [4,'no','No difficulty'],
    [3,'slight','Slight difficulty'],
    [2,'moderate','Moderate difficulty'],
    [1,'extreme','Extreme difficulty'],
    [0,'unable','Unable to do'],
    [null,'na','Not applicable'],
  ]).map(o => o.valueCoding.code === 'na' ? ({ valueCoding: { code: 'na', display: 'N/A' } }) : o);

  const adl = [
    'Standing','Walking on even ground','Walking on even ground without shoes',
    'Walking up hills','Walking down hills','Going up stairs','Going down stairs',
    'Walking on uneven ground','Stepping up and down curbs','Squatting',
    'Coming up on your toes','Walking initially','Walking 5 minutes or less',
    'Walking approximately 10 minutes','Walking approximately 15 minutes',
    'Home responsibilities','Activities of daily living','Personal care',
    'Light to moderate work (standing, walking)','Heavy work (push/pulling, climbing, carrying)','Recreational activities',
  ];
  const sport = [
    'Running','Jumping','Landing','Starting and stopping quickly',
    'Cutting/lateral movements','Low-impact activities','Ability to perform activity with your normal technique',
    'Ability to participate in your desired sport as long as you would like',
  ];

  const overall = ordOpts(Array.from({length:11},(_,i)=>[i*10,String(i*10),`${i*10}%`]));

  const q = questionnaire({
    id: ID, name: 'FAAM',
    title: 'Foot and Ankle Ability Measure (FAAM)',
    code: [{ system: SYS.loinc, code: '83336-7', display: 'Foot and Ankle Ability Measure (FAAM)' }],
    copyright: 'Martin RL et al. Evidence of validity for the FAAM. Foot Ankle Int 2005;26:968-83. Free to use with attribution.',
    item: [
      display(`${PFX}.preamble`, 'Please answer every question with ONE answer, based on your condition within the past week. If the activity is limited by something other than your foot and ankle, mark N/A.', { category: 'instructions' }),
      group(`${PFX}.adl`, 'Activities of Daily Living Subscale',
        adl.map((t,i)=>({ linkId:`${PFX}.adl.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`, text:t, answerOption: diff })),
        { control: 'gtable' }),
      group(`${PFX}.sport`, 'Sports Subscale (only if you participate in sports)',
        sport.map((t,i)=>({ linkId:`${PFX}.sport.q${i+1}`, type:'choice', prefix:`${i+1}.`, text:t, answerOption: diff })),
        { control: 'gtable' }),
      { linkId:`${PFX}.adl.overall`, type:'choice', required:true,
        text:'How would you rate your current level of function during your usual activities of daily living from 0 to 100, with 100 being your level of function prior to your foot or ankle problem and 0 being the inability to perform any of your usual daily activities?',
        answerOption: overall },
      { linkId:`${PFX}.sport.overall`, type:'choice',
        text:'How would you rate your current level of function during your sports related activities from 0 to 100?',
        answerOption: overall },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── SPADI (Shoulder Pain & Disability) ──────────────
{
  const ID = 'spadi'; const PFX = 'spadi';
  const opts0to10 = Array.from({length:11},(_,i)=>({ extension:[ordinal(i)], valueCoding:{ code:String(i), display:String(i) } }));
  const sliderExt = [
    { url: EXT.itemControl, valueCodeableConcept: { coding: [{ system: SYS.itemControl, code: 'slider' }] } },
    { url: EXT.minValue, valueInteger: 0 }, { url: EXT.maxValue, valueInteger: 10 },
    { url: EXT.sliderStepValue, valueInteger: 1 },
  ];

  const pain = group(`${PFX}.pain`, 'Pain scale (0 = no pain, 10 = worst pain imaginable)', [
    ['At its worst','p1'],
    ['When lying on the involved side','p2'],
    ['Reaching for something on a high shelf','p3'],
    ['Touching the back of your neck','p4'],
    ['Pushing with the involved arm','p5'],
  ].map(([t,id],i)=>({ linkId:`${PFX}.pain.${id}`, type:'integer', required:true, prefix:`${i+1}.`,
    text:`How severe is your pain — ${t}?`,
    extension: sliderExt })));

  const disab = group(`${PFX}.disability`, 'Disability scale (0 = no difficulty, 10 = so difficult it requires help)', [
    ['Washing your hair','d1'],
    ['Washing your back','d2'],
    ['Putting on an undershirt or pullover sweater','d3'],
    ['Putting on a shirt that buttons down the front','d4'],
    ['Putting on your pants','d5'],
    ['Placing an object on a high shelf','d6'],
    ['Carrying a heavy object of 10 pounds','d7'],
    ['Removing something from your back pocket','d8'],
  ].map(([t,id],i)=>({ linkId:`${PFX}.disability.${id}`, type:'integer', required:true, prefix:`${i+1}.`,
    text:`How much difficulty do you have — ${t}?`,
    extension: sliderExt })));

  const q = questionnaire({
    id: ID, name: 'SPADI',
    title: 'Shoulder Pain and Disability Index (SPADI)',
    code: [{ system: SYS.loinc, code: '74474-8', display: 'Shoulder Pain and Disability Index [SPADI]' }],
    copyright: 'Roach KE, Budiman-Mak E, Songsiridej N, Lertratanakul Y. Development of a shoulder pain and disability index. Arthritis Care Res 1991;4:143-9.',
    extension: [
      variable('spadiPainSum',  "%resource.item.descendants().where(linkId.startsWith('spadi.pain.')).answer.valueInteger.sum()"),
      variable('spadiDisabSum', "%resource.item.descendants().where(linkId.startsWith('spadi.disability.')).answer.valueInteger.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Circle the number that best describes the question being asked.', { category: 'instructions' }),
      pain, disab,
      { linkId:`${PFX}.painScore`, type:'decimal', readOnly:true,
        text:'Pain subscale (% of total possible 50; lower is better)',
        extension:[calcExpr("(%spadiPainSum * 100) / 50", "SPADI pain subscale percentage")] },
      { linkId:`${PFX}.disabScore`, type:'decimal', readOnly:true,
        text:'Disability subscale (% of total possible 80; lower is better)',
        extension:[calcExpr("(%spadiDisabSum * 100) / 80", "SPADI disability subscale percentage")] },
      { linkId:`${PFX}.total`, type:'decimal', readOnly:true,
        text:'SPADI total score (mean of pain and disability subscales)',
        extension:[calcExpr("(((%spadiPainSum * 100) / 50) + ((%spadiDisabSum * 100) / 80)) / 2", "SPADI total percentage")] },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── Seattle Angina Questionnaire (SAQ) — long form ────
{
  const ID = 'saq'; const PFX = 'saq';
  const limited = ordOpts([
    [1,'severely','Severely limited'],
    [2,'moderately','Moderately limited'],
    [3,'somewhat','Somewhat limited'],
    [4,'a-little','A little limited'],
    [5,'not','Not limited'],
  ]);
  const limitedNA = [...limited, { valueCoding: { code: 'na', display: 'Limited or did not do for other reasons' } }];

  const activities = group(`${PFX}.pl`, 'Physical limitation due to chest pain, chest tightness, or angina (past 4 weeks)',
    [
      ['Dressing yourself','dressing'],
      ['Walking indoors on level ground','walking-indoors'],
      ['Showering','showering'],
      ['Climbing a hill or a flight of stairs without stopping','stairs'],
      ['Gardening, vacuuming, or carrying groceries','household'],
      ['Walking more than a block at a brisk pace','walking-brisk'],
      ['Running or jogging','running'],
      ['Lifting or moving heavy objects (e.g., furniture, children)','lifting'],
      ['Participating in strenuous sports (e.g., swimming, tennis)','sports'],
    ].map(([t,id],i)=>({ linkId:`${PFX}.pl.${id}`, type:'choice', required:true, prefix:`2${String.fromCharCode(97+i)}.`,
      text:`How much limitation have you had over the past 4 weeks: ${t}?`,
      answerOption: limitedNA })),
    { control:'gtable' });

  const stab = {
    linkId:`${PFX}.stability`, type:'choice', required:true, prefix:'3.',
    text:'Compared with 4 weeks ago, how often do you have chest pain, chest tightness, or angina when doing your most strenuous level of activity?',
    answerOption: ordOpts([
      [1,'much-more','Much more often'],
      [3,'slightly-more','Slightly more often'],
      [5,'same','About the same'],
      [7,'slightly-less','Slightly less often'],
      [9,'much-less','Much less often'],
    ]),
  };

  const freq = ordOpts([
    [1,'4-plus-per-day','4 or more times per day'],
    [2,'1-3-per-day','1–3 times per day'],
    [3,'3-plus-per-week','3+ times/week but not every day'],
    [4,'1-2-per-week','1–2 times per week'],
    [5,'lt-weekly','Less than once a week'],
    [6,'none','None over the past 4 weeks'],
  ]);

  const q = questionnaire({
    id: ID, name: 'SAQ',
    title: 'Seattle Angina Questionnaire (SAQ) — long form',
    code: [{ system: SYS.loinc, code: '88040-8', display: 'Seattle Angina Questionnaire' }],
    copyright: '© 1992 John Spertus, MD MPH. Free for non-commercial clinical and research use with attribution.',
    item: [
      display(`${PFX}.preamble`, 'This questionnaire asks how chest pain (angina) has affected your life over the past 4 weeks.', { category: 'instructions' }),
      activities,
      stab,
      { linkId:`${PFX}.frequency`, type:'choice', required:true, prefix:'4.',
        text:'Over the past 4 weeks, on average, how many times have you had chest pain, chest tightness, or angina?',
        answerOption: freq },
      { linkId:`${PFX}.nitros`, type:'choice', required:true, prefix:'5.',
        text:'Over the past 4 weeks, on average, how many times have you had to take nitros (nitroglycerin tablets) for your chest pain, chest tightness, or angina?',
        answerOption: freq },
      { linkId:`${PFX}.bother`, type:'choice', required:true, prefix:'6.',
        text:'How bothersome is it for you to take your pills for chest pain, chest tightness or angina as prescribed?',
        answerOption: ordOpts([
          [1,'very','Very bothersome'],[2,'moderately','Moderately bothersome'],
          [3,'somewhat','Somewhat bothersome'],[4,'a-little','A little bothersome'],
          [5,'not','Not bothersome at all'],[6,'na','My doctor has not prescribed pills'],
        ]) },
      { linkId:`${PFX}.satisfaction`, type:'choice', required:true, prefix:'7.',
        text:'How satisfied are you that everything possible is being done to treat your chest pain, chest tightness or angina?',
        answerOption: ordOpts([
          [1,'not','Not satisfied at all'],[3,'mostly-dissatisfied','Mostly dissatisfied'],
          [5,'somewhat','Somewhat satisfied'],[7,'mostly','Mostly satisfied'],[9,'highly','Highly satisfied'],
        ]) },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── FIQR (Revised Fibromyalgia Impact) ─────────────
{
  const ID = 'fiqr'; const PFX = 'fiqr';
  // FIQR uses 11-point (0–10) scales throughout.
  const sliderExt = [
    { url: EXT.itemControl, valueCodeableConcept: { coding: [{ system: SYS.itemControl, code: 'slider' }] } },
    { url: EXT.minValue, valueInteger: 0 }, { url: EXT.maxValue, valueInteger: 10 }, { url: EXT.sliderStepValue, valueInteger: 1 },
  ];

  const fn = group(`${PFX}.function`, 'Function — Difficulty performing each activity over the past 7 days (0 = no difficulty, 10 = very difficult)', [
    'Brush or comb your hair','Walk continuously for 20 minutes','Prepare a homemade meal',
    'Vacuum, scrub or sweep floors','Lift and carry a bag full of groceries','Climb one flight of stairs',
    'Change bed sheets','Sit in a chair for 45 minutes','Go shopping for groceries',
  ].map((t,i)=>({ linkId:`${PFX}.function.q${i+1}`, type:'integer', required:true, prefix:`F${i+1}.`, text:t, extension: sliderExt })),
  { control:'gtable' });

  const impact = group(`${PFX}.impact`, 'Overall impact (0 = never / none, 10 = always / overwhelming)', [
    'Fibromyalgia prevented me from accomplishing goals for the week',
    'I was completely overwhelmed by my fibromyalgia symptoms',
  ].map((t,i)=>({ linkId:`${PFX}.impact.q${i+1}`, type:'integer', required:true, prefix:`I${i+1}.`, text:t, extension: sliderExt })),
  { control:'gtable' });

  const sx = group(`${PFX}.symptoms`, 'Intensity of common fibromyalgia symptoms over the past 7 days (0 = none / lowest, 10 = worst)', [
    'Pain','Energy (0 = lots of energy, 10 = no energy)','Stiffness',
    'Sleep quality (0 = awoke well rested, 10 = awoke very tired)','Depression',
    'Memory problems','Anxiety','Tenderness to touch','Balance problems','Sensitivity to loud noises, bright lights, odors and cold',
  ].map((t,i)=>({ linkId:`${PFX}.symptoms.q${i+1}`, type:'integer', required:true, prefix:`S${i+1}.`, text:t, extension: sliderExt })),
  { control:'gtable' });

  const q = questionnaire({
    id: ID, name: 'FIQR',
    title: 'Revised Fibromyalgia Impact Questionnaire (FIQR)',
    code: [{ system: SYS.loinc, code: '90858-2', display: 'Fibromyalgia Impact Questionnaire Revised' }],
    copyright: 'Bennett RM et al. The Revised Fibromyalgia Impact Questionnaire (FIQR). Arthritis Res Ther 2009;11:R120. Free to use for clinical care and non-commercial research.',
    extension: [
      variable('fiqrFn',  "%resource.item.descendants().where(linkId.startsWith('fiqr.function.')).answer.valueInteger.sum()"),
      variable('fiqrIm',  "%resource.item.descendants().where(linkId.startsWith('fiqr.impact.')).answer.valueInteger.sum()"),
      variable('fiqrSx',  "%resource.item.descendants().where(linkId.startsWith('fiqr.symptoms.')).answer.valueInteger.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'For each question, rate over the past 7 days. If you did not perform a particular activity in the last 7 days, rate the difficulty for the last time you performed it.', { category: 'instructions' }),
      fn, impact, sx,
      { linkId:`${PFX}.functionScore`, type:'decimal', readOnly:true, text:'Function domain score (raw / 3)', extension:[calcExpr("%fiqrFn / 3","FIQR function sub-score (0–30)")] },
      { linkId:`${PFX}.impactScore`,   type:'decimal', readOnly:true, text:'Impact domain score (raw kept × 1)', extension:[calcExpr("%fiqrIm * 1","FIQR impact sub-score (0–20)")] },
      { linkId:`${PFX}.symptomsScore`, type:'decimal', readOnly:true, text:'Symptom domain score (raw / 2)',     extension:[calcExpr("%fiqrSx / 2","FIQR symptom sub-score (0–50)")] },
      { linkId:`${PFX}.total`, type:'decimal', readOnly:true, text:'FIQR total (0–100)',
        extension:[calcExpr("(%fiqrFn / 3) + (%fiqrIm * 1) + (%fiqrSx / 2)","FIQR total score")] },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── MIDAS (Migraine Disability) ─────────────────────
{
  const ID = 'midas'; const PFX = 'midas';
  const intInput = (id, prefix, text) => ({ linkId: id, type:'integer', required:true, prefix, text,
    extension: [{ url: EXT.minValue, valueInteger: 0 }] });

  const q = questionnaire({
    id: ID, name: 'MIDAS',
    title: 'Migraine Disability Assessment (MIDAS)',
    code: [{ system: SYS.loinc, code: '69733-4', display: 'Migraine Disability Assessment [MIDAS]' }],
    copyright: '© Innovative Medical Research, 1997. © AstraZeneca Pharmaceuticals, LP. Free for clinical use.',
    extension: [
      variable('midasSum', "%resource.item.where(linkId in ('midas.q1'|'midas.q2'|'midas.q3'|'midas.q4'|'midas.q5')).answer.valueInteger.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Answer the following questions about ALL of the headaches you have had over the last 3 months. Enter 0 if you did not have the activity in the last 3 months.', { category: 'instructions' }),
      intInput(`${PFX}.q1`,'1.','On how many days in the last 3 months did you miss work or school because of your headaches?'),
      intInput(`${PFX}.q2`,'2.','How many days in the last 3 months was your productivity at work or school reduced by half or more because of your headaches? (Do not include days you counted in question 1.)'),
      intInput(`${PFX}.q3`,'3.','On how many days in the last 3 months did you not do household work because of your headaches?'),
      intInput(`${PFX}.q4`,'4.','How many days in the last 3 months was your productivity in household work reduced by half or more because of your headaches? (Do not include days you counted in question 3.)'),
      intInput(`${PFX}.q5`,'5.','On how many days in the last 3 months did you miss family, social or leisure activities because of your headaches?'),
      totalScore(`${PFX}.totalScore`, 'MIDAS total (sum Q1–Q5)', 'midasSum', null),
      intInput(`${PFX}.qa`,'A.','On how many days in the last 3 months did you have a headache? (count each day separately)'),
      intInput(`${PFX}.qb`,'B.','On a scale of 0–10, on average how painful were these headaches? (0 = no pain, 10 = pain as bad as it can be)'),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── Barthel Index ───────────────────────────────────
{
  const ID = 'barthel'; const PFX = 'barthel';
  const opts = (...pairs) => pairs.map(([o,c,d])=>({ extension:[ordinal(o)], valueCoding:{ code:c, display:d } }));
  const q = questionnaire({
    id: ID, name: 'BarthelIndex',
    title: 'Barthel Index of Activities of Daily Living',
    code: [{ system: SYS.loinc, code: '85487-8', display: 'Barthel Index of Activities of Daily Living [Reported]' }],
    copyright: 'Mahoney FI, Barthel D. Functional evaluation: the Barthel Index. Md State Med J 1965;14:56-61. Used with permission.',
    extension: [
      variable('barthelSum', "%resource.item.where(linkId.startsWith('barthel.q')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Record what the patient actually does, not what they could do. Aim is to establish the degree of independence from any help, physical or verbal, however minor and for whatever reason.', { category: 'instructions' }),
      { linkId:`${PFX}.q1`, type:'choice', required:true, prefix:'1.', text:'Feeding',
        answerOption: opts([0,'0','Unable'],[5,'5','Needs help cutting, spreading butter, etc., or requires modified diet'],[10,'10','Independent']) },
      { linkId:`${PFX}.q2`, type:'choice', required:true, prefix:'2.', text:'Bathing',
        answerOption: opts([0,'0','Dependent'],[5,'5','Independent (or in shower)']) },
      { linkId:`${PFX}.q3`, type:'choice', required:true, prefix:'3.', text:'Grooming',
        answerOption: opts([0,'0','Needs help with personal care'],[5,'5','Independent face/hair/teeth/shaving']) },
      { linkId:`${PFX}.q4`, type:'choice', required:true, prefix:'4.', text:'Dressing',
        answerOption: opts([0,'0','Dependent'],[5,'5','Needs help but can do about half unaided'],[10,'10','Independent (including buttons, zips, laces, etc.)']) },
      { linkId:`${PFX}.q5`, type:'choice', required:true, prefix:'5.', text:'Bowels',
        answerOption: opts([0,'0','Incontinent (or needs to be given enemas)'],[5,'5','Occasional accident'],[10,'10','Continent']) },
      { linkId:`${PFX}.q6`, type:'choice', required:true, prefix:'6.', text:'Bladder',
        answerOption: opts([0,'0','Incontinent, or catheterized and unable to manage alone'],[5,'5','Occasional accident'],[10,'10','Continent']) },
      { linkId:`${PFX}.q7`, type:'choice', required:true, prefix:'7.', text:'Toilet use',
        answerOption: opts([0,'0','Dependent'],[5,'5','Needs some help, but can do something alone'],[10,'10','Independent (on and off, dressing, wiping)']) },
      { linkId:`${PFX}.q8`, type:'choice', required:true, prefix:'8.', text:'Transfers (bed to chair and back)',
        answerOption: opts([0,'0','Unable, no sitting balance'],[5,'5','Major help (one or two people, physical), can sit'],[10,'10','Minor help (verbal or physical)'],[15,'15','Independent']) },
      { linkId:`${PFX}.q9`, type:'choice', required:true, prefix:'9.', text:'Mobility on level surfaces',
        answerOption: opts([0,'0','Immobile or <50 yards'],[5,'5','Wheelchair independent, including corners, >50 yards'],[10,'10','Walks with help of one person (verbal or physical) >50 yards'],[15,'15','Independent (but may use any aid; e.g., stick) >50 yards']) },
      { linkId:`${PFX}.q10`, type:'choice', required:true, prefix:'10.', text:'Stairs',
        answerOption: opts([0,'0','Unable'],[5,'5','Needs help (verbal, physical, carrying aid)'],[10,'10','Independent']) },
      totalScore(`${PFX}.totalScore`, 'Barthel Index total (0–100)', 'barthelSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── MAHC-10 Fall Risk ────────────────────────────────
{
  const ID = 'mahc-10'; const PFX = 'mahc10';
  const items = [
    ['age65','Age 65+'],
    ['multi-dx','3 or more co-existing medical diagnoses'],
    ['falls','Prior history of falls within 3 months'],
    ['incont','Incontinence (frequency, urgency, or nocturia)'],
    ['vision','Visual impairment (macular degeneration, diabetic retinopathy, etc., or not wearing prescribed glasses)'],
    ['mobility','Impaired functional mobility (needs help with IADLs/ADLs, gait or transfer problems, arthritis, pain, fear of falling)'],
    ['env','Environmental hazards (poor illumination, inappropriate footwear, pets, cluttered floors, uneven surfaces)'],
    ['polyrx','Polypharmacy (4+ prescriptions of any type)'],
    ['pain','Pain affecting level of function'],
    ['cognition','Cognitive impairment (dementia, Alzheimer\'s, stroke; poor judgment, decreased comprehension, memory deficits)'],
  ];
  const matrix = group(`${PFX}.matrix`, 'Required core elements — assess 1 point for each "Yes"',
    items.map(([slug,text])=>({ linkId:`${PFX}.matrix.${slug}`, type:'choice', required:true, text,
      answerOption: [
        { extension:[ordinal(0)], valueCoding:{ code:'no',  display:'No' } },
        { extension:[ordinal(1)], valueCoding:{ code:'yes', display:'Yes' } },
      ] })),
    { control:'gtable' });

  const q = questionnaire({
    id: ID, name: 'MAHC10',
    title: 'MAHC-10 — Missouri Alliance for Home Care Fall Risk Assessment Tool',
    copyright: '© Missouri Alliance for Home Care. Free to use for clinical care.',
    extension: [
      variable('mahcSum', "%resource.item.descendants().where(linkId.startsWith('mahc10.matrix.')).answer.valueCoding.where(code='yes').count()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Conduct a fall risk assessment on each patient at start of care and re-certification. A score of 4 or more is considered at risk for falling.', { category: 'instructions' }),
      matrix,
      totalScore(`${PFX}.totalScore`, 'MAHC-10 total (0–10; ≥4 = at risk)', 'mahcSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── Insomnia Severity Index (ISI) ────────────────────
{
  const ID = 'isi'; const PFX = 'isi';
  const sev = ordOpts([[0,'none','None'],[1,'mild','Mild'],[2,'moderate','Moderate'],[3,'severe','Severe'],[4,'very-severe','Very severe']]);
  const sat = ordOpts([[0,'very-satisfied','Very satisfied'],[1,'satisfied','Satisfied'],[2,'neutral','Neutral'],[3,'dissatisfied','Dissatisfied'],[4,'very-dissatisfied','Very dissatisfied']]);
  const intf = ordOpts([[0,'not','Not at all interfering'],[1,'a-little','A little'],[2,'somewhat','Somewhat'],[3,'much','Much'],[4,'very-much','Very much interfering']]);
  const noti = ordOpts([[0,'not','Not at all noticeable'],[1,'a-little','A little'],[2,'somewhat','Somewhat'],[3,'much','Much'],[4,'very-much','Very much noticeable']]);
  const worry = ordOpts([[0,'not','Not at all worried'],[1,'a-little','A little'],[2,'somewhat','Somewhat'],[3,'much','Much'],[4,'very-much','Very much worried']]);

  const matrix = group(`${PFX}.matrix`, 'ISI items (last month)', [
    [`${PFX}.matrix.q1`, '1.', 'Difficulty falling asleep', sev],
    [`${PFX}.matrix.q2`, '2.', 'Difficulty staying asleep', sev],
    [`${PFX}.matrix.q3`, '3.', 'Problem waking up too early in the morning', sev],
    [`${PFX}.matrix.q4`, '4.', 'How SATISFIED/dissatisfied are you with your current sleep pattern?', sat],
    [`${PFX}.matrix.q5`, '5.', 'To what extent do you consider your sleep problem to INTERFERE with your daily functioning?', intf],
    [`${PFX}.matrix.q6`, '6.', 'How NOTICEABLE to others do you think your sleep problem is in terms of impairing the quality of your life?', noti],
    [`${PFX}.matrix.q7`, '7.', 'How WORRIED/distressed are you about your current sleep problem?', worry],
  ].map(([id,p,t,o])=>({ linkId:id, type:'choice', required:true, prefix:p, text:t, answerOption: o })),
  { control:'gtable' });

  const q = questionnaire({
    id: ID, name: 'ISI',
    title: 'Insomnia Severity Index (ISI)',
    code: [{ system: SYS.loinc, code: '97824-6', display: 'Insomnia Severity Index' }],
    copyright: '© Morin CM 1993, 1996, 2000, 2006. Free for clinical and research use with attribution.',
    extension: [variable('isiSum', "%resource.item.descendants().where(linkId.startsWith('isi.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'For each question, please rate based on your sleep patterns in the LAST MONTH.', { category: 'instructions' }),
      matrix,
      totalScore(`${PFX}.totalScore`, 'ISI total (0–28). 0–7 no clinical insomnia; 8–14 subthreshold; 15–21 moderate clinical; 22–28 severe clinical.', 'isiSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── Epworth Sleepiness Scale (ESS) ───────────────────
{
  const ID = 'ess'; const PFX = 'ess';
  const opts = ordOpts([
    [0,'never','Would never doze'],
    [1,'slight','Slight chance of dozing'],
    [2,'moderate','Moderate chance of dozing'],
    [3,'high','High chance of dozing'],
  ]);
  const situations = [
    'Sitting and reading',
    'Watching TV',
    'Sitting inactive in a public place (e.g., a theater or a meeting)',
    'As a passenger in a car for an hour without a break',
    'Lying down to rest in the afternoon when circumstances permit',
    'Sitting and talking to someone',
    'Sitting quietly after a lunch without alcohol',
    'In a car, while stopped for a few minutes in traffic',
  ];
  const matrix = group(`${PFX}.matrix`, 'Likelihood of dozing in the following situations (recent times in your life)',
    situations.map((t,i)=>({ linkId:`${PFX}.matrix.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`, text:t, answerOption: opts })),
    { control:'gtable' });
  const q = questionnaire({
    id: ID, name: 'ESS',
    title: 'Epworth Sleepiness Scale (ESS)',
    code: [{ system: SYS.loinc, code: '79443-0', display: 'Epworth sleepiness scale [Reported]' }],
    copyright: '© Murray W Johns 1990–1997. Reproduction without written consent from Dr. Johns is prohibited. Reproduced here for educational reference (https://epworthsleepinessscale.com).',
    extension: [variable('essSum', "%resource.item.descendants().where(linkId.startsWith('ess.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'How likely are you to doze off or fall asleep in the following situations, in contrast to feeling just tired? This refers to your usual way of life in recent times.', { category: 'instructions' }),
      matrix,
      totalScore(`${PFX}.totalScore`, 'ESS total (0–24). ≥10 suggests excessive daytime sleepiness.', 'essSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────── STEADI Fall Prevention Referral ────────────────
{
  const ID = 'steadi-referral'; const PFX = 'steadi';
  const reasons = [
    'Gait or mobility problems','Balance difficulties','Lower body weakness','Postural hypotension',
    'Suspected neurological condition (e.g., Parkinson\'s disease, dementia)','Medication review & consultation',
    'Inadequate or improper footwear','Foot abnormalities','Vision <20/40','Home safety evaluation led by occupational therapist',
  ];
  const q = questionnaire({
    id: ID, name: 'STEADIReferral',
    title: 'STEADI Fall Prevention Patient Referral (CDC)',
    copyright: 'CDC STEADI initiative — public domain.',
    item: [
      display(`${PFX}.preamble`, 'Use this form to refer a patient for fall prevention services.', { category: 'instructions' }),
      group(`${PFX}.patient`, 'Patient information', [
        { linkId:`${PFX}.patient.name`,    type:'string', required:true, text:'Patient name' },
        { linkId:`${PFX}.patient.sex`,     type:'choice', text:'Sex',
          answerOption:[
            { valueCoding:{ system: SYS.adminGender, code:'male',   display:'Male' } },
            { valueCoding:{ system: SYS.adminGender, code:'female', display:'Female' } },
          ] },
        { linkId:`${PFX}.patient.dob`,     type:'date',   required:true, text:'Date of birth' },
        { linkId:`${PFX}.patient.address`, type:'text',   text:'Address' },
        { linkId:`${PFX}.patient.phone`,   type:'string', text:'Phone',
          extension:[{ url: EXT.entryFormat, valueString:'nnn-nnn-nnnn' }] },
        { linkId:`${PFX}.patient.email`,   type:'string', text:'Email',
          extension:[{ url: EXT.regex, valueString:'^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }] },
        { linkId:`${PFX}.patient.diagnosis`, type:'text', text:'Diagnosis' },
      ]),
      group(`${PFX}.referral`, 'Type of referral', [
        { linkId:`${PFX}.referral.specialist`, type:'string', text:'Type of specialist' },
        { linkId:`${PFX}.referral.program`,    type:'string', text:'Exercise or fall prevention program' },
        { linkId:`${PFX}.referral.additional`, type:'text',   text:'Additional recommendations' },
      ]),
      { linkId:`${PFX}.reasons`, type:'open-choice', repeats: true,
        text:'Reason for referral (select all that apply)',
        extension:[{ url: EXT.itemControl, valueCodeableConcept: { coding: [{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption: reasons.map(t => ({ valueCoding: { code: t.toLowerCase().replace(/[^a-z]+/g,'-').replace(/^-|-$/g,''), display: t } })),
      },
      { linkId:`${PFX}.vision-side`, type:'choice', text:'If "Vision <20/40", indicate side',
        enableWhen:[{ question:`${PFX}.reasons`, operator:'=', answerCoding: { code:'vision-20-40' } }],
        answerOption:[
          { valueCoding:{ code:'right', display:'Right' } },
          { valueCoding:{ code:'left',  display:'Left' } },
          { valueCoding:{ code:'both',  display:'Both' } },
        ] },
      { linkId:`${PFX}.other`, type:'text', text:'Other reason / relevant information' },
      { linkId:`${PFX}.signature`, type:'string', text:'Referrer signature', required:true },
      { linkId:`${PFX}.date`, type:'date', text:'Date', required:true },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
