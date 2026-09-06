import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { canonicalRenderedBody, sha256Text } from "./scheduled_content_integrity.mjs";
import { auditBodyImageReferences } from "./scheduled_image_integrity.mjs";
const SITE = "https://drugnews.com.tw/";
const CATEGORIES = new Map([["商業分析系列","business-analysis"],["基本面系列","fundamental-analysis"],["醫學大會","medical-conference"],["付費深度商業分析文章系列","paid-deep-analysis"],["製藥巨頭系列","big-pharma"]]);
const sha = (b) => crypto.createHash("sha256").update(b).digest("hex");
function count(text, token) { return text.split(token).length - 1; }
function fail(code, surface) { throw new Error(`${code}:${surface}`); }
function safe(value) {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\") || value.split("/").some((p) => ["..", ".", ""].includes(p))) fail("UNSAFE_RECEIPT_PATH", String(value));
  return value;
}
export async function verifyReceipt(receipt, read) {
  if (receipt?.schema_version !== 1 || !/^[a-f0-9]{40}$/.test(receipt.commit || "") || !Array.isArray(receipt.articles) || !receipt.articles.length) fail("INVALID_RECEIPT", "schema");
  const seen = new Set(); const cache = new Map(); const checkedAssets = new Map();
  const get = async (relative) => {
    safe(relative);
    if (!cache.has(relative)) {
      const response = await read(relative);
      if (response.status !== 200) fail("LIVE_HTTP_STATUS", relative);
      cache.set(relative, Buffer.from(response.bytes));
    }
    return cache.get(relative);
  };
  const text = async (relative) => (await get(relative)).toString("utf8");
  const sitemap = await text("sitemap.xml");
  for (const article of receipt.articles) {
    const urlPath = safe(article.url_path);
    if (seen.has(urlPath)) fail("DUPLICATE_RECEIPT_ARTICLE", urlPath); seen.add(urlPath);
    if (!/^articles\/[^/]+\.html$/.test(urlPath)) fail("INVALID_ARTICLE_PATH", urlPath);
    const canonical = SITE + urlPath;
    const html = await text(urlPath);
    if (!html.includes(`rel="canonical" href="${canonical}"`)) fail("LIVE_CANONICAL_MISMATCH", urlPath);
    const body = canonicalRenderedBody(html);
    if (!body || !/^[a-f0-9]{64}$/.test(article.body_sha256 || "") || sha256Text(body) !== article.body_sha256) fail("LIVE_BODY_DIGEST_MISMATCH", urlPath);
    const reason = auditBodyImageReferences(html, article, canonical);
    if (reason) fail(reason, urlPath);
    const assets = [...(article.images || []).flatMap((im) => [im, ...(im.rendered_assets || [])]), ...(article.website_images || [])];
    for (const asset of assets) {
      safe(asset.path);
      if (!/^[a-f0-9]{64}$/.test(asset.sha256 || "")) fail("INVALID_IMAGE_DIGEST", asset.path);
      if (checkedAssets.has(asset.path) && checkedAssets.get(asset.path) !== asset.sha256) fail("CONFLICTING_IMAGE_DIGEST", asset.path);
      if (sha(await get(asset.path)) !== asset.sha256) fail("LIVE_IMAGE_DIGEST_MISMATCH", asset.path);
      checkedAssets.set(asset.path, asset.sha256);
    }
    const en = article.lang === "en"; const prefix = en ? "en/" : "";
    const rows = JSON.parse(await text(prefix + "search-index.json"));
    if (!Array.isArray(rows) || rows.filter((row) => { try {return new URL(row.url, SITE).href === canonical;} catch {return false;} }).length !== 1) fail("LIVE_SEARCH_ENTRY_MISMATCH", urlPath);
    if (count(sitemap, `<loc>${canonical}</loc>`) !== 1) fail("LIVE_SITEMAP_ENTRY_MISMATCH", urlPath);
    const feed = JSON.parse(await text(prefix + "feed.json"));
    if (!Array.isArray(feed.items) || feed.items.filter((row) => row.url === canonical || row.external_url === canonical).length !== 1) fail("LIVE_FEED_ENTRY_MISMATCH", urlPath);
    if (count(await text(prefix + "feed.xml"), `<link>${canonical}</link>`) !== 1) fail("LIVE_RSS_ENTRY_MISMATCH", urlPath);
    const basename = path.posix.basename(urlPath);
    const indexHref = en ? `../../articles/${basename}` : basename;
    if (count(await text(prefix + "articles/index.html"), `href="${indexHref}"`) !== 1) fail("LIVE_ARTICLE_CENTER_ENTRY_MISMATCH", urlPath);
    if (!en) {
      const category = CATEGORIES.get(article.category);
      if (!category) fail("UNKNOWN_PUBLIC_CATEGORY", urlPath);
      if (count(await text(`articles/category/${category}.html`), `href="../${basename}"`) !== 1) fail("LIVE_CATEGORY_ENTRY_MISMATCH", urlPath);
    }
    if (article.homepage_expected) {
      const href = en ? `../articles/${basename}` : `articles/${basename}`;
      if (count(await text(prefix + "index.html"), `href="${href}"`) !== 1) fail("LIVE_HOMEPAGE_ENTRY_MISMATCH", urlPath);
    }
  }
  return { status:"PRODUCTION_CONTENT_VERIFIED", commit:receipt.commit, articles:seen.size, assets:checkedAssets.size, checked_surfaces:cache.size };
}
export function requireSuccessfulDeployment(run, jobs, expectedSha, notBefore) {
  if (!Number.isFinite(Date.parse(notBefore)) || !Number.isFinite(Date.parse(run?.created_at)) || run?.head_sha !== expectedSha || run?.path !== ".github/workflows/pages.yml" || run.event !== "workflow_dispatch" || run.status !== "completed" || run.conclusion !== "success" || Date.parse(run.created_at) < Date.parse(notBefore)) fail("DEPLOYMENT_NOT_VERIFIED", "run");
  const steps = jobs.flatMap((job) => job.steps || []);
  for (const name of ["Deploy to GitHub Pages", "Read back production E4"]) {
    if (!steps.some((step) => step.name === name && step.status === "completed" && step.conclusion === "success")) fail("REQUIRED_DEPLOYMENT_STEP_NOT_PASSED", name);
  }
}
async function cli() {
  const receipt = JSON.parse(Buffer.from(process.env.PUBLIC_RECEIPT_B64 || "", "base64").toString("utf8"));
  if (receipt.commit !== process.env.REPAIR_SHA) fail("RECEIPT_COMMIT_MISMATCH", "commit");
  const read = async (relative) => {
    const encoded = relative.split("/").map(encodeURIComponent).join("/");
    const response = await fetch(new URL(encoded, SITE), { headers:{"Cache-Control":"no-cache"}, redirect:"error", signal:AbortSignal.timeout(30000) });
    return {status:response.status, bytes:Buffer.from(await response.arrayBuffer())};
  };
  const result = await verifyReceipt(receipt, read);
  console.log(JSON.stringify(result));
  if (process.env.GITHUB_STEP_SUMMARY) await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## 正式站內容驗收通過 / PRODUCTION CONTENT VERIFIED\n\n修復提交：\`${result.commit}\`\n\n文章：${result.articles}；圖片／衍生圖：${result.assets}；檢查項目：正文全文雜湊、圖片雜湊、順序、搜尋、文章中心、RSS、分類、應出現的首頁入口及 sitemap。\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) cli().catch((error) => { console.error(error.message); process.exitCode=1; });
