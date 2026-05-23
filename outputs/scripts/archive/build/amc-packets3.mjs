// AMC Packets, part 3: BWH Center for Brain/Mind, MGH High-Risk Skin Cancer,
// NYU Faculty Group Practice Demographic, NYU Multi-Physician (Gilbert et al.),
// BWH Pediatric Allergy New Patient.
import fs from 'node:fs';
import { questionnaire, group, display, ordinal, SYS, EXT } from '../lib.mjs';

const ynOpts = [
  { extension:[ordinal(0)], valueCoding:{ system: SYS.yn, code:'N', display:'No' } },
  { extension:[ordinal(1)], valueCoding:{ system: SYS.yn, code:'Y', display:'Yes' } },
];

function demographics(prefix) {
  return group(`${prefix}.demographics`, 'Demographics', [
    { linkId:`${prefix}.demographics.firstName`, type:'string', required:true, text:'First name' },
    { linkId:`${prefix}.demographics.lastName`,  type:'string', required:true, text:'Last name' },
    { linkId:`${prefix}.demographics.dob`,       type:'date',   required:true, text:'Date of birth' },
    { linkId:`${prefix}.demographics.address`,   type:'text',   text:'Home address' },
    { linkId:`${prefix}.demographics.phone`,     type:'string', text:'Phone' },
    { linkId:`${prefix}.demographics.email`,     type:'string', text:'Email' },
  ]);
}
function meds(prefix) {
  return group(`${prefix}.medications`, 'Current medications', [
    { linkId:`${prefix}.medications.list`, type:'group', repeats:true,
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
function shell(id, name, title, specialty, items) {
  return questionnaire({
    id, name, title,
    copyright: `${name} new-patient intake form. Reproduced for research-collection purposes.`,
    item: items,
    extra: { useContext: [{ code: { system: 'http://terminology.hl7.org/CodeSystem/usage-context-type', code:'focus' }, valueCodeableConcept: { text: specialty } }] },
  });
}

// BWH Center for Brain/Mind Medicine
{
  const ID = 'bwh-brain-mind'; const PFX = 'bwhbm';
  const items = [
    display(`${PFX}.preamble`, 'Brigham and Women\'s Center for Brain/Mind Medicine — new patient intake. Please answer each question to the best of your ability.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.handedness`, type:'choice', text:'Are you right- or left-handed?',
      answerOption:[
        { valueCoding:{ code:'right',   display:'Right-handed' } },
        { valueCoding:{ code:'left',    display:'Left-handed' } },
        { valueCoding:{ code:'ambi',    display:'Ambidextrous' } },
      ] },
    { linkId:`${PFX}.education`, type:'integer', text:'Years of education completed' },
    { linkId:`${PFX}.occupation`, type:'string', text:'Current or most recent occupation' },
    { linkId:`${PFX}.referringMD`, type:'string', text:'Referring physician' },
    group(`${PFX}.chiefComplaint`, 'Chief complaint', [
      { linkId:`${PFX}.chiefComplaint.problem`, type:'text', text:'What problem brings you to the Brain/Mind Center?' },
      { linkId:`${PFX}.chiefComplaint.onset`,   type:'string', text:'When did the problem begin?' },
      { linkId:`${PFX}.chiefComplaint.course`,  type:'choice', text:'How has the problem changed over time?',
        answerOption:['Stable','Getting worse','Getting better','Fluctuating'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/\s+/g,'-'), display:s } })) },
    ]),
    group(`${PFX}.cognitiveSymptoms`, 'Cognitive symptoms — check any that apply', [
      { linkId:`${PFX}.cognitiveSymptoms.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Short-term memory loss','Long-term memory loss','Word-finding difficulty','Getting lost in familiar places','Difficulty with directions or maps','Trouble managing finances or bills','Trouble using everyday appliances','Difficulty following conversations','Repeating questions or stories','Forgetting names of family members'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    group(`${PFX}.behavioralSymptoms`, 'Behavioral / mood symptoms', [
      { linkId:`${PFX}.behavioralSymptoms.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Depression','Anxiety','Apathy / loss of motivation','Agitation','Hallucinations','Delusions','Personality changes','Disinhibited behavior','Compulsive behavior','Sleep disturbance','REM behavior disorder (acting out dreams)'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    { linkId:`${PFX}.motorSymptoms`, type:'text', text:'Movement / motor symptoms (tremor, slowness, falls, gait changes)' },
    { linkId:`${PFX}.priorEval`, type:'text', text:'Prior neurology / psychiatry evaluations; please list provider names and approximate dates' },
    { linkId:`${PFX}.imaging`, type:'text', text:'Prior brain imaging (MRI, CT, PET) — date and where' },
    meds(PFX), allergies(PFX),
    { linkId:`${PFX}.familyHx`, type:'text', text:'Family history of dementia, Parkinson\'s, or other neurodegenerative diseases' },
    { linkId:`${PFX}.adlsAffected`, type:'text', text:'Activities of daily living that have become harder' },
    { linkId:`${PFX}.caregiver`, type:'string', text:'Caregiver / informant name & relationship' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'BWHBrainMind', 'BWH Center for Brain/Mind Medicine — New Patient Intake', 'Neurology / cognitive', items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// MGH High-Risk Skin Cancer Clinic (transplant + immunosuppressed)
{
  const ID = 'mgh-hrscc'; const PFX = 'mghhrscc';
  const items = [
    display(`${PFX}.preamble`, 'High Risk Skin Cancer Clinic New Patient History.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.physicianName`, type:'string', text:'Referring physician' },
    group(`${PFX}.transplant`, 'Transplant history', [
      { linkId:`${PFX}.transplant.hadTransplant`, type:'boolean', text:'Have you had an organ transplant?' },
      { linkId:`${PFX}.transplant.organ`, type:'choice', text:'Which organ?',
        enableWhen:[{ question:`${PFX}.transplant.hadTransplant`, operator:'=', answerBoolean:true }],
        answerOption:['Kidney','Liver','Heart','Lung','Pancreas','Bone marrow / stem cell','Other'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
      { linkId:`${PFX}.transplant.date`, type:'date', text:'Date of transplant',
        enableWhen:[{ question:`${PFX}.transplant.hadTransplant`, operator:'=', answerBoolean:true }] },
    ]),
    group(`${PFX}.immunosuppression`, 'Immunosuppression', [
      { linkId:`${PFX}.immunosuppression.list`, type:'open-choice', repeats:true, text:'Immunosuppressant medications',
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Tacrolimus','Cyclosporine','Sirolimus / Everolimus','Mycophenolate','Azathioprine','Prednisone','Other'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
    ]),
    group(`${PFX}.skinHistory`, 'Skin-cancer history', [
      { linkId:`${PFX}.skinHistory.bcc`,  type:'integer', text:'Number of prior basal cell carcinomas' },
      { linkId:`${PFX}.skinHistory.scc`,  type:'integer', text:'Number of prior squamous cell carcinomas' },
      { linkId:`${PFX}.skinHistory.melanoma`, type:'integer', text:'Number of prior melanomas' },
      { linkId:`${PFX}.skinHistory.other`, type:'text', text:'Other skin cancers (Merkel cell, T-cell lymphoma, etc.)' },
    ]),
    group(`${PFX}.suntan`, 'Sun exposure & skin type', [
      { linkId:`${PFX}.suntan.fitzpatrick`, type:'choice', text:'Skin type (Fitzpatrick I–VI)',
        answerOption: ['I — Always burns, never tans','II — Burns easily, tans poorly','III — Burns sometimes, tans gradually','IV — Burns minimally, always tans well','V — Rarely burns, tans deeply','VI — Never burns, deeply pigmented'].map(s=>({ valueCoding:{ code:s.slice(0, s.indexOf(' ')).toLowerCase(), display:s } })) },
      { linkId:`${PFX}.suntan.tanningBeds`, type:'boolean', text:'Have you used tanning beds?' },
      { linkId:`${PFX}.suntan.sunburns`, type:'integer', text:'Approximate number of blistering sunburns in your lifetime' },
    ]),
    meds(PFX), allergies(PFX),
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'MGHHighRiskSkinCancer', 'MGH High-Risk Skin Cancer Clinic — New Patient History', 'Dermatology / transplant skin cancer', items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// NYU Faculty Group Practice Demographic
{
  const ID = 'nyu-fgp-demographic'; const PFX = 'nyufgp';
  const items = [
    display(`${PFX}.preamble`, 'NYU Faculty Group Practice — patient demographic form.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.maritalStatus`, type:'choice', text:'Marital status',
      answerOption:['Single','Married','Divorced','Widowed','Separated','Partner','Other'].map(s=>({ valueCoding:{ code:s.toLowerCase(), display:s } })) },
    { linkId:`${PFX}.employer`, type:'string', text:'Employer' },
    { linkId:`${PFX}.occupation`, type:'string', text:'Occupation' },
    { linkId:`${PFX}.ssn`, type:'string', text:'Social Security Number',
      extension:[{ url: EXT.regex, valueString:'^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$' }] },
    group(`${PFX}.race`, 'Race & ethnicity', [
      { linkId:`${PFX}.race.ethnicity`, type:'choice', text:'Ethnicity',
        answerOption:[
          { valueCoding:{ code:'hispanic',     display:'Hispanic or Latino' } },
          { valueCoding:{ code:'non-hispanic', display:'Not Hispanic or Latino' } },
          { valueCoding:{ code:'decline',      display:'Decline to answer' } },
        ] },
      { linkId:`${PFX}.race.list`, type:'open-choice', repeats:true, text:'Race (select all that apply)',
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['American Indian or Alaska Native','Asian','Black or African American','Native Hawaiian or Other Pacific Islander','White','Decline to answer'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
    ]),
    group(`${PFX}.emergency`, 'Emergency contact', [
      { linkId:`${PFX}.emergency.name`,         type:'string', text:'Name' },
      { linkId:`${PFX}.emergency.relationship`, type:'string', text:'Relationship' },
      { linkId:`${PFX}.emergency.phone`,        type:'string', text:'Phone' },
    ]),
    group(`${PFX}.primaryInsurance`, 'Primary insurance', [
      { linkId:`${PFX}.primaryInsurance.company`,   type:'string', text:'Insurance company' },
      { linkId:`${PFX}.primaryInsurance.memberId`,  type:'string', text:'Member ID' },
      { linkId:`${PFX}.primaryInsurance.groupId`,   type:'string', text:'Group #' },
      { linkId:`${PFX}.primaryInsurance.subscriber`,type:'string', text:'Subscriber name (if not self)' },
    ]),
    group(`${PFX}.secondaryInsurance`, 'Secondary insurance', [
      { linkId:`${PFX}.secondaryInsurance.company`, type:'string', text:'Insurance company' },
      { linkId:`${PFX}.secondaryInsurance.memberId`,type:'string', text:'Member ID' },
      { linkId:`${PFX}.secondaryInsurance.groupId`, type:'string', text:'Group #' },
    ]),
    { linkId:`${PFX}.preferredPharmacy`, type:'text', text:'Preferred pharmacy (name, address, phone)' },
    { linkId:`${PFX}.advanceDirective`, type:'boolean', text:'Do you have an advance directive on file?' },
  ];
  // Fix the bad backtick/quote on primaryInsurance.subscriber
  const fixed = JSON.parse(JSON.stringify(items).replace(/\$\{PFX\}/g, PFX));
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'NYUFGPDemographic', 'NYU Faculty Group Practice — Patient Demographic Form', 'Multi-specialty / demographics', fixed), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// NYU Multi-physician (Gilbert/Nirenberg/Brys/Fleisher) — neurosurgery / neuro composite
{
  const ID = 'nyu-multi-physician-neuro'; const PFX = 'nyumulti';
  const items = [
    display(`${PFX}.preamble`, 'New patient forms for NYU multi-physician practice (Dr. Gilbert, Nirenberg, Brys, Fleisher). Complete all sections.', { category:'instructions' }),
    demographics(PFX),
    group(`${PFX}.chiefComplaint`, 'Chief complaint', [
      { linkId:`${PFX}.chiefComplaint.problem`, type:'text', text:'Major neurological problem' },
      { linkId:`${PFX}.chiefComplaint.onset`,   type:'string', text:'When did it begin?' },
    ]),
    group(`${PFX}.systems`, 'Neurological symptoms (check current)', [
      { linkId:`${PFX}.systems.list`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Headache','Memory loss','Cognitive changes','Seizures','Loss of consciousness','Weakness','Numbness/tingling','Vertigo / balance problems','Vision changes','Difficulty speaking','Difficulty swallowing','Tremor','Stiffness / slowness','Falls','Sleep changes','Pain'].map(s=>({ valueCoding:{ code:s.toLowerCase().replace(/[^a-z0-9]+/g,'-'), display:s } })) },
    ]),
    group(`${PFX}.surgicalHistory`, 'Prior neurologic / spinal / cranial surgeries', [
      { linkId:`${PFX}.surgicalHistory.list`, type:'group', repeats:true,
        item:[
          { linkId:`${PFX}.surgicalHistory.list.procedure`, type:'string', text:'Procedure' },
          { linkId:`${PFX}.surgicalHistory.list.date`,      type:'date',   text:'Date' },
          { linkId:`${PFX}.surgicalHistory.list.surgeon`,   type:'string', text:'Surgeon' },
        ] },
    ]),
    meds(PFX), allergies(PFX),
    { linkId:`${PFX}.priorImaging`, type:'text', text:'Prior MRI / CT / EMG — date, where performed' },
    { linkId:`${PFX}.functionalStatus`, type:'text', text:'How are your symptoms affecting work, driving, ADLs?' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'NYUMultiPhysicianNeuro', 'NYU Multi-Physician New Patient Forms (Gilbert, Nirenberg, Brys, Fleisher)', 'Neurology / neurosurgery', items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// BWH Pediatric Allergy New Patient
{
  const ID = 'bwh-pediatric-allergy'; const PFX = 'bwhpedall';
  const items = [
    display(`${PFX}.preamble`, 'Brigham and Women\'s Pediatric Allergy & Clinical Immunology — new patient form. To be completed by parent/guardian.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.pediatrician`, type:'string', text:"Child's pediatrician (name and phone)" },
    group(`${PFX}.referringMD`, 'Referring physician', [
      { linkId:`${PFX}.referringMD.name`,  type:'string', text:'Name' },
      { linkId:`${PFX}.referringMD.phone`, type:'string', text:'Phone' },
    ]),
    { linkId:`${PFX}.chiefComplaint`, type:'text', text:'Reason for the visit' },
    group(`${PFX}.allergies`, 'Suspected allergies — check any that apply', [
      { linkId:`${PFX}.allergies.types`, type:'open-choice', repeats:true,
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:['Food allergy','Drug allergy','Environmental / hay fever','Insect sting','Hives','Eczema','Asthma','Anaphylaxis','Eosinophilic esophagitis','Immune deficiency'].map(s=>({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })) },
      { linkId:`${PFX}.allergies.foodReactions`, type:'text', text:'Specific food reactions (which foods, what happened, how soon after eating)' },
      { linkId:`${PFX}.allergies.firstReaction`, type:'date', text:'Date of first reaction (approximate)' },
      { linkId:`${PFX}.allergies.priorTesting`, type:'text', text:'Prior allergy testing (skin prick, RAST, food challenge) — when and results' },
    ]),
    { linkId:`${PFX}.epiPen`, type:'boolean', text:'Does the child carry epinephrine auto-injector?' },
    { linkId:`${PFX}.daycareSchool`, type:'text', text:'Daycare / school environment, action plan on file?' },
    group(`${PFX}.birthHistory`, 'Birth & feeding history', [
      { linkId:`${PFX}.birthHistory.term`,  type:'choice', text:'Born at term?', answerOption: ynOpts },
      { linkId:`${PFX}.birthHistory.gestation`, type:'integer', text:'Gestational age at birth (weeks)' },
      { linkId:`${PFX}.birthHistory.delivery`, type:'choice', text:'Delivery',
        answerOption:[
          { valueCoding:{ code:'vaginal',   display:'Vaginal' } },
          { valueCoding:{ code:'c-section', display:'Cesarean' } },
        ] },
      { linkId:`${PFX}.birthHistory.breastfeeding`, type:'text', text:'Breastfeeding history (duration, supplementation)' },
      { linkId:`${PFX}.birthHistory.formulaType`, type:'string', text:'Formula type, if used' },
      { linkId:`${PFX}.birthHistory.firstFoods`, type:'text', text:'When were solid foods introduced and what?' },
    ]),
    meds(PFX),
    { linkId:`${PFX}.familyHx`, type:'text', text:'Family history of allergy, asthma, eczema, immune disease' },
    { linkId:`${PFX}.pets`, type:'text', text:'Pets in the home' },
    { linkId:`${PFX}.smokeExposure`, type:'boolean', text:'Smoke exposure in the home?' },
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(shell(ID, 'BWHPediatricAllergy', 'BWH Pediatric Allergy & Clinical Immunology — New Patient Intake', 'Pediatric allergy', items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
