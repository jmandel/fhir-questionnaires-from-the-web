# FHIR Questionnaire Conversion Worklist

Deduplicated by underlying instrument. For each instrument, we pick **one** canonical source PDF (the most complete / most authoritative copy) and produce **one** FHIR Questionnaire. Other copies of the same instrument become "see also" sources in the manifest, not separate Questionnaires.

For unique multi-section intake packets (Stanford / Mass General / NYU / Brigham etc.), each is its own Questionnaire because the composition is unique.

Legend: ✅=done · ⏳=in-progress · ⬜=todo · ⛔=skip

---

## Part 1 — Validated PROMs (one canonical Questionnaire per instrument)

| # | Instrument | Canonical source PDF | Status |
|--|--|--|--|
| 1 | PHQ-9 (Patient Health Questionnaire-9) | `mh-depression__prom__integrationacademy-ahrq-gov__02e70fa382` | ⬜ |
| 2 | PHQ-2 | `mh-depression__prom__med-stanford-edu__475f56b09f` | ⬜ |
| 3 | PHQ-9 modified for Teens | `psychiatry__intake__aacap-org__110d9d50fa` | ⬜ |
| 4 | GAD-7 | `mh-anxiety__prom__dartmouth-hitchcock-org__e144755a45` | ⬜ |
| 5 | AUDIT-C | `alcohol__prom__mentalhealth-va-gov__788127ebf9` | ⬜ |
| 6 | AUDIT (full 10-item) | `alcohol__prom__bpac-org-nz__7ed1c4be9c` | ⬜ |
| 7 | CAGE | `alcohol__prom__fideliscare-org__b8f4b0a12f` | ⬜ |
| 8 | DAST-10 | `addiction__prom__sbirt-care__27b14ab5dd` | ⬜ |
| 9 | MDQ (Mood Disorder Questionnaire) | `mh-bipolar__prom__ohsu-edu__8e373ff880` | ⬜ |
| 10 | ASRS v1.1 (Adult ADHD Self-Report) | `mh-adhd__prom__apaservices-org__bd1a1ddc8c` | ⬜ |
| 11 | MoCA (Montreal Cognitive Assessment) | `mh-cognition__prom__geriatrictoolkit-missouri-edu__fe49a4b2ad` | ⬜ |
| 12 | C-SSRS (Columbia Suicide Severity, Lifeline 2014) | `mh-suicide__prom__988lifeline-org__fb0d6bcb3a` | ⬜ |
| 13 | NICHQ Vanderbilt — Parent Initial | `psychiatry__intake__aacap-org__94f8ad1bdc` | ⬜ |
| 14 | NICHQ Vanderbilt — Teacher Initial | `psychiatry__intake__aacap-org__f6a5025060` | ⬜ |
| 15 | NICHQ Vanderbilt — Parent Follow-up | `psychiatry__intake__aacap-org__77d676b77e` | ⬜ |
| 16 | NICHQ Vanderbilt — Teacher Follow-up | `psychiatry__intake__aacap-org__59956fc538` | ⬜ |
| 17 | CMRS-P (Child Mania Rating Scale, Parent) | `psychiatry__intake__aacap-org__0f1e63d5c2` | ⬜ |
| 18 | AIMS (Abnormal Involuntary Movement Scale) | `psychiatry__intake__aacap-org__a06e6bb0b4` | ⬜ |
| 19 | Medication side-effects monitoring (AACAP) | `psychiatry__intake__aacap-org__ab5b10a591` | ⬜ |
| 20 | Stimulant monitoring form (AACAP) | `psychiatry__intake__aacap-org__dbb869a9bb` | ⬜ |
| 21 | Reminiscence Functions Scale | `psychology__intake__apa-org__4fbf7c96a7` | ⬜ |
| 22 | KOOS (Knee injury and OA Outcome Score) | `ortho-knee__prom__aaos-org__a941b2af00` | ⬜ |
| 23 | WOMAC | `ortho-knee__prom__howdenmedicalclinic-com__a8f652bcab` | ⬜ |
| 24 | Total Knee composite (Howard Head) | `ortho-knee__prom__howardhead-org__7ea1da3b19` | ⬜ |
| 25 | ODI (Oswestry Disability Index) | `ortho-back__prom__sralab-org__5b7f764755` | ⬜ |
| 26 | FAAM (Foot and Ankle Ability Measure) | `ortho-foot__prom__howardhead-org__c353171ffd` | ⬜ |
| 27 | LEFS (Lower Extremity Functional Scale) | `ortho-lower__prom__honorhealth-com__9b93c5688b` | ⬜ |
| 28 | QuickDASH | `ortho-upper__prom__sralab-org__c75ae23f0b` | ⬜ |
| 29 | DASH (full) | `ortho-upper__prom__rpmrehab-com__c4dcb1918e` | ⬜ |
| 30 | SPADI (Shoulder Pain and Disability Index) | `ortho-shoulder__prom__health-uconn-edu__30aec050be` | ⬜ |
| 31 | ASES Shoulder (LIFT-UP) | `ortho-shoulder__prom__esvw-com__b1c10a8248` | ⬜ |
| 32 | IPSS / I-PSS (International Prostate Symptom Score) | `urology-bph__prom__lvhn-org__8f175f610d` | ⬜ |
| 33 | EPIC-26 (Expanded Prostate Cancer Index, short) | `urology-bph__prom__uclahealth-org__43033202da` | ⬜ |
| 34 | FIQR (Revised Fibromyalgia Impact Questionnaire) | `rheum-fibro__prom__batemanhornecenter-org__6206575ce9` | ⬜ |
| 35 | mMRC Dyspnea scale | `pulm-copd__prom__aacvpr-org__d2d8df5ef4` | ⬜ |
| 36 | KCCQ-12 (Kansas City Cardiomyopathy Questionnaire) | `cardio-hf__prom__cvam-com__b9939ac4b3` | ⬜ |
| 37 | Seattle Angina Questionnaire (SAQ) | `cardio-angina__prom__biolincc-nhlbi-nih-gov__4466c9aa70` | ⬜ |
| 38 | PAID (Problem Areas In Diabetes) | `diabetes__prom__pdf4pro-com__6e5d41e8f9` | ⬜ |
| 39 | STOP-BANG | `sleep-apnea__prom__statecollegedentalsleepmedicin__7f77ec38a9` | ⬜ |
| 40 | MIDAS (Migraine Disability Assessment) | `neuro-migraine__prom__headaches-org__8ce884db02` | ⬜ |
| 41 | Barthel Index of ADL | `geri-adl__prom__massgeneral-org__283352038a` | ⬜ |
| 42 | MAHC-10 Fall Risk Assessment | `geriatrics__prom__homecaremissouri-org__907c7826dd` | ⬜ |
| 43 | AAFP Social Needs Screening (long) | `society-aafp__prom__medicine-tulane-edu__b5a89ee757` | ⬜ |
| 44 | STEADI Fall Risk Referral (CDC) | `fall-risk__prom__cdc-gov__a56d3c87f6` | ⬜ |
| 45 | Rome IV adult IBS questionnaire | `gi-rome__prom__essentialsofibs-com__9bfc3b9ce1` | ⬜ |

## Part 2 — AACAP Psychiatry intake forms (unique compositions)

| # | Form | Source | Status |
|--|--|--|--|
| 46 | CAP Intake Form 1 (child/adolescent psychiatry) | `psychiatry__intake__aacap-org__9433752654` | ⬜ |
| 47 | CAP Intake Form 2 | `psychiatry__intake__aacap-org__20ad88eb55` | ⬜ |
| 48 | CAP Intake Form 3 | `psychiatry__intake__aacap-org__ad6fd51984` | ⬜ |
| 49 | CAP Practice Telephone Intake | `psychiatry__intake__aacap-org__5cc32a6a97` | ⬜ |
| 50 | Med consent — Stimulants/Adderall | `psychiatry__intake__aacap-org__81be0675c6` | ⛔ consent |
| 51 | Med consent — Antipsychotics | `psychiatry__intake__aacap-org__332373de08` | ⛔ consent |
| 52 | Med consent — Aripiprazole | `psychiatry__intake__aacap-org__df7d523415` | ⛔ consent |
| 53 | Med consent — Atomoxetine | `psychiatry__intake__aacap-org__d03367dc2e` | ⛔ consent |
| 54 | Med consent — Benzodiazepines / α-agonist | `psychiatry__intake__aacap-org__64c450fddc` | ⛔ consent |
| 55 | Med consent — Other | `psychiatry__intake__aacap-org__165e9bd366` | ⛔ consent |

## Part 3 — Adult psychiatry packets (Evolve, IRP) and admin/consent

All `evolve-psychiatry-com` and `irp-cdn-website-com` consent / privacy / financial-policy / authorization-for-release / psychotherapy-notes-release / medical-records-request PDFs → ⛔ consent (skip)

| # | Form | Source | Status |
|--|--|--|--|
| 56 | Evolve Psychiatry Adult New-Patient Intake | `psychiatry__intake__evolve-psychiatry-com__230419d1b4` | ⬜ (intake content) |
| 57 | Evolve Psychiatry New-Patient Forms (longer packet) | `psychiatry__intake__evolve-psychiatry-com__be4e011c9e` | ⬜ verify |
| 58 | IRP — 2025 New Patient Information & Consent | `psychiatry__intake__irp-cdn-website-com__d5e41e95f9` | ⬜ |

## Part 4 — AMC new-patient intake packets (each unique)

| # | Form | Source | Status |
|--|--|--|--|
| 59 | Cleveland Clinic Union Physician Services New Patient | `amc-mixed__new-patient-intake__my-clevelandclinic-org__bf6a4b1f6d` | ⬜ |
| 60 | Stanford Ortho New Patient Intake | `amc-mixed__new-patient-intake__stanfordhealthcare-org__62b6fe7b58` | ⬜ |
| 61 | Stanford Interventional Radiology Demographics | `amc-mixed__new-patient-intake__stanfordhealthcare-org__9084c00c76` | ⬜ |
| 62 | Stanford IR — DVT Demographics | `amc-mixed__new-patient-intake__stanfordhealthcare-org__23d03c9086` | ⬜ |
| 63 | Stanford IR — IVC Filter Demographics | `amc-mixed__new-patient-intake__stanfordhealthcare-org__28b5993359` | ⬜ |
| 64 | Stanford IR — Fibroid Center Demographics | `amc-mixed__new-patient-intake__stanfordhealthcare-org__47e2b5b000` | ⬜ |
| 65 | Stanford Valleycare GYN New Patient | `amc-mixed__new-patient-intake__stanfordhealthcare-org__280c05fd62` | ⬜ |
| 66 | NYU Fresco Institute (Parkinson) New Patient | `amc-multi__new-patient-intake__nyulangone-org__a280acf22f` | ⬜ |
| 67 | NYU Fresco — earlier version | `amc-multi__new-patient-intake__nyulangone-org__1c40b6cfc3` | ⛔ superseded by #66 |
| 68 | NYU Fresco — interim version | `amc-multi__new-patient-intake__nyulangone-org__a013f391b6` | ⛔ superseded by #66 |
| 69 | NYU Faculty Group Practice Demographic | `amc-multi__new-patient-intake__nyulangone-org__f4c7adf71b` | ⬜ |
| 70 | NYU Multi-physician new patient (Gilbert, Nirenberg, …) | `amc-multi__new-patient-intake__nyulangone-org__8936e49277` | ⬜ |
| 71 | Hopkins Adult Consultation Schizophrenia | `amc-multi__new-patient-intake__hopkinsmedicine-org__51b5997df6` | ⬜ |
| 72 | UPMC Jameson Bariatrics New Patient | `amc-multi__new-patient-intake__dam-upmc-com__bfa71fcb0a` | ⬜ |
| 73 | BWH Neurosurgery New Patient | `amc-multi__new-patient-intake__brighamandwomens-org__e8f668afcc` | ⬜ |
| 74 | BWH Center for Brain/Mind New Patient | `amc-multi__new-patient-intake__brighamandwomens-org__d189cb7c50` | ⬜ |
| 75 | BWH AERD Allergy New Patient | `amc-multi__new-patient-intake__brighamandwomens-org__f7764f43a6` | ⬜ |
| 76 | BWH Pediatric Allergy New Patient | `amc-multi__new-patient-intake__brighamandwomens-org__4f6be3974c` | ⬜ |
| 77 | MGH Adult Dermatology New Patient | `amc-multi__new-patient-intake__massgeneral-org__7ffc878738` | ⬜ |
| 78 | MGH High-Risk Skin Cancer New Patient | `amc-multi__new-patient-intake__massgeneral-org__42cf83a13d` | ⬜ |
| 79 | MGH Allergy & Immunology New Patient Packet | `amc-multi__new-patient-intake__massgeneral-org__e25b782cfa` | ⬜ |
| 80 | MGH Vein Care Stoneham New Patient Packet | `amc-multi__new-patient-intake__massgeneral-org__904bce583d` | ⬜ |

## Part 5 — Skip (admin, research, redundant)

- Duke / UPMC handbooks (`amc-multi__new-patient-intake__dukehealth-org__514faa413e`, MarkVCID OCT instructions ×2, Duke 990 tax return, `nyulangone-org__e5a41d8cb8` "Can We Talk" booklet)
- All research articles in cardio-angina, diabetes (cmcendovellore, frontiersin, professional-diabetes), pulm-copd (openaccess-sgul, scispace), GI Rome IV research, AAFP guidelines (public.powerdms), Voice/Tinnitus blog HTMLs, etc.
- Redundant copies of PHQ-9, GAD-7, AUDIT-C, MDQ, ASRS, MoCA, KOOS, WOMAC, IPSS, MIDAS, mMRC, FIQ, KCCQ, PAID, Vanderbilt, FAAM, LEFS, Barthel, etc.
- MedWatch report (`psychiatry__intake__aacap-org__02d911450a`) — FDA form, out of scope.
- HTML resources (not PDFs) — out of scope per goal.

---

**Total to convert:** ≈ 65 Questionnaires (45 PROMs + 4 AACAP intakes + 3 adult psychiatry + ~18 AMC packets). Skip list ≈ 75 PDFs (consent, research, duplicates).
