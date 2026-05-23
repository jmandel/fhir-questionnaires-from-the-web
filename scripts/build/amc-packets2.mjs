// AMC Packets, part 2: NYU Fresco (Parkinson), NYU Faculty Group Demographic, NYU Multi-physician,
// BWH AERD Allergy, BWH Pediatric Allergy, BWH Brain-Mind, MGH HRSCC, MGH Allergy, MGH Vein Care,
// Hopkins Adult Consultation (Schizophrenia), UPMC Jameson Bariatrics, Stanford Valleycare GYN.
import fs from 'node:fs';
import { questionnaire, group, display, ordinal, variable, SYS, EXT } from '../lib.mjs';

const ynOpts = [
  { extension:[ordinal(0)], valueCoding:{ system: SYS.yn, code:'N', display:'No' } },
  { extension:[ordinal(1)], valueCoding:{ system: SYS.yn, code:'Y', display:'Yes' } },
];

function demographics(prefix) {
  return group(`${prefix}.demographics`, 'Demographics', [
    { linkId:`${prefix}.demographics.firstName`, type:'string', required:true, text:'First name' },
    { linkId:`${prefix}.demographics.lastName`,  type:'string', required:true, text:'Last name' },
    { linkId:`${prefix}.demographics.dob`,       type:'date',   required:true, text:'Date of birth' },
    { linkId:`${prefix}.demographics.sex`,       type:'choice', text:'Sex',
      answerOption:[
        { valueCoding:{ system: SYS.adminGender, code:'female', display:'Female' } },
        { valueCoding:{ system: SYS.adminGender, code:'male',   display:'Male' } },
        { valueCoding:{ system: SYS.adminGender, code:'other',  display:'Other' } },
      ] },
    { linkId:`${prefix}.demographics.address`,   type:'text',   text:'Home address' },
    { linkId:`${prefix}.demographics.phone`,     type:'string', text:'Phone',
      extension:[{ url: EXT.entryFormat, valueString:'nnn-nnn-nnnn' }] },
    { linkId:`${prefix}.demographics.email`,     type:'string', text:'Email' },
  ]);
}
function meds(prefix) {
  return group(`${prefix}.medications`, 'Current medications', [
    { linkId:`${prefix}.medications.list`, type:'group', repeats:true, text:'Medication',
      item:[
        { linkId:`${prefix}.medications.list.name`,      type:'string', text:'Name' },
        { linkId:`${prefix}.medications.list.dose`,      type:'string', text:'Dose' },
        { linkId:`${prefix}.medications.list.frequency`, type:'string', text:'Frequency' },
      ] },
  ]);
}
function allergies(prefix) {
  return group(`${prefix}.allergies`, 'Allergies', [
    { linkId:`${prefix}.allergies.list`, type:'group', repeats:true,
      item:[
        { linkId:`${prefix}.allergies.list.substance`, type:'string', text:'Substance' },
        { linkId:`${prefix}.allergies.list.reaction`,  type:'text',   text:'Reaction' },
      ] },
  ]);
}
function shell(id, name, title, specialty, copyright, items) {
  return questionnaire({
    id, name, title, copyright: copyright || `${name} new-patient intake form. Reproduced for research-collection purposes.`,
    item: items,
    extra: { useContext: [{ code: { system: 'http://terminology.hl7.org/CodeSystem/usage-context-type', code:'focus' }, valueCodeableConcept: { text: specialty } }] },
  });
}

// NYU Fresco Institute (Parkinson) — condensed
{
  const ID = 'nyu-fresco-parkinson'; const PFX = 'nyufresco';
  const motor = ['Tremor','Rigidity','Slowness (bradykinesia)','Balance problems','Difficulty walking','Freezing of gait','Difficulty turning','Falls','Stooped posture','Difficulty rising from a chair','Difficulty rolling in bed','Soft voice','Drooling','Difficulty swallowing','Small handwriting (micrographia)','Mask-like facial expression'];
  const nonmotor = ['Depression','Anxiety','Apathy','Sleep disturbance','REM sleep behavior disorder (acting out dreams)','Excessive daytime sleepiness','Fatigue','Cognitive changes','Hallucinations','Constipation','Urinary urgency','Sexual dysfunction','Orthostatic dizziness','Loss of smell','Sweating changes','Pain'];
  const items = [
    display(`${PFX}.preamble`, 'This intake helps the Fresco Institute prepare for your visit. Please be as complete as possible.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.referrer`, type:'string', text:'Who referred you to our center?' },
    group(`${PFX}.dx`, 'Diagnosis', [
      { linkId:`${PFX}.dx.condition`, type:'string', text:'Movement / Parkinson-related diagnosis' },
      { linkId:`${PFX}.dx.dxDate`,    type:'date',   text:'When were you diagnosed?' },
      { linkId:`${PFX}.dx.diagnosingMD`, type:'string', text:'Diagnosing physician' },
      { linkId:`${PFX}.dx.familyHistory`, type:'text', text:'Family history of movement disorder' },
    ]),
    group(`${PFX}.motor`, 'Motor symptoms — check any you currently have', [
      { linkId:`${PFX}.motor.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption: motor.map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    group(`${PFX}.nonmotor`, 'Non-motor symptoms — check any you currently have', [
      { linkId:`${PFX}.nonmotor.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption: nonmotor.map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    meds(PFX), allergies(PFX),
    { linkId:`${PFX}.priorTherapies`, type:'text', text:'Prior therapies (DBS, focused ultrasound, deep brain stimulation candidacy, levodopa challenges, etc.)' },
    { linkId:`${PFX}.questions`, type:'text', text:'Questions you\'d like to discuss with the team' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'NYUFrescoParkinson', 'NYU Langone — Marlene and Paolo Fresco Institute New Patient Intake', 'Movement disorders / Parkinson', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// BWH AERD Allergy New Patient
{
  const ID = 'bwh-aerd-allergy'; const PFX = 'bwhaerd';
  const items = [
    display(`${PFX}.preamble`, 'Brigham AERD / Allergy & Clinical Immunology new patient intake.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.referringMD`, type:'string', text:'Name of referring physician' },
    group(`${PFX}.aerd-triad`, 'AERD / Samter\'s triad screening', [
      { linkId:`${PFX}.aerd-triad.asthma`,  type:'choice', text:'Do you have asthma?', answerOption: ynOpts },
      { linkId:`${PFX}.aerd-triad.nasal-polyps`, type:'choice', text:'Do you have nasal polyps?', answerOption: ynOpts },
      { linkId:`${PFX}.aerd-triad.aspirin-sensitivity`, type:'choice',
        text:'Have you ever had respiratory symptoms (wheezing, nasal congestion) after taking aspirin or NSAIDs?', answerOption: ynOpts },
      { linkId:`${PFX}.aerd-triad.sinus-surgery`, type:'choice', text:'Have you had sinus surgery?', answerOption: ynOpts },
      { linkId:`${PFX}.aerd-triad.surgery-count`, type:'integer', text:'How many sinus surgeries?',
        enableWhen:[{ question:`${PFX}.aerd-triad.sinus-surgery`, operator:'=', answerCoding:{ system: SYS.yn, code:'Y' } }] },
    ]),
    { linkId:`${PFX}.smellLoss`, type:'choice', text:'Have you lost your sense of smell?', answerOption: ynOpts },
    { linkId:`${PFX}.asthmaControl`, type:'choice', text:'How well-controlled is your asthma in the past month?',
      answerOption:[
        { extension:[ordinal(0)], valueCoding:{ code:'well',     display:'Well controlled' } },
        { extension:[ordinal(1)], valueCoding:{ code:'partial',  display:'Partially controlled' } },
        { extension:[ordinal(2)], valueCoding:{ code:'poor',     display:'Poorly controlled' } },
      ] },
    { linkId:`${PFX}.rescueInhalerFreq`, type:'choice', text:'How often do you use your rescue inhaler?',
      answerOption: ['<1/week','1–3/week','daily','multiple times daily'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
    meds(PFX), allergies(PFX),
    { linkId:`${PFX}.priorTreatments`, type:'text', text:'Prior treatments tried (aspirin desensitization, biologics, leukotriene modifiers, etc.)' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'BWHAERDAllergy', 'BWH AERD (Aspirin-Exacerbated Respiratory Disease) — New Patient Intake', 'Allergy / immunology — AERD', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// MGH Allergy & Immunology
{
  const ID = 'mgh-allergy-intake'; const PFX = 'mghallergy';
  const items = [
    display(`${PFX}.preamble`, 'MGH Boston Allergy & Immunology new patient packet. Please notify our office at least two business days prior if you need to reschedule.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.chiefComplaint`, type:'text', text:'Reason for visit / chief complaint' },
    group(`${PFX}.allergy-types`, 'Allergy types — check any that apply', [
      { linkId:`${PFX}.allergy-types.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Food allergy','Drug allergy','Environmental allergies','Insect sting allergy','Hives / urticaria','Angioedema','Asthma','Eczema / atopic dermatitis','Anaphylaxis','Eosinophilic esophagitis','Immune deficiency'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    { linkId:`${PFX}.epipen`, type:'boolean', text:'Do you carry an EpiPen / epinephrine auto-injector?' },
    { linkId:`${PFX}.priorReactions`, type:'text', text:'Describe past serious allergic reactions (anaphylaxis, hospitalizations, ED visits)' },
    meds(PFX), allergies(PFX),
    { linkId:`${PFX}.familyAtopy`, type:'text', text:'Family history of atopy, asthma, eczema, allergies' },
    { linkId:`${PFX}.pets`, type:'text', text:'Pets in the home' },
    { linkId:`${PFX}.housing`, type:'text', text:'Home environment (carpets, smoke exposure, mold)' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'MGHAllergyIntake', 'MGH Boston Allergy & Immunology — New Patient Packet', 'Allergy / immunology', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// UPMC Jameson Bariatrics New Patient Health History
{
  const ID = 'upmc-jameson-bariatrics'; const PFX = 'upmcbar';
  const items = [
    display(`${PFX}.preamble`, 'UPMC Jameson Bariatric Center New Patient Health History.', { category:'instructions' }),
    demographics(PFX),
    group(`${PFX}.measures`, 'Anthropometrics', [
      { linkId:`${PFX}.measures.height`, type:'quantity', text:'Height',
        extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[in_i]', display:'in' } }] },
      { linkId:`${PFX}.measures.weight`, type:'quantity', text:'Weight',
        extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[lb_av]', display:'lb' } }] },
      { linkId:`${PFX}.measures.bmi`,    type:'decimal',  text:'BMI (computed at visit if blank)' },
    ]),
    { linkId:`${PFX}.weightHistory`, type:'text', text:'Brief weight history (highest adult weight, weight at age 21, recent weight changes)' },
    group(`${PFX}.weightLossAttempts`, 'Prior weight-loss attempts', [
      { linkId:`${PFX}.weightLossAttempts.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Weight Watchers','Jenny Craig','Nutrisystem','Atkins','Keto','Intermittent fasting','Medically supervised diet','Anti-obesity medication','Bariatric surgery (prior)','Exercise programs','Behavioral therapy','Commercial app (Noom etc.)'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    group(`${PFX}.comorbidities`, 'Weight-related conditions (check all current)', [
      { linkId:`${PFX}.comorbidities.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Type 2 diabetes','Hypertension','High cholesterol','Obstructive sleep apnea','Fatty liver','GERD','Joint pain / osteoarthritis','PCOS','Infertility','Depression','Heart disease','Stroke','Asthma','Urinary stress incontinence'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    meds(PFX), allergies(PFX),
    group(`${PFX}.surgicalHistory`, 'Prior surgeries', [
      { linkId:`${PFX}.surgicalHistory.list`, type:'group', repeats:true,
        item:[
          { linkId:`${PFX}.surgicalHistory.list.procedure`, type:'string', text:'Procedure' },
          { linkId:`${PFX}.surgicalHistory.list.date`,      type:'date',   text:'Date' },
        ] },
    ]),
    group(`${PFX}.social`, 'Social history', [
      { linkId:`${PFX}.social.tobacco`, type:'choice', text:'Tobacco use',
        answerOption:['Never','Current','Former'].map(s=>({ valueCoding:{ code:s.toLowerCase(), display:s } })) },
      { linkId:`${PFX}.social.alcohol`, type:'string', text:'Alcohol use (drinks/week)' },
      { linkId:`${PFX}.social.exercise`,type:'text',   text:'Current exercise routine' },
      { linkId:`${PFX}.social.support`, type:'boolean', text:'Do you have family/partner support for surgery?' },
    ]),
    { linkId:`${PFX}.surgeryGoal`, type:'choice', text:'Which surgery are you most interested in?',
      answerOption:[
        { valueCoding:{ code:'sleeve',  display:'Sleeve gastrectomy' } },
        { valueCoding:{ code:'rygb',    display:'Roux-en-Y gastric bypass' } },
        { valueCoding:{ code:'sadi-ds', display:'Duodenal switch / SADI-S' } },
        { valueCoding:{ code:'undecided', display:'Undecided — want guidance' } },
      ] },
    { linkId:`${PFX}.questions`, type:'text', text:'Questions you have about bariatric surgery' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'UPMCJamesonBariatrics', 'UPMC Jameson Bariatric Center — New Patient Health History', 'Bariatric surgery', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// Hopkins Adult Consultation Schizophrenia
{
  const ID = 'hopkins-schizophrenia-consult'; const PFX = 'jhsz';
  const items = [
    display(`${PFX}.preamble`, 'Hopkins Adult Consultation Clinic — patient information only. A family member or provider may help complete this form if needed.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.preferredName`, type:'string', text:'Preferred name' },
    group(`${PFX}.dxHistory`, 'Diagnosis history', [
      { linkId:`${PFX}.dxHistory.firstSymptoms`, type:'text', text:'When did you first notice symptoms?' },
      { linkId:`${PFX}.dxHistory.priorDiagnoses`, type:'text', text:'Previous psychiatric diagnoses' },
      { linkId:`${PFX}.dxHistory.hospitalizations`, type:'group', repeats:true, text:'Prior psychiatric hospitalization',
        item:[
          { linkId:`${PFX}.dxHistory.hospitalizations.facility`, type:'string', text:'Facility' },
          { linkId:`${PFX}.dxHistory.hospitalizations.date`,     type:'date',   text:'Admission date' },
          { linkId:`${PFX}.dxHistory.hospitalizations.length`,   type:'string', text:'Length of stay' },
          { linkId:`${PFX}.dxHistory.hospitalizations.reason`,   type:'text',   text:'Reason' },
        ] },
    ]),
    group(`${PFX}.symptoms`, 'Current symptoms', [
      { linkId:`${PFX}.symptoms.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Hearing voices others don\'t hear','Seeing things others don\'t see','Believing others can read or control your thoughts','Believing you have special powers or a special mission','Disorganized thinking or speech','Withdrawing from people','Loss of motivation','Difficulty taking care of self','Sleep problems','Mood swings','Suicidal thoughts'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    meds(PFX), allergies(PFX),
    group(`${PFX}.priorTrials`, 'Antipsychotic medications previously tried', [
      { linkId:`${PFX}.priorTrials.list`, type:'group', repeats:true,
        item:[
          { linkId:`${PFX}.priorTrials.list.name`,      type:'string', text:'Medication' },
          { linkId:`${PFX}.priorTrials.list.dose`,      type:'string', text:'Dose' },
          { linkId:`${PFX}.priorTrials.list.duration`,  type:'string', text:'Duration' },
          { linkId:`${PFX}.priorTrials.list.response`,  type:'text',   text:'Response / why stopped' },
        ] },
    ]),
    { linkId:`${PFX}.familyHx`, type:'text', text:'Family history of schizophrenia, bipolar, or other major mental illness' },
    { linkId:`${PFX}.substanceHx`, type:'text', text:'History of alcohol or drug use' },
    { linkId:`${PFX}.functioning`, type:'text', text:'Current daily functioning — work, school, relationships, self-care' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'HopkinsSchizophreniaConsult', 'Johns Hopkins — Adult Consultation Clinic (Schizophrenia) Intake', 'Psychiatry / schizophrenia', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// MGH Vein Care Stoneham
{
  const ID = 'mgh-vein-care'; const PFX = 'mghvein';
  const items = [
    display(`${PFX}.preamble`, 'Massachusetts General Vein Care welcomes you. Please print clearly.', { category:'instructions' }),
    demographics(PFX),
    group(`${PFX}.complaint`, 'Vein concerns', [
      { linkId:`${PFX}.complaint.areas`, type:'open-choice', repeats:true, text:'Which areas are affected?',
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption: ['Right leg','Left leg','Both legs','Pelvic','Arms','Face / spider veins'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
      { linkId:`${PFX}.complaint.symptoms`, type:'open-choice', repeats:true, text:'Symptoms (check all that apply)',
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Aching','Throbbing','Heaviness','Itching','Burning','Cramps','Restless legs','Swelling','Skin discoloration','Open sore (ulcer)','Visible varicose veins','Spider veins'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
      { linkId:`${PFX}.complaint.duration`, type:'string', text:'How long have you had these symptoms?' },
      { linkId:`${PFX}.complaint.worseWhen`, type:'text',   text:'What makes symptoms worse?' },
      { linkId:`${PFX}.complaint.betterWhen`, type:'text',  text:'What helps?' },
    ]),
    { linkId:`${PFX}.compression`, type:'boolean', text:'Have you tried compression stockings?' },
    { linkId:`${PFX}.priorTreatments`, type:'open-choice', repeats:true, text:'Prior vein treatments',
      extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
      answerOption:['Sclerotherapy','Endovenous laser / radiofrequency','Vein stripping','Microphlebectomy','Foam sclerotherapy','None'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
    { linkId:`${PFX}.dvtHistory`, type:'boolean', text:'Personal history of deep vein thrombosis (DVT) or pulmonary embolism?' },
    { linkId:`${PFX}.familyHx`, type:'text', text:'Family history of varicose veins or blood clots' },
    meds(PFX), allergies(PFX),
    group(`${PFX}.female`, 'For female patients', [
      { linkId:`${PFX}.female.pregnancies`, type:'integer', text:'Number of pregnancies' },
      { linkId:`${PFX}.female.hormones`,    type:'boolean', text:'Currently taking estrogen / hormone replacement / oral contraception?' },
    ]),
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'MGHVeinCare', 'Massachusetts General Vein Care (Stoneham) — New Patient Packet', 'Vascular / vein', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// Stanford Valleycare GYN
{
  const ID = 'stanford-valleycare-gyn'; const PFX = 'stangyn';
  const items = [
    display(`${PFX}.preamble`, 'Stanford Valleycare Physicians Associates GYN new patient questionnaire.', { category:'instructions' }),
    demographics(PFX),
    group(`${PFX}.menstrual`, 'Menstrual history', [
      { linkId:`${PFX}.menstrual.menarcheAge`, type:'integer', text:'Age at first menstrual period' },
      { linkId:`${PFX}.menstrual.lmp`,         type:'date',    text:'Date of last menstrual period (LMP)' },
      { linkId:`${PFX}.menstrual.cycleLength`, type:'integer', text:'Usual cycle length (days)' },
      { linkId:`${PFX}.menstrual.duration`,    type:'integer', text:'Duration of menses (days)' },
      { linkId:`${PFX}.menstrual.flow`,        type:'choice',  text:'Flow',
        answerOption:['Light','Moderate','Heavy','Very heavy'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/\s+/g,'-'), display:s } })) },
      { linkId:`${PFX}.menstrual.painful`,     type:'boolean', text:'Painful periods (dysmenorrhea)?' },
      { linkId:`${PFX}.menstrual.menopause`,   type:'boolean', text:'Post-menopausal?' },
      { linkId:`${PFX}.menstrual.menopauseAge`, type:'integer', text:'Age at menopause',
        enableWhen:[{ question:`${PFX}.menstrual.menopause`, operator:'=', answerBoolean:true }] },
    ]),
    group(`${PFX}.obstetric`, 'Obstetric history (GTPAL)', [
      { linkId:`${PFX}.obstetric.G`, type:'integer', text:'G — total pregnancies' },
      { linkId:`${PFX}.obstetric.T`, type:'integer', text:'T — term births (≥37 wk)' },
      { linkId:`${PFX}.obstetric.P`, type:'integer', text:'P — preterm births' },
      { linkId:`${PFX}.obstetric.A`, type:'integer', text:'A — abortions (spontaneous + elective)' },
      { linkId:`${PFX}.obstetric.L`, type:'integer', text:'L — living children' },
    ]),
    group(`${PFX}.contraception`, 'Contraception', [
      { linkId:`${PFX}.contraception.current`, type:'choice', text:'Current method',
        answerOption:['None','Condoms','Combined oral pill','Progesterone-only pill','Hormonal IUD','Copper IUD','Implant','Depo-Provera','Patch','Ring','Tubal ligation','Vasectomy (partner)','Other'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
    ]),
    group(`${PFX}.screening`, 'Screening history', [
      { linkId:`${PFX}.screening.lastPap`,     type:'date', text:'Date of last Pap smear' },
      { linkId:`${PFX}.screening.lastMammogram`, type:'date', text:'Date of last mammogram' },
      { linkId:`${PFX}.screening.abnormalPap`,  type:'boolean', text:'Ever had an abnormal Pap result?' },
      { linkId:`${PFX}.screening.hpvVaccine`,   type:'boolean', text:'Received HPV vaccination?' },
    ]),
    group(`${PFX}.sexual`, 'Sexual & relationship history', [
      { linkId:`${PFX}.sexual.active`,    type:'boolean', text:'Currently sexually active?' },
      { linkId:`${PFX}.sexual.partners`,  type:'choice', text:'Partners',
        answerOption:[ { valueCoding:{ code:'men',   display:'Men' } },
                       { valueCoding:{ code:'women', display:'Women' } },
                       { valueCoding:{ code:'both',  display:'Both' } },
                       { valueCoding:{ code:'none',  display:'Not sexually active' } } ] },
      { linkId:`${PFX}.sexual.stiHistory`, type:'text',  text:'Past sexually transmitted infections' },
      { linkId:`${PFX}.sexual.painWithIntercourse`, type:'boolean', text:'Pain with intercourse (dyspareunia)?' },
      { linkId:`${PFX}.sexual.libido`, type:'text', text:'Concerns about libido or sexual function' },
    ]),
    meds(PFX), allergies(PFX),
    { linkId:`${PFX}.chiefComplaint`, type:'text', text:'Reason for today\'s visit' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'StanfordValleycareGYN', 'Stanford Valleycare Physicians Associates — New Patient GYN Questionnaire', 'Gynecology', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
