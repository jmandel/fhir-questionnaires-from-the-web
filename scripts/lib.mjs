// Helpers for building FHIR Questionnaire JSON for this collection.
// Used by per-form builder scripts in fhir/scripts/build/.

export const BASE = 'http://hobby.intake-forms/fhir';

export const EXT = {
  itemControl: 'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
  displayCategory: 'http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory',
  ordinalValue: 'http://hl7.org/fhir/StructureDefinition/ordinalValue',
  optionExclusive: 'http://hl7.org/fhir/StructureDefinition/questionnaire-optionExclusive',
  optionPrefix: 'http://hl7.org/fhir/StructureDefinition/questionnaire-optionPrefix',
  variable: 'http://hl7.org/fhir/StructureDefinition/variable',
  hidden: 'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden',
  minOccurs: 'http://hl7.org/fhir/StructureDefinition/questionnaire-minOccurs',
  maxOccurs: 'http://hl7.org/fhir/StructureDefinition/questionnaire-maxOccurs',
  choiceOrientation: 'http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation',
  sliderStepValue: 'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue',
  minValue: 'http://hl7.org/fhir/StructureDefinition/minValue',
  maxValue: 'http://hl7.org/fhir/StructureDefinition/maxValue',
  regex: 'http://hl7.org/fhir/StructureDefinition/regex',
  entryFormat: 'http://hl7.org/fhir/StructureDefinition/entryFormat',
  unit: 'http://hl7.org/fhir/StructureDefinition/questionnaire-unit',
  unitOption: 'http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption',
  supportLink: 'http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink',
  renderingXhtml: 'http://hl7.org/fhir/StructureDefinition/rendering-xhtml',
  calculatedExpression: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
  enableWhenExpression: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression',
  shortText: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText',
  collapsible: 'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible',
};

export const SYS = {
  loinc: 'http://loinc.org',
  snomed: 'http://snomed.info/sct',
  yn: 'http://terminology.hl7.org/CodeSystem/v2-0136', // Y/N
  itemControl: 'http://hl7.org/fhir/questionnaire-item-control',
  displayCategory: 'http://hl7.org/fhir/questionnaire-display-category',
  adminGender: 'http://hl7.org/fhir/administrative-gender',
};

export function itemControl(code) {
  return { url: EXT.itemControl, valueCodeableConcept: { coding: [{ system: SYS.itemControl, code }] } };
}
export function displayCategory(code = 'instructions') {
  return { url: EXT.displayCategory, valueCodeableConcept: { coding: [{ system: SYS.displayCategory, code }] } };
}
export function ordinal(n) { return { url: EXT.ordinalValue, valueDecimal: n }; }
export function variable(name, expression) {
  return { url: EXT.variable, valueExpression: { name, language: 'text/fhirpath', expression } };
}
export function calcExpr(expression, description) {
  return { url: EXT.calculatedExpression, valueExpression: { description, language: 'text/fhirpath', expression } };
}
export function whenExpr(expression) {
  return { url: EXT.enableWhenExpression, valueExpression: { language: 'text/fhirpath', expression } };
}
export function yn(opts = {}) {
  const yesOrd = opts.yesOrd ?? 1, noOrd = opts.noOrd ?? 0;
  return [
    { extension: [ordinal(noOrd)],  valueCoding: { system: SYS.yn, code: 'N', display: 'No' } },
    { extension: [ordinal(yesOrd)], valueCoding: { system: SYS.yn, code: 'Y', display: 'Yes' } },
  ];
}
export function ordOptions(labels, system) {
  // labels = [{ord, code, display}, ...]
  return labels.map(({ ord, code, display }) => ({
    extension: [ordinal(ord)],
    valueCoding: { ...(system ? { system } : {}), code, display },
  }));
}
export function display(linkId, text, opts = {}) {
  const o = { linkId, type: 'display', text };
  const exts = [];
  if (opts.category) exts.push(displayCategory(opts.category));
  if (opts.support) exts.push({ url: EXT.supportLink, valueUri: opts.support });
  if (exts.length) o.extension = exts;
  return o;
}
export function group(linkId, text, items, opts = {}) {
  const g = { linkId, type: 'group', text, item: items };
  const exts = [];
  if (opts.control) exts.push(itemControl(opts.control));
  if (opts.repeats) g.repeats = true;
  if (exts.length) g.extension = exts;
  return g;
}
export function totalScore(linkId, text, varName, loinc) {
  const o = {
    linkId, type: 'integer', text, readOnly: true,
    extension: [calcExpr(`%${varName}`, `Sum of item ordinalValues`)],
  };
  if (loinc) o.code = [{ system: SYS.loinc, code: loinc }];
  return o;
}
// source: { sourcePdf: 'raw/pdf/...', sourceUrl: '...', specialty, formType, host, sha256, alsoSeen?: [paths] }
export function questionnaire({ id, name, title, code, copyright, derivedFrom, item, extension = [], extra = {}, source }) {
  const meta = source ? buildMeta(source) : undefined;
  return {
    resourceType: 'Questionnaire',
    id,
    ...(meta ? { meta } : {}),
    url: `${BASE}/Questionnaire/${id}`,
    version: '1.0.0',
    name,
    title,
    status: 'draft',
    experimental: true,
    subjectType: ['Patient'],
    date: '2026-05-22',
    publisher: 'intake-forms research collection',
    ...(copyright ? { copyright } : {}),
    ...(derivedFrom ? { derivedFrom } : {}),
    ...(code ? { code } : {}),
    ...(extension.length ? { extension } : {}),
    item,
    ...extra,
  };
}

export function buildMeta(s) {
  const tags = [];
  if (s.specialty) tags.push({ system: `${BASE}/CodeSystem/specialty`, code: s.specialty });
  if (s.formType)  tags.push({ system: `${BASE}/CodeSystem/form-type`, code: s.formType });
  if (s.host)      tags.push({ system: `${BASE}/CodeSystem/source-host`, code: s.host });
  const meta = {
    source: s.sourceUrl || (s.sourcePdf ? `${BASE}/source/${s.sourcePdf}` : undefined),
  };
  if (!meta.source) delete meta.source;
  if (tags.length) meta.tag = tags;
  // sha256 + raw-PDF pointer as extensions on meta — non-normative, allows tracing
  const ext = [];
  if (s.sourcePdf) ext.push({ url: `${BASE}/StructureDefinition/derivedFromArtifact`, valueString: s.sourcePdf });
  if (s.sha256)    ext.push({ url: `${BASE}/StructureDefinition/sourceSha256`, valueString: s.sha256 });
  if (Array.isArray(s.alsoSeen) && s.alsoSeen.length) {
    for (const p of s.alsoSeen) ext.push({ url: `${BASE}/StructureDefinition/alsoSeenAt`, valueString: p });
  }
  if (ext.length) meta.extension = ext;
  return meta;
}
