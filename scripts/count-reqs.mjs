import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
const reqs = [];
page.on("request", (r) => reqs.push({ t: r.resourceType(), u: r.url(), m: r.method() }));
const failed = [];
page.on("requestfailed", (r) => failed.push({ u: r.url(), err: r.failure()?.errorText }));
page.on("response", async (r) => {
  if (r.status() >= 400) failed.push({ u: r.url(), err: String(r.status()) });
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 30000 });
await page.waitForTimeout(1500);
const byType = {};
for (const r of reqs) byType[r.t] = (byType[r.t] || 0) + 1;
console.log(JSON.stringify({ total: reqs.length, byType, failed, sample: reqs.filter(r=>r.t==="script").slice(0,15).map(r=>r.u.replace("http://127.0.0.1:8080","")) }, null, 2));
await browser.close();
