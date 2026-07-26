import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const errors = [];
const warnings = [];

function count(text, marker) {
  return text.split(marker).length - 1;
}

async function htmlFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if ([".git", "node_modules", "content", "output"].includes(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function requireMarker(condition, detail) {
  if (!condition) errors.push(detail);
}

const settings = JSON.parse(await fs.readFile(path.join(ROOT, "content", "site-settings.json"), "utf8"));
const configuredId = String(settings.google_analytics_id || "").trim();
requireMarker(!configuredId || /^G-[A-Z0-9]+$/i.test(configuredId), "site-settings contains an invalid GA4 Measurement ID");
requireMarker(!/G-XXXXXXXXXX|G-QAONLY|G-TEST/i.test(JSON.stringify(settings)), "site-settings contains a placeholder Measurement ID");
requireMarker(settings.consent_policy_version === "2026-07-26", "consent policy version is missing or unexpected");

const runtime = await fs.readFile(path.join(ROOT, "privacy-consent.js"), "utf8");
const injector = await fs.readFile(path.join(ROOT, "scripts", "inject_analytics.mjs"), "utf8");
const runtimeRequirements = [
  'var storageKey = "drugnewsConsentV1"',
  "status: status",
  "version: consentVersion",
  "timestamp: new Date().toISOString()",
  "if (!validMeasurementId() || googleTagLoaded) return",
  'script.src = "https://www.googletagmanager.com/gtag/js?id="',
  'consentState("denied")',
  'ad_storage: "denied"',
  'ad_user_data: "denied"',
  'ad_personalization: "denied"',
  "allow_google_signals: false",
  "allow_ad_personalization_signals: false",
  "setAnalyticsDisabled",
  '"ga-disable-" + measurementId',
  "deleteAnalyticsCookies",
  'window.location.reload()',
  "keepFocusInSettings",
  "data-drugnews-consent-settings"
];
for (const marker of runtimeRequirements) {
  requireMarker(runtime.includes(marker), `privacy-consent.js missing: ${marker}`);
}
requireMarker(!runtime.includes("link_text:"), "runtime must not send anchor text");
requireMarker(runtime.includes("safePageLocation"), "runtime does not filter page location");

const injectorRequirements = [
  "window.gtag('consent', 'default'",
  "analytics_storage: 'denied'",
  "ad_storage: 'denied'",
  "ad_user_data: 'denied'",
  "ad_personalization: 'denied'",
  'src="/privacy-consent.js?v=20260726-2"',
  "data-drugnews-consent-settings"
];
for (const marker of injectorRequirements) {
  requireMarker(injector.includes(marker), `injector missing: ${marker}`);
}
requireMarker(!injector.includes('<script async src="https://www.googletagmanager.com/gtag/js'), "injector loads Google tag before consent");

const files = await htmlFiles(ROOT);
let headPages = 0;
let footerPages = 0;
let englishFooters = 0;
let chineseFooters = 0;

for (const file of files) {
  const relative = path.relative(ROOT, file);
  const html = await fs.readFile(file, "utf8");
  if (/<\/head>/i.test(html)) {
    headPages += 1;
    requireMarker(count(html, "<!-- Drugnews analytics:start -->") === 1, `${relative}: analytics block count is not 1`);
    requireMarker(count(html, "/privacy-consent.js?v=20260726-2") === 1, `${relative}: consent runtime count is not 1`);
    requireMarker(count(html, "/privacy-consent.css?v=20260726-2") === 1, `${relative}: consent stylesheet count is not 1`);
    requireMarker(!html.includes("googletagmanager.com/gtag/js"), `${relative}: directly loads Google tag`);
    const deniedIndex = html.indexOf("window.gtag('consent', 'default'");
    const runtimeIndex = html.indexOf("/privacy-consent.js?v=20260726-2");
    requireMarker(deniedIndex >= 0 && runtimeIndex > deniedIndex, `${relative}: default-denied does not precede runtime`);
  }
  if (/<\/footer>/i.test(html)) {
    footerPages += 1;
    requireMarker(count(html, "<!-- Drugnews privacy-links:start -->") === 1, `${relative}: privacy footer block count is not 1`);
    requireMarker(count(html, "data-drugnews-consent-settings") >= 1, `${relative}: privacy settings control missing`);
    const isEnglish = /<html\b[^>]*\blang=["']en(?:-|["'])/i.test(html);
    if (isEnglish) {
      englishFooters += 1;
      requireMarker(html.includes('href="/en/privacy.html"') && html.includes('href="/en/cookies.html"'), `${relative}: English privacy routes missing`);
    } else {
      chineseFooters += 1;
      requireMarker(html.includes('href="/privacy.html"') && html.includes('href="/cookies.html"'), `${relative}: Chinese privacy routes missing`);
    }
  }
}

const policyPages = [
  ["privacy.html", "隱私權聲明", "https://policies.google.com/technologies/partner-sites"],
  ["cookies.html", "Cookie 與本機儲存說明", "drugnewsConsentV1"],
  ["en/privacy.html", "Privacy Notice", "https://policies.google.com/technologies/partner-sites"],
  ["en/cookies.html", "Cookie and Local Storage Notice", "drugnewsConsentV1"]
];

for (const [relative, heading, evidence] of policyPages) {
  const html = await fs.readFile(path.join(ROOT, relative), "utf8");
  requireMarker(html.includes("<main>") && html.includes(heading), `${relative}: no-JS policy content missing`);
  requireMarker(html.includes(evidence), `${relative}: required disclosure evidence missing`);
  requireMarker(html.includes("data-drugnews-consent-settings"), `${relative}: withdrawal control missing`);
}

if (footerPages < headPages - 2) warnings.push(`Only ${footerPages}/${headPages} HTML documents have a footer; footerless utility documents cannot expose the static footer links.`);

const result = {
  ok: errors.length === 0,
  measurementId: configuredId || null,
  htmlFiles: files.length,
  headPages,
  footerPages,
  englishFooters,
  chineseFooters,
  policyPages: policyPages.map(([relative]) => relative),
  errors,
  warnings
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
