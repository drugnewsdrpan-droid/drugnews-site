// Public discovery policy shared by the publisher and scheduled audit descriptors.
const SERIES = new Set(["商業分析系列", "基本面系列", "醫學大會", "付費深度商業分析文章系列", "製藥巨頭系列"]);
function platformLabel(meta) {
  if (meta.source_platform) return meta.source_platform;
  const platforms = [];
  if (meta.dcard_url) platforms.push("Dcard");
  if (meta.facebook_url) platforms.push("Facebook");
  return platforms.length ? platforms.join(" / ") : "網站";
}
export function inferSeries(input = {}) {
  if (SERIES.has(input.series)) return input.series;
  if (SERIES.has(input.category)) return input.category;
  const access = input.access || "免費文章";
  const source = input.source || input.source_platform || platformLabel(input);
  const title = input.title || "";
  const tags = Array.isArray(input.tags) ? input.tags.join(" ") : "";
  const haystack = `${title} ${tags}`;
  if (/ASCO|ESMO|AACR|EHA|AHA|ADA|ASH|醫學大會|年會|大會整理/i.test(haystack)) return "醫學大會";
  if (access === "免費文章" && /Dcard|Facebook|網站|方格子/i.test(source)) return "商業分析系列";
  if (/方格子/.test(source) && access === "付費文章") {
    if (/基本面|會員研究包|合理估值|財報|營收|EPS|PDUFA/.test(haystack)) return "基本面系列";
    if (/製藥巨頭發展史|製藥巨頭系列/i.test(haystack)) return "製藥巨頭系列";
    return "付費深度商業分析文章系列";
  }
  return "商業分析系列";
}
function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}
// Radar is a curated, 32-record rolling view, not a permanent article catalogue.
// It must still exist, be structurally sound, contain no duplicates and link to
// canonical articles in the sitemap. Pre-release leak scanning remains separate.
export function marketRadarValidationError(text, sitemapText, canonicalBaseUrl = "https://drugnews.com.tw") {
  let radar;
  try { radar = JSON.parse(text); } catch { return "RADAR_JSON_INVALID"; }
  if (!radar || radar.schema_version !== "1.0" || !Array.isArray(radar.buckets)) return "RADAR_SCHEMA_INVALID";
  const base = new URL(canonicalBaseUrl);
  const seen = new Set();
  const bucketNames = new Set();
  let count = 0;
  for (const bucket of radar.buckets) {
    if (!bucket || typeof bucket.name !== "string" || !Array.isArray(bucket.articles) || bucket.count !== bucket.articles.length) return "RADAR_BUCKET_INVALID";
    if (bucketNames.has(bucket.name)) return "RADAR_BUCKET_DUPLICATE";
    bucketNames.add(bucket.name);
    for (const article of bucket.articles) {
      if (!article || typeof article.url !== "string" || typeof article.title !== "string" || !article.title) return "RADAR_ARTICLE_INVALID";
      let url;
      try { url = new URL(article.url); } catch { return "RADAR_URL_INVALID"; }
      if (url.origin !== base.origin || !/^\/articles\/[^/]+\.html$/.test(url.pathname) || url.search || url.hash) return "RADAR_NONCANONICAL_URL";
      if (seen.has(article.url)) return "RADAR_ARTICLE_DUPLICATE";
      seen.add(article.url);
      if (!String(sitemapText || "").includes(`<loc>${escapeXml(article.url)}</loc>`)) return "RADAR_ARTICLE_NOT_IN_SITEMAP";
      count += 1;
    }
  }
  return count > 32 ? "RADAR_RECORD_LIMIT_EXCEEDED" : "";
}
