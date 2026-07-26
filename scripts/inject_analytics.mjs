import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SETTINGS_PATH = path.join(ROOT, "content", "site-settings.json");
const START = "<!-- Drugnews analytics:start -->";
const END = "<!-- Drugnews analytics:end -->";
const MANAGED_BLOCK = new RegExp(`\\n?\\s*${START}[\\s\\S]*?${END}\\s*\\n?`, "g");
const PRIVACY_START = "<!-- Drugnews privacy-links:start -->";
const PRIVACY_END = "<!-- Drugnews privacy-links:end -->";
const PRIVACY_BLOCK = new RegExp(`\\n?\\s*${PRIVACY_START}[\\s\\S]*?${PRIVACY_END}\\s*\\n?`, "g");
const CONSENT_VERSION = "2026-07-26";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function readSettings() {
  try {
    return JSON.parse(await fs.readFile(SETTINGS_PATH, "utf8"));
  } catch {
    return {};
  }
}

function validGaId(value = "") {
  const id = String(value).trim();
  return /^G-[A-Z0-9]+$/i.test(id) ? id : "";
}

function validVerification(value = "") {
  return String(value).trim().replace(/^google-site-verification=/, "");
}

function analyticsBlock({ gaId, verification }) {
  const verificationMeta = verification
    ? `  <meta name="google-site-verification" content="${escapeHtml(verification)}">\n`
    : "";
  return `  ${START}
${verificationMeta}  <link rel="stylesheet" href="/privacy-consent.css?v=20260726-1">
  <script>
    window.drugnewsAnalyticsConfig = {
      measurementId: '${escapeHtml(gaId)}',
      consentVersion: '${CONSENT_VERSION}'
    };
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('set', 'ads_data_redaction', true);
  </script>
  <script defer src="/privacy-consent.js?v=20260726-1"></script>
  ${END}`;
}

function privacyLinks(isEnglish) {
  const privacyHref = isEnglish ? "/en/privacy.html" : "/privacy.html";
  const cookiesHref = isEnglish ? "/en/cookies.html" : "/cookies.html";
  const privacyLabel = isEnglish ? "Privacy" : "隱私權";
  const cookiesLabel = isEnglish ? "Cookies" : "Cookie";
  const settingsLabel = isEnglish ? "Privacy settings" : "隱私設定";
  return `${PRIVACY_START}
  <nav class="privacy-footer-links" aria-label="${isEnglish ? "Privacy" : "隱私權"}">
    <a href="${privacyHref}">${privacyLabel}</a>
    <a href="${cookiesHref}">${cookiesLabel}</a>
    <button type="button" class="privacy-footer-button" data-drugnews-consent-settings>${settingsLabel}</button>
  </nav>
  ${PRIVACY_END}`;
}

async function listHtmlFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "content") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const settings = await readSettings();
  const gaId = validGaId(process.env.GOOGLE_ANALYTICS_ID || settings.google_analytics_id);
  const verification = validVerification(process.env.GOOGLE_SEARCH_CONSOLE_VERIFICATION || settings.google_search_console_verification);
  const block = analyticsBlock({ gaId, verification });
  const files = await listHtmlFiles(ROOT);
  let changed = 0;
  let headCoverage = 0;
  let footerCoverage = 0;

  for (const file of files) {
    const original = await fs.readFile(file, "utf8");
    let next = original.replace(MANAGED_BLOCK, "").replace(PRIVACY_BLOCK, "");
    if (/<\/head>/i.test(next)) {
      next = next.replace(/\s*<\/head>/i, `\n${block}\n</head>`);
      headCoverage += 1;
    }
    if (/<\/footer>/i.test(next)) {
      const isEnglish = /<html\b[^>]*\blang=["']en(?:-|["'])/i.test(next);
      next = next.replace(/\s*<\/footer>/i, `\n${privacyLinks(isEnglish)}\n</footer>`);
      footerCoverage += 1;
    }
    if (next !== original) {
      await fs.writeFile(file, next);
      changed += 1;
    }
  }

  const status = gaId
    ? `Consent-gated GA4 configured (${gaId}); Google tag loads only after acceptance.`
    : "Consent UI enabled; GA4 not configured and cannot load without a real Measurement ID.";
  const verifyStatus = verification ? "Search Console verification meta enabled." : "Search Console verification meta not enabled.";
  console.log(`${status} ${verifyStatus} Updated ${changed} HTML file(s); head coverage ${headCoverage}; footer coverage ${footerCoverage}.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
