# Provider Intake Form Harvest — Plan

## Axes of variation (maximize all 4)
1. **Specialty** — ~25 buckets (primary care, mental health, surgical, women's, peds, med subspec, eye/dental, rehab, alt-med, cross-cutting, veterinary).
2. **Form type** — new-pt registration, comprehensive hx & ROS, condition-specific intake, pre-procedure, follow-up/progress, validated PROMs, telehealth e-intake.
3. **Question style** — free-text, checkbox lists, Likert/VAS, body diagrams, dated diaries, branching/conditional, scored scales.
4. **Source org** — academic AMC (.edu), professional society, gov/VA (.gov), hospital network (.org), small private practice (.com), form-platform templates (JotForm/IntakeQ), open archives.

## Search strategies (per specialty)
- `"new patient intake form" filetype:pdf <specialty>`
- `"new patient packet" filetype:pdf <specialty>`
- `"patient questionnaire" filetype:pdf <condition>`
- `"history form" site:.edu <specialty>`
- `"follow up questionnaire" filetype:pdf <condition>`
- `"<scale name>" filetype:pdf` (PHQ-9, ODI, HAQ-DI, IPSS, …)
- `inurl:intake site:.org <specialty>`
- `"pre-operative questionnaire" filetype:pdf <procedure>`

## Target validated PROMs (gold for follow-up)
PHQ-9, GAD-7, AUDIT-C, DAST-10, MDQ, SCARED, Vanderbilt-ADHD, M-CHAT-R,
ODI, NDI, RMDQ, DASH/QuickDASH, KOOS, HOOS, WOMAC, FAAM, LEFS,
IPSS, OABSS, SHIM/IIEF-5, FSFI,
HAQ-DI, RAPID3, BASDAI, ASAS-HI, FIQR, PsAID,
BPI, BPI-SF, McGill Pain, MPQ,
MMRC, CAT, ACT, ACQ-7,
IBDQ, IBS-SSS, Rome-IV, Bristol stool,
ESS, ISI, STOP-BANG, Berlin,
MoCA, MMSE, IADL/ADL Barthel, Lawton, FAST,
EORTC QLQ-C30, FACT-G, EPIC-26,
PROMIS-29, EQ-5D-5L, SF-36/12,
Edmonton Symptom Assessment, MOLST, POLST.

## Pipeline
1. Launch Chromium with CDP on :9222 (separate user-data-dir) on DISPLAY=:0.
2. Drive search engines via CDP, scrape result links.
3. Download artifacts with curl (UA spoof, 10MB cap, follow redirects).
4. Save as `raw/{html,pdf,other}/<specialty>__<formtype>__<host>__<sha8>.<ext>`.
5. Validate (pdftotext / grep markers); record in `manifest/manifest.jsonl`.
6. Dedupe by sha256; produce README index.
