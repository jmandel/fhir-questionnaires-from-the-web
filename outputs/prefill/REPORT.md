# Prefill-opportunity analysis

How much of a clinic's intake burden, across this collection of 72 FHIR Questionnaires (2,452 total items), could be filled automatically from a reasonably complete FHIR record — vs. how much genuinely requires the patient at the moment of the visit.

Classification rules (per goal directive):
- **chart_derivable** — a stable fact a complete FHIR record would already hold (name, DOB, address, phone, sex, insurance, current med list, known allergies, active problems, immunizations, surgical history, smoking status, recent vitals, family history). The patient is *not* the unique source of truth.
- **patient_required** — depends on the patient's current state, today's visit purpose, a subjective judgment, or info no chart reliably stores. All PROM symptom items go here. Confirmation / delta questions ("have your meds changed?") also go here, even when the underlying fact is in the chart.
- **uncertain** — genuinely ambiguous after the rule above. Used sparingly.
- **skip** — `display` items, group headers with no answer, items with `calculatedExpression` (computed totals/subscales).

Denominator = answerable items only (skipped excluded).

---

## Headline numbers

**Across all 72 Questionnaires (2,452 items → 1,980 answerable):**

| Class             | Count | % of answerable |
|-------------------|------:|---------------:|
| chart_derivable   | 792   | 40.0%          |
| patient_required  | 1,173 | 59.2%          |
| uncertain         | 15    | 0.8%           |
| _(skipped)_       | 472   | —              |

The split is sharply bimodal once the catalog is sliced by form type:

| Bucket                              | Questionnaires | Answerable items | % chart_derivable | % patient_required | % uncertain |
|-------------------------------------|---------------:|----------------:|------------------:|-------------------:|------------:|
| Pure PROMs / symptom scales         | 49             | 1,113           | **5.3%**          | 94.6%              | 0.1%        |
| AMC / practice intake packets       | 22             | 780             | **86.5%**         | 11.7%              | 1.8%        |
| Clinician preventive-care checklist | 1              | 87              | 66.7%             | 33.3%              | 0           |
| **Total**                           | **72**         | **1,980**       | **40.0%**         | **59.2%**          | **0.8%**    |

That bimodal pattern is the headline finding. The intake-packet side of a clinic's clipboard is overwhelmingly prefillable; the PROM side is overwhelmingly not.

---

## Per-Questionnaire detail

### Intake packets (22 — high chart-derivable)

| Questionnaire | Items | Skip | D | P | U | %D | %P | %U |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aacap-cap-intake-1 | 92 | 13 | 64 | 9 | 6 | 81% | 11% | 8% |
| aacap-telephone-intake | 28 | 4 | 21 | 3 | 0 | 88% | 12% | 0% |
| bwh-aerd-allergy | 29 | 7 | 20 | 2 | 0 | 91% | 9% | 0% |
| bwh-brain-mind | 35 | 9 | 20 | 6 | 0 | 77% | 23% | 0% |
| bwh-neurosurgery-intake | 64 | 16 | 41 | 5 | 2 | 85% | 10% | 4% |
| bwh-pediatric-allergy | 35 | 7 | 20 | 5 | 3 | 71% | 18% | 11% |
| cc-union-intake | 92 | 19 | 60 | 13 | 0 | 82% | 18% | 0% |
| hopkins-schizophrenia-consult | 38 | 11 | 24 | 3 | 0 | 89% | 11% | 0% |
| mgh-allergy-intake | 26 | 7 | 15 | 4 | 0 | 79% | 21% | 0% |
| mgh-derm-intake | 76 | 17 | 57 | 1 | 1 | 97% | 2% | 2% |
| mgh-hrscc | 33 | 10 | 23 | 0 | 0 | 100% | 0% | 0% |
| mgh-vein-care | 31 | 8 | 18 | 5 | 0 | 78% | 22% | 0% |
| nyu-fgp-demographic | 30 | 6 | 24 | 0 | 0 | 100% | 0% | 0% |
| nyu-fresco-parkinson | 30 | 9 | 18 | 3 | 0 | 86% | 14% | 0% |
| nyu-multi-physician-neuro | 29 | 10 | 16 | 3 | 0 | 84% | 16% | 0% |
| stanford-ir-demographics | 44 | 7 | 35 | 2 | 0 | 95% | 5% | 0% |
| stanford-ir-dvt | 44 | 7 | 35 | 2 | 0 | 95% | 5% | 0% |
| stanford-ir-fibroid | 44 | 7 | 35 | 2 | 0 | 95% | 5% | 0% |
| stanford-ir-ivc | 44 | 7 | 35 | 2 | 0 | 95% | 5% | 0% |
| stanford-ortho-intake | 73 | 18 | 45 | 9 | 1 | 82% | 16% | 2% |
| stanford-valleycare-gyn | 47 | 11 | 30 | 6 | 0 | 83% | 17% | 0% |
| upmc-jameson-bariatrics | 38 | 12 | 19 | 6 | 1 | 73% | 23% | 4% |
| **Subtotal** | **1,002** | **222** | **675** | **91** | **14** | **86.5%** | **11.7%** | **1.8%** |

### Clinician preventive-care checklist (1)

| Questionnaire | Items | Skip | D | P | U | %D | %P | %U |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| aafp-adult-preventive-screening | 118 | 31 | 58 | 29 | 0 | 67% | 33% | 0% |

(Per intervention row: `status` and `date last performed` come from chart history — Procedure, Immunization, Observation, Condition. `notes` is a free-text clinician comment, so patient_required.)

### Standardized PROMs / symptom scales (49 — high patient-required)

| Questionnaire | Items | Skip | D | P | U | %D | %P |
|---|---:|---:|---:|---:|---:|---:|---:|
| phq-2 | 5 | 3 | 0 | 2 | 0 | 0% | 100% |
| phq-9 | 13 | 3 | 0 | 10 | 0 | 0% | 100% |
| phq-9-teen | 17 | 4 | 0 | 13 | 0 | 0% | 100% |
| gad-7 | 11 | 3 | 0 | 8 | 0 | 0% | 100% |
| audit-c | 5 | 2 | 0 | 3 | 0 | 0% | 100% |
| audit | 12 | 2 | 0 | 10 | 0 | 0% | 100% |
| cage | 6 | 2 | 0 | 4 | 0 | 0% | 100% |
| dast-10 | 17 | 3 | 0 | 14 | 0 | 0% | 100% |
| epds | 12 | 2 | 0 | 10 | 0 | 0% | 100% |
| mdq | 21 | 4 | 2 | 15 | 0 | 12% | 88% |
| cmrs-p | 25 | 3 | 0 | 22 | 0 | 0% | 100% |
| asrs-v1-1 | 22 | 4 | 0 | 18 | 0 | 0% | 100% |
| c-ssrs-risk-assessment | 54 | 8 | 4 | 42 | 0 | 9% | 91% |
| midas | 9 | 2 | 0 | 7 | 0 | 0% | 100% |
| aims | 18 | 4 | 2 | 12 | 0 | 14% | 86% |
| moca | 17 | 3 | 6 | 8 | 0 | 43% | 57% |
| flacc | 7 | 2 | 0 | 5 | 0 | 0% | 100% |
| koos | 49 | 7 | 0 | 42 | 0 | 0% | 100% |
| womac | 29 | 5 | 0 | 24 | 0 | 0% | 100% |
| odi | 13 | 3 | 0 | 10 | 0 | 0% | 100% |
| faam | 34 | 3 | 0 | 31 | 0 | 0% | 100% |
| lefs | 23 | 3 | 0 | 20 | 0 | 0% | 100% |
| quickdash | 24 | 5 | 0 | 19 | 0 | 0% | 100% |
| spadi | 19 | 6 | 0 | 13 | 0 | 0% | 100% |
| stop-bang | 12 | 4 | 4 | 3 | 1 | 50% | 38% |
| isi | 10 | 3 | 0 | 7 | 0 | 0% | 100% |
| ess | 11 | 3 | 0 | 8 | 0 | 0% | 100% |
| haq-di | 54 | 11 | 0 | 43 | 0 | 0% | 100% |
| rapid3 | 16 | 4 | 0 | 12 | 0 | 0% | 100% |
| fiqr | 29 | 8 | 0 | 21 | 0 | 0% | 100% |
| bpi-short | 21 | 6 | 1 | 14 | 0 | 7% | 93% |
| sf-mpq | 22 | 5 | 0 | 17 | 0 | 0% | 100% |
| sf-mpq-2 | 30 | 7 | 0 | 23 | 0 | 0% | 100% |
| saq | 16 | 2 | 0 | 14 | 0 | 0% | 100% |
| kccq-12 | 15 | 3 | 0 | 12 | 0 | 0% | 100% |
| mmrc | 2 | 1 | 0 | 1 | 0 | 0% | 100% |
| ipss | 11 | 3 | 0 | 8 | 0 | 0% | 100% |
| paid-20 | 23 | 3 | 0 | 20 | 0 | 0% | 100% |
| barthel | 12 | 2 | 0 | 10 | 0 | 0% | 100% |
| mahc-10 | 13 | 3 | 7 | 3 | 0 | 70% | 30% |
| steadi-referral | 18 | 3 | 8 | 7 | 0 | 53% | 47% |
| rfs | 45 | 2 | 0 | 43 | 0 | 0% | 100% |
| aafp-social-needs | 27 | 12 | 0 | 15 | 0 | 0% | 100% |
| aacap-medication-side-effects | 29 | 1 | 2 | 26 | 0 | 7% | 93% |
| aacap-stimulant-monitoring | 247 | 23 | 21 | 203 | 0 | 9% | 91% |
| nichq-vanderbilt-parent-initial | 64 | 8 | 0 | 56 | 0 | 0% | 100% |
| nichq-vanderbilt-parent-followup | 45 | 5 | 0 | 40 | 0 | 0% | 100% |
| nichq-vanderbilt-teacher-initial | 55 | 6 | 2 | 47 | 0 | 4% | 96% |
| nichq-vanderbilt-teacher-followup | 43 | 5 | 0 | 38 | 0 | 0% | 100% |
| **Subtotal** | **1,332** | **219** | **59** | **1,053** | **1** | **5.3%** | **94.6%** |

PROMs that show notable chart-derivable content:
- **mahc-10** (fall-risk): age, polypharmacy count, multi-diagnosis count, incontinence Condition, vision impairment, cognitive impairment, prior falls — all chart facts.
- **steadi-referral**: patient demographics + diagnosis on the referral header.
- **stop-bang**: BMI, age, gender, blood-pressure status are chart facts; snoring/tiredness/observed-apnea are not.
- **moca**: header (name/DOB/sex/education/test date/administrator) is chart-derivable; the 7 cognitive subtest scores plus the education bonus boolean require live administration.
- **c-ssrs** and **aacap-stimulant-monitoring**: the bulk is current/recent state, but a few items (active diagnoses like substance use disorder, family history of suicide, chronic pain Condition, prior psychiatric diagnoses, header demographics/medication-name/start-date) are chart-derivable.
- **bpi-short**: "what treatments or medications are you receiving for your pain?" maps to MedicationStatement + Procedure history.

---

## What the chart-derivable items map to

Across the 792 items classified as chart_derivable, the source-resource breakdown is roughly:

| FHIR resource / element                        | Approx. share | Typical items |
|------------------------------------------------|--------------:|---|
| `Patient` (name, DOB, sex, address, phones, email, language, marital status, race/ethnicity, SSN) | ~35% | demographics blocks |
| `Coverage` (insurance company, member ID, group, subscriber, subscriber DOB) | ~10% | insurance blocks |
| `RelatedPerson` (PCP/referring/pharmacy/emergency contact name, phone, address) | ~12% | provider + contact blocks |
| `MedicationStatement` / `MedicationRequest` (med name, dose, frequency, reason) | ~12% | "current medications" list, per-visit dosing |
| `AllergyIntolerance` (substance, reaction) | ~4% | allergies list |
| `Condition` (active dx, past medical, comorbidities, history-of flags) | ~8% | ROS / problem-history / comorbidity checklists |
| `Procedure` (surgical history, prior interventions, screening procedures, immunizations-by-Procedure) | ~6% | surgical history; preventive-screening "date last performed" |
| `Immunization` | ~2% | adult immunizations row in AAFP checklist; HPV vaccine in GYN |
| `Observation` (vitals — height/weight/BMI/BP; smoking status; visual acuity; gestational details; pack-years) | ~6% | vitals blocks, social-history coded items, transplant/skin-type Observations |
| `FamilyMemberHistory` | ~3% | family-history of cancer/dementia/atopy/bipolar/suicide |
| `Consent` / `DocumentReference` (advance directive, DPOA, ROI, communication preferences) | ~2% | emergency / directives sections |

(Percentages are eyeballed bucket sizes, not a formal count.)

US Core profiles already cover most of these resources, and the KTC July 2026 PAMI scope (Problems, Allergies, Medications, Immunizations) covers four of the four highest-volume clinical buckets after pure demographics.

---

## What's left as patient_required

The 1,173 patient_required items fall into a small number of recurring shapes:

- **All PROM symptom rows** (PHQ-9 q1–q9, GAD-7 q1–q7, KOOS pain rows, etc.) — by construction, "how have you felt over the past N days/weeks" is patient_required.
- **Chief complaint / reason for visit / today's goals** — visit-specific.
- **Current functional status** — "how are your symptoms affecting work / driving / ADLs?"
- **Social-determinant screening** — food insecurity, housing, transportation, IPV (the AAFP social-needs Questionnaire is 100% patient_required for this reason).
- **Adherence and self-management** — "have you tried compression stockings?", "are you using your rescue inhaler more?", "missed doses of stimulant this week".
- **Consent acknowledgements** — release of info, advance-directive declarations, willingness to be contacted by voicemail.
- **Subjective control / satisfaction** — "how well-controlled is your asthma in the past month?", "how satisfied are you with your treatment?".
- **Open-ended narrative** — "questions you'd like to discuss with the team", "describe past serious allergic reactions", "weight history".

---

## Implications for prefill / check-in design

Three sentences:

1. **The intake packet and the PROM are fundamentally different artifacts**: across 22 real provider intake packets, **~87% of answerable items** are chart-derivable from a complete FHIR record dominated by `Patient`, `Coverage`, `RelatedPerson`, `MedicationStatement`, `AllergyIntolerance`, `Condition`, `Procedure`, and `Observation`; across 49 standardized PROMs the figure flips to **~5%** because PROMs ask about current state by design. A check-in workflow that ships PAMI + US Core demographics can autofill the *majority* of a clinic's intake packet but should expect to render the *entirety* of any PROM as fresh patient input.

2. **The KTC July 2026 PAMI scope already covers most of the dense chart-derivable categories** (problems, allergies, medications, immunizations), and these plus base demographics account for roughly two-thirds of all chart-derivable items in this collection — i.e., even the current PAMI scope, before any further expansion, removes most of the autofill-able clipboard burden in real intake packets. Adding `Coverage` and `Observation` (vitals, smoking status) would close most of the remaining gap.

3. **The patient_required items don't disappear — and shouldn't**: ~59% of the catalog and ~95% of any PROM is patient input that a check-in protocol still has to render in the app. Treating "the form" as a two-layer artifact — a chart-prefillable shell *plus* a per-visit answer surface — matches the actual shape of the data and lets each layer evolve independently (the PAMI/US Core prefill side is the same code across clinics; the PROM/symptom side is the per-instrument Questionnaire content).
