import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const ORIGIN = "https://drugnews.com.tw";
const MEASUREMENT_ID = "G-X7VTN5K93C";
const TARGET_URL = `${ORIGIN}/articles/2026-07-19-pelacarsen-lpa-horizon-en.html`;
const errors = [];

function check(condition, detail) {
  if (!condition) errors.push(detail);
}

function isAnalytics(url) {
  return /googletagmanager\.com\/gtag\/js|(?:google-analytics|analytics\.google)\.com\/g\/collect/.test(url);
}

function isPageView(url) {
  if (!/(?:google-analytics|analytics\.google)\.com\/g\/collect/.test(url)) return false;
  try {
    return new URL(url).searchParams.get("en") === "page_view";
  } catch {
    return false;
  }
}

console.log("[production-withdrawal-qa] launch");
const browser = await chromium.launch({ headless: true, channel: "chrome", timeout: 60_000 });
const requests = [];
let phase = "before";

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.on("request", (request) => {
    if (isAnalytics(request.url())) requests.push({ phase, url: request.url() });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(60_000);

  console.log("[production-withdrawal-qa] target landing");
  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  check(requests.length === 0, "before consent: Analytics request present");
  check((await context.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "before consent: _ga cookie present");

  console.log("[production-withdrawal-qa] accept and page_view");
  const tagPromise = page.waitForRequest((request) => request.url().includes(`googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`), { timeout: 20_000 });
  const viewPromise = page.waitForRequest((request) => isPageView(request.url()), { timeout: 20_000 });
  phase = "accepted";
  await page.getByRole("button", { name: "Allow analytics" }).click();
  await tagPromise;
  await viewPromise;
  await page.waitForTimeout(500);
  check(requests.filter((item) => item.phase === "accepted").some((item) => isPageView(item.url)), "accept: page_view missing");
  check((await context.cookies()).some((cookie) => cookie.name.startsWith("_ga")), "accept: _ga cookie missing");

  const commands = await page.evaluate(() => window.dataLayer.map((item) => Array.from(item)));
  const defaultIndex = commands.findIndex((item) => item[0] === "consent" && item[1] === "default" && item[2].analytics_storage === "denied");
  const updateIndex = commands.findIndex((item) => item[0] === "consent" && item[1] === "update" && item[2].analytics_storage === "granted");
  const configIndex = commands.findIndex((item) => item[0] === "config" && item[1] === "G-X7VTN5K93C");
  check(defaultIndex >= 0 && updateIndex > defaultIndex && configIndex > updateIndex, "accept: command order wrong");

  console.log("[production-withdrawal-qa] withdraw and reload");
  await page.evaluate(() => document.querySelector("[data-drugnews-consent-settings]")?.click());
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.waitForTimeout(500);
  phase = "withdraw";
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    page.getByRole("button", { name: "Do not allow" }).click()
  ]);
  await page.waitForTimeout(700);
  const preference = await page.evaluate(() => JSON.parse(localStorage.getItem("drugnewsConsentV1")));
  check(preference?.status === "denied", "withdraw: denied preference missing");
  check(await page.evaluate(() => window["ga-disable-G-X7VTN5K93C"] === true), "withdraw: ga-disable flag missing");
  check((await context.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "withdraw: _ga cookie remains");
  check(requests.filter((item) => item.phase === "withdraw").length === 0, "withdraw: Analytics request present");

  console.log("[production-withdrawal-qa] post-withdraw navigation");
  phase = "post-withdraw";
  await page.goto(`${ORIGIN}/en/cookies.html`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  check(requests.filter((item) => item.phase === "post-withdraw").length === 0, "post-withdraw: Analytics request present");
  check((await context.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "post-withdraw: _ga cookie recreated");
  await context.close();
} finally {
  await browser.close();
}

const counts = Object.fromEntries(["before", "accepted", "withdraw", "post-withdraw"].map((name) => [
  name,
  requests.filter((item) => item.phase === name).length
]));
const result = {
  ok: errors.length === 0,
  measurementId: MEASUREMENT_ID,
  targetUrl: TARGET_URL,
  requestCounts: counts,
  withdrawalRequests: requests.filter((item) => item.phase === "withdraw").map((item) => item.url),
  postWithdrawalRequests: requests.filter((item) => item.phase === "post-withdraw").map((item) => item.url),
  errors
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
