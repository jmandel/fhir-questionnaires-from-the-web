#!/usr/bin/env bun
// Long-lived FHIR validator server + lightweight client, in one script.
//
// The validator JAR is slow to start (2-5 min cold: JVM boot + IG load) and
// fast per request (milliseconds). So we run it as a detached HTTP server
// once per dev session, then point every validation at it.
//
// USAGE
//   bun fhir-validator.ts start              # spawn JAR detached, wait for ready, exit
//   bun fhir-validator.ts status             # is the server up? what version?
//   bun fhir-validator.ts <dir>              # validate every *.json in <dir>
//   bun fhir-validator.ts file <path.json>   # validate one file
//   bun fhir-validator.ts stop               # kill the running server
//   bun fhir-validator.ts download           # ensure JAR is present, exit
//
// ENV
//   FHIR_VALIDATOR_JAR_PATH   default ./validator_cli.jar
//   FHIR_VALIDATOR_PORT       default 8081
//   FHIR_VERSION              default 4.0.1
//   FHIR_IGS                  default hl7.fhir.uv.sdc#3.0.0  (comma-separated)
//   FHIR_TX_SERVER            default n/a   (set to http://tx.fhir.org/r4 for terminology checks)
//   FHIR_VALIDATOR_PIDFILE    default /tmp/fhir-validator.pid
//   FHIR_VALIDATOR_LOGFILE    default /tmp/fhir-validator.log
//   OWN_EXT_PREFIX            url prefix for your own provenance extensions — "extension URL ... not found" errors with this prefix are suppressed

import { spawn, spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, existsSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';

const JAR = process.env.FHIR_VALIDATOR_JAR_PATH || './validator_cli.jar';
const PORT = parseInt(process.env.FHIR_VALIDATOR_PORT || '8081', 10);
const VERSION = process.env.FHIR_VERSION || '4.0.1';
const IGS = (process.env.FHIR_IGS || 'hl7.fhir.uv.sdc#3.0.0').split(',').filter(Boolean);
const TX = process.env.FHIR_TX_SERVER || 'n/a';
const PIDFILE = process.env.FHIR_VALIDATOR_PIDFILE || '/tmp/fhir-validator.pid';
const LOGFILE = process.env.FHIR_VALIDATOR_LOGFILE || '/tmp/fhir-validator.log';
const OWN_EXT = process.env.OWN_EXT_PREFIX || '';
const BASE = `http://127.0.0.1:${PORT}`;

const JAR_URL = 'https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar';

async function ensureJar() {
  if (existsSync(JAR)) return;
  console.error(`Downloading FHIR validator JAR from ${JAR_URL} (~180 MB)...`);
  const r = await fetch(JAR_URL, { redirect: 'follow' });
  if (!r.ok) throw new Error(`Download failed: ${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  writeFileSync(JAR, buf);
  console.error(`JAR saved to ${JAR} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}

function readPid(): number | null {
  if (!existsSync(PIDFILE)) return null;
  const pid = parseInt(readFileSync(PIDFILE, 'utf8').trim(), 10);
  if (!pid || isNaN(pid)) return null;
  try { process.kill(pid, 0); return pid; } catch { return null; }
}

async function ping(): Promise<boolean> {
  // The validator HTTP service doesn't expose a simple GET health endpoint
  // (/version requires POST + targetVersion). Easiest probe: POST a trivial
  // resource to /validateResource and see if we get an OperationOutcome back.
  try {
    const r = await fetch(`${BASE}/validateResource`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/fhir+json' },
      body: '{"resourceType":"Basic","id":"ping"}',
      signal: AbortSignal.timeout(3000),
    });
    return r.ok;
  } catch { return false; }
}

async function waitReady(maxMs = 600_000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (await ping()) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Validator did not become ready within ${maxMs}ms — see ${LOGFILE}`);
}

async function cmdStart() {
  await ensureJar();
  const existing = readPid();
  if (existing && (await ping())) {
    console.error(`Already running (pid ${existing}, port ${PORT})`);
    return;
  }
  if (existing) { try { unlinkSync(PIDFILE); } catch {} }

  const args = ['-jar', JAR, '-server', String(PORT), '-tx', TX, '-version', VERSION];
  for (const ig of IGS) { args.push('-ig', ig); }
  console.error(`Spawning: java ${args.join(' ')}`);
  console.error(`Logs: ${LOGFILE}`);

  const out = Bun.file(LOGFILE);
  const child = spawn('java', args, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.pipe(require('node:fs').createWriteStream(LOGFILE));
  child.stderr?.pipe(require('node:fs').createWriteStream(LOGFILE, { flags: 'a' }));
  child.unref();
  writeFileSync(PIDFILE, String(child.pid));
  console.error(`Spawned pid ${child.pid}. Waiting for ready (cold start ~2-5 min)...`);

  await waitReady();
  console.error(`Ready on ${BASE}`);
}

async function cmdStatus() {
  const pid = readPid();
  const up = await ping();
  if (!up && !pid) { console.log('not running'); process.exit(1); }
  if (!up) { console.log(`pid ${pid} alive but HTTP not responding on ${PORT}`); process.exit(2); }
  console.log(`running${pid ? ` pid=${pid}` : ''} port=${PORT}`);
}

function cmdStop() {
  const pid = readPid();
  if (!pid) { console.log('not running'); return; }
  try { process.kill(pid, 'SIGTERM'); } catch {}
  try { unlinkSync(PIDFILE); } catch {}
  console.log(`stopped pid ${pid}`);
}

async function validate(jsonText: string) {
  const r = await fetch(`${BASE}/validateResource`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/fhir+json' },
    body: jsonText,
  });
  if (!r.ok) throw new Error(`Validator HTTP ${r.status}: ${await r.text()}`);
  return r.json();
}

function isOwnExtError(msg = ''): boolean {
  return OWN_EXT !== '' && msg.includes(OWN_EXT) && msg.includes('could not be found');
}

async function cmdValidate(paths: string[]) {
  if (!(await ping())) {
    console.error(`Validator not running on ${BASE}. Run 'bun fhir-validator.ts start' first.`);
    process.exit(2);
  }
  let totalReal = 0, totalIgnored = 0, totalWarn = 0;
  for (const path of paths) {
    const text = readFileSync(path, 'utf8');
    let result: any;
    try { result = await validate(text); }
    catch (e: any) { console.log(`✗ ${path}: ${e.message}`); totalReal++; continue; }
    const issues = result?.issues || result?.issue || [];
    const errs = issues.filter((i: any) => (i.level || i.severity) === 'error');
    const real = errs.filter((i: any) => !isOwnExtError(i.message || i.details?.text || ''));
    const ignored = errs.length - real.length;
    const warns = issues.filter((i: any) => (i.level || i.severity) === 'warning');
    totalReal += real.length; totalIgnored += ignored; totalWarn += warns.length;
    const mark = real.length === 0 ? '✓' : '✗';
    const name = path.split('/').pop();
    console.log(`${mark} ${name}  (${real.length} errors, ${ignored} own-ext ignored, ${warns.length} warnings)`);
    for (const e of real) console.log(`    [error] ${e.message || e.details?.text}`);
  }
  console.log(`\n${paths.length} files; ${totalReal} real error(s), ${totalIgnored} own-ext suppressed, ${totalWarn} warning(s).`);
  process.exit(totalReal > 0 ? 1 : 0);
}

// ---------- dispatch ----------
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === 'start')        await cmdStart();
else if (cmd === 'status')  await cmdStatus();
else if (cmd === 'stop')    cmdStop();
else if (cmd === 'download') await ensureJar();
else if (cmd === 'file' && args[1]) await cmdValidate([args[1]]);
else if (cmd && existsSync(cmd) && statSync(cmd).isDirectory()) {
  const files = readdirSync(cmd).filter((f) => f.endsWith('.json')).sort().map((f) => join(cmd, f));
  await cmdValidate(files);
} else if (cmd && existsSync(cmd) && statSync(cmd).isFile()) {
  await cmdValidate([cmd]);
} else {
  console.error(`Usage:
  bun fhir-validator.ts start              # spawn JAR detached, wait for ready
  bun fhir-validator.ts status             # is it running?
  bun fhir-validator.ts <dir>              # validate every *.json in dir
  bun fhir-validator.ts file <path.json>   # validate one file
  bun fhir-validator.ts stop               # kill running server
  bun fhir-validator.ts download           # ensure JAR is present`);
  process.exit(2);
}
