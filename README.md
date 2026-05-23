# fhir-questionnaires-from-the-web

A self-contained Claude **skill** for converting any directory of clinical forms (PDFs, HTML pages, screenshots, vendor templates) into FHIR R4 Questionnaire resources following HL7 SDC idioms — packaged together with one large worked example: **72 hand-authored Questionnaires** built from **224 real-world forms** harvested from clinic, hospital, professional-society, and government sites, all validated against the official HL7 FHIR validator.

**[→ Browse the live catalog](http://joshuamandel.com/fhir-questionnaires-from-the-web/)**

## The skill is the main thing

```
skills/questionnaire-everything/
├── SKILL.md     workflow + extensions cheat-sheet + validator usage + lessons learned
└── scripts/
    ├── lib.ts            builder helpers (Bun/TypeScript, no deps)
    ├── validate.ts       fast local sanity checker
    └── fhir-validator.ts long-lived-server wrapper around the official HL7 validator JAR
```

Drop it into any Claude project, point Claude at a directory of forms, and the skill walks the conversion: triage → author → validate → audit. SKILL.md captures the recipes, the SDC idioms to use, the SDC features to deliberately *not* use, the provenance pattern, and validator usage. The scripts are bundled; only `bun`, `java`, and `curl` are required.

## The rest of the repo

```
inputs/    180 PDFs + 44 HTMLs harvested from real provider sites, with full provenance
outputs/   72 FHIR R4 Questionnaire JSONs produced by applying the skill to inputs/
webapp/    static catalog browser (index.html + assets/), source for the published site
```

- **`inputs/`** — see [`inputs/README.md`](./inputs/README.md). The raw forms + a JSONL manifest with the search query / engine / URL / sha256 that surfaced each one, plus the CDP-driven harvest scripts that did the collection.
- **`outputs/`** — see [`outputs/README.md`](./outputs/README.md). 72 validated Questionnaires + `catalog.json` (machine-readable taxonomy) + the long-form SDC cheat-sheet + the prefill analysis (`outputs/prefill/`) + archived per-instrument builders.
- **`webapp/`** — the static catalog renderer. The GitHub Pages workflow (`.github/workflows/pages.yml`) copies `outputs/{catalog.json, questionnaires/, notes/}` into `webapp/` at deploy time and publishes only that folder.

## Numbers at a glance

- **224** source artifacts harvested → **72** canonical FHIR Questionnaires (dedup ratio ~2.9:1; variants tracked via `meta.extension[alsoSeenAt]`)
- **38** Questionnaires with LOINC bindings · **10** standardized w/o LOINC · **24** local intake packets
- **0** real validation errors against the official HL7 validator (FHIR R4 + SDC IG 3.0.0 + LOINC + UCUM)
- **130+** discrete fixes during the validation/curation pass (R4 invariants, LOINC display updates, semantic mismatches stripped, UCUM normalization, form-vs-total-score code swaps)

## Articles

- [`article-ktc-questionnaires.md`](./article-ktc-questionnaires.md) — *"Visit-specific forms don't have to stay on the clipboard"* — how this approach lowers the barrier for clinics participating in a [Kill The Clipboard](https://www.linkedin.com/pulse/kill-clipboard-july-2026-sharing-fhir-data-patient-stories-josh-mandel-md-uhwjc) check-in workflow.

## Browsing the published site

`webapp/index.html` is the catalog browser — filter by class/LOINC/domain/form-type/audience/answering-mode, sort, click any title to open the raw Questionnaire JSON. Served at the URL above; works locally with `python3 -m http.server` from inside `webapp/` after running the assembly step from `pages.yml`.

## License

- Code, JSON, docs in this repo: **MIT** ([`LICENSE`](./LICENSE))
- Third-party PDFs in `inputs/`: each remains the property of its copyright holder. Each Questionnaire's `copyright` field reproduces the source instrument's terms.
