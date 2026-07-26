import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("/Users/jojo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const ORIGIN = "https://drugnews.com.tw";
const MEASUREMENT_ID = "G-X7VTN5K93C";
const UTM_URL = `${ORIGIN}/articles/2026-07-19-pelacarsen-lpa-horizon-en.html?utm_source=linkedin&utm_medium=organic_social&utm_campaign=pelacarsen-horizon-preread&utm_content=ga4-validation-20260726`;
const errors = [];

function check(condition, detail) {
  if (!condition) errors.push(detail);
}

function stage(label) {
  console.log(`[production-consent-qa] ${label}`);
}

function applyTimeouts(page) {
  page.setDefaultTimeout(15_000);
  page.setDefaultNavigationTimeout(60_000);
}

function isGoogleAnalyticsRequest(url) {
  return /googletagmanager\.com\/gtag\/js|(?:google-analytics|analytics\.google)\.com\/g\/collect/.test(url);
}

function isTagRequest(url) {
  return url.includes(`googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`);
}

function isPageViewRequest(url) {
  if (!/(?:google-analytics|analytics\.google)\.com\/g\/collect/.test(url)) return false;
  try {
    return new URL(url).searchParams.get("en") === "page_view";
  } catch {
    return false;
  }
}

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  timeout: 60_000
});

try {
  stage("390 first visit and rejection");
  const deniedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const deniedRequests = [];
  deniedContext.on("request", (request) => {
    if (isGoogleAnalyticsRequest(request.url())) deniedRequests.push(request.url());
  });
  const deniedPage = await deniedContext.newPage();
  applyTimeouts(deniedPage);
  await deniedPage.goto(`${ORIGIN}/`, { waitUntil: "domcontentloaded" });
  await deniedPage.waitForTimeout(800);
  check(await deniedPage.locator("[data-drugnews-consent-banner]").isVisible(), "390: first-visit banner is not visible");
  check(deniedRequests.length === 0, "first visit sent a Google Analytics request");
  check((await deniedContext.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "first visit wrote a _ga cookie");
  check(await deniedPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "390: horizontal overflow");
  await deniedPage.getByRole("button", { name: "只使用必要功能" }).click();
  const deniedPreference = await deniedPage.evaluate(() => JSON.parse(localStorage.getItem("drugnewsConsentV1")));
  check(deniedPreference?.status === "denied" && Boolean(deniedPreference?.timestamp), "reject: denied preference missing");
  await deniedPage.reload({ waitUntil: "domcontentloaded" });
  await deniedPage.waitForTimeout(600);
  check(await deniedPage.locator("[data-drugnews-consent-banner]").count() === 0, "reject reload: banner returned");
  check(deniedRequests.length === 0, "reject or reload sent a Google Analytics request");
  check((await deniedContext.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "reject reload wrote a _ga cookie");
  await deniedPage.goto(`${ORIGIN}/en/privacy.html`, { waitUntil: "domcontentloaded" });
  await deniedPage.waitForTimeout(600);
  check(deniedRequests.length === 0, "denied cross-page navigation sent a Google Analytics request");
  await deniedContext.close();

  stage("1440 acceptance, page_view, keyboard and withdrawal");
  const acceptedContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const acceptedRequests = [];
  let requestPhase = "before";
  acceptedContext.on("request", (request) => {
    if (isGoogleAnalyticsRequest(request.url())) {
      acceptedRequests.push({ phase: requestPhase, url: request.url() });
    }
  });
  const acceptedPage = await acceptedContext.newPage();
  applyTimeouts(acceptedPage);
  await acceptedPage.goto(UTM_URL, { waitUntil: "domcontentloaded" });
  await acceptedPage.waitForTimeout(800);
  check(acceptedRequests.length === 0, "UTM landing sent Analytics before consent");
  check((await acceptedContext.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "UTM landing wrote a _ga cookie before consent");

  const tagRequest = acceptedPage.waitForRequest((request) => isTagRequest(request.url()), { timeout: 20_000 });
  const pageViewRequest = acceptedPage.waitForRequest((request) => isPageViewRequest(request.url()), { timeout: 20_000 });
  requestPhase = "accepted";
  await acceptedPage.getByRole("button", { name: "Allow analytics" }).click();
  await tagRequest;
  const pageView = await pageViewRequest;
  await acceptedPage.waitForTimeout(800);
  check(isPageViewRequest(pageView.url()), "accept: page_view request missing");
  check(acceptedRequests.some((item) => isTagRequest(item.url)), "accept: correct Google tag request missing");
  check((await acceptedContext.cookies()).some((cookie) => cookie.name.startsWith("_ga")), "accept: _ga cookie missing");

  const commands = await acceptedPage.evaluate(() => window.dataLayer.map((item) => Array.from(item)));
  const defaultIndex = commands.findIndex((item) => item[0] === "consent" && item[1] === "default" && item[2].analytics_storage === "denied");
  const updateIndex = commands.findIndex((item) => item[0] === "consent" && item[1] === "update" && item[2].analytics_storage === "granted");
  const configIndex = commands.findIndex((item) => item[0] === "config" && item[1] === "G-X7VTN5K93C");
  check(defaultIndex >= 0 && updateIndex > defaultIndex && configIndex > updateIndex, "accept: consent/config command order is wrong");
  check(commands[updateIndex]?.[2]?.ad_storage === "denied", "accept: ad_storage was granted");
  check(commands[updateIndex]?.[2]?.ad_user_data === "denied", "accept: ad_user_data was granted");
  check(commands[updateIndex]?.[2]?.ad_personalization === "denied", "accept: ad_personalization was granted");
  const configLocation = commands[configIndex]?.[2]?.page_location || "";
  check(configLocation.includes("utm_source=linkedin"), "accept: safe page_location lost utm_source");
  check(configLocation.includes("utm_campaign=pelacarsen-horizon-preread"), "accept: safe page_location lost utm_campaign");
  check(!configLocation.includes("qa_ga="), "accept: page_location leaked non-whitelisted query data");
  check(await acceptedPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "1440: horizontal overflow");

  const settingsButton = acceptedPage.getByRole("button", { name: "Privacy settings" });
  await settingsButton.click();
  check(await acceptedPage.getByRole("dialog").isVisible(), "keyboard: settings dialog did not open");
  check(await acceptedPage.evaluate(() => document.activeElement?.hasAttribute("data-consent-close")), "keyboard: focus did not enter dialog");
  await acceptedPage.keyboard.press("Shift+Tab");
  check(await acceptedPage.evaluate(() => document.activeElement?.closest("[role=dialog]") !== null), "keyboard: focus escaped dialog");
  await acceptedPage.keyboard.press("Escape");
  check(!(await acceptedPage.getByRole("dialog").isVisible()), "keyboard: Escape did not close dialog");
  check(await acceptedPage.evaluate(() => document.activeElement?.hasAttribute("data-drugnews-consent-settings")), "keyboard: focus did not return");

  await settingsButton.click();
  await acceptedPage.waitForTimeout(1_000);
  requestPhase = "withdraw";
  await Promise.all([
    acceptedPage.waitForNavigation({ waitUntil: "domcontentloaded" }),
    acceptedPage.getByRole("button", { name: "Do not allow" }).click()
  ]);
  await acceptedPage.waitForTimeout(1_000);
  const withdrawnPreference = await acceptedPage.evaluate(() => JSON.parse(localStorage.getItem("drugnewsConsentV1")));
  check(withdrawnPreference?.status === "denied", "withdrawal: denied preference missing");
  check((await acceptedContext.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "withdrawal: _ga cookie remains");
  const afterWithdrawal = acceptedRequests.filter((item) => item.phase === "withdraw");
  check(afterWithdrawal.length === 0, `withdrawal sent ${afterWithdrawal.length} Google Analytics request(s)`);

  requestPhase = "post-withdraw";
  await acceptedPage.goto(`${ORIGIN}/en/cookies.html`, { waitUntil: "domcontentloaded" });
  await acceptedPage.waitForTimeout(800);
  check(acceptedRequests.filter((item) => item.phase === "post-withdraw").length === 0, "post-withdraw navigation sent Analytics");
  check((await acceptedContext.cookies()).every((cookie) => !cookie.name.startsWith("_ga")), "post-withdraw navigation recreated _ga");
  await acceptedContext.close();

  stage("no-JS bilingual policy pages");
  const noJsContext = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const noJsPage = await noJsContext.newPage();
  applyTimeouts(noJsPage);
  await noJsPage.goto(`${ORIGIN}/privacy.html`, { waitUntil: "domcontentloaded" });
  check(await noJsPage.getByRole("heading", { name: "隱私權聲明", level: 1 }).isVisible(), "no-JS: Chinese privacy page missing");
  check(await noJsPage.getByRole("link", { name: "Cookie", exact: true }).isVisible(), "no-JS: Chinese footer Cookie link missing");
  check(await noJsPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "no-JS Chinese 390: horizontal overflow");
  await noJsPage.goto(`${ORIGIN}/en/cookies.html`, { waitUntil: "domcontentloaded" });
  check(await noJsPage.getByRole("heading", { name: "Cookie and Local Storage Notice", level: 1 }).isVisible(), "no-JS: English cookie page missing");
  check(await noJsPage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), "no-JS English 390: horizontal overflow");
  await noJsContext.close();
} finally {
  await browser.close();
}

const result = {
  ok: errors.length === 0,
  origin: ORIGIN,
  measurementId: MEASUREMENT_ID,
  utmUrl: UTM_URL,
  tested: [
    "production 390 first visit",
    "production reject and reload",
    "production denied cross-page",
    "production real-ID accept gate",
    "production page_view and UTM",
    "production consent command order",
    "production keyboard dialog",
    "production withdrawal and reload",
    "production post-withdraw navigation",
    "production 1440 overflow",
    "production bilingual no-JS 390"
  ],
  errors
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
