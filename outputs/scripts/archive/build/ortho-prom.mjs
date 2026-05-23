// Batch builder for several ortho PROMs: KOOS, WOMAC, ODI, LEFS, QuickDASH, FAAM, SPADI.
// Each writes its own file. Run all together.

import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, SYS, EXT } from '../lib.mjs';

function ord5(labels) { return labels.map(([l, ord]) => ({ extension: [ordinal(ord)], valueCoding: { code: l.toLowerCase().replace(/\s+/g,'-'), display: l } })); }

// ─────────────────────────────────────────────────────────────────────────────
// KOOS (Knee injury and Osteoarthritis Outcome Score)
// 42 items across 5 subscales. Standard scoring per AAOS.
{
  const ID = 'koos'; const PFX = 'koos';
  const sfreq    = ord5([['Never',0],['Rarely',1],['Sometimes',2],['Often',3],['Always',4]]);
  const sfreqRev = ord5([['Always',0],['Often',1],['Sometimes',2],['Rarely',3],['Never',4]]);
  const sevOpts  = ord5([['None',0],['Mild',1],['Moderate',2],['Severe',3],['Extreme',4]]);
  const diffOpts = ord5([['None',0],['Mild',1],['Moderate',2],['Severe',3],['Extreme',4]]);
  const painFreq = ord5([['Never',0],['Monthly',1],['Weekly',2],['Daily',3],['Always',4]]);

  // S1..S7 symptoms (S4/S5 reverse-anchored)
  const symptoms = group(`${PFX}.symptoms`, 'Symptoms (last week)', [
    { linkId:`${PFX}.symptoms.s1`, type:'choice', required:true, prefix:'S1.', text:'Do you have swelling in your knee?', answerOption: sfreq },
    { linkId:`${PFX}.symptoms.s2`, type:'choice', required:true, prefix:'S2.', text:'Do you feel grinding, hear clicking or any other type of noise when your knee moves?', answerOption: sfreq },
    { linkId:`${PFX}.symptoms.s3`, type:'choice', required:true, prefix:'S3.', text:'Does your knee catch or hang up when moving?', answerOption: sfreq },
    { linkId:`${PFX}.symptoms.s4`, type:'choice', required:true, prefix:'S4.', text:'Can you straighten your knee fully?', answerOption: sfreqRev },
    { linkId:`${PFX}.symptoms.s5`, type:'choice', required:true, prefix:'S5.', text:'Can you bend your knee fully?',     answerOption: sfreqRev },
  ], { control:'gtable' });

  const stiffness = group(`${PFX}.stiffness`, 'Stiffness (last week)', [
    { linkId:`${PFX}.stiffness.s6`, type:'choice', required:true, prefix:'S6.', text:'How severe is your knee joint stiffness after first wakening in the morning?', answerOption: sevOpts },
    { linkId:`${PFX}.stiffness.s7`, type:'choice', required:true, prefix:'S7.', text:'How severe is your knee stiffness after sitting, lying or resting later in the day?', answerOption: sevOpts },
  ], { control:'gtable' });

  const painItems = [
    ['p1','How often do you experience knee pain?', painFreq],
    ['p2','Twisting/pivoting on your knee', sevOpts],
    ['p3','Straightening knee fully', sevOpts],
    ['p4','Bending knee fully', sevOpts],
    ['p5','Walking on a flat surface', sevOpts],
    ['p6','Going up or down stairs', sevOpts],
    ['p7','At night while in bed', sevOpts],
    ['p8','Sitting or lying', sevOpts],
    ['p9','Standing upright', sevOpts],
  ];
  const pain = group(`${PFX}.pain`, 'Pain (last week)',
    painItems.map(([id,text,opts]) => ({ linkId:`${PFX}.pain.${id}`, type:'choice', required:true, prefix:`P${id.slice(1)}.`, text, answerOption: opts })),
    { control:'gtable' });

  const adlItems = [
    'Descending stairs','Ascending stairs','Rising from sitting','Standing','Bending to floor / pick up an object',
    'Walking on flat surface','Getting in/out of car','Going shopping','Putting on socks/stockings','Rising from bed',
    'Taking off socks/stockings','Lying in bed (turning over, maintaining knee position)','Getting in/out of bath','Sitting',
    'Getting on/off toilet','Heavy domestic duties (moving heavy boxes, scrubbing floors, etc.)','Light domestic duties (cooking, dusting, etc.)',
  ];
  const adl = group(`${PFX}.adl`, 'Function, daily living (last week)',
    adlItems.map((text,i) => ({ linkId:`${PFX}.adl.a${i+1}`, type:'choice', required:true, prefix:`A${i+1}.`, text:`What degree of difficulty have you experienced: ${text}`, answerOption: diffOpts })),
    { control:'gtable' });

  const sportItems = [
    'Squatting','Running','Jumping','Twisting/pivoting on your injured knee','Kneeling',
  ];
  const sport = group(`${PFX}.sport`, 'Function, sports and recreational activities (last week)',
    sportItems.map((text,i) => ({ linkId:`${PFX}.sport.sp${i+1}`, type:'choice', required:true, prefix:`SP${i+1}.`, text:`What degree of difficulty: ${text}`, answerOption: diffOpts })),
    { control:'gtable' });

  const qolOpts = ord5([['Not at all',0],['Mildly',1],['Moderately',2],['Severely',3],['Totally',4]]);
  const lifestyle = ord5([['None',0],['Mildly',1],['Moderately',2],['Severely',3],['Totally',4]]);
  const confidence = ord5([['Not at all',0],['Mildly',1],['Moderately',2],['Severely',3],['Extremely',4]]);
  const diffOpts2 = ord5([['None',0],['Mild',1],['Moderate',2],['Severe',3],['Extreme',4]]);

  const qol = group(`${PFX}.qol`, 'Quality of life', [
    { linkId:`${PFX}.qol.q1`, type:'choice', required:true, prefix:'Q1.', text:'How often are you aware of your knee problem?', answerOption: sfreq },
    { linkId:`${PFX}.qol.q2`, type:'choice', required:true, prefix:'Q2.', text:'Have you modified your lifestyle to avoid potentially damaging activities to your knee?', answerOption: lifestyle },
    { linkId:`${PFX}.qol.q3`, type:'choice', required:true, prefix:'Q3.', text:'How troubled are you with lack of confidence in your knee?', answerOption: confidence },
    { linkId:`${PFX}.qol.q4`, type:'choice', required:true, prefix:'Q4.', text:'In general, how much difficulty do you have with your knee?', answerOption: diffOpts2 },
  ], { control:'gtable' });

  const q = questionnaire({
    id: ID,
    name: 'KOOS',
    title: 'Knee Injury and Osteoarthritis Outcome Score (KOOS, English LK1.0)',
    code: [{ system: SYS.loinc, code: '94293-9', display: 'Knee injury and Osteoarthritis Outcome Score (KOOS) [Reported]' }],
    copyright: '© KOOS Foundation; Roos EM, et al. 1998. Free to use for clinical and research purposes with attribution. http://www.koos.nu',
    item: [
      display(`${PFX}.preamble`,
        'This survey asks for your view about your knee. Answer every question by choosing the appropriate response, thinking of your knee symptoms during the last week.',
        { category: 'instructions' }),
      symptoms, stiffness, pain, adl, sport, qol,
    ],
  });

  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// WOMAC — 24 items (5 pain + 2 stiffness + 17 function), 0–4 each, total 0–96 raw.
{
  const ID = 'womac'; const PFX = 'womac';
  const sev = ord5([['None',0],['Slight',1],['Moderate',2],['Very',3],['Extremely',4]]);
  const painItems = ['Walking','Stair climbing','At night (nocturnal)','At rest','Weight bearing'];
  const stiffItems = ['Morning stiffness','Stiffness occurring later in the day'];
  const funcItems = [
    'Descending stairs','Ascending stairs','Rising from sitting','Standing','Bending to floor',
    'Walking on flat surface','Getting in/out of car','Going shopping','Putting on socks','Lying in bed',
    'Taking off socks','Rising from bed','Getting in/out of bath','Sitting','Getting on/off toilet',
    'Heavy domestic duties','Light domestic duties',
  ];
  const items = [
    { id: `${PFX}.pain`,   text: 'Pain',             list: painItems,  px: 'P' },
    { id: `${PFX}.stiff`,  text: 'Stiffness',        list: stiffItems, px: 'S' },
    { id: `${PFX}.func`,   text: 'Physical function',list: funcItems,  px: 'F' },
  ].map(s => group(s.id, s.text, s.list.map((t,i)=>({ linkId:`${s.id}.q${i+1}`, type:'choice', required:true, prefix:`${s.px}${i+1}.`, text:t, answerOption: sev })), { control:'gtable' }));

  const q = questionnaire({
    id: ID, name: 'WOMAC',
    title: 'Western Ontario & McMaster Universities Osteoarthritis Index (WOMAC) — Likert 3.1',
    code: [{ system: SYS.loinc, code: '72091-2', display: 'WOMAC Osteoarthritis Index [WOMAC]' }],
    copyright: 'WOMAC © Bellamy N. License required for commercial use. Educational/individual clinical use generally permitted with attribution.',
    extension: [
      variable('womacSum', "%resource.item.descendants().where(linkId.matches('womac\\\\.(pain|stiff|func)\\\\.q[0-9]+')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Rate the activities in each category according to the difficulty you have experienced in the last 48 hours.', { category: 'instructions' }),
      ...items,
      totalScore(`${PFX}.totalScore`, 'WOMAC raw total (0–96)', 'womacSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// ODI (Oswestry Disability Index) — 10 sections, 6 statements per, scored 0–5
{
  const ID = 'odi'; const PFX = 'odi';
  function sec(num, title, statements) {
    return {
      linkId: `${PFX}.s${num}`, type: 'choice', required: true, prefix: `${num}.`, text: `Section ${num} — ${title}`,
      extension: [{ url: EXT.itemControl, valueCodeableConcept: { coding: [{ system: SYS.itemControl, code: 'radio-button' }] } },
                  { url: EXT.choiceOrientation, valueCode: 'vertical' }],
      answerOption: statements.map((s,i) => ({ extension: [ordinal(i)], valueCoding: { code: `s${num}-${i}`, display: s } })),
    };
  }
  const sections = [
    sec(1, 'Pain intensity', [
      'I have no pain at the moment.',
      'The pain is very mild at the moment.',
      'The pain is moderate at the moment.',
      'The pain is fairly severe at the moment.',
      'The pain is very severe at the moment.',
      'The pain is the worst imaginable at the moment.',
    ]),
    sec(2, 'Personal care (washing, dressing, etc.)', [
      'I can look after myself normally without causing extra pain.',
      'I can look after myself normally but it is very painful.',
      'It is painful to look after myself and I am slow and careful.',
      'I need some help but manage most of my personal care.',
      'I need help every day in most aspects of self care.',
      'I do not get dressed, I wash with difficulty and stay in bed.',
    ]),
    sec(3, 'Lifting', [
      'I can lift heavy weights without extra pain.',
      'I can lift heavy weights but it gives extra pain.',
      'Pain prevents me from lifting heavy weights off the floor, but I can manage if they are conveniently placed (e.g., on a table).',
      'Pain prevents me from lifting heavy weights but I can manage light to medium weights if they are conveniently positioned.',
      'I can lift only very light weights.',
      'I cannot lift or carry anything.',
    ]),
    sec(4, 'Walking', [
      'Pain does not prevent me walking any distance.',
      'Pain prevents me walking more than 1 mile.',
      'Pain prevents me walking more than 1/2 mile.',
      'Pain prevents me walking more than 100 yards.',
      'I can only walk using a stick or crutches.',
      'I am in bed most of the time and have to crawl to the toilet.',
    ]),
    sec(5, 'Sitting', [
      'I can sit in any chair as long as I like.',
      'I can only sit in my favourite chair as long as I like.',
      'Pain prevents me from sitting more than 1 hour.',
      'Pain prevents me from sitting more than 30 minutes.',
      'Pain prevents me from sitting more than 10 minutes.',
      'Pain prevents me from sitting at all.',
    ]),
    sec(6, 'Standing', [
      'I can stand as long as I want without extra pain.',
      'I can stand as long as I want but it gives me extra pain.',
      'Pain prevents me from standing for more than 1 hour.',
      'Pain prevents me from standing for more than 30 minutes.',
      'Pain prevents me from standing for more than 10 minutes.',
      'Pain prevents me from standing at all.',
    ]),
    sec(7, 'Sleeping', [
      'My sleep is never disturbed by pain.',
      'My sleep is occasionally disturbed by pain.',
      'Because of pain, I have less than 6 hours sleep.',
      'Because of pain, I have less than 4 hours sleep.',
      'Because of pain, I have less than 2 hours sleep.',
      'Pain prevents me from sleeping at all.',
    ]),
    sec(8, 'Sex life (if applicable)', [
      'My sex life is normal and causes no extra pain.',
      'My sex life is normal but causes some extra pain.',
      'My sex life is nearly normal but is very painful.',
      'My sex life is severely restricted by pain.',
      'My sex life is nearly absent because of pain.',
      'Pain prevents any sex life at all.',
    ]),
    sec(9, 'Social life', [
      'My social life is normal and gives me no extra pain.',
      'My social life is normal but increases the degree of pain.',
      'Pain has no significant effect on my social life apart from limiting more energetic interests (e.g., sport).',
      'Pain has restricted my social life and I do not go out as often.',
      'Pain has restricted social life to my home.',
      'I have no social life because of pain.',
    ]),
    sec(10, 'Travelling', [
      'I can travel anywhere without pain.',
      'I can travel anywhere but it gives me extra pain.',
      'Pain is bad but I manage journeys over two hours.',
      'Pain restricts me to journeys of less than one hour.',
      'Pain restricts me to short necessary journeys under 30 minutes.',
      'Pain prevents me from travelling except to receive treatment.',
    ]),
  ];

  const q = questionnaire({
    id: ID, name: 'ODI',
    title: 'Oswestry Disability Index (ODI) — Low Back Pain Disability Questionnaire',
    code: [{ system: SYS.loinc, code: '77544-1', display: 'Oswestry Disability Index v2.1a' }],
    copyright: 'Fairbank JCT, Pynsent PB. The Oswestry Disability Index. Spine 2000. Free to use in clinical practice and research; commercial use requires permission.',
    extension: [
      variable('odiSum', "%resource.item.where(linkId.startsWith('odi.s')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
      variable('odiAnswered', "%resource.item.where(linkId.startsWith('odi.s')).where(answer.exists()).count()"),
    ],
    item: [
      display(`${PFX}.preamble`,
        'This questionnaire has been designed to give us information as to how your back (or leg) pain has affected your ability to manage in everyday life. Please answer by choosing the ONE statement in each section that most clearly describes your problem today.',
        { category: 'instructions' }),
      ...sections,
      totalScore(`${PFX}.rawSum`, 'Raw score (sum 0–50)', 'odiSum', null),
      {
        linkId:`${PFX}.percent`, type:'decimal', readOnly:true, text:'ODI disability percentage',
        extension: [{ url: EXT.calculatedExpression, valueExpression: { language:'text/fhirpath',
          expression:"iif(%odiAnswered > 0, (%odiSum * 100) / (%odiAnswered * 5), 0)" } }],
      },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEFS — 20 activities, 0 (extreme difficulty/unable) to 4 (no difficulty), total 0–80.
{
  const ID = 'lefs'; const PFX = 'lefs';
  const opts = ord5([
    ['Extreme difficulty or unable to perform activity', 0],
    ['Quite a bit of difficulty', 1],
    ['Moderate difficulty', 2],
    ['A little bit of difficulty', 3],
    ['No difficulty', 4],
  ]);
  const items = [
    'Any of your usual work, housework, or school activities',
    'Your usual hobbies, recreational, or sporting activities',
    'Getting into or out of the bath',
    'Walking between rooms',
    'Putting on your shoes or socks',
    'Squatting',
    'Lifting an object, like a bag of groceries, from the floor',
    'Performing light activities around your home',
    'Performing heavy activities around your home',
    'Getting into or out of a car',
    'Walking 2 blocks',
    'Walking a mile',
    'Going up or down 10 stairs (about 1 flight of stairs)',
    'Standing for 1 hour',
    'Sitting for 1 hour',
    'Running on even ground',
    'Running on uneven ground',
    'Making sharp turns while running fast',
    'Hopping',
    'Rolling over in bed',
  ];
  const matrix = group(`${PFX}.matrix`, 'Today, do you, or would you, have any difficulty at all with:',
    items.map((t,i)=>({ linkId:`${PFX}.matrix.q${i+1}`, type:'choice', required:true, prefix:`${i+1}.`, text:t, answerOption: opts })),
    { control:'gtable' });

  const q = questionnaire({
    id: ID, name: 'LEFS',
    title: 'Lower Extremity Functional Scale (LEFS)',
    code: [{ system: SYS.loinc, code: '74304-7', display: 'Lower Extremity Functional Scale [LEFS]' }],
    copyright: 'Binkley JM, Stratford PW, Lott SA, Riddle DL. The Lower Extremity Functional Scale (LEFS). Phys Ther 1999;79:371-83. Free to use.',
    extension: [variable('lefsSum', "%resource.item.descendants().where(linkId.startsWith('lefs.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()")],
    item: [
      display(`${PFX}.preamble`, 'For each activity, choose the rating that best describes the level of difficulty you have today due to your leg problem.', { category: 'instructions' }),
      matrix,
      totalScore(`${PFX}.totalScore`, 'LEFS total (0–80; higher = better function)', 'lefsSum', null),
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─────────────────────────────────────────────────────────────────────────────
// QuickDASH — 11 items disability + optional work + sports modules.
{
  const ID = 'quickdash'; const PFX = 'qdash';
  const diff = ord5([['No difficulty',1],['Mild difficulty',2],['Moderate difficulty',3],['Severe difficulty',4],['Unable',5]]);
  const intf = ord5([['Not at all',1],['Slightly',2],['Moderately',3],['Quite a bit',4],['Extremely',5]]);
  const sev  = ord5([['None',1],['Mild',2],['Moderate',3],['Severe',4],['Extreme',5]]);
  const sleep = ord5([['No difficulty',1],['Mild difficulty',2],['Moderate difficulty',3],['Severe difficulty',4],['So much difficulty that I cannot sleep',5]]);

  const main = [
    [1, 'Open a tight or new jar', diff],
    [2, 'Do heavy household chores (e.g., wash walls, floors)', diff],
    [3, 'Carry a shopping bag or briefcase', diff],
    [4, 'Wash your back', diff],
    [5, 'Use a knife to cut food', diff],
    [6, 'Recreational activities in which you take some force or impact through your arm, shoulder or hand', diff],
    [7, 'To what extent has your arm, shoulder or hand problem interfered with your normal social activities with family, friends, neighbours or groups?', intf],
    [8, 'During the past week, were you limited in your work or other regular daily activities as a result of your arm, shoulder or hand problem?', ord5([['Not limited at all',1],['Slightly limited',2],['Moderately limited',3],['Very limited',4],['Unable',5]])],
    [9, 'Arm, shoulder or hand pain', sev],
    [10,'Tingling (pins and needles) in your arm, shoulder or hand', sev],
    [11,'During the past week, how much difficulty have you had sleeping because of the pain in your arm, shoulder or hand?', sleep],
  ];
  const matrix = group(`${PFX}.matrix`, 'QuickDASH disability/symptom items (past week)',
    main.map(([n,text,opts])=>({ linkId:`${PFX}.matrix.q${n}`, type:'choice', required:true, prefix:`${n}.`, text, answerOption: opts })),
    { control:'gtable' });

  const work = group(`${PFX}.work`, 'OPTIONAL Work Module',
    [
      [1,'Using your usual technique for your work?'],
      [2,'Doing your usual work because of arm, shoulder or hand pain?'],
      [3,'Doing your work as well as you would like?'],
      [4,'Spending your usual amount of time doing your work?'],
    ].map(([n,t])=>({ linkId:`${PFX}.work.w${n}`, type:'choice', prefix:`W${n}.`, text:`Using your job/work, in the past week, did you have any difficulty: ${t}`, answerOption: diff })),
    { control:'gtable' });

  const sports = group(`${PFX}.sport`, 'OPTIONAL Sports/Performing Arts Module',
    [
      [1,'Using your usual technique for playing your instrument or sport?'],
      [2,'Playing your usual instrument or sport because of arm, shoulder or hand pain?'],
      [3,'Playing your instrument or sport as well as you would like?'],
      [4,'Spending your usual amount of time practicing or playing your instrument or sport?'],
    ].map(([n,t])=>({ linkId:`${PFX}.sport.s${n}`, type:'choice', prefix:`S${n}.`, text:`In the past week, did you have any difficulty: ${t}`, answerOption: diff })),
    { control:'gtable' });

  const q = questionnaire({
    id: ID, name: 'QuickDASH',
    title: 'QuickDASH — Disabilities of the Arm, Shoulder and Hand (short form)',
    code: [{ system: SYS.loinc, code: '71798-3', display: 'Disabilities of the Arm, Shoulder and Hand short form (QuickDASH)' }],
    copyright: '© Institute for Work & Health (IWH). Free for clinical and academic use; commercial use requires license. http://www.dash.iwh.on.ca',
    extension: [
      variable('qdashSum',     "%resource.item.descendants().where(linkId.startsWith('qdash.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"),
      variable('qdashAnswered',"%resource.item.descendants().where(linkId.startsWith('qdash.matrix.')).where(answer.exists()).count()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'This questionnaire asks about your symptoms as well as your ability to perform certain activities. Please answer every question, based on your condition in the last week.', { category: 'instructions' }),
      matrix,
      {
        linkId:`${PFX}.score`, type:'decimal', readOnly:true,
        text:'QuickDASH disability/symptom score (0=no disability, 100=most severe). Requires at least 10 of 11 items answered.',
        extension:[{ url: EXT.calculatedExpression, valueExpression: { language:'text/fhirpath',
          expression:"iif(%qdashAnswered >= 10, ((%qdashSum / %qdashAnswered) - 1) * 25, {})" } }],
      },
      work, sports,
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
