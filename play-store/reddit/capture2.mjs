import fs from "node:fs";
const BASE = "http://localhost:5173/";
const OUT = new URL("./shots/", import.meta.url).pathname;
const PORT = 9222;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getPageTarget() {
  const res = await fetch(`http://localhost:${PORT}/json`);
  const list = await res.json();
  return list.find(t => t.type === "page" && t.webSocketDebuggerUrl);
}
class CDP {
  constructor(ws){this.ws=ws;this.id=0;this.pending=new Map();}
  static async connect(url){const ws=new WebSocket(url);await new Promise((res,rej)=>{ws.onopen=res;ws.onerror=rej;});const c=new CDP(ws);ws.onmessage=ev=>{const m=JSON.parse(ev.data);if(m.id&&c.pending.has(m.id)){const{resolve,reject}=c.pending.get(m.id);c.pending.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result);}};return c;}
  send(method,params={}){const id=++this.id;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.ws.send(JSON.stringify({id,method,params}));});}
}
async function evaluate(cdp,expression){const r=await cdp.send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result?.value;}
async function screenshot(cdp,name){const{data}=await cdp.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});fs.writeFileSync(OUT+name,Buffer.from(data,"base64"));console.log("saved",name);}

const main = async () => {
  const target = await getPageTarget();
  const cdp = await CDP.connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride",{width:430,height:932,deviceScaleFactor:3,mobile:true});
  await cdp.send("Page.navigate",{url:BASE});
  await sleep(2000);
  await evaluate(cdp,`localStorage.setItem('brightnews.onboardingDismissed','true')`);
  await cdp.send("Page.navigate",{url:BASE});
  // Wait long enough for hero images to load.
  await sleep(7000);
  await evaluate(cdp,`window.scrollTo(0,0)`);
  await sleep(500);
  await screenshot(cdp,"clean_home.png");

  // Open the top story detail via READ MORE.
  const opened = await evaluate(cdp,`(() => {
    const links = Array.from(document.querySelectorAll('a,button'));
    const rm = links.find(e=>/read more/i.test(e.textContent||''));
    if(rm){rm.click();return 'readmore';}
    return 'none';
  })()`);
  console.log("open:", opened);
  await sleep(2500);
  await evaluate(cdp,`window.scrollTo(0,0)`);
  await sleep(400);
  await screenshot(cdp,"story_detail.png");
  process.exit(0);
};
main().catch(e=>{console.error(e);process.exit(1);});
