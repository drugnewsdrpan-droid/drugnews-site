import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const BASE_URL = "https://drugnews.com.tw";
const SEARCH_INDEX = path.join(ROOT, "search-index.json");
const AI_INDEX = path.join(ROOT, "ai-index.json");
const SITE_SETTINGS = path.join(ROOT, "content", "site-settings.json");
const SOCIAL_FB_INPUT = "/private/tmp/drugnews-facebook-latest.json";
const SOCIAL_DCARD_INPUT = "/private/tmp/drugnews-dcard-latest.json";
const SOCIAL_FB_DIAGNOSTICS = `${SOCIAL_FB_INPUT}.diagnostics.json`;
const SOCIAL_DCARD_DIAGNOSTICS = `${SOCIAL_DCARD_INPUT}.diagnostics.json`;

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function readText(relativePath) {
  try {
    return await fsp.readFile(path.join(ROOT, relativePath), "utf8");
  } catch {
    return "";
  }
}

function runJson(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: "utf8"
  });
  const raw = result.stdout.trim();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  return {
    ok: result.status === 0,
    status: result.status,
    parsed,
    stderr: result.stderr.trim()
  };
}

function latestArticle(records = []) {
  return [...records]
    .filter((item) => !item.external && item.fileName)
    .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))[0] || null;
}

function daysSince(dateValue) {
  if (!dateValue) return null;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function check(name, ok, detail = "", severity = ok ? "ok" : "warning") {
  return { name, status: ok ? "ok" : severity, detail };
}

function summarizeFacebookDiagnostics(diagnostics) {
  if (!diagnostics) return "";
  const page = diagnostics.page || {};
  const candidate = Array.isArray(diagnostics.candidates) ? diagnostics.candidates[0] : null;
  const flags = [];
  if (/登入|電子郵件地址|密碼|建立新帳號/.test(page.body_preview || "")) flags.push("page shows login wall");
  if (candidate?.reasons?.includes("truncated_or_short")) flags.push(`latest candidate is truncated (${candidate.text_length || 0} chars)`);
  if (candidate?.images) flags.push(`${candidate.images} image(s) visible`);
  if (page.permalink_count !== undefined) flags.push(`${page.permalink_count} permalink(s) visible`);
  return flags.join("; ");
}

function summarizeDcardDiagnostics(diagnostics) {
  if (!diagnostics) return "";
  const profile = diagnostics.profile || {};
  const flags = [];
  if (profile.url) flags.push(`profile resolved to ${profile.url}`);
  if (profile.anchorCount !== undefined) flags.push(`${profile.anchorCount} anchor(s) visible`);
  if (profile.articleCount !== undefined) flags.push(`${profile.articleCount} article element(s) visible`);
  if (Array.isArray(diagnostics.links)) flags.push(`${diagnostics.links.length} post link(s) found`);
  if (/註冊 \/ 登入|下載 App/.test(profile.bodyPreview || "")) flags.push("page shows logged-out/app-gated shell");
  return flags.join("; ");
}

function captureCheck(name, filePath, payload, diagnostics = null) {
  if (!fs.existsSync(filePath)) {
    return check(name, false, `No latest ${name.startsWith("facebook") ? "Facebook" : "Dcard"} capture JSON found`, "warning");
  }
  if (!Array.isArray(payload)) {
    return check(name, false, `${filePath} is not a JSON array`, "warning");
  }
  const detail = payload.length > 0
    ? `${filePath} has ${payload.length} candidate(s)`
    : `${filePath} exists but has 0 candidates${diagnostics ? `; ${diagnostics}` : ""}`;
  return check(name, payload.length > 0, detail, "warning");
}

async function main() {
  const records = await readJson(SEARCH_INDEX, []);
  const aiIndex = await readJson(AI_INDEX, {});
  const settings = await readJson(SITE_SETTINGS, {});
  const facebookCapture = await readJson(SOCIAL_FB_INPUT, null);
  const dcardCapture = await readJson(SOCIAL_DCARD_INPUT, null);
  const facebookDiagnostics = await readJson(SOCIAL_FB_DIAGNOSTICS, null);
  const dcardDiagnostics = await readJson(SOCIAL_DCARD_DIAGNOSTICS, null);
  const latest = latestArticle(records);
  const robots = await readText("robots.txt");
  const sitemap = await readText("sitemap.xml");
  const newsSitemap = await readText("news-sitemap.xml");
  const llms = await readText("llms.txt");

  const references = runJson("scripts/audit_references.mjs", ["--limit=30"]).parsed;
  const reader = runJson("scripts/audit_reader_experience.mjs", ["--limit=30"]).parsed;
  const social = runJson("scripts/daily_social_update_check.mjs", ["--dry-run"]).parsed;

  const latestAge = daysSince(latest?.publishAt || latest?.date);
  const checks = [
    check("latest_article_exists", Boolean(latest), latest ? `${latest.date} ${latest.title}` : "No local article found", "error"),
    check("latest_article_recent", latestAge !== null && latestAge <= 3, latestAge === null ? "Unknown latest article age" : `${latestAge} day(s) since latest article`, "warning"),
    check("search_index_size", records.length >= 100, `${records.length} searchable records`, "warning"),
    check("ai_index_exists", fileExists("ai-index.json"), `${BASE_URL}/ai-index.json`, "error"),
    check("ai_index_has_latest_articles", Array.isArray(aiIndex.latest_articles) && aiIndex.latest_articles.length >= 30, `${aiIndex.latest_articles?.length || 0} AI index articles`, "warning"),
    check(
      "llms_exists",
      fileExists("llms.txt") && llms.includes("ai-index.json") && llms.includes("brand-profile.json") && llms.includes("market-radar.json"),
      "llms.txt includes AI index, brand profile, and capital-market radar",
      "warning"
    ),
    check("robots_ai_index", robots.includes("Allow: /ai-index.json") && robots.includes("Sitemap:"), "robots.txt exposes AI index and sitemap", "warning"),
    check("knowledge_graph_exists", fileExists("knowledge-graph.json") && robots.includes("Allow: /knowledge-graph.json"), `${BASE_URL}/knowledge-graph.json`, "warning"),
    check("market_radar_exists", fileExists("market-radar.html") && fileExists("market-radar.json") && robots.includes("Allow: /market-radar.json"), `${BASE_URL}/market-radar.html`, "warning"),
    check("brand_profile_exists", fileExists("brand-profile.json") && robots.includes("Allow: /brand-profile.json") && sitemap.includes(`${BASE_URL}/brand-profile.json`), `${BASE_URL}/brand-profile.json`, "warning"),
    check("sitemap_ai_index", sitemap.includes(`${BASE_URL}/ai-index.json`) && sitemap.includes(`${BASE_URL}/llms.txt`) && sitemap.includes(`${BASE_URL}/knowledge-graph.json`) && sitemap.includes(`${BASE_URL}/market-radar.html`) && sitemap.includes(`${BASE_URL}/market-radar.json`) && sitemap.includes(`${BASE_URL}/brand-profile.json`), "sitemap includes AI-readable files", "warning"),
    check("news_sitemap_exists", fileExists("news-sitemap.xml") && newsSitemap.includes("<url>"), "news-sitemap.xml has entries", "warning"),
    check("references_latest_30", references?.truncated_url_articles === 0, `${references?.truncated_url_articles ?? "unknown"} articles with truncated URLs`, "error"),
    check("reader_related_latest_30", reader?.failed_articles === 0, `${reader?.passed_articles ?? 0}/${reader?.checked_articles ?? 0} passed related-reading audit`, "warning"),
    captureCheck("facebook_capture_ready", SOCIAL_FB_INPUT, facebookCapture, summarizeFacebookDiagnostics(facebookDiagnostics)),
    captureCheck("dcard_capture_ready", SOCIAL_DCARD_INPUT, dcardCapture, summarizeDcardDiagnostics(dcardDiagnostics)),
    check("ga4_configured", Boolean(settings.google_analytics_id), settings.google_analytics_id ? "GA4 enabled" : "GA4 measurement ID missing", "warning"),
    check("search_console_configured", Boolean(settings.google_search_console_verification), settings.google_search_console_verification ? "Search Console verification configured" : "Search Console verification missing", "warning")
  ];

  const hardFailures = checks.filter((item) => item.status === "error");
  const warnings = checks.filter((item) => item.status === "warning");
  const output = {
    status: hardFailures.length ? "error" : warnings.length ? "warning" : "ok",
    generated_at: new Date().toISOString(),
    latest_article: latest ? {
      date: latest.date,
      title: latest.title,
      url: `${BASE_URL}/${latest.url}`,
      age_days: latestAge
    } : null,
    social_status: social ? {
      status: social.status,
      latest_site_article: social.latest_site_article,
      requests: social.requests,
      diagnostics: {
        facebook: summarizeFacebookDiagnostics(facebookDiagnostics),
        dcard: summarizeDcardDiagnostics(dcardDiagnostics)
      }
    } : null,
    checks,
    next_actions: [
      ...(social?.status === "needs_capture" ? ["Run npm run chrome:social (or /bin/zsh scripts/start_social_capture_chrome.sh if npm is unavailable), confirm Facebook/Dcard login, then rerun daily social capture; otherwise provide capture JSON."] : []),
      ...(!settings.google_analytics_id ? ["Add GA4 with: npm run tracking:configure -- --ga4=G-XXXXXXXXXX"] : []),
      ...(!settings.google_search_console_verification ? ["Add Search Console with: npm run tracking:configure -- --gsc=GOOGLE_SEARCH_CONSOLE_TOKEN"] : [])
    ]
  };

  console.log(JSON.stringify(output, null, 2));
  if (process.argv.includes("--strict") && hardFailures.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
