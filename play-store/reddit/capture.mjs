// Minimal CDP driver: seed localStorage, walk the bottom nav, screenshot each tab.
import fs from "node:fs";

const BASE = "http://localhost:5173/";
const OUT = new URL("./shots/", import.meta.url).pathname;
const PORT = 9222;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getPageTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json`);
      const list = await res.json();
      const page = list.find(t => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error("no CDP page target");
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.events = []; this.handlers = []; }
  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const cdp = new CDP(ws);
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && cdp.pending.has(msg.id)) {
        const { resolve, reject } = cdp.pending.get(msg.id);
        cdp.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) {
        cdp.handlers.forEach(h => h(msg));
      }
    };
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  onEvent(fn) { this.handlers.push(fn); }
}

async function evaluate(cdp, expression) {
  const r = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result?.value;
}

async function screenshot(cdp, name) {
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(OUT + name, Buffer.from(data, "base64"));
  console.log("saved", name);
}

const main = async () => {
  const target = await getPageTarget();
  const cdp = await CDP.connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 430, height: 932, deviceScaleFactor: 3, mobile: true,
  });

  // First load to establish origin, then seed localStorage.
  await cdp.send("Page.navigate", { url: BASE });
  await sleep(1500);
  await evaluate(cdp, `(() => {
    localStorage.setItem('brightnews.onboardingDismissed','true');
    return true;
  })()`);
  await cdp.send("Page.navigate", { url: BASE });
  await sleep(3500);

  await screenshot(cdp, "01_home.png");

  // Enumerate bottom nav labels.
  const labels = await evaluate(cdp, `Array.from(document.querySelectorAll('.bn-bottom-nav__item .bn-bottom-nav__label')).map(e=>e.textContent.trim())`);
  console.log("nav:", labels);

  for (let i = 0; i < (labels?.length || 0); i++) {
    await evaluate(cdp, `document.querySelectorAll('.bn-bottom-nav__item')[${i}].click()`);
    await sleep(2500);
    const safe = (labels[i] || `tab${i}`).toLowerCase().replace(/[^a-z0-9]+/g, "");
    await screenshot(cdp, `tab_${i}_${safe}.png`);
  }

  // Back to home, open first story card for a detail view.
  await evaluate(cdp, `document.querySelectorAll('.bn-bottom-nav__item')[0].click()`);
  await sleep(2000);
  const opened = await evaluate(cdp, `(() => {
    const card = document.querySelector('.bn-story-card, article, [class*="story"]');
    if (!card) return false;
    const btn = card.querySelector('button, a') || card;
    btn.click();
    return true;
  })()`);
  await sleep(2500);
  await screenshot(cdp, "05_story.png");

  console.log("done");
  process.exit(0);
};

main().catch(e => { console.error(e); process.exit(1); });
