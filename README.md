# FHIR Questionnaires from the Web

A collection of **72 hand-authored FHIR R4 Questionnaire** resources converted from real-world provider intake forms and validated PROMs found on the public web. Each Questionnaire is built using HL7 [Structured Data Capture (SDC) IG STU4](https://hl7.org/fhir/uv/sdc/) idioms and carries full provenance back to its source PDF.

**[→ Browse the catalog (index.html)](./index.html)** · [catalog.json](./catalog.json) · [SDC author cheat-sheet](./notes/sdc-best-practices.md)

## What's here

```
.
├── README.md                # this file
├── LICENSE                  # MIT for code/JSON, third-party NOTICE for raw/
├── index.html               # browsable catalog with filtering / sorting
├── catalog.json             # machine-readable taxonomy + per-form metadata
├── assets/                  # CSS, JS, banner SVG, favicon (the design system)
├── questionnaires/          # 72 FHIR R4 Questionnaire JSON files
├── notes/                   # SDC authoring cheat-sheet
├── scripts/                 # build / validate / attribute / catalog-build scripts
├── manifest/                # questionnaire-provenance.json (qid → source stems)
├── triage/                  # source-PDF triage + text extraction
├── raw/                     # 180 source PDFs + 44 source HTMLs (~80 MB)
├── harvest-manifest/        # full provenance JSONL for every harvested file
├── harvest-plan/            # the harvest strategy
├── harvest-scripts/         # the CDP-driven harvest pipeline
└── harvest-INDEX.md         # auto-generated catalog of the raw harvest
```

## Hierarchical taxonomy

Each Questionnaire is classified along four facets (see `catalog.json` for the full machine-readable taxonomy):

- **`classKind`** — `standardized` (named published instrument) or `local` (practice/system-specific composition)
- **`hasLoinc`** — boolean: does the Questionnaire (or its items) carry LOINC codes?
- **`domain`** — clinical specialty bucket (mental-health, ortho-msk, cardio, pulm, urology, rheum, sleep, pain, primary-care, social-determinants, …)
- **`formType`** — `prom`, `intake`, `monitoring`, `checklist`, `observational`, `referral`
- **`audience`** — `adult`, `pediatric`, `mother-postpartum`, `both`, `clinician`
- **`answeringMode`** — `self-report`, `clinician-administered`, `observer`

**Top-level breakdown**:

| Class | Count |
|---|---|
| Standardized — with LOINC binding | 38 |
| Standardized — no LOINC binding   | 10 |
| Practice / system-specific (local) | 24 |
| **Total** | **72** |

Per-Questionnaire metadata also includes:
- `parentInstrument` — links variants to their family (e.g., AUDIT-C → AUDIT; PHQ-2 / PHQ-9 / PHQ-9-Teen → PHQ; NICHQ Vanderbilt Parent/Teacher × Initial/Followup → NICHQ Vanderbilt ADHD)
- `stats` — item counts (questions, groups, displays, required, by-type)
- `features` — which SDC extensions are used (calculatedExpression, enableWhenExpression, gtable, ordinalValue, slider, …)
- `source` — original public URL, sha256, host, count of variant copies tracked via `meta.extension[alsoSeenAt]`

## Provenance — every Questionnaire knows where it came from

Each Questionnaire carries:

```json
"meta": {
  "source": "https://www.fideliscare.org/Portals/0/.../CAGE-Instrument.pdf",
  "tag": [
    { "system": "http://hobby.intake-forms/fhir/CodeSystem/specialty",    "code": "alcohol" },
    { "system": "http://hobby.intake-forms/fhir/CodeSystem/form-type",    "code": "prom" },
    { "system": "http://hobby.intake-forms/fhir/CodeSystem/source-host",  "code": "fideliscare.org" }
  ],
  "extension": [
    { "url": ".../derivedFromArtifact", "valueString": "raw/pdf/alcohol__prom__fideliscare-org__b8f4b0a12f.pdf" },
    { "url": ".../sourceSha256",        "valueString": "b8f4b0a12f73544d..." },
    { "url": ".../sourceSearchQuery",   "valueString": "\"CAGE\" alcohol filetype:pdf" },
    { "url": ".../sourceSearchEngine",  "valueString": "brave" },
    { "url": ".../alsoSeenAt",          "extension": [ ... per-variant URL / host / artifact ... ] }
  ]
}
```

So you can always trace any Questionnaire back to (a) the exact PDF reproduced in `raw/`, (b) the original URL on the publisher's site, and (c) which other copies of the same instrument we saw and dedup'd against.

## SDC idioms used

See [`notes/sdc-best-practices.md`](./notes/sdc-best-practices.md) for the full cheat-sheet. Highlights:

- **gtable matrix** for PHQ-9-style "rate each symptom" grids
- **ordinalValue** on each `answerOption` to drive total-score calculations
- **`sdc-questionnaire-calculatedExpression`** with FHIRPath for total / subscale scores
- **`sdc-questionnaire-enableWhenExpression`** for cross-item conditional visibility (e.g., PHQ-9 difficulty Q10 shows only if any of Q1–9 > 0)
- **`itemControl`** for radio-button, check-box, slider, gtable, page, tab-container
- **`displayCategory=instructions`** for preambles; `supportLink` for citation/credit
- **`unit` / `unitOption`** for weight, height, age quantities
- **`regex` / `entryFormat`** for phone, ZIP, email validation
- **`minOccurs` / `maxOccurs`** for repeating groups (medications, household members, etc.)

**Out of scope by design** (and explicitly skipped): prepopulation, extraction, launchContext, observationLinkPeriod, initialExpression, sourceQueries. The goal here is structural / rendering fidelity, not form-filler workflow.

## Rebuilding

```bash
# Validate every Questionnaire (no terminology server required)
node scripts/validate.mjs

# Regenerate catalog.json + index.html + assets/
node scripts/build-catalog.mjs

# Re-stamp meta.source / meta.tag / meta.extension from manifest/questionnaire-provenance.json
node scripts/attribute.mjs

# Per-form builder scripts (one per instrument family)
node scripts/build/phq-9.mjs    # … etc — see scripts/build/
```

The catalog HTML is fully static — drop `index.html` + `catalog.json` + `assets/` + `questionnaires/` on any static host (S3, Netlify, GitHub Pages, …) and it works.

## Status

- **72** canonical FHIR Questionnaires
- **All validate** against the local sanity checker
- **All carry full provenance** via `meta.source`, `meta.tag`, `meta.extension`
- Covers **~210 of 224** source artifacts (dedup tracked via `alsoSeenAt`)

## License

- Code / JSON / docs in this repo: **MIT** (see `LICENSE`)
- Third-party PDFs in `raw/`: each remains the property of its copyright holder; see the NOTICE block in `LICENSE` and each Questionnaire's `copyright` field.
