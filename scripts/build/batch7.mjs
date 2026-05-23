// Batch7: SF-MPQ-2 (22-item revised), Wong-Baker FACES Pain Rating Scale,
// AAFP Adult Preventive Health Screening checklist, BPI Short Form (Brief Pain Inventory).
import fs from 'node:fs';
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, SYS, EXT } from '../lib.mjs';

const ordOpts = (triples) => triples.map(([o, code, display]) => ({ extension: [ordinal(o)], valueCoding: { code, display } }));

// ─── SF-MPQ-2 (22 items + PPI) ──────────────────────────────────────────────
{
  const ID = 'sf-mpq-2'; const PFX = 'sfmpq2';
  const slider = [
    { url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'slider' }] } },
    { url: EXT.minValue, valueInteger:0 },{ url: EXT.maxValue, valueInteger:10 },{ url: EXT.sliderStepValue, valueInteger:1 },
  ];
  const items = [
    [1, 'Throbbing pain', 'continuous'],
    [2, 'Shooting pain', 'intermittent'],
    [3, 'Stabbing pain', 'intermittent'],
    [4, 'Sharp pain', 'intermittent'],
    [5, 'Cramping pain', 'continuous'],
    [6, 'Gnawing pain', 'continuous'],
    [7, 'Hot-burning pain', 'continuous'],
    [8, 'Aching pain', 'continuous'],
    [9, 'Heavy pain', 'continuous'],
    [10,'Tender', 'continuous'],
    [11,'Splitting pain', 'continuous'],
    [12,'Tiring-exhausting', 'affective'],
    [13,'Sickening', 'affective'],
    [14,'Fearful', 'affective'],
    [15,'Punishing-cruel', 'affective'],
    [16,'Electric-shock pain', 'neuropathic'],
    [17,'Cold-freezing pain', 'neuropathic'],
    [18,'Piercing', 'neuropathic'],
    [19,'Pain caused by light touch', 'neuropathic'],
    [20,'Itching', 'neuropathic'],
    [21,'Tingling or "pins and needles"', 'neuropathic'],
    [22,'Numbness', 'neuropathic'],
  ];
  const matrix = group(`${PFX}.matrix`, 'SF-MPQ-2 descriptors — rate over the past week (0 = none, 10 = worst possible)',
    items.map(([n,t,sub]) => ({
      linkId:`${PFX}.matrix.q${n}`, type:'integer', required:true, prefix:`${n}.`, text:t,
      extension: [...slider, { url: EXT.shortText, valueString:sub }],
    })),
    { control:'gtable' });
  const ppi = {
    linkId:`${PFX}.ppi`, type:'choice', required:true, prefix:'23.',
    text:'Present Pain Intensity (PPI) — Numerical Pain Rating Scale (0–10)',
    answerOption: Array.from({length:11},(_,i)=>({ extension:[ordinal(i)], valueCoding:{ code:String(i), display: i === 0 ? '0 — None' : i === 10 ? '10 — Worst possible pain' : String(i) } })),
  };
  const q = questionnaire({
    id: ID, name:'SFMPQ2',
    title:'Short-Form McGill Pain Questionnaire — Revised (SF-MPQ-2)',
    copyright: 'Dworkin RH, et al. Pain 2009;144:35-42. © McGill University; use through MAPI Research Trust. Free for academic and individual clinical use.',
    extension: [
      variable('sfmpq2Total',      "%resource.item.descendants().where(linkId.startsWith('sfmpq2.matrix.')).answer.valueInteger.sum()"),
      variable('sfmpq2Continuous', "%resource.item.descendants().where(linkId in ('sfmpq2.matrix.q1'|'sfmpq2.matrix.q5'|'sfmpq2.matrix.q6'|'sfmpq2.matrix.q7'|'sfmpq2.matrix.q8'|'sfmpq2.matrix.q9'|'sfmpq2.matrix.q10'|'sfmpq2.matrix.q11')).answer.valueInteger.sum()"),
      variable('sfmpq2Intermittent', "%resource.item.descendants().where(linkId in ('sfmpq2.matrix.q2'|'sfmpq2.matrix.q3'|'sfmpq2.matrix.q4')).answer.valueInteger.sum()"),
      variable('sfmpq2Affective',  "%resource.item.descendants().where(linkId in ('sfmpq2.matrix.q12'|'sfmpq2.matrix.q13'|'sfmpq2.matrix.q14'|'sfmpq2.matrix.q15')).answer.valueInteger.sum()"),
      variable('sfmpq2Neuropathic', "%resource.item.descendants().where(linkId in ('sfmpq2.matrix.q16'|'sfmpq2.matrix.q17'|'sfmpq2.matrix.q18'|'sfmpq2.matrix.q19'|'sfmpq2.matrix.q20'|'sfmpq2.matrix.q21'|'sfmpq2.matrix.q22')).answer.valueInteger.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Rate the intensity of each descriptor of pain or related symptoms you felt during the past week. Use 0 if the word does not describe your pain.', { category:'instructions' }),
      matrix, ppi,
      { linkId:`${PFX}.continuousScore`,   type:'decimal', readOnly:true, text:'Continuous pain subscale mean (Q1, Q5–Q11)',  extension:[calcExpr('%sfmpq2Continuous / 8',  'Mean of continuous subscale')] },
      { linkId:`${PFX}.intermittentScore`, type:'decimal', readOnly:true, text:'Intermittent pain subscale mean (Q2–Q4)',     extension:[calcExpr('%sfmpq2Intermittent / 3', 'Mean of intermittent subscale')] },
      { linkId:`${PFX}.neuropathicScore`,  type:'decimal', readOnly:true, text:'Neuropathic pain subscale mean (Q16–Q22)',     extension:[calcExpr('%sfmpq2Neuropathic / 7',  'Mean of neuropathic subscale')] },
      { linkId:`${PFX}.affectiveScore`,    type:'decimal', readOnly:true, text:'Affective subscale mean (Q12–Q15)',            extension:[calcExpr('%sfmpq2Affective / 4',    'Mean of affective subscale')] },
      { linkId:`${PFX}.totalMean`,         type:'decimal', readOnly:true, text:'SF-MPQ-2 total mean (sum of 22 items / 22)',   extension:[calcExpr('%sfmpq2Total / 22',       'Total mean score')] },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── Wong-Baker FACES Pain Rating Scale ─────────────────────────────────────
{
  const ID = 'wong-baker-faces'; const PFX = 'wbfaces';
  const opts = ordOpts([
    [0, '0', '0 — No hurt'],
    [2, '2', '2 — Hurts little bit'],
    [4, '4', '4 — Hurts little more'],
    [6, '6', '6 — Hurts even more'],
    [8, '8', '8 — Hurts whole lot'],
    [10,'10','10 — Hurts worst'],
  ]);
  const q = questionnaire({
    id: ID, name:'WongBakerFACES',
    title:'Wong-Baker FACES® Pain Rating Scale',
    code:[{ system: SYS.loinc, code:'89260-4', display:'Wong-Baker FACES pain rating scale' }],
    copyright: '© Wong-Baker FACES® Foundation. www.WongBakerFACES.org. Used with permission for non-commercial clinical and educational use.',
    item: [
      display(`${PFX}.preamble`, 'Explain to the person that each face represents a person who has no pain (hurt), or some, or a lot of pain. Face 0 doesn\'t hurt at all. Face 10 hurts as much as you can imagine, although you don\'t have to be crying to feel this bad. Ask the person to choose the face that best describes how he or she is feeling.', { category:'instructions' }),
      { linkId:`${PFX}.rating`, type:'choice', required:true,
        text:'Choose the face that best matches your pain right now',
        extension:[
          { url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'radio-button' }] } },
          { url: EXT.choiceOrientation, valueCode:'horizontal' },
        ],
        answerOption: opts },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── BPI Short Form (Brief Pain Inventory) ──────────────────────────────────
{
  const ID = 'bpi-short'; const PFX = 'bpi';
  const slider = [
    { url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'slider' }] } },
    { url: EXT.minValue, valueInteger:0 },{ url: EXT.maxValue, valueInteger:10 },{ url: EXT.sliderStepValue, valueInteger:1 },
  ];
  const reliefOpts = Array.from({length:11},(_,i)=>({ extension:[ordinal(i*10)], valueCoding:{ code:String(i*10), display:`${i*10}%` } }));

  const intensity = group(`${PFX}.intensity`, 'Pain intensity (0 = no pain, 10 = pain as bad as you can imagine)', [
    { linkId:`${PFX}.intensity.worst`,   type:'integer', required:true, prefix:'3.', text:'Worst pain in the last 24 hours', extension: slider },
    { linkId:`${PFX}.intensity.least`,   type:'integer', required:true, prefix:'4.', text:'Least pain in the last 24 hours', extension: slider },
    { linkId:`${PFX}.intensity.average`, type:'integer', required:true, prefix:'5.', text:'Average pain',                    extension: slider },
    { linkId:`${PFX}.intensity.now`,     type:'integer', required:true, prefix:'6.', text:'Pain right now',                  extension: slider },
  ], { control:'gtable' });

  const interference = group(`${PFX}.interference`, 'In the last 24 hours, how much has pain interfered with… (0 = does not interfere, 10 = completely interferes)', [
    [`${PFX}.interference.general`,    '9a.', 'General activity'],
    [`${PFX}.interference.mood`,       '9b.', 'Mood'],
    [`${PFX}.interference.walking`,    '9c.', 'Walking ability'],
    [`${PFX}.interference.work`,       '9d.', 'Normal work (includes both work outside the home and housework)'],
    [`${PFX}.interference.relations`,  '9e.', 'Relations with other people'],
    [`${PFX}.interference.sleep`,      '9f.', 'Sleep'],
    [`${PFX}.interference.enjoyment`,  '9g.', 'Enjoyment of life'],
  ].map(([id,p,t])=>({ linkId:id, type:'integer', required:true, prefix:p, text:t, extension: slider })),
  { control:'gtable' });

  const q = questionnaire({
    id: ID, name:'BPIShort',
    title:'Brief Pain Inventory — Short Form (BPI-SF)',
    code: [{ system: SYS.loinc, code:'97826-1', display:'Brief Pain Inventory - Short Form' }],
    copyright: '© Charles S. Cleeland, MD Anderson Cancer Center. Free for non-commercial clinical and academic use with attribution.',
    extension: [
      variable('bpiSeverity',     "%resource.item.descendants().where(linkId.startsWith('bpi.intensity.')).answer.valueInteger.sum()"),
      variable('bpiInterference', "%resource.item.descendants().where(linkId.startsWith('bpi.interference.')).answer.valueInteger.sum()"),
    ],
    item: [
      display(`${PFX}.preamble`, 'Throughout our lives, most of us have had pain from time to time (such as minor headaches, sprains, and toothaches). Have you had pain other than these everyday kinds of pain today?', { category:'instructions' }),
      { linkId:`${PFX}.q1`, type:'boolean', required:true, prefix:'1.',
        text:'Throughout our lives, most of us have had pain from time to time. Have you had pain other than these everyday kinds of pain today?' },
      { linkId:`${PFX}.q2`, type:'string', prefix:'2.', text:'On the diagram, shade in the areas where you feel pain. Put an X on the area that hurts the most. (Free text description in lieu of diagram.)' },
      intensity,
      group(`${PFX}.treatment`, 'Treatment', [
        { linkId:`${PFX}.treatment.q7`, type:'text', prefix:'7.', text:'What treatments or medications are you receiving for your pain?' },
        { linkId:`${PFX}.treatment.q8`, type:'choice', prefix:'8.', text:'In the last 24 hours, how much relief have pain treatments or medications provided?', answerOption: reliefOpts },
      ]),
      interference,
      { linkId:`${PFX}.severityScore`, type:'decimal', readOnly:true, text:'Pain severity score (mean of Q3–Q6)',
        extension:[calcExpr('%bpiSeverity / 4','Mean of intensity ratings')] },
      { linkId:`${PFX}.interferenceScore`, type:'decimal', readOnly:true, text:'Pain interference score (mean of Q9a–9g)',
        extension:[calcExpr('%bpiInterference / 7','Mean of interference ratings')] },
    ],
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── AAFP Adult Preventive Health Screening Checklist (clinician-facing) ────
{
  const ID = 'aafp-adult-preventive-screening'; const PFX = 'aafppsv';
  // Convert each preventive intervention into a single tracking item:
  //   - status (Done / Due / Refused / N/A)
  //   - date last performed (date)
  //   - notes (text)
  const interventions = [
    ['aspirin', 'Aspirin for primary prevention of CVD (USPSTF: individualized for adults 40–59 with ≥10% 10-yr CVD risk; against for 60+)'],
    ['hearing', 'Assessment for hearing impairment (age 65+; insufficient evidence for routine screening)'],
    ['bp',      'High blood pressure screening (every 2 years; out-of-clinic confirmation if elevated)'],
    ['htn-preg','Hypertensive disorders of pregnancy screening (at each prenatal visit)'],
    ['lipids',  'Statin use for primary CVD prevention (adults 40–75 with ≥1 risk factor and ≥10% 10-yr risk — Grade B)'],
    ['aaa',     'Abdominal aortic aneurysm — one-time US (men 65–75 who ever smoked)'],
    ['colorectal', 'Colorectal cancer screening (45–75; FIT, stool DNA, colonoscopy, etc.)'],
    ['cervical',   'Cervical cancer screening (21–65 per ACS/USPSTF)'],
    ['breast',     'Breast cancer screening (mammogram every 2 yrs, 40–74)'],
    ['lung',       'Lung cancer screening (annual LDCT 50–80, ≥20 pack-year, current or quit <15 yrs)'],
    ['osteoporosis','Osteoporosis screening (women ≥65; postmenopausal women <65 with risk)'],
    ['depression', 'Depression screening (PHQ-2 or PHQ-9; all adults including pregnant/postpartum)'],
    ['anxiety',    'Anxiety screening (GAD-7; adults ≤64)'],
    ['intimate-partner-violence', 'Intimate-partner violence screening (women of reproductive age)'],
    ['tobacco',    'Tobacco cessation counseling (all adults)'],
    ['alcohol',    'Alcohol unhealthy use screening + brief counseling (AUDIT/AUDIT-C)'],
    ['drug',       'Illicit drug use screening (NIDA Quick Screen or single-item)'],
    ['obesity',    'Obesity screening + intensive behavioral counseling (BMI ≥30)'],
    ['diabetes',   'Prediabetes & type-2 diabetes screening (35–70 with overweight/obesity)'],
    ['statin',     'Statin chemoprevention (per above)'],
    ['hep-c',      'Hepatitis C screening (one-time, 18–79)'],
    ['hep-b',      'Hepatitis B screening (adults at increased risk)'],
    ['hiv',        'HIV screening (15–65; periodic re-screen if at risk)'],
    ['syphilis',   'Syphilis screening (asymptomatic adults at increased risk; pregnant persons)'],
    ['chlamydia-gonorrhea','Chlamydia/gonorrhea screening (sexually active women ≤24 and older with risk)'],
    ['skin',       'Skin cancer behavioral counseling (10–24; fair-skinned adults at risk)'],
    ['fall-prev',  'Fall prevention exercise / vit-D / multifactorial interventions (community-dwelling ≥65 at increased risk)'],
    ['fluoride-varnish','Topical fluoride application (children — not adult)'],
    ['immunizations','Adult immunizations per ACIP (annual flu, Td/Tdap, zoster, pneumococcal, etc.)'],
  ];
  const items = [
    display(`${PFX}.preamble`, 'Adult preventive health screening checklist derived from USPSTF and AAFP recommendations. Required interventions are italicized in the source PDF. For each intervention, record current status and date last performed.', { category:'instructions' }),
    group(`${PFX}.matrix`, 'Preventive interventions',
      interventions.map(([slug, label]) => group(`${PFX}.matrix.${slug}`, label, [
        { linkId:`${PFX}.matrix.${slug}.status`, type:'choice', required:true, text:'Status',
          answerOption:[
            { valueCoding:{ code:'done',     display:'Done / Up to date' } },
            { valueCoding:{ code:'due',      display:'Due / Not up to date' } },
            { valueCoding:{ code:'declined', display:'Patient declined' } },
            { valueCoding:{ code:'na',       display:'Not applicable' } },
          ] },
        { linkId:`${PFX}.matrix.${slug}.date`, type:'date', text:'Date last performed' },
        { linkId:`${PFX}.matrix.${slug}.notes`, type:'text', text:'Notes' },
      ]))),
  ];
  const q = questionnaire({
    id: ID, name:'AAFPAdultPreventiveScreening',
    title:'AAFP / USPSTF Adult Preventive Health Screening Checklist',
    copyright: 'Derived from US Preventive Services Task Force (USPSTF) and AAFP recommendations. Reproduced for educational use.',
    item: items,
    extra: { subjectType:['Patient'] },
  });
  fs.writeFileSync(`questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
