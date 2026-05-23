---
name: convert-to-fhir-questionnaire
description: Convert a directory of clinical forms (PDFs, HTML pages, screenshots, scanned images, vendor templates, plain text — anything that looks like a patient intake form, PROM, follow-up form, or clinician checklist) into a directory of FHIR R4 Questionnaire JSON resources that follow HL7 SDC (Structured Data Capture) idioms. Use whenever the user has a folder of clinical forms they want represented as FHIR Questionnaires, or asks to "make these into FHIR", "convert this PROM", "turn these intake forms into Questionnaire resources", or similar — even if they don't say "SDC" or "FHIR" explicitly, if the source material is clinical questions / rating scales / intake packets and the desired output is structured form definitions, use this skill.
---

# Convert forms → FHIR Questionnaires (with SDC)

## What this skill does

Takes a directory of mixed clinical form sources (`*.pdf`, `*.html`, `*.png`, `*.txt`, screenshots, vendor templates) and produces a directory of validated FHIR R4 Questionnaire JSON resources using HL7 SDC STU4 idioms.

Out of scope: prepopulation, observation extraction, terminology server expansion, and the rest of SDC's runtime-integration surface. The goal is **structural and rendering fidelity** of the source form, with full provenance back to the artifact it came from. Workflow integration is a separate problem.

## Inputs and outputs

**Input**: a directory like:
```
forms-in/
├── phq-9.pdf
├── stanford-ortho-intake.pdf
├── audit-c.html
├── intake-screenshot.png
└── ...
```

**Output**: a sibling directory like:
```
forms-out/
├── questionnaires/
│   ├── phq-9.json
│   ├── stanford-ortho-intake.json
│   └── ...
├── triage.tsv         # per-input: form|skip|uncertain + reason
└── validation.txt     # validator output (local + official)
```

## Workflow

### 1. Inventory and triage

For each input, extract text and decide:

| Bucket | Action |
|---|---|
| **PROM / rating scale** (named published instrument: PHQ-9, GAD-7, KOOS, AUDIT-C, etc.) | convert with the **matrix idiom** (see §3) |
| **Local intake packet** (new-patient registration, history & ROS, condition-specific intake) | convert with the **intake-packet pattern** (see §4) |
| **Clinician checklist** (preventive-care, fall-risk screening, referral form) | convert with the **checklist pattern** (see §4) |
| **Follow-up / monitoring form** | usually same shape as matrix or intake | 
| **Consent / privacy / financial-policy / records-request** | skip — out of scope |
| **Research paper, scoring guide, education handout, annual report** | skip — not a fillable form |
| **Calculator / explainer page (HTML)** | skip if it's not a fillable form |

**Text extraction**:
- PDF: `pdftotext -layout input.pdf -` (preserves columns); fall back to `pdftotext input.pdf -` (raw) if layout breaks tables.
- HTML: `lynx -dump -nolist input.html` or `w3m -dump input.html`; for JS-heavy pages, use `curl` first and only inspect the static parts.
- Image / scan: OCR with `tesseract input.png -` if no text layer.
- Screenshot: same as image.

**Form-likeness heuristics** (use 2+ to confirm):
- Markers: `Name:`, `Date of birth`, `please check|circle|complete`, `signature`, `over the past (2|4) weeks`, `how often`, `rate your`, `on a scale`, numbered Q-lines.
- Hard-reject signatures: `annual report`, `workbook`, `reference guide`, `Methods:` / `Results:`, DOI, `p<0.001` (research paper), `Form 990`, `policy manual`.
- Scale-likeness fallback for PROMs that lack demographic markers: `0 = …` / `1 = …` / `not at all` / `several days` / `nearly every day` / `total score` / `circle one` / `strongly agree`/`disagree` PLUS a medical-context noun (`symptom|disease|disorder|pain|depression|anxiety|sleep|arthritis`) PLUS `score|scale|questionnaire|index|inventory|assessment|measure` in the document.

Write your triage decision per input into `forms-out/triage.tsv` so the user can see what was skipped and why.

### 2. Author one Questionnaire at a time

For each input bucketed as a form, write a Bun TypeScript builder script that imports `scripts/lib.ts` (bundled with this skill) and emits the Questionnaire JSON. Per-file scripts (instead of one big script) make the work composable, reviewable, and re-runnable.

Pattern: `scripts/build/<id>.ts`:

```typescript
import { questionnaire, group, display, totalScore, ordinal, variable, calcExpr, EXT, SYS } from '../lib';
import { writeFileSync } from 'node:fs';

const ID = 'phq-9';
const opts = [
  { extension: [ordinal(0)], valueCoding: { system: SYS.loinc, code: 'LA6568-5', display: 'Not at all' } },
  { extension: [ordinal(1)], valueCoding: { system: SYS.loinc, code: 'LA6569-3', display: 'Several days' } },
  { extension: [ordinal(2)], valueCoding: { system: SYS.loinc, code: 'LA6570-1', display: 'More than half the days' } },
  { extension: [ordinal(3)], valueCoding: { system: SYS.loinc, code: 'LA6571-9', display: 'Nearly every day' } },
];
const items = [
  ['q1', 'Little interest or pleasure in doing things'],
  ['q2', 'Feeling down, depressed, or hopeless'],
  // ...
];
const q = questionnaire({
  id: ID, name: 'PHQ9', title: 'Patient Health Questionnaire (PHQ-9)',
  derivedFrom: ['http://loinc.org/q/44249-1'],
  extension: [variable('phq9Sum',
    `%resource.item.descendants().where(linkId.startsWith('phq9.matrix.')).answer.valueCoding.extension.where(url='${EXT.ordinalValue}').valueDecimal.sum()`)],
  item: [
    display('phq9.instructions', 'Over the last 2 weeks, how often have you been bothered by any of the following problems?', { category: 'instructions' }),
    group('phq9.matrix', 'PHQ-9 items',
      items.map(([slug, text]) => ({ linkId: `phq9.matrix.${slug}`, type: 'choice', required: true, text, answerOption: opts })),
      { control: 'gtable' }),
    totalScore('phq9.totalScore', 'PHQ-9 total score', 'phq9Sum', '44261-6'),
  ],
  source: { sourceUrl: 'https://example.org/phq9.pdf', specialty: 'mental-health', formType: 'prom', host: 'example.org', sha256: '...' },
});

writeFileSync(`forms-out/questionnaires/${ID}.json`, JSON.stringify(q, null, 2) + '\n');
```

Run with `bun scripts/build/phq-9.ts`.

The library is intentionally thin — about 150 lines of plain functions that emit FHIR-shaped JSON. There's no proprietary runtime; the output is plain Questionnaire JSON that any FHIR tool can consume.

### 3. The matrix idiom — most PROMs reduce to this

If the source is a grid of "rate each symptom 0–4" items sharing one answer set, use:

```
group { itemControl: gtable, repeats: false }
  ├─ item { type: choice, answerOption: [ordinalValue + valueCoding, ...] }
  ├─ item { ... same shape ... }
  └─ ...
+ a top-level `variable` extension that sums ordinals via FHIRPath
+ a readOnly integer/decimal item with `calculatedExpression` referencing the variable
```

The FHIRPath sum follows this template (substitute your `linkId` prefix):

```
%resource.item.descendants()
  .where(linkId.startsWith('<prefix>.matrix.'))
  .answer.valueCoding.extension
  .where(url = 'http://hl7.org/fhir/StructureDefinition/ordinalValue')
  .valueDecimal.sum()
```

This one recipe covers: PHQ-9, GAD-7, AUDIT, AUDIT-C, KOOS, WOMAC, FIQR, NICHQ Vanderbilt (×4 variants), ISI, ESS, FLACC, AIMS, BPI-SF, MDQ, ASRS, MAHC-10, PAID-20, SF-MPQ, RAPID3, and most other matrix-shaped scales. Items vary; structure doesn't.

### 4. Intake-packet and checklist patterns

Intake packets are longer (50–200 items typical) but mechanically simpler — flat groups of demographics, insurance, providers, medications, allergies, surgical history, family history, ROS checkboxes, social history, and a free-text chief complaint. Use:

- A top-level `group` per section, with `text` set to the section heading.
- Standard FHIR item types: `string` (single line), `text` (paragraph), `date`, `integer`, `quantity` (with `unit` extension), `boolean`, `choice` / `open-choice`.
- Repeating lists (medications, allergies, surgical history) → nested `group` with `repeats: true` plus `minOccurs`/`maxOccurs` extensions if there's a limit.
- For "check all that apply" multi-select → `open-choice` with `answerOption`.

Clinician checklists (e.g., AAFP preventive screening): one nested group per intervention with `status`/`date`/`notes` sub-items — same shape repeated. Use the matrix idiom with `gtable` control if the renderer needs a tabular layout.

## Authoring conventions

### Skeleton

Every Questionnaire emitted by this skill has:

| Field | Value |
|---|---|
| `resourceType` | `"Questionnaire"` |
| `id` | kebab-case slug (`phq-9`, `bwh-neurosurgery-intake`) |
| `url` | canonical, e.g. `http://hobby.intake-forms/fhir/Questionnaire/phq-9` — change BASE in `lib.ts` to your publisher domain |
| `version` | `"1.0.0"` (bump on revisions) |
| `name` | machine-readable identifier (no spaces) |
| `title` | human-readable title |
| `status` | `"draft"` until the conversion is reviewed; `"active"` after |
| `experimental` | `true` for research collections; `false` for production |
| `subjectType` | `["Patient"]` (use `["RelatedPerson"]` or `["Patient","Practitioner"]` if the form is observer-administered or clinician-completed) |
| `date` | conversion date |
| `publisher` | your org or collection name |
| `derivedFrom` | when there's a LOINC question-set canonical, cite it: `["http://loinc.org/q/44249-1"]` for PHQ-9, `["http://loinc.org/q/69737-5"]` for GAD-7, etc. |
| `copyright` | source instrument's copyright/license text, copied verbatim from the source |

### linkId conventions

- Hierarchical, dot-separated, scoped under the Questionnaire id: `phq9.matrix.q1`, `bwhneuro.demographics.lastName`.
- **Stable**: linkIds become foreign keys for QuestionnaireResponses and FHIRPath expressions. Don't rename casually after publishing.
- **Unique across the entire tree**, not just sibling-relative — the local validator enforces this.

### Item types

| Type | Use for |
|---|---|
| `display` | preamble text, instructions, "see your provider" safety blocks. No answer. |
| `group` | section heading; contains nested `item[]`. No answer. |
| `string` | single-line free text (name, occupation) |
| `text` | multi-line free text (chief complaint, narrative) |
| `boolean` | yes/no (use `choice` with Y/N CodeSystem if you want ordinalValue) |
| `integer`, `decimal` | counts, scores, slider values |
| `quantity` | height/weight/BMI/BP — pair with `unit` / `unitOption` extensions |
| `date`, `dateTime`, `time` | per FHIR |
| `choice` | single-select from `answerOption` or `answerValueSet` |
| `open-choice` | multi-select or "other (specify)" |
| `attachment`, `reference`, `url` | per FHIR, rarely used in intake forms |

### Provenance (always populate)

Every Questionnaire must carry `meta` so a consumer can trace it back to the source artifact. The bundled `buildMeta()` in `lib.ts` does this from a `source` argument:

```json
"meta": {
  "source": "https://example-clinic.org/forms/intake-2024.pdf",
  "tag": [
    { "system": "http://hobby.intake-forms/fhir/CodeSystem/specialty", "code": "ortho-knee" },
    { "system": "http://hobby.intake-forms/fhir/CodeSystem/form-type", "code": "prom" },
    { "system": "http://hobby.intake-forms/fhir/CodeSystem/source-host", "code": "example-clinic.org" }
  ],
  "extension": [
    { "url": "http://hobby.intake-forms/fhir/StructureDefinition/derivedFromArtifact", "valueString": "raw/pdf/example-clinic-intake-2024.pdf" },
    { "url": "http://hobby.intake-forms/fhir/StructureDefinition/sourceSha256", "valueString": "<sha256 of the source file>" },
    { "url": "http://hobby.intake-forms/fhir/StructureDefinition/alsoSeenAt", "valueString": "raw/pdf/other-site-copy.pdf" }
  ]
}
```

`meta.source` is core FHIR (the URL the resource originated from). `meta.tag` carries facets the consumer can filter on. `meta.extension` carries the source-file hash for dedup, the local artifact path, and any `alsoSeenAt` entries when the same instrument is republished by multiple sites (very common for standardized PROMs).

## SDC features to use

| Feature | URL | Use for |
|---|---|---|
| `itemControl: gtable` | `…/questionnaire-itemControl` | matrix layout |
| `itemControl: page` / `tab-container` | same | multi-section intake packets (renderer-dependent) |
| `itemControl: slider` / `drop-down` / `radio-button` | same | rendering hints |
| `ordinalValue` | `http://hl7.org/fhir/StructureDefinition/ordinalValue` | numeric weight on a choice option (PROM scoring) |
| `optionExclusive` | `…/questionnaire-optionExclusive` | "None of the above" mutually-exclusive option |
| `optionPrefix` | `…/questionnaire-optionPrefix` | "(a)", "(1)" prefixes on answer options |
| `displayCategory` | `…/questionnaire-displayCategory` | mark a `display` item as `instructions`, `security`, `help` |
| `variable` | `http://hl7.org/fhir/StructureDefinition/variable` | top-level named FHIRPath expression (used by `calculatedExpression`) |
| `calculatedExpression` (SDC) | `…/sdc-questionnaire-calculatedExpression` | computed score/subscale referencing a `variable` |
| `enableWhenExpression` (SDC) | `…/sdc-questionnaire-enableWhenExpression` | branching condition too complex for the base `enableWhen` array |
| `cqf-expression` | `http://hl7.org/fhir/StructureDefinition/cqf-expression` | alternative scoring with CQL (LOINC PHQ-9 example uses this) — prefer `calculatedExpression` + FHIRPath unless you have a CQL library reference |
| `unit` / `unitOption` | `…/questionnaire-unit` / `-unitOption` | UCUM units on `quantity` items (`[lb_av]`, `[in_i]`, `kg`, `cm`) |
| `regex` / `entryFormat` | `…/regex` / `…/entryFormat` | input validation pattern + placeholder hint (phone, ZIP, email) |
| `minOccurs` / `maxOccurs` | `…/questionnaire-minOccurs` / `-maxOccurs` | bounds on repeating groups |
| `sliderStepValue`, `minValue`, `maxValue` | `…/questionnaire-sliderStepValue`, `…/minValue`, `…/maxValue` | numeric slider/VAS items |
| `shortText` (SDC) | `…/sdc-questionnaire-shortText` | column header for matrix rows |
| `supportLink` | `…/questionnaire-supportLink` | link to help text |
| `rendering-xhtml` | `…/rendering-xhtml` | rich-text alternative on `display` items |

## SDC features to **NOT** use

This skill is for structural conversion, not workflow integration. The following extensions belong to SDC's prepopulation / extraction / adaptive surface and must be left out — both because they're out of scope and because including them silently changes how downstream tools handle the artifact:

| Extension | Why excluded |
|---|---|
| `sdc-questionnaire-launchContext` | declares prepopulation inputs |
| `sdc-questionnaire-initialExpression` | prefills an item from FHIR data |
| `sdc-questionnaire-candidateExpression` | answer candidates from FHIR data |
| `sdc-questionnaire-contextExpression` | runtime context for expressions |
| `sdc-questionnaire-itemPopulationContext` | per-item prepopulation scope |
| `sdc-questionnaire-sourceQueries` | embedded FHIR query for population |
| `sdc-questionnaire-itemExtractionContext` | extract Observations from response |
| `sdc-questionnaire-observationExtract` | per-item extract-as-Observation flag |
| `sdc-questionnaire-observationLinkPeriod` | window for extraction |
| `sdc-questionnaire-endpoint` | server endpoint for runtime calls |
| `sdc-questionnaire-entryMode` | sequential/random rendering mode |
| `sdc-questionnaire-lookupQuestionnaire` | reference another Questionnaire |
| `sdc-questionnaire-answerExpression` | dynamic answer options |
| `sdc-questionnaire-answerOptionsToggleExpression` | dynamic option toggling |
| Adaptive `$next-question` operation | adaptive form delivery |

The bundled `validate.ts` will flag any of these if they sneak in.

## Choices: answerOption vs answerValueSet

- **Inline `answerOption[]`** when answers are small, stable, and you want the artifact to be portable offline (no terminology server needed).
- **`answerValueSet`** (canonical URL, e.g. `http://loinc.org/vs/LL358-3`) when answers come from a published value set and a terminology server is available.
- Always attach `ordinalValue` extension on each option for any scored instrument — `valueCoding` alone is not enough for FHIRPath summation.
- Use `optionExclusive: true` on the "None of the above" option in multi-select lists.

## Behavior: enableWhen, calculatedExpression, variable

- Base R4 `enableWhen[]` array is fine for simple "show Q5 if Q1=yes" branching. Multiple entries in the array are AND'd; use `enableBehavior: "any"` for OR.
- For complex conditions ("show item if any of Q1–Q9 > 0"), use the SDC `enableWhenExpression` extension with a single FHIRPath expression — much cleaner than 9 OR'd `enableWhen` entries.
- For computed totals/subscales, use a top-level `variable` extension defining the FHIRPath expression once, then reference it from a `readOnly: true` `integer` or `decimal` item via `calculatedExpression` (`%variableName`). This gives the renderer one expression to evaluate and one place to display the result.

## Spec quirks (real ones — call out in code comments if you hit them)

- **`ordinalValue` (R4) vs `itemWeight` (R5)**: R5 renamed the extension. R4 forms keep using `ordinalValue` at `http://hl7.org/fhir/StructureDefinition/ordinalValue`. Don't mix.
- **`regex` "superseded" by `targetConstraint`** per SDC STU4 prose, but `regex` is still the registered core extension with broader tool support. Keep `regex` on string items; use `targetConstraint` only for cross-item rules.
- **LOINC's official PHQ-9 example uses `cqf-expression` with CQL** (`"language": "text/cql"`). For hand-authored forms without a CQL library to reference, use `calculatedExpression` with FHIRPath everywhere.
- **`answerValueSet` requires a terminology server** to expand at render time. Inline `answerOption` doesn't.

## Validation

### Step 1: local sanity check (fast, runs in ~50ms)

```bash
bun scripts/validate.ts forms-out/questionnaires/
```

Bundled with this skill. Checks:
- Valid JSON, `resourceType=Questionnaire`, required fields present (`url`, `status`, `name`, `title`, `subjectType`)
- `linkId` unique across the entire item tree (not just sibling-relative)
- Every `enableWhen.question` resolves to an existing `linkId`
- `answerOption` items match parent item type (no `valueInteger` on a choice with `valueCoding`)
- No banned SDC extensions from the out-of-scope list above
- All item `type` values are valid

Run this on every file save during authoring. It catches the most common mistakes (template-string typos that make JSON unparseable, banned extensions added reflexively) before they propagate.

### Step 2: official HL7 validator (slower, more thorough)

```bash
# one-time setup in your workspace (not in the skill dir):
bun add fhir-validator-wrapper

# tell the validator which extension URL prefix is "ours" — provenance
# extensions you defined yourself that won't have a public StructureDefinition:
export OWN_EXT_PREFIX="http://my-publisher-domain/fhir/StructureDefinition/"

bun scripts/fhir-validator.ts forms-out/questionnaires/
```

This uses the [`fhir-validator-wrapper`](https://github.com/FHIR/fhir-validator-wrapper) npm package — a Node wrapper that runs the official validator JAR as a long-lived HTTP service. First run downloads ~180 MB of JAR + IG packages (about 90 seconds); subsequent files in the same batch validate in milliseconds because the JVM stays warm and the IGs stay loaded.

**Critical performance note**: the cold start (JVM boot + IG load) is the long pole — typically 2–5 minutes on a fresh process; per-file validation after that is milliseconds. **Batch every validation into one `bun fhir-validator.ts` invocation whenever possible.** If you're iterating on fixes, prefer running the script against the entire directory once (let it report all errors), patching everything, then a single re-validation — *not* repeated single-file runs that each pay the cold-start tax. If you know you'll want both structural and terminology checks, enable `txServer: 'http://tx.fhir.org/r4'` in the same invocation; don't split them across two cold starts.

Requires `java` (any recent JRE). Configurable via env vars:

| Env var | Default | Meaning |
|---|---|---|
| `FHIR_VALIDATOR_JAR_PATH` | `./validator_cli.jar` | where to cache/download the JAR |
| `FHIR_VERSION` | `4.0.1` | FHIR version to validate against |
| `FHIR_IGS` | `hl7.fhir.uv.sdc#3.0.0` | comma-separated IG packages to load |
| `FHIR_VALIDATOR_PORT` | `8081` | localhost port for the validator HTTP service |
| `OWN_EXT_PREFIX` | _(empty)_ | URL prefix for your own provenance extensions; "extension URL ... could not be found" errors with this prefix are suppressed |

Common findings to expect and how to interpret:

| Finding | Meaning |
|---|---|
| `error: extension http://your-domain/... could not be found so is not allowed here` | The validator doesn't have a `StructureDefinition` for your custom extension. **Set `OWN_EXT_PREFIX` to suppress** — the script labels these "own-ext ignored" in the summary. |
| `error: extension http://hl7.org/.../questionnaire-minOccurs ... not allowed to be used at this point` | The R4 `minOccurs`/`maxOccurs` extensions can only sit on items with `required: true` (or `required` itself extended). Either make the item `required` or drop the extension. **This is a real R4-vs-R5 constraint that the local validator doesn't catch.** |
| `warning: Unable to validate code "LA6568-5" — Resolved system http://loinc.org, but not retrieved` | The validator skipped the LOINC lookup because the terminology server is off (`tx n/a`). Safe to ignore for local validation; flip `txServer` in `scripts/fhir-validator.ts` to `http://tx.fhir.org/r4` if you want full terminology checks (slower, requires network). |
| `error: duplicate linkId X` | structural — fix immediately. (The local validator already catches this.) |
| `error: answerOption type does not match item type` | structural — fix immediately. |
| `error: missing required field X` | fix immediately. |
| `information: best practice ...` | review case-by-case. |

The wrapper's HTTP-service approach is the right pattern for batch validation. The two-step flow (local sanity check first, official validator second) lets the fast checker catch the trivial mistakes in your tight authoring loop and the slow-but-thorough validator catch the spec-conformance issues at end of conversion.

### Step 3: semantic LOINC audit (the validator can't catch this)

The validator confirms that every `(system, code)` pair exists in LOINC and that the `display` matches the authoritative one. It **cannot** tell you that you've attached a valid LOINC code to the wrong concept — e.g., putting a "Total score [AUDIT-C]" code on the Questionnaire root, putting a 4-week-recall variant on a 2-week instrument, or hallucinating a code (`72091-2`) whose display happens to share one word with the instrument you meant ("Osteoarthritis" in both WOMAC and KOOS). All of these pass the validator but are semantically wrong and will mislead any downstream consumer.

After the validator is green, dump every remaining LOINC binding and read the table by eye:

```bash
# Emits TSV: code, file, linkId, our-context-text, LOINC official display
bun your-audit-script.ts > /tmp/loinc-audit.tsv
column -t -s$'\t' /tmp/loinc-audit.tsv | less -S
```

Look for these patterns:
- **Form-level vs total-score code on the Questionnaire root**: `Total score [X]` codes belong on the `totalScore` item, not the `Questionnaire.code[]`. Use the form-level code (e.g. `71354-5` "Edinburgh Postnatal Depression Scale [EPDS]") at the root.
- **Wrong recall window**: a code labeled `... in last 4 weeks [Reported.PHQ]` on a GAD-7 item (which uses 2-week recall) is wrong even though it's a valid code.
- **Hallucinated codes that happen to validate**: if the authoritative display is completely unrelated to the surrounding question text, the code is wrong even if it exists. Strip it.
- **Items on instruments LOINC doesn't have codes for**: CAGE individual items don't have LOINC codes (only `89001-2` for the CAGE antibody lab test). If you've bound something that looks plausible (e.g. SAMHSA codes), strip it — better no code than wrong code.

A useful shortcut: for any *standardized* instrument that has a `[PROM_NAME]` panel/total LOINC, also confirm what code is meant for the form-level binding vs. the score binding. They are almost always two different codes.

### Step 4: re-stamp provenance

If you rebuild Questionnaires after editing builders, re-run any provenance attribution step you have (the canonical URL, `meta.source`, `meta.tag`, `meta.extension[sha256]`) to make sure metadata stays consistent.

## Checklist before declaring conversion done

For each Questionnaire:

- [ ] `id`, `url`, `name`, `title`, `status`, `experimental`, `subjectType`, `date`, `publisher` all set
- [ ] `derivedFrom` cites LOINC canonical when one exists (standardized instruments only)
- [ ] `copyright` quotes the source instrument's terms verbatim
- [ ] `meta.source` points to the source URL; `meta.tag` carries specialty/form-type/host; `meta.extension` carries sha256 + local artifact path
- [ ] linkIds are stable, hierarchical, and unique
- [ ] Every PROM symptom-row option has `ordinalValue`
- [ ] Computed totals use top-level `variable` + `calculatedExpression` (FHIRPath)
- [ ] No extensions from the out-of-scope list above
- [ ] `bun scripts/validate.ts` passes
- [ ] `bash scripts/fhir-validator.sh` passes with no errors (warnings acceptable per the table)

## Files bundled with this skill

- `scripts/lib.ts` — builder helpers (`questionnaire`, `group`, `display`, `totalScore`, `ordinal`, `variable`, `calcExpr`, `whenExpr`, `yn`, `ordOptions`, `itemControl`, `displayCategory`, `buildMeta`, plus `EXT.*` / `SYS.*` URL constants). Pure functions emitting plain JSON. ~210 lines, no dependencies.
- `scripts/validate.ts` — local sanity checker. Runs in milliseconds; suitable for tight authoring loops. No dependencies.
- `scripts/fhir-validator.ts` — wrapper around the official HL7 FHIR validator using the `fhir-validator-wrapper` npm package. Spawns the validator JAR as a long-lived HTTP service (warm JVM = fast batches). Requires `bun add fhir-validator-wrapper` in your workspace, plus `java`.

## When to ask the user

Before starting a large batch, confirm:
1. **The canonical URL base** (`BASE` in `lib.ts`). Default is `http://hobby.intake-forms/fhir`; production deployments need their own publisher domain.
2. **`status`** — `draft` (default; for review) or `active` (already vetted)?
3. **Triage edge cases** — when you find PDFs that look like forms but might be research papers / scoring guides / education handouts, list them and ask before skipping.
4. **Source instrument copyright** — for any standardized PROM, confirm the user has the right to host/redistribute it. Some PROMs (KCCQ, MIDAS, EORTC) require licensing for commercial use.

## Reasons behind the conventions

A few of the choices in this skill have non-obvious reasons worth keeping in mind:

- **Per-form builder scripts beat hand-authoring JSON or one giant generator.** A 200-line PHQ-9 JSON becomes 30 lines of declarative TypeScript. A 73-item Stanford Ortho intake becomes 150 lines. The output is the same plain Questionnaire JSON, but the builder is small, reviewable, and re-runnable when you find a bug.
- **Validation runs on every save, not at the end.** A 50ms local check catches template-string typos and banned extensions before they propagate across dozens of files. The official HL7 validator is the second pass, not the first.
- **Provenance is designed in from the start, not bolted on later.** `meta.source` + `meta.tag` + the source-hash extension let a consumer trace any Questionnaire back to a specific PDF/URL/sha. This becomes essential when you have multiple versions of the same instrument (e.g., 10 different sites publishing AUDIT-C) or when a clinic revises its intake quarterly.
- **The "do not use" SDC list is as important as the "do use" list.** SDC has gravity — start reading the spec and you'll be tempted to add `launchContext` "just in case". Each excluded extension changes runtime semantics; leaving them out keeps the artifact portable across renderers and use cases.
- **Standardized instruments are republished constantly across the web** (10+ sites posting the same AUDIT-C, 7+ sites posting PHQ-9). When converting a batch, dedup via the `meta.extension[alsoSeenAt]` pattern rather than authoring 10 near-identical Questionnaires.
