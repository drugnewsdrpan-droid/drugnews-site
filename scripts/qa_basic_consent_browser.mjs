import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { chromium } = require("/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const errors = [];

function check(condition, detail) {
  if (!condition) errors.push(detail);
}

function stage(label) {
  console.log(`[consent-qa] ${label}`);
}

function applyTimeouts(page) {
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(15_000);
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = path.join(ROOT, relative.replace(/^\/+/, ""));
    if (!file.startsWith(ROOT)) throw new Error("invalid path");
    let body = await fs.readFile(file);
    if (path.extname(file) === ".html" && url.searchParams.get("qa_ga") === "1") {
      body = Buffer.from(
        body.toString("utf8").replace(/measurementId:\s*'[^']*'/, "measurementId: 'G-QAONLY123'")
      );
    }
    response.writeHead(200, { "content-type": mimeTypes[path.extname(file)] || "application/octet-stream" });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
stage("launch isolated Chrome");
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  timeout: 60_000
});

try {
  stage("390 first visit and reject");
  const firstContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const firstRequests = [];
  firstContext.on("request", (request) => {
    if (/google-analytics\.com|googletagmanager\.com/.test(request.url())) firstRequests.push(request.url());
  });
  await firstContext.route(/https:\/\/www\.googletagmanager\.com\/.*/, (route) => route.abort());
  const firstPage = await firstContext.newPage();
  applyTimeouts(firstPage);
  await firstPage.goto(`${base}/index.html`, { waitUntil: "domcontentloaded" });
  check(await firstPage.locator("[data-drugnews-consent-banner]").isVisible(), "390: first-visit banner is not visible");
  check(firstRequests.length === 0, "390: first visit sent a Google request");
  check((await firstContext.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "390: first visit wrote a _ga cookie");
  check(await firstPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "390: horizontal overflow");

  await firstPage.getByRole("button", { name: "只使用必要功能" }).click();
  const denied = await firstPage.evaluate(() => JSON.parse(localStorage.getItem("drugnewsConsentV1")));
  check(denied.status === "denied" && denied.version === "2026-07-26" && Boolean(denied.timestamp), "reject: stored preference is incomplete");
  check(firstRequests.length === 0, "reject: sent a Google request");
  await firstPage.reload({ waitUntil: "domcontentloaded" });
  check(await firstPage.locator("[data-drugnews-consent-banner]").count() === 0, "reject: banner returned after reload");
  check(firstRequests.length === 0, "reject reload: sent a Google request");
  await firstContext.close();

  stage("1440 accept gate and keyboard");
  const acceptContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const analyticsRequests = [];
  acceptContext.on("request", (request) => {
    if (/google-analytics\.com|googletagmanager\.com/.test(request.url())) analyticsRequests.push(request.url());
  });
  await acceptContext.route(/https:\/\/www\.googletagmanager\.com\/.*/, (route) => route.abort());
  const acceptPage = await acceptContext.newPage();
  applyTimeouts(acceptPage);
  await acceptPage.goto(`${base}/index.html?qa_ga=1`, { waitUntil: "domcontentloaded" });
  check(analyticsRequests.length === 0, "configured simulation: Google tag loaded before acceptance");
  const queuedBefore = await acceptPage.evaluate(() => window.dataLayer.map((item) => Array.from(item)));
  check(queuedBefore.some((item) => item[0] === "consent" && item[1] === "default" && item[2].analytics_storage === "denied"), "configured simulation: default-denied command missing");

  await acceptPage.getByRole("button", { name: "同意分析" }).click();
  await acceptPage.waitForTimeout(100);
  const accepted = await acceptPage.evaluate(() => JSON.parse(localStorage.getItem("drugnewsConsentV1")));
  const queuedAfter = await acceptPage.evaluate(() => window.dataLayer.map((item) => Array.from(item)));
  check(accepted.status === "accepted" && Boolean(accepted.timestamp), "accept: stored preference is incomplete");
  check(analyticsRequests.some((url) => url.includes("googletagmanager.com/gtag/js?id=G-QAONLY123")), "accept: Google tag request missing");
  const defaultIndex = queuedAfter.findIndex((item) => item[0] === "consent" && item[1] === "default");
  const updateIndex = queuedAfter.findIndex((item) => item[0] === "consent" && item[1] === "update" && item[2].analytics_storage === "granted");
  const configIndex = queuedAfter.findIndex((item) => item[0] === "config" && item[1] === "G-QAONLY123");
  check(defaultIndex >= 0 && updateIndex > defaultIndex && configIndex > updateIndex, "accept: consent/config command order is wrong");
  check(queuedAfter[updateIndex][2].ad_storage === "denied" && queuedAfter[updateIndex][2].ad_user_data === "denied" && queuedAfter[updateIndex][2].ad_personalization === "denied", "accept: advertising consent was granted");

  const footerSettings = acceptPage.getByRole("button", { name: "隱私設定" });
  await footerSettings.click();
  check(await acceptPage.getByRole("dialog").isVisible(), "keyboard: settings dialog did not open");
  check(await acceptPage.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-consent-close")), "keyboard: focus did not enter dialog");
  await acceptPage.keyboard.press("Shift+Tab");
  check(await acceptPage.evaluate(() => document.activeElement && document.activeElement.closest("[role=dialog]") !== null), "keyboard: Shift+Tab escaped the dialog");
  await acceptPage.keyboard.press("Tab");
  check(await acceptPage.evaluate(() => document.activeElement && document.activeElement.closest("[role=dialog]") !== null), "keyboard: Tab escaped the dialog");
  await acceptPage.keyboard.press("Escape");
  check(!(await acceptPage.getByRole("dialog").isVisible()), "keyboard: Escape did not close dialog");
  check(await acceptPage.evaluate(() => document.activeElement && document.activeElement.hasAttribute("data-drugnews-consent-settings")), "keyboard: focus did not return to settings control");

  stage("withdraw and reload");
  await footerSettings.click();
  const requestsBeforeWithdrawal = analyticsRequests.length;
  await Promise.all([
    acceptPage.waitForNavigation({ waitUntil: "domcontentloaded" }),
    acceptPage.getByRole("button", { name: "不同意分析" }).click()
  ]);
  const withdrawn = await acceptPage.evaluate(() => JSON.parse(localStorage.getItem("drugnewsConsentV1")));
  check(withdrawn.status === "denied" && Boolean(withdrawn.timestamp), "withdrawal: denied preference missing");
  check(analyticsRequests.length === requestsBeforeWithdrawal, "withdrawal reload: loaded Google tag again");
  check((await acceptContext.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "withdrawal: _ga cookie remains");
  check(await acceptPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "1440: horizontal overflow");
  await acceptContext.close();

  stage("English 390");
  const englishContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const englishPage = await englishContext.newPage();
  applyTimeouts(englishPage);
  await englishPage.goto(`${base}/en/privacy.html`, { waitUntil: "domcontentloaded" });
  check(await englishPage.getByRole("heading", { name: "Privacy Notice", level: 1 }).isVisible(), "English privacy page missing H1");
  check(await englishPage.getByRole("button", { name: "Allow analytics" }).isVisible(), "English consent copy missing");
  check(await englishPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "English 390: horizontal overflow");
  await englishContext.close();

  stage("no-JS bilingual policy pages");
  const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const noJsPage = await noJsContext.newPage();
  applyTimeouts(noJsPage);
  await noJsPage.goto(`${base}/privacy.html`, { waitUntil: "domcontentloaded" });
  check(await noJsPage.getByRole("heading", { name: "隱私權聲明", level: 1 }).isVisible(), "no-JS: Chinese privacy content is not readable");
  check(await noJsPage.getByRole("link", { name: "Cookie", exact: true }).isVisible(), "no-JS: static privacy footer link missing");
  await noJsPage.goto(`${base}/en/cookies.html`, { waitUntil: "domcontentloaded" });
  check(await noJsPage.getByRole("heading", { name: "Cookie and Local Storage Notice", level: 1 }).isVisible(), "no-JS: English cookie content is not readable");
  await noJsContext.close();
  stage("all browser checks finished");
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

const result = {
  ok: errors.length === 0,
  tested: [
    "390 first visit",
    "reject and reload",
    "configured-ID accept gate",
    "consent command order",
    "withdraw and reload",
    "keyboard dialog",
    "1440 overflow",
    "English 390",
    "no-JS bilingual policy pages"
  ],
  errors
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
