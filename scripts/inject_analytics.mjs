import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SETTINGS_PATH = path.join(ROOT, "content", "site-settings.json");
const START = "<!-- Drugnews analytics:start -->";
const END = "<!-- Drugnews analytics:end -->";
const MANAGED_BLOCK = new RegExp(`\\n?\\s*${START}[\\s\\S]*?${END}\\s*\\n?`, "g");

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
  const gaBlock = gaId
    ? `  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(gaId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${escapeHtml(gaId)}');
    function drugnewsEventName(url) {
      if (/vocus\\.cc/i.test(url)) return 'paid_column_click';
      if (/\\/services\\.html|\\/en\\/services\\.html/i.test(url)) return 'company_services_click';
      if (/facebook\\.com|dcard\\.tw|cmoney\\.tw|instagram\\.com/i.test(url)) return 'social_follow_click';
      if (/\\/en\\//i.test(url)) return 'english_site_click';
      if (/mailto:/i.test(url)) return 'contact_click';
      return 'outbound_click';
    }
    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href]');
      if (!link || !window.gtag) return;
      var url = link.href || '';
      var isOutbound = url && !url.startsWith(window.location.origin);
      var isSubscription = /vocus|facebook|dcard|cmoney|instagram/i.test(url);
      var isTrackedInternal = /\\/services\\.html|\\/en\\/services\\.html|\\/en\\//i.test(url);
      if (isOutbound || isSubscription || isTrackedInternal) {
        gtag('event', drugnewsEventName(url), {
          event_category: isOutbound ? 'outbound_link' : 'site_link',
          event_label: url,
          link_text: (link.innerText || link.getAttribute('aria-label') || '').trim().slice(0, 120)
        });
      }
    });
  </script>\n`
    : "";
  if (!verificationMeta && !gaBlock) return "";
  return `
  ${START}
${verificationMeta}${gaBlock}  ${END}`;
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

  for (const file of files) {
    const original = await fs.readFile(file, "utf8");
    let next = original.replace(MANAGED_BLOCK, "\n");
    if (block && /<\/head>/i.test(next)) {
      next = next.replace(/<\/head>/i, `${block}\n</head>`);
    }
    if (next !== original) {
      await fs.writeFile(file, next);
      changed += 1;
    }
  }

  const status = gaId ? `GA4 enabled (${gaId})` : "GA4 not enabled; set content/site-settings.json google_analytics_id.";
  const verifyStatus = verification ? "Search Console verification meta enabled." : "Search Console verification meta not enabled.";
  console.log(`${status} ${verifyStatus} Updated ${changed} HTML file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
