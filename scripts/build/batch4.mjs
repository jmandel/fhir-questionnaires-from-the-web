// Batch4: PHQ-9 Teens, KCCQ-12, PAID-20, EPDS, HAQ-DI, FLACC, Wong-Baker FACES,
// Social Needs (AAFP EveryONE long), AACAP AIMS, AACAP medication side-effects monitoring,
// AACAP stimulant monitoring, CMRS-P, MoCA (outline), C-SSRS Risk Assessment (Lifeline), Rome IV IBS (essentials).
import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, whenExpr, SYS, EXT } from '../lib.mjs';

function ordOpts(triples) {
  return triples.map(([o, code, display]) => ({ extension: [ordinal(o)], valueCoding: { code, display } }));
}
function yesNo(yes=1, no=0) {
  return [
    { extension:[ordinal(no)],  valueCoding:{ system: SYS.yn, code:'N', display:'No' } },
    { extension:[ordinal(yes)], valueCoding:{ system: SYS.yn, code:'Y', display:'Yes' } },
  ];
}

// ─── PHQ-9 Modified for Teens (GLAD-PC) ─────────────────────────────────────
{
  const ID = 'phq-9-teen'; const PFX = 'phq9t';
  const opts = ordOpts([[0,'not','Not at all'],[1,'several','Several days'],[2,'more-half','More than half the days'],[3,'nearly','Nearly every day']]);
  const items = [
    [1,'Feeling down, depressed, irritable, or hopeless?'],
    [2,'Little interest or pleasure in doing things?'],
    [3,'Trouble falling asleep, staying asleep, or sleeping too much?'],
    [4,'Poor appetite, weight loss, or overeating?'],
    [5,'Feeling tired or having little energy?'],
    [6,'Feeling bad about yourself – or feeling that you are a failure, or that you have let yourself or your family down?'],
    [7,'Trouble concentrating on things like school work, reading, or watching TV?'],
    [8,'Moving or speaking so slowly that other people could have noticed? Or the opposite – being so fidgety or restless that you were moving around a lot more than usual?'],
    [9,'Thoughts that you would be better off dead, or of hurting yourself in some way?'],
  ];
  const matrix = group(`${PFX}.matrix`, 'PHQ-9 (Teen) symptom items (past 2 weeks)',
    items.map(([n,t])=>({ linkId:`${PFX}.matrix.q${n}`, type:'choice', required:true, prefix:`${n}.`, text:t, answerOption: opts })),
    { control:'gtable' });

  const q = questionnaire({
    id: ID, name: 'PHQ9Teen',
    title: 'PHQ-9 Modified for Teens (GLAD-PC version)',
    code: [{ system: SYS.loinc, code: '89204-2', display: 'PHQ-9 modified for Teens [GLAD-PC]' }],
    copyright: 'Modified with permission by the GLAD-PC team from the PHQ-9 (Spitzer, Williams, Kroenke 1999), the Revised PHQ-A (Johnson 2002), and the CDS (DISC Development Group 2000).',
    extension: [variable('phq9tSum', "%resource.item.descendants().where(linkId.startsWith('phq9t.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'How often have you been bothered by each of the following symptoms during the past two weeks?', { category: 'instructions' }),
      matrix,
      totalScore(`${PFX}.totalScore`, 'PHQ-9 (Teen) total (0–27)', 'phq9tSum', null),
      { linkId:`${PFX}.dysthymia`, type:'choice', required:true,
        text:'In the past year have you felt depressed or sad most days, even if you felt okay sometimes?',
        answerOption: yesNo() },
      { linkId:`${PFX}.difficulty`, type:'choice',
        text:'If you are experiencing any of the problems on this form, how difficult have these problems made it for you to do your work, take care of things at home or get along with other people?',
        extension: [whenExpr('%phq9tSum > 0')],
        answerOption: ordOpts([[0,'not','Not difficult at all'],[1,'somewhat','Somewhat difficult'],[2,'very','Very difficult'],[3,'extremely','Extremely difficult']]) },
      { linkId:`${PFX}.suicide-recent`, type:'choice', required:true,
        text:'Has there been a time in the past month when you have had serious thoughts about ending your life?',
        answerOption: yesNo() },
      { linkId:`${PFX}.suicide-lifetime`, type:'choice', required:true,
        text:'Have you EVER, in your WHOLE LIFE, tried to kill yourself or made a suicide attempt?',
        answerOption: yesNo() },
      display(`${PFX}.safety`, 'If you have had thoughts that you would be better off dead or of hurting yourself in some way, please discuss this with your Health Care Clinician, go to a hospital emergency room or call 911.', { category: 'help' }),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── KCCQ-12 (Kansas City Cardiomyopathy Questionnaire — short form) ─────────
{
  const ID = 'kccq-12'; const PFX = 'kccq12';
  const limitedOpts = ordOpts([[1,'extremely','Extremely limited'],[2,'quite','Quite a bit limited'],[3,'moderately','Moderately limited'],[4,'slightly','Slightly limited'],[5,'not','Not at all limited']])
    .concat([{ valueCoding: { code:'na', display:'Limited for other reasons or did not do the activity' } }]);

  const freq5 = ordOpts([[1,'every-am','Every morning'],[2,'3plus-week','3+ times/week but not every day'],[3,'1-2-per-week','1–2 times per week'],[4,'lt-weekly','Less than once a week'],[5,'never','Never over the past 2 weeks']]);
  const freq7 = ordOpts([
    [1,'all-time','All of the time'],[2,'several-per-day','Several times per day'],[3,'once-per-day','At least once a day'],
    [4,'3plus-per-week','3+ per week but not every day'],[5,'1-2-per-week','1–2 times per week'],
    [6,'lt-weekly','Less than once a week'],[7,'never','Never over the past 2 weeks']]);
  const enjoyOpts = ordOpts([[1,'extremely','It has extremely limited my enjoyment of life'],[2,'quite-bit','It has limited my enjoyment of life quite a bit'],[3,'moderately','It has moderately limited my enjoyment of life'],[4,'slightly','It has slightly limited my enjoyment of life'],[5,'not','It has not limited my enjoyment of life at all']]);
  const satOpts = ordOpts([[1,'not','Not at all satisfied'],[2,'mostly-dissatisfied','Mostly dissatisfied'],[3,'somewhat','Somewhat satisfied'],[4,'mostly','Mostly satisfied'],[5,'completely','Completely satisfied']]);

  const q1 = group(`${PFX}.q1`, 'Q1. How limited have you been by heart failure (shortness of breath or fatigue) in your ability to do the following over the past 2 weeks?', [
    [`${PFX}.q1.shower`, 'a.', 'Showering/bathing'],
    [`${PFX}.q1.walk-block`, 'b.', 'Walking 1 block on level ground'],
    [`${PFX}.q1.hurry-jog`, 'c.', 'Hurrying or jogging (as if to catch a bus)'],
  ].map(([id,p,t])=>({ linkId:id, type:'choice', required:true, prefix:p, text:t, answerOption: limitedOpts })),
  { control:'gtable' });

  const q8 = group(`${PFX}.q8`, 'Q8. How much does your heart failure affect your lifestyle? Indicate how it limited your participation in the following over the past 2 weeks.', [
    [`${PFX}.q8.hobbies`,    'a.', 'Hobbies, recreational activities'],
    [`${PFX}.q8.work`,       'b.', 'Working or doing household chores'],
    [`${PFX}.q8.visiting`,   'c.', 'Visiting family or friends out of your home'],
  ].map(([id,p,t])=>({ linkId:id, type:'choice', required:true, prefix:p, text:t, answerOption: limitedOpts })),
  { control:'gtable' });

  const q = questionnaire({
    id: ID, name: 'KCCQ12',
    title: 'Kansas City Cardiomyopathy Questionnaire — 12-item (KCCQ-12)',
    code: [{ system: SYS.loinc, code: '76554-7', display: 'Kansas City Cardiomyopathy Questionnaire - 12 [KCCQ-12]' }],
    copyright: '© CV Outcomes, Inc. KCCQ is copyrighted by John A. Spertus, MD MPH; licensed for free use in clinical care.',
    item: [
      display(`${PFX}.preamble`, 'The following questions refer to your heart failure and how it may affect your life. There are no right or wrong answers — mark the answer that best applies.', { category:'instructions' }),
      q1,
      { linkId:`${PFX}.q2`, type:'choice', required:true, prefix:'2.', text:'Over the past 2 weeks, how many times did you have swelling in your feet, ankles or legs when you woke up in the morning?', answerOption: freq5 },
      { linkId:`${PFX}.q3`, type:'choice', required:true, prefix:'3.', text:'Over the past 2 weeks, on average, how many times has fatigue limited your ability to do what you wanted?', answerOption: freq7 },
      { linkId:`${PFX}.q4`, type:'choice', required:true, prefix:'4.', text:'Over the past 2 weeks, on average, how many times has shortness of breath limited your ability to do what you wanted?', answerOption: freq7 },
      { linkId:`${PFX}.q5`, type:'choice', required:true, prefix:'5.', text:'Over the past 2 weeks, on average, how many times have you been forced to sleep sitting up in a chair or with at least 3 pillows to prop you up because of shortness of breath?', answerOption: freq5 },
      { linkId:`${PFX}.q6`, type:'choice', required:true, prefix:'6.', text:'Over the past 2 weeks, how much has your heart failure limited your enjoyment of life?', answerOption: enjoyOpts },
      { linkId:`${PFX}.q7`, type:'choice', required:true, prefix:'7.', text:'If you had to spend the rest of your life with your heart failure the way it is right now, how would you feel about this?', answerOption: satOpts },
      q8,
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── PAID-20 (Problem Areas in Diabetes) ────────────────────────────────────
{
  const ID = 'paid-20'; const PFX = 'paid';
  const opts = ordOpts([[0,'not','Not a problem'],[1,'minor','Minor problem'],[2,'moderate','Moderate problem'],[3,'somewhat-serious','Somewhat serious problem'],[4,'serious','Serious problem']]);
  const items = [
    'Not having clear and concrete goals for your diabetes care?',
    'Feeling discouraged with your diabetes treatment plan?',
    'Feeling scared when you think about living with diabetes?',
    'Uncomfortable social situations related to your diabetes care (e.g. people telling you what to eat)?',
    'Feelings of deprivation regarding food and meals?',
    'Feeling depressed when you think about living with diabetes?',
    'Not knowing if your mood or feelings are related to your diabetes?',
    'Feeling overwhelmed by your diabetes?',
    'Worrying about low blood glucose reactions?',
    'Feeling angry when you think about living with diabetes?',
    'Feeling constantly concerned about food and eating?',
    'Worrying about the future and the possibility of serious complications?',
    'Feelings of guilt or anxiety when you get off track with your diabetes management?',
    "Not 'accepting' your diabetes?",
    'Feeling unsatisfied with your diabetes physician?',
    'Feeling that diabetes is taking up too much of your mental and physical energy every day?',
    'Feeling alone with your diabetes?',
    'Feeling that your friends and family are not supportive of your diabetes management efforts?',
    'Coping with complications of diabetes?',
    "Feeling 'burned out' by the constant effort needed to manage diabetes?",
  ];
  const matrix = group(`${PFX}.matrix`, 'Which of the following diabetes issues are currently a problem for you?',
    items.map((t,i)=>({ linkId:`${PFX}.matrix.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`, text:t, answerOption: opts })),
    { control:'gtable' });
  const q = questionnaire({
    id: ID, name: 'PAID20',
    title: 'Problem Areas in Diabetes (PAID-20)',
    code: [{ system: SYS.loinc, code: '63042-3', display: 'Problem Areas in Diabetes [PAID]' }],
    copyright: '© Joslin Diabetes Center 1999. Reproduced with permission for clinical use and non-commercial research.',
    extension: [variable('paidSum', "%resource.item.descendants().where(linkId.startsWith('paid.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'Indicate how much each issue is currently a problem for you. Please answer every item.', { category:'instructions' }),
      matrix,
      { linkId:`${PFX}.totalScore`, type:'decimal', readOnly:true, text:'PAID-20 total (raw × 1.25; range 0–100)',
        extension:[calcExpr('%paidSum * 1.25', 'Standard PAID scoring: sum × 1.25')] },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── EPDS (Edinburgh Postnatal Depression Scale) ─────────────────────────────
{
  const ID = 'epds'; const PFX = 'epds';
  // Some items reverse-scored. We embed ordinalValue per answerOption matching the source.
  function opts4(answers) {
    return answers.map(([disp, ord]) => ({ extension:[ordinal(ord)], valueCoding:{ code:String(ord), display:disp } }));
  }
  const items = [
    { n:1, text:"I have been able to laugh and see the funny side of things",
      ans: [['As much as I always could',0],['Not quite so much now',1],['Definitely not so much now',2],['Not at all',3]] },
    { n:2, text:"I have looked forward with enjoyment to things",
      ans: [['As much as I ever did',0],['Rather less than I used to',1],['Definitely less than I used to',2],['Hardly at all',3]] },
    { n:3, text:"I have blamed myself unnecessarily when things went wrong",
      ans: [['No, never',0],['Not very often',1],['Yes, some of the time',2],['Yes, most of the time',3]] },
    { n:4, text:"I have been anxious or worried for no good reason",
      ans: [['No, not at all',0],['Hardly ever',1],['Yes, sometimes',2],['Yes, very often',3]] },
    { n:5, text:"I have felt scared or panicky for no very good reason",
      ans: [['No, not at all',0],['No, not much',1],['Yes, sometimes',2],['Yes, quite a lot',3]] },
    { n:6, text:"Things have been getting on top of me",
      ans: [['No, I have been coping as well as ever',0],['No, most of the time I have coped quite well',1],["Yes, sometimes I haven't been coping as well as usual",2],["Yes, most of the time I haven't been able to cope at all",3]] },
    { n:7, text:"I have been so unhappy that I have had difficulty sleeping",
      ans: [['No, not at all',0],['Not very often',1],['Yes, sometimes',2],['Yes, most of the time',3]] },
    { n:8, text:"I have felt sad or miserable",
      ans: [['No, not at all',0],['Not very often',1],['Yes, quite often',2],['Yes, most of the time',3]] },
    { n:9, text:"I have been so unhappy that I have been crying",
      ans: [['No, never',0],['Only occasionally',1],['Yes, quite often',2],['Yes, most of the time',3]] },
    { n:10,text:"The thought of harming myself has occurred to me",
      ans: [['Never',0],['Hardly ever',1],['Sometimes',2],['Yes, quite often',3]] },
  ];
  const q = questionnaire({
    id: ID, name:'EPDS',
    title:'Edinburgh Postnatal Depression Scale (EPDS)',
    code: [{ system: SYS.loinc, code:'99046-5', display: 'Edinburgh Postnatal Depression Scale [EPDS]' }],
    copyright: 'Cox JL, Holden JM, Sagovsky R. Br J Psychiatry 1987;150:782-6. Free for reproduction without permission, with citation.',
    extension: [variable('epdsSum', "%resource.item.where(linkId.startsWith('epds.q')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'As you are pregnant or have recently had a baby, please indicate the answer that comes closest to how you have felt IN THE PAST 7 DAYS, not just how you feel today.', { category:'instructions' }),
      ...items.map(it => ({ linkId:`${PFX}.q${it.n}`, type:'choice', required:true, prefix:`${it.n}.`, text:`In the past 7 days, ${it.text}`, answerOption: opts4(it.ans) })),
      totalScore(`${PFX}.totalScore`, 'EPDS total (0–30). Score ≥10 warrants further evaluation; Q10 ≥1 raises suicide concern.', 'epdsSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── HAQ-DI (Health Assessment Questionnaire — Disability Index, 20-item) ───
{
  const ID = 'haq-di'; const PFX = 'haqdi';
  const opts = ordOpts([[0,'no-difficulty','Without any difficulty'],[1,'some','With some difficulty'],[2,'much','With much difficulty'],[3,'unable','Unable to do']]);
  const cats = [
    ['dressing', 'Dressing and Grooming', [
      'Dress yourself, including tying shoelaces and doing buttons?',
      'Shampoo your hair?',
    ]],
    ['rising', 'Rising', [
      'Stand up from a straight chair?',
      'Get in and out of bed?',
    ]],
    ['eating', 'Eating', [
      'Cut your meat?',
      'Lift a full cup or glass to your mouth?',
      'Open a new milk carton?',
    ]],
    ['walking', 'Walking', [
      'Walk outdoors on flat ground?',
      'Climb up five steps?',
    ]],
    ['hygiene', 'Hygiene', [
      'Wash and dry your entire body?',
      'Take a tub bath?',
      'Get on and off the toilet?',
    ]],
    ['reach', 'Reach', [
      'Reach and get down a 5-pound object (e.g., a bag of sugar) from just above your head?',
      'Bend down to pick up clothing from the floor?',
    ]],
    ['grip', 'Grip', [
      'Open car doors?',
      'Open jars which have been previously opened?',
      'Turn faucets on and off?',
    ]],
    ['activities', 'Activities', [
      'Run errands and shop?',
      'Get in and out of a car?',
      'Do chores such as vacuuming or yard work?',
    ]],
  ];
  const groups = cats.map(([slug, title, items]) => group(`${PFX}.${slug}`, title,
    items.map((t,i)=>({ linkId:`${PFX}.${slug}.q${i+1}`, type:'choice', required:true, text:`Are you able to: ${t}`, answerOption: opts })),
    { control:'gtable' }));

  const aids = group(`${PFX}.aids`, 'Aids or devices used (check all that apply)',
    [
      ['cane','Cane'],['walker','Walker'],['crutches','Crutches'],
      ['wheelchair','Wheelchair'],['raised-toilet','Raised toilet seat'],
      ['bathtub-bar','Bathtub bar'],['bathtub-seat','Bathtub seat'],
      ['jar-opener','Jar opener (for previously opened jars)'],
      ['long-shoehorn','Long-handled shoehorn'],
      ['button-hook','Button hook'],['reacher','Reacher'],
      ['special-utensil','Special or built-up utensils'],
      ['special-chair','Special or built-up chair'],['other','Other'],
    ].map(([code,disp])=>({
      linkId:`${PFX}.aids.${code}`, type:'boolean', text: disp,
    })));

  const help = group(`${PFX}.help`, 'Help from another person (check all that apply)',
    [
      ['dressing','Dressing and Grooming'],['rising','Rising'],['eating','Eating'],
      ['walking','Walking'],['hygiene','Hygiene'],['reach','Reach'],
      ['grip','Gripping and opening things'],['activities','Errands and chores'],
    ].map(([code,disp])=>({ linkId:`${PFX}.help.${code}`, type:'boolean', text:`Help with: ${disp}` })));

  const pain = { linkId:`${PFX}.painVAS`, type:'integer', required:true,
    text:'In the past week, how much pain have you had because of your illness? (0 = no pain, 100 = severe pain)',
    extension:[
      { url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'slider' }] } },
      { url: EXT.minValue, valueInteger:0 },{ url: EXT.maxValue, valueInteger:100 },
      { url: EXT.sliderStepValue, valueInteger:1 },
    ] };

  const q = questionnaire({
    id: ID, name:'HAQDI',
    title:'Stanford Health Assessment Questionnaire — Disability Index (HAQ-DI)',
    code: [{ system: SYS.loinc, code:'77544-1', display:'Stanford Health Assessment Questionnaire Disability Index' }],
    copyright: '© Stanford University HAQ. In the public domain (Fries, Spitz et al. 1980; Bruce & Fries 2003); free to use with citation.',
    item: [
      display(`${PFX}.preamble`, 'Please check the ONE response which best describes your usual abilities OVER THE PAST WEEK.', { category:'instructions' }),
      ...groups, aids, help, pain,
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── FLACC pediatric pain observational scale ─────────────────────────────
{
  const ID = 'flacc'; const PFX = 'flacc';
  function cat(linkId, prefix, cat, scale) {
    return { linkId, type:'choice', required:true, prefix, text:`${cat}`,
      answerOption: scale.map(([t,o])=>({ extension:[ordinal(o)], valueCoding:{ code:String(o), display:t } })) };
  }
  const items = [
    cat(`${PFX}.face`, 'F.', 'Face', [
      ['No particular expression or smile',0],
      ['Occasional grimace or frown, withdrawn, disinterested',1],
      ['Frequent to constant quivering chin, clenched jaw',2],
    ]),
    cat(`${PFX}.legs`, 'L.', 'Legs', [
      ['Normal position or relaxed',0],
      ['Uneasy, restless, tense',1],
      ['Kicking, or legs drawn up',2],
    ]),
    cat(`${PFX}.activity`, 'A.', 'Activity', [
      ['Lying quietly, normal position, moves easily',0],
      ['Squirming, shifting back and forth, tense',1],
      ['Arched, rigid, or jerking',2],
    ]),
    cat(`${PFX}.cry`, 'C.', 'Cry', [
      ['No cry (awake or asleep)',0],
      ['Moans or whimpers, occasional complaint',1],
      ['Crying steadily, screams or sobs, frequent complaints',2],
    ]),
    cat(`${PFX}.consolability`, 'C.', 'Consolability', [
      ['Content, relaxed',0],
      ['Reassured by occasional touching, hugging or being talked to, distractible',1],
      ['Difficult to console or comfort',2],
    ]),
  ];
  const q = questionnaire({
    id: ID, name:'FLACC',
    title:'FLACC Pain Assessment Tool (Face, Legs, Activity, Cry, Consolability)',
    code: [{ system: SYS.loinc, code:'38213-5', display:'FLACC pain scale [Score]' }],
    copyright: 'Merkel S, et al. The FLACC: a behavioral scale for scoring postoperative pain in young children. Pediatr Nurs 1997;23:293-7. Free to use for clinical purposes.',
    subjectType: ['Patient'],
    extension: [variable('flaccSum', "%resource.item.where(linkId.startsWith('flacc.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'Observational pain scale for children unable to self-report. Each of 5 categories is scored 0–2; total 0–10. Re-evaluate after analgesia.', { category:'instructions' }),
      ...items,
      totalScore(`${PFX}.totalScore`, 'FLACC total (0–10): 0 relaxed/comfortable; 1–3 mild discomfort; 4–6 moderate pain; 7–10 severe pain.', 'flaccSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── AAFP EveryONE Social Needs Screening Tool (long, patient) ──────────────
{
  const ID = 'aafp-social-needs'; const PFX = 'sn';
  const checkAll = (id, text, opts, exclusiveLast=false) => ({
    linkId:id, type:'open-choice', repeats:true, text,
    extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
    answerOption: opts.map((o,i)=>{
      const ext = (exclusiveLast && i === opts.length-1) ? [{ url: EXT.optionExclusive, valueBoolean: true }] : [];
      return { ...(ext.length?{ extension:ext }:{}), valueCoding:{ code: o.replace(/[^a-z0-9]+/gi,'-').toLowerCase(), display: o } };
    })
  });
  const single = (id, text, opts) => ({ linkId:id, type:'choice', text, answerOption: opts.map(o=>({ valueCoding:{ code: o.replace(/[^a-z0-9]+/gi,'-').toLowerCase(), display: o } })) });
  const ordPS = ordOpts([[1,'never','Never'],[2,'rarely','Rarely'],[3,'sometimes','Sometimes'],[4,'fairly-often','Fairly often'],[5,'frequently','Frequently']]);

  const q = questionnaire({
    id: ID, name:'AAFPSocialNeeds',
    title:'AAFP EveryONE Project — Social Needs Screening Tool (patient long version)',
    copyright: '© 2018 American Academy of Family Physicians. The EveryONE Project — free to use unmodified for clinical care and education.',
    item: [
      display(`${PFX}.preamble`, 'These questions help us understand needs that may affect your health and well-being.', { category:'instructions' }),
      group(`${PFX}.housing`, 'Housing', [
        single(`${PFX}.housing.q1`, '1. What is your housing situation today?', [
          'I do not have housing (staying with others, hotel, shelter, outside, car, abandoned building, bus/train station, park)',
          'I have housing today but am worried about losing it in the future',
          'I have housing',
        ]),
        checkAll(`${PFX}.housing.q2`, '2. Think about the place you live. Do you have problems with any of the following? (check all that apply)', [
          'Bug infestation','Mold','Lead paint or pipes','Inadequate heat','Oven or stove not working',
          'No or not working smoke detectors','Water leaks','None of the above',
        ], true),
      ]),
      group(`${PFX}.food`, 'Food', [
        single(`${PFX}.food.q3`, '3. Within the past 12 months, you worried that your food would run out before you got money to buy more.', ['Often true','Sometimes true','Never true']),
        single(`${PFX}.food.q4`, '4. Within the past 12 months, the food you bought just didn\'t last and you didn\'t have money to get more.', ['Often true','Sometimes true','Never true']),
      ]),
      group(`${PFX}.transport`, 'Transportation', [
        checkAll(`${PFX}.transport.q5`, '5. In the past 12 months, has lack of transportation kept you from medical appointments, meetings, work, or from getting things needed for daily living? (check all that apply)', [
          'Yes, it has kept me from medical appointments or getting medications',
          'Yes, it has kept me from non-medical meetings, appointments, work, or getting things I need',
          'No',
        ], true),
      ]),
      group(`${PFX}.utilities`, 'Utilities', [
        single(`${PFX}.utilities.q6`, '6. In the past 12 months has the electric, gas, oil, or water company threatened to shut off services in your home?', ['Yes','No','Already shut off']),
      ]),
      group(`${PFX}.childcare`, 'Child care', [
        single(`${PFX}.childcare.q7`, '7. Do problems getting child care make it difficult for you to work or study?', ['Yes','No']),
      ]),
      group(`${PFX}.employment`, 'Employment', [
        single(`${PFX}.employment.q8`, '8. Do you have a job?', ['Yes','No']),
      ]),
      group(`${PFX}.education`, 'Education', [
        single(`${PFX}.education.q9`, '9. Do you have a high school degree?', ['Yes','No']),
      ]),
      group(`${PFX}.finances`, 'Finances', [
        single(`${PFX}.finances.q10`, '10. How often does this describe you: I don\'t have enough money to pay my bills.', ['Never','Rarely','Sometimes','Often','Always']),
      ]),
      group(`${PFX}.safety`, 'Personal safety', [
        { linkId:`${PFX}.safety.q11`, type:'choice', required:true, prefix:'11.', text:'How often does anyone, including family, physically hurt you?', answerOption: ordPS },
        { linkId:`${PFX}.safety.q12`, type:'choice', required:true, prefix:'12.', text:'How often does anyone, including family, insult or talk down to you?', answerOption: ordPS },
        { linkId:`${PFX}.safety.q13`, type:'choice', required:true, prefix:'13.', text:'How often does anyone, including family, threaten you with harm?', answerOption: ordPS },
        { linkId:`${PFX}.safety.q14`, type:'choice', required:true, prefix:'14.', text:'How often does anyone, including family, scream or curse at you?', answerOption: ordPS },
      ]),
      group(`${PFX}.assist`, 'Assistance', [
        single(`${PFX}.assist.q15`, '15. Would you like help with any of these needs?', ['Yes','No']),
      ]),
      {
        linkId:`${PFX}.safetyScore`, type:'integer', readOnly:true,
        text: 'Personal safety score (sum of Q11–Q14). A value greater than 10 indicates a positive screen for personal safety.',
        extension:[calcExpr("%resource.item.descendants().where(linkId in ('sn.safety.q11'|'sn.safety.q12'|'sn.safety.q13'|'sn.safety.q14')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()", 'Sum Q11–Q14')]
      },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
