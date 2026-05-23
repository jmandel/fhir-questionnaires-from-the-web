// AMC New Patient Intake Packets — one Questionnaire per source PDF.
// Covers: Cleveland Clinic Union, Stanford Ortho, Stanford IR (4 demographic variants),
// MGH Adult Dermatology, MGH HRSCC, MGH Allergy, BWH Neurosurgery, BWH AERD, BWH Pediatric Allergy,
// BWH Brain-Mind, NYU Fresco, NYU Faculty Group, NYU Multi-physician,
// Hopkins Adult Consultation, UPMC Jameson Bariatrics, Stanford Valleycare GYN,
// Stanford Fibroid, MGH Vein Care Stoneham.
import fs from 'node:fs';
import { questionnaire, group, display, ordinal, variable, SYS, EXT } from '../lib.mjs';

const ynOpts = [
  { extension:[ordinal(0)], valueCoding:{ system: SYS.yn, code:'N', display:'No' } },
  { extension:[ordinal(1)], valueCoding:{ system: SYS.yn, code:'Y', display:'Yes' } },
];

// Common demographics block
function demographics(prefix) {
  return group(`${prefix}.demographics`, 'Demographics', [
    { linkId:`${prefix}.demographics.lastName`,  type:'string', required:true, text:'Last name' },
    { linkId:`${prefix}.demographics.firstName`, type:'string', required:true, text:'First name' },
    { linkId:`${prefix}.demographics.mi`,        type:'string', text:'Middle initial', maxLength: 2 },
    { linkId:`${prefix}.demographics.dob`,       type:'date', required:true, text:'Date of birth' },
    { linkId:`${prefix}.demographics.age`,       type:'integer', text:'Age' },
    { linkId:`${prefix}.demographics.sex`,       type:'choice', text:'Sex',
      answerOption:[
        { valueCoding:{ system: SYS.adminGender, code:'female', display:'Female' } },
        { valueCoding:{ system: SYS.adminGender, code:'male',   display:'Male' } },
        { valueCoding:{ system: SYS.adminGender, code:'other',  display:'Other' } },
      ] },
    { linkId:`${prefix}.demographics.address`,   type:'text', text:'Home address' },
    { linkId:`${prefix}.demographics.city`,      type:'string', text:'City' },
    { linkId:`${prefix}.demographics.state`,     type:'string', text:'State', maxLength: 2 },
    { linkId:`${prefix}.demographics.zip`,       type:'string', text:'ZIP',
      extension:[{ url: EXT.regex, valueString:'^[0-9]{5}(-[0-9]{4})?$' }] },
    { linkId:`${prefix}.demographics.homePhone`, type:'string', text:'Home phone',
      extension:[{ url: EXT.entryFormat, valueString:'nnn-nnn-nnnn' }] },
    { linkId:`${prefix}.demographics.cellPhone`, type:'string', text:'Cell phone',
      extension:[{ url: EXT.entryFormat, valueString:'nnn-nnn-nnnn' }] },
    { linkId:`${prefix}.demographics.workPhone`, type:'string', text:'Work phone' },
    { linkId:`${prefix}.demographics.email`,     type:'string', text:'Email',
      extension:[{ url: EXT.regex, valueString:'^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }] },
  ]);
}

function insurance(prefix, kind='Primary') {
  const slug = kind.toLowerCase();
  return group(`${prefix}.insurance.${slug}`, `${kind} insurance`, [
    { linkId:`${prefix}.insurance.${slug}.company`,     type:'string', text:'Insurance company' },
    { linkId:`${prefix}.insurance.${slug}.policy`,      type:'string', text:'Policy / Member ID #' },
    { linkId:`${prefix}.insurance.${slug}.group`,       type:'string', text:'Group #' },
    { linkId:`${prefix}.insurance.${slug}.subscriber`,  type:'string', text:'Subscriber name' },
    { linkId:`${prefix}.insurance.${slug}.subscriberDob`,type:'date',  text:'Subscriber DOB' },
    { linkId:`${prefix}.insurance.${slug}.relationship`,type:'string', text:'Subscriber relationship to patient' },
  ]);
}

function providers(prefix) {
  return group(`${prefix}.providers`, 'Care team', [
    group(`${prefix}.providers.pcp`, 'Primary care physician', [
      { linkId:`${prefix}.providers.pcp.name`,    type:'string', text:'Name' },
      { linkId:`${prefix}.providers.pcp.address`, type:'text',   text:'Address' },
      { linkId:`${prefix}.providers.pcp.phone`,   type:'string', text:'Phone' },
      { linkId:`${prefix}.providers.pcp.fax`,     type:'string', text:'Fax' },
    ]),
    group(`${prefix}.providers.referring`, 'Referring physician', [
      { linkId:`${prefix}.providers.referring.name`,      type:'string', text:'Name' },
      { linkId:`${prefix}.providers.referring.specialty`, type:'string', text:'Specialty' },
      { linkId:`${prefix}.providers.referring.address`,   type:'text',   text:'Address' },
      { linkId:`${prefix}.providers.referring.phone`,     type:'string', text:'Phone' },
      { linkId:`${prefix}.providers.referring.fax`,       type:'string', text:'Fax' },
    ]),
  ]);
}

function meds(prefix) {
  return group(`${prefix}.medications`, 'Current medications', [
    { linkId:`${prefix}.medications.list`, type:'group', repeats:true, text:'Medication',
      extension:[{ url: EXT.minOccurs, valueInteger:0 },{ url: EXT.maxOccurs, valueInteger:30 }],
      item:[
        { linkId:`${prefix}.medications.list.name`,      type:'string', text:'Medication name' },
        { linkId:`${prefix}.medications.list.dose`,      type:'string', text:'Dose' },
        { linkId:`${prefix}.medications.list.frequency`, type:'string', text:'Frequency / how often' },
        { linkId:`${prefix}.medications.list.reason`,    type:'string', text:'Reason taking' },
      ] },
  ]);
}

function allergies(prefix) {
  return group(`${prefix}.allergies`, 'Allergies', [
    { linkId:`${prefix}.allergies.list`, type:'group', repeats:true, text:'Allergy',
      item:[
        { linkId:`${prefix}.allergies.list.substance`, type:'string', text:'Substance (medication, food, latex, other)' },
        { linkId:`${prefix}.allergies.list.reaction`,  type:'text',   text:'What happens / type of reaction' },
      ] },
  ]);
}

function rosCheck(prefix, slug, label, symptoms) {
  return {
    linkId:`${prefix}.ros.${slug}`, type:'open-choice', repeats:true,
    text: label,
    extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
    answerOption: symptoms.map(s => ({ valueCoding:{ code: s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), display: s } })),
  };
}

// Helper to build a baseline AMC Questionnaire shell that we then customize
function amcShell(id, name, title, specialty, copyright, extraItems = []) {
  return questionnaire({
    id, name, title,
    copyright: copyright || `${name} new-patient intake form. Reproduced for research-collection purposes.`,
    item: extraItems,
    extra: { useContext: [{ code: { system: 'http://terminology.hl7.org/CodeSystem/usage-context-type', code:'focus' }, valueCodeableConcept: { text: specialty } }] },
  });
}

// ─── Cleveland Clinic Union Physician Services — Patient Intake ─────────────
{
  const ID = 'cc-union-intake'; const PFX = 'ccunion';
  const symptoms = [
    'Abdominal Pain','Back Pain','Blood in Urine','Bloody/tarry stool','Bruise Easily','Change in bowel habits','Chest Pain','Cold numb feet','Constipation','Convulsions/Seizures','Cough',
    'Frequent Urination','Hair Loss','Headaches','Hemorrhoids','Hernia','Hives','Hoarseness','Indigestion/Heartburn','Insomnia','Joint Pain','Leg Pain',
    'Nosebleeds','Numbness/Tingling','Pain/Bleeding during Sex','Painful Urination','Phobias','Rashes','Ringing in Ears','Sexual Dysfunction','Shortness of Breath','Sinus Trouble','Sore Throat',
    'Swollen glands','Trembling hands','Vision changes','Weight gain','Weight loss','Wheezing',
  ];
  const items = [
    display(`${PFX}.preamble`, 'Please complete every section. Bring your insurance card and a photo ID to your appointment.', { category:'instructions' }),
    demographics(PFX),
    group(`${PFX}.identity`, 'Identity & social', [
      { linkId:`${PFX}.identity.ssn`, type:'string', text:'Social Security Number', extension:[{ url: EXT.regex, valueString:'^[0-9]{3}-?[0-9]{2}-?[0-9]{4}$' }] },
      { linkId:`${PFX}.identity.language`, type:'string', text:'Primary language spoken' },
      { linkId:`${PFX}.identity.ethnicity`, type:'choice', text:'Ethnicity',
        answerOption:[
          { valueCoding:{ code:'non-hispanic', display:'Non-Hispanic' } },
          { valueCoding:{ code:'hispanic',     display:'Hispanic' } },
          { valueCoding:{ code:'other',        display:'Other' } },
        ] },
      { linkId:`${PFX}.identity.race`, type:'open-choice', repeats:true, text:'Race (select all that apply)',
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption: ['African American','Asian','Caucasian','Hispanic','Native American','Other'].map(r=>({ valueCoding:{ code: r.toLowerCase().replace(/\s+/g,'-'), display:r } })) },
      { linkId:`${PFX}.identity.maritalStatus`, type:'choice', text:'Marital status',
        answerOption:['Married','Single','Widowed','Divorced'].map(s=>({ valueCoding:{ code:s.toLowerCase(), display:s } })) },
      { linkId:`${PFX}.identity.spouseName`, type:'string', text:'Spouse name' },
      { linkId:`${PFX}.identity.spouseDob`,  type:'date',   text:'Spouse date of birth' },
      { linkId:`${PFX}.identity.employer`,   type:'string', text:'Employer' },
    ]),
    providers(PFX),
    insurance(PFX, 'Primary'),
    insurance(PFX, 'Secondary'),
    group(`${PFX}.emergency`, 'Emergency contacts / Release of information', [
      { linkId:`${PFX}.emergency.contacts`, type:'group', repeats:true,
        extension:[{ url: EXT.minOccurs, valueInteger:1 },{ url: EXT.maxOccurs, valueInteger:3 }],
        text:'Emergency contact (also marks who we may release information to)',
        item:[
          { linkId:`${PFX}.emergency.contacts.name`,         type:'string', required:true, text:'Name' },
          { linkId:`${PFX}.emergency.contacts.phone`,        type:'string', required:true, text:'Phone' },
          { linkId:`${PFX}.emergency.contacts.relationship`, type:'string', text:'Relationship' },
          { linkId:`${PFX}.emergency.contacts.isEmergency`,  type:'boolean', text:'Emergency contact?' },
          { linkId:`${PFX}.emergency.contacts.canReceiveROI`,type:'boolean', text:'Authorized for release of information?' },
        ] },
      { linkId:`${PFX}.emergency.communication`, type:'open-choice', repeats:true,
        text:'Communication preferences',
        extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
        answerOption:[
          { valueCoding:{ code:'message-ok',       display:'Message may be left' } },
          { valueCoding:{ code:'answering-machine',display:'Answering machine OK' } },
          { valueCoding:{ code:'family-member',    display:'Family member' } },
        ] },
      { linkId:`${PFX}.emergency.livingWill`,  type:'boolean', text:'Do you have a Living Will?' },
      { linkId:`${PFX}.emergency.dpoa`,        type:'boolean', text:'Do you have a Durable Power of Attorney for health care?' },
      { linkId:`${PFX}.emergency.dpoaName`,    type:'string',  text:'DPOA name',
        enableWhen:[{ question:`${PFX}.emergency.dpoa`, operator:'=', answerBoolean:true }] },
      { linkId:`${PFX}.emergency.dpoaPhone`,   type:'string',  text:'DPOA phone',
        enableWhen:[{ question:`${PFX}.emergency.dpoa`, operator:'=', answerBoolean:true }] },
    ]),
    group(`${PFX}.vitals`, 'Vitals', [
      { linkId:`${PFX}.vitals.height`, type:'quantity', text:'Height',
        extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[in_i]', display:'in' } }] },
      { linkId:`${PFX}.vitals.weight`, type:'quantity', text:'Weight',
        extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[lb_av]', display:'lb' } }] },
    ]),
    group(`${PFX}.symptoms`, 'Current symptoms / reason for visit', [
      { linkId:`${PFX}.symptoms.list`, type:'group', repeats:true,
        extension:[{ url: EXT.minOccurs, valueInteger:1 },{ url: EXT.maxOccurs, valueInteger:5 }],
        item:[
          { linkId:`${PFX}.symptoms.list.complaint`, type:'string', required:true, text:'Symptom / complaint' },
          { linkId:`${PFX}.symptoms.list.duration`,  type:'string', text:'Length of time' },
        ] },
      { linkId:`${PFX}.symptoms.workRelated`,   type:'boolean', text:'Are your symptoms work-related?' },
      { linkId:`${PFX}.symptoms.injuryRelated`, type:'boolean', text:'Are your symptoms injury-related?' },
      { linkId:`${PFX}.symptoms.stoppedWork`,   type:'boolean', text:'Did you stop working?' },
      { linkId:`${PFX}.symptoms.returnedWork`,  type:'boolean', text:'Did you return to work?',
        enableWhen:[{ question:`${PFX}.symptoms.stoppedWork`, operator:'=', answerBoolean:true }] },
      { linkId:`${PFX}.symptoms.recentTesting`, type:'group', repeats:true, text:'Recent testing (last 6 months)',
        item:[
          { linkId:`${PFX}.symptoms.recentTesting.name`, type:'string', text:'Test name' },
          { linkId:`${PFX}.symptoms.recentTesting.date`, type:'date',   text:'Date' },
        ] },
      rosCheck(PFX, 'current', 'Current symptoms — check all that apply', symptoms),
    ]),
    meds(PFX), allergies(PFX),
    group(`${PFX}.signature`, 'Signature', [
      { linkId:`${PFX}.signature.printName`, type:'string', text:'Print name' },
      { linkId:`${PFX}.signature.signature`, type:'string', text:'Signature' },
      { linkId:`${PFX}.signature.date`,      type:'date',   text:'Date' },
    ]),
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(amcShell(ID, 'CCUnionIntake', 'Cleveland Clinic — Union Physician Services Patient Intake', 'Primary care / multispecialty', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── Stanford Interventional Radiology — DVT New Patient Intake ─────────────
// (Also covers IVC Filter, Fibroid, base demographic — all same shape)
function stanfordIRTemplate(id, name, title, clinicName, conditionLabel) {
  const PFX = id.replace(/-/g,'').slice(0, 12);
  const items = [
    display(`${PFX}.preamble`, `${clinicName}. Please complete and return to initiate the scheduling process. Thank you!`, { category:'instructions' }),
    demographics(PFX),
    group(`${PFX}.condition`, `${conditionLabel} history`, [
      { linkId:`${PFX}.condition.onset`,    type:'date',   text:`When did your ${conditionLabel.toLowerCase()} symptoms begin?` },
      { linkId:`${PFX}.condition.dxDate`,   type:'date',   text:`When was your ${conditionLabel} diagnosed?` },
      { linkId:`${PFX}.condition.symptoms`, type:'text',   text:'What were those symptoms and have they changed?' },
      { linkId:`${PFX}.condition.imaging`,  type:'text',   text:'What type of imaging have you had, and when?' },
      { linkId:`${PFX}.condition.bloodThinners`, type:'text', text:'Were you started on blood thinners? If so, when?' },
      { linkId:`${PFX}.condition.clotDisorder`,  type:'text', text:'Have you been diagnosed with a blood clotting disorder?' },
      { linkId:`${PFX}.condition.priorTx`,  type:'text', text:'What other treatments have been attempted?' },
      { linkId:`${PFX}.condition.otherHistory`, type:'text', text:'Other history you feel we should know' },
    ]),
    providers(PFX),
    insurance(PFX, 'Primary'),
  ];
  fs.writeFileSync(`questionnaires/${id}.json`,
    JSON.stringify(amcShell(id, name, title, 'Interventional radiology', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${id}.json`);
}
stanfordIRTemplate('stanford-ir-dvt',          'StanfordIRDVT',         'Stanford Interventional Radiology — DVT Clinic New Patient Intake',          'Stanford Interventional Radiology — DVT Clinic',           'DVT');
stanfordIRTemplate('stanford-ir-ivc',          'StanfordIRIVC',         'Stanford Interventional Radiology — IVC Filter Clinic Demographics',        'Stanford Interventional Radiology — IVC Filter Clinic',    'IVC filter');
stanfordIRTemplate('stanford-ir-fibroid',      'StanfordIRFibroid',     'Stanford Interventional Radiology — Fibroid Center Demographics',           'Stanford Fibroid Center',                                  'Fibroid');
stanfordIRTemplate('stanford-ir-demographics', 'StanfordIRDemographics','Stanford Interventional Radiology — Base Demographics Form',                'Stanford Interventional Radiology',                        'Vascular');

// ─── Stanford Ortho New Patient Questionnaire (8 pages, condensed) ──────────
{
  const ID = 'stanford-ortho-intake'; const PFX = 'stanortho';
  const sliderExt = [
    { url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'slider' }] } },
    { url: EXT.minValue, valueInteger:0 },{ url: EXT.maxValue, valueInteger:10 },{ url: EXT.sliderStepValue, valueInteger:1 },
  ];
  const cardio = ['Hypertension (high blood pressure)','Irregular heartbeat (cardiac arrhythmia)','Coronary artery disease / Angioplasty / Stent / Bypass surgery','Myocardial infarction (heart attack)','Cardiomyopathy / Congestive heart failure'];
  const items = [
    display(`${PFX}.preamble`, 'Please complete every section before your appointment.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.weight`, type:'quantity', text:'Weight',
      extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[lb_av]', display:'lb' } }] },
    { linkId:`${PFX}.height`, type:'quantity', text:'Height',
      extension:[{ url: EXT.unit, valueCoding:{ system:'http://unitsofmeasure.org', code:'[in_i]', display:'in' } }] },
    providers(PFX),
    { linkId:`${PFX}.reasonForVisit`, type:'text', text:'Reason for visit', required:true },
    group(`${PFX}.goals`, 'Goals for today', [
      { linkId:`${PFX}.goals.goal1`, type:'text', text:'Goal 1' },
      { linkId:`${PFX}.goals.goal2`, type:'text', text:'Goal 2' },
    ]),
    group(`${PFX}.difficultActivities`, 'Three activities limited by your musculoskeletal problem (0 = unable; 10 = at prior level)',
      [1,2,3].map(n => group(`${PFX}.difficultActivities.a${n}`, `Activity ${n}`, [
        { linkId:`${PFX}.difficultActivities.a${n}.description`, type:'string', text:'Activity' },
        { linkId:`${PFX}.difficultActivities.a${n}.rating`,      type:'integer', text:'Ability rating', extension: sliderExt },
      ]))),
    group(`${PFX}.surgicalHistory`, 'Prior hospitalizations, major surgeries, serious injuries', [
      { linkId:`${PFX}.surgicalHistory.entries`, type:'group', repeats:true,
        extension:[{ url: EXT.minOccurs, valueInteger:0 },{ url: EXT.maxOccurs, valueInteger:15 }],
        item:[
          { linkId:`${PFX}.surgicalHistory.entries.date`,     type:'date',   text:'Approximate date (month/year)' },
          { linkId:`${PFX}.surgicalHistory.entries.reason`,   type:'string', text:'Reason' },
          { linkId:`${PFX}.surgicalHistory.entries.hospital`, type:'string', text:'Hospital name / location' },
        ] },
    ]),
    meds(PFX), allergies(PFX),
    group(`${PFX}.pastMedicalHistory`, 'Past medical history — circle Yes/No for each',
      [
        ['cardiovascular','Cardiovascular conditions / heart disease',  cardio],
        ['pulmonary',     'Pulmonary conditions',  ['Asthma','COPD/emphysema','Sleep apnea','Pulmonary embolism','Recent pneumonia']],
        ['endocrine',     'Endocrine conditions',  ['Diabetes (type 1 or 2)','Thyroid disease','Adrenal disease']],
        ['neurologic',    'Neurologic conditions', ['Seizures','Stroke / TIA','Migraine','Multiple sclerosis','Parkinson\'s disease','Peripheral neuropathy']],
        ['musculoskeletal','Musculoskeletal',       ['Osteoarthritis','Rheumatoid arthritis','Osteoporosis','Gout','Chronic back pain','Joint replacement']],
        ['onc-heme',      'Cancer / blood',         ['Cancer (any type)','Bleeding disorder','Clotting disorder','Anemia']],
        ['gi-gu',         'GI / GU',                ['GERD','Inflammatory bowel disease','Kidney disease','Liver disease','Hepatitis']],
        ['psych',         'Psychiatric',            ['Depression','Anxiety','PTSD','Bipolar','Substance use disorder']],
        ['infectious',    'Infectious',             ['HIV','Tuberculosis','MRSA history']],
      ].map(([slug,label,list])=> rosCheck(PFX, slug, label, list))),
    group(`${PFX}.social`, 'Social history', [
      { linkId:`${PFX}.social.smoking`, type:'choice', text:'Tobacco use',
        answerOption:[
          { valueCoding:{ code:'never',         display:'Never smoker' } },
          { valueCoding:{ code:'current-daily', display:'Current daily smoker' } },
          { valueCoding:{ code:'current-some',  display:'Current some-day smoker' } },
          { valueCoding:{ code:'former',        display:'Former smoker' } },
        ] },
      { linkId:`${PFX}.social.alcohol`, type:'boolean', text:'Do you drink alcohol on a regular basis?' },
      { linkId:`${PFX}.social.occupation`, type:'string', text:'Occupation' },
    ]),
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(amcShell(ID, 'StanfordOrthoIntake', 'Stanford Health Care — Orthopaedic Surgery New Patient Questionnaire', 'Orthopaedic surgery', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── MGH Adult Dermatology New Patient History ────────────────────────────
{
  const ID = 'mgh-derm-intake'; const PFX = 'mghderm';
  const items = [
    display(`${PFX}.preamble`, 'Welcome to MGH Dermatology. Please complete both pages of this form.', { category:'instructions' }),
    demographics(PFX),
    providers(PFX),
    { linkId:`${PFX}.referred`, type:'boolean', text:'Did a physician refer you to the Dermatology Service?' },
    { linkId:`${PFX}.messageConsent`, type:'open-choice', repeats:true,
      text:'Authorize Dermatology to leave messages on (check all that apply)',
      extension:[{ url: EXT.itemControl, valueCodeableConcept:{ coding:[{ system: SYS.itemControl, code:'check-box' }] } }],
      answerOption:[
        { valueCoding:{ code:'home-phone', display:'Home phone' } },
        { valueCoding:{ code:'work-phone', display:'Day / Work phone' } },
        { valueCoding:{ code:'cell-phone', display:'Cell phone' } },
      ] },
    { linkId:`${PFX}.presentProblem`, type:'text', text:'What is the purpose of your visit today?' },
    rosCheck(PFX, 'pastMedical', 'Past medical history (check all that apply)',
      ['Diabetes','Asthma','Liver Disease','Hay Fever','High Blood Pressure','Cancer']),
    { linkId:`${PFX}.cancerType`, type:'string', text:'Cancer type (if applicable)',
      enableWhen:[{ question:`${PFX}.ros.pastMedical`, operator:'=', answerCoding:{ code:'cancer' } }] },
    group(`${PFX}.devices`, 'Implanted devices / dental', [
      { linkId:`${PFX}.devices.pacemaker`,      type:'boolean', text:'Do you have a pacemaker?' },
      { linkId:`${PFX}.devices.artificialJoint`,type:'boolean', text:'Do you have an artificial joint?' },
      { linkId:`${PFX}.devices.heartValve`,     type:'boolean', text:'Do you have an artificial heart valve?' },
      { linkId:`${PFX}.devices.dentalAbx`,      type:'boolean', text:'Do you have to take antibiotics before you go to the dentist?' },
      { linkId:`${PFX}.devices.tanningBed`,     type:'boolean', text:'Have you used tanning beds?' },
    ]),
    meds(PFX), allergies(PFX),
    { linkId:`${PFX}.bloodThinners`, type:'boolean', text:'Do you take blood thinners?' },
    { linkId:`${PFX}.aspirinRecent`, type:'boolean', text:'Have you taken any aspirin in the last 48 hours?' },
    group(`${PFX}.skinHistory`, 'Personal & family history of skin conditions',
      ['Melanoma skin cancer','Basal cell skin cancer','Squamous cell skin cancer','Psoriasis','Eczema']
        .map((c,i)=>({
          linkId:`${PFX}.skinHistory.q${i+1}`, type:'group', text:c,
          item:[
            { linkId:`${PFX}.skinHistory.q${i+1}.personal`, type:'choice', text:'Personal history?', answerOption: ynOpts },
            { linkId:`${PFX}.skinHistory.q${i+1}.family`,   type:'choice', text:'Family history?',   answerOption: ynOpts },
            { linkId:`${PFX}.skinHistory.q${i+1}.relative`, type:'string', text:'Which family member(s)?',
              enableWhen:[{ question:`${PFX}.skinHistory.q${i+1}.family`, operator:'=', answerCoding:{ system: SYS.yn, code:'Y' } }] },
          ],
        }))),
    group(`${PFX}.social`, 'Social history', [
      { linkId:`${PFX}.social.occupation`, type:'string', text:'Occupation — what kind of work do you do?' },
      { linkId:`${PFX}.social.alcohol`,    type:'boolean', text:'Do you drink alcohol on a regular basis?' },
      { linkId:`${PFX}.social.tobacco`,    type:'choice', text:'Tobacco status',
        answerOption:[
          { valueCoding:{ code:'never',          display:'Never smoker' } },
          { valueCoding:{ code:'current-daily',  display:'Current every-day smoker' } },
          { valueCoding:{ code:'current-some',   display:'Current some-day smoker' } },
          { valueCoding:{ code:'former',         display:'Former smoker' } },
        ] },
    ]),
  ];
  // Note: a single quote vs backtick bug fix needed since I'm in mixed quoting above
  const fixed = JSON.parse(JSON.stringify(items).replace(/\$\{PFX\}/g, PFX));
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(amcShell(ID, 'MGHDermatologyIntake', 'Massachusetts General Hospital — Adult Dermatology New Patient History', 'Dermatology', null, fixed), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}

// ─── BWH Neurosurgery New Patient Intake ────────────────────────────────────
{
  const ID = 'bwh-neurosurgery-intake'; const PFX = 'bwhneuro';
  const items = [
    display(`${PFX}.preamble`, 'Please complete all four pages so we can be best prepared for your visit.', { category:'instructions' }),
    demographics(PFX),
    { linkId:`${PFX}.mrn`, type:'string', text:'BWH Medical Record Number' },
    providers(PFX),
    { linkId:`${PFX}.otherPhysician`, type:'string', text:'Other physician (specialty)' },
    { linkId:`${PFX}.pharmacy`, type:'group', text:'Pharmacy',
      item:[
        { linkId:`${PFX}.pharmacy.name`,    type:'string', text:'Pharmacy name' },
        { linkId:`${PFX}.pharmacy.address`, type:'text',   text:'Address' },
        { linkId:`${PFX}.pharmacy.phone`,   type:'string', text:'Phone' },
        { linkId:`${PFX}.pharmacy.fax`,     type:'string', text:'Fax' },
      ] },
    group(`${PFX}.hpi`, 'Reason for visit', [
      { linkId:`${PFX}.hpi.chiefComplaint`, type:'text', required:true, text:'Major problem that brings you in today' },
      { linkId:`${PFX}.hpi.workersComp`,    type:'boolean', text:'Related to workers\' compensation?' },
      { linkId:`${PFX}.hpi.legalAction`,    type:'boolean', text:'Related to any legal actions?' },
      { linkId:`${PFX}.hpi.accidentDate`,   type:'date',    text:'If accident-related, when did the accident occur?' },
    ]),
    group(`${PFX}.surgicalHistory`, 'Surgical history', [
      { linkId:`${PFX}.surgicalHistory.list`, type:'group', repeats:true,
        item:[
          { linkId:`${PFX}.surgicalHistory.list.procedure`, type:'string', text:'Procedure' },
          { linkId:`${PFX}.surgicalHistory.list.date`,      type:'date',   text:'Date' },
        ] },
    ]),
    group(`${PFX}.medicalHistory`, 'Active medical conditions', [
      { linkId:`${PFX}.medicalHistory.list`, type:'group', repeats:true,
        item:[
          { linkId:`${PFX}.medicalHistory.list.condition`, type:'string', text:'Condition' },
          { linkId:`${PFX}.medicalHistory.list.duration`,  type:'string', text:'Duration' },
        ] },
    ]),
    meds(PFX), allergies(PFX),
    rosCheck(PFX, 'systems', 'Review of systems — check any that you currently experience',
      ['Headache','Memory loss','Vision changes','Hearing changes','Tinnitus','Difficulty swallowing','Weakness','Numbness','Tingling','Loss of balance','Speech changes','Seizures','Fainting','Nausea/vomiting','Bowel/bladder changes','Chest pain','Shortness of breath','Sleep changes']),
    group(`${PFX}.social`, 'Social history', [
      { linkId:`${PFX}.social.occupation`, type:'string', text:'Occupation' },
      { linkId:`${PFX}.social.tobacco`,    type:'choice', text:'Tobacco use',
        answerOption:[
          { valueCoding:{ code:'never',         display:'Never' } },
          { valueCoding:{ code:'current',       display:'Current' } },
          { valueCoding:{ code:'former',        display:'Former' } },
        ] },
      { linkId:`${PFX}.social.alcohol`,    type:'string', text:'Alcohol use (drinks per week)' },
      { linkId:`${PFX}.social.drugs`,      type:'text',   text:'Recreational drug use (specify)' },
    ]),
  ];
  fs.writeFileSync(`questionnaires/${ID}.json`,
    JSON.stringify(amcShell(ID, 'BWHNeurosurgeryIntake', 'Brigham and Women\'s — Department of Neurosurgery New Patient Intake', 'Neurosurgery', null, items), null, 2)+'\n');
  console.log(`Wrote questionnaires/${ID}.json`);
}
