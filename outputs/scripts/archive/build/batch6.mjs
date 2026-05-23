// Batch6: Vanderbilt Teacher Initial, Vanderbilt Parent Follow-up, Vanderbilt Teacher Follow-up,
// CMRS-P, MoCA (outline), C-SSRS Lifeline Risk Assessment, McGill SF-MPQ, Reminiscence Functions Scale (RFS).
import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, SYS, EXT } from '../lib.mjs';

const ordOpts = (triples) => triples.map(([o, code, display]) => ({ extension: [ordinal(o)], valueCoding: { code, display } }));
const yesNo = (yes=1, no=0) => [
  { extension:[ordinal(no)],  valueCoding:{ system: SYS.yn, code:'N', display:'No' } },
  { extension:[ordinal(yes)], valueCoding:{ system: SYS.yn, code:'Y', display:'Yes' } },
];

const freq4 = ordOpts([[0,'never','Never'],[1,'occasionally','Occasionally'],[2,'often','Often'],[3,'very-often','Very Often']]);
const perfOpts = ordOpts([[1,'excellent','Excellent'],[2,'above-average','Above Average'],[3,'average','Average'],[4,'somewhat-problem','Somewhat of a Problem'],[5,'problematic','Problematic']]);

// ─── NICHQ Vanderbilt — Teacher Initial ─────────────────────────────────────
{
  const ID = 'nichq-vanderbilt-teacher-initial'; const PFX = 'vandt';
  const symptoms = [
    ['inattn',  1,'Fails to give attention to details or makes careless mistakes in schoolwork'],
    ['inattn',  2,'Has difficulty sustaining attention to tasks or activities'],
    ['inattn',  3,'Does not seem to listen when spoken to directly'],
    ['inattn',  4,'Does not follow through on instructions and fails to finish schoolwork (not due to oppositional behavior or failure to understand)'],
    ['inattn',  5,'Has difficulty organizing tasks and activities'],
    ['inattn',  6,'Avoids, dislikes, or is reluctant to engage in tasks that require sustained mental effort'],
    ['inattn',  7,'Loses things necessary for tasks or activities (school assignments, pencils, or books)'],
    ['inattn',  8,'Is easily distracted by extraneous stimuli'],
    ['inattn',  9,'Is forgetful in daily activities'],
    ['hyper', 10,'Fidgets with hands or feet or squirms in seat'],
    ['hyper', 11,'Leaves seat in classroom or in other situations in which remaining seated is expected'],
    ['hyper', 12,'Runs about or climbs excessively in situations in which remaining seated is expected'],
    ['hyper', 13,'Has difficulty playing or engaging in leisure activities quietly'],
    ['hyper', 14,'Is "on the go" or often acts as if "driven by a motor"'],
    ['hyper', 15,'Talks excessively'],
    ['hyper', 16,'Blurts out answers before questions have been completed'],
    ['hyper', 17,'Has difficulty waiting in line'],
    ['hyper', 18,'Interrupts or intrudes on others (e.g., butts into conversations/games)'],
    ['odd',   19,'Loses temper'],
    ['odd',   20,'Actively defies or refuses to comply with adult\'s requests or rules'],
    ['odd',   21,'Is angry or resentful'],
    ['odd',   22,'Is spiteful and vindictive'],
    ['cd',    23,'Bullies, threatens, or intimidates others'],
    ['cd',    24,'Initiates physical fights'],
    ['cd',    25,'Lies to obtain goods for favors or to avoid obligations (e.g., "cons" others)'],
    ['cd',    26,'Is physically cruel to people'],
    ['cd',    27,'Has stolen items of nontrivial value'],
    ['cd',    28,'Deliberately destroys others\' property'],
    ['anxdep',29,'Is fearful, anxious, or worried'],
    ['anxdep',30,'Is self-conscious or easily embarrassed'],
    ['anxdep',31,'Is afraid to try new things for fear of making mistakes'],
    ['anxdep',32,'Feels worthless or inferior'],
    ['anxdep',33,'Blames self for problems, feels guilty'],
    ['anxdep',34,'Feels lonely, unwanted, or unloved; complains that "no one loves him/her"'],
    ['anxdep',35,'Is sad, unhappy, or depressed'],
  ];

  const matrix = group(`${PFX}.symptoms`, 'Symptoms (past 6 months)',
    symptoms.map(([sub, n, text]) => ({
      linkId:`${PFX}.symptoms.q${n}`, type:'choice', required:true, prefix:`${n}.`, text,
      extension:[{ url: EXT.shortText, valueString:`${sub.toUpperCase()}-${n}` }],
      answerOption: freq4,
    })), { control:'gtable' });

  const performance = group(`${PFX}.performance`, 'Academic & Classroom Performance',
    [
      [36,'Reading'],[37,'Mathematics'],[38,'Written expression'],
      [39,'Relationship with peers'],[40,'Following directions'],[41,'Disrupting class'],
      [42,'Assignment completion'],[43,'Organizational skills'],
    ].map(([n,t])=>({ linkId:`${PFX}.performance.q${n}`, type:'choice', required:true, prefix:`${n}.`, text:t, answerOption: perfOpts })),
    { control:'gtable' });

  const q = questionnaire({
    id: ID, name:'NICHQVanderbiltTeacherInitial',
    title:'NICHQ Vanderbilt Assessment Scale — Teacher Informant (Initial)',
    code: [{ system: SYS.loinc, code:'77905-4', display: 'NICHQ Vanderbilt Assessment Scale — Teacher informant [NICHQ]' }],
    copyright: '© 2002 American Academy of Pediatrics and National Initiative for Children\'s Healthcare Quality. Adapted from the Vanderbilt Rating Scales developed by Mark L. Wolraich, MD.',
    extension: [
      variable('inattnYes2', "%resource.item.descendants().where(linkId in ('vandt.symptoms.q1'|'vandt.symptoms.q2'|'vandt.symptoms.q3'|'vandt.symptoms.q4'|'vandt.symptoms.q5'|'vandt.symptoms.q6'|'vandt.symptoms.q7'|'vandt.symptoms.q8'|'vandt.symptoms.q9')).answer.valueCoding.where(code in ('often'|'very-often')).count()"),
      variable('hyperYes2',  "%resource.item.descendants().where(linkId in ('vandt.symptoms.q10'|'vandt.symptoms.q11'|'vandt.symptoms.q12'|'vandt.symptoms.q13'|'vandt.symptoms.q14'|'vandt.symptoms.q15'|'vandt.symptoms.q16'|'vandt.symptoms.q17'|'vandt.symptoms.q18')).answer.valueCoding.where(code in ('often'|'very-often')).count()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Rate each item based on the child\'s behavior over the past 6 months.', { category:'instructions' }),
      group(`${PFX}.header`, 'Teacher & student', [
        { linkId:`${PFX}.header.teacher`, type:'string', text:'Teacher\'s name' },
        { linkId:`${PFX}.header.classTime`, type:'string', text:'Class time' },
        { linkId:`${PFX}.header.className`, type:'string', text:'Class name / period' },
        { linkId:`${PFX}.header.student`,   type:'string', text:'Student\'s name', required:true },
        { linkId:`${PFX}.header.date`,      type:'date',   text:'Today\'s date' },
        { linkId:`${PFX}.header.dob`,       type:'date',   text:'Date of birth' },
      ]),
      matrix, performance,
      totalScore(`${PFX}.scores.inattnYes2`, 'Inattention — count rated Often / Very Often (DSM threshold: ≥6)', 'inattnYes2', null),
      totalScore(`${PFX}.scores.hyperYes2`,  'Hyperactivity/Impulsivity — count rated Often / Very Often (≥6)',   'hyperYes2',  null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── NICHQ Vanderbilt Follow-up — Parent ─────────────────────────────────────
{
  const ID = 'nichq-vanderbilt-parent-followup'; const PFX = 'vandpf';
  const items = Array.from({length:18}, (_,i)=>({
    linkId:`${PFX}.symptoms.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`,
    text:`(Same item as initial Parent Scale Q${i+1})`,
    answerOption: freq4,
  }));
  const performance = group(`${PFX}.performance`, 'Performance',
    [
      'Overall school performance','Reading','Writing','Mathematics',
      'Relationship with parents','Relationship with siblings','Relationship with peers',
      'Participation in organized activities (e.g., teams)',
    ].map((t,i)=>({ linkId:`${PFX}.performance.q${i+19}`, type:'choice', required:true, prefix:`${i+19}.`, text:t, answerOption: perfOpts })),
    { control:'gtable' });
  const sideEffects = group(`${PFX}.side-effects`, 'Has your child experienced any of the following side effects or problems in the past week?',
    ['Headache','Stomachache','Change of appetite','Trouble sleeping','Irritability in the late morning, late afternoon, or evening','Socially withdrawn — decreased interaction with others','Extreme sadness or unusual crying','Dull, tired, listless behavior','Tremors / feeling shaky','Repetitive movements, tics, jerking, twitching, eye blinking','Picking at skin or fingers, nail biting, lip or cheek chewing','Sees or hears things that aren\'t there'].map((t,i)=>({
      linkId:`${PFX}.side-effects.s${i+1}`, type:'choice', text:t,
      answerOption: ordOpts([[0,'none','None'],[1,'mild','Mild'],[2,'moderate','Moderate'],[3,'severe','Severe']]),
    })), { control:'gtable' });

  const q = questionnaire({
    id: ID, name:'NICHQVanderbiltParentFollowup',
    title:'NICHQ Vanderbilt Assessment — Parent Informant (Follow-up)',
    copyright: '© 2002 American Academy of Pediatrics and NICHQ. Adapted from the Vanderbilt Rating Scales.',
    item: [
      display(`${PFX}.preamble`, 'Think about your child\'s behaviors since the last assessment.', { category:'instructions' }),
      group(`${PFX}.medContext`, 'Medication status', [
        { linkId:`${PFX}.medContext.status`, type:'choice', required:true, text:'Is this evaluation based on a time when the child was on or off medication?',
          answerOption: [
            { valueCoding:{ code:'on-meds', display:'Was on medication' } },
            { valueCoding:{ code:'off-meds', display:'Was not on medication' } },
            { valueCoding:{ code:'unsure', display:'Not sure' } },
          ] },
      ]),
      group(`${PFX}.symptoms`, 'Core ADHD symptoms (past period since last assessment)', items, { control:'gtable' }),
      performance, sideEffects,
      { linkId:`${PFX}.comments`, type:'text', text:'Explain / Comments' },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── NICHQ Vanderbilt Follow-up — Teacher ───────────────────────────────────
{
  const ID = 'nichq-vanderbilt-teacher-followup'; const PFX = 'vandtf';
  const items = Array.from({length:18}, (_,i)=>({
    linkId:`${PFX}.symptoms.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`,
    text:`(Same item as initial Teacher Scale Q${i+1})`,
    answerOption: freq4,
  }));
  const performance = group(`${PFX}.performance`, 'Performance',
    ['Reading','Mathematics','Written expression','Relationship with peers','Following directions','Disrupting class','Assignment completion','Organizational skills']
      .map((t,i)=>({ linkId:`${PFX}.performance.q${i+19}`, type:'choice', required:true, prefix:`${i+19}.`, text:t, answerOption: perfOpts })),
    { control:'gtable' });
  const sideEffects = group(`${PFX}.side-effects`, 'Has the student experienced any of the following side effects/problems in the past week?',
    ['Headache','Stomachache','Change of appetite','Trouble sleeping','Irritability later in the day','Socially withdrawn','Extreme sadness or crying','Dull, tired, listless behavior','Tremors','Tics or repetitive movements','Picking at skin/fingers'].map((t,i)=>({
      linkId:`${PFX}.side-effects.s${i+1}`, type:'choice', text:t,
      answerOption: ordOpts([[0,'none','None'],[1,'mild','Mild'],[2,'moderate','Moderate'],[3,'severe','Severe']]),
    })), { control:'gtable' });

  const q = questionnaire({
    id: ID, name:'NICHQVanderbiltTeacherFollowup',
    title:'NICHQ Vanderbilt Assessment — Teacher Informant (Follow-up)',
    copyright: '© 2002 American Academy of Pediatrics and NICHQ. Adapted from the Vanderbilt Rating Scales.',
    item: [
      display(`${PFX}.preamble`, 'Think about the student\'s behaviors since the last assessment.', { category:'instructions' }),
      group(`${PFX}.medContext`, 'Medication status', [
        { linkId:`${PFX}.medContext.status`, type:'choice', required:true, text:'Is this evaluation based on a time when the child was on or off medication?',
          answerOption: [
            { valueCoding:{ code:'on-meds', display:'Was on medication' } },
            { valueCoding:{ code:'off-meds', display:'Was not on medication' } },
            { valueCoding:{ code:'unsure', display:'Not sure' } },
          ] },
      ]),
      group(`${PFX}.symptoms`, 'Core ADHD symptoms (past period since last assessment)', items, { control:'gtable' }),
      performance, sideEffects,
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── CMRS-P (Child Mania Rating Scale — Parent) ─────────────────────────────
{
  const ID = 'cmrs-p'; const PFX = 'cmrsp';
  const opts = ordOpts([
    [0,'never','Never / Rarely'],
    [1,'sometimes','Sometimes'],
    [2,'often','Often'],
    [3,'very-often','Very Often'],
  ]);
  const items = [
    'Have periods of feeling super happy for hours or days at a time, extremely wound up and excited, such as feeling "on top of the world"',
    'Feel irritable, cranky, or mad for hours or days at a time',
    'Think that he or she can be anything or do anything (e.g., leader, best basketball player, rap singer, millionaire, princess) beyond what is usual for that age',
    'Believe that he or she has unrealistic abilities or powers that are unusual, and may try to act upon them, which causes trouble',
    'Need less sleep than usual; yet does not feel tired the next day',
    'Have periods of too much energy',
    'Have periods when she or he talks too much or too loud or talks a mile-a-minute',
    'Have periods of racing thoughts that his or her mind cannot slow down, and it seems that the mouth cannot keep up with the mind',
    'Talk so fast that he or she jumps from topic to topic',
    'Rush around doing things nonstop',
    'Have trouble staying on track and is easily drawn to what is happening around him or her',
    'Do many more things than usual, or is unusually productive or highly creative',
    'Behave in a sexually inappropriate way (e.g., talks dirty, exposing, playing with private parts, masturbating, making sex phone calls, humping on dogs, playing sex games, touches others sexually)',
    'Go and talk to strangers inappropriately, is more socially outgoing than usual',
    'Do things that are unusual for him or her that are foolish or risky (e.g., jumping off heights, ordering CDs with your credit cards, giving things away)',
    'Have rage attacks, intense and prolonged temper tantrums',
    'Crack jokes or pun more than usual, laugh loud, or act silly in a way that is out of the ordinary',
    'Experience rapid mood swings',
    'Have explosive temper outbursts (e.g., breaking objects, fighting)',
    'Have unrealistic beliefs in his or her own abilities/powers',
    'Hear voices in his/her head that nobody else can hear',
    'See things that nobody else can see',
  ];
  const matrix = group(`${PFX}.matrix`, 'In the past month, does your child…',
    items.map((t,i)=>({ linkId:`${PFX}.matrix.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`, text:t, answerOption: opts })),
    { control:'gtable' });
  const q = questionnaire({
    id: ID, name:'CMRSP',
    title:'Child Mania Rating Scale — Parent Version (CMRS-P)',
    copyright: 'Made available with permission from Mani Pavuluri, MD. This form has not been modified.',
    extension: [variable('cmrspSum', "%resource.item.descendants().where(linkId.startsWith('cmrsp.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'The following questions concern your child\'s mood and behavior in the past month. Consider it a problem if it is causing trouble and is beyond what is normal for your child\'s age. Otherwise, check "Never/Rarely" if the behavior is not causing trouble.', { category:'instructions' }),
      matrix,
      totalScore(`${PFX}.totalScore`, 'CMRS-P total (0–66). Cut-off ≥20 suggests pediatric bipolar disorder requires evaluation.', 'cmrspSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── MoCA (Montreal Cognitive Assessment, Version 8.3) — structure outline ──
{
  const ID = 'moca'; const PFX = 'moca';
  const intItem = (id, prefix, text, max) => ({
    linkId:id, type:'integer', required:true, prefix, text,
    extension:[
      { url: EXT.minValue, valueInteger:0 },{ url: EXT.maxValue, valueInteger:max },
      { url: EXT.shortText, valueString: `/${max}` },
    ]
  });
  const q = questionnaire({
    id: ID, name:'MoCA',
    title:'Montreal Cognitive Assessment (MoCA®) — administered/scored by clinician (structure outline)',
    code: [{ system: SYS.loinc, code:'72172-0', display:'Montreal Cognitive Assessment [MoCA]' }],
    copyright: '© Z. Nasreddine MD. www.mocatest.org. Training and certification are required to ensure accuracy of administration and scoring.',
    extension: [variable('mocaTotal', "(%resource.item.where(linkId='moca.visuoSpatial').answer.valueInteger | %resource.item.where(linkId='moca.naming').answer.valueInteger | %resource.item.where(linkId='moca.attention').answer.valueInteger | %resource.item.where(linkId='moca.language').answer.valueInteger | %resource.item.where(linkId='moca.abstraction').answer.valueInteger | %resource.item.where(linkId='moca.delayedRecall').answer.valueInteger | %resource.item.where(linkId='moca.orientation').answer.valueInteger).sum() + iif(%resource.item.where(linkId='moca.education').answer.valueBoolean, 1, 0)")],
    item: [
      display(`${PFX}.preamble`, 'MoCA is a clinician-administered cognitive screen. Score each subtest as documented below. Add 1 point for ≤12 years of education. Normal ≥26/30.', { category:'instructions' }),
      group(`${PFX}.header`, 'Administration', [
        { linkId:`${PFX}.header.name`,    type:'string', text:'Patient name' },
        { linkId:`${PFX}.header.dob`,     type:'date',   text:'Date of birth' },
        { linkId:`${PFX}.header.sex`,     type:'choice', text:'Sex',
          answerOption: [
            { valueCoding:{ system: SYS.adminGender, code:'male',   display:'Male' } },
            { valueCoding:{ system: SYS.adminGender, code:'female', display:'Female' } },
          ] },
        { linkId:`${PFX}.header.education`, type:'integer', text:'Years of education' },
        { linkId:`${PFX}.header.date`,    type:'date',   text:'Test date' },
        { linkId:`${PFX}.header.administered-by`, type:'string', text:'Administered by' },
      ]),
      intItem(`${PFX}.visuoSpatial`, '1.', 'Visuospatial / Executive subtotal (trail-making, copy cube, clock-draw)', 5),
      intItem(`${PFX}.naming`,       '2.', 'Naming (lion, rhinoceros, camel)', 3),
      intItem(`${PFX}.attention`,    '3.', 'Attention (digit span forward+backward, vigilance, serial 7s) subtotal', 6),
      intItem(`${PFX}.language`,     '4.', 'Language (repetition, fluency)', 3),
      intItem(`${PFX}.abstraction`,  '5.', 'Abstraction (similarities)', 2),
      intItem(`${PFX}.delayedRecall`,'6.', 'Delayed recall (5 words, no cue)', 5),
      intItem(`${PFX}.orientation`,  '7.', 'Orientation (date, month, year, day, place, city)', 6),
      { linkId:`${PFX}.education`,   type:'boolean', text:'Add 1 point for education ≤12 years?' },
      { linkId:`${PFX}.totalScore`,  type:'integer', readOnly:true, text:'MoCA total (0–30; Normal ≥26)',
        extension:[calcExpr('%mocaTotal','Sum of subtests + education adjustment')] },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── C-SSRS Lifeline Risk Assessment ────────────────────────────────────────
{
  const ID = 'c-ssrs-risk-assessment'; const PFX = 'cssrs';
  const lifetime = (id, text) => ({ linkId:id, type:'boolean', text });
  const checkMany = (id, text, opts) => ({
    linkId:id, type:'open-choice', repeats:true, text,
    extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
    answerOption: opts.map(o => ({ valueCoding:{ code: o.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: o } })),
  });

  const sectionIdeation = group(`${PFX}.ideation`, 'Suicide Ideation — Most Severe in Past Week (mark all that apply)', [
    checkMany(`${PFX}.ideation.types`, 'Suicide ideation types', [
      'Wish to be dead','Suicidal thoughts',
      'Suicidal thoughts with method (but without specific plan or intent to act)',
      'Suicidal intent (without specific plan)','Suicidal intent with specific plan',
    ]),
  ]);

  const yesNoLife = (id, text) => ({
    linkId:id, type:'choice', required:false, text,
    extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'radio-button' }] } }],
    answerOption:[
      { valueCoding:{ code:'past-week-yes', display:'Past month — yes' } },
      { valueCoding:{ code:'past-week-no',  display:'Past month — no' } },
      { valueCoding:{ code:'lifetime-yes',  display:'Lifetime — yes' } },
      { valueCoding:{ code:'lifetime-no',   display:'Lifetime — no' } },
    ],
  });

  const q = questionnaire({
    id: ID, name:'CSSRSRiskAssessment',
    title:'Columbia-Suicide Severity Rating Scale (C-SSRS) — Risk Assessment, Lifeline Version',
    code: [{ system: SYS.loinc, code:'77564-9', display:'Columbia Suicide Severity Rating Scale [C-SSRS]' }],
    copyright: '© 2008 The Research Foundation for Mental Hygiene, Inc. Posner et al. Lifeline Version 1/2014. Use without modification, per training: http://c-ssrs.trainingcampus.net/',
    item: [
      display(`${PFX}.preamble`, 'Check all risk and protective factors that apply. Complete following the patient interview, review of medical record(s), and/or consultation with family members or other professionals.', { category:'instructions' }),
      group(`${PFX}.behavior`, 'Suicidal and Self-Injury Behavior', [
        lifetime(`${PFX}.behavior.actual-attempt`,         'Actual suicide attempt (past week or lifetime)'),
        lifetime(`${PFX}.behavior.interrupted-attempt`,    'Interrupted attempt'),
        lifetime(`${PFX}.behavior.aborted-attempt`,        'Aborted attempt'),
        lifetime(`${PFX}.behavior.preparatory-acts`,       'Other preparatory acts to kill self'),
        lifetime(`${PFX}.behavior.self-injury-no-intent`,  'Self-injury behavior without suicide intent'),
      ]),
      sectionIdeation,
      group(`${PFX}.activating`, 'Activating Events (recent)', [
        lifetime(`${PFX}.activating.loss`,      'Recent loss or other significant negative event'),
        { linkId:`${PFX}.activating.loss-describe`, type:'text', text:'Describe' },
        lifetime(`${PFX}.activating.incarceration`, 'Pending incarceration or homelessness'),
        lifetime(`${PFX}.activating.isolation`, 'Current or pending isolation or feeling alone'),
      ]),
      group(`${PFX}.treatment`, 'Treatment History', [
        lifetime(`${PFX}.treatment.prior-diagnoses`, 'Previous psychiatric diagnoses and treatments'),
        lifetime(`${PFX}.treatment.hopeless-tx`, 'Hopeless or dissatisfied with treatment'),
        lifetime(`${PFX}.treatment.noncompliant`, 'Noncompliant with treatment'),
        lifetime(`${PFX}.treatment.not-receiving`, 'Not receiving treatment'),
      ]),
      group(`${PFX}.status`, 'Clinical Status (recent)', [
        lifetime(`${PFX}.status.hopelessness`,           'Hopelessness'),
        lifetime(`${PFX}.status.helplessness`,           'Helplessness*'),
        lifetime(`${PFX}.status.feeling-trapped`,        'Feeling trapped*'),
        lifetime(`${PFX}.status.mde`,                    'Major depressive episode'),
        lifetime(`${PFX}.status.mixed`,                  'Mixed affective episode'),
        lifetime(`${PFX}.status.command-halls`,          'Command hallucinations to hurt self'),
        lifetime(`${PFX}.status.highly-impulsive`,       'Highly impulsive behavior'),
        lifetime(`${PFX}.status.substance`,              'Substance abuse or dependence'),
        lifetime(`${PFX}.status.agitation`,              'Agitation or severe anxiety'),
        lifetime(`${PFX}.status.perceived-burden`,       'Perceived burden on family or others'),
        lifetime(`${PFX}.status.chronic-pain`,           'Chronic physical pain or other acute medical problem (AIDS, COPD, cancer, etc.)'),
        lifetime(`${PFX}.status.homicidal-ideation`,     'Homicidal ideation'),
        lifetime(`${PFX}.status.aggressive`,             'Aggressive behavior towards others'),
        lifetime(`${PFX}.status.method-available`,       'Method for suicide available (gun, pills, etc.)'),
        lifetime(`${PFX}.status.refuses-safety-plan`,    'Refuses or feels unable to agree to safety plan'),
        lifetime(`${PFX}.status.sexual-abuse`,           'Sexual abuse (lifetime)'),
        lifetime(`${PFX}.status.family-hx-suicide`,      'Family history of suicide (lifetime)'),
      ]),
      group(`${PFX}.protective`, 'Protective Factors (recent)', [
        lifetime(`${PFX}.protective.reasons-living`,    'Identifies reasons for living'),
        lifetime(`${PFX}.protective.family-resp`,       'Responsibility to family or others; living with family'),
        lifetime(`${PFX}.protective.support-network`,   'Supportive social network or family'),
        lifetime(`${PFX}.protective.fear-death`,        'Fear of death or dying due to pain and suffering'),
        lifetime(`${PFX}.protective.spirituality`,      'Belief that suicide is immoral, high spirituality'),
        lifetime(`${PFX}.protective.engaged-work`,      'Engaged in work or school'),
        lifetime(`${PFX}.protective.engaged-phone`,     'Engaged with Phone Worker*'),
      ]),
      { linkId:`${PFX}.other-protective`, type:'text', text:'Other protective factors' },
      { linkId:`${PFX}.describe`, type:'text', text:'Describe any suicidal, self-injury or aggressive behavior (include dates)' },
      group(`${PFX}.ideation-detail`, 'Suicidal Ideation detail — past month vs lifetime when felt most suicidal',
        [
          [`${PFX}.ideation-detail.q1`, '1. Wish to be Dead — Have you wished you were dead or wished you could go to sleep and not wake up?'],
          [`${PFX}.ideation-detail.q2`, '2. Non-Specific Active Suicidal Thoughts — Have you actually had any thoughts of killing yourself?'],
          [`${PFX}.ideation-detail.q3`, '3. Active Suicidal Ideation with Any Methods (Not Plan) without Intent to Act — Have you been thinking about how you might do this?'],
          [`${PFX}.ideation-detail.q4`, '4. Active Suicidal Ideation with Some Intent to Act, without Specific Plan — Have you had these thoughts and had some intention of acting on them?'],
          [`${PFX}.ideation-detail.q5`, '5. Active Suicidal Ideation with Specific Plan and Intent — Have you started to work out or worked out the details of how to kill yourself? Do you intend to carry out this plan?'],
        ].map(([id,t]) => yesNoLife(id, t))),
      { linkId:`${PFX}.disposition`, type:'text', text:'Risk level, disposition, plan' },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── McGill SF-MPQ (15-item Short Form, Melzack 1987) ──────────────────────
{
  const ID = 'sf-mpq'; const PFX = 'sfmpq';
  const opts = ordOpts([[0,'none','None'],[1,'mild','Mild'],[2,'moderate','Moderate'],[3,'severe','Severe']]);
  const sensory = [
    'Throbbing','Shooting','Stabbing','Sharp','Cramping','Gnawing','Hot-Burning','Aching','Heavy','Tender','Splitting',
  ];
  const affective = ['Tiring-Exhausting','Sickening','Fearful','Punishing-Cruel'];
  const ppi = ordOpts([[0,'none','0 — No pain'],[1,'mild','1 — Mild'],[2,'discomforting','2 — Discomforting'],[3,'distressing','3 — Distressing'],[4,'horrible','4 — Horrible'],[5,'excruciating','5 — Excruciating']]);

  const matrix = group(`${PFX}.matrix`, 'Rate the intensity of each descriptor over the past week',
    [...sensory.map((t,i)=>({ slug:`s${i+1}`, t, kind:'sensory' })),
     ...affective.map((t,i)=>({ slug:`a${i+1}`, t, kind:'affective' }))]
      .map(({slug, t, kind},i)=>({
        linkId:`${PFX}.matrix.${slug}`, type:'choice', required:true, prefix:`${i+1}.`,
        text:t, extension:[{ url: EXT.shortText, valueString:kind }], answerOption: opts })),
    { control:'gtable' });

  const q = questionnaire({
    id: ID, name:'SFMPQ',
    title:'Short Form McGill Pain Questionnaire (SF-MPQ)',
    code: [{ system: SYS.loinc, code:'89169-7', display:'Short Form McGill Pain Questionnaire' }],
    copyright: 'Melzack R. The short-form McGill Pain Questionnaire. Pain 1987;30:191-7. Reproduced for educational/clinical use; commercial use via MAPI Research Trust.',
    extension: [
      variable('sfmpqSensory',   "%resource.item.descendants().where(linkId.matches('sfmpq\\\\.matrix\\\\.s[0-9]+')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
      variable('sfmpqAffective', "%resource.item.descendants().where(linkId.matches('sfmpq\\\\.matrix\\\\.a[0-9]+')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Rate the intensity of each descriptor over the past week. Total has three components: sensory pain rating, affective pain rating, and present pain intensity (PPI).', { category:'instructions' }),
      matrix,
      totalScore(`${PFX}.sensoryScore`, 'Sensory pain rating (0–33; items 1–11)', 'sfmpqSensory', null),
      totalScore(`${PFX}.affectiveScore`, 'Affective pain rating (0–12; items 12–15)', 'sfmpqAffective', null),
      { linkId:`${PFX}.totalScore`, type:'integer', readOnly:true, text:'Total pain rating index (0–45)',
        extension:[calcExpr('%sfmpqSensory + %sfmpqAffective','Sum of sensory + affective')] },
      { linkId:`${PFX}.vas`, type:'integer', required:true, text:'Visual analogue scale — pain right now (0 = no pain, 100 = worst possible pain)',
        extension:[
          { url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'slider' }] } },
          { url: EXT.minValue, valueInteger:0 },{ url: EXT.maxValue, valueInteger:100 },{ url: EXT.sliderStepValue, valueInteger:1 },
        ] },
      { linkId:`${PFX}.ppi`, type:'choice', required:true, text:'Present pain intensity (PPI)', answerOption: ppi },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── Reminiscence Functions Scale (RFS) — Webster 1993, 43 items ────────────
{
  const ID = 'rfs'; const PFX = 'rfs';
  const items = [
    'to teach younger family members what life was like when I was young and living in a different time.',
    'to help me "put my house in order" before I die.',
    'because it fills the gap when I find time "heavy on my hands".',
    'to help me plan for the future.',
    'to keep alive the memory of a dead loved one.',
    'because it brings me closer to newer friends and acquaintances.',
    'because it promotes fellowship and a sense of belonging.',
    "because it helps me contrast the ways I've changed with the ways I've stayed the same.",
    'because it gives me a sense of personal completion or wholeness as I approach the end of life.',
    'to see how my past fits in with my journey through life.',
    'to pass the time during idle or restless hours.',
    'to help solve some current difficulty.',
    'to keep painful memories alive.',
    'out of loyalty to keep alive the memory of someone close to me who has died.',
    'to rehash lost opportunities.',
    'to reduce boredom.',
    'to remember an earlier time when I was treated unfairly by others.',
    'to remind me that I have the skills to cope with present problems.',
    'to relieve depression.',
    "to transmit knowledge that I've acquired to someone else.",
    'for lack of any better mental stimulation.',
    'to create a common bond between old and new friends.',
    'in order to teach younger persons about cultural values.',
    'because it gives me a sense of self-identity.',
    'to remember someone who has passed away.',
    'because remembering my past helps me define who I am now.',
    'as a way of bridging the "generation gap".',
    'as a "social lubricant" to get people talking.',
    'because it helps me prepare for my own death.',
    'in order to leave a legacy of family history.',
    'to put current problems in perspective.',
    'to try to understand myself better.',
    'because I feel less fearful of death after I finish reminiscing.',
    'to create ease of conversation.',
    "because it helps me see that I've lived a full life and can therefore accept death more calmly.",
    'as a means of self-exploration and growth.',
    'for something to do.',
    'because it helps me cope with thoughts of my own mortality.',
    'to see how my strengths can help me solve a current problem.',
    'to rekindle bitter memories.',
    'to remember people I was close to but who are no longer a part of my life.',
    'to mentally relive arguments and feuds.',
    'to think about hardships I have endured.',
  ];
  const opts = ordOpts([
    [1,'never','1 — Never'],
    [2,'rarely','2 — Rarely'],
    [3,'seldom','3 — Seldom'],
    [4,'occasionally','4 — Occasionally'],
    [5,'often','5 — Often'],
    [6,'very-freq','6 — Very Frequently'],
  ]);
  const matrix = group(`${PFX}.matrix`, 'When I reminisce, it is…',
    items.map((t,i)=>({ linkId:`${PFX}.matrix.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`, text:t, answerOption: opts })),
    { control:'gtable' });
  const q = questionnaire({
    id: ID, name:'RFS',
    title:'Reminiscence Functions Scale (RFS) — Webster, 43 items',
    copyright: 'RFS V1. © 1993, J.D. Webster. All rights reserved. Used for educational/research reference.',
    item: [
      display(`${PFX}.preamble`, 'When you do reminisce, how frequently is it for each particular purpose listed below? Answer each statement independently of earlier and later statements.', { category:'instructions' }),
      matrix,
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
