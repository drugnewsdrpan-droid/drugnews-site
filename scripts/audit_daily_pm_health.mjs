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

function dirExists(relativePath) {
  try {
    return fs.statSync(path.join(ROOT, relativePath)).isDirectory();
  } catch {
    return false;
  }
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

function jsonLdBlocks(html = "") {
  return [...String(html).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function offerCatalogStatus(html = "") {
  const catalog = jsonLdBlocks(html).find((block) => block?.["@type"] === "OfferCatalog");
  if (!catalog) return { ok: false, detail: "missing OfferCatalog" };
  const offers = Array.isArray(catalog.itemListElement) ? catalog.itemListElement : [];
  const urls = offers.map((offer) => String(offer.url || "")).join(" ");
  const names = offers.map((offer) => offer?.itemOffered?.name).filter(Boolean);
  const hasResearchPackTracking = urls.includes("utm_campaign=paid_research_pack");
  const hasCompanyServiceTracking = urls.includes("utm_campaign=company_services");
  const ok = offers.length >= 3 && hasResearchPackTracking && hasCompanyServiceTracking;
  return {
    ok,
    detail: ok
      ? `${offers.length} offer(s): ${names.join(" / ")}`
      : `${offers.length} offer(s); research-pack tracking: ${hasResearchPackTracking}; company-service tracking: ${hasCompanyServiceTracking}`
  };
}

function structuredArticleStatus(records = [], limit = 30) {
  const latest = [...records]
    .filter((item) => !item.external && item.fileName && item.url)
    .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))
    .slice(0, limit);
  const issues = [];
  let withCitation = 0;
  let withReadingMeta = 0;
  for (const record of latest) {
    const html = fs.existsSync(path.join(ROOT, record.url))
      ? fs.readFileSync(path.join(ROOT, record.url), "utf8")
      : "";
    const article = jsonLdBlocks(html).find((block) => block?.["@type"] === "Article");
    if (!article) {
      issues.push(`${record.date} ${record.title}: missing Article JSON-LD`);
      continue;
    }
    if (Number(article.wordCount) > 0 && /^PT\d+M$/.test(String(article.timeRequired || ""))) {
      withReadingMeta += 1;
    } else {
      issues.push(`${record.date} ${record.title}: missing wordCount/timeRequired`);
    }
    if (Array.isArray(article.citation) && article.citation.some((item) => item?.url)) {
      withCitation += 1;
    }
  }
  const latestTen = latest.slice(0, 10);
  let latestTenWithCitation = 0;
  for (const record of latestTen) {
    const html = fs.existsSync(path.join(ROOT, record.url))
      ? fs.readFileSync(path.join(ROOT, record.url), "utf8")
      : "";
    const article = jsonLdBlocks(html).find((block) => block?.["@type"] === "Article");
    if (Array.isArray(article?.citation) && article.citation.some((item) => item?.url)) {
      latestTenWithCitation += 1;
    }
  }
  const ok = latest.length === limit &&
    withReadingMeta === latest.length &&
    latestTenWithCitation >= 8 &&
    withCitation >= 15 &&
    issues.length === 0;
  return {
    ok,
    detail: `${withReadingMeta}/${latest.length} have reading metadata; ${latestTenWithCitation}/${latestTen.length} latest articles and ${withCitation}/${latest.length} latest-${limit} articles have citation schema${issues.length ? `; ${issues.slice(0, 3).join(" | ")}` : ""}`
  };
}

function graphNodesFromHtml(html = "") {
  return jsonLdBlocks(html).flatMap((block) => Array.isArray(block?.["@graph"]) ? block["@graph"] : [block]);
}

function sitemapCompletenessStatus(sitemap = "") {
  const requiredPaths = [
    "/en/",
    "/en/articles/",
    "/en/guides/",
    "/en/guides/clinical-endpoints.html",
    "/en/guides/regulatory-milestones.html",
    "/en/guides/biotech-valuation.html",
    "/en/guides/bd-licensing-terms.html",
    "/en/guides/safety-cmc-risk.html",
    "/en/guides/market-sizing.html",
    "/en/guides/patent-competition.html",
    "/en/guides/cash-runway.html",
    "/en/services.html",
    "/en/subscribe.html",
    "/en/team.html",
    "/topics/",
    "/topics/biotech-investing.html",
    "/topics/biotech-valuation.html",
    "/topics/bd-licensing.html",
    "/topics/clinical-data.html",
    "/topics/cmc.html",
    "/topics/drug-development.html",
    "/topics/big-pharma.html",
    "/topics/glp1.html",
    "/companies.html"
  ];
  const missing = requiredPaths.filter((item) => !sitemap.includes(`${BASE_URL}${item}`));
  return {
    ok: missing.length === 0,
    detail: missing.length
      ? `Missing sitemap entries: ${missing.join(", ")}`
      : `${requiredPaths.length} public English/topic/company entrypoints are present`
  };
}

function collectionPagesStatus(records = []) {
  const pages = [
    ["articles/index.html", "文章中心", records.length],
    ["articles/category/business-analysis.html", "商業分析", records.filter((item) => item.category === "商業分析系列").length],
    ["articles/category/fundamental-analysis.html", "基本面", records.filter((item) => item.category === "基本面系列").length],
    ["articles/category/medical-conference.html", "醫學大會", records.filter((item) => item.category === "醫學大會").length],
    ["articles/category/paid-deep-analysis.html", "深度商業分析", records.filter((item) => item.category === "付費深度商業分析文章系列").length],
    ["articles/category/big-pharma.html", "製藥巨頭", records.filter((item) => item.category === "製藥巨頭系列").length]
  ];
  const issues = [];
  for (const [relativePath, label, expectedCount] of pages) {
    const fullPath = path.join(ROOT, relativePath);
    const html = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
    const nodes = graphNodesFromHtml(html);
    const collection = nodes.find((item) => item?.["@type"] === "CollectionPage");
    const list = nodes.find((item) => item?.["@type"] === "ItemList");
    const breadcrumb = nodes.find((item) => item?.["@type"] === "BreadcrumbList");
    const listed = Array.isArray(list?.itemListElement) ? list.itemListElement.length : 0;
    if (!collection || !list) {
      issues.push(`${label}: missing CollectionPage/ItemList`);
      continue;
    }
    if (!breadcrumb) {
      issues.push(`${label}: missing BreadcrumbList`);
    }
    if (Number(list.numberOfItems) !== expectedCount) {
      issues.push(`${label}: ItemList count ${list.numberOfItems} does not match ${expectedCount}`);
    }
    if (expectedCount > 0 && listed < Math.min(expectedCount, 30)) {
      issues.push(`${label}: only ${listed} list item(s) exposed`);
    }
  }
  return {
    ok: issues.length === 0,
    detail: issues.length ? issues.slice(0, 4).join(" | ") : `${pages.length} article hub pages expose CollectionPage, ItemList and BreadcrumbList schema`
  };
}

function cleanArticleTopicMetadataStatus(records = [], limit = 30) {
  const latest = [...records]
    .filter((item) => !item.external && item.fileName && item.url)
    .sort((a, b) => new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date))
    .slice(0, limit);
  const noisy = [];
  const platformPattern = /\b(Dcard|Facebook|FB)\b|方格子|免費文章|付費文章/i;
  for (const record of latest) {
    const fullPath = path.join(ROOT, record.url);
    const html = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
    const article = jsonLdBlocks(html).find((block) => block?.["@type"] === "Article");
    if (!article) continue;
    const about = Array.isArray(article.about) ? article.about.map((item) => item?.name || item).join(" ") : "";
    const keywords = String(article.keywords || "");
    const topicText = `${about} ${keywords}`;
    if (platformPattern.test(topicText)) noisy.push(`${record.date} ${record.title}`);
  }
  return {
    ok: noisy.length === 0,
    detail: noisy.length
      ? `Platform labels found in Article topic metadata: ${noisy.slice(0, 3).join(" | ")}`
      : `${latest.length} latest articles keep source-platform labels out of Article topic metadata`
  };
}

function localAssetPath(assetPath, htmlPath = "") {
  const value = String(assetPath || "").trim();
  if (!value || /^(https?:|data:|mailto:|tel:)/i.test(value)) return null;
  const clean = value.split("#")[0].split("?")[0];
  if (!clean) return null;
  if (clean.startsWith("/")) return path.join(ROOT, clean.replace(/^\/+/, ""));
  if (htmlPath) return path.resolve(path.dirname(path.join(ROOT, htmlPath)), clean);
  return path.resolve(ROOT, clean.replace(/^(\.\.\/)+/, ""));
}

function imageAssetStatus(records = []) {
  const missing = [];
  for (const record of records) {
    const imagePath = localAssetPath(record.image);
    if (imagePath && !fs.existsSync(imagePath)) {
      missing.push(`${record.title}: ${record.image}`);
    }
    if (!record.external && record.url) {
      const htmlPath = path.join(ROOT, record.url);
      const html = fs.existsSync(htmlPath) ? fs.readFileSync(htmlPath, "utf8") : "";
      for (const match of html.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
        const src = match[1];
        const fullPath = localAssetPath(src, record.url);
        if (fullPath && !fs.existsSync(fullPath)) {
          missing.push(`${record.title}: ${src}`);
        }
      }
    }
  }
  return {
    ok: missing.length === 0,
    detail: missing.length
      ? `${missing.length} missing image asset(s): ${missing.slice(0, 3).join(" | ")}`
      : `${records.length} records have valid local thumbnail/article image paths`
  };
}

async function newsMediaOrganizationStatus() {
  const files = [
    "index.html",
    "en/index.html",
    "about.html",
    "en/about.html",
    "brand-profile.json",
    "knowledge-graph.json"
  ];
  const missing = [];
  for (const file of files) {
    const fullPath = path.join(ROOT, file);
    const text = fs.existsSync(fullPath) ? await fsp.readFile(fullPath, "utf8") : "";
    if (!text.includes("NewsMediaOrganization")) missing.push(file);
  }
  return {
    ok: missing.length === 0,
    detail: missing.length
      ? `Missing NewsMediaOrganization in: ${missing.join(", ")}`
      : `${files.length} core identity files expose NewsMediaOrganization schema`
  };
}

function summarizeFacebookDiagnostics(diagnostics) {
  if (!diagnostics) return "";
  if (diagnostics.rejected_reason) {
    return [diagnostics.selected_url ? `current tab ${diagnostics.selected_url}` : "", diagnostics.rejected_reason].filter(Boolean).join("; ");
  }
  const page = diagnostics.page || {};
  const candidate = Array.isArray(diagnostics.candidates) ? diagnostics.candidates[0] : null;
  const flags = [];
  if (/登入|電子郵件地址|密碼|建立新帳號/.test(page.body_preview || "")) flags.push("page shows login wall");
  if (candidate?.reasons?.includes("truncated_or_short")) flags.push(`latest candidate is truncated (${candidate.text_length || 0} chars)`);
  if (candidate?.images) flags.push(`${candidate.images} image(s) visible`);
  if (page.permalink_count !== undefined) flags.push(`${page.permalink_count} permalink(s) visible`);
  return flags.join("; ");
}

function normalizeTitle(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/[｜|]\s*(Drugnews|藥時事).*$/iu, "")
    .trim();
}

function facebookPreviewAlreadyPublished(diagnostics, latest) {
  const candidate = Array.isArray(diagnostics?.candidates) ? diagnostics.candidates[0] : null;
  return Boolean(candidate?.title && latest?.title && normalizeTitle(candidate.title) === normalizeTitle(latest.title));
}

function summarizeDcardDiagnostics(diagnostics) {
  if (!diagnostics) return "";
  if (diagnostics.rejected_reason) {
    return [diagnostics.selected_url ? `current tab ${diagnostics.selected_url}` : "", diagnostics.rejected_reason].filter(Boolean).join("; ");
  }
  const profile = diagnostics.profile || {};
  const body = profile.bodyPreview || "";
  const flags = [];
  if (profile.url) flags.push(`profile resolved to ${profile.url}`);
  if (profile.anchorCount !== undefined) flags.push(`${profile.anchorCount} anchor(s) visible`);
  if (profile.articleCount !== undefined) flags.push(`${profile.articleCount} article element(s) visible`);
  if (Array.isArray(diagnostics.links)) flags.push(`${diagnostics.links.length} post link(s) found`);
  if (/需要確認您的連線是安全|驗證請求是真實的人類|you have been blocked|unable to access dcard/i.test(body)) {
    flags.push("Dcard requires human verification before posts are visible");
  } else if (/註冊 \/ 登入|下載 App/.test(body)) {
    flags.push("page shows logged-out/app-gated shell");
  }
  return flags.join("; ");
}

function captureCheck(name, filePath, payload, diagnostics = null, options = {}) {
  if (!fs.existsSync(filePath)) {
    return check(name, false, `No latest ${name.startsWith("facebook") ? "Facebook" : "Dcard"} capture JSON found`, "warning");
  }
  if (!Array.isArray(payload)) {
    return check(name, false, `${filePath} is not a JSON array`, "warning");
  }
  const detail = payload.length > 0
    ? `${filePath} has ${payload.length} candidate(s)`
    : `${filePath} exists but has 0 candidates${diagnostics ? `; ${diagnostics}` : ""}`;
  if (options.limitedButCurrent && payload.length === 0) {
    return check(name, true, `${detail}; visible preview matches latest site article`, "warning");
  }
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
  const subscribeHtml = await readText("subscribe.html");
  const enSubscribeHtml = await readText("en/subscribe.html");
  const zhOfferCatalog = offerCatalogStatus(subscribeHtml);
  const enOfferCatalog = offerCatalogStatus(enSubscribeHtml);
  const structuredArticles = structuredArticleStatus(records, 30);
  const sitemapCompleteness = sitemapCompletenessStatus(sitemap);
  const collectionPages = collectionPagesStatus(records);
  const cleanArticleTopicMetadata = cleanArticleTopicMetadataStatus(records, 30);
  const imageAssets = imageAssetStatus(records);
  const newsMediaOrganization = await newsMediaOrganizationStatus();

  const references = runJson("scripts/audit_references.mjs", ["--limit=30"]).parsed;
  const reader = runJson("scripts/audit_reader_experience.mjs", ["--limit=30"]).parsed;
  const readingProduct = runJson("scripts/audit_reading_product_tasks.mjs").parsed;
  const englishLocalization = runJson("scripts/audit_english_localization.mjs").parsed;
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
      fileExists("llms.txt") && llms.includes("ai-index.json") && llms.includes("feed.json") && llms.includes("brand-profile.json") && llms.includes("market-radar.json"),
      "llms.txt includes AI index, JSON feed, brand profile, and capital-market radar",
      "warning"
    ),
    check("robots_ai_index", robots.includes("Allow: /ai-index.json") && robots.includes("Sitemap:"), "robots.txt exposes AI index and sitemap", "warning"),
    check("knowledge_graph_exists", fileExists("knowledge-graph.json") && robots.includes("Allow: /knowledge-graph.json"), `${BASE_URL}/knowledge-graph.json`, "warning"),
    check("json_feed_exists", fileExists("feed.json") && robots.includes("Allow: /feed.json") && sitemap.includes(`${BASE_URL}/feed.json`), `${BASE_URL}/feed.json`, "warning"),
    check("market_radar_exists", fileExists("market-radar.html") && fileExists("market-radar.json") && robots.includes("Allow: /market-radar.json"), `${BASE_URL}/market-radar.html`, "warning"),
    check("brand_profile_exists", fileExists("brand-profile.json") && robots.includes("Allow: /brand-profile.json") && sitemap.includes(`${BASE_URL}/brand-profile.json`), `${BASE_URL}/brand-profile.json`, "warning"),
    check("news_media_organization_schema", newsMediaOrganization.ok, newsMediaOrganization.detail, "warning"),
    check("japanese_gateway_removed", !dirExists("ja") && !sitemap.includes(`${BASE_URL}/ja/`), "Japanese gateway and directory are intentionally not exposed until localization quality is ready", "warning"),
    check("paid_offer_catalog_zh", zhOfferCatalog.ok, zhOfferCatalog.detail, "warning"),
    check("paid_offer_catalog_en", enOfferCatalog.ok, enOfferCatalog.detail, "warning"),
    check("sitemap_ai_index", sitemap.includes(`${BASE_URL}/ai-index.json`) && sitemap.includes(`${BASE_URL}/feed.json`) && sitemap.includes(`${BASE_URL}/llms.txt`) && sitemap.includes(`${BASE_URL}/knowledge-graph.json`) && sitemap.includes(`${BASE_URL}/market-radar.html`) && sitemap.includes(`${BASE_URL}/market-radar.json`) && sitemap.includes(`${BASE_URL}/brand-profile.json`), "sitemap includes AI-readable files", "warning"),
    check("sitemap_public_entrypoints", sitemapCompleteness.ok, sitemapCompleteness.detail, "warning"),
    check("article_collection_schema", collectionPages.ok, collectionPages.detail, "warning"),
    check("image_assets_exist", imageAssets.ok, imageAssets.detail, "warning"),
    check("news_sitemap_exists", fileExists("news-sitemap.xml") && newsSitemap.includes("<url>"), "news-sitemap.xml has entries", "warning"),
    check("references_latest_30", references?.truncated_url_articles === 0, `${references?.truncated_url_articles ?? "unknown"} articles with truncated URLs`, "error"),
    check("structured_article_schema_latest_30", structuredArticles.ok, structuredArticles.detail, "warning"),
    check("clean_article_topic_metadata_latest_30", cleanArticleTopicMetadata.ok, cleanArticleTopicMetadata.detail, "warning"),
    check("reader_related_latest_30", reader?.failed_articles === 0, `${reader?.passed_articles ?? 0}/${reader?.checked_articles ?? 0} passed related-reading audit`, "warning"),
    check("reading_product_tasks", readingProduct?.status === "ok", readingProduct?.status === "ok" ? "mobile, search, topic hubs, tags, and share placement passed" : `${readingProduct?.failed?.length ?? "unknown"} reading-product task(s) need review`, "warning"),
    check("english_localization_images", englishLocalization?.status === "ok", englishLocalization?.status === "ok" ? `${englishLocalization.checked_articles} English articles checked; no Chinese social images reused` : `${englishLocalization?.flagged_images?.length ?? "unknown"} localized image issue(s)`, "warning"),
    captureCheck("facebook_capture_ready", SOCIAL_FB_INPUT, facebookCapture, summarizeFacebookDiagnostics(facebookDiagnostics), {
      limitedButCurrent: facebookPreviewAlreadyPublished(facebookDiagnostics, latest)
    }),
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
      platform_state: social.platform_state,
      latest_site_article: social.latest_site_article,
      requests: social.requests,
      diagnostics: {
        facebook: summarizeFacebookDiagnostics(facebookDiagnostics),
        dcard: summarizeDcardDiagnostics(dcardDiagnostics)
      }
    } : null,
    checks,
    next_actions: [
      ...(social?.status === "needs_capture"
        ? [social?.platform_state?.facebook === "already_current_limited_capture" && social?.platform_state?.dcard === "needs_capture"
          ? "Facebook visible preview already matches the latest site article. If Dcard has a newer post, complete the Dcard human verification/login in the capture Chrome, then rerun daily social capture."
          : "Run npm run chrome:social (or /bin/zsh scripts/start_social_capture_chrome.sh if npm is unavailable), confirm Facebook/Dcard login, then rerun daily social capture; otherwise provide capture JSON."]
        : []),
      ...(readingProduct?.status !== "ok" ? ["Run node scripts/audit_reading_product_tasks.mjs to inspect mobile/search/topic reading-experience regressions."] : []),
      ...(!settings.google_analytics_id ? ["Add GA4 with: node scripts/configure_site_tracking.mjs --ga4=G-XXXXXXXXXX"] : []),
      ...(!settings.google_search_console_verification ? ["Add Search Console with: node scripts/configure_site_tracking.mjs --gsc=GOOGLE_SEARCH_CONSOLE_TOKEN"] : [])
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
