#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_DIRS = [
  { label: "inbox", dir: path.join(ROOT, "content", "inbox"), current: true },
  { label: "published", dir: path.join(ROOT, "content", "published"), current: false }
];

function todayTaipei() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function listArticles() {
  const records = [];
  for (const source of CONTENT_DIRS) {
    if (!fs.existsSync(source.dir)) continue;
    for (const name of fs.readdirSync(source.dir)) {
      const articleDir = path.join(source.dir, name);
      const metaPath = path.join(articleDir, "meta.json");
      const articlePath = path.join(articleDir, "article.md");
      if (!fs.existsSync(metaPath) || !fs.existsSync(articlePath)) continue;
      const meta = readJson(metaPath);
      if (!meta) continue;
      records.push({
        source: source.label,
        dir: articleDir,
        slug: meta.slug || name,
        title: meta.title || name,
        lang: meta.lang || "zh-Hant",
        date: String(meta.date || meta.publish_at || ""),
        cover: String(meta.cover_image || ""),
        coverAlt: String(meta.cover_image_alt || "")
      });
    }
  }
  return records;
}

function isRemote(src) {
  return /^https?:\/\//i.test(src);
}

function isSocialBodyImage(src) {
  return /(^|\/)(?:facebook|dcard)-\d{2}\.(?:png|jpe?g|webp|svg)$/i.test(src);
}

function isLocalDedicatedCover(src) {
  return /^images\/(?:cover|hero)[^/]*\.(?:png|jpe?g|webp)$/i.test(src);
}

function isLegacySharedCover(src) {
  return /assets\/english\/drugnews-english-analysis-cover\.png$/i.test(src);
}

function fileExists(article, src) {
  if (!src || isRemote(src)) return true;
  return fs.existsSync(path.join(article.dir, src));
}

function isCurrentArticle(article, today) {
  return article.source === "inbox" || String(article.date || "").slice(0, 10) >= today;
}

const today = todayTaipei();
const articles = listArticles();
const current = articles.filter((article) => isCurrentArticle(article, today));
const legacyIssues = [];
const currentIssues = [];

for (const article of articles) {
  const issues = [];
  if (!article.cover) {
    issues.push("missing cover_image");
  } else {
    if (!fileExists(article, article.cover)) issues.push(`cover file not found: ${article.cover}`);
    if (isSocialBodyImage(article.cover)) issues.push("cover uses a Facebook/Dcard body image");
    if (isLegacySharedCover(article.cover)) issues.push("cover uses the generic shared English placeholder");
    if (article.cover.endsWith(".svg")) issues.push("cover is SVG; new covers should be GPT-generated raster artwork");
    if (!isRemote(article.cover) && !isLocalDedicatedCover(article.cover)) {
      issues.push("cover filename should be a dedicated images/cover*.png|jpg|webp or images/hero*.png|jpg|webp asset");
    }
  }
  if (!article.coverAlt) {
    issues.push("missing cover_image_alt");
  }
  if (/Dcard 原圖|Facebook 原圖|社群原圖/i.test(article.coverAlt)) {
    issues.push("cover alt still describes a social original image");
  }

  if (!issues.length) continue;
  const payload = {
    source: article.source,
    date: article.date,
    slug: article.slug,
    title: article.title,
    cover_image: article.cover,
    issues
  };
  if (isCurrentArticle(article, today)) currentIssues.push(payload);
  else legacyIssues.push(payload);
}

const result = {
  status: currentIssues.length ? "needs_fix_before_publish" : "ok",
  today,
  checked_articles: articles.length,
  current_articles_checked: current.length,
  current_issues: currentIssues,
  legacy_backlog_count: legacyIssues.length,
  legacy_backlog_sample: legacyIssues.slice(0, 12),
  editorial_standard: [
    "New website covers must be dedicated raster covers, not social body images.",
    "Adjacent article-list covers should share one premium Drugnews research-media visual system.",
    "Already published covers are backlog candidates unless the user explicitly approves replacement."
  ]
};

console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--strict") && currentIssues.length) {
  process.exit(1);
}
