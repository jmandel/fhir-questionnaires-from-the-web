# outputs/ — the converted artifacts

What the **skill** produced when applied to `inputs/`. Every artifact here is plain FHIR R4 JSON; nothing depends on a runtime beyond a standard FHIR validator.

## Layout

```
outputs/
├── questionnaires/             72 FHIR R4 Questionnaire JSON files
├── catalog.json                machine-readable taxonomy + per-form metadata
├── manifest/
│   └── questionnaire-provenance.json   qid → { primary source stem, alsoSeen[] }
├── notes/
│   └── sdc-best-practices.md   long-form SDC author cheat-sheet (deeper than SKILL.md)
├── prefill/
│   └── REPORT.md               chart-derivable vs patient-required classification of every item
└── scripts/
    └── archive/                the original per-instrument .mjs builders (historical)
```

## Status

- **72** canonical Questionnaires
- **All pass** structural FHIR R4 validation + HL7 SDC 3.0.0 IG conformance + LOINC + UCUM display verification via the official HL7 validator (tx-enabled against `http://tx.fhir.org/r4`)
- **Every LOINC binding** has been audited for semantic correctness (not just "code exists" — also "code maps to the right concept")
- **All carry full provenance** via `meta.source` (origin URL), `meta.tag` (specialty/form-type/host facets), `meta.extension` (source sha256, derived-from-artifact path, also-seen-at variants)
- Covers **~210 of 224** source artifacts (dedup tracked via `meta.extension[alsoSeenAt]`)

## Taxonomy

`catalog.json` classifies each Questionnaire along several facets:

- **`classKind`** — `standardized` (named published instrument) or `local` (practice/system-specific composition)
- **`hasLoinc`** — boolean, does the Questionnaire carry LOINC codes
- **`domain`** — clinical specialty bucket
- **`formType`** — `prom` / `intake` / `monitoring` / `checklist` / `observational` / `referral`
- **`audience`** — `adult` / `pediatric` / `mother-postpartum` / `both` / `clinician`
- **`answeringMode`** — `self-report` / `clinician-administered` / `observer`
- **`parentInstrument`** — links variants (e.g., PHQ-2 → PHQ; NICHQ Vanderbilt Parent/Teacher × Initial/Followup → NICHQ Vanderbilt ADHD)

| Class | Count |
|---|---|
| Standardized — with LOINC binding | 38 |
| Standardized — no LOINC binding   | 10 |
| Practice / system-specific (local) | 24 |

## Why a separate `outputs/` directory

So the **skill** (in `../skills/`) is self-contained and reusable, and this directory is one concrete worked example showing what the skill produces at scale.

## Rebuilding

```bash
# Validate every Questionnaire against the official validator (with tx server)
# (See ../skills/questionnaire-everything/SKILL.md for setup)
bun ../skills/questionnaire-everything/scripts/fhir-validator.ts start
bun ../skills/questionnaire-everything/scripts/fhir-validator.ts questionnaires

# Regenerate catalog.json + ../webapp/{index.html, assets/} from the questionnaires
node scripts/archive/build-catalog.mjs
```

The `scripts/archive/` directory has the original per-instrument `.mjs` builders for each instrument family. They imported a `lib.mjs` helper at the time of authoring; that library has since been ported (and improved) into `../skills/questionnaire-everything/scripts/lib.ts`. For new conversions, use the skill — these archives are kept as the historical record of how this collection was produced.
