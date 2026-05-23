// Minimal CDP client + helpers. Uses Node's built-in WebSocket (node >=22).
import { setTimeout as sleep } from 'node:timers/promises';

const CDP_HTTP = process.env.CDP_HTTP || 'http://127.0.0.1:9222';

export async function listTargets() {
  const r = await fetch(`${CDP_HTTP}/json/list`);
  return r.json();
}
export async function newTab(url = 'about:blank') {
  const r = await fetch(`${CDP_HTTP}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  return r.json();
}
export async function closeTab(id) {
  try { await fetch(`${CDP_HTTP}/json/close/${id}`); } catch {}
}

export class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = []; // ring of recent events
    this.handlers = new Set();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(e));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) rej(new Error(msg.error.message)); else res(msg.result);
      } else if (msg.method) {
        for (const h of this.handlers) h(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  on(handler) { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  close() { try { this.ws.close(); } catch {} }
}

export async function attachToTab(targetId) {
  const targets = await listTargets();
  const t = targets.find(x => x.id === targetId);
  if (!t) throw new Error('target not found');
  const cdp = new CDP(t.webSocketDebuggerUrl);
  await cdp.ready;
  return cdp;
}

export async function gotoAndWait(cdp, url, { timeoutMs = 30000, waitForNetIdleMs = 1500 } = {}) {
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  const loaded = new Promise((res, rej) => {
    const off = cdp.on(m => {
      if (m.method === 'Page.loadEventFired') { off(); res(); }
    });
    setTimeout(() => { off(); rej(new Error('load timeout')); }, timeoutMs);
  });
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(waitForNetIdleMs);
}

export async function getHTML(cdp) {
  const { root } = await cdp.send('DOM.getDocument', { depth: -1 });
  const { outerHTML } = await cdp.send('DOM.getOuterHTML', { nodeId: root.nodeId });
  return outerHTML;
}

export async function evalJS(cdp, expr) {
  const r = await cdp.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed');
  return r.result.value;
}
