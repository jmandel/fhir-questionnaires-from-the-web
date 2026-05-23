# Visit-specific forms don't have to stay on the clipboard

*A walk through what it actually takes to turn a clinic's intake or follow-up form into something a patient's app can fill in before the visit.*

---

Every clinic has a stack of forms it asks patients to fill out. Some are well-known PROMs — PHQ-9, GAD-7, AUDIT-C, the Oswestry, the KOOS. Some are unique to the practice: a new-patient packet that asks for the usual demographics plus three site-specific questions about prior imaging and referring provider. Some only exist because the front desk staff added them after a particular incident two years ago.

The stack lives in a different place at every site. Most often it's inside the EHR's own forms module (Epic's questionnaires, Cerner's PowerForms, athena's encounter forms). Sometimes it's a dedicated check-in vendor — Phreesia, Clearwave, Yosi, Relatient, Solutionreach — that owns the patient-facing experience and pushes back into the chart. Sometimes it's a generic form tool (JotForm, Formstack, Microsoft Forms, REDCap) wired up by the office manager. There's usually a paper version still kicking around for backup. There are companies that specialize in making this whole layer easier, and they do good work; the point of this post isn't that the existing tooling is bad. The point is that the diversity is itself the situation. There's no single place a patient's app can go to "get the forms for tomorrow's visit," because every clinic's forms live somewhere different and travel as a different artifact.

The April and July 2026 [KTC](https://www.linkedin.com/pulse/kill-clipboard-july-2026-sharing-fhir-data-patient-stories-josh-mandel-md-uhwjc) milestones don't touch any of this. PAMI structured data moves under those rules; the visit-specific questionnaire still gets handed to you on the clipboard. That's the next obvious gap, and it's worth being concrete about how big a lift it is, because the answer is "smaller than it sounds" — and that creates room for new and more open approaches alongside the established vendors.

## Two flavors of "the clinic's form"

I spent about seven hours recently converting 224 harvested provider PDFs into 72 FHIR Questionnaire resources — not as a production exercise, but to find out what's hard and what isn't. The most useful distinction that fell out wasn't by specialty or by complexity. It was a single binary:

- **Standardized** — a named published instrument with its own copyright and (usually) a LOINC question-set code. PHQ-9, GAD-7, AUDIT-C, KOOS, ODI, IPSS, KCCQ-12, FIQR, and dozens more. Of 72 resources, **48 were standardized** (38 with LOINC bindings, 10 without).
- **Local** — a composition unique to one practice. The Stanford Orthopedics new-patient packet, the BWH Center for Brain/Mind intake, the UPMC Jameson Bariatrics health-history form. **24 of 72.**

This matters operationally for any clinic thinking about what it would take to participate in a KTC-style check-in. Standardized forms can — and should — be sourced from a shared catalog; the work of representing them in FHIR Questionnaire only needs to happen once globally. Local forms need to be authored once per site, because they encode that site's specific workflow. The cost profiles are different, and pretending otherwise leads to either over-engineering (treating every form as bespoke) or over-promising (assuming the catalog will magically cover a clinic's local intake).

A related observation from the harvest: among the standardized forms, the same instrument is republished *constantly*. I found **AUDIT-C posted by ten different sites** — the VA, AHRQ, Kaiser, Oregon state, several health systems, several professional societies. Identical clinical content, slightly different layouts. Across the 142 PDFs in the standardized-PROM bucket, the dedup ratio was about 3:1. The practical implication: if you author a high-quality Questionnaire for PHQ-9 once and publish it openly, you've done work that thousands of clinics would otherwise each repeat.

## What "converting a form" actually means

Most PROMs reduce to the same shape: a group of rate-each-symptom items sharing one answer set, plus a computed total score. FHIR's [Structured Data Capture IG](http://hl7.org/fhir/uv/sdc/) (SDC) has a clean recipe for this — a group with `itemControl: gtable`, answer options carrying `ordinalValue` extensions, and a `calculatedExpression` that sums the ordinals via FHIRPath. The expression looks something like:

```
%resource.item.descendants()
  .where(linkId.startsWith('phq9.matrix.'))
  .answer.valueCoding.extension
  .where(url = 'http://hl7.org/fhir/StructureDefinition/ordinalValue')
  .valueDecimal.sum()
```

That one idiom covers most of what a PROM is. The first time I wrote it (for PHQ-9) it took about 45 minutes including reading the spec carefully. After that, GAD-7 took 10 minutes, KOOS took 20, and the rest of the 20+ matrix-shaped instruments — WOMAC, FIQR, AIMS, ISI, ESS, FLACC, BPI-SF, MDQ, ASRS, MAHC-10, PAID-20, the four Vanderbilt variants, RAPID3, SF-MPQ — each took 10–15 minutes once a small builder library was in place. The full per-form recipe is in [notes/sdc-best-practices.md](https://github.com/jmandel/fhir-questionnaires-from-the-web/blob/main/notes/sdc-best-practices.md) if you want the specifics.

Local intake packets are more work, because they're more idiosyncratic — a typical AMC new-patient packet is 100–250 items across demographics, insurance, current medications, allergies, surgical history, family history, social history, and three or four specialty-specific sections. But there's no special trick; they're just longer. A few hours each.

## What the conversion deliberately leaves out

SDC has features for prepopulating a Questionnaire from existing FHIR data (`launchContext`, `initialExpression`, `itemPopulationContext`), for extracting structured Observations from responses (`itemExtractionContext`, `observationExtract`), for adaptive question delivery, and for querying remote terminology servers at render time. These are real, useful features, and they belong in production deployments eventually.

None of them are required to make a form fillable in a patient app. Leaving them out keeps the artifact portable and easy to author — the same Questionnaire JSON can be rendered by a patient's wallet app, by a kiosk in the waiting room, by a developer test harness, and by a clinician-facing tool, without each renderer having to agree on a population semantics or a terminology server endpoint. The 72 Questionnaires in this collection use 15 SDC features and explicitly avoid 14 others. The "do not use" list turned out to be as load-bearing as the "do use" list.

## Provenance is the operational glue

For a clinic, the practical question after "we have a Questionnaire JSON file" is "how do we know this is *our* form, derived from *that* PDF, current as of *this date*?" Standard FHIR `meta` handles most of it:

```json
"meta": {
  "source": "https://example-clinic.org/forms/intake-2024.pdf",
  "tag": [
    { "system": ".../specialty",   "code": "ortho-knee" },
    { "system": ".../form-type",   "code": "prom" }
  ],
  "extension": [
    { "url": ".../sourceSha256", "valueString": "abc123…" }
  ]
}
```

`meta.source` is core FHIR. `meta.tag` carries facets for browsing. A small extension records the source hash so a clinic can tell the patient-app side, "if you've cached version `abc123…`, you're current; if not, refresh." Versioning a Questionnaire properly also means filling in `version`, `date`, and `lastReviewDate` — boring but essential metadata for any artifact that's going to ship.

For the harvest experiment, I also tracked the redundancy explicitly: a custom `alsoSeenAt` extension lists every other public URL that posts the same instrument. That's overkill for a single clinic publishing its own forms, but it's the right shape if anyone wants to operate a shared catalog of standardized instruments.

## A small builder library beat hand-authoring JSON

The PHQ-9 Questionnaire JSON, hand-written, was about 200 lines. After three or four forms, it was clearly worth investing in a thin layer of helpers — `questionnaire()`, `group()`, `ordinal()`, `variable()`, `calcExpr()`. Each per-instrument builder script became 50–150 lines of declarative-feeling code instead of 200–500 lines of JSON. The full [RAPID3 builder](https://github.com/jmandel/fhir-questionnaires-from-the-web/blob/main/scripts/build/rapid3.mjs) is 68 lines and produces a Questionnaire that validates cleanly and renders sensibly. There's nothing proprietary in the layer — the output is plain Questionnaire JSON.

A 90-line [local validator](https://github.com/jmandel/fhir-questionnaires-from-the-web/blob/main/scripts/validate.mjs) checks that every `enableWhen.question` resolves to an actual `linkId`, that no banned extensions sneak in, and that `answerOption` types match the parent item type. It runs in 50ms on the full 72-Questionnaire set, which is fast enough to run on every file save. Two real bug classes got caught early: template-string typos that made the JSON unparseable, and prepopulation extensions that I'd typed reflexively while authoring.

This pattern — small builder + fast validator — is not novel. It just keeps showing up as the cheapest way to maintain a Questionnaire collection at any meaningful scale.

## How this slots into a check-in handshake

The piece that would close the loop is what your [KTC July post](https://www.linkedin.com/pulse/kill-clipboard-july-2026-sharing-fhir-data-patient-stories-josh-mandel-md-uhwjc) called out as the next step: a check-in protocol where the clinic can tell the patient's app what it needs for this specific visit, and the app can respond with the requested items. The [SMART Health Check-in](https://github.com/smart-on-fhir/smart-health-checkin) prototype demonstrates one shape for that handshake.

The conversion work described here is the supply side — making the clinic's existing forms available as artifacts the protocol can reference. The check-in protocol is the demand side. They don't need to be solved by the same people or the same vendors, but they need to fit together, and they fit best when the artifact in the middle is plain FHIR Questionnaire JSON without a vendor-specific extension stack.

There's plenty of room here for established check-in companies to participate — they already own the clinic relationships, the workflow integration, and the patient-facing rendering on tablets and kiosks. What an open conversion path adds is that the *artifact* (the Questionnaire) isn't trapped inside any one vendor's library. A clinic that publishes its forms as Questionnaire JSON behind a stable URL can be served by its existing check-in vendor today and by a patient-side wallet app tomorrow, without re-authoring.

## What a clinic would actually have to do

Concrete and modest:

- **Inventory.** Most clinics have somewhere between 5 and 25 distinct forms in active rotation. List them.
- **Triage standardized vs. local.** The standardized ones may already exist in a shared catalog (the [collection from this experiment](http://joshuamandel.com/fhir-questionnaires-from-the-web/) is one starting point — 48 standardized instruments with provenance). The local ones get authored once.
- **Author with the matrix idiom where it fits.** Skip the population and extraction features. Use a small builder, a fast validator, and version metadata from day one.
- **Publish at a stable URL.** Behind whatever authentication the clinic wants; a patient app needs to fetch the Questionnaire, not the answers.
- **Decide on the return path.** Patient answers can come back as a structured `QuestionnaireResponse`, as a rendered PDF, or both — the same two-artifact logic as the July PAMI rule.

None of these steps requires a multi-quarter project. A motivated practice with one technical person could put its top five forms online as Questionnaires in a sprint.

## What's still hard

Three pieces of honest scope:

- **Mapping rendered answers back into the EHR.** Saving a `QuestionnaireResponse` is straightforward; turning a PHQ-9 score into a discrete row on the depression flowsheet, or an ODI score into the back-pain assessment field, is EHR-specific work. SDC's `observationExtract` mechanism is the standards answer; in practice, most EHRs don't act on it yet, so each integration is still partly bespoke.
- **Form revisions and versioning.** A clinic that updates its intake quarterly needs the patient app to pick up the new version without manual coordination. Canonical URL plus version plus a discovery endpoint is the right shape; nobody's operating that endpoint at scale yet.
- **Copyright on standardized instruments.** Some PROMs are free for any clinical use. Some require attribution. A few require paid licensing for commercial deployment. A shared catalog has to track this per-instrument honestly, not paper over it. The `copyright` field on a Questionnaire is the right place; populating it accurately for 50+ instruments is real work that needs doing once.

## Close

The April KTC rule established that patient-shared documents have a place in the chart. The July rule did the same for PAMI structured data. The visit-specific questionnaire is the next concrete chunk — and the conversion work to make a clinic's existing forms participate in a check-in workflow isn't a research project. It's mechanical, the recipes are short, and the tools fit on one screen.

The collection from the experiment that informed this post — 72 FHIR Questionnaire resources, the per-instrument builder scripts, the SDC author cheat-sheet, the validator, the raw source PDFs with full provenance, and a browsable catalog — is at **[github.com/jmandel/fhir-questionnaires-from-the-web](https://github.com/jmandel/fhir-questionnaires-from-the-web)** with the live catalog at **[joshuamandel.com/fhir-questionnaires-from-the-web](http://joshuamandel.com/fhir-questionnaires-from-the-web/)**. MIT-licensed for the code and JSON. Use it, copy it, fork it — the point is that this layer should be open, lightweight, and re-usable, so the established vendors and the open ecosystem can both build on the same artifacts.
