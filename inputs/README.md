# inputs/ — the raw material

Every clinical form the **skill** was applied to, plus the harvest trail showing how it got here.

## Layout

```
inputs/
├── pdf/                  180 PDFs harvested from clinic/hospital/society/gov sites
├── html/                 44 HTML pages
├── other/                misc artifacts (text dumps, etc.)
├── harvest-INDEX.md      auto-generated catalog of every file with one-line samples
├── harvest-manifest/     manifest.jsonl + sources.csv with full per-file provenance
├── harvest-plan/         the stratified-sampling design that drove the harvest
├── harvest-scripts/      CDP-driven Chromium scrapers (Brave/Bing/Google fallback)
└── triage/               per-file bucket (PROM / INTAKE / CONSENT / ADMIN / UNKNOWN) + extracted text
```

## What's in each manifest record

```json
{
  "sha256": "5b7f7647…",
  "url":    "https://www.sralab.org/sites/default/files/.../Oswestry_Low_Back_Disability.pdf",
  "host":   "sralab.org",
  "specialty": "ortho-back",
  "formType":  "validated-prom",
  "provenance": {
    "searchQuery":  "Oswestry Disability Index ODI questionnaire filetype:pdf",
    "sourceEngine": "bing",
    "discoveredVia": "https://www.bing.com/search?q=…"
  },
  "savedAt": "2026-05-22T20:47:11.123Z"
}
```

The harvest scripts (in `harvest-scripts/`) are kept for reproducibility but are not the point of this repo — they're a one-shot data collection layer. The point is the **skill** at the top of the repo, which is what turns this directory of mixed forms into the FHIR Questionnaire resources sitting in `outputs/`.

## Filenames

Inputs are renamed at harvest time to `{specialty}__{formType}__{host}__{sha256-prefix}.{ext}` so duplicates dedup cleanly and provenance is visible from the filesystem.
