# SDC Questionnaire Authoring Cheat-Sheet (Structure / Rendering / Behavior)

Target: FHIR R4 Questionnaire authored against **SDC IG STU 4 (v4.0.0)** — current published version as of 2026-05.

Spec sources actually fetched:
- SDC IG home: https://hl7.org/fhir/uv/sdc/ (resolves to https://hl7.org/fhir/uv/sdc/en/index.html, v4.0.0 STU 4, FHIR R4)
- SDC Advanced Form Rendering: https://hl7.org/fhir/uv/sdc/en/rendering.html
- SDC Advanced Form Behavior: https://hl7.org/fhir/uv/sdc/en/behavior.html
- SDC Expressions: https://hl7.org/fhir/uv/sdc/en/expressions.html
- Core R4 Questionnaire: https://hl7.org/fhir/R4/questionnaire.html
- itemControl ValueSet: https://hl7.org/fhir/R4/valueset-questionnaire-item-control.html
- PHQ-9 SDC example: https://hl7.org/fhir/uv/sdc/en/Questionnaire-questionnaire-sdc-profile-example-cqf-PHQ9.json

Out of scope by request: prepopulation, extraction, form-filler workflow (see Section 10).

---

## 1. Skeleton — Minimum-Viable Questionnaire

```json
{
  "resourceType": "Questionnaire",
  "url": "http://forms.example.org/Questionnaire/sample-intake",
  "version": "1.0.0",
  "name": "SampleIntake",
  "title": "Sample Intake Questionnaire",
  "status": "active",
  "experimental": false,
  "date": "2026-05-22",
  "publisher": "AMC Forms Team",
  "subjectType": ["Patient"],
  "item": [
    {
      "linkId": "demographics",
      "text": "Demographics",
      "type": "group",
      "item": [
        { "linkId": "demographics.intro", "type": "display",
          "text": "Please answer the following questions about yourself." },
        { "linkId": "demographics.firstName", "type": "string",
          "text": "First name", "required": true, "maxLength": 60 },
        { "linkId": "demographics.bio",      "type": "text",
          "text": "Brief medical history" },
        { "linkId": "demographics.age",      "type": "integer",
          "text": "Age (years)" },
        { "linkId": "demographics.weight",   "type": "decimal",
          "text": "Weight (lb)" },
        { "linkId": "demographics.smoker",   "type": "boolean",
          "text": "Do you currently smoke?" },
        { "linkId": "demographics.dob",      "type": "date",
          "text": "Date of birth" },
        { "linkId": "demographics.gender",   "type": "choice",
          "text": "Sex assigned at birth",
          "answerOption": [
            { "valueCoding": { "system": "http://hl7.org/fhir/administrative-gender", "code": "female", "display": "Female" } },
            { "valueCoding": { "system": "http://hl7.org/fhir/administrative-gender", "code": "male",   "display": "Male" } },
            { "valueCoding": { "system": "http://hl7.org/fhir/administrative-gender", "code": "other",  "display": "Other" } }
          ]
        },
        { "linkId": "demographics.race",     "type": "open-choice",
          "text": "Race (select all that apply, or type another)",
          "repeats": true,
          "answerValueSet": "http://hl7.org/fhir/us/core/ValueSet/omb-race-category"
        },
        { "linkId": "demographics.height",   "type": "quantity",
          "text": "Height",
          "extension": [
            { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-unit",
              "valueCoding": { "system": "http://unitsofmeasure.org", "code": "cm", "display": "cm" } }
          ]
        }
      ]
    }
  ]
}
```

---

## 2. Identification & Metadata

| Element | Convention |
|---|---|
| `url` | Canonical, immutable per version line. Pattern: `http://forms.example.org/Questionnaire/{slug}` (use your real org domain). Never change after publish. |
| `version` | Semver. Bump for any item/scoring change. |
| `name` | PascalCase, no spaces, machine-name (`PHQ9`, `KOOS`, `AMCNewPatientPacket`). |
| `title` | Human title (`"Patient Health Questionnaire (PHQ-9)"`). |
| `status` | `draft` → `active` → `retired`. Use `active` once vetted. |
| `experimental` | `false` for production intake; `true` for prototypes. |
| `date` | ISO date the version was finalized. |
| `publisher` | Org name. |
| `copyright` | Required for instruments with restrictive licenses (PHQ-9 is free; AUDIT/AUDIT-C free; KOOS/WOMAC may require attribution; ODI free for clinical use — verify per instrument). |
| `derivedFrom` | Canonical URL of the parent published instrument when you’re profiling/translating it: e.g., `"derivedFrom": ["http://loinc.org/q/44249-1"]` for PHQ-9. |
| `useContext` | UsageContext slot — venue/specialty/age. |
| `jurisdiction` | `[{"coding":[{"system":"urn:iso:std:iso:3166","code":"US"}]}]`. |
| `code` | LOINC code for the instrument as a whole (`44249-1` for PHQ-9, `69737-5` for GAD-7, `75626-2` for AUDIT-C). |
| `identifier` | Add `urn:oid:` or business identifier where applicable. |

Example header:

```json
{
  "resourceType": "Questionnaire",
  "url": "http://forms.example.org/Questionnaire/phq9",
  "identifier": [{ "use": "official", "value": "phq-9" }],
  "version": "1.0.0",
  "name": "PHQ9",
  "title": "Patient Health Questionnaire (PHQ-9)",
  "status": "active",
  "experimental": false,
  "subjectType": ["Patient"],
  "date": "2026-05-22",
  "publisher": "AMC Forms Team",
  "copyright": "PHQ-9 © Pfizer Inc. Free to reproduce without permission.",
  "derivedFrom": ["http://loinc.org/q/44249-1"],
  "code": [{ "system": "http://loinc.org", "code": "44249-1",
             "display": "PHQ-9 quick depression assessment panel [Reported.PHQ]" }],
  "jurisdiction": [{ "coding": [{ "system": "urn:iso:std:iso:3166", "code": "US" }] }]
}
```

---

## 3. `linkId` Conventions

- Stable, never reused. Renaming a linkId is a breaking change for any QuestionnaireResponse that references it.
- Use dotted-path style mirroring the group hierarchy: `phq9.q1`, `phq9.q2`, …, `phq9.totalScore`, `phq9.difficulty`.
- For repeating groups: parent owns the path, children stay relative (`meds.med.name`, `meds.med.dose`).
- Keep linkIds short and ASCII; they appear in FHIRPath expressions (`%resource.item.where(linkId='phq9.q1')`).
- For matrix idiom, name the wrapping group with `.matrix` and each row with the symptom slug: `phq9.matrix`, `phq9.matrix.little_interest`, etc.
- Do **not** embed display text in linkIds — that's what `text` is for.

---

## 4. Choices

### 4a. answerOption (inline) vs answerValueSet (terminology)

Use `answerValueSet` when the choices are already a LOINC/SNOMED value set (PHQ-9 uses `http://loinc.org/vs/LL358-3`). Use `answerOption` for instrument-specific or local lists.

```json
{ "linkId": "phq9.q1", "type": "choice", "required": true,
  "answerValueSet": "http://loinc.org/vs/LL358-3" }
```

```json
{ "linkId": "audit_c.q1", "type": "choice", "required": true,
  "answerOption": [
    { "valueCoding": { "code": "0", "display": "Never" } },
    { "valueCoding": { "code": "1", "display": "Monthly or less" } },
    { "valueCoding": { "code": "2", "display": "2-4 times a month" } },
    { "valueCoding": { "code": "3", "display": "2-3 times a week" } },
    { "valueCoding": { "code": "4", "display": "4 or more times a week" } }
  ]
}
```

### 4b. valueCoding vs valueString vs valueInteger

- **Prefer `valueCoding`** even for "0/1/2/3"-style PROMs — gives you `system` + `code` + `display`, supports `ordinalValue`. Use a local CodeSystem URI (`http://forms.example.org/CodeSystem/phq9-frequency`) or LOINC answer codes (`LA*`).
- `valueInteger` only when the answer truly *is* a number with no label (rare in PROMs).
- `valueString` only for free-text fixed picks where no controlled vocabulary exists.

### 4c. Ordinal scoring — `ordinalValue` extension

Canonical URL: `http://hl7.org/fhir/StructureDefinition/ordinalValue`

Attach to each `answerOption` (or to the answer code in the underlying CodeSystem). Drives total-score calculations.

```json
{
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue",
      "valueDecimal": 0 }
  ],
  "valueCoding": { "system": "http://loinc.org", "code": "LA6568-5", "display": "Not at all" }
}
```

R5 successor is `itemWeight` (`http://hl7.org/fhir/StructureDefinition/itemWeight`) — for R4 author **`ordinalValue`**.

### 4d. `optionExclusive` — "None of the above"

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-optionExclusive`

```json
{
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-optionExclusive",
      "valueBoolean": true }
  ],
  "valueCoding": { "code": "none", "display": "None of the above" }
}
```

### 4e. `optionPrefix` — letter/numeric prefix shown before the answer text

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-optionPrefix`

```json
{
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-optionPrefix",
      "valueString": "a." }
  ],
  "valueCoding": { "code": "yes", "display": "Yes" }
}
```

### 4f. Initial selected

Use `initialSelected: true` on the option, or top-level `initial[]`:

```json
{ "valueCoding": { "code": "no", "display": "No" }, "initialSelected": true }
```

```json
"initial": [{ "valueCoding": { "code": "no", "display": "No" } }]
```

---

## 5. Rendering Hints

### 5a. `itemControl` — pick a UI widget

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl`
CodeSystem: `http://hl7.org/fhir/questionnaire-item-control`

| Code | Where it goes | Use for |
|---|---|---|
| `radio-button` | choice item | Small set, mutually exclusive |
| `check-box` | choice/open-choice (`repeats: true`) | Multi-select |
| `drop-down` | choice item | Long list (>6) |
| `autocomplete` | choice item | Big value set, type-ahead |
| `lookup` | choice item | Dialog/picker for huge sets |
| `slider` | integer/decimal | Numeric scale (pair with `sliderStepValue`, `minValue`, `maxValue`) |
| `spinner` | integer/decimal | Numeric with up/down |
| `text-box` | string/text | Free text (default) |
| `list` | group | Default vertical layout |
| `table` | group (`repeats: true`) | One child question per column, repeating rows |
| `gtable` | group (`repeats: false`) | **PHQ-9-style matrix** — child items as rows, shared answer columns |
| `htable` | group | Like table but transposed |
| `atable` | group | Single row, answer choices as columns |
| `grid` | group | Generic 2D layout |
| `page` | group | Render as a multi-page wizard, one page per child group |
| `tab-container` | group | Render as tabs, one tab per child group |
| `header` / `footer` | group | Persistent banner |
| `help` / `flyover` / `prompt` / `unit` / `lower` / `upper` / `optionalDisplay` | display item | Auxiliary text placement |

Generic shape:

```json
"extension": [
  { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
    "valueCodeableConcept": {
      "coding": [{ "system": "http://hl7.org/fhir/questionnaire-item-control",
                   "code": "radio-button" }]
    } }
]
```

### 5b. `choiceOrientation`

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation` (values: `horizontal` | `vertical`)

```json
{ "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation",
  "valueCode": "horizontal" }
```

### 5c. `displayCategory` — secondary instruction text

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory`
ValueSet codes: `instructions`, `security`, `help`.

```json
{
  "linkId": "phq9.instructions",
  "type": "display",
  "text": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory",
      "valueCodeableConcept": {
        "coding": [{ "system": "http://hl7.org/fhir/questionnaire-display-category",
                     "code": "instructions" }]
      } }
  ]
}
```

### 5d. `supportLink`

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink`

```json
{ "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink",
  "valueUri": "https://www.phqscreeners.com/" }
```

### 5e. `rendering-style` (inline CSS) and `rendering-xhtml` (rich text)

URLs:
- `http://hl7.org/fhir/StructureDefinition/rendering-style`
- `http://hl7.org/fhir/StructureDefinition/rendering-xhtml`
- (`http://hl7.org/fhir/StructureDefinition/rendering-markdown` — companion, markdown body)

Apply to the `_text` sibling (FHIR primitive-extension idiom):

```json
"text": "Important: do not include suicidal ideation here.",
"_text": {
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/rendering-style",
      "valueString": "color:#b00; font-weight:bold;" },
    { "url": "http://hl7.org/fhir/StructureDefinition/rendering-xhtml",
      "valueString": "<div xmlns=\"http://www.w3.org/1999/xhtml\"><strong style=\"color:#b00\">Important:</strong> do not include suicidal ideation here.</div>" }
  ]
}
```

### 5f. `entryFormat` — placeholder/format mask

URL: `http://hl7.org/fhir/StructureDefinition/entryFormat`

```json
{ "linkId": "demographics.phone", "type": "string", "text": "Phone",
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/entryFormat",
      "valueString": "nnn-nnn-nnnn" }
  ]
}
```

### 5g. `sliderStepValue`

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue`

```json
{ "linkId": "pain.now", "type": "integer", "text": "Pain right now (0–10)",
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
      "valueCodeableConcept": { "coding": [{ "system": "http://hl7.org/fhir/questionnaire-item-control", "code": "slider" }] } },
    { "url": "http://hl7.org/fhir/StructureDefinition/minValue",       "valueInteger": 0 },
    { "url": "http://hl7.org/fhir/StructureDefinition/maxValue",       "valueInteger": 10 },
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue", "valueInteger": 1 }
  ]
}
```

### 5h. `minValue` / `maxValue` / `minLength` / `maxLength` / `regex`

URLs:
- `http://hl7.org/fhir/StructureDefinition/minValue`
- `http://hl7.org/fhir/StructureDefinition/maxValue`
- `http://hl7.org/fhir/StructureDefinition/minLength`
- `http://hl7.org/fhir/StructureDefinition/regex`

`maxLength` is a **first-class element** on `item`, not an extension.

```json
{ "linkId": "demographics.zip", "type": "string", "text": "ZIP",
  "maxLength": 10,
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/minLength", "valueInteger": 5 },
    { "url": "http://hl7.org/fhir/StructureDefinition/regex",     "valueString": "^[0-9]{5}(-[0-9]{4})?$" }
  ]
}
```

### 5i. `unit` for quantity inputs

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-unit` (single fixed unit). For a chooser, use `questionnaire-unitOption` (repeating) or `questionnaire-unitValueSet`.

```json
{ "linkId": "vitals.weight", "type": "quantity", "text": "Weight",
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption",
      "valueCoding": { "system": "http://unitsofmeasure.org", "code": "kg", "display": "kg" } },
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption",
      "valueCoding": { "system": "http://unitsofmeasure.org", "code": "[lb_av]", "display": "lb" } }
  ]
}
```

### 5j. `hidden`

URL: `http://hl7.org/fhir/StructureDefinition/questionnaire-hidden`

Use for items that hold a derived value (e.g., total score) but shouldn’t render to the user — combine with `readOnly: true` + `calculatedExpression`.

```json
{ "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-hidden",
  "valueBoolean": true }
```

### 5k. First-class behavior toggles (not extensions)

```json
"required": true,
"repeats":  true,
"readOnly": false,
"maxLength": 200
```

### 5l. SDC-only rendering goodies

| Extension | URL | Use |
|---|---|---|
| `sdc-questionnaire-shortText` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText` | Compact label for mobile/table headers |
| `sdc-questionnaire-itemMedia` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemMedia` | Image/audio next to the question |
| `sdc-questionnaire-itemAnswerMedia` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemAnswerMedia` | Image next to an answer option |
| `sdc-questionnaire-collapsible` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible` | Group renders as accordion |
| `sdc-questionnaire-width` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-width` | Column width in a table/gtable |
| `sdc-questionnaire-columnCount` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-columnCount` | Multi-column choice list |
| `sdc-questionnaire-openLabel` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-openLabel` | Label for the free-text slot of an `open-choice` |

---

## 6. Behavior

### 6a. `enableWhen` — declarative conditional visibility

Operators (R4 core): `exists`, `=`, `!=`, `>`, `<`, `>=`, `<=`.
`enableBehavior`: `all` (AND) | `any` (OR), required when there are 2+ conditions.

```json
{
  "linkId": "pregnancy.lmp",
  "type": "date",
  "text": "Date of last menstrual period",
  "enableBehavior": "all",
  "enableWhen": [
    { "question": "demographics.gender", "operator": "=",
      "answerCoding": { "system": "http://hl7.org/fhir/administrative-gender", "code": "female" } },
    { "question": "demographics.age",    "operator": ">=", "answerInteger": 10 }
  ]
}
```

Match answer type to question type: `answerBoolean`, `answerDecimal`, `answerInteger`, `answerDate`, `answerDateTime`, `answerTime`, `answerString`, `answerCoding`, `answerQuantity`, `answerReference`.

### 6b. `enableWhenExpression` (SDC) — when `enableWhen` isn't enough

URL: `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression`

```json
{
  "linkId": "phq9.difficulty",
  "type": "choice",
  "text": "If you checked off any problems, how difficult have these problems made it...",
  "extension": [
    { "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression",
      "valueExpression": {
        "language": "text/fhirpath",
        "expression": "%resource.item.where(linkId.startsWith('phq9.q')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum() > 0"
      } }
  ]
}
```

### 6c. `calculatedExpression` — derived values (total scores)

URL: `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression`

Use on a `readOnly: true` (often `hidden: true`) item to compute. Companion CQF form uses `cqf-expression` on the value-bearing element — both shown.

```json
{
  "linkId": "phq9.totalScore",
  "type": "integer",
  "text": "Total score",
  "readOnly": true,
  "extension": [
    { "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
      "valueExpression": {
        "description": "Sum of ordinalValue for q1..q9",
        "language": "text/fhirpath",
        "expression": "%resource.item.descendants().where(linkId.matches('phq9\\\\.q[1-9]')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"
      } }
  ]
}
```

### 6d. `cqf-expression` — generic "compute this control field"

URL: `http://hl7.org/fhir/StructureDefinition/cqf-expression`

Used on any element to dynamically compute it (e.g., `required`, `minValue`, `answerValueSet`, or — like the SDC PHQ-9 example — the value itself via CQL).

```json
{
  "linkId": "phq9.totalScore", "type": "integer", "text": "Total score",
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/cqf-expression",
      "valueExpression": { "language": "text/cql", "expression": "CalculateTotalScore" } }
  ]
}
```

### 6e. `variable` — name an intermediate computation

URL: `http://hl7.org/fhir/StructureDefinition/variable`

Place on the root Questionnaire or any group; reference by `%name`.

```json
"extension": [
  { "url": "http://hl7.org/fhir/StructureDefinition/variable",
    "valueExpression": {
      "name": "phq9Sum",
      "language": "text/fhirpath",
      "expression": "%resource.item.descendants().where(linkId.matches('phq9\\\\.q[1-9]')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"
    } }
]
```

Then in a child:

```json
{ "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
  "valueExpression": { "language": "text/fhirpath", "expression": "%phq9Sum" } }
```

### 6f. `required` vs constraint

- `"required": true` — must be answered before `QuestionnaireResponse.status` can become `completed`.
- For multi-answer minimums on a single repeating item, use `questionnaire-minOccurs` / `questionnaire-maxOccurs`:
  - `http://hl7.org/fhir/StructureDefinition/questionnaire-minOccurs`
  - `http://hl7.org/fhir/StructureDefinition/questionnaire-maxOccurs`
- For cross-item rules, use `targetConstraint` (`http://hl7.org/fhir/StructureDefinition/targetConstraint`) with a FHIRPath that must evaluate true. (Supersedes `regex` for complex string validation per SDC STU4.)

```json
{ "url": "http://hl7.org/fhir/StructureDefinition/targetConstraint",
  "valueExpression": {
    "language": "text/fhirpath",
    "expression": "answer.valueString.matches('^[0-9]{5}$')"
  } }
```

---

## 7. Matrix / Grid PROM Idiom (PHQ-9 Template — Use Verbatim)

Wrap items in a non-repeating group with `itemControl = gtable`. Each child is a row, sharing a common `answerValueSet`/`answerOption`. Group-level `calculatedExpression` (or `cqf-expression`) computes the total.

```json
{
  "resourceType": "Questionnaire",
  "url": "http://forms.example.org/Questionnaire/phq9",
  "version": "1.0.0",
  "name": "PHQ9",
  "title": "Patient Health Questionnaire (PHQ-9)",
  "status": "active",
  "subjectType": ["Patient"],
  "code": [{ "system": "http://loinc.org", "code": "44249-1",
             "display": "PHQ-9 quick depression assessment panel [Reported.PHQ]" }],
  "derivedFrom": ["http://loinc.org/q/44249-1"],

  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/variable",
      "valueExpression": {
        "name": "phq9Sum", "language": "text/fhirpath",
        "expression": "%resource.item.descendants().where(linkId.startsWith('phq9.matrix.')).answer.valueCoding.extension.where(url='http://hl7.org/fhir/StructureDefinition/ordinalValue').valueDecimal.sum()"
      } }
  ],

  "item": [
    {
      "linkId": "phq9.instructions",
      "type": "display",
      "text": "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
      "extension": [
        { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory",
          "valueCodeableConcept": {
            "coding": [{ "system": "http://hl7.org/fhir/questionnaire-display-category",
                         "code": "instructions" }]
          } }
      ]
    },

    {
      "linkId": "phq9.matrix",
      "type": "group",
      "text": "PHQ-9 items",
      "repeats": false,
      "extension": [
        { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
          "valueCodeableConcept": {
            "coding": [{ "system": "http://hl7.org/fhir/questionnaire-item-control",
                         "code": "gtable" }]
          } }
      ],
      "item": [
        { "linkId": "phq9.matrix.q1", "type": "choice", "required": true, "repeats": false,
          "text": "Little interest or pleasure in doing things",
          "code": [{ "system": "http://loinc.org", "code": "44250-9" }],
          "answerOption": [
            { "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 0 }],
              "valueCoding": { "system": "http://loinc.org", "code": "LA6568-5", "display": "Not at all" } },
            { "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 1 }],
              "valueCoding": { "system": "http://loinc.org", "code": "LA6569-3", "display": "Several days" } },
            { "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 2 }],
              "valueCoding": { "system": "http://loinc.org", "code": "LA6570-1", "display": "More than half the days" } },
            { "extension": [{ "url": "http://hl7.org/fhir/StructureDefinition/ordinalValue", "valueDecimal": 3 }],
              "valueCoding": { "system": "http://loinc.org", "code": "LA6571-9", "display": "Nearly every day" } }
          ]
        },
        { "linkId": "phq9.matrix.q2", "type": "choice", "required": true, "repeats": false,
          "text": "Feeling down, depressed, or hopeless",
          "code": [{ "system": "http://loinc.org", "code": "44255-8" }],
          "answerValueSet": "http://loinc.org/vs/LL358-3" }

        /* …q3..q9 follow the same shape; either repeat the inline answerOption
           list (so ordinalValue is local) or reference answerValueSet and rely
           on the terminology server / CodeSystem to carry ordinalValue. */
      ]
    },

    {
      "linkId": "phq9.totalScore",
      "type": "integer",
      "text": "PHQ-9 total score",
      "readOnly": true,
      "code": [{ "system": "http://loinc.org", "code": "44261-6",
                 "display": "Patient Health Questionnaire 9 item total score" }],
      "extension": [
        { "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression",
          "valueExpression": {
            "description": "Sum of PHQ-9 item ordinalValues",
            "language": "text/fhirpath",
            "expression": "%phq9Sum"
          } }
      ]
    },

    {
      "linkId": "phq9.difficulty",
      "type": "choice",
      "text": "If you checked off any problems, how difficult have these problems made it for you to do your work, take care of things at home, or get along with other people?",
      "code": [{ "system": "http://loinc.org", "code": "44256-6" }],
      "answerOption": [
        { "valueCoding": { "code": "0", "display": "Not difficult at all" } },
        { "valueCoding": { "code": "1", "display": "Somewhat difficult" } },
        { "valueCoding": { "code": "2", "display": "Very difficult" } },
        { "valueCoding": { "code": "3", "display": "Extremely difficult" } }
      ],
      "extension": [
        { "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression",
          "valueExpression": { "language": "text/fhirpath", "expression": "%phq9Sum > 0" } }
      ]
    }
  ]
}
```

**Reuse pattern for GAD-7, AUDIT-C, NICHQ Vanderbilt, STOP-BANG, KOOS, WOMAC, ODI**: change the `linkId` prefix, swap the `answerOption` list and ordinalValues, and update the variable expression accordingly. The `gtable` + `ordinalValue` + group-level `calculatedExpression` triad fits all of them.

---

## 8. Display-Only Content

`type: "display"` items render text but capture no answer.

```json
{
  "linkId": "audit.preamble",
  "type": "display",
  "text": "AUDIT-C is a 3-item alcohol screen. Choose the response that best describes your experience over the past year.",
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory",
      "valueCodeableConcept": {
        "coding": [{ "system": "http://hl7.org/fhir/questionnaire-display-category",
                     "code": "instructions" }]
      } },
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink",
      "valueUri": "https://www.hepatitis.va.gov/alcohol/treatment/audit-c.asp" }
  ]
}
```

Rich text help block:

```json
{
  "linkId": "intake.help",
  "type": "display",
  "text": "If you need help completing this form, please ask the front-desk staff.",
  "_text": {
    "extension": [
      { "url": "http://hl7.org/fhir/StructureDefinition/rendering-xhtml",
        "valueString": "<div xmlns=\"http://www.w3.org/1999/xhtml\">If you need help completing this form, please <em>ask the front-desk staff</em>, or call <a href=\"tel:+15551234567\">555-123-4567</a>.</div>" }
    ]
  }
}
```

For inline contextual hint near a single question, nest a child display item with `itemControl = help` or `flyover`:

```json
{
  "linkId": "demographics.ssn", "type": "string", "text": "SSN (last 4)",
  "item": [
    { "linkId": "demographics.ssn.help", "type": "display",
      "text": "We use this only to match prior records. Stored encrypted.",
      "extension": [
        { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
          "valueCodeableConcept": {
            "coding": [{ "system": "http://hl7.org/fhir/questionnaire-item-control",
                         "code": "help" }] } }
      ] }
  ]
}
```

---

## 9. Sectioning

Default: nest `type: "group"` items. Renderers show them sequentially as collapsible sections (use `sdc-questionnaire-collapsible` to be explicit).

Multi-page packet (wizard):

```json
{
  "linkId": "packet",
  "type": "group",
  "extension": [
    { "url": "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl",
      "valueCodeableConcept": {
        "coding": [{ "system": "http://hl7.org/fhir/questionnaire-item-control",
                     "code": "page" }] } }
  ],
  "item": [
    { "linkId": "packet.demographics", "type": "group", "text": "Demographics", "item": [/* … */] },
    { "linkId": "packet.history",      "type": "group", "text": "Medical history", "item": [/* … */] },
    { "linkId": "packet.phq9",         "type": "group", "text": "PHQ-9", "item": [/* … */] }
  ]
}
```

Same shape but with `tab-container` to render tabs instead of pages.

Useful auxiliary on each page group:

```json
{ "url": "http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible",
  "valueCode": "default-open" }
```

---

## 10. Out of Scope (Do NOT add to these forms)

The user has explicitly opted out of prepop / extraction / launch workflows. **Do not** include any of these — they will be ignored by your runtime and add noise:

| Don’t use | Canonical URL | What it’s for (skip) |
|---|---|---|
| `sdc-questionnaire-launchContext` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-launchContext` | Declares external context (patient/user/encounter) injected at launch |
| `sdc-questionnaire-initialExpression` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-initialExpression` | Computes initial answer at form load (prepop) |
| `sdc-questionnaire-candidateExpression` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-candidateExpression` | Supplies candidate values from context (prepop) |
| `sdc-questionnaire-contextExpression` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-contextExpression` | Holds prepop context (prepop) |
| `sdc-questionnaire-itemPopulationContext` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemPopulationContext` | Scopes repeating-group prepop |
| `sdc-questionnaire-sourceQueries` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-sourceQueries` | Batch query for $populate |
| `sdc-questionnaire-itemExtractionContext` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemExtractionContext` | Maps response items to extracted resources |
| `sdc-questionnaire-observationExtract` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationExtract` | Per-item observation extract flag |
| `sdc-questionnaire-observation-extract-category` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observation-extract-category` | Category for extracted Observations |
| `sdc-questionnaire-observationLinkPeriod` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-observationLinkPeriod` | Time window for linking pre-existing Observations |
| `sdc-questionnaire-endpoint` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-endpoint` | Where the filler should POST results |
| `sdc-questionnaire-entryMode` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-entryMode` | Form-filler navigation mode |
| `sdc-questionnaire-lookupQuestionnaire` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-lookupQuestionnaire` | Launch sub-form for new resource entry |
| `sdc-questionnaire-answerExpression` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerExpression` | Dynamic answer-set lookup from FHIR query |
| `sdc-questionnaire-answerOptionsToggleExpression` | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-answerOptionsToggleExpression` | Enable/disable individual options dynamically |
| Adaptive `$next-question` op | `http://hl7.org/fhir/uv/sdc/OperationDefinition/Questionnaire-next-question` | Server-driven adaptive forms |

Also skip: `meta.profile` referencing `sdc-questionnaire-extr-*` profiles (those constrain for extraction).

---

## 11. Quick Reference Table

### 11a. Core FHIR R4 Questionnaire extensions

| Extension | URL | Purpose | Minimal JSON |
|---|---|---|---|
| itemControl | `http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl` | Pick UI widget | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl","valueCodeableConcept":{"coding":[{"system":"http://hl7.org/fhir/questionnaire-item-control","code":"radio-button"}]}}` |
| choiceOrientation | `http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation` | horizontal/vertical | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation","valueCode":"horizontal"}` |
| displayCategory | `http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory` | Mark display text role | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory","valueCodeableConcept":{"coding":[{"system":"http://hl7.org/fhir/questionnaire-display-category","code":"instructions"}]}}` |
| supportLink | `http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink` | External help URL | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink","valueUri":"https://example.org/help"}` |
| sliderStepValue | `http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue` | Slider increment | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue","valueInteger":1}` |
| minValue | `http://hl7.org/fhir/StructureDefinition/minValue` | Lower bound | `{"url":"http://hl7.org/fhir/StructureDefinition/minValue","valueInteger":0}` |
| maxValue | `http://hl7.org/fhir/StructureDefinition/maxValue` | Upper bound | `{"url":"http://hl7.org/fhir/StructureDefinition/maxValue","valueInteger":10}` |
| minLength | `http://hl7.org/fhir/StructureDefinition/minLength` | Min chars | `{"url":"http://hl7.org/fhir/StructureDefinition/minLength","valueInteger":2}` |
| regex | `http://hl7.org/fhir/StructureDefinition/regex` | Validation regex | `{"url":"http://hl7.org/fhir/StructureDefinition/regex","valueString":"^[0-9]{5}$"}` |
| entryFormat | `http://hl7.org/fhir/StructureDefinition/entryFormat` | Placeholder/mask | `{"url":"http://hl7.org/fhir/StructureDefinition/entryFormat","valueString":"YYYY-MM-DD"}` |
| unit | `http://hl7.org/fhir/StructureDefinition/questionnaire-unit` | Fixed unit for quantity | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-unit","valueCoding":{"system":"http://unitsofmeasure.org","code":"kg"}}` |
| unitOption | `http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption` | Allowed unit (repeat) | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption","valueCoding":{"system":"http://unitsofmeasure.org","code":"kg"}}` |
| unitValueSet | `http://hl7.org/fhir/StructureDefinition/questionnaire-unitValueSet` | Unit VS | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-unitValueSet","valueCanonical":"http://hl7.org/fhir/ValueSet/ucum-common"}` |
| hidden | `http://hl7.org/fhir/StructureDefinition/questionnaire-hidden` | Don't render | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-hidden","valueBoolean":true}` |
| optionExclusive | `http://hl7.org/fhir/StructureDefinition/questionnaire-optionExclusive` | "None of the above" | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-optionExclusive","valueBoolean":true}` |
| optionPrefix | `http://hl7.org/fhir/StructureDefinition/questionnaire-optionPrefix` | Prefix label (a. b. c.) | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-optionPrefix","valueString":"a."}` |
| ordinalValue | `http://hl7.org/fhir/StructureDefinition/ordinalValue` | Numeric weight on option | `{"url":"http://hl7.org/fhir/StructureDefinition/ordinalValue","valueDecimal":2}` |
| minOccurs | `http://hl7.org/fhir/StructureDefinition/questionnaire-minOccurs` | Min repeats | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-minOccurs","valueInteger":1}` |
| maxOccurs | `http://hl7.org/fhir/StructureDefinition/questionnaire-maxOccurs` | Max repeats | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-maxOccurs","valueInteger":5}` |
| referenceResource | `http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource` | Constrain Reference target type | `{"url":"http://hl7.org/fhir/StructureDefinition/questionnaire-referenceResource","valueCode":"Practitioner"}` |
| rendering-style | `http://hl7.org/fhir/StructureDefinition/rendering-style` | Inline CSS on `_text` | `{"url":"http://hl7.org/fhir/StructureDefinition/rendering-style","valueString":"font-weight:bold"}` |
| rendering-xhtml | `http://hl7.org/fhir/StructureDefinition/rendering-xhtml` | Rich text on `_text` | `{"url":"http://hl7.org/fhir/StructureDefinition/rendering-xhtml","valueString":"<div xmlns=\"http://www.w3.org/1999/xhtml\">…</div>"}` |
| rendering-markdown | `http://hl7.org/fhir/StructureDefinition/rendering-markdown` | Markdown on `_text` | `{"url":"http://hl7.org/fhir/StructureDefinition/rendering-markdown","valueString":"**bold**"}` |
| cqf-expression | `http://hl7.org/fhir/StructureDefinition/cqf-expression` | Compute any control field | `{"url":"http://hl7.org/fhir/StructureDefinition/cqf-expression","valueExpression":{"language":"text/fhirpath","expression":"%score"}}` |
| variable | `http://hl7.org/fhir/StructureDefinition/variable` | Named intermediate value | `{"url":"http://hl7.org/fhir/StructureDefinition/variable","valueExpression":{"name":"x","language":"text/fhirpath","expression":"1+1"}}` |
| targetConstraint | `http://hl7.org/fhir/StructureDefinition/targetConstraint` | Cross-item assertion | `{"url":"http://hl7.org/fhir/StructureDefinition/targetConstraint","valueExpression":{"language":"text/fhirpath","expression":"answer.exists()"}}` |

### 11b. SDC-only extensions in scope

| Extension | URL | Purpose | Minimal JSON |
|---|---|---|---|
| calculatedExpression | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression` | Compute item value | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression","valueExpression":{"language":"text/fhirpath","expression":"%phq9Sum"}}` |
| enableWhenExpression | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression` | Conditional visibility (FHIRPath) | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression","valueExpression":{"language":"text/fhirpath","expression":"%phq9Sum > 0"}}` |
| shortText | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText` | Compact label | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText","valueString":"PHQ-9 #1"}` |
| itemMedia | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemMedia` | Image/audio next to question | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemMedia","valueAttachment":{"contentType":"image/png","url":"https://example.org/face.png"}}` |
| itemAnswerMedia | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-itemAnswerMedia` | Image per answer option | (same Attachment shape, sits inside `answerOption.extension`) |
| collapsible | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible` | Accordion group | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible","valueCode":"default-open"}` |
| width | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-width` | Column width in tables | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-width","valueQuantity":{"value":25,"unit":"%"}}` |
| columnCount | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-columnCount` | Multi-column choice list | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-columnCount","valueInteger":2}` |
| openLabel | `http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-openLabel` | Label for open-choice free-text slot | `{"url":"http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-openLabel","valueString":"Other (please specify)"}` |

### 11c. itemControl code cheat-list

CodeSystem: `http://hl7.org/fhir/questionnaire-item-control`

- **Group containers**: `list` (default), `table`, `gtable`, `htable`, `atable`, `grid`, `header`, `footer`, `page`, `tab-container`
- **Question widgets**: `radio-button`, `check-box`, `drop-down`, `autocomplete`, `lookup`, `slider`, `spinner`, `text-box`
- **Display roles**: `inline`, `prompt`, `unit`, `lower`, `upper`, `flyover`, `help`, `optionalDisplay`

### 11d. displayCategory codes

CodeSystem: `http://hl7.org/fhir/questionnaire-display-category` — `instructions`, `security`, `help`.

### 11e. enableWhen operator cheat-list

`exists` · `=` · `!=` · `>` · `<` · `>=` · `<=`
`enableBehavior`: `all` (AND) | `any` (OR).

---

## Author Checklist (per form)

1. Set `url`, `version`, `name`, `title`, `status`, `subjectType`, `code`, `derivedFrom` (if applicable).
2. Choose linkId namespace (e.g., `phq9.*`), commit to dotted-path.
3. For PROMs: use the **gtable matrix template** (Section 7); attach `ordinalValue` to every option.
4. Add total-score item: `type: integer`, `readOnly: true`, `calculatedExpression` summing ordinals; optionally `hidden`.
5. Wrap multi-section packets in a `page` or `tab-container` group.
6. Use `displayCategory=instructions` for preambles; `supportLink` for citation/credit.
7. Validate: every `linkId` unique within the resource; every `enableWhen.question` resolves to an existing linkId; every `answerOption.valueX` matches the parent item type.
8. **Do NOT add** anything from Section 10.
