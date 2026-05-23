// Walk JotForm health/medical template gallery via CDP; extract live form IDs from
// each template page; download each form via curl; store as html with our manifest.
import { newTab, attachToTab, closeTab, gotoAndWait, evalJS } from './cdp.mjs';
import { download } from './download.mjs';
import { setTimeout as sleep } from 'node:timers/promises';

const CATEGORY_URLS = [
  'https://www.jotform.com/form-templates/category/health',
  'https://www.jotform.com/form-templates/health/medical-surveys-and-questionnaires',
  'https://www.jotform.com/form-templates/health/healthcare-assessment-forms',
  'https://www.jotform.com/form-templates/health/telehealth-forms',
  'https://www.jotform.com/form-templates/health/mental-health-forms',
  'https://www.jotform.com/form-templates/health/laboratory-forms',
  'https://www.jotform.com/form-templates/category/intake-forms',
  'https://www.jotform.com/form-templates/registration/patient-registration-form-templates',
  'https://www.jotform.com/form-templates/consent-forms/medical-consent-forms',
  'https://www.jotform.com/form-templates/consent-forms/informed-consent-forms',
  'https://www.jotform.com/form-templates/consent-forms/dental-consent-forms',
  'https://www.jotform.com/form-templates/survey/healthcare-surveys',
  'https://www.jotform.com/form-templates/feedback/patient-feedback-forms',
  'https://www.jotform.com/form-templates/enrollment/patient-enrollment-forms',
  'https://www.jotform.com/form-templates/tracking-form/health-tracking-forms',
  'https://www.jotform.com/form-templates/category/dental',
  'https://www.jotform.com/form-templates/category/therapy',
  'https://www.jotform.com/form-templates/category/veterinary',
];

const target = await newTab('about:blank');
const cdp = await attachToTab(target.id);

const seenTemplate = new Set();
const templatePages = [];

for (const catUrl of CATEGORY_URLS) {
  try {
    await gotoAndWait(cdp, catUrl, { waitForNetIdleMs: 2000 });
    // expand "Load more" a few times if present
    for (let i = 0; i < 6; i++) {
      const clicked = await evalJS(cdp, `
        (() => {
          const b = Array.from(document.querySelectorAll('button,a')).find(x => /load more|see more|show more/i.test(x.textContent||''));
          if (b) { b.click(); return true; } return false;
        })()
      `);
      if (!clicked) break;
      await sleep(1500);
    }
    const links = await evalJS(cdp, `
      Array.from(document.querySelectorAll('a[href*="/form-templates/"]')).map(a=>a.href)
        .filter(h => /\\/form-templates\\/[a-z0-9-]+(form|template|questionnaire|intake|consent|survey)?$/i.test(h))
        .filter(h => !/\\/category\\/|\\/tags\\/|#/.test(h))
    `);
    for (const l of links) seenTemplate.add(l);
    console.log(`[gallery] ${catUrl} -> total seen=${seenTemplate.size}`);
  } catch (e) {
    console.log(`[gallery] err ${catUrl}: ${e.message}`);
  }
  await sleep(700);
}

console.log(`[gallery] ${seenTemplate.size} template pages discovered`);

const specGuess = (url) => {
  const u = url.toLowerCase();
  if (/dental|orthodont|hygien/.test(u)) return 'dental';
  if (/mental|psych|therapy|counsel|cbt|wellness|mood|trauma|grief/.test(u)) return 'mental-health';
  if (/veterinary|vet-|animal|pet/.test(u)) return 'veterinary';
  if (/chiropract/.test(u)) return 'chiropractic';
  if (/massage/.test(u)) return 'massage';
  if (/acupunct/.test(u)) return 'acupuncture';
  if (/pediatric|child|infant|toddler/.test(u)) return 'pediatrics';
  if (/dermat|skin/.test(u)) return 'dermatology';
  if (/ophthal|optom|vision|eye/.test(u)) return 'ophthalmology';
  if (/cardio|heart/.test(u)) return 'cardiology';
  if (/physical-therapy|physiothera|rehab/.test(u)) return 'physical-therapy';
  if (/telehealth|telemed/.test(u)) return 'telehealth';
  if (/consent|hipaa/.test(u)) return 'cross-cutting-consent';
  if (/survey|feedback|cahps/.test(u)) return 'survey';
  if (/lab/.test(u)) return 'laboratory';
  if (/covid|vaccine/.test(u)) return 'infectious-disease';
  return 'general-medical';
};
const formTypeGuess = (url) => {
  const u = url.toLowerCase();
  if (/consent|waiver|hipaa/.test(u)) return 'consent';
  if (/intake|registration|new-patient|enrollment/.test(u)) return 'new-patient-intake';
  if (/history|medical-history/.test(u)) return 'history-ros';
  if (/screen|assessment|questionnaire|survey/.test(u)) return 'screening-assessment';
  if (/feedback|satisfaction/.test(u)) return 'patient-feedback';
  if (/tracking|log|diary/.test(u)) return 'tracking-diary';
  if (/release/.test(u)) return 'release';
  return 'template-form';
};

let saved = 0, skipped = 0;
for (const tpl of [...seenTemplate]) {
  try {
    // visit template page; pull preview iframe / form id
    await gotoAndWait(cdp, tpl, { waitForNetIdleMs: 1200, timeoutMs: 30000 }).catch(()=>{});
    const formId = await evalJS(cdp, `
      (() => {
        // patterns: <div id="20813573233448"> inside preview area, or form.jotform.com/<id>
        const cand = Array.from(document.querySelectorAll('[id]')).map(e=>e.id).filter(s=>/^[0-9]{12,20}$/.test(s));
        if (cand.length) return cand[0];
        const m = document.documentElement.outerHTML.match(/form\\.jotform\\.com\\/([0-9]{12,20})/);
        return m ? m[1] : null;
      })()
    `);
    if (!formId) { skipped++; continue; }
    const liveUrl = `https://form.jotform.com/${formId}`;
    const res = await download({ url: liveUrl, title: tpl, specialty: specGuess(tpl), formTypeHint: formTypeGuess(tpl) });
    if (res.saved) { saved++; console.log(`  + ${specGuess(tpl)}/${formTypeGuess(tpl)} ${liveUrl}  <- ${tpl}`); }
    else { skipped++; }
  } catch (e) {
    skipped++;
  }
  await sleep(350);
}
console.log(`JotForm: saved=${saved} skipped=${skipped}`);
cdp.close(); await closeTab(target.id);
