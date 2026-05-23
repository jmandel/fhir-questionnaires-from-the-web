// FHIR Questionnaire builder helpers — Bun / TypeScript.
// Pure functions emitting plain Questionnaire JSON; no runtime, no dependencies.

export const BASE = 'http://hobby.intake-forms/fhir';

export const EXT = {
  itemControl:           'http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl',
  displayCategory:       'http://hl7.org/fhir/StructureDefinition/questionnaire-displayCategory',
  ordinalValue:          'http://hl7.org/fhir/StructureDefinition/ordinalValue',
  optionExclusive:       'http://hl7.org/fhir/StructureDefinition/questionnaire-optionExclusive',
  optionPrefix:          'http://hl7.org/fhir/StructureDefinition/questionnaire-optionPrefix',
  variable:              'http://hl7.org/fhir/StructureDefinition/variable',
  hidden:                'http://hl7.org/fhir/StructureDefinition/questionnaire-hidden',
  minOccurs:             'http://hl7.org/fhir/StructureDefinition/questionnaire-minOccurs',
  maxOccurs:             'http://hl7.org/fhir/StructureDefinition/questionnaire-maxOccurs',
  choiceOrientation:     'http://hl7.org/fhir/StructureDefinition/questionnaire-choiceOrientation',
  sliderStepValue:       'http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue',
  minValue:              'http://hl7.org/fhir/StructureDefinition/minValue',
  maxValue:              'http://hl7.org/fhir/StructureDefinition/maxValue',
  regex:                 'http://hl7.org/fhir/StructureDefinition/regex',
  entryFormat:           'http://hl7.org/fhir/StructureDefinition/entryFormat',
  unit:                  'http://hl7.org/fhir/StructureDefinition/questionnaire-unit',
  unitOption:            'http://hl7.org/fhir/StructureDefinition/questionnaire-unitOption',
  supportLink:           'http://hl7.org/fhir/StructureDefinition/questionnaire-supportLink',
  renderingXhtml:        'http://hl7.org/fhir/StructureDefinition/rendering-xhtml',
  calculatedExpression:  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-calculatedExpression',
  enableWhenExpression:  'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-enableWhenExpression',
  shortText:             'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-shortText',
  collapsible:           'http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire-collapsible',
} as const;

export const SYS = {
  loinc:           'http://loinc.org',
  snomed:          'http://snomed.info/sct',
  yn:              'http://terminology.hl7.org/CodeSystem/v2-0136',
  itemControl:     'http://hl7.org/fhir/questionnaire-item-control',
  displayCategory: 'http://hl7.org/fhir/questionnaire-display-category',
  adminGender:     'http://hl7.org/fhir/administrative-gender',
} as const;

export type Coding = { system?: string; code: string; display?: string };
export type Extension = { url: string; [k: string]: any };
export type AnswerOption = { extension?: Extension[]; valueCoding?: Coding; valueString?: string; valueInteger?: number; valueDate?: string };
export type Item = {
  linkId: string;
  type: string;
  text?: string;
  prefix?: string;
  required?: boolean;
  readOnly?: boolean;
  repeats?: boolean;
  code?: Coding[];
  answerOption?: AnswerOption[];
  answerValueSet?: string;
  extension?: Extension[];
  enableWhen?: any[];
  enableBehavior?: 'all' | 'any';
  item?: Item[];
};

export type SourceMeta = {
  sourceUrl?: string;
  sourcePdf?: string;
  specialty?: string;
  formType?: string;
  host?: string;
  sha256?: string;
  alsoSeen?: string[];
};

// ---------- extension builders ----------

export const itemControl = (code: string): Extension => ({
  url: EXT.itemControl,
  valueCodeableConcept: { coding: [{ system: SYS.itemControl, code }] },
});

export const displayCategory = (code: string = 'instructions'): Extension => ({
  url: EXT.displayCategory,
  valueCodeableConcept: { coding: [{ system: SYS.displayCategory, code }] },
});

export const ordinal = (n: number): Extension => ({ url: EXT.ordinalValue, valueDecimal: n });

export const variable = (name: string, expression: string): Extension => ({
  url: EXT.variable,
  valueExpression: { name, language: 'text/fhirpath', expression },
});

export const calcExpr = (expression: string, description?: string): Extension => ({
  url: EXT.calculatedExpression,
  valueExpression: { description, language: 'text/fhirpath', expression },
});

export const whenExpr = (expression: string): Extension => ({
  url: EXT.enableWhenExpression,
  valueExpression: { language: 'text/fhirpath', expression },
});

// ---------- answer-option helpers ----------

export const yn = (opts: { yesOrd?: number; noOrd?: number } = {}): AnswerOption[] => {
  const yesOrd = opts.yesOrd ?? 1;
  const noOrd = opts.noOrd ?? 0;
  return [
    { extension: [ordinal(noOrd)],  valueCoding: { system: SYS.yn, code: 'N', display: 'No' } },
    { extension: [ordinal(yesOrd)], valueCoding: { system: SYS.yn, code: 'Y', display: 'Yes' } },
  ];
};

export const ordOptions = (
  labels: { ord: number; code: string; display: string }[],
  system?: string,
): AnswerOption[] =>
  labels.map(({ ord, code, display }) => ({
    extension: [ordinal(ord)],
    valueCoding: { ...(system ? { system } : {}), code, display },
  }));

// ---------- item builders ----------

export const display = (
  linkId: string,
  text: string,
  opts: { category?: string; support?: string } = {},
): Item => {
  const o: Item = { linkId, type: 'display', text };
  const exts: Extension[] = [];
  if (opts.category) exts.push(displayCategory(opts.category));
  if (opts.support) exts.push({ url: EXT.supportLink, valueUri: opts.support });
  if (exts.length) o.extension = exts;
  return o;
};

export const group = (
  linkId: string,
  text: string,
  items: Item[],
  opts: { control?: string; repeats?: boolean } = {},
): Item => {
  const g: Item = { linkId, type: 'group', text, item: items };
  const exts: Extension[] = [];
  if (opts.control) exts.push(itemControl(opts.control));
  if (opts.repeats) g.repeats = true;
  if (exts.length) g.extension = exts;
  return g;
};

export const totalScore = (
  linkId: string,
  text: string,
  varName: string,
  loinc?: string,
): Item => {
  const o: Item = {
    linkId,
    type: 'integer',
    text,
    readOnly: true,
    extension: [calcExpr(`%${varName}`, 'Sum of item ordinalValues')],
  };
  if (loinc) o.code = [{ system: SYS.loinc, code: loinc }];
  return o;
};

// ---------- Questionnaire root + meta ----------

export type QuestionnaireArgs = {
  id: string;
  name: string;
  title: string;
  code?: Coding[];
  copyright?: string;
  derivedFrom?: string[];
  item: Item[];
  extension?: Extension[];
  source?: SourceMeta;
  status?: 'draft' | 'active' | 'retired' | 'unknown';
  experimental?: boolean;
  subjectType?: string[];
  date?: string;
  publisher?: string;
  version?: string;
};

export const questionnaire = (a: QuestionnaireArgs): any => {
  const meta = a.source ? buildMeta(a.source) : undefined;
  return {
    resourceType: 'Questionnaire',
    id: a.id,
    ...(meta ? { meta } : {}),
    url: `${BASE}/Questionnaire/${a.id}`,
    version: a.version ?? '1.0.0',
    name: a.name,
    title: a.title,
    status: a.status ?? 'draft',
    experimental: a.experimental ?? true,
    subjectType: a.subjectType ?? ['Patient'],
    date: a.date ?? new Date().toISOString().slice(0, 10),
    publisher: a.publisher ?? 'intake-forms research collection',
    ...(a.copyright ? { copyright: a.copyright } : {}),
    ...(a.derivedFrom ? { derivedFrom: a.derivedFrom } : {}),
    ...(a.code ? { code: a.code } : {}),
    ...(a.extension?.length ? { extension: a.extension } : {}),
    item: a.item,
  };
};

export const buildMeta = (s: SourceMeta): any => {
  const tags: Coding[] = [];
  if (s.specialty) tags.push({ system: `${BASE}/CodeSystem/specialty`, code: s.specialty });
  if (s.formType)  tags.push({ system: `${BASE}/CodeSystem/form-type`, code: s.formType });
  if (s.host)      tags.push({ system: `${BASE}/CodeSystem/source-host`, code: s.host });

  const meta: any = {};
  const sourceUrl = s.sourceUrl || (s.sourcePdf ? `${BASE}/source/${s.sourcePdf}` : undefined);
  if (sourceUrl) meta.source = sourceUrl;
  if (tags.length) meta.tag = tags;

  const ext: Extension[] = [];
  if (s.sourcePdf) ext.push({ url: `${BASE}/StructureDefinition/derivedFromArtifact`, valueString: s.sourcePdf });
  if (s.sha256)    ext.push({ url: `${BASE}/StructureDefinition/sourceSha256`, valueString: s.sha256 });
  if (Array.isArray(s.alsoSeen)) for (const p of s.alsoSeen) {
    ext.push({ url: `${BASE}/StructureDefinition/alsoSeenAt`, valueString: p });
  }
  if (ext.length) meta.extension = ext;
  return meta;
};
