// Download + classify + store artifacts.
import { createHash } from 'node:crypto';
import { writeFile, readFile, appendFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = '/home/jmandel/hobby/intake-forms';
const MANIFEST = join(ROOT, 'manifest', 'manifest.jsonl');
const SEEN_HASHES = new Set();
const SEEN_URLS = new Set();

async function loadSeen() {
  if (!existsSync(MANIFEST)) return;
  const t = await readFile(MANIFEST, 'utf8').catch(() => '');
  for (const line of t.split('\n')) {
    if (!line) continue;
    try {
      const j = JSON.parse(line);
      if (j.sha256) SEEN_HASHES.add(j.sha256);
      if (j.url) SEEN_URLS.add(j.url);
    } catch {}
  }
}
await loadSeen();

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0 Safari/537.36';
const MAX_BYTES = 15 * 1024 * 1024;

function slugify(s, n = 60) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, n);
}

function hostOf(u) { try { return new URL(u).host.replace(/^www\./, ''); } catch { return 'unknown'; } }

function classifyFromText(text, urlLower) {
  const t = (text || '').toLowerCase().slice(0, 50000);
  const u = urlLower || '';
  const hits = [];
  const has = (kw) => { if (t.includes(kw) || u.includes(kw)) hits.push(kw); return t.includes(kw) || u.includes(kw); };

  // form-type signals
  let formType = 'unknown';
  if (has('new patient') || has('patient registration') || has('intake')) formType = 'new-patient-intake';
  if (has('pre-operative') || has('preoperative') || has('pre-op questionnaire') || has('preanesthesia')) formType = 'preprocedure';
  if (has('follow-up') || has('follow up') || has('return visit') || has('post-op')) formType = formType === 'unknown' ? 'followup' : formType;
  if (has('phq-9') || has('gad-7') || has('audit-c') || has('oswestry') || has('quickdash') || has('koos') || has('womac') || has('ipss') || has('mdq') || has('vanderbilt') || has('m-chat') || has('stop-bang') || has('epworth') || has('haq') || has('rapid3') || has('basdai') || has('eortc') || has('promis')) {
    formType = 'validated-prom';
  }

  const flags = {
    isIntake: hits.some(h => ['intake','registration','new patient','chief complaint'].includes(h)),
    isPROM: hits.some(h => ['phq-9','gad-7','oswestry','quickdash','ipss','mdq','vanderbilt','m-chat','stop-bang','epworth','haq','basdai','eortc','promis'].includes(h)),
  };
  return { formType, hits, ...flags };
}

export async function download({ url, title, specialty, formTypeHint, searchQuery = null, sourceEngine = null, discoveredVia = null }) {
  if (SEEN_URLS.has(url)) return { skipped: 'dup-url' };
  if (!/^https?:\/\//.test(url)) return { skipped: 'not-http' };

  // skip known noise
  if (/(duckduckgo\.com\/y\.js|bing\.com|microsoft\.com|msn\.com|aclick|googleadservices|facebook|twitter|x\.com|instagram|youtube|tiktok|pinterest|reddit|amazon\.com|wikipedia\.org|webmd\.com|healthline|drugs\.com|medlineplus|mayoclinic\.org\/diseases|cdc\.gov\/(?!.*form)|jotform\.com|intakeq\.com|simplepractice\.com|formdr\.com|zandahealth\.com|carepatron\.com|practicebetter\.io|practicepanther|hipaaspace|sampleforms\.com|template\.net|wordtemplatesonline|formspal|formsbank|pdffiller\.com|wpforms\.com|patientpop\.com|sampletemplates|wordlayouts|formstack\.com|gravityforms|123formbuilder|cognitoforms\.com|paperform\.co|tally\.so|typeform\.com|formsite\.com|formidableforms|wufoo\.com|gohighlevel|kareo\.com\/blog|sa1s3.*\/assets\/docs)/i.test(url)) {
    return { skipped: 'noise' };
  }

  // HEAD then GET with curl (handles odd servers better than fetch)
  const tmp = `/tmp/dl-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const args = [
    '-sSL', '--max-time', '45', '--max-filesize', String(MAX_BYTES),
    '-A', UA,
    '-H', 'Accept: */*',
    '-H', 'Accept-Language: en-US,en;q=0.9',
    '-D', tmp + '.hdr',
    '-o', tmp + '.bin',
    '-w', '%{content_type}\\n%{http_code}\\n%{size_download}\\n%{url_effective}\\n',
    url,
  ];
  const r = spawnSync('curl', args, { encoding: 'utf8', timeout: 60000 });
  if (r.status !== 0) return { error: `curl ${r.status}: ${(r.stderr||'').slice(0,200)}` };
  const [contentType = '', httpCode = '', sizeS = '', finalUrl = url] = (r.stdout || '').trim().split('\n');
  if (!/^2\d\d$/.test(httpCode)) return { skipped: `http ${httpCode}` };
  const size = parseInt(sizeS, 10) || 0;
  if (size < 800) return { skipped: 'too-small' };

  const buf = await readFile(tmp + '.bin');
  const sha = createHash('sha256').update(buf).digest('hex');
  if (SEEN_HASHES.has(sha)) return { skipped: 'dup-sha' };

  // detect kind
  const ct = contentType.toLowerCase();
  let ext = 'bin', kind = 'other';
  if (ct.includes('pdf') || buf.slice(0, 5).toString() === '%PDF-') { ext = 'pdf'; kind = 'pdf'; }
  else if (ct.includes('html') || /<html/i.test(buf.slice(0, 2000).toString('utf8'))) { ext = 'html'; kind = 'html'; }
  else if (ct.includes('msword') || ct.includes('officedocument')) { ext = ct.includes('wordprocessingml') ? 'docx' : 'doc'; kind = 'doc'; }
  else { ext = 'bin'; }

  // extract text for classification
  let text = '';
  if (kind === 'pdf') {
    const pt = spawnSync('pdftotext', ['-q', '-layout', '-l', '4', tmp + '.bin', '-'], { encoding: 'utf8', timeout: 20000 });
    text = pt.stdout || '';
  } else if (kind === 'html') {
    text = buf.toString('utf8').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  }

  // form-likeness gate, applied to BOTH pdf and html. Counts markers.
  const markers = [
    /\bname[:\s_]/i, /\bdate of birth\b/i, /\bDOB[:\s_]/, /\bchief complaint\b/i,
    /\b(patient|client)\s+(history|registration|intake|information)\b/i, /\bsignature\b/i,
    /\bplease (check|circle|complete|list|describe|indicate)\b/i,
    /\bover the (last|past) (2 weeks|two weeks|month|week|4 weeks)\b/i,
    /\bhow often\b/i, /\brate your\b/i, /\bon a scale\b/i,
    /\b(yes\s*\/?\s*no|y\s*\/?\s*n)\b/i, /\bcheck (all|the boxes|one)\b/i,
    /\bemergency contact\b/i, /\binsurance (carrier|company|id|policy)\b/i,
    /\bmedications? (list|currently)\b/i, /\ballerg(y|ies)\b/i,
    /\bfamily (history|hx)\b/i, /\bsurgical (history|hx)\b/i,
    /\bpharmacy\b.*\bphone\b/i,
    // PROM-scale specific stems
    /\bnot at all\b.*\bnearly every day\b/is, /\b0\s*=\s*not at all\b/i,
    /\bin the past (week|month|3 months|4 weeks)\b/i,
  ];
  var markerCount = markers.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  // PROM-scale fallback detection: if text contains many Likert/scale-style items.
  // Patterns: lines like "0 = ...", "1 = ...", numbered Q&A "1. ... 2. ...", "Not at all .. Several days .. Nearly every day"
  const scaleSignals = [
    /\b0\s*[=–-]\s*\w+/i, /\b1\s*[=–-]\s*\w+/i, /\b2\s*[=–-]\s*\w+/i, /\b3\s*[=–-]\s*\w+/i,
    /\bnot at all\b/i, /\bseveral days\b/i, /\bnearly every day\b/i,
    /\bmore than half\b/i, /\bnone of the time\b/i, /\ball of the time\b/i,
    /^\s*\d{1,2}\.\s/m, /\bcircle one\b/i, /\btotal score\b/i, /\bscoring\b.*\binterpretation\b/is,
    /\bstrongly (agree|disagree)\b/i, /\bnever\b.*\boften\b/is,
  ];
  const scaleCount = scaleSignals.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  // Medical context required: must mention a health-related noun in the head
  const head = text.slice(0, 5000);
  const medicalContext = /\b(patient|symptom|disease|disorder|clinic|clinical|diagnos|hospital|health|treatment|therapy|medication|prescribed|pain|depression|anxiety|sleep|arthritis|cancer|asthma|copd|diabetes|insomnia|fatigue|nausea|injury|surgery|nursing|provider|physician|nurse|psycholog|psychiatr|screen|outcome|impairment|impact|severity|quality of life)\b/i.test(head);
  const looksLikeScale = scaleCount >= 3 && medicalContext && /\b(score|scale|questionnaire|index|inventory|assessment|instrument|tool|measure|sub-?scale)\b/i.test(head);
  // PDFs: need 2+ form markers OR scale-like content. HTML: need 3+ form markers (more chrome noise).
  if (kind === 'pdf' && markerCount < 2 && !looksLikeScale) {
    return { skipped: `not-form-like(${markerCount},scale=${scaleCount})` };
  }
  if (kind === 'html' && markerCount < 3 && !looksLikeScale) {
    return { skipped: `not-form-like(${markerCount},scale=${scaleCount})` };
  }
  if (looksLikeScale && markerCount < 2) markerCount = -scaleCount; // negative = scale-detected
  // Reject obvious non-forms regardless of markers: annual reports / handbooks / slideshows
  const headStart = text.slice(0, 4000).toLowerCase();
  if (/(annual report|workbook|reference guide|orientation|slideshow|newsletter|magazine|chna|community health needs|tax return|form 990|policy manual|user manual|operations manual|fiscal year)/.test(headStart)) {
    return { skipped: 'non-form-content' };
  }

  const cls = classifyFromText(text, url.toLowerCase() + ' ' + (title||'').toLowerCase());
  const formType = (formTypeHint && formTypeHint !== 'auto') ? formTypeHint : cls.formType;
  const host = hostOf(finalUrl);

  const dir = join(ROOT, 'raw', kind === 'pdf' ? 'pdf' : kind === 'html' ? 'html' : 'other');
  await mkdir(dir, { recursive: true });
  const stem = `${slugify(specialty,30)}__${slugify(formType,30)}__${slugify(host,30)}__${sha.slice(0,10)}`;
  const dst = join(dir, `${stem}.${ext}`);
  await writeFile(dst, buf);

  SEEN_HASHES.add(sha); SEEN_URLS.add(url);

  const rec = {
    sha256: sha, bytes: size, kind, ext, contentType: ct,
    url, finalUrl, title: title || '',
    specialty, formType, classifierHits: cls.hits, markerCount,
    flags: { isIntake: cls.isIntake, isPROM: cls.isPROM },
    provenance: {
      searchQuery: searchQuery || null,
      sourceEngine: sourceEngine || null,
      discoveredVia: discoveredVia || null,
      host: host,
    },
    path: dst, savedAt: new Date().toISOString(),
  };
  await appendFile(MANIFEST, JSON.stringify(rec) + '\n');
  return { saved: dst, sha: sha.slice(0,10), formType };
}

export function alreadySeenUrl(u) { return SEEN_URLS.has(u); }
